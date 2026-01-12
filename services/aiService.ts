
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
      } catch (error) {
        console.error("Gemini Error:", error);
        throw error;
      }
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

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error?.message || response.statusText);
        }

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
      } catch (error) {
        console.error(`${config.provider} Error:`, error);
        throw error;
      }
    }
  }

  async getGenreTrends(genre: string, config: ModelConfig) {
    const prompt = `你是一名番茄小说网的资深主编。请深度分析当前“${genre}”频道的市场动态。以JSON数组格式返回3个最具备爆火潜力的写作方案，包含字段：热门写作方向, 核心爽点, 受众群体, 代表性金手指设定, 关键词。只需返回JSON数组。`;
    
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
            messages: [{ role: 'user', content: prompt + " 必须仅返回JSON。" }],
          })
        });
        const data = await res.json();
        const content = data.choices[0].message.content;
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        return JSON.parse(jsonMatch ? jsonMatch[0] : content);
      } catch (e) { return null; }
    }
  }

  async generateNames(genre: string, background: string, config: ModelConfig) {
    const prompt = `为题材为“${genre}”、背景为“${background}”的小说生成5组起名建议。JSON数组格式：[{category, name}]。`;
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
            messages: [{ role: 'user', content: prompt + " 必须仅返回JSON。" }],
          })
        });
        const data = await res.json();
        const jsonMatch = data.choices[0].message.content.match(/\[[\s\S]*\]/);
        return JSON.parse(jsonMatch ? jsonMatch[0] : data.choices[0].message.content);
      } catch (e) { return []; }
    }
  }

  async remixTemplate(template: any, config: ModelConfig): Promise<any> {
    const prompt = `基于现有模板进行混剪(Remix)，生成一个更具爆款潜力的变体。
    原始：${JSON.stringify(template)}
    请以JSON格式返回：{title, description, worldSetting, protagonist, openingScene, conflict, highlight}`;

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
            messages: [{ role: 'user', content: prompt + " 必须仅返回JSON。" }],
          })
        });
        const data = await res.json();
        const content = data.choices[0].message.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        return JSON.parse(jsonMatch ? jsonMatch[0] : content);
      } catch (e) { throw e; }
    }
  }
}

export const aiService = new AIService();
