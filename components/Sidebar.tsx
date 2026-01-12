
import React from 'react';
import { FANQIE_GENRES } from '../constants';

interface SidebarProps {
  activeGenre: string;
  onGenreSelect: (genre: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeGenre, onGenreSelect }) => {
  return (
    <div className="w-64 h-full bg-white border-r border-gray-200 flex flex-col p-4">
      <div className="flex items-center gap-2 mb-8 px-2">
        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold">番</div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
          AI 写作助手
        </h1>
      </div>
      
      <div className="mb-4">
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

      <div className="mt-auto p-4 bg-orange-50 rounded-xl border border-orange-100">
        <p className="text-xs text-orange-700 leading-relaxed">
          <strong>灵感提示：</strong><br/>
          尝试混合“穿越”与“都市”来创造独特的系统文！
        </p>
      </div>
    </div>
  );
};

export default Sidebar;
