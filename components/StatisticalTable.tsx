import React, { useRef, useState } from 'react';
import { StatisticsResult, HybridResult, CorrelationType, AnalysisMode } from '../types';
import { Table, Copy, Check, FileText } from 'lucide-react';

interface StatisticalTableProps {
  mode: AnalysisMode;
  testType: CorrelationType;
  stats?: StatisticsResult | null;
  hybridResult?: HybridResult | null;
  labelX?: string;
  labelY?: string;
}

const StatisticalTable: React.FC<StatisticalTableProps> = ({ 
  mode, 
  testType, 
  stats, 
  hybridResult, 
  labelX = "Variable X", 
  labelY = "Variable Y" 
}) => {
  const isPearson = testType === 'pearson';
  const symbol = isPearson ? 'Pearson Correlation' : 'Spearman\'s rho';
  const tableRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!tableRef.current) return;
    
    const range = document.createRange();
    range.selectNode(tableRef.current);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
    
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
    window.getSelection()?.removeAllRanges();
  };

  const formatSig = (p: number) => {
    if (p < 0.001) return '< .001';
    return p.toFixed(3).replace(/^0+/, ''); // Remove leading zero for APA style
  };

  const getAsterisks = (p: number) => {
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
  };

  const generateReportText = () => {
    if (mode === 'simple' && stats) {
        const rVal = isPearson ? stats.r : stats.spearmanRho;
        const absR = Math.abs(rVal);
        const strength = absR < 0.1 ? 'negligible' : 
                         absR < 0.3 ? 'weak' : 
                         absR < 0.5 ? 'moderate' : 'strong';
        const direction = rVal > 0 ? 'positive' : 'negative';
        const sym = isPearson ? 'r' : 'rs';
        const val = rVal.toFixed(3);
        const p = isPearson ? stats.pValue : stats.spearmanPValue;
        const pText = p < 0.001 ? 'p < .001' : `p = ${p.toFixed(3)}`;
        const df = stats.n - 2;
        const isSig = p < 0.05;
        const sigText = isSig ? 'statistically significant' : 'not statistically significant';
        const rSquared = (rVal * rVal * 100).toFixed(2);
        
        return `A ${isPearson ? 'Pearson product-moment' : 'Spearman rank-order'} correlation coefficient was computed to assess the relationship between ${labelX} and ${labelY}. The analysis revealed a ${strength}, ${direction} correlation between the two variables, ${sym}(${df}) = ${val}, ${pText}. This relationship was ${sigText}. Additionally, the coefficient of determination (${sym}²) indicates that ${labelX} explains approximately ${rSquared}% of the variance in ${labelY}, suggesting a ${strength} predictive relationship.`;
    }
    return '';
  }

  const renderSimpleMatrix = () => {
    if (!stats) return null;
    const rVal = isPearson ? stats.r : stats.spearmanRho;
    const pVal2 = isPearson ? stats.pValue : stats.spearmanPValue;
    const pVal1 = isPearson ? stats.pValueOneTailed : stats.spearmanPValueOneTailed;
    const n = stats.n;
    const rStr = rVal.toFixed(3) + getAsterisks(pVal2);

    return (
      <div className="overflow-x-auto" ref={tableRef}>
        <table className="w-full text-xs text-left border-collapse font-sans text-white bg-black">
          <thead>
            <tr>
              <th colSpan={2} className="border border-white/20 p-3 bg-zinc-900 font-black uppercase tracking-widest text-center">Standard Correlations</th>
              <th className="border border-white/20 p-3 bg-zinc-900 font-black uppercase tracking-widest text-center min-w-[120px]">{labelX}</th>
              <th className="border border-white/20 p-3 bg-zinc-900 font-black uppercase tracking-widest text-center min-w-[120px]">{labelY}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td rowSpan={4} className="border border-white/20 p-3 font-black uppercase tracking-widest bg-zinc-900/50 align-top">{labelX}</td>
              <td className="border border-white/20 p-3 text-zinc-400 font-bold uppercase tracking-widest">{symbol}</td>
              <td className="border border-white/20 p-3 text-center text-zinc-500">1</td>
              <td className="border border-white/20 p-3 text-center font-bold text-white">{rStr}</td>
            </tr>
            <tr>
              <td className="border border-white/20 p-3 text-zinc-400 font-bold uppercase tracking-widest">Sig. (2-tailed)</td>
              <td className="border border-white/20 p-3 text-center"></td>
              <td className="border border-white/20 p-3 text-center font-mono">{formatSig(pVal2)}</td>
            </tr>
            <tr>
              <td className="border border-white/20 p-3 text-zinc-400 font-bold uppercase tracking-widest">Sig. (1-tailed)</td>
              <td className="border border-white/20 p-3 text-center"></td>
              <td className="border border-white/20 p-3 text-center font-mono text-zinc-600">{formatSig(pVal1)}</td>
            </tr>
            <tr>
              <td className="border border-white/20 p-3 text-zinc-400 font-bold uppercase tracking-widest">N</td>
              <td className="border border-white/20 p-3 text-center font-mono">{n}</td>
              <td className="border border-white/20 p-3 text-center font-mono">{n}</td>
            </tr>

            <tr className="border-t-2 border-white/20">
              <td rowSpan={4} className="border border-white/20 p-3 font-black uppercase tracking-widest bg-zinc-900/50 align-top">{labelY}</td>
              <td className="border border-white/20 p-3 text-zinc-400 font-bold uppercase tracking-widest">{symbol}</td>
              <td className="border border-white/20 p-3 text-center font-bold text-white">{rStr}</td>
              <td className="border border-white/20 p-3 text-center text-zinc-500">1</td>
            </tr>
            <tr>
              <td className="border border-white/20 p-3 text-zinc-400 font-bold uppercase tracking-widest">Sig. (2-tailed)</td>
              <td className="border border-white/20 p-3 text-center font-mono">{formatSig(pVal2)}</td>
              <td className="border border-white/20 p-3 text-center"></td>
            </tr>
            <tr>
              <td className="border border-white/20 p-3 text-zinc-400 font-bold uppercase tracking-widest">Sig. (1-tailed)</td>
              <td className="border border-white/20 p-3 text-center font-mono text-zinc-600">{formatSig(pVal1)}</td>
              <td className="border border-white/20 p-3 text-center"></td>
            </tr>
            <tr>
              <td className="border border-white/20 p-3 text-zinc-400 font-bold uppercase tracking-widest">N</td>
              <td className="border border-white/20 p-3 text-center font-mono">{n}</td>
              <td className="border border-white/20 p-3 text-center font-mono">{n}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="pt-4 text-[10px] text-zinc-500 italic uppercase tracking-widest font-bold">
                {stats.pValue < 0.01 ? '**. Correlation is significant at the 0.01 level (2-tailed).' : 
                 stats.pValue < 0.05 ? '*. Correlation is significant at the 0.05 level (2-tailed).' : ''}
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-12">
           <table className="w-full text-xs text-left border-collapse font-sans text-white bg-black">
            <thead>
              <tr className="border-b-2 border-white/40">
                <th colSpan={4} className="p-3 bg-zinc-900 font-black uppercase tracking-widest text-center">Descriptive Statistics Summary</th>
              </tr>
              <tr className="border-b border-white/20 bg-zinc-800/50">
                <th className="p-3 font-black uppercase tracking-widest">Variable ID</th>
                <th className="p-3 font-black uppercase tracking-widest text-center">M</th>
                <th className="p-3 font-black uppercase tracking-widest text-center">SD</th>
                <th className="p-3 font-black uppercase tracking-widest text-center">N</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/10">
                <td className="p-3 font-bold">{labelX}</td>
                <td className="p-3 text-center font-mono">{stats.meanX.toFixed(3)}</td>
                <td className="p-3 text-center font-mono">{stats.standardDeviationX.toFixed(3)}</td>
                <td className="p-3 text-center font-mono">{stats.n}</td>
              </tr>
              <tr className="border-b border-white/40">
                <td className="p-3 font-bold">{labelY}</td>
                <td className="p-3 text-center font-mono">{stats.meanY.toFixed(3)}</td>
                <td className="p-3 text-center font-mono">{stats.standardDeviationY.toFixed(3)}</td>
                <td className="p-3 text-center font-mono">{stats.n}</td>
              </tr>
            </tbody>
           </table>
        </div>
      </div>
    );
  };

  if (mode === 'simple' && !stats) return null;

  return (
    <div className="bg-zinc-950 p-8 rounded-[2rem] border border-white/10 shadow-2xl">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
          <Table className="w-5 h-5 text-zinc-500" />
          Standardized Output Matrix
        </h3>
        <button
          onClick={handleCopy}
          className={`
            flex items-center gap-2 px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all border
            ${copied 
              ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]' 
              : 'bg-zinc-800 text-zinc-400 hover:text-white border-white/10 hover:bg-zinc-700'}
          `}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy Matrix'}
        </button>
      </div>

      <div className="p-6 bg-black/40 rounded-2xl border border-white/5 overflow-hidden">
        {renderSimpleMatrix()}
      </div>

      <div className="mt-10 p-8 bg-white/5 border border-white/10 rounded-[2rem]">
        <h4 className="text-xs font-black text-white uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
            <FileText className="w-5 h-5 text-zinc-500" />
            APA Synthesis Report
        </h4>
        <p className="text-sm text-zinc-400 leading-relaxed font-light select-all italic selection:bg-white/10">
            {generateReportText()}
        </p>
      </div>
    </div>
  );
};

export default StatisticalTable;