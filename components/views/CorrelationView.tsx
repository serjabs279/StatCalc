import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TrendingUp, Wand2, RefreshCcw, Settings2, Trash2, Plus, Box, ArrowRight, Grid3X3, Layers, Activity, Table, FileSpreadsheet, ChevronDown, BookOpen, Sparkles, AlertCircle, HelpCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import CorrelationHeatmap from '../CorrelationHeatmap';
import StatisticalTable from '../StatisticalTable';
import DataModal from '../DataModal';
import CalculationTrace from '../CalculationTrace';
import { calculateStatistics } from '../../utils/statistics';
import { analyzeCorrelation } from '../../services/geminiService';
import { DataPoint, StatisticsResult, AnalysisState, CorrelationType, TableData, AnalysisMode } from '../../types';

const CorrelationView: React.FC = () => {
  const [mode, setMode] = useState<AnalysisMode>('simple');
  const [tableData, setTableData] = useState<TableData>({
    columns: [
      { id: '1', name: 'Variable X', values: ['10', '8', '13', '9', '11', '14', '6', '4', '12', '7', '5'] },
      { id: '2', name: 'Variable Y', values: ['8.04', '6.95', '7.58', '8.81', '8.33', '9.96', '7.24', '4.26', '10.84', '4.82', '5.68'] }
    ],
    rowCount: 11
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedXId, setSelectedXId] = useState<string>(tableData.columns[0].id);
  const [selectedYId, setSelectedYId] = useState<string>(tableData.columns[1].id);
  const [testType, setTestType] = useState<CorrelationType>('pearson');
  const [stats, setStats] = useState<StatisticsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AnalysisState>({ isLoading: false, result: null, error: null });
  const aiSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode === 'simple') {
      if (tableData.columns.length >= 2) {
        setSelectedXId(tableData.columns[0].id);
        setSelectedYId(tableData.columns[1].id);
      }
    }
  }, [mode, tableData.columns]);

  const handleCalculate = () => {
    setError(null);
    setAiAnalysis({ isLoading: false, result: null, error: null });
    const colX = tableData.columns.find(c => c.id === selectedXId);
    const colY = tableData.columns.find(c => c.id === selectedYId);
    if (!colX || !colY) {
      setError("Variable selection mismatch.");
      return;
    }
    const xValues = colX.values.map(v => parseFloat(v)).filter(v => !isNaN(v));
    const yValues = colY.values.map(v => parseFloat(v)).filter(v => !isNaN(v));
    if (xValues.length < 2 || yValues.length < 2) {
      setError("Insufficient data points for correlation analysis.");
      return;
    }
    const minLen = Math.min(xValues.length, yValues.length);
    const points: DataPoint[] = xValues.slice(0, minLen).map((x, i) => ({ id: i, x, y: yValues[i] }));
    const calcStats = calculateStatistics(points);
    setStats(calcStats);
  };

  const handleInterpretation = async () => {
    if (!stats) return;
    setAiAnalysis({ isLoading: true, result: null, error: null });
    setTimeout(() => aiSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    try {
      const colX = tableData.columns.find(c => c.id === selectedXId);
      const colY = tableData.columns.find(c => c.id === selectedYId);
      const result = await analyzeCorrelation(stats, colX?.name || "X", colY?.name || "Y", testType);
      setAiAnalysis({ isLoading: false, result, error: null });
    } catch (err) {
      setAiAnalysis({ isLoading: false, result: null, error: "Methodological synthesis error." });
    }
  };

  const loadExample = () => {
     setTableData({
        columns: [
            { id: '1', name: 'Exam_Score', values: ['85', '92', '78', '88', '95', '70', '82', '90', '75', '85'] },
            { id: '2', name: 'Study_Hours', values: ['10', '15', '8', '12', '20', '5', '11', '14', '7', '10'] }
        ],
        rowCount: 10
     });
     setSelectedXId('1');
     setSelectedYId('2');
     setTimeout(() => handleCalculate(), 100);
  };

  const getInterpretationText = (r: number) => {
      const abs = Math.abs(r);
      const strength = abs > 0.8 ? "Very Strong" : abs > 0.6 ? "Strong" : abs > 0.4 ? "Moderate" : abs > 0.2 ? "Weak" : "Negligible";
      const direction = r > 0 ? "Positive" : r < 0 ? "Negative" : "None";
      return { strength, direction };
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans">
        
        {/* INPUT COLUMN */}
        <div className="lg:col-span-4 xl:col-span-3">
            <div className="bg-zinc-900/40 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 sticky top-24 shadow-2xl">
                
                {/* Mode Toggle */}
                <div className="bg-black/50 p-1 rounded-2xl flex border border-white/5 mb-8">
                    <button 
                      onClick={() => setMode('simple')} 
                      className={`flex-1 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${mode === 'simple' ? 'bg-white text-black shadow-xl' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                      Bivariate
                    </button>
                    <button 
                      onClick={() => setMode('advanced')} 
                      className={`flex-1 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${mode === 'advanced' ? 'bg-white text-black shadow-xl' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                      Multivariate
                    </button>
                </div>

                <div className="mb-8">
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="w-full p-6 bg-black/40 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-3 group hover:border-white/40 hover:bg-white/5 transition-all duration-500"
                    >
                        <FileSpreadsheet className="w-8 h-8 text-zinc-700 group-hover:text-white transition-all duration-500" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 group-hover:text-white">
                          Edit Dataset
                        </span>
                    </button>
                </div>

                <div className="space-y-8">
                    {mode === 'advanced' && (
                        <div className="flex items-center gap-2 border-b border-white/5 pb-4">
                            <button onClick={() => setTestType('pearson')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${testType === 'pearson' ? 'border-white text-white' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}>Pearson r</button>
                            <button onClick={() => setTestType('spearman')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${testType === 'spearman' ? 'border-white text-white' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}>Spearman ρ</button>
                        </div>
                    )}

                    <div className="space-y-6">
                        <div>
                            <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-3 block">Independent Variable (X)</label>
                            <div className="relative">
                                <select value={selectedXId} onChange={(e) => setSelectedXId(e.target.value)} className="w-full pl-4 pr-10 py-3 bg-black/50 border border-white/10 rounded-2xl text-xs font-bold text-white appearance-none outline-none focus:ring-2 focus:ring-white/20 transition-all">
                                    {tableData.columns.map(col => <option key={col.id} value={col.id}>{col.name}</option>)}
                                </select>
                                <ChevronDown className="w-4 h-4 text-zinc-600 absolute right-4 top-3.5 pointer-events-none" />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-3 block">Dependent Variable (Y)</label>
                            <div className="relative">
                                <select value={selectedYId} onChange={(e) => setSelectedYId(e.target.value)} className="w-full pl-4 pr-10 py-3 bg-black/50 border border-white/10 rounded-2xl text-xs font-bold text-white appearance-none outline-none focus:ring-2 focus:ring-white/20 transition-all">
                                    {tableData.columns.map(col => <option key={col.id} value={col.id}>{col.name}</option>)}
                                </select>
                                <ChevronDown className="w-4 h-4 text-zinc-600 absolute right-4 top-3.5 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-white/5">
                        <button onClick={handleCalculate} className="w-full py-4 bg-white hover:bg-zinc-200 text-black font-black uppercase tracking-[0.2em] rounded-2xl shadow-[0_10px_30px_rgba(255,255,255,0.1)] transition-all active:scale-95 flex items-center justify-center gap-3">
                          <Activity className="w-5 h-5" /> {stats ? 'Recalculate Results' : 'Run Correlation Analysis'}
                        </button>
                        {error && <div className="mt-4 p-4 bg-red-500/10 text-red-400 text-[10px] font-black uppercase tracking-widest rounded-2xl border border-red-500/20 flex gap-3">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          {error}
                        </div>}
                        <button onClick={loadExample} className="w-full mt-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-white transition-all flex items-center justify-center gap-2">
                          <RefreshCcw className="w-3 h-3" /> Load Sample Data
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* RESULTS COLUMN */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-10">
            {stats ? (
                 <>
                    <div className="flex items-center gap-3 mb-2">
                        <Activity className="w-6 h-6 text-white" />
                        <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">Correlation Results Summary <span className="text-zinc-600 font-light not-italic ml-4">| Bivariate Analysis</span></h2>
                    </div>

                    {/* Statistical Interpretation Card */}
                    <div className="bg-white text-black p-10 rounded-[3rem] shadow-[0_0_80px_rgba(255,255,255,0.1)] flex flex-col md:flex-row items-center justify-between gap-10 relative overflow-hidden animate-in zoom-in-95 duration-700">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-black/5 rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2"></div>
                        
                        <div className="flex flex-col sm:flex-row items-center gap-10 z-10">
                            <div className="relative w-40 h-40 shrink-0 flex items-center justify-center bg-black/5 rounded-[2rem] border border-black/5 shadow-inner">
                                <div className="text-center">
                                    <div className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400 mb-1">Index</div>
                                    <div className="text-5xl font-black tracking-tighter text-black">{(testType === 'pearson' ? stats.r : stats.spearmanRho).toFixed(3)}</div>
                                </div>
                            </div>
                            <div className="max-w-md">
                                <div className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 mb-3 flex items-center gap-2">
                                  <Sparkles className="w-3.5 h-3.5 text-zinc-400" /> Statistical Results
                                </div>
                                <h3 className="text-3xl font-black mb-4 tracking-tight text-black">
                                  {getInterpretationText(testType === 'pearson' ? stats.r : stats.spearmanRho).strength} {getInterpretationText(testType === 'pearson' ? stats.r : stats.spearmanRho).direction} Correlation
                                </h3>
                                <p className="text-zinc-600 text-sm leading-relaxed font-medium italic">
                                  The analysis indicates a {getInterpretationText(testType === 'pearson' ? stats.r : stats.spearmanRho).strength.toLowerCase()} {getInterpretationText(testType === 'pearson' ? stats.r : stats.spearmanRho).direction.toLowerCase()} relationship between the variables.
                                </p>
                            </div>
                        </div>

                        <button 
                          onClick={handleInterpretation} 
                          disabled={aiAnalysis.isLoading} 
                          className="px-10 py-5 bg-black text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl flex items-center gap-3 group disabled:opacity-70 transition-all hover:scale-105 active:scale-95 shrink-0"
                        >
                          <Wand2 className="w-5 h-5" /> 
                          {aiAnalysis.isLoading ? 'Processing...' : 'Generate Statistical Analysis'}
                        </button>
                    </div>

                    <CalculationTrace type="correlation" data={stats} />

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                        <div className="grid grid-cols-2 gap-8">
                            <div className="bg-zinc-900/40 backdrop-blur-xl p-8 rounded-[2rem] border border-white/5 flex flex-col justify-center shadow-inner">
                                <div className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-4">Sample Size (N)</div>
                                <div className="text-5xl font-black text-white tracking-tighter">{stats.n}</div>
                                <p className="text-[10px] text-zinc-700 mt-4 font-bold uppercase tracking-widest">Valid Observations</p>
                            </div>
                            <div className="bg-zinc-900/40 backdrop-blur-xl p-8 rounded-[2rem] border border-white/5 flex flex-col justify-center shadow-inner">
                                <div className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                                  P-Value 
                                  <HelpCircle className="w-3 h-3 text-zinc-800" />
                                </div>
                                <div className="text-5xl font-black text-white tracking-tighter">{stats.pValue.toFixed(4)}</div>
                                <div className={`text-[9px] font-black mt-4 px-3 py-1 rounded-full border tracking-[0.2em] text-center transition-all duration-500 ${stats.pValue < 0.05 ? 'bg-emerald-500 text-white border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-rose-950/30 text-rose-500 border-rose-900/50'}`}>
                                  {stats.pValue < 0.05 ? 'STATISTICALLY SIGNIFICANT' : 'NOT SIGNIFICANT'}
                                </div>
                            </div>
                        </div>
                        <div className="overflow-hidden">
                             <CorrelationHeatmap stats={stats} labelX={tableData.columns.find(c => c.id === selectedXId)?.name || "X"} labelY={tableData.columns.find(c => c.id === selectedYId)?.name || "Y"} testType={testType} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-10">
                         <StatisticalTable mode="simple" testType={testType} stats={stats} labelX={tableData.columns.find(c => c.id === selectedXId)?.name} labelY={tableData.columns.find(c => c.id === selectedYId)?.name} />
                         <div ref={aiSectionRef} className="scroll-mt-24">
                            {aiAnalysis.result && (
                                <div className="bg-white text-black p-12 rounded-[3rem] shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-10 duration-1000 border border-zinc-200">
                                     <div className="relative z-10">
                                        <h3 className="text-2xl font-black text-black mb-10 flex items-center gap-4 uppercase italic tracking-tighter"><Wand2 className="w-8 h-8 text-zinc-400" /> Methodological Analysis</h3>
                                        <div className="prose prose-zinc bg-black/5 p-10 rounded-[2rem] max-w-none text-base shadow-inner leading-relaxed text-black selection:bg-black/10"><ReactMarkdown>{aiAnalysis.result}</ReactMarkdown></div>
                                     </div>
                                     <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-zinc-200 to-transparent"></div>
                                </div>
                            )}
                         </div>
                    </div>
                 </>
            ) : (
                <div className="h-[650px] bg-black/40 rounded-[3rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-zinc-700 p-12 text-center animate-in fade-in duration-1000">
                    <div className="w-24 h-24 bg-zinc-900 rounded-[2rem] shadow-2xl flex items-center justify-center mb-10 ring-1 ring-white/10 group hover:scale-110 transition-all duration-700">
                      <TrendingUp className="w-12 h-12 text-zinc-700 group-hover:text-white transition-all" />
                    </div>
                    <h3 className="text-4xl font-black text-white mb-4 tracking-tighter uppercase italic">Ready for Analysis</h3>
                    <p className="max-w-md text-zinc-500 text-sm leading-relaxed mb-12 font-medium">
                      Define your variables and input your observation data. The tool will calculate the Pearson r or Spearman ρ correlation coefficients to determine relationship strength.
                    </p>
                    <div className="flex gap-6">
                      <button 
                        onClick={() => setIsModalOpen(true)}
                        className="px-8 py-3.5 bg-zinc-900 border border-white/10 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl shadow-xl hover:bg-zinc-800 transition-all flex items-center gap-3"
                      >
                        <FileSpreadsheet className="w-4 h-4" /> 1. Open Data Editor
                      </button>
                      <button 
                        onClick={handleCalculate}
                        className="px-10 py-3.5 bg-white text-black font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl shadow-[0_10px_30px_rgba(255,255,255,0.15)] hover:bg-zinc-200 transition-all flex items-center gap-3"
                      >
                        <Activity className="w-4 h-4" /> 2. Calculate Statistics
                      </button>
                    </div>
                </div>
            )}
        </div>

        <DataModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} data={tableData} onDataChange={setTableData} mode={mode} />
    </div>
  );
};

export default CorrelationView;