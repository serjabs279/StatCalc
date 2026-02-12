import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TrendingUp, Wand2, RefreshCcw, Settings2, Trash2, Plus, Box, ArrowRight, Grid3X3, Layers, Activity } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import CorrelationHeatmap from '../CorrelationHeatmap';
import StatisticalTable from '../StatisticalTable';
import { parseInputData, calculateStatistics, runHypothesisTest, calculateCompositeVector } from '../../utils/statistics';
import { analyzeCorrelation, analyzeHybridStrategy } from '../../services/geminiService';
import { DataPoint, StatisticsResult, AnalysisState, CorrelationType, LikertConfig, HypothesisResult, AnalysisMode, DimensionInput, HybridResult } from '../../types';

const SAMPLE_X = "10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5";
const SAMPLE_Y = "8.04, 6.95, 7.58, 8.81, 8.33, 9.96, 7.24, 4.26, 10.84, 4.82, 5.68";
const DEFAULT_LABELS_5 = ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"];
const DEFAULT_LABELS_7 = ["Strongly Disagree", "Disagree", "Somewhat Disagree", "Neutral", "Somewhat Agree", "Agree", "Strongly Agree"];

const CorrelationView: React.FC = () => {
  const [mode, setMode] = useState<AnalysisMode>('simple');
  const [inputX, setInputX] = useState<string>(SAMPLE_X);
  const [labelX, setLabelX] = useState<string>("Variable X");
  const [constructName, setConstructName] = useState<string>("Composite Construct (IV)");
  const [dimensions, setDimensions] = useState<DimensionInput[]>([
    { id: '1', name: "Dimension 1", value: "" },
    { id: '2', name: "Dimension 2", value: "" }
  ]);
  const [inputY, setInputY] = useState<string>(SAMPLE_Y);
  const [labelY, setLabelY] = useState<string>("Variable Y");
  const [testType, setTestType] = useState<CorrelationType>('pearson');
  const [likertX, setLikertX] = useState<LikertConfig>({ enabled: false, points: 5, isReversed: false, labels: [...DEFAULT_LABELS_5] });
  const [likertY, setLikertY] = useState<LikertConfig>({ enabled: false, points: 5, isReversed: false, labels: [...DEFAULT_LABELS_5] });
  const [stats, setStats] = useState<StatisticsResult | null>(null);
  const [hybridResult, setHybridResult] = useState<HybridResult | null>(null);
  const [hypothesis, setHypothesis] = useState<HypothesisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AnalysisState>({ isLoading: false, result: null, error: null });
  const aiSectionRef = useRef<HTMLDivElement>(null);

  const addDimension = () => setDimensions(prev => [...prev, { id: Date.now().toString(), name: `Dimension ${prev.length + 1}`, value: "" }]);
  const removeDimension = (id: string) => dimensions.length > 1 && setDimensions(prev => prev.filter(d => d.id !== id));
  const updateDimension = (id: string, field: 'name' | 'value', val: string) => setDimensions(prev => prev.map(d => d.id === id ? { ...d, [field]: val } : d));

  const updateLikertConfig = (axis: 'x' | 'y', field: keyof LikertConfig, value: any) => {
    const setter = axis === 'x' ? setLikertX : setLikertY;
    const current = axis === 'x' ? likertX : likertY;
    if (field === 'points') {
      setter({ ...current, points: value, labels: value === 5 ? [...DEFAULT_LABELS_5] : [...DEFAULT_LABELS_7] });
    } else {
      setter({ ...current, [field]: value });
    }
  };

  const updateLikertLabel = (axis: 'x' | 'y', index: number, newText: string) => {
    const current = axis === 'x' ? likertX : likertY;
    const setter = axis === 'x' ? setLikertX : setLikertY;
    const newLabels = [...current.labels];
    newLabels[index] = newText;
    setter({ ...current, labels: newLabels });
  };

  const processSimpleData = useCallback(() => {
    setError(null);
    const xValues = parseInputData(inputX, likertX);
    const yValues = parseInputData(inputY, likertY);
    if (xValues.length === 0 || yValues.length === 0) { setStats(null); setHypothesis(null); return; }
    if (xValues.length !== yValues.length) setError(`Mismatch: X has ${xValues.length}, Y has ${yValues.length}. Using ${Math.min(xValues.length, yValues.length)}.`);
    const points: DataPoint[] = xValues.slice(0, Math.min(xValues.length, yValues.length)).map((x, i) => ({ id: i, x, y: yValues[i] }));
    const calcStats = calculateStatistics(points);
    setStats(calcStats);
    if (calcStats) setHypothesis(runHypothesisTest(testType === 'pearson' ? calcStats.pValue : calcStats.spearmanPValue, testType));
  }, [inputX, inputY, likertX, likertY, testType]);

  const processHybridData = useCallback(() => {
    setError(null);
    const yValues = parseInputData(inputY, likertY);
    const dimParsed = dimensions.map(d => ({ ...d, parsed: parseInputData(d.value, likertX) }));
    if (yValues.length === 0 || dimParsed.some(d => d.parsed.length === 0)) { setHybridResult(null); return; }
    const minLen = Math.min(yValues.length, ...dimParsed.map(d => d.parsed.length));
    if (minLen < 2) { setError("Insufficient data points (n < 2)."); setHybridResult(null); return; }
    const yTrunc = yValues.slice(0, minLen);
    const dimArrays = dimParsed.map(d => d.parsed.slice(0, minLen));
    const compositeVector = calculateCompositeVector(dimArrays);
    const compositeStats = calculateStatistics(compositeVector.map((x, i) => ({ id: i, x, y: yTrunc[i] })));
    if (!compositeStats) { setError("Calculation failed."); return; }
    const dimResults = dimParsed.map((d) => {
      const dStats = calculateStatistics(d.parsed.slice(0, minLen).map((x, i) => ({ id: i, x, y: yTrunc[i] })));
      return dStats ? { id: d.id, name: d.name, stats: dStats, hypothesis: runHypothesisTest(testType === 'pearson' ? dStats.pValue : dStats.spearmanPValue, testType) } : null;
    }).filter(d => d !== null) as HybridResult['dimensions'];
    setHybridResult({ composite: { name: constructName, stats: compositeStats, hypothesis: runHypothesisTest(testType === 'pearson' ? compositeStats.pValue : compositeStats.spearmanPValue, testType) }, dimensions: dimResults });
  }, [inputY, dimensions, likertX, likertY, testType, constructName]);

  const handleCalculate = () => mode === 'simple' ? processSimpleData() : processHybridData();

  useEffect(() => { setAiAnalysis({ isLoading: false, result: null, error: null }); setError(null); mode === 'simple' ? setHybridResult(null) : setStats(null); }, [mode]);

  const handleAIAnalysis = async () => {
    setAiAnalysis({ isLoading: true, result: null, error: null });
    setTimeout(() => aiSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    try {
      const result = mode === 'simple' && stats ? await analyzeCorrelation(stats, labelX, labelY, testType) : 
                     mode === 'hybrid' && hybridResult ? await analyzeHybridStrategy(hybridResult, labelY, testType) : "";
      setAiAnalysis({ isLoading: false, result, error: null });
    } catch (err) { setAiAnalysis({ isLoading: false, result: null, error: "Failed to fetch AI analysis." }); }
  };

  const loadExample = () => {
    setTestType('pearson');
    setLikertX(p => ({ ...p, enabled: false }));
    setLikertY(p => ({ ...p, enabled: false }));
    if (mode === 'simple') { setInputX(SAMPLE_X); setInputY(SAMPLE_Y); setLabelX("Variable X"); setLabelY("Variable Y"); }
    else { setConstructName("Job Satisfaction"); setInputY("8, 7, 9, 6, 8, 9, 5, 4, 8, 6"); setDimensions([{ id: '1', name: "Pay Satisfaction", value: "7, 6, 8, 5, 7, 8, 4, 3, 7, 5" }, { id: '2', name: "Work-Life Balance", value: "9, 8, 9, 7, 8, 9, 6, 5, 9, 7" }, { id: '3', name: "Management Trust", value: "5, 4, 6, 3, 5, 6, 2, 2, 5, 4" }]); }
    setTimeout(() => document.getElementById('run-btn')?.click(), 100);
  };

  const renderLikertConfig = (axis: 'x' | 'y') => {
    const config = axis === 'x' ? likertX : likertY;
    if (!config.enabled) return null;
    return (
      <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-lg animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
             <span className="text-xs font-semibold text-slate-500 uppercase">Scale Points</span>
             <div className="flex bg-white rounded-md shadow-sm border border-slate-200 p-0.5">
                <button onClick={() => updateLikertConfig(axis, 'points', 5)} className={`px-2 py-0.5 text-[10px] font-medium rounded ${config.points === 5 ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'}`}>5-Pt</button>
                <button onClick={() => updateLikertConfig(axis, 'points', 7)} className={`px-2 py-0.5 text-[10px] font-medium rounded ${config.points === 7 ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'}`}>7-Pt</button>
             </div>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {config.labels.map((l, i) => (
                <div key={i} className="flex gap-2 items-center"><span className="text-[10px] w-3 text-right text-slate-400">{config.isReversed ? config.points - i : i + 1}</span><input value={l} onChange={(e) => updateLikertLabel(axis, i, e.target.value)} className="w-full text-xs border border-slate-200 bg-white rounded px-2 py-1 text-slate-900" /></div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const getInterpretationText = (r: number) => {
      const abs = Math.abs(r);
      if (abs > 0.8) return "Very Strong";
      if (abs > 0.6) return "Strong";
      if (abs > 0.4) return "Moderate";
      if (abs > 0.2) return "Weak";
      return "Negligible";
  }

  const getInterpretationColor = (r: number) => {
      const abs = Math.abs(r);
      if (abs > 0.6) return "text-indigo-700";
      if (abs > 0.4) return "text-purple-600";
      return "text-slate-600";
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500 font-sans">
        
        {/* INPUT COLUMN */}
        <div className="lg:col-span-4 xl:col-span-3">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 sticky top-24">
                
                {/* Toggles */}
                <div className="bg-slate-100 p-1 rounded-lg flex mb-4">
                    <button onClick={() => setMode('simple')} className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${mode === 'simple' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        <ArrowRight className={`w-3 h-3 inline mr-1 ${mode === 'simple' ? 'block' : 'hidden'}`} />Simple
                    </button>
                    <button onClick={() => setMode('hybrid')} className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${mode === 'hybrid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        <Layers className={`w-3 h-3 inline mr-1 ${mode === 'hybrid' ? 'block' : 'hidden'}`} />Hybrid
                    </button>
                </div>

                <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                     <button onClick={() => setTestType('pearson')} className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${testType === 'pearson' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Pearson</button>
                     <button onClick={() => setTestType('spearman')} className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${testType === 'spearman' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Spearman</button>
                </div>

                {/* Input Fields */}
                <div className="space-y-6">
                    {/* Var X Input */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                             <label className="text-xs font-bold text-slate-500 uppercase">{mode === 'simple' ? 'Variable X' : 'Dimensions (IV)'}</label>
                             <button onClick={() => updateLikertConfig('x', 'enabled', !likertX.enabled)} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] transition-colors ${likertX.enabled ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                <Settings2 className="w-3 h-3" /> Likert
                             </button>
                        </div>
                        {mode === 'simple' ? (
                            <>
                                <input value={labelX} onChange={e => setLabelX(e.target.value)} className="w-full text-sm px-3 py-2 bg-white border border-slate-200 rounded-lg mb-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 outline-none text-slate-700 font-medium placeholder-slate-400" placeholder="Label (e.g. Height)" />
                                <textarea value={inputX} onChange={e => setInputX(e.target.value)} className="w-full h-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-600 focus:ring-2 focus:ring-indigo-100 outline-none resize-none placeholder:text-slate-400" placeholder="10, 20, 30..." />
                            </>
                        ) : (
                            <div className="space-y-3">
                                <input value={constructName} onChange={e => setConstructName(e.target.value)} className="w-full px-3 py-2 bg-indigo-50 border-indigo-200 rounded-lg text-xs font-bold text-indigo-900" placeholder="Construct Name" />
                                <div className="space-y-3 pl-2 border-l-2 border-slate-100">
                                    {dimensions.map((d) => (
                                        <div key={d.id} className="group relative">
                                            <input value={d.name} onChange={e => updateDimension(d.id, 'name', e.target.value)} className="w-full bg-transparent text-xs font-medium text-slate-700 mb-1 border-none p-0 focus:ring-0" placeholder="Dimension Name" />
                                            <textarea value={d.value} onChange={e => updateDimension(d.id, 'value', e.target.value)} className="w-full h-16 p-2 bg-white border border-slate-200 rounded-lg font-mono text-xs resize-none text-slate-600 focus:ring-1 focus:ring-indigo-200" placeholder="Data..." />
                                            {dimensions.length > 1 && <button onClick={() => removeDimension(d.id)} className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-opacity"><Trash2 className="w-3 h-3" /></button>}
                                        </div>
                                    ))}
                                    <button onClick={addDimension} className="w-full py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded flex justify-center items-center gap-1 hover:bg-indigo-100 transition-colors"><Plus className="w-3 h-3" /> Add Dimension</button>
                                </div>
                            </div>
                        )}
                        {renderLikertConfig('x')}
                    </div>

                    {/* Var Y Input */}
                    <div>
                         <div className="flex justify-between items-center mb-2">
                             <label className="text-xs font-bold text-slate-500 uppercase">{mode === 'simple' ? 'Variable Y' : 'Dependent Variable'}</label>
                             <button onClick={() => updateLikertConfig('y', 'enabled', !likertY.enabled)} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] transition-colors ${likertY.enabled ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                <Settings2 className="w-3 h-3" /> Likert
                             </button>
                        </div>
                        <input value={labelY} onChange={e => setLabelY(e.target.value)} className="w-full text-sm px-3 py-2 bg-white border border-slate-200 rounded-lg mb-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 outline-none text-slate-700 font-medium placeholder-slate-400" placeholder="Label (e.g. Weight)" />
                        <textarea value={inputY} onChange={e => setInputY(e.target.value)} className="w-full h-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-600 focus:ring-2 focus:ring-indigo-100 outline-none resize-none placeholder:text-slate-400" placeholder="10, 20, 30..." />
                        {renderLikertConfig('y')}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-8 pt-4 border-t border-slate-100">
                    <button id="run-btn" onClick={handleCalculate} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200/50 transition-all flex items-center justify-center gap-2">
                        Run Analysis
                    </button>
                    {error && <div className="mt-4 p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 flex items-start gap-2"><div className="mt-0.5"><Trash2 className="w-3 h-3"/></div>{error}</div>}
                    <button onClick={loadExample} className="w-full mt-3 py-2 text-xs font-medium text-slate-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-1">
                        <RefreshCcw className="w-3 h-3" /> Load Example Data
                    </button>
                </div>
            </div>
        </div>

        {/* RESULTS COLUMN */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-6">
            
            {(stats || hybridResult) ? (
                 <>
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-5 h-5 text-indigo-600" />
                        <h2 className="text-lg font-bold text-slate-800">Statistical Results <span className="text-slate-400 font-normal ml-2">| {testType === 'pearson' ? 'Pearson' : 'Spearman'}</span></h2>
                    </div>

                    {/* Hero Card */}
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-8 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex flex-col sm:flex-row items-center gap-8 text-center sm:text-left">
                            {/* Circle Chart */}
                            <div className="relative w-36 h-36 shrink-0 flex items-center justify-center min-w-[9rem] min-h-[9rem]">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 144 144" preserveAspectRatio="xMidYMid meet">
                                    <circle cx="72" cy="72" r="60" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-indigo-50" />
                                    <circle 
                                        cx="72" cy="72" r="60" 
                                        stroke="currentColor" strokeWidth="8" fill="transparent" 
                                        strokeDasharray={377} 
                                        strokeDashoffset={377 - (377 * Math.abs(mode === 'simple' && stats ? stats.r : hybridResult!.composite.stats.r))} 
                                        className="text-indigo-600 transition-all duration-1000 ease-out" 
                                        strokeLinecap="round" 
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-4xl font-bold text-indigo-700 tracking-tighter">
                                        {(mode === 'simple' && stats ? (testType === 'pearson' ? stats.r : stats.spearmanRho) : (testType === 'pearson' ? hybridResult!.composite.stats.r : hybridResult!.composite.stats.spearmanRho)).toFixed(3)}
                                    </span>
                                </div>
                            </div>
                            
                            {/* Text Summary */}
                            <div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Coefficient</div>
                                <div className={`text-4xl font-bold mb-1 ${getInterpretationColor(mode === 'simple' && stats ? stats.r : hybridResult!.composite.stats.r)}`}>
                                    {getInterpretationText(mode === 'simple' && stats ? stats.r : hybridResult!.composite.stats.r)}
                                </div>
                                <div className="text-slate-500 font-medium">Correlation</div>
                            </div>
                        </div>

                        {/* Analyze Button */}
                        <button 
                            onClick={handleAIAnalysis} 
                            disabled={aiAnalysis.isLoading} 
                            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 group disabled:opacity-70"
                        >
                            <Wand2 className="w-5 h-5 group-hover:rotate-12 transition-transform" /> 
                            {aiAnalysis.isLoading ? 'Analyzing...' : 'Analyze'}
                        </button>
                    </div>

                    {/* Secondary Metrics Grid */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <div className="grid grid-cols-2 gap-6">
                            {/* Sample Size */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center animate-in slide-in-from-bottom-6 duration-500 delay-100">
                                <div className="text-xs font-bold text-slate-400 uppercase mb-3">Sample Size (N)</div>
                                <div className="text-4xl font-medium text-slate-700">{mode === 'simple' && stats ? stats.n : hybridResult!.composite.stats.n}</div>
                            </div>
                            {/* P-Value */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center animate-in slide-in-from-bottom-6 duration-500 delay-150">
                                <div className="text-xs font-bold text-slate-400 uppercase mb-3">P-Value</div>
                                <div className="text-4xl font-medium text-slate-700">
                                    {(mode === 'simple' && stats ? stats.pValue : hybridResult!.composite.stats.pValue).toFixed(4)}
                                </div>
                                <div className={`text-sm font-bold mt-2 ${(mode === 'simple' && stats ? stats.pValue : hybridResult!.composite.stats.pValue) < 0.05 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                    {(mode === 'simple' && stats ? stats.pValue : hybridResult!.composite.stats.pValue) < 0.05 ? 'Significant' : 'Not Significant'}
                                </div>
                            </div>
                        </div>

                        {/* Heatmap Area */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-6 duration-500 delay-200">
                            {mode === 'simple' && stats ? (
                                <CorrelationHeatmap stats={stats} labelX={labelX} labelY={labelY} testType={testType} />
                            ) : (
                                <div className="p-6 h-full flex flex-col justify-center items-center text-center">
                                    <Grid3X3 className="w-8 h-8 text-indigo-200 mb-2" />
                                    <div className="text-sm font-medium text-slate-400">Heatmap available in Simple Mode</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Detailed Analysis Section */}
                    <div className="grid grid-cols-1 gap-6">
                         <StatisticalTable mode={mode} testType={testType} stats={stats} hybridResult={hybridResult} labelX={labelX} labelY={labelY} />
                         
                         {/* AI Result Area */}
                         <div ref={aiSectionRef} className="scroll-mt-24">
                            {aiAnalysis.result && (
                                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-8 rounded-2xl shadow-sm border border-indigo-100 relative overflow-hidden animate-in fade-in duration-700">
                                     <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none"><Wand2 className="w-64 h-64 text-indigo-600" /></div>
                                     <div className="relative z-10">
                                        <h3 className="text-xl font-bold text-indigo-900 mb-6 flex items-center gap-2"><Wand2 className="w-6 h-6" /> AI Interpretation</h3>
                                        <div className="prose prose-indigo bg-white/60 p-6 rounded-xl border border-indigo-50/50 max-w-none text-sm shadow-sm">
                                            <ReactMarkdown>{aiAnalysis.result}</ReactMarkdown>
                                        </div>
                                     </div>
                                </div>
                            )}
                            {aiAnalysis.error && (
                                <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm">{aiAnalysis.error}</div>
                            )}
                         </div>
                    </div>
                 </>
            ) : (
                // EMPTY STATE
                <div className="h-[600px] bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
                        <TrendingUp className="w-8 h-8 text-indigo-200" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-600 mb-2">Ready to Analyze</h3>
                    <p className="max-w-md text-center text-slate-500">Enter your data in the sidebar and click "Run Analysis" to generate professional statistical reports.</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default CorrelationView;