
import React, { useEffect, useState } from 'react';
import { gemini } from '../services/geminiService';

interface GenreTrendsProps {
  genre: string;
  apiKey?: string;
}

const GenreTrends: React.FC<GenreTrendsProps> = ({ genre, apiKey }) => {
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTrends = async () => {
      setLoading(true);
      const data = await gemini.analyzeMarketTrends(genre, apiKey);
      setTrends(data);
      setLoading(false);
    };
    fetchTrends();
  }, [genre, apiKey]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-40 bg-gray-100 rounded-2xl border border-gray-200"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 bg-orange-500 rounded-full animate-ping"></span>
        <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">
          {genre} · 流行雷达 (AI 实时分析)
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {trends.map((t, i) => (
          <div key={i} className="bg-white p-5 rounded-[2rem] border border-orange-100 shadow-sm hover:shadow-md transition-all">
            <h4 className="font-bold text-orange-600 mb-2">{t.热门写作方向}</h4>
            <div className="space-y-2">
              <p className="text-[11px] text-gray-500 leading-relaxed">
                <span className="font-black text-gray-400">核心爽点：</span>{t.核心爽点}
              </p>
              <div className="bg-orange-50 p-2.5 rounded-xl border border-orange-100/50">
                <p className="text-[10px] text-orange-800 font-medium">
                  🌟 {t.代表性金手指设定}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GenreTrends;
