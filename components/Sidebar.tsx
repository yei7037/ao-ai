
import React from 'react';
import { FANQIE_GENRES } from '../constants';

interface SidebarProps {
  activeGenre: string;
  onGenreSelect: (genre: string) => void;
  usage?: {
    totalChars: number;
    percentage: number;
  };
}

const Sidebar: React.FC<SidebarProps> = ({ activeGenre, onGenreSelect, usage }) => {
  return (
    <div className="w-64 h-full bg-white border-r border-gray-200 flex flex-col p-4">
      <div className="flex items-center gap-2 mb-8 px-2">
        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold">番</div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
          AI 写作助手
        </h1>
      </div>
      
      <div className="mb-4 flex-1 overflow-y-auto custom-scrollbar">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">热门版块</h3>
        <div className="space-y-1">
          {FANQIE_GENRES.map((g) => (
            <button
              key={g.name}
              onClick={() => onGenreSelect(g.name)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                activeGenre === g.name
                  ? 'bg-orange-50 text-orange-600 font-medium border border-orange-100'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="text-lg">{g.icon}</span>
              <span>{g.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-auto space-y-4">
        {usage && (
          <div className="px-2 py-3 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">模型资源消耗</span>
              <span className="text-[10px] font-bold text-orange-600">{usage.percentage.toFixed(1)}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-orange-500 transition-all duration-500" 
                style={{ width: `${usage.percentage}%` }}
              ></div>
            </div>
            <p className="mt-1.5 text-[9px] text-gray-400 font-medium italic">
              当前累计已生成 {usage.totalChars.toLocaleString()} 字符
            </p>
          </div>
        )}

        <div className="px-2 py-3 border-t border-gray-100">
           <div className="flex items-center gap-2 mb-1">
             <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
             <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">本地安全运行中</span>
           </div>
           <p className="text-[9px] text-gray-400 leading-snug">
             您的密钥已通过 LocalStorage 加密锁定在当前浏览器中，GitHub 或任何第三方服务器均无法获取。
           </p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
