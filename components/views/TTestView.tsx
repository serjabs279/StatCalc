import React, { useState, useRef } from 'react';
import { Activity, Wand2, FileSpreadsheet, ChevronDown, Copy, Check, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import CalculationTrace from '../CalculationTrace';
import DataModal from '../DataModal';
import { TTestResult, TTestType, AnalysisState, TableData } from '../../types';
import { calculateTTest } from '../../utils/statistics';
import { analyzeTTest } from '../../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ErrorBar } from 'recharts';

const TTestView: React.FC = () => {
    const [tableData, setTableData] = useState<TableData>({
        columns: [
            { id: '1', name: 'Method_A', values: ['85', '88', '75', '92', '80', '85', '89'] },
            { id: '2', name: 'Method_B', values: ['70', '72', '68', '75', '71', '74', '70'] }
        ],
        rowCount: 7
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedXId, setSelectedXId] = useState<string>('1');
    const [selectedYId, setSelectedYId] = useState<string>('2');
    const [testType, setTestType] = useState<TTestType>('independent');

    const [result, setResult] = useState<TTestResult | null>(null);
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
            setError("Select two valid columns.");
            return;
        }

        const data1 = col1.values.map(v => parseFloat(v)).filter(v => !isNaN(v));
        const data2 = col2.values.map(v => parseFloat(v)).filter(v => !isNaN(v));

        if (testType === 'paired' && data1.length !== data2.length) {
            setError("Paired samples must have the same number of observations.");
            return;
        }

        const tResult = calculateTTest(data1, data2, testType, col1.name, col2.name);
        if (!tResult) {
            setError("Calculation failed. Ensure enough numeric data and variability.");
            setResult(null);
            return;
        }
        setResult(tResult);
    };

    const handleInterpretation = async () => {
        if (!result) return;
        setAiAnalysis({ isLoading: true, result: null, error: null });
        setTimeout(() => aiSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
        try {
            const analysis = await analyzeTTest(result);
            setAiAnalysis({ isLoading: false, result: analysis, error: null });
        } catch (e) {
            setAiAnalysis({ isLoading: false, result: null, error: "System Error." });
        }
    };

    const handleCopy = (key: string) => {
        const id = `ttest-${key}`;
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
        const sig = result.isSignificant ? "was statistically significant" : "was not statistically significant";
        return `An ${result.type} t-test was conducted to compare scores in ${result.group1.name} and ${result.group2.name}. There ${sig} difference in the scores for ${result.group1.name} (M = ${result.group1.mean.toFixed(2)}, SD = ${result.group1.stdDev.toFixed(2)}) and ${result.group2.name} (M = ${result.group2.mean.toFixed(2)}, SD = ${result.group2.stdDev.toFixed(2)}); t(${result.df}) = ${result.tStat.toFixed(2)}, p = ${result.pValue < .001 ? '.001' : result.pValue.toFixed(3)}. The effect size, as measured by Cohen's d, was ${Math.abs(result.cohensD).toFixed(2)}.`;
    };

    const chartData = result ? [
        { name: result.group1.name, mean: result.group1.mean, error: result.group1.stdError },
        { name: result.group2.name, mean: result.group2.mean, error: result.group2.stdError }
    ] : [];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
            {/* Sidebar */}
            <div className="lg:col-span-4 xl:col-span-3 space-y-6">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 sticky top-24">
                    <div className="mb-6">
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="w-full p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 group hover:border-violet-300 hover:bg-violet-50/30 transition-all"
                        >
                            <FileSpreadsheet className="w-8 h-8 text-slate-300 group-hover:text-violet-400 transition-colors" />
                            <span className="text-xs font-bold text-slate-500 group-hover:text-violet-600">Open Data Spreadsheet</span>
                        </button>
                    </div>

                    <div className="bg-slate-100 p-1 rounded-xl flex border border-slate-200 mb-6">
                        <button onClick={() => setTestType('independent')} className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg flex justify-center items-center gap-2 transition-all ${testType === 'independent' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-400'}`}>Independent</button>
                        <button onClick={() => setTestType('paired')} className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg flex justify-center items-center gap-2 transition-all ${testType === 'paired' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-400'}`}>Paired</button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Variable 1 (Group A)</label>
                            <div className="relative">
                                <select value={selectedXId} onChange={(e) => setSelectedXId(e.target.value)} className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 appearance-none outline-none">
                                    {tableData.columns.map(col => <option key={col.id} value={col.id}>{col.name}</option>)}
                                </select>
                                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Variable 2 (Group B)</label>
                            <div className="relative">
                                <select value={selectedYId} onChange={(e) => setSelectedYId(e.target.value)} className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 appearance-none outline-none">
                                    {tableData.columns.map(col => <option key={col.id} value={col.id}>{col.name}</option>)}
                                </select>
                                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                            </div>
                        </div>

                        <button onClick={handleCalculate} className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-[11px] uppercase tracking-widest">Run T-Test</button>
                        {error && <div className="mt-4 p-3 bg-amber-50 text-amber-600 text-[11px] font-medium rounded-lg border border-amber-100">{error}</div>}
                    </div>
                </div>
            </div>

            {/* Results */}
            <div className="lg:col-span-8 xl:col-span-9 space-y-6">
                {result ? (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-2 mb-2">
                            <Activity className="w-5 h-5 text-violet-600" />
                            <h2 className="text-lg font-bold text-slate-800">T-Test Analysis Output <span className="text-slate-400 font-normal ml-2">| {result.type.charAt(0).toUpperCase() + result.type.slice(1)}</span></h2>
                        </div>

                        {/* Top Header */}
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-8">
                            <div className="flex items-center gap-8">
                                <div className="w-24 h-24 rounded-2xl bg-violet-600 flex flex-col items-center justify-center text-white shadow-xl shadow-violet-100">
                                    <span className="text-2xl font-bold">{result.tStat.toFixed(3)}</span>
                                    <span className="text-[10px] font-bold opacity-70 uppercase">T-Value</span>
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Significance (2-tailed)</div>
                                    <div className="text-4xl font-bold text-slate-800">{result.pValue < .001 ? '< .001' : result.pValue.toFixed(3)}</div>
                                    <div className={`text-xs font-bold mt-1 ${result.isSignificant ? 'text-violet-500' : 'text-amber-500'}`}>{result.isSignificant ? 'SIGNIFICANT DIFFERENCE' : 'NO SIGNIFICANT DIFFERENCE'}</div>
                                </div>
                            </div>
                            <button onClick={handleInterpretation} disabled={aiAnalysis.isLoading} className="px-8 py-4 bg-violet-600 text-white font-bold rounded-xl shadow-lg flex items-center gap-2 disabled:opacity-70 text-[11px] uppercase tracking-widest"><Wand2 className="w-5 h-5" /> {aiAnalysis.isLoading ? 'Processing...' : 'Methodological Analysis'}</button>
                        </div>

                        <CalculationTrace type="ttest" data={result} />

                        {/* Visualization */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Comparison of Group Means</h3>
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 700, fill: '#1e293b'}} axisLine={false} tickLine={false} />
                                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#1e293b'}} domain={['auto', 'auto']} />
                                            <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '11px', color: '#000'}} />
                                            <Bar dataKey="mean" radius={[4, 4, 0, 0]} barSize={60}>
                                                <Cell fill="#7c3aed" />
                                                <Cell fill="#8b5cf6" />
                                                <ErrorBar dataKey="error" width={4} strokeWidth={2} stroke="#334155" />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="mt-4 text-[10px] text-center text-slate-400 italic font-medium uppercase tracking-widest">Error bars represent Standard Error of Mean (SEM)</div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Effect Size (d)</div>
                                    <div className="text-3xl font-bold text-violet-700">{result.cohensD.toFixed(3)}</div>
                                    <div className="text-[10px] font-medium text-slate-400 mt-1">Cohen's d Interpretation</div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">95% CI of Difference</div>
                                    <div className="text-lg font-bold text-slate-700">[{result.ciLower.toFixed(2)}, {result.ciUpper.toFixed(2)}]</div>
                                    <div className="text-[10px] font-medium text-slate-400 mt-1">Confidence Interval</div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Deg. of Freedom</div>
                                    <div className="text-3xl font-bold text-slate-700">{result.df}</div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Mean Diff.</div>
                                    <div className="text-3xl font-bold text-slate-700">{result.meanDifference.toFixed(3)}</div>
                                </div>
                            </div>
                        </div>

                        {/* Detailed Table */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xs font-bold text-slate-900 uppercase">Group Statistics</h3>
                                <button onClick={() => handleCopy('stats')} className={`p-1.5 rounded-md transition-all ${copied === 'stats' ? 'bg-violet-50 text-violet-600' : 'text-slate-400 hover:bg-slate-100'}`}>
                                    {copied === 'stats' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                            <table id="ttest-stats" className="w-full text-xs text-left border-collapse border border-slate-400 font-sans text-slate-900 bg-white">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-400">
                                        <th className="p-2 border-r border-slate-400">Variable</th>
                                        <th className="p-2 text-center border-r border-slate-400">N</th>
                                        <th className="p-2 text-center border-r border-slate-400">Mean</th>
                                        <th className="p-2 text-center border-r border-slate-400">Std. Deviation</th>
                                        <th className="p-2 text-center">Std. Error Mean</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b border-slate-200">
                                        <td className="p-2 font-semibold border-r border-slate-400 bg-slate-50/50">{result.group1.name}</td>
                                        <td className="p-2 text-center border-r border-slate-400">{result.group1.n}</td>
                                        <td className="p-2 text-center border-r border-slate-400 font-mono">{result.group1.mean.toFixed(4)}</td>
                                        <td className="p-2 text-center border-r border-slate-400 font-mono">{result.group1.stdDev.toFixed(4)}</td>
                                        <td className="p-2 text-center font-mono">{result.group1.stdError.toFixed(4)}</td>
                                    </tr>
                                    <tr className="border-b border-slate-400">
                                        <td className="p-2 font-semibold border-r border-slate-400 bg-slate-50/50">{result.group2.name}</td>
                                        <td className="p-2 text-center border-r border-slate-400">{result.group2.n}</td>
                                        <td className="p-2 text-center border-r border-slate-400 font-mono">{result.group2.mean.toFixed(4)}</td>
                                        <td className="p-2 text-center border-r border-slate-400 font-mono">{result.group2.stdDev.toFixed(4)}</td>
                                        <td className="p-2 text-center font-mono">{result.group2.stdError.toFixed(4)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* APA Style Box */}
                        <div className="p-6 bg-violet-50/50 border border-violet-100 rounded-2xl shadow-sm">
                            <h4 className="text-sm font-semibold text-violet-900 mb-2 flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                APA Style Report & Interpretation
                            </h4>
                            <p className="text-sm text-black leading-relaxed font-serif select-all">
                                {generateAPAReport()}
                            </p>
                        </div>

                        {/* Interpretation Section */}
                        <div ref={aiSectionRef} className="scroll-mt-24">
                            {aiAnalysis.result && (
                                <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-200 relative overflow-hidden animate-in fade-in duration-700">
                                     <div className="relative z-10">
                                        <h3 className="text-xl font-bold text-black mb-6 flex items-center gap-2"><Wand2 className="w-6 h-6 text-zinc-400" /> Statistical Conclusion</h3>
                                        <div className="prose prose-zinc bg-zinc-50 p-8 rounded-2xl max-w-none text-sm text-black shadow-inner leading-relaxed font-medium"><ReactMarkdown>{aiAnalysis.result}</ReactMarkdown></div>
                                     </div>
                                </div>
                            )}
                         </div>
                    </div>
                ) : (
                    <div className="h-[600px] bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4"><Activity className="w-8 h-8 text-violet-200" /></div>
                        <h3 className="text-xl font-bold text-slate-600 mb-2">T-Test Analysis</h3>
                        <p className="max-w-md text-center text-slate-500 text-sm">Select two numeric variables to perform an Independent or Paired Samples T-test.</p>
                    </div>
                )}
            </div>

            <DataModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} data={tableData} onDataChange={setTableData} />
        </div>
    );
};

export default TTestView;