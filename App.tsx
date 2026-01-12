
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
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  // 消耗统计状态
  const [usageStats, setUsageStats] = useState(() => {
    const saved = localStorage.getItem('fanqie_usage_stats');
    return saved ? JSON.parse(saved) : { totalChars: 0, totalRequests: 0, sessionChars: 0 };
  });

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

  useEffect(() => {
    localStorage.setItem('fanqie_model_config', JSON.stringify(modelConfig));
  }, [modelConfig]);

  useEffect(() => {
    localStorage.setItem('fanqie_usage_stats', JSON.stringify(usageStats));
  }, [usageStats]);

  useEffect(() => {
    const fetchTrends = async () => {
      if (modelConfig.provider === 'gemini' && !modelConfig.apiKey && !process.env.API_KEY) return;
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
  }, [activeGenre, modelConfig]);

  useEffect(() => {
    localStorage.setItem('fanqie_user_input', userInput);
    localStorage.setItem('fanqie_background', backgroundSetting);
    localStorage.setItem('fanqie_generated_content', generatedContent);
    localStorage.setItem('fanqie_active_genre', activeGenre);
    localStorage.setItem('fanqie_custom_templates', JSON.stringify(customTemplates));
  }, [userInput, backgroundSetting, generatedContent, activeGenre, customTemplates]);

  const handleTestKey = async () => {
    setTestStatus('testing');
    const isOk = await aiService.testConnection(modelConfig);
    setTestStatus(isOk ? 'success' : 'error');
    setTimeout(() => setTestStatus('idle'), 3000);
  };

  const handleClearLocalData = () => {
    if (confirm('确定要清除本地保存的所有配置、草稿和 API Key 吗？此操作不可撤销。')) {
      localStorage.clear();
      window.location.reload();
    }
  };

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
      setUsageStats(prev => ({ ...prev, totalRequests: prev.totalRequests + 1 }));
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

    const styleInstruction = activeGenre === Genre.BAZONG 
      ? "要求：极致的豪门阔绰感，男女主对话要充满禁欲和拉扯感，台词要霸气。" 
      : "要求：节奏极快，三段内必有爽点。";
    
    const fullPrompt = `你是一名番茄金牌作家。题材：《${activeGenre}》。背景：${backgroundSetting}。内容：${userInput}。${styleInstruction}`;
    
    try {
      let charCount = 0;
      await aiService.generateNovelContent(fullPrompt, modelConfig, (chunk) => {
        setGeneratedContent(prev => prev + chunk);
        charCount += chunk.length;
      });
      // 更新消耗统计
      setUsageStats(prev => ({
        ...prev,
        totalChars: prev.totalChars + charCount,
        sessionChars: prev.sessionChars + charCount,
        totalRequests: prev.totalRequests + 1
      }));
    } catch (err: any) { 
      alert(`生成失败: ${err.message}`); 
    } finally { 
      setIsGenerating(false); 
    }
  };

  const quotaPercentage = Math.min((usageStats.totalChars / 1000000) * 100, 100); // 以100万字作为一个参考额度

  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-500 ${eyeProtection ? 'bg-[#f4ecd8]' : 'bg-gray-50'}`}>
      <Sidebar 
        activeGenre={activeGenre} 
        onGenreSelect={(g) => { setActiveGenre(g); setActiveTab('library'); }}
        usage={{
          totalChars: usageStats.totalChars,
          percentage: quotaPercentage
        }}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-8 shrink-0 z-10">
          <div className="flex items-center gap-6">
            <h2 className="text-lg font-bold text-gray-800 tracking-tight">{activeGenre} <span className="text-orange-500">创作助手</span></h2>
            <nav className="flex bg-gray-100 p-1 rounded-xl">
              <button onClick={() => setActiveTab('library')} className={`px-5 py-1.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'library' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}>灵感工坊</button>
              <button onClick={() => setActiveTab('editor')} className={`px-5 py-1.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'editor' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}>编辑器</button>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">累计消耗字数</span>
              <span className="text-xs font-bold text-gray-700">{(usageStats.totalChars / 1000).toFixed(1)}k / 1,000k</span>
            </div>
            <button onClick={() => setShowModelSettings(true)} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-orange-500 hover:text-white rounded-xl text-xs font-bold text-gray-600 transition-all">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              配置 API KEY
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {activeTab === 'library' ? (
            <div className="max-w-6xl mx-auto space-y-10">
              <GenreTrends genre={activeGenre} trends={trends} isLoading={isLoadingTrends} />
              <PromptLibrary 
                 selectedGenre={activeGenre} 
                 modelConfig={modelConfig} 
                 onSelectTemplate={handleSelectTemplate} 
                 customTemplates={customTemplates} 
                 onAddCustomTemplate={(t) => setCustomTemplates(prev => [{...t, id: Date.now().toString()}, ...prev])} 
                 onDeleteCustomTemplate={(id) => setCustomTemplates(prev => prev.filter(x => x.id !== id))} 
              />
            </div>
          ) : (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
                 <div className="flex gap-4">
                   <div className="flex-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">世界观/金手指</label>
                      <input value={backgroundSetting} onChange={(e) => setBackgroundSetting(e.target.value)} placeholder="设定世界观、金手指、主角身份..." className="w-full mt-1 bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500/20 outline-none" />
                   </div>
                   <button onClick={handleGenerateNames} disabled={isGeneratingNames} className="h-[44px] mt-5 px-4 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all flex items-center gap-2">
                     {isGeneratingNames ? "..." : "一键起名"}
                   </button>
                 </div>
                 <textarea value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder="输入具体章节指令..." className="w-full h-32 p-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 resize-none text-gray-700 text-sm leading-relaxed outline-none" />
                 <div className="flex justify-end">
                    <button onClick={handleStartWriting} disabled={isGenerating || !userInput} className={`px-10 py-3 rounded-xl font-bold transition-all shadow-xl ${isGenerating || !userInput ? 'bg-gray-100 text-gray-400' : 'bg-orange-600 text-white hover:bg-orange-700 active:scale-95'}`}>
                      {isGenerating ? "AI 创作中..." : "开始写作"}
                    </button>
                 </div>
              </div>
              <div className={`relative rounded-3xl shadow-xl p-12 min-h-[600px] transition-all duration-700 ${eyeProtection ? 'bg-[#fcf8ef] border-[#e8dfc4]' : 'bg-white border-gray-100'} border`}>
                {isGenerating && (
                  <div className="absolute top-4 right-8 flex items-center gap-2">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                    </span>
                    <span className="text-[10px] font-bold text-orange-500 uppercase">实时 Token 消耗中</span>
                  </div>
                )}
                <div className="max-w-2xl mx-auto font-serif text-lg leading-[2.2] text-gray-800">
                  {generatedContent || <div className="text-center text-gray-300 py-20">等待 AI 灵感开启...</div>}
                </div>
              </div>
            </div>
          )}
        </div>

        {showModelSettings && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">模型配置</h3>
                <button onClick={() => setShowModelSettings(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* 消耗统计显示 */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">总计请求</span>
                  <p className="text-xl font-bold text-gray-800">{usageStats.totalRequests}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">累计字数</span>
                  <p className="text-xl font-bold text-gray-800">{(usageStats.totalChars / 1000).toFixed(1)}k</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 mb-2 block uppercase tracking-widest">服务商</label>
                  <select className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" value={modelConfig.provider} onChange={e => setModelConfig({...modelConfig, provider: e.target.value as AIProvider})}>
                    <option value="gemini">Gemini (推荐)</option>
                    <option value="openai">OpenAI</option>
                    <option value="deepseek">DeepSeek</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 mb-2 block uppercase tracking-widest">API Key</label>
                  <div className="flex gap-2">
                    <input type="password" placeholder="sk-..." className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm" value={modelConfig.apiKey} onChange={e => setModelConfig({...modelConfig, apiKey: e.target.value})} />
                    <button 
                      onClick={handleTestKey}
                      disabled={testStatus !== 'idle'}
                      className={`px-4 rounded-xl text-xs font-bold transition-all ${
                        testStatus === 'success' ? 'bg-green-500 text-white' : 
                        testStatus === 'error' ? 'bg-red-500 text-white' : 
                        'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {testStatus === 'testing' ? '...' : testStatus === 'success' ? '可用' : testStatus === 'error' ? '无效' : '测试'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 mb-2 block uppercase tracking-widest">模型名称</label>
                  <input className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm" value={modelConfig.modelName} onChange={e => setModelConfig({...modelConfig, modelName: e.target.value})} />
                </div>
              </div>

              <div className="mt-8 space-y-2">
                <button onClick={() => setShowModelSettings(false)} className="w-full py-4 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 shadow-xl shadow-orange-100 transition-all">保存并关闭</button>
                <button onClick={handleClearLocalData} className="w-full py-2 text-red-400 text-[10px] font-bold hover:text-red-600 transition-colors uppercase tracking-widest">清除本地所有敏感数据</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
