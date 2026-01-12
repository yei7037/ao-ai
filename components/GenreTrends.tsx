
import React from 'react';

interface GenreTrendsProps {
  genre: string;
  trends: any[] | null;
  isLoading: boolean;
}

const GenreTrends: React.FC<GenreTrendsProps> = ({ genre, trends, isLoading }) => {
  if (isLoading) {
    return (
      <section className="animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded-lg mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 h-48"></div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
      <div className="flex items-center gap-3 mb-6">
        <span className="px-3 py-1 bg-orange-500/10 text-orange-600 text-xs font-bold rounded-full border border-orange-500/20">市场分析</span>
        <h3 className="text-2xl font-bold text-gray-800">番茄流行雷达：{genre}</h3>
      </div>
      
      {!trends ? (
        <div className="bg-gray-100 rounded-2xl p-8 text-center text-gray-500 italic">
          暂未获取到最新流行数据，AI 建议关注：底层逆袭、极致打脸、虚构地名规避风险。
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {trends.map((trend, idx) => (
            <div key={idx} className="group bg-white hover:bg-orange-50/30 rounded-2xl p-6 border border-gray-100 hover:border-orange-200 transition-all shadow-sm hover:shadow-md">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex items-center justify-center w-6 h-6 bg-orange-100 text-orange-600 rounded-full text-xs font-bold">
                  {idx + 1}
                </span>
                <h4 className="font-bold text-gray-800 group-hover:text-orange-700 transition-colors">
                  {trend.热门写作方向 || trend.direction || '热门方向'}
                </h4>
              </div>
              
              <div className="space-y-3">
                <div className="text-sm">
                  <span className="text-gray-400 font-medium block text-[10px] uppercase">核心爽点</span>
                  <p className="text-gray-700 font-medium">{trend.核心爽点 || trend.core_hook || '待定'}</p>
                </div>
                <div className="text-sm">
                  <span className="text-gray-400 font-medium block text-[10px] uppercase">受众群体</span>
                  <p className="text-gray-600 italic">{trend.受众群体 || trend.audience || '大众读者'}</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-3 border border-orange-100/50">
                  <span className="text-orange-400 font-bold block text-[10px] uppercase mb-1">金手指设定</span>
                  <p className="text-orange-900 text-xs font-medium leading-relaxed">
                    {trend.代表性金手指设定 || trend.golden_finger || '暂无设定'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default GenreTrends;
