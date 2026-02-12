import React, { useState, useRef, useEffect } from 'react';
import { Box, Wand2, FileSpreadsheet, Activity, Copy, Check, FileText, Info, Layers } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import CalculationTrace from '../CalculationTrace';
import DataModal from '../DataModal';
import { KruskalWallisResult, AnalysisState, TableData } from '../../types';
import { calculateKruskalWallis } from '../../utils/statistics';
import { analyzeKruskalWallis } from '../../services/geminiService';
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, Tooltip, Scatter, Rectangle, ErrorBar, Cell, CartesianGrid } from 'recharts';

/**
 * KruskalWallisView Component
 * Performs non-parametric one-way analysis of variance (H-test)
 * comparing ranks across three or more independent groups.
 */
const KruskalWallisView: React.FC = () => {
    // Spreadsheet State
    const [tableData, setTableData] = useState<TableData>({
        columns: [
            { id: '1', name: 'Dept_A', values: ['5', '6', '5', '4', '7', '6', '15'] },
            { id: '2', name: 'Dept_B', values: ['8', '9', '8', '7', '9', '10', '9'] },
            { id: '3', name: 'Dept_C', values: ['12', '14', '11', '12', '13', '15', '14'] }
        ],
        rowCount: 7
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [mappedColumnIds, setMappedColumnIds] = useState<string[]>(['1', '2', '3']);

    const [result, setResult] = useState<KruskalWallisResult | null>(null);
    const [excludedCount, setExcludedCount] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);
    const [aiAnalysis, setAiAnalysis] = useState<AnalysisState>({ isLoading: false, result: null, error: null });
    const aiSectionRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState<string | null>(null);

    // Sync mapped IDs if columns are deleted in the spreadsheet to avoid orphaned states
    useEffect(() => {
        const existingIds = tableData.columns.map(c => c.id);
        setMappedColumnIds(prev => prev.filter(id => existingIds.includes(id)));
    }, [tableData.columns]);

    // Handle statistical calculation
    const handleCalculate = () => {
        setError(null);
        setAiAnalysis({ isLoading: false, result: null, error: null });

        let totalInvalid = 0;
        const groups = mappedColumnIds.map(id => {
            const col = tableData.columns.find(c => c.id === id);
            if (!col) return null;
            
            const rawValues = col.values || [];
            const parsed = rawValues.map(v => parseFloat(v)).filter(v => !isNaN(v));
            totalInvalid += (rawValues.filter(v => v.trim() !== "").length - parsed.length);
            
            return {
                name: col.name || `Var ${id}`,
                data: parsed
            };
        }).filter((g): g is { name: string; data: number[] } => g !== null && g.data.length > 0);

        if (groups.length < 3) {
            setError("Select at least 3 groups with numeric data for Kruskal-Wallis comparison.");
            setResult(null);
            return;
        }

        const res = calculateKruskalWallis(groups);
        if (!res) {
            setError("Calculation failed. Check your data distribution.");
            setResult(null);
            return;
        }
        setExcludedCount(totalInvalid);
        setResult(res);
    };

    // Handle AI insights generation
    const handleAIAnalysis = async () => {
        if (!result) return;
        setAiAnalysis({ isLoading: true, result: null, error: null });
        setTimeout(() => aiSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
        try {
            const analysis = await analyzeKruskalWallis(result);
            setAiAnalysis({ isLoading: false, result: analysis, error: null });
        } catch (e) {
            setAiAnalysis({ isLoading: false, result: null, error: "AI Error." });
        }
    };

    // Handle copying table data to clipboard
    const handleCopy = (key: string) => {
        const id = `kw-${key}`;
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

    // Generate formal APA-style report string
    const generateAPAReport = () => {
        if (!result) return '';
        const sig = result.isSignificant ? "differed significantly" : "did not differ significantly";
        return `A Kruskal-Wallis H test was conducted to determine if there were differences in scores between ${result.groups.length} groups. The scores ${sig} between groups, H(${result.df}) = ${result.hStat.toFixed(3)}, p = ${result.pValue < .001 ? '.001' : result.pValue.toFixed(3)}. Distributions were assessed via median comparisons and mean ranks.`;
    };

    // Prepare data for box plot visualization
    const boxPlotData = result ? result.groups.map((g, idx) => ({
        name: g.name, 
        ...g.boxPlot, 
        fill: idx % 2 === 0 ? '#4f46e5' : '#7c3aed',
        errorLow: g.boxPlot.median - g.boxPlot.min,
        errorHigh: g.boxPlot.max - g.boxPlot.median
    })) : [];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
            {/* Control Sidebar */}
            <div className="lg:col-span-4 xl:col-span-3 space-y-6">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 sticky top-24">
                    <div className="mb-6">
                        <button onClick={() => setIsModalOpen(true)} className="w-full p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 group hover:border-slate-400 transition-all">
                            <FileSpreadsheet className="w-8 h-8 text-slate-300 transition-colors" />
                            <span className="text-xs font-bold text-slate-500">Open Data Spreadsheet</span>
                        </button>
                    </div>
                    <div className="space-y-4">
                         <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Select Comparison Groups</label>
                         <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                            {tableData.columns.map(col => (
                                <button key={col.id} onClick={() => setMappedColumnIds(prev => prev.includes(col.id) ? prev.filter(i => i !== col.id) : [...prev, col.id])} 
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-[11px] font-bold transition-all ${mappedColumnIds.includes(col.id) ? 'bg-slate-100 border-indigo-200 text-indigo-700' : 'bg-white border-slate-100 text-slate-300 hover:border-slate-200'}`}>
                                    <span className="truncate pr-2">{col.name}</span>
                                    {mappedColumnIds.includes(col.id) && <Activity className="w-3 h-3 text-indigo-500 shrink-0" />}
                                </button>
                            ))}
                         </div>
                        <button onClick={handleCalculate} className="w-full py-3 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg transition-all">Run Kruskal-Wallis</button>
                        {error && <div className="mt-4 p-3 bg-amber-50 text-amber-600 text-[11px] font-medium rounded-lg">{error}</div>}
                    </div>
                    <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="flex items-start gap-2">
                            <Info className="w-4 h-4 text-slate-400 mt-0.5" />
                            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Use this as a robust alternative to ANOVA when your data is skewed or contains outliers.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Results Panel */}
            <div className="lg:col-span-8 xl:col-span-9 space-y-6">
                {result ? (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 text-slate-900">
                        <div className="flex items-center gap-2 mb-2"><Box className="w-5 h-5 text-slate-600" /><h2 className="text-lg font-bold text-slate-800">Kruskal-Wallis Result Output</h2></div>
                        
                        {/* Summary Header */}
                        <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-12">
                            <div className="flex items-center gap-10">
                                <div className="w-36 h-36 rounded-3xl bg-slate-700 flex flex-col items-center justify-center text-white shadow-2xl shadow-slate-200 border-4 border-slate-600">
                                    <span className="text-4xl font-black">{result.hStat.toFixed(1)}</span>
                                    <span className="text-[11px] font-bold opacity-80 uppercase tracking-widest mt-1">H Statistic</span>
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

                        <CalculationTrace type="kruskalwallis" data={result} />

                        {/* Ranks Statistics Table - WITH EXPLICIT STYLING TO PREVENT BLANK VISIBILITY */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xs font-bold text-slate-900 uppercase">Ranks Statistics</h3>
                                <button onClick={() => handleCopy('ranks')} className={`p-1.5 rounded-md transition-all ${copied === 'ranks' ? 'bg-slate-50 text-slate-600' : 'text-slate-400 hover:bg-slate-100'}`}>
                                    {copied === 'ranks' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                            <table id="kw-ranks" className="w-full text-xs text-left border-collapse border border-slate-400 font-sans text-slate-900 bg-white">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-400">
                                        <th className="p-2 border border-slate-400 font-bold text-slate-800">Variable Group</th>
                                        <th className="p-2 text-center border border-slate-400 font-bold text-slate-800">N</th>
                                        <th className="p-2 text-center border border-slate-400 font-bold text-slate-800">Median</th>
                                        <th className="p-2 text-center border border-slate-400 font-bold text-slate-800">Mean Rank</th>
                                        <th className="p-2 text-center border border-slate-400 font-bold text-slate-800">Sum of Ranks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.groups.map((g, idx) => (
                                        <tr key={`${g.name}-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                            <td className="p-2 border border-slate-400 font-bold text-slate-900">{g.name}</td>
                                            <td className="p-2 text-center border border-slate-400 text-slate-900">{g.n}</td>
                                            <td className="p-2 text-center border border-slate-400 font-mono font-bold text-slate-900">{g.median.toFixed(2)}</td>
                                            <td className="p-2 text-center border border-slate-400 font-mono text-slate-900">{g.meanRank.toFixed(2)}</td>
                                            <td className="p-2 text-center border border-slate-400 font-mono text-slate-900">{g.rankSum.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {result.groups.length === 0 && (
                                <div className="p-4 text-center text-slate-400 italic">No groups found in results.</div>
                            )}
                        </div>

                        {/* Distribution Visualization */}
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Group Distribution Comparison (Box Plot)</h3>
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
                                        
                                        <Scatter dataKey="median" fill="transparent">
                                            {boxPlotData.map((entry, index) => {
                                                const count = boxPlotData.length;
                                                const percentage = `${(index + 0.5) * (100 / count)}%`;
                                                return (
                                                    <Rectangle key={`box-${index}`} x={percentage as any} y={entry.q3} width={40} height={Math.max(1, entry.q3 - entry.q1)} fill={entry.fill} fillOpacity={0.15} stroke={entry.fill} strokeWidth={2} />
                                                );
                                            })}
                                        </Scatter>

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
                        </div>

                        {/* Formal APA Style Box */}
                        <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm">
                            <h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2"><FileText className="w-4 h-4" />APA Style Report</h4>
                            <p className="text-sm text-slate-700 leading-relaxed font-serif select-all">{generateAPAReport()}</p>
                        </div>

                        {/* AI Analysis Result */}
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
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4"><Box className="w-8 h-8 text-slate-200" /></div>
                        <h3 className="text-xl font-bold text-slate-600 mb-2">Kruskal-Wallis H Analysis</h3>
                        <p className="max-w-md text-center text-slate-500 text-sm">Compare 3 or more independent groups when your data violates normal distribution assumptions.</p>
                    </div>
                )}
            </div>

            <DataModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} data={tableData} onDataChange={setTableData} />
        </div>
    );
};

export default KruskalWallisView;
