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
        
        // Changed to 3 decimal places to match table
        const val = rVal.toFixed(3);
        
        const p = isPearson ? stats.pValue : stats.spearmanPValue;
        const pText = p < 0.001 ? 'p < .001' : `p = ${p.toFixed(3)}`;
        const df = stats.n - 2;
        const isSig = p < 0.05;
        const sigText = isSig ? 'statistically significant' : 'not statistically significant';
        
        // Calculate Variance Explained (Coefficient of Determination)
        const rSquared = (rVal * rVal * 100).toFixed(2);
        
        return `A ${isPearson ? 'Pearson product-moment' : 'Spearman rank-order'} correlation coefficient was computed to assess the relationship between ${labelX} and ${labelY}. The analysis revealed a ${strength}, ${direction} correlation between the two variables, ${sym}(${df}) = ${val}, ${pText}. This relationship was ${sigText}. Additionally, the coefficient of determination (${sym}²) indicates that ${labelX} explains approximately ${rSquared}% of the variance in ${labelY}, suggesting a ${strength} predictive relationship.`;
    }
    
    if (mode === 'hybrid' && hybridResult) {
        const compStats = hybridResult.composite.stats;
        const rVal = isPearson ? compStats.r : compStats.spearmanRho;
        
        // Changed to 3 decimal places to match table
        const val = rVal.toFixed(3);
        
        const p = isPearson ? compStats.pValue : compStats.spearmanPValue;
        const pText = p < 0.001 ? 'p < .001' : `p = ${p.toFixed(3)}`;
        const sym = isPearson ? 'r' : 'rs';
        const isSig = p < 0.05;
        const sigText = isSig ? 'significant' : 'non-significant';
        const rSquared = (rVal * rVal * 100).toFixed(2);
        
        const sigDims = hybridResult.dimensions.filter(d => d.hypothesis.isSignificant).map(d => d.name);
        let dimText = "";
        if (sigDims.length > 0) {
             if (sigDims.length === hybridResult.dimensions.length) {
                 dimText = " All underlying dimensions contributed significantly to this outcome, confirming the composite construct's validity.";
             } else {
                 dimText = ` Specifically, the analysis highlights that the ${sigDims.join(', ')} dimension${sigDims.length > 1 ? 's' : ''} drove this relationship, whereas other dimensions showed weaker associations.`;
             }
        } else {
             dimText = " However, further micro-analysis of individual dimensions revealed no significant correlations at the 0.05 level, suggesting the relationship may be weak or inconsistent across sub-factors.";
        }

        return `The hybrid analysis evaluated the relationship between the composite construct '${hybridResult.composite.name}' and '${labelY}'. The macro-level analysis indicated a ${Math.abs(rVal) > 0.3 ? 'substantial' : 'modest'} ${sigText} relationship, ${sym} = ${val}, ${pText}. The composite construct accounts for ${rSquared}% of the variance in the dependent variable.${dimText}`;
    }
    return '';
  }

  const renderSimpleMatrix = () => {
    if (!stats) return null;
    const rVal = isPearson ? stats.r : stats.spearmanRho;
    const pVal2 = isPearson ? stats.pValue : stats.spearmanPValue;
    const pVal1 = isPearson ? stats.pValueOneTailed : stats.spearmanPValueOneTailed;
    const n = stats.n;
    
    const sigStr2 = formatSig(pVal2);
    const sigStr1 = formatSig(pVal1);
    const rStr = rVal.toFixed(3) + getAsterisks(pVal2);

    return (
      <div className="overflow-x-auto" ref={tableRef}>
        <table className="w-full text-sm text-left border-collapse font-sans text-slate-900 bg-white">
          <thead>
            <tr>
              <th colSpan={2} className="border border-slate-400 p-2 bg-slate-50 font-bold text-center">Correlations</th>
              <th className="border border-slate-400 p-2 bg-slate-50 font-semibold min-w-[120px]">{labelX}</th>
              <th className="border border-slate-400 p-2 bg-slate-50 font-semibold min-w-[120px]">{labelY}</th>
            </tr>
          </thead>
          <tbody>
            {/* Variable X Row Group */}
            <tr className="border-t border-slate-400">
              <td rowSpan={4} className="border border-slate-400 p-2 font-semibold bg-slate-50/30 align-top">{labelX}</td>
              <td className="border border-slate-400 p-2">{symbol}</td>
              <td className="border border-slate-400 p-2 text-center">1</td>
              <td className="border border-slate-400 p-2 text-center">{rStr}</td>
            </tr>
            <tr>
              <td className="border border-slate-400 p-2">Sig. (2-tailed)</td>
              <td className="border border-slate-400 p-2 text-center"></td>
              <td className="border border-slate-400 p-2 text-center">{sigStr2}</td>
            </tr>
            <tr>
              <td className="border border-slate-400 p-2">Sig. (1-tailed)</td>
              <td className="border border-slate-400 p-2 text-center"></td>
              <td className="border border-slate-400 p-2 text-center text-slate-500">{sigStr1}</td>
            </tr>
            <tr>
              <td className="border border-slate-400 p-2">N</td>
              <td className="border border-slate-400 p-2 text-center">{n}</td>
              <td className="border border-slate-400 p-2 text-center">{n}</td>
            </tr>

            {/* Variable Y Row Group */}
            <tr className="border-t-2 border-slate-400">
              <td rowSpan={4} className="border border-slate-400 p-2 font-semibold bg-slate-50/30 align-top">{labelY}</td>
              <td className="border border-slate-400 p-2">{symbol}</td>
              <td className="border border-slate-400 p-2 text-center">{rStr}</td>
              <td className="border border-slate-400 p-2 text-center">1</td>
            </tr>
            <tr>
              <td className="border border-slate-400 p-2">Sig. (2-tailed)</td>
              <td className="border border-slate-400 p-2 text-center">{sigStr2}</td>
              <td className="border border-slate-400 p-2 text-center"></td>
            </tr>
            <tr>
              <td className="border border-slate-400 p-2">Sig. (1-tailed)</td>
              <td className="border border-slate-400 p-2 text-center text-slate-500">{sigStr1}</td>
              <td className="border border-slate-400 p-2 text-center"></td>
            </tr>
            <tr>
              <td className="border border-slate-400 p-2">N</td>
              <td className="border border-slate-400 p-2 text-center">{n}</td>
              <td className="border border-slate-400 p-2 text-center">{n}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="pt-2 text-xs text-slate-500 italic">
                {stats.pValue < 0.01 ? '**. Correlation is significant at the 0.01 level (2-tailed).' : 
                 stats.pValue < 0.05 ? '*. Correlation is significant at the 0.05 level (2-tailed).' : ''}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Descriptive Statistics Table (Academic Style) */}
        <div className="mt-8">
           <table className="w-full text-sm text-left border-collapse font-sans text-slate-900 bg-white">
            <thead>
              <tr>
                <th colSpan={4} className="border-b-2 border-slate-600 p-2 font-bold text-center">Descriptive Statistics</th>
              </tr>
              <tr className="border-b border-slate-400">
                <th className="p-2 font-semibold">Variable</th>
                <th className="p-2 font-semibold text-center">Mean</th>
                <th className="p-2 font-semibold text-center">Std. Deviation</th>
                <th className="p-2 font-semibold text-center">N</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2 border-b border-slate-200">{labelX}</td>
                <td className="p-2 text-center border-b border-slate-200">{stats.meanX.toFixed(3)}</td>
                <td className="p-2 text-center border-b border-slate-200">{stats.standardDeviationX.toFixed(3)}</td>
                <td className="p-2 text-center border-b border-slate-200">{stats.n}</td>
              </tr>
              <tr>
                <td className="p-2 border-b border-slate-600">{labelY}</td>
                <td className="p-2 text-center border-b border-slate-600">{stats.meanY.toFixed(3)}</td>
                <td className="p-2 text-center border-b border-slate-600">{stats.standardDeviationY.toFixed(3)}</td>
                <td className="p-2 text-center border-b border-slate-600">{stats.n}</td>
              </tr>
            </tbody>
           </table>
        </div>
      </div>
    );
  };

  const renderHybridTable = () => {
    if (!hybridResult) return null;
    
    return (
      <div className="overflow-x-auto" ref={tableRef}>
        {/* Composite Summary */}
        <div className="mb-6">
            <h4 className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Macro-Analysis (Model Summary)</h4>
            <table className="w-full text-sm text-left border-collapse font-sans text-slate-900 bg-white">
            <thead>
                <tr className="border-t-2 border-b-2 border-slate-600">
                <th className="p-2 font-semibold">Construct</th>
                <th className="p-2 font-semibold text-center">Dependent Variable</th>
                <th className="p-2 font-semibold text-center">{isPearson ? 'R' : 'Rho'}</th>
                <th className="p-2 font-semibold text-center">Sig. (2-tailed)</th>
                <th className="p-2 font-semibold text-center">N</th>
                </tr>
            </thead>
            <tbody>
                <tr className="border-b border-slate-600">
                <td className="p-2">{hybridResult.composite.name}</td>
                <td className="p-2 text-center">{labelY}</td>
                <td className="p-2 text-center">
                    {(isPearson ? hybridResult.composite.stats.r : hybridResult.composite.stats.spearmanRho).toFixed(3)}
                    {getAsterisks(isPearson ? hybridResult.composite.stats.pValue : hybridResult.composite.stats.spearmanPValue)}
                </td>
                <td className="p-2 text-center">
                    {formatSig(isPearson ? hybridResult.composite.stats.pValue : hybridResult.composite.stats.spearmanPValue)}
                </td>
                <td className="p-2 text-center">{hybridResult.composite.stats.n}</td>
                </tr>
            </tbody>
            </table>
        </div>

        {/* Micro Analysis */}
        <div>
            <h4 className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Micro-Analysis (Coefficients)</h4>
            <table className="w-full text-sm text-left border-collapse font-sans text-slate-900 bg-white">
            <thead>
                <tr className="border-t-2 border-b-2 border-slate-600">
                <th className="p-2 font-semibold">Dimension</th>
                <th className="p-2 font-semibold text-center">Correlation ({isPearson ? 'r' : 'ρ'})</th>
                <th className="p-2 font-semibold text-center">Sig. (2-tailed)</th>
                <th className="p-2 font-semibold text-center">Status</th>
                </tr>
            </thead>
            <tbody>
                {hybridResult.dimensions.map((dim, idx) => {
                    const rVal = isPearson ? dim.stats.r : dim.stats.spearmanRho;
                    const pVal = isPearson ? dim.stats.pValue : dim.stats.spearmanPValue;
                    const isLast = idx === hybridResult.dimensions.length - 1;
                    return (
                        <tr key={dim.id} className={isLast ? "border-b-2 border-slate-600" : "border-b border-slate-200"}>
                            <td className="p-2">{dim.name}</td>
                            <td className="p-2 text-center">
                                {rVal.toFixed(3)}{getAsterisks(pVal)}
                            </td>
                            <td className="p-2 text-center">{formatSig(pVal)}</td>
                            <td className="p-2 text-center text-xs">
                                {dim.hypothesis.isSignificant ? 'Supported' : 'Rejected'}
                            </td>
                        </tr>
                    )
                })}
            </tbody>
            <tfoot>
                 <tr>
                    <td colSpan={4} className="pt-2 text-xs text-slate-500 italic">
                        **. Correlation is significant at the 0.01 level (2-tailed). <br/>
                        *. Correlation is significant at the 0.05 level (2-tailed).
                    </td>
                 </tr>
            </tfoot>
            </table>
        </div>
      </div>
    );
  };

  if ((mode === 'simple' && !stats) || (mode === 'hybrid' && !hybridResult)) {
    return null;
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Table className="w-4 h-4 text-indigo-500" />
          {mode === 'simple' ? 'Statistical Results Output' : 'Hybrid Strategy Output'}
        </h3>
        <button
          onClick={handleCopy}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all
            ${copied 
              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'}
          `}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Copy Table'}
        </button>
      </div>

      <div className="p-4 bg-slate-50/50 rounded-lg border border-slate-100 overflow-hidden">
        {mode === 'simple' ? renderSimpleMatrix() : renderHybridTable()}
      </div>

      <div className="mt-6 p-4 bg-indigo-50/50 border border-indigo-100 rounded-lg">
        <h4 className="text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            APA Style Report & Interpretation
        </h4>
        <p className="text-sm text-slate-700 leading-relaxed font-serif select-all">
            {generateReportText()}
        </p>
      </div>
    </div>
  );
};

export default StatisticalTable;