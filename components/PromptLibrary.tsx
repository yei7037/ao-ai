
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
  searchTerm?: string;
}

const PromptLibrary: React.FC<PromptLibraryProps> = ({ 
  selectedGenre, 
  onSelectTemplate, 
  customTemplates, 
  onAddCustomTemplate,
  onDeleteCustomTemplate,
  modelConfig,
  searchTerm = ''
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [remixingId, setRemixingId] = useState<string | null>(null);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [newTpl, setNewTpl] = useState<Partial<PromptTemplate>>({});

  const getGenreSpecificData = (genre: string) => {
    const data: Record<string, any> = {
      [Genre.MORI]: {
        title: '【末日】囤货求生录',
        worldSetting: '丧尸危机爆发，全球进入冰河时代',
        protagonist: '苏航（拥有无限容积的空间仓库）',
        highlight: '在废土中享受顶级和牛，无敌堡垒建设',
        conflict: '暴徒试图围攻避难所，却不知避难所是可移动的航母级战车',
        placeholders: { world: '例：极端气象末日或丧尸荒原', hero: '例：冷酷理智的囤货狂魔', hook: '例：空间异能、基地建设、吞噬异能' }
      },
      [Genre.BAZONG]: {
        title: '【霸总】偏执大佬的逃妻',
        worldSetting: '京城顶级豪门，现代商战背景',
        protagonist: '苏蔓（落魄钢琴家），傅时晏（掌控全球命脉的偏执总裁）',
        highlight: '极致拉扯，先婚后爱，带球跑后的追妻火葬场',
        conflict: '契约结婚三年到期，她留下离婚协议人间蒸发，他疯了般掘地三尺',
        placeholders: { world: '例：现代豪门圈层', hero: '例：权势滔天的冰山总裁', hook: '例：霸总其实暗恋女主十年' }
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

  const handleAutoGenerate = async () => {
    setIsAutoGenerating(true);
    try {
      // 构造一个空的提示框架让 AI 发挥
      const baseTemplate = {
        genre: selectedGenre,
        title: `爆款${selectedGenre}灵感`,
        description: '由 AI 深度挖掘的市场爆款切入点',
        worldSetting: '待生成',
        protagonist: '待生成',
        conflict: '待生成',
        highlight: '待生成'
      };
      const remixedData = await aiService.remixTemplate(baseTemplate, modelConfig);
      onAddCustomTemplate({
        ...remixedData,
        genre: selectedGenre,
        isCustom: true,
        isRemixed: true,
        title: `✨ [AI原创] ${remixedData.title || '新灵感'}`
      });
    } catch (err) {
      alert("AI 裂变失败，请检查配置。");
    } finally {
      setIsAutoGenerating(false);
    }
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
        title: `✨ [Remixed] ${remixedData.title || template.title}`
      });
    } catch (err) {
      alert("Remix 失败，请检查模型设置。");
    } finally {
      setRemixingId(null);
    }
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

  const genreData = getGenreSpecificData(selectedGenre);
  const allTemplates = [...PROMPT_TEMPLATES, ...customTemplates];
  
  const filtered = allTemplates.filter(p => {
    const matchGenre = p.genre === selectedGenre || selectedGenre === '';
    const matchSearch = searchTerm === '' || 
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.conflict && p.conflict.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.highlight && p.highlight.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchGenre && matchSearch;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 手动添加卡片 */}
        <div 
          onClick={handleOpenAdding}
          className="group cursor-pointer p-6 bg-white border-2 border-dashed border-gray-200 rounded-3xl hover:border-orange-500 hover:bg-orange-50/20 transition-all flex flex-col items-center justify-center min-h-[220px]"
        >
          <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-orange-100 group-hover:text-orange-500 group-hover:rotate-90 transition-all duration-300">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          </div>
          <span className="mt-4 text-gray-500 font-bold group-hover:text-orange-600 tracking-tight text-sm">手动添加灵感</span>
        </div>

        {/* AI 自动裂变卡片 */}
        <div 
          onClick={handleAutoGenerate}
          className={`group cursor-pointer p-6 bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl shadow-lg hover:shadow-orange-200 hover:-translate-y-1 transition-all flex flex-col items-center justify-center min-h-[220px] ${isAutoGenerating ? 'animate-pulse' : ''}`}
        >
          {isAutoGenerating ? (
            <div className="flex flex-col items-center">
               <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4"></div>
               <span className="text-white font-bold text-sm">正在深度裂变中...</span>
            </div>
          ) : (
            <>
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-white mb-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <span className="text-white font-bold tracking-tight text-sm">AI 裂变全新提示词</span>
              <p className="text-white/60 text-[10px] mt-2 font-medium">根据当前版块自动挖掘爆点</p>
            </>
          )}
        </div>

        {filtered.map((p) => (
          <div 
            key={p.id}
            onClick={() => onSelectTemplate(p)}
            className="group relative cursor-pointer p-7 bg-white border border-gray-100 rounded-[2rem] hover:border-orange-500 hover:shadow-2xl transition-all flex flex-col h-full overflow-hidden"
          >
            <div className="flex justify-between items-start mb-5">
              <span className={`inline-block px-2.5 py-1 text-[9px] font-black rounded-lg tracking-wider uppercase shadow-sm ${p.isCustom ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {p.genre}
              </span>
              <button 
                onClick={(e) => handleRemix(e, p)} 
                title="基于此模板裂变新提示词"
                className="p-2 bg-gray-50 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-all"
              >
                {remixingId === p.id ? (
                  <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a2 2 0 00-1.96 1.414l-.477 2.387a2 2 0 001.569 2.417l2.387.477a2 2 0 002.417-1.569l.477-2.387a2 2 0 00-.547-1.022z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.5 5.5l13 13m-13 0l13-13" />
                  </svg>
                )}
              </button>
            </div>
            <h4 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-orange-600 transition-colors leading-tight line-clamp-2">
              {p.title}
            </h4>
            <p className="text-xs text-gray-400 line-clamp-3 mb-6 leading-relaxed font-medium italic">
              {p.conflict || p.description}
            </p>
            <div className="mt-auto pt-5 border-t border-gray-50 flex items-center justify-between">
               <div className="flex items-center gap-1.5">
                 <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                 <span className="text-[10px] font-bold text-gray-500 uppercase truncate max-w-[120px]">
                   {p.highlight?.slice(0, 15)}...
                 </span>
               </div>
               {p.isCustom && (
                  <button onClick={(e) => { e.stopPropagation(); onDeleteCustomTemplate(p.id); }} className="text-gray-200 hover:text-red-500 transition-colors p-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
               )}
            </div>
          </div>
        ))}
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-orange-100">{selectedGenre.charAt(0)}</div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800 tracking-tight">灵感碎片采集中</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">版块：{selectedGenre}</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsAdding(false)} className="text-gray-300 hover:text-gray-500 transition-colors">
                 <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="text-[10px] font-black text-gray-400 mb-2 block uppercase tracking-tighter">书名预设</label>
                <input autoFocus className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-500/20 outline-none transition-all font-bold text-gray-800 text-lg" value={newTpl.title} onChange={e => setNewTpl({...newTpl, title: e.target.value})} />
              </div>
              
              <div>
                <label className="text-[10px] font-black text-gray-400 mb-2 block uppercase tracking-tighter">世界观框架</label>
                <input placeholder={genreData.placeholders.world} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-500/20 outline-none" value={newTpl.worldSetting} onChange={e => setNewTpl({...newTpl, worldSetting: e.target.value})} />
              </div>
              
              <div>
                <label className="text-[10px] font-black text-gray-400 mb-2 block uppercase tracking-tighter">核心主角档案</label>
                <input placeholder={genreData.placeholders.hero} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-500/20 outline-none" value={newTpl.protagonist} onChange={e => setNewTpl({...newTpl, protagonist: e.target.value})} />
              </div>
              
              <div className="col-span-2">
                <label className="text-[10px] font-black text-gray-400 mb-2 block uppercase tracking-tighter">爆款爽点 (用于钩子提示)</label>
                <input placeholder={genreData.placeholders.hook} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-500/20 outline-none" value={newTpl.highlight} onChange={e => setNewTpl({...newTpl, highlight: e.target.value})} />
              </div>
              
              <div className="col-span-2">
                <label className="text-[10px] font-black text-gray-400 mb-2 block uppercase tracking-tighter">开场核心冲突剧情</label>
                <textarea className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl h-32 resize-none focus:ring-2 focus:ring-orange-500/20 outline-none text-sm leading-relaxed" value={newTpl.conflict} onChange={e => setNewTpl({...newTpl, conflict: e.target.value})} />
              </div>
            </div>
            
            <button type="submit" className="w-full mt-10 py-5 bg-orange-600 text-white rounded-[24px] font-bold hover:bg-orange-700 shadow-2xl shadow-orange-100 transition-all active:scale-[0.98] text-lg">
              注入灵感库
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default PromptLibrary;
