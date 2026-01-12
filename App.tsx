
import React, { useState, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import PromptLibrary from './components/PromptLibrary';
import GenreTrends from './components/GenreTrends';
import { aiService, ModelConfig, AIProvider } from './services/aiService';
import { Genre, PromptTemplate } from './types';
import { GENRE_SPECIFIC_TAGS, Tag } from './constants';
import { GoogleGenAI } from "@google/genai";

const App: React.FC = () => {
  const [activeGenre, setActiveGenre] = useState<string>(() => localStorage.getItem('fanqie_active_genre') || Genre.BAZONG);
  const [writingMode, setWritingMode] = useState<'male' | 'female'>('male');
  const [targetWordCount, setTargetWordCount] = useState<number>(3000);
  
  const [selectedCharTags, setSelectedCharTags] = useState<string[]>([]);
  const [selectedWorldTags, setSelectedWorldTags] = useState<string[]>([]);
  
  const [customTags, setCustomTags] = useState<Record<string, { char: Tag[], world: Tag[] }>>(() => {
    const saved = localStorage.getItem('fanqie_custom_genre_tags');
    return saved ? JSON.parse(saved) : {};
  });

  const [userInput, setUserInput] = useState('');
  const [backgroundSetting, setBackgroundSetting] = useState(''); 
  const [generatedContent, setGeneratedContent] = useState('');
  const [activeTab, setActiveTab] = useState<'library' | 'editor'>('editor');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isDiceRolling, setIsDiceRolling] = useState(false);
  
  const [eyeProtection, setEyeProtection] = useState(false);
  const [showModelSettings, setShowModelSettings] = useState(false);
  
  const [tagModal, setTagModal] = useState<{show: boolean, type: 'char' | 'world'}>({show: false, type: 'char'});
  const [newTagLabel, setNewTagLabel] = useState('');
  const [newTagPrompt, setNewTagPrompt] = useState('');

  const [modelConfig, setModelConfig] = useState<ModelConfig>(() => {
    const saved = localStorage.getItem('fanqie_model_config');
    return saved ? JSON.parse(saved) : { provider: 'gemini', apiKey: '', modelName: 'gemini-3-pro-preview' };
  });

  const contentEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('fanqie_active_genre', activeGenre);
    localStorage.setItem('fanqie_custom_genre_tags', JSON.stringify(customTags));
  }, [activeGenre, customTags]);

  const currentGenreData = GENRE_SPECIFIC_TAGS[activeGenre] || { maleChar: [], femaleChar: [], world: [] };
  const officialCharTags = writingMode === 'male' ? currentGenreData.maleChar : currentGenreData.femaleChar;
  
  const currentCustomTags = customTags[activeGenre] || { char: [], world: [] };
  const allCurrentCharTags = [...officialCharTags, ...currentCustomTags.char];
  const allCurrentWorldTags = [...currentGenreData.world, ...currentCustomTags.world];

  const handleRollDice = () => {
    if (isDiceRolling || (allCurrentCharTags.length === 0 && allCurrentWorldTags.length === 0)) return;
    setIsDiceRolling(true);
    
    let iterations = 0;
    const maxIterations = 12;
    
    const interval = setInterval(() => {
      if (allCurrentCharTags.length > 0) {
        setSelectedCharTags([allCurrentCharTags[Math.floor(Math.random() * allCurrentCharTags.length)].id]);
      }
      if (allCurrentWorldTags.length > 0) {
        setSelectedWorldTags([allCurrentWorldTags[Math.floor(Math.random() * allCurrentWorldTags.length)].id]);
      }
      
      iterations++;
      if (iterations >= maxIterations) {
        clearInterval(interval);
        const finalChars = [...allCurrentCharTags]
          .sort(() => 0.5 - Math.random())
          .slice(0, Math.floor(Math.random() * 2) + 1)
          .map(t => t.id);
        const finalWorlds = [...allCurrentWorldTags]
          .sort(() => 0.5 - Math.random())
          .slice(0, 1)
          .map(t => t.id);
          
        setSelectedCharTags(finalChars);
        setSelectedWorldTags(finalWorlds);
        setIsDiceRolling(false);
      }
    }, 60);
  };

  const handleAddTag = () => {
    if (!newTagLabel || !newTagPrompt) return;
    const tag: Tag = {
      id: `custom-${activeGenre}-${Date.now()}`,
      label: newTagLabel,
      prompt: tagModal.type === 'char' ? `【人设自定义】：${newTagPrompt}` : `【背景自定义】：${newTagPrompt}`,
      isCustom: true
    };
    
    setCustomTags(prev => {
      const genreData = prev[activeGenre] || { char: [], world: [] };
      return {
        ...prev,
        [activeGenre]: {
          ...genreData,
          [tagModal.type]: [...genreData[tagModal.type], tag]
        }
      };
    });
    
    setNewTagLabel(''); 
    setNewTagPrompt(''); 
    setTagModal({show: false, type: 'char'});
  };

  const handleDeleteTag = (e: React.MouseEvent, tag: Tag, type: 'char' | 'world') => {
    e.stopPropagation(); // 防止触发选中逻辑
    
    if (tag.isCustom) {
      if (!window.confirm(`确定要永久删除自定义标签 [${tag.label}] 吗？`)) return;
      setCustomTags(prev => {
        const genreData = prev[activeGenre];
        if (!genreData) return prev;
        return {
          ...prev,
          [activeGenre]: {
            ...genreData,
            [type]: genreData[type].filter(t => t.id !== tag.id)
          }
        };
      });
    }
    
    // 如果是选中的标签，点击删除时取消选中
    if (type === 'char') setSelectedCharTags(prev => prev.filter(t => t !== tag.id));
    else setSelectedWorldTags(prev => prev.filter(t => t !== tag.id));
  };

  const handleStartWriting = async (isContinue: boolean = false) => {
    if (!userInput.trim() && !isContinue) return;
    if (!modelConfig.apiKey && modelConfig.provider !== 'gemini') { setShowModelSettings(true); return; }
    
    if (isContinue) setIsContinuing(true); else setIsGenerating(true);
    if (!isContinue) setGeneratedContent('');
    
    const charPrompts = allCurrentCharTags.filter(t => selectedCharTags.includes(t.id)).map(t => t.prompt).join('\n');
    const worldPrompts = allCurrentWorldTags.filter(t => selectedWorldTags.includes(t.id)).map(t => t.prompt).join('\n');

    const prompt = isContinue 
      ? `【续写指令】：\n${charPrompts}\n${worldPrompts}\n预期字数：${targetWordCount}\n世界观/当前环境：${backgroundSetting}\n下一步剧情动作：${userInput || '顺着逻辑继续推进'}\n\n当前已有正文：\n${generatedContent.slice(-1500)}`
      : `【新开章节】：\n${charPrompts}\n${worldPrompts}\n预期字数：${targetWordCount}\n世界观基础：${backgroundSetting}\n本章核心矛盾/细纲：${userInput}\n\n请直接开始撰写正文：`;
    
    try {
      const ai = new GoogleGenAI({ apiKey: modelConfig.apiKey || process.env.API_KEY || '' });
      const response = await ai.models.generateContentStream({
        model: modelConfig.modelName || 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          temperature: 0.6,
          thinkingConfig: { thinkingBudget: 4000 }
        }
      });
      for await (const chunk of response) {
        if (chunk.text) {
          setGeneratedContent(prev => prev + chunk.text);
          if (contentEndRef.current) contentEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }
    } catch (err: any) { alert(`生成失败: ${err.message}`); } finally { 
      setIsGenerating(false); setIsContinuing(false);
    }
  };

  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-500 ${eyeProtection ? 'bg-[#f4ecd8]' : 'bg-gray-50'}`}>
      <Sidebar activeGenre={activeGenre} onGenreSelect={(g) => { 
        setActiveGenre(g); 
        setSelectedCharTags([]); 
        setSelectedWorldTags([]);
        setActiveTab('editor'); 
      }} />

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-8 shrink-0 z-10">
          <div className="flex items-center gap-6">
            <h2 className="text-lg font-bold text-gray-800 tracking-tighter">
              <span className="text-orange-500">金牌</span>写手 AI
              <span className="ml-3 text-xs font-black text-gray-300 bg-gray-100 px-2 py-1 rounded uppercase tracking-widest">CHANNEL: {activeGenre}</span>
            </h2>
            <nav className="flex bg-gray-100 p-1 rounded-xl">
              <button onClick={() => setActiveTab('library')} className={`px-5 py-1.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'library' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}>爆款库</button>
              <button onClick={() => setActiveTab('editor')} className={`px-5 py-1.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'editor' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}>编辑器</button>
            </nav>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => setEyeProtection(!eyeProtection)} className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all ${eyeProtection ? 'bg-orange-100 border-orange-200 text-orange-700' : 'bg-white border-gray-200 text-gray-500'}`}>
               {eyeProtection ? '🌙 护眼模式' : '☀️ 普通模式'}
             </button>
             <button onClick={() => setShowModelSettings(true)} className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all">AI设置</button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {activeTab === 'library' ? (
            <div className="max-w-6xl mx-auto space-y-10">
               <GenreTrends genre={activeGenre} trends={null} isLoading={false} />
               <PromptLibrary selectedGenre={activeGenre} modelConfig={modelConfig} onSelectTemplate={(t) => { setBackgroundSetting(t.worldSetting); setUserInput(t.conflict); setActiveTab('editor'); }} customTemplates={[]} onAddCustomTemplate={()=>{}} onDeleteCustomTemplate={()=>{}} />
            </div>
          ) : (
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-3 space-y-6">
                <div className="bg-white rounded-[2rem] shadow-sm border border-gray-200 p-8 space-y-6">
                  <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex bg-gray-100 p-1 rounded-2xl">
                           <button onClick={() => { setWritingMode('male'); setSelectedCharTags([]); }} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${writingMode === 'male' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>大男主</button>
                           <button onClick={() => { setWritingMode('female'); setSelectedCharTags([]); }} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${writingMode === 'female' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-400'}`}>大女主</button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">单章字数:</span>
                          <div className="flex items-center bg-gray-50 border border-gray-100 rounded-lg px-2">
                            <input type="number" step="500" value={targetWordCount} onChange={(e) => setTargetWordCount(Number(e.target.value))} className="w-16 py-1 bg-transparent text-xs font-bold text-orange-600 focus:outline-none" />
                            <span className="text-[9px] font-bold text-gray-400 ml-1">字</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-4 items-center">
                        <button 
                          onClick={handleRollDice}
                          disabled={isDiceRolling}
                          className={`flex items-center gap-2 px-5 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black text-gray-500 hover:text-orange-600 hover:border-orange-100 transition-all group active:scale-95 shadow-sm ${isDiceRolling ? 'opacity-50 pointer-events-none' : ''}`}>
                          <span className={`text-base transition-transform duration-500 ${isDiceRolling ? 'animate-bounce' : 'group-hover:rotate-180'}`}>🎲</span>
                          <span>随机灵感骰子</span>
                        </button>
                        <div className="h-4 w-px bg-gray-100 mx-1"></div>
                        <button onClick={() => setTagModal({show: true, type: 'char'})} className="px-4 py-2 bg-blue-50 text-blue-600 text-[10px] font-black rounded-xl hover:bg-blue-100 transition-colors shadow-sm">+ 人设标签</button>
                        <button onClick={() => setTagModal({show: true, type: 'world'})} className="px-4 py-2 bg-orange-50 text-orange-600 text-[10px] font-black rounded-xl hover:bg-orange-100 transition-colors shadow-sm">+ 背景标签</button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        <span className="text-[10px] font-black text-gray-300 uppercase self-center mr-2 tracking-widest flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span> 人设灵感:
                        </span>
                        {allCurrentCharTags.length > 0 ? allCurrentCharTags.map(tag => {
                          const isSelected = selectedCharTags.includes(tag.id);
                          return (
                            <div key={tag.id} className="relative group/tag">
                              <button 
                                onClick={() => setSelectedCharTags(prev => isSelected ? prev.filter(t => t !== tag.id) : [...prev, tag.id])} 
                                className={`px-4 py-2 rounded-xl text-[11px] font-bold border transition-all duration-300 ${tag.isCustom ? 'border-dashed' : 'border-solid'} ${isSelected ? (writingMode === 'male' ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-200/50 scale-105 ring-2 ring-blue-100 ring-offset-1' : 'bg-pink-600 border-pink-600 text-white shadow-xl shadow-pink-200/50 scale-105 ring-2 ring-pink-100 ring-offset-1') : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-200 hover:bg-white'}`}>
                                {tag.label}
                                {isSelected && <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none"></div>}
                              </button>
                              <button 
                                onClick={(e) => handleDeleteTag(e, tag, 'char')}
                                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover/tag:opacity-100 transition-opacity shadow-lg z-10 hover:scale-110 active:scale-90">
                                ✕
                              </button>
                            </div>
                          );
                        }) : <span className="text-[10px] text-gray-300 italic self-center">暂无标签</span>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="text-[10px] font-black text-gray-300 uppercase self-center mr-2 tracking-widest flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-orange-400 rounded-full"></span> 背景灵感:
                        </span>
                        {allCurrentWorldTags.length > 0 ? allCurrentWorldTags.map(tag => {
                          const isSelected = selectedWorldTags.includes(tag.id);
                          return (
                            <div key={tag.id} className="relative group/tag">
                              <button 
                                onClick={() => setSelectedWorldTags(prev => isSelected ? prev.filter(t => t !== tag.id) : [...prev, tag.id])} 
                                className={`px-4 py-2 rounded-xl text-[11px] font-bold border transition-all duration-300 ${tag.isCustom ? 'border-dashed' : 'border-solid'} ${isSelected ? 'bg-orange-500 border-orange-500 text-white shadow-xl shadow-orange-200/50 scale-105 ring-2 ring-orange-100 ring-offset-1' : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-200 hover:bg-white'}`}>
                                {tag.label}
                                {isSelected && <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none"></div>}
                              </button>
                              <button 
                                onClick={(e) => handleDeleteTag(e, tag, 'world')}
                                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover/tag:opacity-100 transition-opacity shadow-lg z-10 hover:scale-110 active:scale-90">
                                ✕
                              </button>
                            </div>
                          );
                        }) : <span className="text-[10px] text-gray-300 italic self-center">暂无标签</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between ml-2">
                        <label className="text-[11px] font-black text-gray-500 uppercase flex items-center gap-2">
                          <svg className="w-3.5 h-3.5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2 2 2 0 012 2v.657M7 20h10" /></svg>
                          当前环境/世界观设定
                        </label>
                      </div>
                      <textarea value={backgroundSetting} onChange={(e) => setBackgroundSetting(e.target.value)} placeholder="补充本章的具体地点、当前季节气氛、或者特殊的等级设定..." className="w-full h-36 p-5 bg-gray-50 border border-gray-100 rounded-3xl text-sm focus:ring-4 focus:ring-orange-500/5 focus:border-orange-200 outline-none resize-none transition-all placeholder:text-gray-300 leading-relaxed" />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between ml-2">
                        <label className="text-[11px] font-black text-gray-500 uppercase flex items-center gap-2">
                          <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          本章核心剧情细纲
                        </label>
                      </div>
                      <textarea value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder="描述本章要发生的关键动作，AI将严格遵循此逻辑撰写..." className="w-full h-36 p-5 bg-gray-50 border border-gray-100 rounded-3xl text-sm focus:ring-4 focus:ring-orange-500/5 focus:border-orange-200 outline-none resize-none transition-all placeholder:text-gray-300 leading-relaxed" />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 bg-gray-50 px-5 py-2.5 rounded-2xl border border-gray-100 shadow-inner">
                        <div className={`w-2 h-2 rounded-full ${generatedContent.length > 0 ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-200'}`}></div>
                        <span className="text-[11px] font-bold text-gray-500">本章已产出: <span className="text-orange-600 font-black ml-1">{generatedContent.length}</span> <span className="text-gray-300 ml-0.5">字</span></span>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <button onClick={() => handleStartWriting(true)} disabled={isContinuing || isGenerating || !generatedContent} className="px-6 py-4 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-30 flex items-center gap-2 shadow-sm">
                        {isContinuing ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div> : <span className="text-lg">✍️</span>}
                        <span>逻辑续写</span>
                      </button>
                      <button onClick={() => handleStartWriting(false)} disabled={isGenerating || isContinuing} className="px-14 py-4 bg-orange-600 text-white rounded-2xl font-black shadow-2xl shadow-orange-100 hover:bg-orange-700 active:scale-95 transition-all disabled:opacity-30 flex items-center gap-3">
                        {isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <span className="text-xl">🔥</span>}
                        <span className="text-base tracking-widest">一键爆更</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className={`relative rounded-[3rem] shadow-2xl p-16 min-h-[900px] border transition-all duration-700 ${eyeProtection ? 'bg-[#fcf8ef] border-[#e8dfc4]' : 'bg-white border-gray-100'}`}>
                  <div className="max-w-3xl mx-auto relative z-10">
                    {generatedContent ? (
                      generatedContent.split('\n').map((line, i) => (
                        <p key={i} className="mb-8 font-serif text-[1.25rem] font-medium leading-[2.5] text-gray-800 text-justify tracking-wide selection:bg-orange-100 first-letter:text-2xl first-letter:font-bold first-letter:text-orange-500/80">{line}</p>
                      ))
                    ) : (
                      <div className="py-80 text-center select-none opacity-20">
                        <div className="text-5xl mb-6 grayscale animate-bounce">🖋️</div>
                        <div className="text-xl font-serif tracking-[0.8em] text-gray-400">灵感在此处绽放</div>
                      </div>
                    )}
                    <div ref={contentEndRef} />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white rounded-[2.5rem] border border-gray-200 p-8 shadow-sm sticky top-8">
                  <div className="flex items-center gap-2 mb-8">
                    <div className="w-1.5 h-6 bg-orange-500 rounded-full"></div>
                    <h4 className="text-[11px] font-black text-gray-800 uppercase tracking-widest italic">辅助工具箱</h4>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {[
                      {id: 'deai', label: '🛡️ 去AI味润色', sub: '修正翻译腔与过度描述'},
                      {id: 'character', label: '🎭 人设一致性', sub: '检查言行是否契合标签'},
                      {id: 'highlight', label: '🔥 爽点压力分析', sub: '评估冲突节奏与爆点'}
                    ].map(tool => (
                      <button key={tool.id} onClick={() => {}} className="p-5 bg-gray-50 border border-gray-100 rounded-3xl text-left hover:bg-white hover:shadow-xl hover:border-orange-100 transition-all active:scale-95 group">
                        <div className="text-[11px] font-black text-gray-800 uppercase group-hover:text-orange-600 transition-colors tracking-tight">{tool.label}</div>
                        <div className="text-[9px] text-gray-400 font-bold mt-1 leading-relaxed opacity-60">{tool.sub}</div>
                      </button>
                    ))}
                  </div>
                  <div className="mt-8 pt-8 border-t border-gray-50">
                    <p className="text-[10px] text-gray-300 font-black uppercase tracking-[0.2em] mb-4">创作统计</p>
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[11px] font-bold text-gray-400">活跃标签数</span>
                      <span className="text-[11px] font-black text-orange-500">{allCurrentCharTags.length + allCurrentWorldTags.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {tagModal.show && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm p-10 animate-in zoom-in-95 duration-200">
              <h3 className="text-xl font-black text-gray-800 mb-8 flex items-center gap-3">
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-white text-base ${tagModal.type === 'char' ? 'bg-blue-500' : 'bg-orange-500'}`}>
                   {tagModal.type === 'char' ? '👤' : '🌍'}
                </span>
                {tagModal.type === 'char' ? '新增人设' : '新增背景'}
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block ml-1 tracking-widest">标签名称 (限8字)</label>
                  <input maxLength={8} type="text" placeholder="例：苟道巅峰" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-orange-500/5 transition-all font-bold text-gray-700" value={newTagLabel} onChange={e => setNewTagLabel(e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block ml-1 tracking-widest">指令提示词</label>
                  <textarea placeholder="描述该人设/背景的底层逻辑..." className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none h-28 resize-none text-sm leading-relaxed" value={newTagPrompt} onChange={e => setNewTagPrompt(e.target.value)} />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setTagModal({show: false, type: 'char'})} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold hover:bg-gray-200 transition-colors">取消</button>
                  <button onClick={handleAddTag} className="flex-1 py-4 bg-orange-600 text-white rounded-2xl font-black shadow-lg shadow-orange-100 hover:bg-orange-700 transition-all">保存</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showModelSettings && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
            <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md p-12">
              <h3 className="text-2xl font-black text-gray-800 mb-10 italic tracking-tighter">AI 创作引擎</h3>
              <div className="space-y-8">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase block mb-3 ml-1">Gemini API KEY</label>
                  <input type="password" placeholder="粘贴您的密钥..." className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-[2rem] text-sm font-mono focus:ring-4 focus:ring-orange-500/5 transition-all" value={modelConfig.apiKey} onChange={e => setModelConfig({...modelConfig, apiKey: e.target.value})} />
                </div>
                <button onClick={() => {
                  localStorage.setItem('fanqie_model_config', JSON.stringify(modelConfig));
                  setShowModelSettings(false);
                }} className="w-full py-6 bg-black text-white rounded-[2.5rem] font-black shadow-2xl hover:bg-gray-800 transition-all">确认激活</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
