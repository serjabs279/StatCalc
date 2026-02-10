
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TrendingUp, Info, Wand2, RefreshCcw, AlertCircle, Layers, ArrowRightLeft, Scale, Settings2, Trash2, Plus, Box } from 'lucide-react';
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
    setTimeout(() => document.getElementById('update-btn')?.click(), 100);
  };

  const renderLikertConfig = (axis: 'x' | 'y') => {
    const config = axis === 'x' ? likertX : likertY;
    if (!config.enabled) return null;
    return (
      <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-lg animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
             <span className="text-xs font-semibold text-slate-500 uppercase">Scale</span>
             <div className="flex bg-white rounded-md shadow-sm border border-slate-200">
                <button onClick={() => updateLikertConfig(axis, 'points', 5)} className={`px-2 py-1 text-xs ${config.points === 5 ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'}`}>5-Pt</button>
                <div className="w-px bg-slate-200"></div>
                <button onClick={() => updateLikertConfig(axis, 'points', 7)} className={`px-2 py-1 text-xs ${config.points === 7 ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'}`}>7-Pt</button>
             </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {config.labels.map((l, i) => (
                <div key={i} className="flex gap-2 items-center"><span className="text-xs w-4 text-right text-slate-400">{config.isReversed ? config.points - i : i + 1}</span><input value={l} onChange={(e) => updateLikertLabel(axis, i, e.target.value)} className="w-full text-xs border border-slate-200 bg-white rounded px-2 py-1 text-slate-900" /></div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
        <div className="lg:col-span-4 xl:col-span-3 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar">
                <div className="flex items-center gap-4 mb-6">
                    <div className="bg-slate-100 p-1 rounded-lg flex border border-slate-200 flex-1">
                        <button onClick={() => setMode('simple')} className={`flex-1 py-1.5 text-xs font-medium rounded-md flex justify-center items-center gap-2 ${mode === 'simple' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}><ArrowRightLeft className="w-3 h-3" /> Simple</button>
                        <button onClick={() => setMode('hybrid')} className={`flex-1 py-1.5 text-xs font-medium rounded-md flex justify-center items-center gap-2 ${mode === 'hybrid' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500'}`}><Layers className="w-3 h-3" /> Hybrid</button>
                    </div>
                    <button onClick={loadExample} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors" title="Load Example"><RefreshCcw className="w-4 h-4" /></button>
                </div>

                <div className="mb-6 bg-slate-50 p-1 rounded-lg flex border border-slate-200">
                    <button onClick={() => setTestType('pearson')} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${testType === 'pearson' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Pearson</button>
                    <button onClick={() => setTestType('spearman')} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${testType === 'spearman' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Spearman</button>
                </div>

                <div className="space-y-6">
                    <div className="relative">
                        <div className="flex justify-between mb-2"><label className="text-sm font-medium text-slate-700">{mode === 'simple' ? "Variable X" : "IV (Construct)"}</label><button onClick={() => updateLikertConfig('x', 'enabled', !likertX.enabled)} className={`text-xs px-2 py-0.5 rounded-full ${likertX.enabled ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}><Settings2 className="w-3 h-3" /> Likert</button></div>
                        {mode === 'simple' ? (
                            <><input value={labelX} onChange={e => setLabelX(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg mb-2 text-sm text-slate-900" /><textarea value={inputX} onChange={e => setInputX(e.target.value)} className="w-full h-24 px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono text-sm resize-none text-slate-900" /></>
                        ) : (
                            <div className="space-y-4"><input value={constructName} onChange={e => setConstructName(e.target.value)} className="w-full px-3 py-2 bg-indigo-50 border-indigo-200 rounded-lg text-sm font-medium text-indigo-900" /><div className="space-y-3 pl-3 border-l-2 border-slate-100">{dimensions.map((d, i) => (<div key={d.id} className="group"><div className="flex justify-between mb-1"><input value={d.name} onChange={e => updateDimension(d.id, 'name', e.target.value)} className="bg-transparent text-xs font-medium text-slate-700" />{dimensions.length > 1 && <button onClick={() => removeDimension(d.id)}><Trash2 className="w-3 h-3 text-slate-300 hover:text-red-500" /></button>}</div><textarea value={d.value} onChange={e => updateDimension(d.id, 'value', e.target.value)} className="w-full h-16 px-2 py-1.5 bg-white border border-slate-200 rounded font-mono text-xs resize-none text-slate-900" /></div>))}<button onClick={addDimension} className="w-full py-2 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded flex justify-center items-center gap-1"><Plus className="w-3 h-3" /> Add Dimension</button></div></div>
                        )}
                        {renderLikertConfig('x')}
                    </div>
                    <div className="border-t border-slate-100"></div>
                    <div className="relative">
                        <div className="flex justify-between mb-2"><label className="text-sm font-medium text-slate-700">{mode === 'simple' ? "Variable Y" : "Dependent Variable"}</label><button onClick={() => updateLikertConfig('y', 'enabled', !likertY.enabled)} className={`text-xs px-2 py-0.5 rounded-full ${likertY.enabled ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}><Settings2 className="w-3 h-3" /> Likert</button></div>
                        <input value={labelY} onChange={e => setLabelY(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg mb-2 text-sm text-slate-900" /><textarea value={inputY} onChange={e => setInputY(e.target.value)} className="w-full h-24 px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono text-sm resize-none text-slate-900" />
                        {renderLikertConfig('y')}
                    </div>
                    <button id="update-btn" onClick={handleCalculate} className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all">Run Analysis</button>
                    {error && <div className="p-3 bg-amber-50 text-amber-700 text-sm rounded-lg flex items-start gap-2 border border-amber-200"><AlertCircle className="w-4 h-4 mt-0.5" />{error}</div>}
                </div>
            </div>
        </div>

        <div className="lg:col-span-8 xl:col-span-9 space-y-6">
            {mode === 'simple' && (
                <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-semibold mb-8 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-indigo-500" /> Statistical Results <span className="text-slate-400 font-normal ml-2 text-sm">| {testType === 'pearson' ? 'Pearson' : 'Spearman'}</span></h2>
                    {stats ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
                            <div className="md:col-span-2 xl:col-span-4 flex justify-between items-center pb-6 border-b border-slate-100 mb-2">
                                <div className="flex items-center gap-8"><div className="w-32 h-32 rounded-full bg-indigo-50 flex items-center justify-center ring-8 ring-indigo-50/50"><span className="text-4xl font-bold text-indigo-700">{(testType === 'pearson' ? stats.r : stats.spearmanRho).toFixed(3)}</span></div><div><h3 className="text-sm font-semibold text-slate-500 uppercase">Coefficient</h3><div className="text-4xl font-bold text-slate-800">{Math.abs(testType === 'pearson' ? stats.r : stats.spearmanRho) > 0.5 ? "Strong" : "Weak"}</div><p className="text-slate-500">Correlation</p></div></div>
                                <button onClick={handleAIAnalysis} disabled={aiAnalysis.isLoading} className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg flex gap-2 disabled:opacity-70"><Wand2 className="w-5 h-5" /> Analyze</button>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100"><h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Sample Size (n)</h4><div className="text-3xl font-medium text-slate-700">{stats.n}</div></div>
                            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100"><h4 className="text-xs font-bold text-slate-400 uppercase mb-3">P-Value</h4><div className="text-3xl font-medium text-slate-700">{stats.pValue < 0.0001 ? "< .0001" : stats.pValue.toFixed(4)}</div><div className={`text-sm mt-1 font-bold ${stats.pValue < 0.05 ? 'text-emerald-600' : 'text-amber-600'}`}>{stats.pValue < 0.05 ? 'Significant' : 'Not Sig.'}</div></div>
                            <div className="md:col-span-2 row-span-2"><CorrelationHeatmap stats={stats} labelX={labelX} labelY={labelY} testType={testType} /></div>
                            <div className="md:col-span-2 xl:col-span-4"><StatisticalTable mode={mode} testType={testType} stats={stats} labelX={labelX} labelY={labelY} /></div>
                        </div>
                    ) : (
                        <div className="h-64 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300"><Info className="w-10 h-10 mb-3 opacity-50" /><p className="text-lg font-medium">Enter data to see results</p></div>
                    )}
                </div>
            )}

            {mode === 'hybrid' && hybridResult && (
                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600"></div>
                        <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-indigo-900"><Box className="w-5 h-5 text-indigo-600" /> Macro-Analysis (Composite)</h2>
                        <div className="flex flex-col md:flex-row items-center gap-8 mb-8">
                            <div className="flex-1"><div className="text-sm text-slate-500 uppercase font-semibold mb-1">Global Construct</div><div className="text-2xl font-bold text-slate-900 mb-2">{hybridResult.composite.name}</div><div className="flex items-center gap-2 text-sm"><span className={`px-2 py-0.5 rounded font-bold ${hybridResult.composite.hypothesis.isSignificant ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{hybridResult.composite.hypothesis.decision}</span><span className="text-slate-400">vs {labelY}</span></div></div>
                            <div className="flex gap-4"><div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100 text-center min-w-[100px]"><div className="text-xs text-indigo-400 font-bold uppercase">Coefficient</div><div className="text-2xl font-bold text-indigo-700">{(testType === 'pearson' ? hybridResult.composite.stats.r : hybridResult.composite.stats.spearmanRho).toFixed(3)}</div></div><div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-center min-w-[100px]"><div className="text-xs text-slate-400 font-bold uppercase">P-Value</div><div className="text-2xl font-bold text-slate-700">{(testType === 'pearson' ? hybridResult.composite.stats.pValue : hybridResult.composite.stats.spearmanPValue).toFixed(3)}</div></div></div>
                            <button onClick={handleAIAnalysis} disabled={aiAnalysis.isLoading} className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg flex items-center gap-2 disabled:opacity-70"><Wand2 className="w-5 h-5" /> Analyze Strategy</button>
                        </div>
                        <div className="text-sm bg-slate-50 p-4 rounded-lg border border-slate-200 italic text-slate-600">"{hybridResult.composite.hypothesis.conclusion}"</div>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-700 px-2"><Layers className="w-5 h-5 text-slate-500" /> Micro-Analysis</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
                            {hybridResult.dimensions.map((dim) => {
                                const val = testType === 'pearson' ? dim.stats.r : dim.stats.spearmanRho;
                                const p = testType === 'pearson' ? dim.stats.pValue : dim.stats.spearmanPValue;
                                return (<div key={dim.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"><div className="flex justify-between items-start mb-4"><div className="font-bold text-slate-800">{dim.name}</div>{dim.hypothesis.isSignificant ? <div className="w-2 h-2 rounded-full bg-emerald-500"></div> : <div className="w-2 h-2 rounded-full bg-slate-300"></div>}</div><div className="flex items-end justify-between"><div><div className="text-xs text-slate-400 uppercase font-bold">Correlation</div><div className={`text-xl font-bold ${val > 0 ? 'text-indigo-600' : 'text-amber-600'}`}>{val.toFixed(3)}</div></div><div className="text-right"><div className="text-xs text-slate-400 uppercase font-bold">Sig.</div><div className="text-sm font-medium text-slate-600">p = {p.toFixed(3)}</div></div></div></div>)
                            })}
                        </div>
                        <StatisticalTable mode={mode} testType={testType} hybridResult={hybridResult} labelY={labelY} />
                    </div>
                </div>
            )}

            {mode === 'hybrid' && !hybridResult && <div className="h-64 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300"><Info className="w-10 h-10 mb-3 opacity-50" /><p className="text-lg font-medium">Enter dimensional data to run Hybrid Strategy</p></div>}
            
            {mode === 'simple' && hypothesis && stats && (
                <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200"><h2 className="text-lg font-semibold mb-6 flex items-center gap-2"><Scale className="w-5 h-5 text-indigo-500" /> Hypothesis Testing Report</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-8"><div className="bg-slate-50 p-6 rounded-lg border border-slate-200"><h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Formal Hypotheses</h3><div className="space-y-3 font-mono text-sm"><div className="flex items-center gap-3"><span className="bg-white border border-slate-200 px-2 py-1 rounded text-slate-600 font-bold">H₀</span><span className="text-slate-800">{hypothesis.nullHypothesis}</span></div><div className="flex items-center gap-3"><span className="bg-white border border-slate-200 px-2 py-1 rounded text-slate-600 font-bold">H₁</span><span className="text-slate-800">{hypothesis.altHypothesis}</span></div></div></div><div className={`p-6 rounded-lg border flex flex-col justify-center ${hypothesis.isSignificant ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}><h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${hypothesis.isSignificant ? 'text-emerald-600' : 'text-amber-600'}`}>Decision</h3><div className={`text-2xl font-bold mb-3 ${hypothesis.isSignificant ? 'text-emerald-700' : 'text-amber-700'}`}>{hypothesis.decision}</div><p className={`text-sm ${hypothesis.isSignificant ? 'text-emerald-800' : 'text-amber-800'}`}>{hypothesis.conclusion}</p></div></div></div>
            )}

            <div ref={aiSectionRef} className="bg-gradient-to-br from-indigo-50 to-purple-50 p-8 rounded-xl shadow-sm border border-indigo-100 relative overflow-hidden scroll-mt-24">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><Wand2 className="w-48 h-48 text-indigo-500" /></div>
                <div className="relative z-10"><div className="flex items-center justify-between mb-4"><h2 className="text-xl font-semibold flex items-center gap-2 text-indigo-900"><Wand2 className="w-6 h-6 text-indigo-600" /> AI Interpretation</h2></div>
                    {((mode === 'simple' && !stats) || (mode === 'hybrid' && !hybridResult)) ? <p className="text-slate-500 text-sm italic">Generate statistics first to enable AI analysis.</p> : aiAnalysis.isLoading ? <div className="flex flex-col items-center justify-center py-12 text-indigo-600 animate-pulse"><div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div><p className="text-base font-medium">Analyzing context...</p></div> : aiAnalysis.result ? <div className="prose prose-indigo bg-white/60 p-6 rounded-lg border border-indigo-100 max-w-none shadow-sm text-sm"><ReactMarkdown>{aiAnalysis.result}</ReactMarkdown></div> : <p className="text-slate-600 text-base max-w-2xl">Get a detailed interpretation of what this data means for your research.</p>}
                    {aiAnalysis.error && <p className="text-red-500 text-sm mt-2">{aiAnalysis.error}</p>}
                </div>
            </div>
        </div>
    </div>
  );
};

export default CorrelationView;
