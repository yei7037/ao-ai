
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  private getAI(apiKey?: string) {
    return new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY || '' });
  }

  async generateNovelStream(params: {
    prompt: string;
    modelName?: string;
    apiKey?: string;
    onChunk: (text: string) => void;
  }) {
    const ai = this.getAI(params.apiKey);
    try {
      const response = await ai.models.generateContentStream({
        model: params.modelName || 'gemini-3-pro-preview',
        contents: params.prompt,
        config: {
          temperature: 0.7,
          thinkingConfig: { thinkingBudget: 4000 }
        }
      });

      for await (const chunk of response) {
        if (chunk.text) {
          params.onChunk(chunk.text);
        }
      }
    } catch (error) {
      console.error("Gemini Stream Error:", error);
      throw error;
    }
  }

  async analyzeMarketTrends(genre: string, apiKey?: string) {
    const ai = this.getAI(apiKey);
    const prompt = `你现在是番茄小说网的资深爆款主编。
    请深度分析“${genre}”频道的最新流行趋势。
    必须以严格的JSON数组格式返回3个写作方案，每个方案包含：
    - "热门写作方向": 具体的题材切入点 (如：重生+囤货+空间)
    - "核心爽点": 读者最期待的反馈 (如：看主角在末日吃火锅打脸邻居)
    - "代表性金手指设定": 独特的外挂描述
    - "关键词": 3个搜索高频词`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });
      return JSON.parse(response.text || '[]');
    } catch (e) {
      console.error("Market Analysis Error:", e);
      return [];
    }
  }
}

export const gemini = new GeminiService();
