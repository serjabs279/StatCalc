import React, { useState, useRef } from 'react';
import { Wand2, Info, AlertCircle, BarChart2, PieChart, Sigma, Activity, FileSpreadsheet, ChevronDown, Copy, Check, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { DescriptiveResult, AnalysisState, DescriptiveType, TableData } from '../../types';
import { calculateDescriptives } from '../../utils/statistics';
import { analyzeDescriptives } from '../../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import DataModal from '../DataModal';
import CalculationTrace from '../CalculationTrace';

const DescriptiveView: React.FC = () => {
    // Spreadsheet State
    const [tableData, setTableData] = useState<TableData>({
        columns: [
            { id: '1', name: 'Age', values: ['23', '45', '34', '56', '45', '67', '45', '34', '23', '89', '45', '56', '67'] },
            { id: '2', name: 'Gender', values: ['Male', 'Female', 'Male', 'Male', 'Female', 'Non-Binary', 'Female', 'Male', 'Female', 'Female'] }
        ],
        rowCount: 13
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedColId, setSelectedColId] = useState<string>('1');

    const [inputType, setInputType] = useState<DescriptiveType>('continuous');
    const [result, setResult] = useState<DescriptiveResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [aiAnalysis, setAiAnalysis] = useState<AnalysisState>({ isLoading: false, result: null, error: null });
    const aiSectionRef = useRef<HTMLDivElement>(null);
    const tableRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState(false);

    const handleCalculate = () => {
        setError(null);
        setAiAnalysis({ isLoading: false, result: null, error: null });
        
        const col = tableData.columns.find(c => c.id === selectedColId);
        if (!col) return;

        if (inputType === 'continuous') {
            const numeric = col.values.map(v => parseFloat(v)).filter(v => !isNaN(v));
            if (numeric.length === 0) {
                setError("The selected column contains no numeric data.");
                setResult(null);
                return;
            }
            setResult(calculateDescriptives(numeric, [], 'continuous'));
        } else {
            const strings = col.values.filter(v => v.trim().length > 0);
            if (strings.length === 0) {
                setError("The selected column contains no data.");
                setResult(null);
                return;
            }
            setResult(calculateDescriptives([], strings, 'categorical'));
        }
    };

    const handleAIAnalysis = async () => {
        if (!result) return;
        setAiAnalysis({ isLoading: true, result: null, error: null });
        setTimeout(() => aiSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
        try {
            const name = tableData.columns.find(c => c.id === selectedColId)?.name || "Variable";
            const analysis = await analyzeDescriptives(result, name);
            setAiAnalysis({ isLoading: false, result: analysis, error: null });
        } catch (e) {
            setAiAnalysis({ isLoading: false, result: null, error: "Analysis failed." });
        }
    };

    const handleCopyTable = () => {
        if (!tableRef.current) return;
        const range = document.createRange();
        range.selectNode(tableRef.current);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
        try {
            document.execCommand('copy');
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) { console.error(err); }
        window.getSelection()?.removeAllRanges();
    };

    const generateAPAReport = () => {
        if (!result) return '';
        const name = variableName;
        if (result.type === 'continuous') {
            const shape = Math.abs(result.skewness || 0) > 1 ? "demonstrated significant skewness" : "appeared approximately normal";
            return `A descriptive analysis was conducted for the variable ${name} (N = ${result.n}). The distribution yielded a mean of ${result.mean?.toFixed(2)} (SD = ${result.stdDev?.toFixed(2)}), with scores ranging from ${result.min} to ${result.max}. The distribution ${shape} (Skewness = ${result.skewness?.toFixed(2)}, Kurtosis = ${result.kurtosis?.toFixed(2)}), suggesting that central tendency is ${Math.abs(result.skewness || 0) > 1 ? 'better represented by the median' : 'adequately represented by the mean'}.`;
        } else {
            const top = result.frequencies?.[0];
            return `An analysis of frequencies for the categorical variable ${name} (N = ${result.n}) was performed. The results indicated that the most frequent category was "${top?.value}" (n = ${top?.count}), which accounted for ${top?.percentage.toFixed(1)}% of the total sample. The remaining ${result.frequencies!.length - 1} categories constituted the balance of the distribution.`;
        }
    };

    const variableName = tableData.columns.find(c => c.id === selectedColId)?.name || "Variable";

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 animate-in fade-in duration-500">
            {/* Sidebar */}
            <div className="md:col-span-4 xl:col-span-3 space-y-6">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 sticky top-24">
                    <div className="mb-6">
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="w-full p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 group hover:border-pink-300 hover:bg-pink-50/30 transition-all"
                        >
                            <FileSpreadsheet className="w-8 h-8 text-slate-300 group-hover:text-pink-400 transition-colors" />
                            <span className="text-xs font-bold text-slate-500 group-hover:text-pink-600">Open Data Spreadsheet</span>
                        </button>
                    </div>

                    <div className="bg-slate-100 p-1 rounded-xl flex border border-slate-200 mb-6">
                        <button onClick={() => setInputType('continuous')} className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg flex justify-center items-center gap-2 transition-all ${inputType === 'continuous' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Scale</button>
                        <button onClick={() => setInputType('categorical')} className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg flex justify-center items-center gap-2 transition-all ${inputType === 'categorical' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-400'}`}>Nominal</button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Variable to Analyze</label>
                            <div className="relative">
                                <select 
                                    value={selectedColId} 
                                    onChange={(e) => setSelectedColId(e.target.value)} 
                                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 appearance-none outline-none"
                                >
                                    {tableData.columns.map(col => <option key={col.id} value={col.id}>{col.name}</option>)}
                                </select>
                                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                            </div>
                        </div>

                        <button onClick={handleCalculate} className={`w-full py-3 text-white font-bold rounded-xl shadow-lg transition-all ${inputType === 'continuous' ? 'bg-indigo-600 shadow-indigo-100' : 'bg-pink-600 shadow-pink-100'}`}>Generate Stats</button>
                    </div>
                    {error && <div className="mt-4 p-3 bg-amber-50 text-amber-600 text-[11px] font-medium rounded-lg border border-amber-100">{error}</div>}
                </div>
            </div>

            {/* Results */}
            <div className="md:col-span-8 xl:col-span-9 space-y-6">
                {result ? (
                    <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                            {inputType === 'continuous' ? <Sigma className="w-5 h-5 text-indigo-600" /> : <BarChart2 className="w-5 h-5 text-pink-600" />}
                            <h2 className="text-lg font-bold text-slate-800">Descriptive Summary <span className="text-slate-400 font-normal ml-2">| {variableName}</span></h2>
                        </div>

                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-8">
                            <div className="flex items-center gap-8">
                                <div className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center text-white ${inputType === 'continuous' ? 'bg-indigo-600' : 'bg-pink-600'} shadow-lg`}>
                                    <span className="text-2xl font-bold">{result.n}</span>
                                    <span className="text-[10px] font-bold opacity-70 uppercase">Cases</span>
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Central Tendency</div>
                                    <div className="text-4xl font-bold text-slate-800">{inputType === 'continuous' ? `M = ${result.mean?.toFixed(2)}` : `Top: ${result.frequencies?.[0].value}`}</div>
                                </div>
                            </div>
                            <button onClick={handleAIAnalysis} disabled={aiAnalysis.isLoading} className={`px-8 py-4 text-white font-bold rounded-xl shadow-lg flex items-center gap-2 disabled:opacity-70 ${inputType === 'continuous' ? 'bg-indigo-600' : 'bg-pink-600'}`}><Wand2 className="w-5 h-5" /> {aiAnalysis.isLoading ? 'Processing...' : 'Analyze'}</button>
                        </div>

                        {inputType === 'continuous' && <CalculationTrace type="descriptive" data={result} />}

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xs font-bold text-slate-900 uppercase">
                                    Table 1. <span className="italic font-normal">Descriptive Statistics for {variableName}</span>
                                </h3>
                                <button
                                    onClick={handleCopyTable}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${copied ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                >
                                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                    {copied ? 'Copied' : 'Copy Table'}
                                </button>
                            </div>

                            <div ref={tableRef} className="overflow-x-auto">
                                <table className="w-full text-xs text-left border-collapse font-sans text-slate-900 bg-white">
                                    <thead className="bg-slate-50">
                                        {inputType === 'continuous' ? (
                                            <tr className="border-t-2 border-b-2 border-slate-600">
                                                <th className="p-2 border-r border-slate-200">Variable</th>
                                                <th className="p-2 text-center border-r border-slate-200">N</th>
                                                <th className="p-2 text-center border-r border-slate-200">Minimum</th>
                                                <th className="p-2 text-center border-r border-slate-200">Maximum</th>
                                                <th className="p-2 text-center border-r border-slate-200">Mean</th>
                                                <th className="p-2 text-center border-r border-slate-200">Std. Deviation</th>
                                                <th title="A measure of asymmetry. Positive means a long tail to the right; negative means a long tail to the left." className="p-2 text-center border-r border-slate-200 cursor-help underline decoration-dotted decoration-slate-300">Skewness</th>
                                                <th title="A measure of 'tailedness.' High values mean heavy tails and a sharp peak; low values mean light tails and a flat top." className="p-2 text-center cursor-help underline decoration-dotted decoration-slate-300">Kurtosis</th>
                                            </tr>
                                        ) : (
                                            <tr className="border-t-2 border-b-2 border-slate-600">
                                                <th className="p-2 border-r border-slate-200">{variableName}</th>
                                                <th className="p-2 text-center border-r border-slate-200">Frequency</th>
                                                <th className="p-2 text-center border-r border-slate-200">Percent</th>
                                                <th className="p-2 text-center border-r border-slate-200">Valid Percent</th>
                                                <th className="p-2 text-center">Cumulative Percent</th>
                                            </tr>
                                        )}
                                    </thead>
                                    <tbody>
                                        {inputType === 'continuous' ? (
                                            <tr className="border-b border-slate-600">
                                                <td className="p-2 font-medium border-r border-slate-200">{variableName}</td>
                                                <td className="p-2 text-center border-r border-slate-200 font-mono">{result.n}</td>
                                                <td className="p-2 text-center border-r border-slate-200 font-mono">{result.min}</td>
                                                <td className="p-2 text-center border-r border-slate-200 font-mono">{result.max}</td>
                                                <td className="p-2 text-center border-r border-slate-200 font-mono">{result.mean?.toFixed(3)}</td>
                                                <td className="p-2 text-center border-r border-slate-200 font-mono">{result.stdDev?.toFixed(3)}</td>
                                                <td className="p-2 text-center border-r border-slate-200 font-mono">{result.skewness?.toFixed(3)}</td>
                                                <td className="p-2 text-center font-mono">{result.kurtosis?.toFixed(3)}</td>
                                            </tr>
                                        ) : (
                                            <>
                                                {result.frequencies?.map((f, i) => (
                                                    <tr key={i} className="border-b border-slate-100">
                                                        <td className="p-2 border-r border-slate-200">{f.value}</td>
                                                        <td className="p-2 text-center border-r border-slate-200 font-mono">{f.count}</td>
                                                        <td className="p-2 text-center border-r border-slate-200 font-mono">{f.percentage.toFixed(1)}%</td>
                                                        <td className="p-2 text-center border-r border-slate-200 font-mono">{f.percentage.toFixed(1)}%</td>
                                                        <td className="p-2 text-center font-mono">{f.cumulativePercentage.toFixed(1)}%</td>
                                                    </tr>
                                                ))}
                                                <tr className="border-t border-slate-600 border-b border-slate-600 bg-slate-50 font-bold">
                                                    <td className="p-2 border-r border-slate-200">Total</td>
                                                    <td className="p-2 text-center border-r border-slate-200 font-mono">{result.n}</td>
                                                    <td className="p-2 text-center border-r border-slate-200 font-mono">100.0%</td>
                                                    <td className="p-2 text-center border-r border-slate-200 font-mono">100.0%</td>
                                                    <td className="p-2 text-center"></td>
                                                </tr>
                                            </>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="p-6 bg-indigo-50/50 border border-indigo-100 rounded-2xl shadow-sm">
                            <h4 className="text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                APA Style Report & Interpretation
                            </h4>
                            <p className="text-sm text-slate-700 leading-relaxed font-serif select-all">
                                {generateAPAReport()}
                            </p>
                        </div>

                        {inputType === 'categorical' && result.frequencies && (
                             <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Visual Frequency Distribution</h3>
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={result.frequencies.slice(0, 10)}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="value" tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} axisLine={false} tickLine={false} />
                                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
                                            <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '11px'}} />
                                            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                                {result.frequencies.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#db2777' : '#f472b6'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                             </div>
                        )}

                        <div ref={aiSectionRef} className="scroll-mt-24">
                            {aiAnalysis.result && (
                                <div className={`p-8 rounded-2xl shadow-sm border relative overflow-hidden animate-in fade-in duration-700 ${inputType === 'continuous' ? 'bg-indigo-50 border-indigo-100' : 'bg-pink-50 border-pink-100'}`}>
                                     <div className="relative z-10">
                                        <h3 className={`text-xl font-bold mb-6 flex items-center gap-2 ${inputType === 'continuous' ? 'text-indigo-900' : 'text-pink-900'}`}><Wand2 className="w-6 h-6" /> AI-POWERED ANALYSIS</h3>
                                        <div className="prose bg-white/70 p-8 rounded-xl max-w-none text-sm shadow-sm leading-relaxed"><ReactMarkdown>{aiAnalysis.result}</ReactMarkdown></div>
                                     </div>
                                </div>
                            )}
                         </div>
                    </div>
                ) : (
                    <div className="h-[600px] bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4"><Sigma className="w-8 h-8 text-indigo-200" /></div>
                        <h3 className="text-xl font-bold text-slate-600 mb-2">Descriptive Ready</h3>
                        <p className="max-w-md text-center text-slate-500 text-sm">Open the spreadsheet and pick a column to generate professional descriptive statistics and distributions.</p>
                    </div>
                )}
            </div>

            <DataModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} data={tableData} onDataChange={setTableData} />
        </div>
    );
};

export default DescriptiveView;