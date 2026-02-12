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
  
  // Matrix data: [Row 1 (X), Row 2 (Y)]
  const matrix = [
    { row: labelX, col: labelX, value: 1.0 },
    { row: labelX, col: labelY, value: coefficient },
    { row: labelY, col: labelX, value: coefficient },
    { row: labelY, col: labelY, value: 1.0 },
  ];

  // Helper to determine cell style
  const getCellStyle = (value: number) => {
    if (value >= 0.999) {
        // Identity (1.00)
        return "bg-slate-100 text-slate-400";
    }
    // Correlation
    const isPositive = value >= 0;
    return isPositive ? "bg-indigo-600 text-white" : "bg-amber-500 text-white";
  };

  return (
    <div className="w-full h-full p-6 flex flex-col">
      <h3 className="text-xs font-bold text-slate-400 uppercase mb-6 flex items-center gap-2">
        Correlation Heatmap <span className="font-normal text-slate-300">| {testType === 'pearson' ? 'Pearson (r)' : 'Spearman (ρ)'}</span>
      </h3>
      
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="grid grid-cols-[auto_1fr_1fr] gap-4 w-full">
          
          {/* Header Row */}
          <div className="p-2"></div> 
          <div className="p-2 font-bold text-sm text-slate-600 truncate text-center" title={labelX}>Variable X</div>
          <div className="p-2 font-bold text-sm text-slate-600 truncate text-center" title={labelY}>Variable Y</div>

          {/* Row 1 */}
          <div className="p-2 font-bold text-sm text-slate-600 truncate flex items-center justify-end" title={labelX}>Variable X</div>
          <div className={`aspect-[4/3] rounded-xl flex items-center justify-center text-2xl font-bold ${getCellStyle(matrix[0].value)}`}>
            {matrix[0].value.toFixed(2)}
          </div>
          <div className={`aspect-[4/3] rounded-xl flex items-center justify-center text-2xl font-bold shadow-sm ${getCellStyle(matrix[1].value)}`}>
            {matrix[1].value.toFixed(2)}
          </div>

          {/* Row 2 */}
          <div className="p-2 font-bold text-sm text-slate-600 truncate flex items-center justify-end" title={labelY}>Variable Y</div>
          <div className={`aspect-[4/3] rounded-xl flex items-center justify-center text-2xl font-bold shadow-sm ${getCellStyle(matrix[2].value)}`}>
            {matrix[2].value.toFixed(2)}
          </div>
          <div className={`aspect-[4/3] rounded-xl flex items-center justify-center text-2xl font-bold ${getCellStyle(matrix[3].value)}`}>
            {matrix[3].value.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CorrelationHeatmap;