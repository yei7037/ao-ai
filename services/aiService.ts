
import { GoogleGenAI, Type } from "@google/genai";

export type AIProvider = 'gemini' | 'openai' | 'deepseek' | 'grok';

export interface ModelConfig {
  provider: AIProvider;
  apiKey: string;
  baseUrl?: string;
  modelName: string;
}

const GLOBAL_SYSTEM_PROMPT = `
你运行于【中文语境】下，默认读者为中文母语者。你不是文化讲解者，而是中文语境中工作的冷静编辑。

【绝对优先级规则】
1. 所有判断、分析、示例，必须基于中文文化直觉。禁止使用西式叙事逻辑、英语写作腔、翻译体结构。
2. 禁止出现“心理学术语化”“西方价值模板化”表达。
3. 禁止解释人物动机，禁止替人物把话说透，禁止“象征意义”“隐喻意义”解释。
4. 任何显得“文学正确”或“教科书式完美”的表述，都视为 AI 痕迹。

【语言风格强制约束】
- 使用自然中文书面语，允许省略主语，允许短句、不完整句。
- 允许语义留白。用“发生了什么”替代“感受到了什么”。
- 禁止使用网络热梗，禁止“首先/其次/最后”的教学式结构。

【文化与风俗】
- 人物行为必须符合中国语境下的面子逻辑、人情往来、含蓄对抗。
- 命名规则：人名像现实中见过的人，禁止明显“小说感姓名”。
- 冲突优先表现为：冷处理、表面和气内里较劲、话没说完意思到了。
`;

export class AIService {
  async generateNovelContent(prompt: string, config: ModelConfig, onChunk: (text: string) => void, mode: 'male' | 'female' | 'normal' = 'male') {
    let modeInstruction = "";
    if (mode === 'male') {
      modeInstruction = "【大男主内核】：秩序破坏者。不在乎名声，只在乎结果。容忍短期恶名换取长期掌控。写他在局面下计算代价而非胜率。";
    } else if (mode === 'female') {
      modeInstruction = "【大女主内核】：规则重写者。清醒独立，拒绝正面博弈，擅长因果逆转。从不解释动机，只留下结果。";
    } else {
      modeInstruction = "【正常模式】：写实叙事。强调逻辑严密、情感自然流动。避免过度装逼或套路化反转，追求扎实的叙事质感与人物弧光。";
    }

    const fullPrompt = `${GLOBAL_SYSTEM_PROMPT}\n${modeInstruction}\n\n当前任务指令：${prompt}\n\n要求：直接撰写正文，严禁总结。`;

    const apiKey = config.apiKey || process.env.API_KEY;
    if (config.provider === 'gemini' && apiKey) {
      const ai = new GoogleGenAI({ apiKey });
      try {
        const response = await ai.models.generateContentStream({
          model: config.modelName || 'gemini-3-pro-preview',
          contents: fullPrompt,
          config: { 
            temperature: 0.6,
            topP: 0.85,
            thinkingConfig: { thinkingBudget: 4000 }
          }
        });
        for await (const chunk of response) {
          if (chunk.text) onChunk(chunk.text);
        }
      } catch (error) { throw error; }
    }
  }

  async remixTemplate(template: any, config: ModelConfig) {
    const prompt = `${GLOBAL_SYSTEM_PROMPT}\n基于以下小说模板，裂变生成一个爆款方案。返回 JSON。模板：${JSON.stringify(template)}`;
    const apiKey = config.apiKey || process.env.API_KEY;
    if (config.provider === 'gemini' && apiKey) {
      const ai = new GoogleGenAI({ apiKey });
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: { responseMimeType: 'application/json', temperature: 0.8 }
        });
        return JSON.parse(response.text || '{}');
      } catch (e) { throw e; }
    }
    return template;
  }

  async analyzeContent(type: string, content: string, background: string, config: ModelConfig) {
    // 简化实现
    return { analysis: "分析中..." };
  }

  async getGenreTrends(genre: string, config: ModelConfig) {
    const prompt = `${GLOBAL_SYSTEM_PROMPT}\n深入分析“${genre}”频道的当前流行趋势。返回3个爆款方案（JSON数组）。`;
    const apiKey = config.apiKey || process.env.API_KEY;
    if (apiKey) {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      return JSON.parse(response.text || '[]');
    }
    return [];
  }
}

export const aiService = new AIService();
