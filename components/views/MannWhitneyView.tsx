
import React, { useState, useRef } from 'react';
import { Layers, Wand2, FileSpreadsheet, ChevronDown, Copy, Check, FileText, Info } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import CalculationTrace from '../CalculationTrace';
import DataModal from '../DataModal';
import { MannWhitneyResult, AnalysisState, TableData } from '../../types';
import { calculateMannWhitneyU } from '../../utils/statistics';
import { analyzeMannWhitneyU } from '../../services/geminiService';
// Added missing CartesianGrid import
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, Tooltip, Scatter, Rectangle, ErrorBar, Cell, CartesianGrid } from 'recharts';

const MannWhitneyView: React.FC = () => {
    const [tableData, setTableData] = useState<TableData>({
        columns: [
            { id: '1', name: 'Artists', values: ['1200', '1500', '1800', '2200', '1100', '45000', '1600'] },
            { id: '2', name: 'Accountants', values: ['2500', '2800', '2600', '2400', '2700', '2550', '2650'] }
        ],
        rowCount: 7
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedXId, setSelectedXId] = useState<string>('1');
    const [selectedYId, setSelectedYId] = useState<string>('2');
    
    const [result, setResult] = useState<MannWhitneyResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [aiAnalysis, setAiAnalysis] = useState<AnalysisState>({ isLoading: false, result: null, error: null });
    const aiSectionRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState<string | null>(null);

    const handleCalculate = () => {
        setError(null);
        setAiAnalysis({ isLoading: false, result: null, error: null });

        const col1 = tableData.columns.find(c => c.id === selectedXId);
        const col2 = tableData.columns.find(c => c.id === selectedYId);

        if (!col1 || !col2) {
            setError("Select two valid data columns.");
            return;
        }

        const data1 = col1.values.map(v => parseFloat(v)).filter(v => !isNaN(v));
        const data2 = col2.values.map(v => parseFloat(v)).filter(v => !isNaN(v));

        if (data1.length < 2 || data2.length < 2) {
            setError("Insufficient numeric data in groups.");
            return;
        }

        const res = calculateMannWhitneyU(data1, data2, col1.name, col2.name);
        if (!res) {
            setError("Calculation failed.");
            setResult(null);
            return;
        }
        setResult(res);
    };

    const handleAIAnalysis = async () => {
        if (!result) return;
        setAiAnalysis({ isLoading: true, result: null, error: null });
        setTimeout(() => aiSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
        try {
            const analysis = await analyzeMannWhitneyU(result);
            setAiAnalysis({ isLoading: false, result: analysis, error: null });
        } catch (e) {
            setAiAnalysis({ isLoading: false, result: null, error: "AI Error." });
        }
    };

    const handleCopy = (key: string) => {
        const id = `mw-${key}`;
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

    const generateAPAReport = () => {
        if (!result) return '';
        const sig = result.isSignificant ? "differed significantly" : "did not differ significantly";
        return `A Mann-Whitney U test was conducted to compare the distributions of ${result.group1.name} and ${result.group2.name}. The analysis revealed that the scores ${sig} between groups (U = ${result.uStat.toFixed(2)}, z = ${result.zStat.toFixed(2)}, p = ${result.pValue < .001 ? '.001' : result.pValue.toFixed(3)}). ${result.group1.name} (Median = ${result.group1.median.toFixed(2)}, Mean Rank = ${result.group1.meanRank.toFixed(2)}) was compared with ${result.group2.name} (Median = ${result.group2.median.toFixed(2)}, Mean Rank = ${result.group2.meanRank.toFixed(2)}). This robust approach was selected to mitigate the impact of potential outliers and non-normality in the data.`;
    };

    const boxPlotData = result ? [
        { 
            name: result.group1.name, 
            ...result.group1.boxPlot, 
            fill: '#475569',
            whiskerLow: result.group1.boxPlot.min,
            whiskerHigh: result.group1.boxPlot.max,
            errorLow: result.group1.boxPlot.median - result.group1.boxPlot.min,
            errorHigh: result.group1.boxPlot.max - result.group1.boxPlot.median
        },
        { 
            name: result.group2.name, 
            ...result.group2.boxPlot, 
            fill: '#64748b',
            whiskerLow: result.group2.boxPlot.min,
            whiskerHigh: result.group2.boxPlot.max,
            errorLow: result.group2.boxPlot.median - result.group2.boxPlot.min,
            errorHigh: result.group2.boxPlot.max - result.group2.boxPlot.median
        }
    ] : [];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
            <div className="lg:col-span-4 xl:col-span-3 space-y-6">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 sticky top-24">
                    <div className="mb-6">
                        <button onClick={() => setIsModalOpen(true)} className="w-full p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 group hover:border-slate-400 hover:bg-slate-50 transition-all">
                            <FileSpreadsheet className="w-8 h-8 text-slate-300 group-hover:text-slate-400 transition-colors" />
                            <span className="text-xs font-bold text-slate-500 group-hover:text-slate-600">Open Data Spreadsheet</span>
                        </button>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Group 1 Variable</label>
                            <div className="relative">
                                <select value={selectedXId} onChange={(e) => setSelectedXId(e.target.value)} className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 appearance-none outline-none">
                                    {tableData.columns.map(col => <option key={col.id} value={col.id}>{col.name}</option>)}
                                </select>
                                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Group 2 Variable</label>
                            <div className="relative">
                                <select value={selectedYId} onChange={(e) => setSelectedYId(e.target.value)} className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 appearance-none outline-none">
                                    {tableData.columns.map(col => <option key={col.id} value={col.id}>{col.name}</option>)}
                                </select>
                                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                            </div>
                        </div>
                        <button onClick={handleCalculate} className="w-full py-3 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg transition-all">Run Robust Comparison</button>
                        {error && <div className="mt-4 p-3 bg-amber-50 text-amber-600 text-[11px] font-medium rounded-lg border border-amber-100">{error}</div>}
                    </div>
                    <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="flex items-start gap-2">
                            <Info className="w-4 h-4 text-slate-400 mt-0.5" />
                            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Use this test if your data has outliers or is not normally distributed (the "non-parametric" alternative to a T-test).</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-8 xl:col-span-9 space-y-6">
                {result ? (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-2 mb-2"><Layers className="w-5 h-5 text-slate-600" /><h2 className="text-lg font-bold text-slate-800">Mann-Whitney U Output</h2></div>
                        <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-12">
                            <div className="flex items-center gap-10">
                                <div className="w-36 h-36 rounded-3xl bg-slate-700 flex flex-col items-center justify-center text-white shadow-2xl shadow-slate-200 border-4 border-slate-600">
                                    <span className="text-4xl font-black">{result.uStat.toFixed(1)}</span>
                                    <span className="text-[11px] font-bold opacity-80 uppercase tracking-widest mt-1">U Statistic</span>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Significance (p-value)</div>
                                    <div className="text-5xl font-black text-slate-800 leading-tight">{result.pValue < .001 ? '< .001' : result.pValue.toFixed(3)}</div>
                                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${result.isSignificant ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                                        {result.isSignificant ? 'Significant Difference' : 'No Significant Difference'}
                                    </div>
                                </div>
                            </div>
                            <button onClick={handleAIAnalysis} disabled={aiAnalysis.isLoading} className="px-8 py-5 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-xl shadow-slate-50 flex items-center gap-3 transition-all transform hover:scale-[1.02] disabled:opacity-70">
                                <Wand2 className="w-6 h-6" /> 
                                <span className="text-lg">{aiAnalysis.isLoading ? 'Processing...' : 'Analyze Data'}</span>
                            </button>
                        </div>

                        <CalculationTrace type="mannwhitney" data={result} />

                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Distribution Summary (Box Plot)</h3>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={boxPlotData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" tick={{fontSize: 10, fill: '#64748b', fontWeight: 700}} axisLine={false} tickLine={false} />
                                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} domain={['auto', 'auto']} />
                                        <Tooltip cursor={{strokeDasharray: '3 3'}} content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const d = payload[0].payload;
                                                return (
                                                    <div className="bg-slate-800 text-white text-[11px] p-4 rounded-xl shadow-2xl space-y-1 border border-white/10">
                                                        <p className="font-bold border-b border-white/10 pb-2 mb-2 text-slate-300">{d.name}</p>
                                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                                            <span className="text-slate-400">Max:</span><span className="font-mono">{d.max.toFixed(2)}</span>
                                                            <span className="text-slate-400">Q3:</span><span className="font-mono">{d.q3.toFixed(2)}</span>
                                                            <span className="text-emerald-400 font-bold">Median:</span><span className="text-emerald-400 font-bold font-mono">{d.median.toFixed(2)}</span>
                                                            <span className="text-slate-400">Q1:</span><span className="font-mono">{d.q1.toFixed(2)}</span>
                                                            <span className="text-slate-400">Min:</span><span className="font-mono">{d.min.toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }} />
                                        
                                        {/* Box (Rectangle) - Casting x to any to bypass string vs number type check for percentage strings */}
                                        <Scatter dataKey="median" fill="transparent">
                                            {boxPlotData.map((entry, index) => (
                                                <Rectangle key={`box-${index}`} x={(index === 0 ? '15%' : '65%') as any} y={entry.q3} width={50} height={entry.q3 - entry.q1} fill={entry.fill} fillOpacity={0.15} stroke={entry.fill} strokeWidth={2} />
                                            ))}
                                        </Scatter>

                                        {/* Whiskers & Median Line */}
                                        <Scatter dataKey="median">
                                            {boxPlotData.map((entry, index) => (
                                                <ErrorBar key={`whisker-${index}`} dataKey="median" width={10} strokeWidth={1.5} stroke={entry.fill} direction="y" />
                                            ))}
                                            {boxPlotData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Scatter>
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-4 text-[10px] text-center text-slate-400 italic font-medium">Visualization displays interquartile range (box) and full range (whiskers).</div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xs font-bold text-slate-900 uppercase">Ranks Statistics</h3>
                                <button onClick={() => handleCopy('ranks')} className={`p-1.5 rounded-md transition-all ${copied === 'ranks' ? 'bg-slate-50 text-slate-600' : 'text-slate-400 hover:bg-slate-100'}`}>
                                    {copied === 'ranks' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                            <table id="mw-ranks" className="w-full text-xs text-left border-collapse border border-slate-400 font-sans text-slate-900 bg-white">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-400">
                                        <th className="p-2 border border-slate-400">Variable</th>
                                        <th className="p-2 text-center border border-slate-400">N</th>
                                        <th className="p-2 text-center border border-slate-400">Median</th>
                                        <th className="p-2 text-center border border-slate-400">Mean Rank</th>
                                        <th className="p-2 text-center border border-slate-400">Sum of Ranks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="p-2 border border-slate-400 font-semibold">{result.group1.name}</td>
                                        <td className="p-2 text-center border border-slate-400">{result.group1.n}</td>
                                        <td className="p-2 text-center border border-slate-400 font-mono">{result.group1.median.toFixed(2)}</td>
                                        <td className="p-2 text-center border border-slate-400 font-mono">{result.group1.meanRank.toFixed(2)}</td>
                                        <td className="p-2 text-center border border-slate-400 font-mono">{result.group1.rankSum.toFixed(2)}</td>
                                    </tr>
                                    <tr className="bg-slate-50/50">
                                        <td className="p-2 border border-slate-400 font-semibold">{result.group2.name}</td>
                                        <td className="p-2 text-center border border-slate-400">{result.group2.n}</td>
                                        <td className="p-2 text-center border border-slate-400 font-mono">{result.group2.median.toFixed(2)}</td>
                                        <td className="p-2 text-center border border-slate-400 font-mono">{result.group2.meanRank.toFixed(2)}</td>
                                        <td className="p-2 text-center border border-slate-400 font-mono">{result.group2.rankSum.toFixed(2)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm">
                            <h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2"><FileText className="w-4 h-4" />APA Style Report</h4>
                            <p className="text-sm text-slate-700 leading-relaxed font-serif select-all">{generateAPAReport()}</p>
                        </div>

                        <div ref={aiSectionRef} className="scroll-mt-24">
                            {aiAnalysis.result && (
                                <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-8 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden animate-in fade-in duration-700">
                                     <div className="relative z-10">
                                        <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2"><Wand2 className="w-6 h-6" /> ROBUST INSIGHT REPORT</h3>
                                        <div className="prose prose-slate bg-white/70 p-8 rounded-xl max-w-none text-sm shadow-sm leading-relaxed"><ReactMarkdown>{aiAnalysis.result}</ReactMarkdown></div>
                                     </div>
                                </div>
                            )}
                         </div>
                    </div>
                ) : (
                    <div className="h-[600px] bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4"><Layers className="w-8 h-8 text-slate-200" /></div>
                        <h3 className="text-xl font-bold text-slate-600 mb-2">Mann-Whitney U Analysis</h3>
                        <p className="max-w-md text-center text-slate-500 text-sm">Compare two independent groups when your data violates normal distribution assumptions.</p>
                    </div>
                )}
            </div>
            <DataModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} data={tableData} onDataChange={setTableData} />
        </div>
    );
};

export default MannWhitneyView;
