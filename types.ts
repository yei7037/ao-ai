
export enum Genre {
  XUANHUAN = '玄幻',
  DUSHI = '都市',
  XIANXIA = '仙侠',
  YULE = '娱乐',
  KEHUAN = '科幻',
  XUANYI = '悬疑',
  CHUANYUE = '穿越',
  ZHANCHENG = '战神',
  BAZONG = '霸总',
  CUSTOM = '自定义'
}

export interface PromptTemplate {
  id: string;
  genre: Genre | string;
  title: string;
  description: string;
  
  // Structured Narrative Fields
  worldSetting: string;     // 世界观/背景
  protagonist: string;      // 主角设定
  openingScene: string;     // 开局场景
  conflict: string;         // 核心冲突
  highlight: string;        // 核心爽点/爆点
  
  writingRules?: string[];  // 平台写作规则
  isCustom?: boolean;
  isRemixed?: boolean;      // 标识是否为 AI Remix 生成
  template?: string;        // Fallback for simple prompts
}

export interface WritingTask {
  id: string;
  title: string;
  content: string;
  genre: Genre;
  status: 'draft' | 'writing' | 'completed';
  createdAt: number;
}
