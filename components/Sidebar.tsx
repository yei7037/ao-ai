
import React from 'react';
import { FANQIE_GENRES } from '../constants';

interface SidebarProps {
  activeGenre: string;
  onGenreSelect: (genre: string) => void;
  usage?: {
    totalChars: number;
    percentage: number;
  };
  children?: React.ReactNode;
}

const Sidebar: React.FC<SidebarProps> = ({ activeGenre, onGenreSelect, usage, children }) => {
  return (
    <div className="w-64 h-full bg-white border-r border-gray-200 flex flex-col p-4 shadow-sm z-20">
      <div className="flex items-center gap-2 mb-8 px-2">
        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-orange-100">金</div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent tracking-tighter">
          金牌写手
        </h1>
      </div>
      
      <div className="mb-4 flex-1 overflow-y-auto custom-scrollbar">
        <h3 className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-4 px-2">热门创作频道</h3>
        <div className="space-y-1">
          {FANQIE_GENRES.map((g) => (
            <button
              key={g.name}
              onClick={() => onGenreSelect(g.name)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                activeGenre === g.name
                  ? 'bg-orange-50 text-orange-600 font-bold border border-orange-100 shadow-sm'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <span className="text-lg grayscale group-hover:grayscale-0">{g.icon}</span>
              <span className="text-sm">{g.name}</span>
            </button>
          ))}
        </div>

        {children}
      </div>

      <div className="mt-auto space-y-4">
        {usage && (
          <div className="px-3 py-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">AI 能量槽</span>
              <span className="text-[10px] font-black text-orange-500">{usage.percentage.toFixed(1)}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)] transition-all duration-1000" 
                style={{ width: `${usage.percentage}%` }}
              ></div>
            </div>
            <p className="mt-2 text-[9px] text-gray-400 font-bold text-center">
              累计生成 {(usage.totalChars / 1000).toFixed(1)}k / 1,000k 字符
            </p>
          </div>
        )}

        <div className="px-2 py-3 border-t border-gray-100">
           <div className="flex items-center gap-2 mb-1">
             <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
             <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">本地密钥已隔离</span>
           </div>
           <p className="text-[8px] text-gray-400 leading-snug">
             您的私密 API 绝不经过任何中转服务器。
           </p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
