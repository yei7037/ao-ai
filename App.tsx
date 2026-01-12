
import React, { useState, useRef, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import PromptLibrary from './components/PromptLibrary';
import GenreTrends from './components/GenreTrends';
import { aiService, ModelConfig, AIProvider } from './services/aiService';
import { Genre, PromptTemplate } from './types';
import { GENRE_SPECIFIC_TAGS, Tag } from './constants';
import { GoogleGenAI } from "@google/genai";
import { gemini } from './services/geminiService';

const App: React.FC = () => {
  const [activeGenre, setActiveGenre] = useState<string>(() => localStorage.getItem('fanqie_active_genre') || Genre.BAZONG);
  const [writingMode, setWritingMode] = useState<'male' | 'female' | 'normal'>('male');
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
  const [eyeProtection, setEyeProtection] = useState(false);
  const [showModelSettings, setShowModelSettings] = useState(false);
  const [isDiceRolling, setIsDiceRolling] = useState(false);
  
  const [tagModal, setTagModal] = useState<{show: boolean, type: 'char' | 'world'}>({show: false, type: 'char'});
  const [newTagLabel, setNewTagLabel] = useState('');
  const [newTagPrompt, setNewTagPrompt] = useState('');

  const [nameSuggestions, setNameSuggestions] = useState<any[]>([]);
  const [isNaming, setIsNaming] = useState(false);
  const [optimizeModal, setOptimizeModal] = useState(false);
  const [optimizeInput, setOptimizeInput] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);

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
  
  const officialCharTags = useMemo(() => {
    if (writingMode === 'male') return currentGenreData.maleChar;
    if (writingMode === 'female') return currentGenreData.femaleChar;
    return [...currentGenreData.maleChar, ...currentGenreData.femaleChar];
  }, [writingMode, currentGenreData]);
  
  const currentCustomTags = customTags[activeGenre] || { char: [], world: [] };
  const allCurrentCharTags = [...officialCharTags, ...currentCustomTags.char];
  const allCurrentWorldTags = [...currentGenreData.world, ...currentCustomTags.world];

  const handleGenerateNames = async () => {
    const apiKey = modelConfig.apiKey || process.env.API_KEY;
    if (!apiKey) { setShowModelSettings(true); return; }
    setIsNaming(true);
    try {
      const names = await gemini.generateNames(activeGenre, backgroundSetting || "通用玄幻都市背景");
      setNameSuggestions(names);
    } catch (err) {
      alert("起名失败，请稍后重试");
    } finally {
      setIsNaming(false);
    }
  };

  const handleOptimizeContent = async () => {
    if (!generatedContent || !optimizeInput) {
      alert("请先生成内容并输入优化指令");
      return;
    }
    const apiKey = modelConfig.apiKey || process.env.API_KEY;
    if (!apiKey) { setShowModelSettings(true); return; }
    
    setIsOptimizing(true);
    const originalText = generatedContent;
    setGeneratedContent(''); 
    
    const prompt = `
      你是一名金牌网文编辑。请根据以下优化指令对文本进行重写：
      【优化指令】：${optimizeInput}
      【频道】：${activeGenre}
      【原文本】：
      ${originalText}
      
      要求：保持剧情逻辑不变，显著提升文字质量，直接输出润色后的正文，严禁任何废话。
    `;

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContentStream({
        model: modelConfig.modelName || 'gemini-3-pro-preview',
        contents: prompt,
        config: { temperature: 0.8, thinkingConfig: { thinkingBudget: 4000 } }
      });
      for await (const chunk of response) {
        if (chunk.text) {
          setGeneratedContent(prev => prev + chunk.text);
          contentEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      }
      setOptimizeModal(false);
      setOptimizeInput('');
    } catch (err: any) {
      alert(`润色失败: ${err.message}`);
      setGeneratedContent(originalText);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleOpenOptimizer = (defaultInstruction: string) => {
    if (!generatedContent) {
      alert("请先撰写正文内容再使用优化功能");
      return;
    }
    setOptimizeInput(defaultInstruction);
    setOptimizeModal(true);
  };

  const handleRollDice = () => {
    if (isDiceRolling || (allCurrentCharTags.length === 0 && allCurrentWorldTags.length === 0)) return;
    setIsDiceRolling(true);
    let iterations = 0;
    const maxIterations = 12;
    const interval = setInterval(() => {
      if (allCurrentCharTags.length > 0) setSelectedCharTags([allCurrentCharTags[Math.floor(Math.random() * allCurrentCharTags.length)].id]);
      if (allCurrentWorldTags.length > 0) setSelectedWorldTags([allCurrentWorldTags[Math.floor(Math.random() * allCurrentWorldTags.length)].id]);
      iterations++;
      if (iterations >= maxIterations) {
        clearInterval(interval);
        setSelectedCharTags([...allCurrentCharTags].sort(() => 0.5 - Math.random()).slice(0, 2).map(t => t.id));
        setSelectedWorldTags([...allCurrentWorldTags].sort(() => 0.5 - Math.random()).slice(0, 1).map(t => t.id));
        setIsDiceRolling(false);
      }
    }, 60);
  };

  const handleAddTag = () => {
    if (!newTagLabel || !newTagPrompt) return;
    const tag: Tag = {
      id: `custom-${activeGenre}-${Date.now()}`,
      label: newTagLabel,
      prompt: tagModal.type === 'char' ? `【核心人设细节】：${newTagPrompt}` : `【核心背景设定】：${newTagPrompt}`,
      isCustom: true
    };
    setCustomTags(prev => {
      const genreData = prev[activeGenre] || { char: [], world: [] };
      return { ...prev, [activeGenre]: { ...genreData, [tagModal.type]: [...genreData[tagModal.type], tag] } };
    });
    setNewTagLabel(''); setNewTagPrompt(''); setTagModal({show: false, type: 'char'});
  };

  const handleDeleteTag = (e: React.MouseEvent, tag: Tag, type: 'char' | 'world') => {
    e.stopPropagation();
    if (!tag.isCustom) {
      if (type === 'char') setSelectedCharTags(prev => prev.filter(t => t !== tag.id));
      else setSelectedWorldTags(prev => prev.filter(t => t !== tag.id));
      return;
    }
    if (window.confirm(`确认删除自定义标签 [${tag.label}] 吗？`)) {
      setCustomTags(prev => {
        const genreData = prev[activeGenre];
        if (!genreData) return prev;
        return { ...prev, [activeGenre]: { ...genreData, [type]: genreData[type].filter(t => t.id !== tag.id) } };
      });
      if (type === 'char') setSelectedCharTags(prev => prev.filter(t => t !== tag.id));
      else setSelectedWorldTags(prev => prev.filter(t => t !== tag.id));
    }
  };

  const handleStartWriting = async (isContinue: boolean = false) => {
    const apiKey = modelConfig.apiKey || process.env.API_KEY;
    if (!apiKey) { setShowModelSettings(true); return; }
    
    if (isContinue) setIsContinuing(true); else setIsGenerating(true);
    if (!isContinue) setGeneratedContent('');
    
    const selectedCharPrompts = allCurrentCharTags.filter(t => selectedCharTags.includes(t.id)).map(t => t.prompt).join('\n');
    const selectedWorldPrompts = allCurrentWorldTags.filter(t => selectedWorldTags.includes(t.id)).map(t => t.prompt).join('\n');

    const finalPrompt = `
      【创作频道】：${activeGenre}
      【叙事内核】：${writingMode === 'male' ? '大男主（无敌、杀伐果断）' : writingMode === 'female' ? '大女主（独立、掉马甲、惊艳）' : '正常写实（逻辑严密、情感自然）'}
      【人设设定】：${selectedCharPrompts || '通用网文主角设定'}
      【环境/背景】：${selectedWorldPrompts || '通用频道背景'}${backgroundSetting ? '细节：' + backgroundSetting : ''}
      【本章剧情】：${userInput || '顺推剧情'}
      【写作规则】：目标${targetWordCount}字，地道网文风，节奏快，爽点足。
      ${isContinue ? '续写接续：\n' + generatedContent.slice(-1200) : '开始创作正文。'}
      请直接开始撰写正文：
    `;
    
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContentStream({
        model: modelConfig.modelName || 'gemini-3-pro-preview',
        contents: finalPrompt,
        config: { temperature: 0.75, topP: 0.9, thinkingConfig: { thinkingBudget: 4000 } }
      });
      for await (const chunk of response) {
        if (chunk.text) {
          setGeneratedContent(prev => prev + chunk.text);
          contentEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      }
    } catch (err: any) { 
      alert(`生成失败: ${err.message}`); 
    } finally { 
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
              <span className="ml-3 text-xs font-black text-gray-300 bg-gray-100 px-2 py-1 rounded uppercase tracking-widest">{activeGenre}</span>
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
                           <button onClick={() => { setWritingMode('male'); setSelectedCharTags([]); }} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${writingMode === 'male' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>大男主</button>
                           <button onClick={() => { setWritingMode('female'); setSelectedCharTags([]); }} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${writingMode === 'female' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-400'}`}>大女主</button>
                           <button onClick={() => { setWritingMode('normal'); setSelectedCharTags([]); }} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${writingMode === 'normal' ? 'bg-white text-gray-600 shadow-sm' : 'text-gray-400'}`}>普通模式</button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">单章字数:</span>
                          <input type="number" step="500" value={targetWordCount} onChange={(e) => setTargetWordCount(Number(e.target.value))} className="w-16 py-1 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold text-orange-600 focus:outline-none px-2" />
                        </div>
                      </div>
                      <div className="flex gap-4 items-center">
                        <button onClick={handleGenerateNames} disabled={isNaming} className="flex items-center gap-2 px-5 py-2.5 bg-blue-50 border border-blue-100 rounded-2xl text-[10px] font-black text-blue-600 hover:bg-blue-100 transition-all">
                          {isNaming ? '🔍 搜寻中...' : '🏷️ AI起名'}
                        </button>
                        <button onClick={handleRollDice} disabled={isDiceRolling} className="flex items-center gap-2 px-5 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black text-gray-500 hover:text-orange-600 hover:border-orange-100 transition-all active:scale-95">
                          <span className={isDiceRolling ? 'animate-bounce' : ''}>🎲</span>
                          <span>随机灵感</span>
                        </button>
                        <button onClick={() => setTagModal({show: true, type: 'char'})} className="px-4 py-2 bg-blue-50 text-blue-600 text-[10px] font-black rounded-xl">+ 人设</button>
                        <button onClick={() => setTagModal({show: true, type: 'world'})} className="px-4 py-2 bg-orange-50 text-orange-600 text-[10px] font-black rounded-xl">+ 背景</button>
                      </div>
                    </div>

                    {nameSuggestions.length > 0 && (
                      <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 flex flex-wrap gap-4 animate-in fade-in duration-500">
                        <div className="w-full flex justify-between items-center mb-2">
                          <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">起名建议（点击复制）:</span>
                          <button onClick={() => setNameSuggestions([])} className="text-blue-300 text-xs">清除</button>
                        </div>
                        {nameSuggestions.map((item, idx) => (
                          <div key={idx} onClick={() => { navigator.clipboard.writeText(item.name); }} className="px-3 py-1.5 bg-white rounded-xl border border-blue-100 text-xs cursor-pointer hover:border-blue-400 transition-all">
                            <span className="text-blue-400 mr-2">[{item.category}]</span>
                            <span className="font-bold text-gray-700">{item.name}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span> 人设标签:</span>
                        {allCurrentCharTags.map(tag => (
                          <div key={tag.id} className="relative group/tag">
                            <button onClick={() => setSelectedCharTags(prev => prev.includes(tag.id) ? prev.filter(t => t !== tag.id) : [...prev, tag.id])} 
                              className={`px-4 py-2 rounded-xl text-[11px] font-bold border transition-all ${selectedCharTags.includes(tag.id) ? 'bg-orange-600 border-orange-600 text-white shadow-lg scale-105' : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-orange-200'}`}>
                              {tag.label}
                            </button>
                            <button onClick={(e) => handleDeleteTag(e, tag, 'char')} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] border-2 border-white opacity-0 group-hover/tag:opacity-100 transition-opacity z-10">✕</button>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-orange-400 rounded-full"></span> 背景标签:</span>
                        {allCurrentWorldTags.map(tag => (
                          <div key={tag.id} className="relative group/tag">
                            <button onClick={() => setSelectedWorldTags(prev => prev.includes(tag.id) ? prev.filter(t => t !== tag.id) : [...prev, tag.id])} 
                              className={`px-4 py-2 rounded-xl text-[11px] font-bold border transition-all ${selectedWorldTags.includes(tag.id) ? 'bg-orange-600 border-orange-600 text-white shadow-lg scale-105' : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-orange-200'}`}>
                              {tag.label}
                            </button>
                            <button onClick={(e) => handleDeleteTag(e, tag, 'world')} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] border-2 border-white opacity-0 group-hover/tag:opacity-100 transition-opacity z-10">✕</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <textarea value={backgroundSetting} onChange={(e) => setBackgroundSetting(e.target.value)} placeholder="补充本章环境设定（地点、氛围、特殊道具）..." className="w-full h-36 p-5 bg-gray-50 border border-gray-100 rounded-3xl text-sm outline-none resize-none focus:ring-2 focus:ring-orange-500/10" />
                    <textarea value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder="描述本章核心剧情冲突（反转、打脸或情感爆发点）..." className="w-full h-36 p-5 bg-gray-50 border border-gray-100 rounded-3xl text-sm outline-none resize-none focus:ring-2 focus:ring-orange-500/10" />
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="bg-gray-50 px-5 py-2 rounded-2xl border border-gray-100 text-[11px] font-bold text-gray-500">
                      字数统计: <span className="text-orange-600 font-black">{generatedContent.length}</span>
                    </div>
                    <div className="flex gap-4">
                      {generatedContent && (
                        <button onClick={() => setOptimizeModal(true)} className="px-6 py-4 bg-purple-50 text-purple-600 rounded-2xl font-bold flex items-center gap-2 hover:bg-purple-100 transition-colors">
                          ✨ 智能润色
                        </button>
                      )}
                      <button onClick={() => handleStartWriting(true)} disabled={isContinuing || isGenerating || !generatedContent} className="px-6 py-4 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-50 transition-colors">
                        {isContinuing ? <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div> : '✍️'}
                        <span>顺推续写</span>
                      </button>
                      <button onClick={() => handleStartWriting(false)} disabled={isGenerating || isContinuing} className="px-14 py-4 bg-orange-600 text-white rounded-2xl font-black shadow-lg flex items-center gap-3 hover:bg-orange-700 transition-all active:scale-95">
                        {isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : '🔥'}
                        <span className="tracking-widest uppercase">开始生成</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className={`rounded-[3rem] shadow-2xl p-16 min-h-[900px] border transition-all relative ${eyeProtection ? 'bg-[#fcf8ef] border-[#e8dfc4]' : 'bg-white border-gray-100'}`}>
                  <div className="max-w-3xl mx-auto font-serif text-justify">
                    {generatedContent ? (
                      generatedContent.split('\n').map((line, i) => <p key={i} className="mb-8 text-[1.2rem] leading-[2.4] text-gray-800 tracking-wide">{line}</p>)
                    ) : (
                      <div className="py-80 text-center opacity-20"><div className="text-5xl mb-6">🖋️</div><div className="text-xl tracking-[0.8em]">灵感在笔尖跃动</div></div>
                    )}
                    <div ref={contentEndRef} />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white rounded-[2.5rem] border border-gray-200 p-8 shadow-sm sticky top-8 space-y-4">
                  <h4 className="text-[11px] font-black text-gray-800 uppercase tracking-widest italic border-b pb-2">写作增强</h4>
                  <button onClick={() => handleOpenOptimizer("去除翻译腔，使语言更符合中文网文阅读习惯，增加地道词汇。")} className="w-full p-4 bg-gray-50 rounded-2xl text-[11px] font-black text-gray-800 text-left hover:bg-orange-50 transition-colors">🛡️ 润色：去 AI 味</button>
                  <button onClick={() => handleOpenOptimizer("增加细腻的环境和氛围描写，通过景物烘托当前人物的心境。")} className="w-full p-4 bg-gray-50 rounded-2xl text-[11px] font-black text-gray-800 text-left hover:bg-orange-50 transition-colors">🌆 优化：细节描写</button>
                  <button onClick={() => handleOpenOptimizer("深入刻画人物的心理活动和微表情，增强读者的情感共鸣。")} className="w-full p-4 bg-gray-50 rounded-2xl text-[11px] font-black text-gray-800 text-left hover:bg-orange-50 transition-colors">🎭 增强：情感共鸣</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 优化/润色弹窗 */}
        {optimizeModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[260] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-10">
              <h3 className="text-xl font-black mb-6">✨ 智能润色优化</h3>
              <p className="text-xs text-gray-400 mb-6 italic">您可以输入具体的修改要求，例如：“把这段写得更热血一点”、“增加路人的震惊反应”等。</p>
              <textarea autoFocus value={optimizeInput} onChange={e => setOptimizeInput(e.target.value)} placeholder="输入优化指令..." className="w-full px-5 py-4 bg-gray-50 rounded-2xl outline-none h-32 resize-none border border-transparent focus:border-purple-500 mb-6" />
              <div className="flex gap-3">
                <button onClick={() => { setOptimizeModal(false); setOptimizeInput(''); }} className="flex-1 py-4 bg-gray-100 rounded-2xl font-bold">取消</button>
                <button onClick={handleOptimizeContent} disabled={isOptimizing} className="flex-1 py-4 bg-purple-600 text-white rounded-2xl font-black shadow-lg">
                  {isOptimizing ? '优化中...' : '确认优化'}
                </button>
              </div>
            </div>
          </div>
        )}

        {tagModal.show && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm p-10 animate-in zoom-in-95 duration-200">
              <h3 className="text-xl font-black mb-8">{tagModal.type === 'char' ? '👤 自定义人设' : '🌍 自定义背景'}</h3>
              <div className="space-y-4">
                <input maxLength={8} placeholder="标签名称" className="w-full px-5 py-4 bg-gray-50 rounded-2xl outline-none border border-transparent focus:border-orange-500" value={newTagLabel} onChange={e => setNewTagLabel(e.target.value)} />
                <textarea placeholder="描述内容" className="w-full px-5 py-4 bg-gray-50 rounded-2xl outline-none h-28 resize-none border border-transparent focus:border-orange-500" value={newTagPrompt} onChange={e => setNewTagPrompt(e.target.value)} />
                <div className="flex gap-3 mt-4">
                  <button onClick={() => setTagModal({show: false, type: 'char'})} className="flex-1 py-4 bg-gray-100 rounded-2xl font-bold">取消</button>
                  <button onClick={handleAddTag} className="flex-1 py-4 bg-orange-600 text-white rounded-2xl font-black">保存标签</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showModelSettings && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
            <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md p-12">
              <h3 className="text-2xl font-black mb-10 italic">系统设置</h3>
              <div className="space-y-8">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Gemini API Key</label>
                  <input type="password" placeholder="粘贴您的 API Key..." className="w-full px-6 py-5 bg-gray-50 rounded-[2rem] font-mono outline-none border border-gray-100 focus:border-orange-500" value={modelConfig.apiKey} onChange={e => setModelConfig({...modelConfig, apiKey: e.target.value})} />
                </div>
                <button onClick={() => { localStorage.setItem('fanqie_model_config', JSON.stringify(modelConfig)); setShowModelSettings(false); }} className="w-full py-6 bg-black text-white rounded-[2.5rem] font-black hover:bg-gray-900 transition-all">保存配置</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
