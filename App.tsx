
import React, { useState, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import PromptLibrary from './components/PromptLibrary';
import GenreTrends from './components/GenreTrends';
import { gemini } from './services/geminiService';
import { Genre } from './types';
import { GENRE_SPECIFIC_TAGS } from './constants';

const App: React.FC = () => {
  const [activeGenre, setActiveGenre] = useState<string>(Genre.BAZONG);
  const [activeTab, setActiveTab] = useState<'library' | 'editor'>('editor');
  const [generatedContent, setGeneratedContent] = useState('');
  const [userInput, setUserInput] = useState('');
  const [backgroundSetting, setBackgroundSetting] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [eyeProtection, setEyeProtection] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const contentEndRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async (isContinue: boolean = false) => {
    if (isGenerating) return;
    setIsGenerating(true);
    
    if (!isContinue) setGeneratedContent('');

    const tagsPrompt = selectedTags.length > 0 ? `使用以下设定标签: ${selectedTags.join(', ')}` : '';
    const fullPrompt = `
      你是一名番茄小说网的金牌写手，擅长写${activeGenre}类别的网文。
      当前背景设定: ${backgroundSetting}
      ${tagsPrompt}
      ${isContinue ? `前文内容回看: ${generatedContent.slice(-1000)}` : ''}
      本章创作指令: ${userInput || '自由发挥，开启一段充满悬念和爽点的故事'}
      
      要求: 
      1. 节奏极快，开头必须有钩子。
      2. 语言直白有力，多用短句，画面感强。
      3. 符合番茄读者的爽点需求，严禁文青病。
      直接输出小说正文。
    `;

    try {
      await gemini.generateNovelStream({
        prompt: fullPrompt,
        onChunk: (text) => {
          setGeneratedContent(prev => prev + text);
          if (contentEndRef.current) contentEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      });
    } catch (err) {
      alert("生成失败，请检查 API 配置。");
    } finally {
      setIsGenerating(false);
    }
  };

  const currentTags = GENRE_SPECIFIC_TAGS[activeGenre] || { maleChar: [], femaleChar: [], world: [] };

  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-500 ${eyeProtection ? 'bg-[#f4ecd8]' : 'bg-gray-50'}`}>
      <Sidebar activeGenre={activeGenre} onGenreSelect={(g) => { setActiveGenre(g); setActiveTab('editor'); }} />

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-8 shrink-0 z-10">
          <div className="flex items-center gap-6">
            <h2 className="text-lg font-bold text-gray-800 tracking-tighter">
              <span className="text-orange-500">金牌</span>写手 AI
              <span className="ml-3 text-[10px] font-black text-gray-300 bg-gray-100 px-2 py-1 rounded uppercase tracking-widest">{activeGenre}</span>
            </h2>
            <nav className="flex bg-gray-100 p-1 rounded-xl">
              <button onClick={() => setActiveTab('editor')} className={`px-5 py-1.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'editor' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500'}`}>编辑器</button>
              <button onClick={() => setActiveTab('library')} className={`px-5 py-1.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'library' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500'}`}>爆款库</button>
            </nav>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => setEyeProtection(!eyeProtection)} className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all ${eyeProtection ? 'bg-orange-100 border-orange-200 text-orange-700' : 'bg-white border-gray-200 text-gray-500'}`}>
               {eyeProtection ? '🌙 护眼模式' : '☀️ 普通模式'}
             </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {activeTab === 'library' ? (
            <div className="max-w-6xl mx-auto space-y-10">
               <GenreTrends genre={activeGenre} />
               <PromptLibrary selectedGenre={activeGenre} modelConfig={{provider: 'gemini', apiKey: '', modelName: 'gemini-3-pro-preview'}} onSelectTemplate={(t) => { setBackgroundSetting(t.worldSetting); setUserInput(t.conflict); setActiveTab('editor'); }} customTemplates={[]} onAddCustomTemplate={()=>{}} onDeleteCustomTemplate={()=>{}} />
            </div>
          ) : (
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-3 space-y-6">
                <div className="bg-white rounded-[2rem] shadow-sm border border-gray-200 p-8 space-y-6">
                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-orange-500 rounded-full"></span> 标签组合设定
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[...currentTags.maleChar, ...currentTags.world].slice(0, 8).map(tag => (
                        <button 
                          key={tag.id}
                          onClick={() => setSelectedTags(prev => prev.includes(tag.label) ? prev.filter(l => l !== tag.label) : [...prev, tag.label])}
                          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${selectedTags.includes(tag.label) ? 'bg-orange-600 border-orange-600 text-white' : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-200'}`}
                        >
                          {tag.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <textarea 
                      value={backgroundSetting} 
                      onChange={(e) => setBackgroundSetting(e.target.value)} 
                      placeholder="世界观/当前环境 (如: 寒冬、京城豪门、末世前三天...)" 
                      className="w-full h-32 p-5 bg-gray-50 border border-gray-100 rounded-3xl text-sm focus:ring-4 focus:ring-orange-500/5 outline-none resize-none transition-all" 
                    />
                    <textarea 
                      value={userInput} 
                      onChange={(e) => setUserInput(e.target.value)} 
                      placeholder="本章剧情细纲 (如: 男主重生醒来，发现银行卡里还有十个亿...)" 
                      className="w-full h-32 p-5 bg-gray-50 border border-gray-100 rounded-3xl text-sm focus:ring-4 focus:ring-orange-500/5 outline-none resize-none transition-all" 
                    />
                  </div>

                  <div className="flex justify-end gap-4">
                    <button onClick={() => handleGenerate(true)} disabled={isGenerating || !generatedContent} className="px-6 py-4 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold hover:bg-gray-50 transition-all disabled:opacity-30">
                      🔗 续写下一章
                    </button>
                    <button onClick={() => handleGenerate(false)} disabled={isGenerating} className="px-14 py-4 bg-orange-600 text-white rounded-2xl font-black shadow-2xl shadow-orange-100 hover:bg-orange-700 active:scale-95 transition-all disabled:opacity-30 flex items-center gap-3">
                      {isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : '🔥 一键爆更'}
                    </button>
                  </div>
                </div>

                <div className={`relative rounded-[3rem] shadow-2xl p-16 min-h-[800px] border transition-all duration-700 ${eyeProtection ? 'bg-[#fcf8ef] border-[#e8dfc4]' : 'bg-white border-gray-100'}`}>
                  <div className="max-w-3xl mx-auto font-serif">
                    {generatedContent ? (
                      generatedContent.split('\n').map((line, i) => (
                        <p key={i} className="mb-6 text-xl leading-relaxed text-gray-800 text-justify tracking-wide">
                          {line}
                        </p>
                      ))
                    ) : (
                      <div className="py-60 text-center opacity-20 select-none">
                        <div className="text-6xl mb-4">🖋️</div>
                        <p className="text-xl tracking-[0.5em]">灵感正在酝酿中</p>
                      </div>
                    )}
                    <div ref={contentEndRef} />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white rounded-[2.5rem] border border-gray-200 p-8 shadow-sm sticky top-8">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 italic">辅助工具箱</h4>
                  <div className="space-y-3">
                    <button className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-left hover:bg-white hover:shadow-lg transition-all group">
                      <div className="text-xs font-black text-gray-800 group-hover:text-orange-600">🛡️ 去 AI 味润色</div>
                      <div className="text-[10px] text-gray-400 mt-1">修正翻译腔，适配网文语态</div>
                    </button>
                    <button className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-left hover:bg-white hover:shadow-lg transition-all group">
                      <div className="text-xs font-black text-gray-800 group-hover:text-orange-600">🎭 人设一致性检测</div>
                      <div className="text-[10px] text-gray-400 mt-1">检查主角是否圣母/降智</div>
                    </button>
                    <button className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-left hover:bg-white hover:shadow-lg transition-all group">
                      <div className="text-xs font-black text-gray-800 group-hover:text-orange-600">⚓ 断章钩子生成</div>
                      <div className="text-[10px] text-gray-400 mt-1">在末尾自动制造悬念</div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
