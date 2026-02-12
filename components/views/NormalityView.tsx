import React, { useState, useRef, useMemo } from 'react';
import { ShieldCheck, Wand2, FileSpreadsheet, ChevronDown, CheckCircle2, AlertCircle, TrendingUp, Info, Copy, Check, Table as TableIcon, Activity } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { NormalityResult, AnalysisState, TableData } from '../../types';
import { calculateNormalityCheck } from '../../utils/statistics';
import { analyzeNormality } from '../../services/geminiService';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Scatter, ScatterChart, ReferenceLine } from 'recharts';
import DataModal from '../DataModal';
import CalculationTrace from '../CalculationTrace';

const NormalityView: React.FC = () => {
    const [tableData, setTableData] = useState<TableData>({
        columns: [
            { id: '1', name: 'Wait_Time', values: ['10', '12', '15', '45', '12', '14', '11', '13', '12', '8', '11', '12', '15', '60', '13'] },
            { id: '2', name: 'Exam_Scores', values: ['85', '88', '84', '86', '85', '87', '85', '84', '86', '85', '88', '84', '86', '85', '87'] }
        ],
        rowCount: 15
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedColId, setSelectedColId] = useState<string>('2'); 

    const [result, setResult] = useState<NormalityResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [aiAnalysis, setAiAnalysis] = useState<AnalysisState>({ isLoading: false, result: null, error: null });
    const aiSectionRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState<string | null>(null);

    const handleCalculate = () => {
        setError(null);
        setAiAnalysis({ isLoading: false, result: null, error: null });
        
        const col = tableData.columns.find(c => c.id === selectedColId);
        if (!col) return;

        const numeric = col.values.map(v => parseFloat(v)).filter(v => !isNaN(v));
        if (numeric.length < 5) {
            setError("Insufficient sample size. Minimum 5 observations required.");
            setResult(null);
            return;
        }

        const res = calculateNormalityCheck(numeric, col.name);
        if (!res) {
            setError("Analysis stopped. Data variance is zero.");
            setResult(null);
            return;
        }
        setResult(res);
    };

    const handleInterpretation = async () => {
        if (!result) return;
        setAiAnalysis({ isLoading: true, result: null, error: null });
        setTimeout(() => aiSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
        try {
            const analysis = await analyzeNormality(result);
            setAiAnalysis({ isLoading: false, result: analysis, error: null });
        } catch (e) {
            setAiAnalysis({ isLoading: false, result: null, error: "Synthesis failed." });
        }
    };

    const handleCopy = (key: string) => {
        const id = `norm-${key}`;
        const el = document.getElementById(id);
        if (!el) return;
        const range = document.createRange();
        range.selectNode(el);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
        try {
            document.execCommand('copy');
            setCopied(key);
            setTimeout(() => setCopied(null), 2000);
        } catch (err) {}
        window.getSelection()?.removeAllRanges();
    };

    const qqBounds = useMemo(() => {
        if (!result) return { min: 0, max: 100, padding: 5 };
        const allValues = result.qqPlotData.flatMap(p => [p.theoretical, p.observed]);
        const minVal = Math.min(...allValues);
        const maxVal = Math.max(...allValues);
        const range = maxVal - minVal;
        const padding = range * 0.15 || 1;
        return { min: minVal - padding, max: maxVal + padding };
    }, [result]);

    const seSkew = result ? Math.sqrt(6 / result.n) : 0;
    const seKurt = result ? Math.sqrt(24 / result.n) : 0;
    const tCrit = 1.96; 
    const seMean = result ? result.stdDev / Math.sqrt(result.n) : 0;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in fade-in duration-700 font-sans">
            {/* Sidebar Controls */}
            <div className="lg:col-span-4 xl:col-span-3">
                <div className="bg-zinc-900/40 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 sticky top-24 shadow-2xl">
                    <div className="mb-8">
                        <button 
                            onClick={() => setIsModalOpen(true)} 
                            className="w-full p-6 bg-black/40 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-3 group hover:border-white/40 hover:bg-white/5 transition-all duration-500"
                        >
                            <FileSpreadsheet className="w-8 h-8 text-zinc-700 group-hover:text-white transition-all duration-500" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 group-hover:text-white">Data Editor</span>
                        </button>
                    </div>

                    <div className="space-y-6">
                        <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] block">Select Variable</label>
                        <div className="relative">
                            <select 
                                value={selectedColId} 
                                onChange={e => setSelectedColId(e.target.value)} 
                                className="w-full pl-4 pr-10 py-3.5 bg-black/50 border border-white/10 rounded-2xl text-xs font-bold text-white appearance-none outline-none focus:ring-2 focus:ring-white/20 transition-all"
                            >
                                {tableData.columns.map(col => <option key={col.id} value={col.id}>{col.name}</option>)}
                            </select>
                            <ChevronDown className="w-4 h-4 text-zinc-600 absolute right-4 top-4 pointer-events-none" />
                        </div>
                        
                        <button 
                            onClick={handleCalculate} 
                            className="w-full py-4 bg-white hover:bg-zinc-200 text-black font-black uppercase tracking-[0.2em] rounded-2xl shadow-[0_10px_30px_rgba(255,255,255,0.1)] transition-all active:scale-95 flex items-center justify-center gap-3"
                        >
                            <ShieldCheck className="w-5 h-5" /> Calculate Normality
                        </button>
                    </div>

                    <div className="mt-8 p-6 bg-white/5 rounded-2xl border border-white/5 flex gap-4">
                         <Info className="w-4 h-4 text-zinc-500 shrink-0 mt-1" />
                         <p className="text-[10px] text-zinc-400 leading-relaxed font-medium uppercase tracking-wider">Normality verification validates the parametric power of subsequent inferential tests.</p>
                    </div>
                    {error && <div className="mt-4 p-4 bg-red-500/10 text-red-400 text-[10px] font-black uppercase tracking-widest rounded-2xl border border-red-500/20">{error}</div>}
                </div>
            </div>

            {/* Results Output */}
            <div className="lg:col-span-8 xl:col-span-9 space-y-10">
                {result ? (
                    <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-1000">
                        <div className="flex items-center gap-3 mb-2">
                            <Activity className="w-6 h-6 text-white" />
                            <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">Normality Summary <span className="text-zinc-600 font-light not-italic ml-4">| Assumption Testing</span></h2>
                        </div>

                        {/* Status Card */}
                        <div className={`p-10 rounded-[3rem] border-2 flex flex-col md:flex-row items-center gap-10 shadow-2xl relative overflow-hidden ${result.isNormal ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                            <div className={`w-32 h-32 rounded-[2rem] shrink-0 flex items-center justify-center shadow-2xl ${result.isNormal ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                {result.isNormal ? <CheckCircle2 className="w-16 h-16" /> : <AlertCircle className="w-16 h-16" />}
                            </div>
                            <div className="flex-1 space-y-4 z-10">
                                <h3 className={`text-3xl font-black tracking-tight ${result.isNormal ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {result.isNormal ? 'Normal Distribution Verified' : 'Normality Violation Detected'}
                                </h3>
                                <p className="text-sm font-medium text-zinc-400 leading-relaxed max-w-2xl italic">"{result.recommendation}"</p>
                                <button 
                                    onClick={handleInterpretation} 
                                    disabled={aiAnalysis.isLoading} 
                                    className="px-8 py-3 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-xl flex items-center gap-3 hover:bg-zinc-200 transition-all disabled:opacity-50"
                                >
                                    <Wand2 className="w-4 h-4" /> {aiAnalysis.isLoading ? 'Processing...' : 'Methodological Synthesis'}
                                </button>
                            </div>
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] translate-x-1/2 -translate-y-1/2"></div>
                        </div>

                        <CalculationTrace type="normality" data={result} />

                        {/* Visuals */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                            <div className="bg-black/40 p-8 rounded-[2.5rem] border border-white/5 space-y-8">
                                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] flex items-center gap-3">
                                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Frequency Distribution
                                </h4>
                                <div className="h-72 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={result.histogramData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                                            <XAxis dataKey="binLabel" tick={{fontSize: 9, fill: '#ffffff', fontWeight: 900}} axisLine={false} tickLine={false} />
                                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#ffffff', fontWeight: 900}} tickFormatter={(val) => Math.round(val).toString()} />
                                            <Tooltip 
                                                contentStyle={{backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '10px', fontWeight: 'bold', color: '#ffffff'}} 
                                                itemStyle={{color: '#ffffff'}}
                                            />
                                            <Bar dataKey="count" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" radius={[4, 4, 0, 0]} barSize={40} />
                                            <Line type="monotone" dataKey="normalValue" stroke="#6366f1" strokeWidth={3} dot={false} strokeDasharray="5 5" />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex items-center justify-center gap-8 text-[9px] font-black uppercase tracking-widest">
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-zinc-800 rounded border border-white/10"></div> <span className="text-zinc-400">Observed</span></div>
                                    <div className="flex items-center gap-2"><div className="w-5 h-0.5 bg-indigo-500"></div> <span className="text-indigo-400 italic">Gaussian Curve</span></div>
                                </div>
                            </div>

                            <div className="bg-black/40 p-8 rounded-[2.5rem] border border-white/5 space-y-8">
                                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] flex items-center gap-3">
                                    <span className="w-2 h-2 rounded-full bg-white"></span> Normal Q-Q Plot
                                </h4>
                                <div className="h-72 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                                            <XAxis 
                                                type="number" 
                                                dataKey="theoretical" 
                                                tick={{fontSize: 9, fill: '#ffffff', fontWeight: 900}} 
                                                domain={[qqBounds.min, qqBounds.max]}
                                                axisLine={{stroke: 'rgba(255,255,255,0.1)'}}
                                                tickFormatter={(val) => val.toFixed(2)}
                                                label={{ value: 'Theoretical Quantiles', position: 'bottom', fontSize: 9, fontWeight: 900, fill: '#ffffff', offset: 5 }} 
                                            />
                                            <YAxis 
                                                type="number" 
                                                dataKey="observed" 
                                                tick={{fontSize: 9, fill: '#ffffff', fontWeight: 900}} 
                                                domain={[qqBounds.min, qqBounds.max]}
                                                axisLine={{stroke: 'rgba(255,255,255,0.1)'}}
                                                tickFormatter={(val) => val.toFixed(2)}
                                                label={{ value: 'Sample Quantiles', angle: -90, position: 'insideLeft', fontSize: 9, fontWeight: 900, fill: '#ffffff', offset: 10 }} 
                                            />
                                            <Tooltip 
                                                cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.2)' }} 
                                                contentStyle={{backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff'}} 
                                                itemStyle={{color: '#ffffff'}}
                                                labelStyle={{color: '#ffffff'}}
                                                formatter={(value: number) => value.toFixed(4)}
                                            />
                                            <ReferenceLine 
                                                segment={[{ x: qqBounds.min, y: qqBounds.min }, { x: qqBounds.max, y: qqBounds.max }]} 
                                                stroke="rgba(255,255,255,0.1)" 
                                                strokeDasharray="10 10" 
                                            />
                                            <Scatter name="Observations" data={result.qqPlotData} fill="#ffffff" fillOpacity={0.5} className="drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]" />
                                        </ScatterChart>
                                    </ResponsiveContainer>
                                </div>
                                <p className="text-[9px] text-zinc-500 italic font-black uppercase tracking-[0.2em] text-center">Linear adherence confirms distributional symmetry.</p>
                            </div>
                        </div>

                        {/* Standard Tables */}
                        <div className="space-y-12">
                            <div className="bg-zinc-950 p-8 rounded-[2rem] border border-white/10 shadow-2xl text-white">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-xs font-black text-white uppercase tracking-[0.3em]">Descriptive Statistics</h3>
                                    <button onClick={() => handleCopy('desc')} className={`flex items-center gap-2 px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all border ${copied === 'desc' ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-500 border-white/10'}`}>
                                        {copied === 'desc' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                                <table id="norm-desc" className="w-full text-xs text-left border-collapse border border-white/10 font-sans text-white bg-black">
                                    <thead>
                                        <tr className="bg-zinc-900 font-black uppercase tracking-widest">
                                            <th colSpan={2} className="p-4 border border-white/10">Variable: {result.variableName}</th>
                                            <th className="p-4 text-center border border-white/10">Statistic</th>
                                            <th className="p-4 text-center border border-white/10">Std. Error</th>
                                        </tr>
                                    </thead>
                                    <tbody className="font-mono text-zinc-400">
                                        <tr>
                                            <td rowSpan={10} className="p-4 border border-white/10 font-black text-white bg-zinc-900/50 align-top uppercase tracking-widest">{result.variableName}</td>
                                            <td className="p-4 border border-white/10 text-white">Mean</td>
                                            <td className="p-4 text-center border border-white/10 text-white font-bold">{result.mean.toFixed(3)}</td>
                                            <td className="p-4 text-center border border-white/10">{seMean.toFixed(3)}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-4 border border-white/10 bg-white/5 text-zinc-500 italic">95% CI Lower Bound</td>
                                            <td className="p-4 text-center border border-white/10 text-zinc-500">{(result.mean - (tCrit * seMean)).toFixed(3)}</td>
                                            <td className="p-4 border border-white/10 bg-zinc-900/20"></td>
                                        </tr>
                                        <tr>
                                            <td className="p-4 border border-white/10 bg-white/5 text-zinc-500 italic">95% CI Upper Bound</td>
                                            <td className="p-4 text-center border border-white/10 text-zinc-500">{(result.mean + (tCrit * seMean)).toFixed(3)}</td>
                                            <td className="p-4 border border-white/10 bg-zinc-900/20"></td>
                                        </tr>
                                        <tr>
                                            <td className="p-4 border border-white/10 text-white">Std. Deviation</td>
                                            <td className="p-4 text-center border border-white/10 text-white">{result.stdDev.toFixed(3)}</td>
                                            <td className="p-4 border border-white/10"></td>
                                        </tr>
                                        <tr>
                                            <td className="p-4 border border-white/10">Variance</td>
                                            <td className="p-4 text-center border border-white/10">{ (result.stdDev**2).toFixed(3) }</td>
                                            <td className="p-4 border border-white/10"></td>
                                        </tr>
                                        <tr className="bg-white/5">
                                            <td className="p-4 border border-white/10 font-bold text-zinc-200">Skewness</td>
                                            <td className="p-4 text-center border border-white/10 text-white font-black">{result.skewness.toFixed(3)}</td>
                                            <td className="p-4 text-center border border-white/10">{seSkew.toFixed(3)}</td>
                                        </tr>
                                        <tr className="bg-white/5">
                                            <td className="p-4 border border-white/10 font-bold text-zinc-200">Kurtosis</td>
                                            <td className="p-4 text-center border border-white/10 text-white font-black">{result.kurtosis.toFixed(3)}</td>
                                            <td className="p-4 text-center border border-white/10">{seKurt.toFixed(3)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div className="bg-zinc-950 p-8 rounded-[2rem] border border-white/10 shadow-2xl">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-xs font-black text-white uppercase tracking-[0.3em]">Kolmogorov-Smirnov Test</h3>
                                </div>
                                <table id="norm-tests" className="w-full text-xs text-left border-collapse border border-white/10 font-sans text-white bg-black">
                                    <thead>
                                        <tr className="bg-zinc-900 font-black uppercase tracking-widest">
                                            <th rowSpan={2} className="p-4 border border-white/10">Variable</th>
                                            <th colSpan={3} className="p-4 text-center border border-white/10 uppercase tracking-[0.3em]">Kolmogorov-Smirnov Verification</th>
                                        </tr>
                                        <tr className="bg-zinc-900 font-black text-[9px] uppercase tracking-widest">
                                            <th className="p-3 text-center border border-white/10">D Statistic</th>
                                            <th className="p-3 text-center border border-white/10">df</th>
                                            <th className="p-3 text-center border border-white/10">Sig. (p)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="font-mono text-zinc-400">
                                        <tr>
                                            <td className="p-4 border border-white/10 font-black text-white uppercase">{result.variableName}</td>
                                            <td className="p-4 text-center border border-white/10">{result.ksStat.toFixed(4)}</td>
                                            <td className="p-4 text-center border border-white/10">{result.n}</td>
                                            <td className={`p-4 text-center border border-white/10 font-black ${result.pValue > 0.05 ? 'text-emerald-500' : 'text-rose-500'}`}>{result.pValue < 0.001 ? '.001' : result.pValue.toFixed(3)}</td>
                                        </tr>
                                    </tbody>
                                    <tfoot>
                                        <tr><td colSpan={4} className="p-4 text-[9px] text-zinc-600 italic border border-white/10 uppercase tracking-widest font-black">Lilliefors Significance Correction applied.</td></tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        {/* Interpretation Section */}
                        <div ref={aiSectionRef} className="scroll-mt-24">
                            {aiAnalysis.result && (
                                <div className="bg-white text-black p-12 rounded-[3rem] shadow-2xl relative overflow-hidden animate-in fade-in duration-1000 border border-zinc-200">
                                     <div className="relative z-10">
                                        <h3 className="text-2xl font-black text-black mb-10 flex items-center gap-4 uppercase italic tracking-tighter"><Wand2 className="w-8 h-8 text-zinc-400" /> Statistical Interpretation</h3>
                                        <div className="prose prose-zinc bg-black/5 p-10 rounded-[2rem] max-w-none text-base shadow-inner leading-relaxed text-black selection:bg-black/10 font-medium"><ReactMarkdown>{aiAnalysis.result}</ReactMarkdown></div>
                                     </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="h-[650px] bg-black/40 rounded-[3rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-zinc-700 p-12 text-center animate-in fade-in duration-1000">
                        <div className="w-24 h-24 bg-zinc-900 rounded-[2rem] shadow-2xl flex items-center justify-center mb-10 ring-1 ring-white/10 group hover:scale-110 transition-all duration-700">
                          <ShieldCheck className="w-12 h-12 text-zinc-700 group-hover:text-white transition-all" />
                        </div>
                        <h3 className="text-4xl font-black text-white mb-4 tracking-tighter uppercase italic">Ready for Diagnostic</h3>
                        <p className="max-w-md text-zinc-500 text-sm leading-relaxed mb-12 font-medium">Verify distributional normality to determine if parametric statistical procedures are appropriate.</p>
                        <div className="flex gap-6">
                          <button onClick={() => setIsModalOpen(true)} className="px-8 py-3.5 bg-zinc-900 border border-white/10 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl shadow-xl hover:bg-zinc-800 transition-all flex items-center gap-3">
                            <FileSpreadsheet className="w-4 h-4" /> 1. Input Dataset
                          </button>
                          <button onClick={handleCalculate} className="px-10 py-3.5 bg-white text-black font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl shadow-[0_10px_30px_rgba(255,255,255,0.15)] hover:bg-zinc-200 transition-all flex items-center gap-3">
                            <Activity className="w-4 h-4" /> 2. Run Test
                          </button>
                        </div>
                    </div>
                )}
            </div>

            <DataModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} data={tableData} onDataChange={setTableData} />
        </div>
    );
};

export default NormalityView;