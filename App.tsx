
import React, { useState, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import PromptLibrary from './components/PromptLibrary';
import GenreTrends from './components/GenreTrends';
import { aiService, ModelConfig, AIProvider } from './services/aiService';
import { Genre, PromptTemplate } from './types';

const App: React.FC = () => {
  const [activeGenre, setActiveGenre] = useState<string>(() => localStorage.getItem('fanqie_active_genre') || Genre.BAZONG);
  const [userInput, setUserInput] = useState(() => localStorage.getItem('fanqie_user_input') || '');
  const [backgroundSetting, setBackgroundSetting] = useState(() => localStorage.getItem('fanqie_background') || ''); 
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(() => localStorage.getItem('fanqie_generated_content') || '');
  const [activeTab, setActiveTab] = useState<'library' | 'editor'>('library');
  const [trends, setTrends] = useState<any[] | null>(null);
  const [isLoadingTrends, setIsLoadingTrends] = useState(false);
  const [eyeProtection, setEyeProtection] = useState(false);
  const [suggestedNames, setSuggestedNames] = useState<any[]>([]);
  const [isGeneratingNames, setIsGeneratingNames] = useState(false);
  const [showModelSettings, setShowModelSettings] = useState(false);

  // Model Config State - Initialized from LocalStorage
  const [modelConfig, setModelConfig] = useState<ModelConfig>(() => {
    const saved = localStorage.getItem('fanqie_model_config');
    if (saved) return JSON.parse(saved);
    return {
      provider: 'gemini',
      apiKey: '',
      modelName: 'gemini-3-pro-preview',
      baseUrl: ''
    };
  });

  const [customTemplates, setCustomTemplates] = useState<PromptTemplate[]>(() => {
    const saved = localStorage.getItem('fanqie_custom_templates');
    return saved ? JSON.parse(saved) : [];
  });

  const contentEndRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => contentEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  // Persist Config Changes automatically
  useEffect(() => {
    localStorage.setItem('fanqie_model_config', JSON.stringify(modelConfig));
  }, [modelConfig]);

  // Fetch trends when genre or model changes
  useEffect(() => {
    const fetchTrends = async () => {
      if (modelConfig.provider !== 'gemini' && !modelConfig.apiKey) return;
      setIsLoadingTrends(true);
      try {
        const data = await aiService.getGenreTrends(activeGenre, modelConfig);
        setTrends(data);
      } catch (err) { 
        setTrends(null); 
      } finally { 
        setIsLoadingTrends(false); 
      }
    };
    fetchTrends();
  }, [activeGenre, modelConfig.provider, modelConfig.modelName]);

  useEffect(() => {
    localStorage.setItem('fanqie_user_input', userInput);
    localStorage.setItem('fanqie_background', backgroundSetting);
    localStorage.setItem('fanqie_generated_content', generatedContent);
    localStorage.setItem('fanqie_active_genre', activeGenre);
    localStorage.setItem('fanqie_custom_templates', JSON.stringify(customTemplates));
  }, [userInput, backgroundSetting, generatedContent, activeGenre, customTemplates]);

  useEffect(() => {
    if (isGenerating) scrollToBottom();
  }, [generatedContent, isGenerating]);

  const handleSelectTemplate = (template: PromptTemplate) => {
    const preset = `【背景】${template.worldSetting}\n【冲突】${template.conflict}\n【爽点】${template.highlight}`;
    setUserInput(preset);
    setBackgroundSetting(template.worldSetting);
    setActiveTab('editor');
  };

  const handleGenerateNames = async () => {
    if (modelConfig.provider !== 'gemini' && !modelConfig.apiKey) {
      alert("请先配置 API Key");
      setShowModelSettings(true);
      return;
    }
    setIsGeneratingNames(true);
    try {
      const names = await aiService.generateNames(activeGenre, backgroundSetting, modelConfig);
      setSuggestedNames(names);
    } catch (e) {
      alert("起名失败，请检查配置。");
    } finally { 
      setIsGeneratingNames(false); 
    }
  };

  const handleStartWriting = async () => {
    if (!userInput.trim()) return;
    if (modelConfig.provider !== 'gemini' && !modelConfig.apiKey) {
      alert("请先配置 API Key");
      setShowModelSettings(true);
      return;
    }
    setIsGenerating(true);
    setGeneratedContent('');
    setActiveTab('editor');

    let styleInstruction = "要求：节奏极快，拒绝无用铺垫。";
    if (activeGenre === Genre.BAZONG) {
      styleInstruction = "要求：极致的豪门阔绰感，男女主对话要充满禁欲和拉扯感，台词要霸气（如：女人，你在玩火），心理描写要细腻。";
    }
    
    const fullPrompt = `你是一名番茄金牌作家。正在创作《${activeGenre}》题材作品。\n背景：${backgroundSetting}\n指令：${userInput}\n${styleInstruction}`;
    
    try {
      await aiService.generateNovelContent(fullPrompt, modelConfig, (chunk) => setGeneratedContent(prev => prev + chunk));
    } catch (err: any) { 
      alert(`生成失败: ${err.message || '请检查API Key或模型名'}`); 
    } finally { 
      setIsGenerating(false); 
    }
  };

  const handleContinue = async () => {
    if (!generatedContent || isGenerating) return;
    setIsGenerating(true);

    const continuePrompt = `你现在是番茄小说金牌续写专家。请基于以下信息进行情节续写：
    
    【核心背景设定】：${backgroundSetting}
    【当前已选题材】：${activeGenre}
    【前文内容】：${generatedContent}
    
    【续写深度要求】：
    1. 保持文风一致：严格沿用前文的角色性格特点和对话风格。
    2. 埋下伏笔：在续写中自然地植入1-2个后续可能爆发的冲突点或悬念。
    3. 爽点反转：本章结尾必须实现一个预期之外的情节反转，或为下一章节积累极大的期待感（钩子）。
    4. 融合设定：续写内容必须深度结合“背景设定”中的核心元素，严禁脱离逻辑。
    5. 节奏控制：拒绝无谓的水字数，每一段都要有实质性的信息推进。
    
    直接开始续写正文：`;

    try {
      let first = true;
      await aiService.generateNovelContent(continuePrompt, modelConfig, (chunk) => {
        if (first) { 
          setGeneratedContent(prev => prev + "\n\n[情节推演与反转]\n"); 
          first = false; 
        }
        setGeneratedContent(prev => prev + chunk);
      });
    } catch (err: any) {
      alert(`续写失败: ${err.message}`);
    } finally { 
      setIsGenerating(false); 
    }
  };

  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-500 ${eyeProtection ? 'bg-[#f4ecd8]' : 'bg-gray-50'}`}>
      <Sidebar activeGenre={activeGenre} onGenreSelect={(g) => { setActiveGenre(g); setActiveTab('library'); }} />

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-8 shrink-0 z-10">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <h2 className="text-lg font-bold text-gray-800 tracking-tight">{activeGenre} <span className="text-orange-500">创作助手</span></h2>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{modelConfig.provider} • {modelConfig.modelName}</span>
              </div>
            </div>
            <nav className="flex bg-gray-100 p-1 rounded-xl">
              <button onClick={() => setActiveTab('library')} className={`px-5 py-1.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'library' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}>灵感工坊</button>
              <button onClick={() => setActiveTab('editor')} className={`px-5 py-1.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'editor' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}>编辑器</button>
            </nav>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => setShowModelSettings(true)} className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-orange-500 hover:text-white rounded-lg text-xs font-bold text-gray-600 transition-all">
               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
               配置模型
             </button>
             <button onClick={() => setEyeProtection(!eyeProtection)} className={`p-2 rounded-full transition-colors ${eyeProtection ? 'bg-orange-200 text-orange-800' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.364l-.707.707M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
             </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {activeTab === 'library' ? (
            <div className="max-w-6xl mx-auto space-y-10">
              <GenreTrends genre={activeGenre} trends={trends} isLoading={isLoadingTrends} />
              <section>
                <div className="flex items-center gap-2 mb-6">
                  <span className="w-1.5 h-6 bg-orange-500 rounded-full"></span>
                  <h3 className="text-xl font-bold text-gray-800">灵感模板库</h3>
                </div>
                <PromptLibrary 
                   selectedGenre={activeGenre} 
                   modelConfig={modelConfig} 
                   onSelectTemplate={handleSelectTemplate} 
                   customTemplates={customTemplates} 
                   onAddCustomTemplate={(t) => setCustomTemplates(prev => [{...t, id: Date.now().toString()}, ...prev])} 
                   onDeleteCustomTemplate={(id) => setCustomTemplates(prev => prev.filter(x => x.id !== id))} 
                />
              </section>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto flex gap-8 animate-in fade-in duration-500">
              <div className="flex-1 space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
                   <div className="flex gap-4">
                     <div className="flex-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">背景设定</label>
                        <input value={backgroundSetting} onChange={(e) => setBackgroundSetting(e.target.value)} placeholder="设定世界观、金手指、主角身份..." className="w-full mt-1 bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500/20" />
                     </div>
                     <button onClick={handleGenerateNames} disabled={isGeneratingNames} className="h-[44px] mt-5 px-4 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all flex items-center gap-2">
                       {isGeneratingNames ? (
                         <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                       ) : '起名'}
                     </button>
                   </div>
                   {suggestedNames.length > 0 && (
                     <div className="flex flex-wrap gap-2 p-3 bg-indigo-50/30 rounded-xl border border-indigo-50">
                        {suggestedNames.map((n, i) => (
                          <span key={i} onClick={() => setUserInput(prev => prev + ` ${n.name}`)} className="cursor-pointer bg-white px-2.5 py-1 rounded-lg text-[10px] text-indigo-700 border border-indigo-100 hover:border-indigo-400 transition-all">{n.category}: {n.name}</span>
                        ))}
                     </div>
                   )}
                   <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">写作指令</label>
                      <textarea value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder="输入具体章节内容或情节指令..." className="w-full mt-1 h-32 p-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 resize-none text-gray-700 text-sm leading-relaxed" />
                   </div>
                   <div className="flex justify-end">
                      <button onClick={handleStartWriting} disabled={isGenerating || !userInput} className={`px-10 py-3 rounded-xl font-bold transition-all shadow-xl ${isGenerating || !userInput ? 'bg-gray-100 text-gray-400' : 'bg-orange-600 text-white hover:bg-orange-700 shadow-orange-100 active:scale-95'}`}>
                        {isGenerating ? "正在构思..." : "开启 AI 创作"}
                      </button>
                   </div>
                </div>

                <div className={`rounded-3xl shadow-xl p-12 min-h-[600px] transition-all duration-700 ${eyeProtection ? 'bg-[#fcf8ef] border-[#e8dfc4]' : 'bg-white border-gray-100'} border`}>
                  <div className="max-w-2xl mx-auto">
                    {generatedContent ? (
                      <div className="prose prose-lg prose-slate max-w-none">
                        {generatedContent.split('\n').map((para, i) => (
                          <p key={i} className="mb-8 leading-[2.2] text-gray-800 font-serif tracking-wide text-lg">{para}</p>
                        ))}
                      </div>
                    ) : (
                      <div className="py-24 text-center">
                         <div className="text-gray-200 text-6xl mb-4">✍️</div>
                         <div className="text-gray-300 font-bold tracking-widest uppercase text-sm">灵感一触即发</div>
                      </div>
                    )}
                    {isGenerating && <div className="text-orange-500 font-bold animate-pulse flex items-center gap-2 mt-4"><span className="w-2 h-2 bg-orange-500 rounded-full"></span> AI 灵感涌动中...</div>}
                    <div ref={contentEndRef} />
                  </div>
                </div>
              </div>

              <aside className="w-64 shrink-0">
                <div className="bg-white rounded-2xl p-5 border border-gray-200 sticky top-4 space-y-6">
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1 h-3 bg-orange-500 rounded-full"></span>
                      当前引擎状态
                    </h4>
                    <div className="p-3 bg-orange-50 rounded-xl border border-orange-100/50">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] text-orange-400 font-bold uppercase tracking-tighter">{modelConfig.provider}</p>
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                      </div>
                      <p className="text-xs text-orange-900 font-bold truncate">{modelConfig.modelName}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1 h-3 bg-indigo-500 rounded-full"></span>
                      金牌写作法则
                    </h4>
                    <div className="space-y-3">
                      <div className="group p-3 bg-gray-50 hover:bg-white hover:shadow-md hover:border-indigo-100 border border-transparent rounded-xl transition-all duration-300">
                        <div className="flex items-start gap-2.5">
                          <span className="mt-0.5 text-indigo-500 bg-indigo-50 p-1 rounded-md group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                          </span>
                          <div>
                            <p className="text-[11px] font-bold text-gray-800 mb-0.5">黄金三章</p>
                            <p className="text-[10px] text-gray-500 leading-relaxed">首章点亮金手指，三章必现小高潮。</p>
                          </div>
                        </div>
                      </div>

                      <div className="group p-3 bg-gray-50 hover:bg-white hover:shadow-md hover:border-rose-100 border border-transparent rounded-xl transition-all duration-300">
                        <div className="flex items-start gap-2.5">
                          <span className="mt-0.5 text-rose-500 bg-rose-50 p-1 rounded-md group-hover:bg-rose-500 group-hover:text-white transition-colors">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                          </span>
                          <div>
                            <p className="text-[11px] font-bold text-gray-800 mb-0.5">极致拉扯</p>
                            <p className="text-[10px] text-gray-500 leading-relaxed">台词去废话化，每一句互动都要推剧情。</p>
                          </div>
                        </div>
                      </div>

                      <div className="group p-3 bg-gray-50 hover:bg-white hover:shadow-md hover:border-amber-100 border border-transparent rounded-xl transition-all duration-300">
                        <div className="flex items-start gap-2.5">
                          <span className="mt-0.5 text-amber-500 bg-amber-50 p-1 rounded-md group-hover:bg-amber-500 group-hover:text-white transition-colors">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                          </span>
                          <div>
                            <p className="text-[11px] font-bold text-gray-800 mb-0.5">钩子留白</p>
                            <p className="text-[10px] text-gray-500 leading-relaxed">章末必设悬念，引导读者疯狂翻页。</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-100">
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 shadow-lg">
                      <p className="text-[10px] font-bold text-orange-400 uppercase mb-2">避雷提醒</p>
                      <p className="text-[10px] text-gray-300 leading-relaxed">
                        规避现实敏感词，使用虚构地名。拒绝平铺直叙，先抑后扬是核心。
                      </p>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>

        {/* Model Selection Modal */}
        {showModelSettings && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-bold text-gray-800 tracking-tight">模型配置中心</h3>
                <button onClick={() => setShowModelSettings(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 mb-2 block uppercase tracking-widest">选择服务商</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['gemini', 'openai', 'deepseek', 'grok'] as AIProvider[]).map(p => (
                      <button 
                        key={p} 
                        onClick={() => setModelConfig({
                          ...modelConfig, 
                          provider: p,
                          modelName: p === 'gemini' ? 'gemini-3-pro-preview' : modelConfig.modelName
                        })}
                        className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${modelConfig.provider === p ? 'bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-100' : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100'}`}
                      >
                        {p.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 mb-2 block uppercase tracking-widest">API Key (自动保存)</label>
                  <input 
                    type="password"
                    placeholder={modelConfig.provider === 'gemini' ? '可选 (优先使用环境变量)' : '必填'}
                    className="w-full px-4 py-3 bg-gray-50 border-gray-100 border rounded-xl focus:ring-2 focus:ring-orange-500/20 text-sm outline-none transition-all"
                    value={modelConfig.apiKey}
                    onChange={e => setModelConfig({...modelConfig, apiKey: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 mb-2 block uppercase tracking-widest">模型名称</label>
                  <input 
                    placeholder="例如: gpt-4o-mini, deepseek-chat"
                    className="w-full px-4 py-3 bg-gray-50 border-gray-100 border rounded-xl focus:ring-2 focus:ring-orange-500/20 text-sm outline-none transition-all"
                    value={modelConfig.modelName}
                    onChange={e => setModelConfig({...modelConfig, modelName: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 mb-2 block uppercase tracking-widest">代理地址 (可选)</label>
                  <input 
                    placeholder="https://your-proxy.com/v1/..."
                    className="w-full px-4 py-3 bg-gray-50 border-gray-100 border rounded-xl focus:ring-2 focus:ring-orange-500/20 text-sm outline-none transition-all"
                    value={modelConfig.baseUrl || ''}
                    onChange={e => setModelConfig({...modelConfig, baseUrl: e.target.value})}
                  />
                </div>
              </div>

              <div className="mt-10">
                <button 
                  onClick={() => {
                    setShowModelSettings(false);
                    alert("配置已成功应用并保存。");
                  }} 
                  className="w-full py-4 bg-black text-white rounded-2xl font-bold hover:bg-gray-800 shadow-xl shadow-gray-200 transition-all active:scale-[0.98]"
                >
                  保存并应用配置
                </button>
                <p className="text-center text-[10px] text-gray-400 mt-4">API Key 将加密存储在您的本地浏览器中</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'editor' && generatedContent && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex gap-4 p-3 bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl border border-white/50 z-50 animate-in slide-in-from-bottom-10">
            <button onClick={handleContinue} disabled={isGenerating} className="px-6 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-all flex items-center gap-2 shadow-lg shadow-orange-100 group">
              <svg className={`w-4 h-4 ${isGenerating ? 'animate-spin' : 'group-hover:rotate-12 transition-transform'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              {isGenerating ? '构思续集中...' : 'AI 逻辑续写'}
            </button>
            <button onClick={() => { navigator.clipboard.writeText(generatedContent); alert('内容已复制'); }} className="px-6 py-2.5 bg-gray-800 text-white rounded-xl text-sm font-bold hover:bg-black transition-all">复制全文</button>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
