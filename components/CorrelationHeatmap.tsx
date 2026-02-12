import React from 'react';
import { StatisticsResult, CorrelationType } from '../types';
import { Grid3X3 } from 'lucide-react';

interface CorrelationHeatmapProps {
  stats: StatisticsResult | null;
  labelX: string;
  labelY: string;
  testType: CorrelationType;
}

const CorrelationHeatmap: React.FC<CorrelationHeatmapProps> = ({ stats, labelX, labelY, testType }) => {
  if (!stats) return null;

  const coefficient = testType === 'pearson' ? stats.r : stats.spearmanRho;
  
  const matrix = [
    { row: labelX, col: labelX, value: 1.0 },
    { row: labelX, col: labelY, value: coefficient },
    { row: labelY, col: labelX, value: coefficient },
    { row: labelY, col: labelY, value: 1.0 },
  ];

  const getCellStyle = (value: number) => {
    if (Math.abs(value) >= 0.999) {
        return "bg-zinc-900/80 text-zinc-700 border border-white/5";
    }

    const absVal = Math.abs(value);
    const isPositive = value > 0;
    
    if (isPositive) {
      if (absVal > 0.7) return "bg-cyan-500 text-white shadow-[0_0_25px_rgba(6,182,212,0.5)] scale-105 z-10";
      if (absVal > 0.4) return "bg-cyan-700 text-cyan-50 border border-cyan-500/30";
      if (absVal > 0.2) return "bg-cyan-900/40 text-cyan-300/80 border border-cyan-800/20";
      return "bg-zinc-900 text-zinc-600 border border-white/5";
    } else {
      if (absVal > 0.7) return "bg-rose-500 text-white shadow-[0_0_25px_rgba(244,63,94,0.5)] scale-105 z-10";
      if (absVal > 0.4) return "bg-rose-700 text-rose-50 border border-rose-500/30";
      if (absVal > 0.2) return "bg-rose-900/40 text-rose-300/80 border border-rose-800/20";
      return "bg-zinc-900 text-zinc-600 border border-white/5";
    }
  };

  return (
    <div className="w-full h-full p-8 flex flex-col bg-black/40 rounded-[2rem] border border-white/5">
      <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-10 flex items-center gap-3">
        Correlation Matrix <span className="font-normal opacity-40">| {testType === 'pearson' ? 'Pearson' : 'Spearman'}</span>
      </h3>
      
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="grid grid-cols-[auto_1fr_1fr] gap-4 w-full max-w-sm">
          
          <div className="p-2"></div> 
          <div className="p-2 font-black text-[9px] text-zinc-600 uppercase tracking-widest truncate text-center" title={labelX}>Variable X</div>
          <div className="p-2 font-black text-[9px] text-zinc-600 uppercase tracking-widest truncate text-center" title={labelY}>Variable Y</div>

          <div className="p-2 font-black text-[9px] text-zinc-600 uppercase tracking-widest truncate flex items-center justify-end" title={labelX}>Variable X</div>
          <div className={`aspect-square rounded-2xl flex items-center justify-center text-xl font-black transition-all duration-700 ${getCellStyle(matrix[0].value)}`}>
            {matrix[0].value.toFixed(2)}
          </div>
          <div className={`aspect-square rounded-2xl flex items-center justify-center text-xl font-black transition-all duration-700 ${getCellStyle(matrix[1].value)}`}>
            {matrix[1].value.toFixed(2)}
          </div>

          <div className="p-2 font-black text-[9px] text-zinc-600 uppercase tracking-widest truncate flex items-center justify-end" title={labelY}>Variable Y</div>
          <div className={`aspect-square rounded-2xl flex items-center justify-center text-xl font-black transition-all duration-700 ${getCellStyle(matrix[2].value)}`}>
            {matrix[2].value.toFixed(2)}
          </div>
          <div className={`aspect-square rounded-2xl flex items-center justify-center text-xl font-black transition-all duration-700 ${getCellStyle(matrix[3].value)}`}>
            {matrix[3].value.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-center gap-6">
        <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>
            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Positive Correlation</span>
        </div>
        <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></div>
            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Inverse Correlation</span>
        </div>
      </div>
    </div>
  );
};

export default CorrelationHeatmap;