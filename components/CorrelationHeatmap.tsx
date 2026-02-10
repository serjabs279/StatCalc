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
  if (!stats) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg text-slate-400">
        Enter data to generate correlation matrix
      </div>
    );
  }

  const coefficient = testType === 'pearson' ? stats.r : stats.spearmanRho;
  
  // Matrix data: [Row 1 (X), Row 2 (Y)]
  // Row 1: [X-X (1.0), X-Y (r)]
  // Row 2: [Y-X (r), Y-Y (1.0)]
  const matrix = [
    { row: labelX, col: labelX, value: 1.0 },
    { row: labelX, col: labelY, value: coefficient },
    { row: labelY, col: labelX, value: coefficient },
    { row: labelY, col: labelY, value: 1.0 },
  ];

  // Helper to determine cell color
  const getCellStyles = (value: number) => {
    const isIdentity = value === 1.0;
    
    // Identity cells (diagonal)
    if (isIdentity && Math.abs(coefficient) < 0.999) { 
       return { bg: 'bg-slate-100', text: 'text-slate-400', border: 'border-slate-200' };
    }

    // Correlation cells
    const intensity = Math.abs(value);
    
    if (value > 0) {
      // Positive (Indigo)
      if (intensity > 0.8) return { bg: 'bg-indigo-600', text: 'text-white', border: 'border-indigo-600' };
      if (intensity > 0.6) return { bg: 'bg-indigo-500', text: 'text-white', border: 'border-indigo-500' };
      if (intensity > 0.4) return { bg: 'bg-indigo-400', text: 'text-white', border: 'border-indigo-400' };
      if (intensity > 0.2) return { bg: 'bg-indigo-200', text: 'text-indigo-900', border: 'border-indigo-200' };
      return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100' };
    } else if (value < 0) {
      // Negative (Amber/Red)
      if (intensity > 0.8) return { bg: 'bg-amber-600', text: 'text-white', border: 'border-amber-600' };
      if (intensity > 0.6) return { bg: 'bg-amber-500', text: 'text-white', border: 'border-amber-500' };
      if (intensity > 0.4) return { bg: 'bg-amber-400', text: 'text-white', border: 'border-amber-400' };
      if (intensity > 0.2) return { bg: 'bg-amber-200', text: 'text-amber-900', border: 'border-amber-200' };
      return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' };
    }
    
    return { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200' };
  };

  return (
    <div className="w-full h-full bg-white p-6 rounded-xl flex flex-col">
      <h3 className="text-sm font-semibold text-slate-700 mb-6 flex items-center gap-2">
        <Grid3X3 className="w-4 h-4 text-indigo-500" />
        Correlation Heatmap <span className="text-slate-400 font-normal">| {testType === 'pearson' ? 'Pearson (r)' : 'Spearman (ρ)'}</span>
      </h3>
      
      <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
        {/* Matrix Grid */}
        <div className="grid grid-cols-[auto_1fr_1fr] gap-4 w-full max-w-2xl">
          
          {/* Header Row */}
          <div className="p-4"></div> {/* Empty corner */}
          <div className="flex items-center justify-center p-2 font-semibold text-slate-700 truncate" title={labelX}>
            {labelX}
          </div>
          <div className="flex items-center justify-center p-2 font-semibold text-slate-700 truncate" title={labelY}>
            {labelY}
          </div>

          {/* Row 1: Label X */}
          <div className="flex items-center justify-end p-2 font-semibold text-slate-700 truncate" title={labelX}>
            {labelX}
          </div>
          {/* Cell 1,1 */}
          <MatrixCell value={matrix[0].value} styles={getCellStyles(matrix[0].value)} />
          {/* Cell 1,2 */}
          <MatrixCell value={matrix[1].value} styles={getCellStyles(matrix[1].value)} highlight />

          {/* Row 2: Label Y */}
          <div className="flex items-center justify-end p-2 font-semibold text-slate-700 truncate" title={labelY}>
            {labelY}
          </div>
          {/* Cell 2,1 */}
          <MatrixCell value={matrix[2].value} styles={getCellStyles(matrix[2].value)} highlight />
          {/* Cell 2,2 */}
          <MatrixCell value={matrix[3].value} styles={getCellStyles(matrix[3].value)} />
        </div>

        {/* Legend */}
        <div className="mt-8 flex items-center gap-6 text-xs text-slate-500">
           <div className="flex items-center gap-2">
             <div className="w-8 h-4 bg-amber-500 rounded sm:w-12"></div>
             <span>Negative (-1)</span>
           </div>
           <div className="flex items-center gap-2">
             <div className="w-8 h-4 bg-slate-100 rounded sm:w-12 border border-slate-200"></div>
             <span>0</span>
           </div>
           <div className="flex items-center gap-2">
             <div className="w-8 h-4 bg-indigo-500 rounded sm:w-12"></div>
             <span>Positive (+1)</span>
           </div>
        </div>
      </div>
    </div>
  );
};

const MatrixCell = ({ value, styles, highlight = false }: { value: number; styles: any; highlight?: boolean }) => (
  <div 
    className={`
      aspect-square rounded-xl flex items-center justify-center border-2 transition-all duration-300
      ${styles.bg} ${styles.border} ${highlight ? 'shadow-md scale-[1.02]' : ''}
    `}
  >
    <div className="text-center">
      <span className={`text-2xl font-bold ${styles.text}`}>
        {value.toFixed(2)}
      </span>
    </div>
  </div>
);

export default CorrelationHeatmap;