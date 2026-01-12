
import { GoogleGenAI } from "@google/genai";

export type AIProvider = 'gemini' | 'openai' | 'deepseek' | 'grok';

export interface ModelConfig {
  provider: AIProvider;
  apiKey: string;
  baseUrl?: string;
  modelName: string;
}

export class AIService {
  private getAuthHeaders(config: ModelConfig) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    };
  }

  private getDefaultUrl(provider: AIProvider) {
    switch (provider) {
      case 'openai': return 'https://api.openai.com/v1/chat/completions';
      case 'deepseek': return 'https://api.deepseek.com/v1/chat/completions';
      case 'grok': return 'https://api.x.ai/v1/chat/completions';
      default: return '';
    }
  }

  async testConnection(config: ModelConfig): Promise<boolean> {
    const prompt = "ping";
    try {
      if (config.provider === 'gemini') {
        const ai = new GoogleGenAI({ apiKey: config.apiKey || process.env.API_KEY || '' });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
        });
        return !!response.text;
      } else {
        const res = await fetch(config.baseUrl || this.getDefaultUrl(config.provider), {
          method: 'POST',
          headers: this.getAuthHeaders(config),
          body: JSON.stringify({
            model: config.modelName,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 5
          })
        });
        return res.ok;
      }
    } catch (e) {
      return false;
    }
  }

  async generateNovelContent(prompt: string, config: ModelConfig, onChunk: (text: string) => void) {
    if (config.provider === 'gemini') {
      const ai = new GoogleGenAI({ apiKey: config.apiKey || process.env.API_KEY || '' });
      try {
        const response = await ai.models.generateContentStream({
          model: config.modelName || 'gemini-3-pro-preview',
          contents: prompt,
          config: { thinkingConfig: { thinkingBudget: 4000 } }
        });
        for await (const chunk of response) {
          if (chunk.text) onChunk(chunk.text);
        }
      } catch (error) { throw error; }
    } else {
      const url = config.baseUrl || this.getDefaultUrl(config.provider);
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: this.getAuthHeaders(config),
          body: JSON.stringify({
            model: config.modelName,
            messages: [{ role: 'user', content: prompt }],
            stream: true,
            temperature: 0.8,
          })
        });
        if (!response.ok) throw new Error("API Request Failed");
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) return;
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
              try {
                const jsonStr = trimmed.replace(/^data: /, '');
                const data = JSON.parse(jsonStr);
                const text = data.choices[0]?.delta?.content;
                if (text) onChunk(text);
              } catch (e) {}
            }
          }
        }
      } catch (error) { throw error; }
    }
  }

  async humanizeFix(content: string, advice: string, config: ModelConfig): Promise<string> {
    const prompt = `你是一名顶级网文润色专家。以下这段文字AI味太重（平铺直叙、情感稀薄、逻辑过于完美）。
    请根据以下优化建议进行重写，使其更具“人味”：
    优化建议：${advice}
    
    要求：
    1. 增加主观偏见和情绪波动。
    2. 加入符合语境的俚语或口语化表达。
    3. 调整节奏，增加留白或突兀的转折。
    4. 保持原意但彻底改变叙述口吻。
    
    原文字：
    ${content}
    
    请直接返回重写后的正文内容，不要有任何多余的解释。`;

    if (config.provider === 'gemini') {
      const ai = new GoogleGenAI({ apiKey: config.apiKey || process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      return response.text || content;
    } else {
      const res = await fetch(config.baseUrl || this.getDefaultUrl(config.provider), {
        method: 'POST',
        headers: this.getAuthHeaders(config),
        body: JSON.stringify({
          model: config.modelName,
          messages: [{ role: 'user', content: prompt }],
        })
      });
      const data = await res.json();
      return data.choices[0].message.content || content;
    }
  }

  async analyzeContent(type: 'character' | 'emotion' | 'highlight' | 'cliffhanger' | 'deai', content: string, background: string, config: ModelConfig) {
    const prompts = {
      character: `作为资深编辑，校验以下正文的人物一致性。背景设定：${background}。
      请按JSON格式返回：{ "score": 分数0-10, "isConsistent": boolean, "analysis": "分析人设是否崩坏", "suggestions": ["修改建议1", "建议2"] }`,
      emotion: `分析以下正文的情绪曲线。
      请按JSON格式返回：{ "currentEmotion": "当前主要情绪", "curve": ["起", "承", "转", "合"], "intensity": 0-100, "advice": "如何加强情绪感染力" }`,
      highlight: `基于番茄小说标准评估这段文字的“爽感”。
      请按JSON格式返回：{ "rating": 0-10, "hooks": ["发现的爽点1", "爽点2"], "missing": "缺失的爆发点描述", "rewrite": "一句话改写建议让它更爽" }`,
      cliffhanger: `检查这段文字的结尾是否具备“断章钩子”。
      请按JSON格式返回：{ "hasHook": boolean, "hookStrength": 0-10, "analysis": "结尾钩子分析", "suggestions": ["如何改写结尾吸引读者翻页"] }`,
      deai: `你是一个反AI痕迹检测专家。请扫描以下文本，识别出那些“太像AI写的”段落。
      重点检测：情感过于平滑稳定、缺乏主观偏见、叙述逻辑过于连贯、过度解释设定。
      请按JSON格式返回：{ "aiFlavorScore": 0-100 (分数越高AI感越强), "riskSegments": ["风险段落文字"], "analysis": "为何像AI的专业点评", "humanizeAdvice": ["如何改写得更像真人写的，例如增加俚语、调整节奏、加入主观偏见等"] }`
    };

    const prompt = prompts[type] + `\n\n正文内容：\n${content}\n\n只返回JSON。`;

    if (config.provider === 'gemini') {
      const ai = new GoogleGenAI({ apiKey: config.apiKey || process.env.API_KEY || '' });
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text || '{}');
      } catch (e) { return null; }
    } else {
      try {
        const res = await fetch(config.baseUrl || this.getDefaultUrl(config.provider), {
          method: 'POST',
          headers: this.getAuthHeaders(config),
          body: JSON.stringify({
            model: config.modelName,
            messages: [{ role: 'user', content: prompt }],
          })
        });
        const data = await res.json();
        const jsonMatch = data.choices[0].message.content.match(/\{[\s\S]*\}/);
        return JSON.parse(jsonMatch ? jsonMatch[0] : '{}');
      } catch (e) { return null; }
    }
  }

  async getGenreTrends(genre: string, config: ModelConfig) {
    const prompt = `分析“${genre}”题材。返回3个潜力方案。格式：JSON数组，字段：热门写作方向, 核心爽点, 受众群体, 代表性金手指设定, 关键词。`;
    if (config.provider === 'gemini') {
      const ai = new GoogleGenAI({ apiKey: config.apiKey || process.env.API_KEY || '' });
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text || '[]');
      } catch (e) { return null; }
    } else {
      try {
        const res = await fetch(config.baseUrl || this.getDefaultUrl(config.provider), {
          method: 'POST',
          headers: this.getAuthHeaders(config),
          body: JSON.stringify({
            model: config.modelName,
            messages: [{ role: 'user', content: prompt }],
          })
        });
        const data = await res.json();
        const jsonMatch = data.choices[0].message.content.match(/\[[\s\S]*\]/);
        return JSON.parse(jsonMatch ? jsonMatch[0] : '[]');
      } catch (e) { return null; }
    }
  }

  async generateNames(genre: string, background: string, config: ModelConfig) {
    const prompt = `题材“${genre}”，背景“${background}”。生成5组起名建议。JSON数组：[{category, name}]。`;
    if (config.provider === 'gemini') {
      const ai = new GoogleGenAI({ apiKey: config.apiKey || process.env.API_KEY || '' });
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text || '[]');
      } catch (e) { return []; }
    } else {
      try {
        const res = await fetch(config.baseUrl || this.getDefaultUrl(config.provider), {
          method: 'POST',
          headers: this.getAuthHeaders(config),
          body: JSON.stringify({
            model: config.modelName,
            messages: [{ role: 'user', content: prompt }],
          })
        });
        const data = await res.json();
        const jsonMatch = data.choices[0].message.content.match(/\[[\s\S]*\]/);
        return JSON.parse(jsonMatch ? jsonMatch[0] : '[]');
      } catch (e) { return []; }
    }
  }

  async remixTemplate(template: any, config: ModelConfig): Promise<any> {
    const prompt = `基于模板Remix：${JSON.stringify(template)}。JSON返回：{title, description, worldSetting, protagonist, openingScene, conflict, highlight}`;
    if (config.provider === 'gemini') {
      const ai = new GoogleGenAI({ apiKey: config.apiKey || process.env.API_KEY || '' });
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text || '{}');
      } catch (e) { throw e; }
    } else {
      try {
        const res = await fetch(config.baseUrl || this.getDefaultUrl(config.provider), {
          method: 'POST',
          headers: this.getAuthHeaders(config),
          body: JSON.stringify({
            model: config.modelName,
            messages: [{ role: 'user', content: prompt }],
          })
        });
        const data = await res.json();
        const jsonMatch = data.choices[0].message.content.match(/\{[\s\S]*\}/);
        return JSON.parse(jsonMatch ? jsonMatch[0] : '{}');
      } catch (e) { throw e; }
    }
  }
}

export const aiService = new AIService();
