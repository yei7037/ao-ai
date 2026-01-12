
import React, { useState } from 'react';
import { PROMPT_TEMPLATES } from '../constants';
import { Genre, PromptTemplate } from '../types';
import { aiService, ModelConfig } from '../services/aiService';

interface PromptLibraryProps {
  selectedGenre: string;
  onSelectTemplate: (template: PromptTemplate) => void;
  customTemplates: PromptTemplate[];
  onAddCustomTemplate: (template: Omit<PromptTemplate, 'id'>) => void;
  onDeleteCustomTemplate: (id: string) => void;
  modelConfig: ModelConfig;
}

const PromptLibrary: React.FC<PromptLibraryProps> = ({ 
  selectedGenre, 
  onSelectTemplate, 
  customTemplates, 
  onAddCustomTemplate,
  onDeleteCustomTemplate,
  modelConfig
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [remixingId, setRemixingId] = useState<string | null>(null);
  const [newTpl, setNewTpl] = useState<Partial<PromptTemplate>>({});

  // 核心逻辑：根据当前选中的版块，返回完全不同的预设内容
  const getGenreSpecificData = (genre: string) => {
    const data: Record<string, any> = {
      [Genre.XUANYI]: {
        title: '【悬疑】密室失踪事件',
        worldSetting: '现代都市，偏远荒村，阴雨连绵的季节',
        protagonist: '林默（退役刑警，患有超忆症）',
        highlight: '极致烧脑，层层反转，人性底层的博弈',
        conflict: '新婚妻子在反锁的浴室内凭空消失，唯一的线索是一张十年前的旧照片',
        placeholders: { world: '例：充满秘密的孤岛疗养院', hero: '例：沉默寡言的记忆天才', hook: '例：受害者竟然是凶手的双胞胎' }
      },
      [Genre.BAZONG]: {
        title: '【霸总】偏执大佬的逃妻',
        worldSetting: '京城顶级豪门，现代商战背景',
        protagonist: '苏蔓（落魄钢琴家），傅时晏（掌控全球命脉的偏执总裁）',
        highlight: '极致拉扯，先婚后爱，带球跑后的追妻火葬场',
        conflict: '契约结婚三年到期，她留下离婚协议人间蒸发，他疯了般掘地三尺',
        placeholders: { world: '例：现代豪门圈层', hero: '例：权势滔天的冰山总裁', hook: '例：霸总其实暗恋女主十年' }
      },
      [Genre.XUANHUAN]: {
        title: '【玄幻】开局觉醒至尊骨',
        worldSetting: '大荒世界，万族林立，强者撕裂星辰',
        protagonist: '石昊（被挖去至尊骨的废柴少年）',
        highlight: '热血无敌，横推万古，重瞳本是无敌路',
        conflict: '宗门大比被羞辱，意外获得神秘小塔，从此开启逆天路',
        placeholders: { world: '例：九天十地修仙界', hero: '例：拥有系统的废材少主', hook: '例：开局签到诛仙剑' }
      },
      [Genre.CHUANYUE]: {
        title: '【穿越】我在古代搞基建',
        worldSetting: '大周王朝，战乱频发，民不聊生',
        protagonist: '顾青（现代建筑学博士穿越成流放县令）',
        highlight: '科技碾压，发家致富，从荒村到万国来朝',
        conflict: '开局只有三间草屋和一群难民，还要面临土匪围攻',
        placeholders: { world: '例：重男轻女的封建农村', hero: '例：自带淘宝系统的王妃', hook: '例：用现代知识解决饥荒' }
      }
    };

    return data[genre] || {
      title: `【${genre}】新灵感预设`,
      worldSetting: '请设定世界观...',
      protagonist: '主角姓名、性格、金手指...',
      highlight: '爽点：如打脸、越级反杀、掉马甲...',
      conflict: '开场第一个大矛盾是什么...',
      placeholders: { world: '请输入世界观', hero: '请输入主角设定', hook: '请输入核心爽点' }
    };
  };

  const handleOpenAdding = () => {
    const data = getGenreSpecificData(selectedGenre);
    setNewTpl({
      title: data.title,
      worldSetting: data.worldSetting,
      protagonist: data.protagonist,
      highlight: data.highlight,
      conflict: data.conflict,
      openingScene: ''
    });
    setIsAdding(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTpl.title) return;
    onAddCustomTemplate({
      ...newTpl,
      genre: selectedGenre || Genre.CUSTOM,
      isCustom: true,
      isRemixed: false
    } as PromptTemplate);
    setIsAdding(false);
  };

  const handleRemix = async (e: React.MouseEvent, template: PromptTemplate) => {
    e.stopPropagation();
    setRemixingId(template.id);
    try {
      const remixedData = await aiService.remixTemplate(template, modelConfig);
      onAddCustomTemplate({
        ...remixedData,
        genre: template.genre,
        isCustom: true,
        isRemixed: true,
        title: `✨ ${remixedData.title || template.title}`
      });
    } catch (err) {
      alert("Remix 失败，请检查模型设置。");
    } finally {
      setRemixingId(null);
    }
  };

  const genreData = getGenreSpecificData(selectedGenre);
  const allTemplates = [...PROMPT_TEMPLATES, ...customTemplates];
  const filtered = allTemplates.filter(p => p.genre === selectedGenre || selectedGenre === '');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* 新建模板入口 */}
      <div 
        onClick={handleOpenAdding}
        className="group cursor-pointer p-6 bg-white border-2 border-dashed border-gray-200 rounded-2xl hover:border-orange-500 hover:bg-orange-50/30 transition-all flex flex-col items-center justify-center min-h-[220px]"
      >
        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-orange-100 group-hover:text-orange-500 transition-all">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        </div>
        <span className="mt-4 text-gray-500 font-bold group-hover:text-orange-600">自定义 {selectedGenre} 模板</span>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">{selectedGenre.charAt(0)}</div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">构建 {selectedGenre} 预设</h3>
                  <p className="text-[10px] text-gray-400 font-medium">系统已根据版块自动填充推荐参数</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsAdding(false)} className="text-gray-300 hover:text-gray-500 transition-colors">
                 <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-5">
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase tracking-widest">模板名称</label>
                <input autoFocus className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none transition-all font-bold text-gray-800" value={newTpl.title} onChange={e => setNewTpl({...newTpl, title: e.target.value})} />
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase tracking-widest">世界设定</label>
                <input placeholder={genreData.placeholders.world} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none" value={newTpl.worldSetting} onChange={e => setNewTpl({...newTpl, worldSetting: e.target.value})} />
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase tracking-widest">主角/系统</label>
                <input placeholder={genreData.placeholders.hero} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none" value={newTpl.protagonist} onChange={e => setNewTpl({...newTpl, protagonist: e.target.value})} />
              </div>
              
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase tracking-widest">核心爽点</label>
                <input placeholder={genreData.placeholders.hook} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none" value={newTpl.highlight} onChange={e => setNewTpl({...newTpl, highlight: e.target.value})} />
              </div>
              
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase tracking-widest">开场核心冲突 (关键)</label>
                <textarea className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-xl h-28 resize-none focus:ring-2 focus:ring-orange-500/20 outline-none text-sm leading-relaxed" value={newTpl.conflict} onChange={e => setNewTpl({...newTpl, conflict: e.target.value})} />
              </div>
            </div>
            
            <button type="submit" className="w-full mt-8 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black shadow-xl transition-all active:scale-[0.98]">
              保存至我的 {selectedGenre} 灵感库
            </button>
          </form>
        </div>
      )}

      {/* 渲染列表 */}
      {filtered.map((p) => (
        <div 
          key={p.id}
          onClick={() => onSelectTemplate(p)}
          className="group relative cursor-pointer p-6 bg-white border border-gray-100 rounded-2xl hover:border-orange-500 hover:shadow-xl transition-all flex flex-col h-full overflow-hidden"
        >
          <div className="flex justify-between items-start mb-4">
            <span className={`inline-block px-2 py-1 text-[9px] font-bold rounded tracking-wider uppercase ${p.isCustom ? 'bg