
import React, { useState, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import PromptLibrary from './components/PromptLibrary';
import GenreTrends from './components/GenreTrends';
import { aiService, ModelConfig, AIProvider } from './services/aiService';
import { Genre, PromptTemplate } from './types';

interface Draft {
  id: string;
  genre: string;
  background: string;
  input: string;
  content: string;
  updatedAt: number;
}

const App: React.FC = () => {
  const [activeGenre, setActiveGenre] = useState<string>(() => localStorage.getItem('fanqie_active_genre') || Genre.BAZONG);
  const [userInput, setUserInput] = useState('');
  const [backgroundSetting, setBackgroundSetting] = useState(''); 
  const [generatedContent, setGeneratedContent] = useState('');
  
  const [drafts, setDrafts] = useState<Draft[]>(() => {
    const saved = localStorage.getItem('fanqie_drafts');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'library' | 'editor'>('library');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [trends, setTrends] = useState<any[] | null>(null);
  const [isLoadingTrends, setIsLoadingTrends] = useState(false);
  const [eyeProtection, setEyeProtection] = useState(false);
  const [showModelSettings, setShowModelSettings] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{type: string, data: any} | null>(null);

  const [usageStats, setUsageStats] = useState(() => {
    const saved = localStorage.getItem('fanqie_usage_stats');
    return saved ? JSON.parse(saved) : { totalChars: 0, totalRequests: 0 };
  });

  const [modelConfig, setModelConfig] = useState<ModelConfig>(() => {
    const saved = localStorage.getItem('fanqie_model_config');
    return saved ? JSON.parse(saved) : { provider: 'gemini', apiKey: '', modelName: 'gemini-3-pro-preview' };
  });

  const [customTemplates, setCustomTemplates] = useState<PromptTemplate[]>(() => {
    const saved = localStorage.getItem('fanqie_custom_templates');
    return saved ? JSON.parse(saved) : [];
  });

  const contentEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('fanqie_model_config', JSON.stringify(modelConfig));
    localStorage.setItem('fanqie_usage_stats', JSON.stringify(usageStats));
    localStorage.setItem('fanqie_drafts', JSON.stringify(drafts));
    localStorage.setItem('fanqie_custom_templates', JSON.stringify(customTemplates));
    localStorage.setItem('fanqie_active_genre', activeGenre);
  }, [modelConfig, usageStats, drafts, customTemplates, activeGenre]);

  useEffect(() => {
    const fetchTrends = async () => {
      if (!modelConfig.apiKey && modelConfig.provider !== 'gemini') return;
      setIsLoadingTrends(true);
      try {
        const data = await aiService.getGenreTrends(activeGenre, modelConfig);
        setTrends(data);
      } catch (err) { setTrends(null); } finally { setIsLoadingTrends(false); }
    };
    fetchTrends();
  }, [activeGenre, modelConfig.provider, modelConfig.apiKey]);

  const createNewDraft = (template?: PromptTemplate) => {
    const newDraft: Draft = {
      id: Date.now().toString(),
      genre: template?.genre || activeGenre,
      background: template?.worldSetting || '',
      input: template ? `【开局场景】${template.openingScene}\n【冲突】${template.conflict}` : '',
      content: '',
      updatedAt: Date.now()
    };
    setDrafts([newDraft, ...drafts]);
    loadDraft(newDraft);
  };

  const loadDraft = (draft: Draft) => {
    setActiveDraftId(draft.id);
    setActiveGenre(draft.genre);
    setBackgroundSetting(draft.background);
    setUserInput(draft.input);
    setGeneratedContent(draft.content);
    setActiveTab('editor');
    setAnalysisResult(null);
  };

  const saveCurrentToDraft = () => {
    if (!activeDraftId) return;
    setDrafts(prev => prev.map(d => d.id === activeDraftId ? {
      ...d,
      genre: activeGenre,
      background: backgroundSetting,
      input: userInput,
      content: generatedContent,
      updatedAt: Date.now()
    } : d));
  };

  const deleteDraft = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定删除此草稿吗？')) {
      setDrafts(prev => prev.filter(d => d.id !== id));
      if (activeDraftId === id) setActiveDraftId(null);
    }
  };

  const handleExport = () => {
    const element = document.createElement("a");
    const file = new Blob([generatedContent], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${activeGenre}_${new Date().toLocaleDateString()}.txt`;
    document.body.appendChild(element);
    element.click();
  };

  const handleStartWriting = async (isContinue: boolean = false) => {
    if (!userInput.trim() && !isContinue) return;
    if (!modelConfig.apiKey && modelConfig.provider !== 'gemini') { setShowModelSettings(true); return; }
    
    if (isContinue) setIsContinuing(true); else setIsGenerating(true);
    if (!isContinue) setGeneratedContent('');
    
    const context = isContinue ? generatedContent.slice(-1500) : "";
    const styleInstruction = activeGenre === Genre.BAZONG ? "极致奢华，拉扯感，霸道总裁口吻。" : "节奏极快，高频率反转。";
    
    const prompt = isContinue 
      ? `你是一名番茄金牌作家。请根据以下前文衔接续写正文。题材：《${activeGenre}》。背景：${backgroundSetting}。指令：${userInput || '顺着剧情往下写'}。\n\n【前文回顾】：\n${context}\n\n【接着写】：`
      : `你是一名番茄金牌作家。题材：《${activeGenre}》。背景设定：${backgroundSetting}。当前指令：${userInput}。${styleInstruction}。请开始撰写正文：`;
    
    try {
      let charCount = 0;
      await aiService.generateNovelContent(prompt, modelConfig, (chunk) => {
        setGeneratedContent(prev => {
          const newContent = prev + chunk;
          charCount += chunk.length;
          return newContent;
        });
        if (contentEndRef.current) contentEndRef.current.scrollIntoView({ behavior: 'smooth' });
      });
      setUsageStats(prev => ({ ...prev, totalChars: prev.totalChars + charCount, totalRequests: prev.totalRequests + 1 }));
      saveCurrentToDraft();
    } catch (err: any) { alert(`生成失败: ${err.message}`); } finally { 
      setIsGenerating(false); 
      setIsContinuing(false);
    }
  };

  const handleHumanizeFix = async () => {
    if (!generatedContent || !analysisResult || analysisResult.type !== 'deai') return;
    setIsFixing(true);
    try {
      const advice = analysisResult.data.humanizeAdvice?.join(' ') || "增加主观色彩和口语表达";
      const fixedContent = await aiService.humanizeFix(generatedContent, advice, modelConfig);
      setGeneratedContent(fixedContent);
      setAnalysisResult(null);
    } catch (e) { alert("修复失败"); } finally { setIsFixing(false); }
  };

  const runAnalysis = async (type: 'character' | 'emotion' | 'highlight' | 'cliffhanger' | 'deai') => {
    if (!generatedContent) return;
    setIsAnalyzing(true);
    try {
      const result = await aiService.analyzeContent(type, generatedContent, backgroundSetting, modelConfig);
      setAnalysisResult({ type, data: result });
    } catch (e) { alert("分析失败"); } finally { setIsAnalyzing(false); }
  };

  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-500 ${eyeProtection ? 'bg-[#f4ecd8]' : 'bg-gray-50'}`}>
      <Sidebar 
        activeGenre={activeGenre} 
        onGenreSelect={(g) => { setActiveGenre(g); setActiveTab('library'); }}
        usage={{ totalChars: usageStats.totalChars, percentage: (usageStats.totalChars / 1000000) * 100 }}
      >
        <div className="mt-6 px-2">
          <div className="flex items-center justify-between mb-2 px-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase">历史草稿箱</span>
            <button onClick={() => createNewDraft()} className="text-[10px] font-bold text-orange-600 hover:text-orange-700">+ 新建</button>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
            {drafts.map(d => (
              <div 
                key={d.id} 
                onClick={() => loadDraft(d)}
                className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-all ${activeDraftId === d.id ? 'bg-orange-100 text-orange-700 font-bold' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                <span className="truncate flex-1">[{d.genre}] {d.input.slice(0, 10) || '未命名草稿'}...</span>
                <button onClick={(e) => deleteDraft(d.id, e)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all ml-1">×</button>
              </div>
            ))}
          </div>
        </div>
      </Sidebar>

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-8 shrink-0 z-10">
          <div className="flex items-center gap-6">
            <h2 className="text-lg font-bold text-gray-800 tracking-tight">{activeGenre} <span className="text-orange-500">创作助手</span></h2>
            <nav className="flex bg-gray-100 p-1 rounded-xl">
              <button onClick={() => setActiveTab('library')} className={`px-5 py-1.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'library' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}>灵感工坊</button>
              <button onClick={() => setActiveTab('editor')} className={`px-5 py-1.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'editor' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}>编辑器</button>
            </nav>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => setEyeProtection(!eyeProtection)} className={`p-2 rounded-xl transition-all ${eyeProtection ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.364l-.707-.707M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
             </button>
             <button onClick={() => setShowModelSettings(true)} className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold">设置</button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {activeTab === 'library' ? (
            <div className="max-w-6xl mx-auto space-y-10">
              <GenreTrends genre={activeGenre} trends={trends} isLoading={isLoadingTrends} />
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800">创作模板库</h3>
                <input 
                  type="text" placeholder="搜索关键词..." 
                  className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 outline-none"
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <PromptLibrary 
                 selectedGenre={activeGenre} modelConfig={modelConfig} 
                 onSelectTemplate={(t) => { if(!activeDraftId) createNewDraft(t); else loadDraft({...t, id: activeDraftId, background: t.worldSetting, input: t.conflict, content: '', updatedAt: Date.now()}); }} 
                 customTemplates={customTemplates} 
                 onAddCustomTemplate={(t) => setCustomTemplates(prev => [{...t, id: Date.now().toString()}, ...prev])} 
                 onDeleteCustomTemplate={(id) => setCustomTemplates(prev => prev.filter(x => x.id !== id))} 
                 searchTerm={searchTerm}
              />
            </div>
          ) : (
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-3 space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                     <span className="text-[10px] font-bold text-orange-500 uppercase">创作区 {activeDraftId && `(草稿 #${activeDraftId.slice(-4)})`}</span>
                     <button onClick={saveCurrentToDraft} className="text-[10px] font-bold text-gray-400 hover:text-orange-500 transition-all">手动存稿</button>
                  </div>
                  <input value={backgroundSetting} onChange={(e) => setBackgroundSetting(e.target.value)} placeholder="完善世界观设定..." className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500/20 outline-none" />
                  <textarea value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder="输入当前章节指令或续写指令..." className="w-full h-32 p-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 resize-none text-sm outline-none" />
                  <div className="flex justify-end gap-3">
                    <button onClick={() => handleStartWriting(true)} disabled={isContinuing || isGenerating || !generatedContent} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all disabled:opacity-50">
                      {isContinuing ? "衔接中..." : "接着往下写"}
                    </button>
                    <button onClick={() => handleStartWriting(false)} disabled={isGenerating || isContinuing} className="px-10 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 shadow-lg active:scale-95 transition-all disabled:opacity-50">
                      {isGenerating ? "生成中..." : "重写/开始本章"}
                    </button>
                  </div>
                </div>

                <div className={`relative rounded-3xl shadow-xl p-10 min-h-[600px] border transition-all duration-700 ${eyeProtection ? 'bg-[#fcf8ef] border-[#e8dfc4]' : 'bg-white border-gray-100'}`}>
                  {isContinuing && <div className="absolute inset-0 bg-orange-500/5 animate-pulse rounded-3xl pointer-events-none"></div>}
                  <div className="absolute top-6 right-8 flex items-center gap-4">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">字数: {generatedContent.length}</span>
                    {generatedContent && (
                      <button onClick={handleExport} className="p-2 bg-gray-50 text-gray-400 hover:text-orange-600 rounded-lg transition-all" title="导出为TXT">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      </button>
                    )}
                  </div>
                  <div className="max-w-2xl mx-auto prose prose-orange">
                    {generatedContent ? (
                      generatedContent.split('\n').map((line, i) => (
                        <p key={i} className="mb-6 font-serif text-lg leading-[2.1] text-gray-800 text-justify">{line}</p>
                      ))
                    ) : (
                      <div className="py-40 text-center text-gray-200 font-bold uppercase tracking-widest">等待 AI 灵感开启</div>
                    )}
                    <div ref={contentEndRef} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase mb-4 flex items-center gap-2">金牌辅助插件</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'character', label: '人物校验', icon: '👤' },
                      { id: 'emotion', label: '情绪结构', icon: '📈' },
                      { id: 'highlight', label: '爽点评分', icon: '🔥' },
                      { id: 'cliffhanger', label: '断章检测', icon: '🪝' },
                      { id: 'deai', label: '去AI味', icon: '🛡️' }
                    ].map(btn => (
                      <button key={btn.id} onClick={() => runAnalysis(btn.id as any)} disabled={isAnalyzing || !generatedContent} className="p-3 bg-gray-50 border border-gray-100 rounded-xl flex flex-col items-center gap-1 hover:bg-white hover:shadow-md transition-all text-gray-600">
                        <span className="text-lg">{btn.icon}</span>
                        <span className="text-[10px] font-bold">{btn.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm min-h-[300px]">
                  {isAnalyzing ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                      <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-[10px] font-bold text-orange-500">正在扫描指纹...</span>
                    </div>
                  ) : analysisResult ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                      <div className="flex justify-between items-center">
                        <h5 className="font-bold text-gray-800 text-sm">{analysisResult.type === 'deai' ? '🛡️ AI 指纹检测' : '解析报告'}</h5>
                        <span className={`px-2 py-0.5 text-white text-[9px] font-bold rounded-full ${analysisResult.type === 'deai' && analysisResult.data.aiFlavorScore > 60 ? 'bg-red-500' : 'bg-orange-500'}`}>
                          {analysisResult.type === 'deai' ? `AI味: ${analysisResult.data.aiFlavorScore}%` : `${(analysisResult.data.score || analysisResult.data.rating || 0)}/10`}
                        </span>
                      </div>
                      
                      <div className="text-[11px] text-gray-600 bg-gray-50 p-3 rounded-xl border italic leading-relaxed">
                        {analysisResult.data.analysis || analysisResult.data.advice || "分析报告生成完毕。"}
                      </div>

                      {analysisResult.type === 'deai' && analysisResult.data.riskSegments?.length > 0 && (
                        <div className="space-y-2">
                           <button onClick={handleHumanizeFix} disabled={isFixing} className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-[10px] font-bold hover:bg-orange-600 transition-all flex items-center justify-center gap-2">
                             {isFixing ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "⚡ 一键深度去味"}
                           </button>
                        </div>
                      )}
                      
                      {(analysisResult.data.suggestions || analysisResult.data.humanizeAdvice)?.map((s: string, i: number) => (
                        <div key={i} className="text-[10px] text-orange-700 bg-orange-50 p-2 rounded-lg border border-orange-100">💡 {s}</div>
                      ))}
                      <button onClick={() => setAnalysisResult(null)} className="w-full py-2 text-[9px] font-bold text-gray-300 hover:text-gray-500 uppercase">清除当前报告</button>
                    </div>
                  ) : (
                    <div className="py-20 text-center opacity-20">
                      <div className="text-3xl">📝</div>
                      <div className="text-[10px] font-bold uppercase mt-2">点击辅助插件开启扫描</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {showModelSettings && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
              <h3 className="text-xl font-bold text-gray-800 mb-6 tracking-tight">配置中心</h3>
              <div className="space-y-4">
                <select className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-medium text-sm" value={modelConfig.provider} onChange={e => setModelConfig({...modelConfig, provider: e.target.value as AIProvider})}>
                  <option value="gemini">Google Gemini (推荐)</option>
                  <option value="openai">OpenAI</option>
                  <option value="deepseek">DeepSeek</option>
                </select>
                <input type="password" placeholder="API Key" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm" value={modelConfig.apiKey} onChange={e => setModelConfig({...modelConfig, apiKey: e.target.value})} />
                <button onClick={() => setShowModelSettings(false)} className="w-full py-4 bg-orange-600 text-white rounded-2xl font-bold shadow-xl active:scale-95 transition-all">保存并关闭</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
