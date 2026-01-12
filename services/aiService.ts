
import { GoogleGenAI, Type } from "@google/genai";

export type AIProvider = 'gemini' | 'openai' | 'deepseek' | 'grok';

export interface ModelConfig {
  provider: AIProvider;
  apiKey: string;
  baseUrl?: string;
  modelName: string;
}

// 🧠 全局系统提示词｜中文母语写作逻辑（深度去 AI 痕迹版）
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
- 禁止使用网络热梗（如“破防”“拿捏”），禁止“首先/其次/最后”的教学式结构。

【文化与风俗】
- 人物行为必须符合中国语境下的面子逻辑、人情往来、含蓄对抗。
- 命名规则：人名像现实中见过的人，禁止明显“小说感姓名”或生僻字堆砌。
- 冲突优先表现为：冷处理、表面和气内里较劲、话没说完意思到了。

【身份约束】
你是一个对“AI 痕迹”高度敏感的冷静编辑。任何看起来像“AI 很聪明”或“价值观很正”的表达，都是失败。
`;

export class AIService {
  async generateNovelContent(prompt: string, config: ModelConfig, onChunk: (text: string) => void, mode: 'male' | 'female' = 'male') {
    const modeInstruction = mode === 'male' 
      ? "【大男主内核】：秩序破坏者。不在乎名声，只在乎结果。容忍短期恶名换取长期掌控。写他在局面下计算代价而非胜率。"
      : "【大女主内核】：规则重写者。清醒独立，拒绝正面博弈，擅长因果逆转。从不解释动机，只留下结果。";

    const fullPrompt = `${GLOBAL_SYSTEM_PROMPT}\n${modeInstruction}\n\n当前任务指令：${prompt}\n\n要求：直接撰写正文，严禁总结，结尾停在一个未完全说透的状态。`;

    if (config.provider === 'gemini') {
      const ai = new GoogleGenAI({ apiKey: config.apiKey || process.env.API_KEY || '' });
      try {
        const response = await ai.models.generateContentStream({
          model: config.modelName || 'gemini-3-pro-preview',
          contents: fullPrompt,
          config: { 
            temperature: 0.45, // 适度提升随机性以避免模板化
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
    const prompt = `${GLOBAL_SYSTEM_PROMPT}
    基于以下小说模板，裂变生成一个新的、更具爆发力的爆款方案。
    要求返回 JSON 格式，包含字段：title, description, worldSetting, protagonist, openingScene, conflict, highlight。
    
    注意：命名要写实，冲突要符合人情世故，不要写成西方史诗或翻译剧。
    原模板：${JSON.stringify(template)}`;

    if (config.provider === 'gemini') {
      const ai = new GoogleGenAI({ apiKey: config.apiKey || process.env.API_KEY || '' });
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: { 
            responseMimeType: 'application/json',
            temperature: 0.8
          }
        });
        return JSON.parse(response.text || '{}');
      } catch (e) { throw e; }
    }
    return template;
  }

  async analyzeContent(type: 'character' | 'emotion' | 'highlight' | 'cliffhanger' | 'deai', content: string, background: string, config: ModelConfig) {
    const prompts = {
      deai: `你是反 AI 痕迹检测器。重点查找：翻译腔、过于正确的价值观、教科书式的心理描写。`,
      character: `你是角色偏见一致性校验。判断角色行为是否符合“中文社会人情逻辑”，是否写得太像“纸片人”或“圣母”。`,
      emotion: `判断文本情绪是否由于过于平滑而显得虚假。寻找那些让读者不适或意外的“粗糙点”。`,
      highlight: `分析这段文字是否在刻意讨好读者。真正的爽感来源于代价的真实和结果的突兀。`,
      cliffhanger: `检查断章。如果是温和的结束，那就是失败。需要那种话里有话、阴影未散的恶意。`
    };

    const prompt = `${GLOBAL_SYSTEM_PROMPT}\n${prompts[type]}\n\n正文内容：\n${content}\n\n给出分析报告（JSON格式：{"analysis": "...", "riskSegments": ["..."]}）。语气要冷峻，甚至刻薄。`;

    if (config.provider === 'gemini') {
      const ai = new GoogleGenAI({ apiKey: config.apiKey || process.env.API_KEY || '' });
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: { responseMimeType: 'application/json', temperature: 0.1 }
        });
        return JSON.parse(response.text || '{}');
      } catch (e) { return null; }
    }
    return null;
  }

  async getGenreTrends(genre: string, config: ModelConfig) {
    const prompt = `${GLOBAL_SYSTEM_PROMPT}\n深入分析“${genre}”频道的当前流行趋势。
    避开过时的套路，寻找那些潜伏在社交媒体情绪背后的爆点。
    返回3个爆款方案（JSON数组）。`;
    const ai = new GoogleGenAI({ apiKey: config.apiKey || process.env.API_KEY || '' });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '[]');
  }
}

export const aiService = new AIService();
