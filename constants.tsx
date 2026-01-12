
import { Genre, PromptTemplate } from './types';

export const FANQIE_GENRES = [
  { name: Genre.BAZONG, icon: '💎', color: '#B37FEB' },
  { name: Genre.MORI, icon: '☣️', color: '#72D817' },
  { name: Genre.XUANHUAN, icon: '🔥', color: '#FF4D4F' },
  { name: Genre.DUSHI, icon: '🌆', color: '#1890FF' },
  { name: Genre.XIANXIA, icon: '⚔️', color: '#722ED1' },
  { name: Genre.YULE, icon: '🎤', color: '#EB2F96' },
  { name: Genre.KEHUAN, icon: '🚀', color: '#13C2C2' },
  { name: Genre.XUANYI, icon: '🔍', color: '#FAAD14' },
  { name: Genre.CHUANYUE, icon: '⌛', color: '#52C41A' },
  { name: Genre.ZHANCHENG, icon: '🎖️', color: '#FA541C' },
];

const DEFAULT_RULES = [
  '节奏极快，三段内进入核心爽点',
  '描写必须具有视觉冲击力',
  '结尾留钩子，引导读者翻页',
  '拒绝长篇大论的背景铺垫',
  '主角行为果断，符合爽文人设'
];

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'mr-1',
    genre: Genre.MORI,
    title: '【重生】末世囤货：开局百亿物资',
    description: '重回末世前三天，变卖家产只为囤积物资。',
    worldSetting: '极端高温，丧尸爆发，人性沦丧的废土',
    protagonist: '张岳（重生者，空间系异能，冷酷理智）',
    openingScene: '在五星级酒店疯狂订购一万份顶级外卖，周围人都在看疯子',
    conflict: '前世害死他的白莲花邻居又来敲门借粮',
    highlight: '我在零下50度的避难所里吃火锅，邻居在外面冻成冰雕',
    writingRules: [...DEFAULT_RULES, '极致的物资对比', '冷酷的生存法则']
  },
  {
    id: 'mr-2',
    genre: Genre.MORI,
    title: '【系统】我在末世建堡垒',
    description: '获得神级避难所系统，无限升级设施。',
    worldSetting: '生化危机爆发后的荒废城市',
    protagonist: '苏白（堡垒领主，杀伐果断）',
    openingScene: '丧尸包围超市，苏白激活系统，一键生成全自动化机枪塔',
    conflict: '附近的掠夺者营地盯上了堡垒的电力资源',
    highlight: '敌人开着破烂装甲车，苏白按下按钮，电磁轨道炮升起',
    writingRules: [...DEFAULT_RULES, '建筑升级的数值成长感', '降维打击的快感']
  },
  {
    id: 'bz-2',
    genre: Genre.BAZONG,
    title: '【惊喜】闪婚老公是大佬',
    description: '我以为只是普通保镖，结果他是全球首富。',
    worldSetting: '现代都市，顶级豪门陆氏',
    protagonist: '苏软软（破产千金），陆霆骁（陆氏家主）',
    openingScene: '民政局门口随便拉了个男人领证',
    conflict: '以为对方是普通保镖，回家发现车队欢迎',
    highlight: '男人宣称：陆太太，是你招惹了我',
    writingRules: [...DEFAULT_RULES, '豪门氛围极致奢华', '极致张力与拉扯']
  },
  {
    id: 'xh-1',
    genre: Genre.XUANHUAN,
    title: '【系统】神级签到开局',
    description: '废柴逆袭，禁地签到百年，出世即无敌。',
    worldSetting: '玄幻高武世界，大乾王朝，苏家为传承万年的古族世家。',
    protagonist: '苏尘，苏家嫡系，天生废体，被家族视为耻辱。',
    openingScene: '被族长下令关入族中禁地“龙墟”等死。',
    conflict: '绝境中意外觉醒“万界签到系统”。',
    highlight: '首次签到获得“混沌太初体”，重塑肉身引发九龙拉棺异象。',
    writingRules: [...DEFAULT_RULES, '异象描写要宏大瑰丽', '反派震惊反应要真实到位']
  },
  {
    id: 'ds-1',
    genre: Genre.DUSHI,
    title: '【神医】下山即巅峰',
    description: '九个师姐风华绝代，小师弟下山无敌。',
    worldSetting: '现代平行时空，申海市，豪门林立，医武传承被遗忘。',
    protagonist: '叶凡，苍龙山最后一位传人，医术通神，武力值天花板。',
    openingScene: '带着九份婚书，乘坐前往申海市的高铁。',
    conflict: '车上千金大小姐突发恶疾，各路名医束手无策。',
    highlight: '叶凡施展“九转还阳针”，瞬间起死回生，震惊全场。',
    writingRules: [...DEFAULT_RULES, '突出专业医术的玄妙感', '侧面描写围观群众的崇拜']
  }
];
