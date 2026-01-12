
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async generateNovelContent(prompt: string, onChunk: (text: string) => void) {
    try {
      const response = await this.ai.models.generateContentStream({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingBudget: 4000 }
        }
      });

      for await (const chunk of response) {
        const text = chunk.text;
        if (text) {
          onChunk(text);
        }
      }
    } catch (error) {
      console.error("Gemini Generation Error:", error);
      throw error;
    }
  }

  async getGenreTrends(genre: string) {
    const prompt = `你是一名番茄小说网的资深主编。请深度分析当前“${genre}”频道的市场动态。
    请以严格的JSON格式返回3个最具备爆火潜力的写作方案，包含字段：
    - "热门写作方向": 具体的题材切入点
    - "核心爽点": 读者最期待的反馈
    - "受众群体": 核心付费读者画像
    - "代表性金手指设定": 独特的能力或外挂描述
    - "关键词": 3个搜索高频词`;
    
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });
      return JSON.parse(response.text || '[]');
    } catch (e) {
      return null;
    }
  }

  async generateNames(genre: string, background: string) {
    const prompt = `为题材为“${genre}”、背景为“${background}”的小说生成5组起名建议。
    包括：男主名、女主名、反派名、核心地名、宗门/组织名。
    要求：符合番茄爽文审美，避免重名，地名使用中国风虚构。
    请以JSON数组格式返回，每个对象包含 category 和 name。`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });
      return JSON.parse(response.text || '[]');
    } catch (e) {
      return [];
    }
  }
}

export const gemini = new GeminiService();
