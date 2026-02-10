
import React, { useState, useRef } from 'react';
import {  Wand2, Info, AlertCircle, FileText, BarChart2, PieChart, Sigma, Plus, Trash2, List, Grid, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { DescriptiveResult, AnalysisState, DescriptiveType } from '../../types';
import { calculateDescriptives, parseInputData, parseRawCategoricalData, calculateDescriptivesFromSummary } from '../../utils/statistics';
import { analyzeDescriptives } from '../../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface SummaryInput {
    id: string;
    category: string;
    count: string;
}

const DescriptiveView: React.FC = () => {
    const [inputType, setInputType] = useState<DescriptiveType>('continuous');
    const [categoricalMode, setCategoricalMode] = useState<'raw' | 'summary'>('raw');
    
    // Raw inputs
    const [inputData, setInputData] = useState<string>("");
    
    // Summary inputs
    const [summaryInputs, setSummaryInputs] = useState<SummaryInput[]>([
        { id: '1', category: 'Category 1', count: '' },
        { id: '2', category: 'Category 2', count: '' }
    ]);

    const [variableName, setVariableName] = useState<string>("Variable 1");
    const [result, setResult] = useState<DescriptiveResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [aiAnalysis, setAiAnalysis] = useState<AnalysisState>({ isLoading: false, result: null, error: null });
    const aiSectionRef = useRef<HTMLDivElement>(null);

    // Copy functionality
    const [copied, setCopied] = useState(false);
    const tableRef = useRef<HTMLDivElement>(null);

    const handleCopy = () => {
        if (!tableRef.current) return;
        const range = document.createRange();
        range.selectNode(tableRef.current);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        window.getSelection()?.removeAllRanges();
    };

    // Summary Input Helpers
    const addCategory = () => setSummaryInputs(prev => [...prev, { id: Date.now().toString(), category: '', count: '' }]);
    const removeCategory = (id: string) => setSummaryInputs(prev => prev.filter(item => item.id !== id));
    const updateCategory = (id: string, field: 'category' | 'count', value: string) => {
        setSummaryInputs(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const handleCalculate = () => {
        setError(null);
        setAiAnalysis({ isLoading: false, result: null, error: null });
        setCopied(false);
        
        let parsed: any[] = [];
        if (inputType === 'continuous') {
            parsed = parseInputData(inputData);
            if (parsed.length === 0) {
                setError("Please enter valid numerical data.");
                setResult(null);
                return;
            }
            setResult(calculateDescriptives(parsed, [], 'continuous'));
        } else {
            if (categoricalMode === 'raw') {
                const raw = parseRawCategoricalData(inputData);
                if (raw.length === 0) {
                    setError("Please enter data.");
                    setResult(null);
                    return;
                }
                setResult(calculateDescriptives([], raw, 'categorical'));
            } else {
                // Summary Mode
                const validSummary = summaryInputs
                    .filter(s => s.category.trim() !== '' && s.count.trim() !== '')
                    .map(s => ({ category: s.category, count: parseInt(s.count) }));
                
                if (validSummary.length === 0 || validSummary.some(s => isNaN(s.count))) {
                    setError("Please enter valid categories and numeric counts.");
                    setResult(null);
                    return;
                }
                setResult(calculateDescriptivesFromSummary(validSummary));
            }
        }
    };

    const handleAIAnalysis = async () => {
        if (!result) return;
        setAiAnalysis({ isLoading: true, result: null, error: null });
        setTimeout(() => aiSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
        try {
            const analysis = await analyzeDescriptives(result, variableName);
            setAiAnalysis({ isLoading: false, result: analysis, error: null });
        } catch (e) {
            setAiAnalysis({ isLoading: false, result: null, error: "Failed to generate AI analysis." });
        }
    };

    const generateAPA = () => {
        if (!result) return "";
        
        if (inputType === 'continuous') {
             return `Descriptive statistics were calculated for ${variableName}. The sample (N = ${result.n}) had a mean of ${result.mean?.toFixed(2)} (SD = ${result.stdDev?.toFixed(2)}). The scores ranged from ${result.min} to ${result.max}, with a skewness of ${result.skewness?.toFixed(2)} and kurtosis of ${result.kurtosis?.toFixed(2)}.`;
        } else {
             if (!result.frequencies || result.frequencies.length === 0) return "";
             const top = result.frequencies[0];
             const bottom = result.frequencies[result.frequencies.length - 1];
             const categoriesText = result.frequencies.map(f => `${f.value} (n=${f.count}, ${f.percentage.toFixed(1)}%)`).join(', ');
             
             // If short list, show all
             if (result.frequencies.length <= 4) {
                 return `The frequency distribution for ${variableName} (N = ${result.n}) revealed the following breakdown: ${categoriesText}.`;
             }
             // If long list, summarize top and bottom
             return `The frequency distribution for ${variableName} was analyzed (N = ${result.n}). The most prevalent category was "${top.value}" (n = ${top.count}, ${top.percentage.toFixed(1)}%), whereas "${bottom.value}" was the least frequent (n = ${bottom.count}, ${bottom.percentage.toFixed(1)}%).`;
        }
    };

    const loadExample = () => {
        setResult(null);
        if (inputType === 'continuous') {
            setInputData("23, 45, 34, 56, 45, 67, 45, 34, 23, 89, 45, 56, 67");
            setVariableName("Age");
        } else {
            if (categoricalMode === 'raw') {
                setInputData("Male, Female, Male, Male, Female, Non-Binary, Female, Male, Female, Female");
                setVariableName("Gender");
            } else {
                setSummaryInputs([
                    { id: '1', category: 'Male', count: '45' },
                    { id: '2', category: 'Female', count: '55' },
                    { id: '3', category: 'Non-Binary', count: '5' }
                ]);
                setVariableName("Gender Distribution");
            }
        }
        setTimeout(() => document.getElementById('run-desc')?.click(), 100);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
            {/* INPUT COL */}
            <div className="lg:col-span-4 xl:col-span-3 space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar">
                    <div className="bg-slate-100 p-1 rounded-lg flex border border-slate-200 mb-6">
                        <button onClick={() => setInputType('continuous')} className={`flex-1 py-1.5 text-xs font-medium rounded-md flex justify-center items-center gap-2 transition-all ${inputType === 'continuous' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}><Sigma className="w-3 h-3" /> Scale</button>
                        <button onClick={() => setInputType('categorical')} className={`flex-1 py-1.5 text-xs font-medium rounded-md flex justify-center items-center gap-2 transition-all ${inputType === 'categorical' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500'}`}><PieChart className="w-3 h-3" /> Nominal</button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-slate-700 block mb-1">Variable Name</label>
                            <input value={variableName} onChange={e => setVariableName(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900" placeholder="e.g. Age" />
                        </div>
                        
                        {inputType === 'continuous' ? (
                            <div>
                                <label className="text-sm font-medium text-slate-700 block mb-1">Data Input</label>
                                <textarea value={inputData} onChange={e => setInputData(e.target.value)} className="w-full h-32 px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono text-sm resize-none text-slate-900" placeholder="10, 20, 30..." />
                            </div>
                        ) : (
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-sm font-medium text-slate-700">Input Mode</label>
                                    <div className="flex bg-slate-100 rounded-md p-0.5 border border-slate-200">
                                        <button onClick={() => setCategoricalMode('raw')} className={`px-2 py-0.5 text-[10px] font-medium rounded ${categoricalMode === 'raw' ? 'bg-white text-pink-700 shadow-sm' : 'text-slate-500'}`}>Raw Data</button>
                                        <button onClick={() => setCategoricalMode('summary')} className={`px-2 py-0.5 text-[10px] font-medium rounded ${categoricalMode === 'summary' ? 'bg-white text-pink-700 shadow-sm' : 'text-slate-500'}`}>Summary</button>
                                    </div>
                                </div>
                                
                                {categoricalMode === 'raw' ? (
                                    <textarea value={inputData} onChange={e => setInputData(e.target.value)} className="w-full h-32 px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono text-sm resize-none text-slate-900" placeholder="Male, Female, Male..." />
                                ) : (
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                                        {summaryInputs.map((item) => (
                                            <div key={item.id} className="flex gap-2 items-center">
                                                <input value={item.category} onChange={(e) => updateCategory(item.id, 'category', e.target.value)} placeholder="Label" className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded text-slate-900" />
                                                <input value={item.count} onChange={(e) => updateCategory(item.id, 'count', e.target.value)} placeholder="Count" type="number" className="w-20 px-2 py-1.5 text-xs bg-white border border-slate-200 rounded text-slate-900" />
                                                {summaryInputs.length > 1 && <button onClick={() => removeCategory(item.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>}
                                            </div>
                                        ))}
                                        <button onClick={addCategory} className="w-full py-1.5 text-xs text-pink-600 bg-pink-50 border border-pink-200 rounded flex justify-center items-center gap-1 mt-2"><Plus className="w-3 h-3" /> Add Row</button>
                                    </div>
                                )}
                            </div>
                        )}

                        <button id="run-desc" onClick={handleCalculate} className={`w-full py-3 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all ${inputType === 'continuous' ? 'bg-gradient-to-r from-blue-600 to-cyan-600' : 'bg-gradient-to-r from-pink-600 to-rose-600'}`}>Calculate Statistics</button>
                        <button onClick={loadExample} className={`w-full py-2 text-xs text-slate-500 hover:${inputType === 'continuous' ? 'text-blue-600' : 'text-pink-600'}`}>Load Example Data</button>
                    </div>
                    {error && <div className="p-3 bg-amber-50 text-amber-700 text-sm rounded-lg mt-4 flex gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
                </div>
            </div>

            {/* RESULTS COL */}
            <div className="lg:col-span-8 xl:col-span-9 space-y-6">
                <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-semibold mb-8 flex items-center gap-2">
                        {inputType === 'continuous' ? <Sigma className="w-5 h-5 text-blue-500" /> : <BarChart2 className="w-5 h-5 text-pink-500" />} 
                        Descriptive Statistics Results
                    </h2>
                    
                    {result ? (
                        <div className="space-y-8">
                            <div className="flex flex-col md:flex-row gap-8 items-center justify-between pb-6 border-b border-slate-100">
                                <div className="flex items-center gap-4">
                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold ${inputType === 'continuous' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>N</div>
                                    <div><div className="text-sm text-slate-500 uppercase font-bold">Sample Size</div><div className="text-3xl font-bold text-slate-800">{result.n}</div></div>
                                </div>
                                <button onClick={handleAIAnalysis} disabled={aiAnalysis.isLoading} className={`px-6 py-3 text-white font-bold rounded-xl shadow-lg flex gap-2 disabled:opacity-70 ${inputType === 'continuous' ? 'bg-gradient-to-r from-blue-600 to-cyan-600' : 'bg-gradient-to-r from-pink-600 to-rose-600'}`}><Wand2 className="w-5 h-5" /> Analyze</button>
                            </div>

                            {/* CONTINUOUS RESULTS */}
                            {inputType === 'continuous' && (
                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <StatCard label="Mean" value={result.mean?.toFixed(3)} />
                                        <StatCard label="Median" value={result.median?.toFixed(3)} />
                                        <StatCard label="Std. Deviation" value={result.stdDev?.toFixed(3)} />
                                        <StatCard label="Variance" value={result.variance?.toFixed(3)} />
                                        <StatCard label="Min" value={result.min} />
                                        <StatCard label="Max" value={result.max} />
                                        <StatCard label="Skewness" value={result.skewness?.toFixed(3)} />
                                        <StatCard label="Kurtosis" value={result.kurtosis?.toFixed(3)} />
                                    </div>
                                    
                                    {/* Continuous Statistical Table */}
                                    <div className="relative">
                                        <div className="flex justify-end mb-2">
                                            <button 
                                                onClick={handleCopy} 
                                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${copied ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                            >
                                                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copied' : 'Copy Table'}
                                            </button>
                                        </div>
                                        <div className="overflow-x-auto border border-slate-200 rounded-lg" ref={tableRef}>
                                            <table className="w-full text-sm text-left font-sans text-slate-900 bg-white">
                                                <thead>
                                                    <tr className="bg-slate-50 border-b border-slate-200">
                                                        <th className="p-3 font-semibold text-slate-700">Statistic</th>
                                                        <th className="p-3 font-semibold text-slate-700 text-right">Value</th>
                                                        <th className="p-3 font-semibold text-slate-700 text-right">Std. Error</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    <TableRow label="Mean" value={result.mean?.toFixed(3)} se={result.standardError?.toFixed(3)} />
                                                    <TableRow label="Median" value={result.median?.toFixed(3)} />
                                                    <TableRow label="Mode" value={result.mode?.join(', ')} />
                                                    <TableRow label="Std. Deviation" value={result.stdDev?.toFixed(3)} />
                                                    <TableRow label="Variance" value={result.variance?.toFixed(3)} />
                                                    <TableRow label="Skewness" value={result.skewness?.toFixed(3)} />
                                                    <TableRow label="Kurtosis" value={result.kurtosis?.toFixed(3)} />
                                                    <TableRow label="Range" value={result.range?.toFixed(3)} />
                                                    <TableRow label="Minimum" value={result.min} />
                                                    <TableRow label="Maximum" value={result.max} />
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* CATEGORICAL RESULTS */}
                            {inputType === 'categorical' && result.frequencies && (
                                <div className="grid grid-cols-1 gap-6">
                                     <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={result.frequencies.slice(0, 10)}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="value" tick={{fontSize: 12}} />
                                                <YAxis />
                                                <Tooltip />
                                                <Bar dataKey="count" fill="#db2777" radius={[4, 4, 0, 0]}>
                                                    {result.frequencies.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#db2777' : '#be185d'} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                     </div>
                                     
                                     <div className="relative">
                                         <div className="flex justify-end mb-2">
                                            <button 
                                                onClick={handleCopy} 
                                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${copied ? 'bg-pink-100 text-pink-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                            >
                                                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copied' : 'Copy Table'}
                                            </button>
                                        </div>
                                        <div className="overflow-x-auto border border-slate-200 rounded-lg" ref={tableRef}>
                                            <table className="w-full text-sm text-left bg-white text-slate-900">
                                                <thead className="bg-slate-50 border-b border-slate-200">
                                                    <tr><th className="p-3 font-semibold text-slate-700">Category</th><th className="p-3 font-semibold text-slate-700 text-right">Frequency</th><th className="p-3 font-semibold text-slate-700 text-right">Percent</th><th className="p-3 font-semibold text-slate-700 text-right">Cumulative %</th></tr>
                                                </thead>
                                                <tbody>
                                                    {result.frequencies.map((f, i) => (
                                                        <tr key={i} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                                                            <td className="p-3 font-medium">{f.value}</td>
                                                            <td className="p-3 text-right">{f.count}</td>
                                                            <td className="p-3 text-right">{f.percentage.toFixed(1)}%</td>
                                                            <td className="p-3 text-right text-slate-500">{f.cumulativePercentage.toFixed(1)}%</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                     </div>
                                </div>
                            )}

                            {/* APA REPORT SECTION */}
                            <div className={`mt-6 p-4 rounded-lg border ${inputType === 'continuous' ? 'bg-blue-50/50 border-blue-100' : 'bg-pink-50/50 border-pink-100'}`}>
                                <h4 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${inputType === 'continuous' ? 'text-blue-900' : 'text-pink-900'}`}><FileText className="w-4 h-4" /> APA Style Report</h4>
                                <p className="text-sm text-slate-700 leading-relaxed font-serif select-all">{generateAPA()}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="h-64 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300"><Info className="w-10 h-10 mb-3 opacity-50" /><p className="text-lg font-medium">Enter data to generate statistics</p></div>
                    )}
                </div>

                <div ref={aiSectionRef} className={`bg-gradient-to-br p-8 rounded-xl shadow-sm border relative overflow-hidden scroll-mt-24 ${inputType === 'continuous' ? 'from-blue-50 to-cyan-50 border-blue-100' : 'from-pink-50 to-rose-50 border-pink-100'}`}>
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><Wand2 className={`w-48 h-48 ${inputType === 'continuous' ? 'text-blue-500' : 'text-pink-500'}`} /></div>
                    <div className="relative z-10"><h2 className={`text-xl font-semibold flex items-center gap-2 mb-4 ${inputType === 'continuous' ? 'text-blue-900' : 'text-pink-900'}`}><Wand2 className="w-6 h-6" /> AI Interpretation</h2>
                    {aiAnalysis.result ? <div className={`prose bg-white/60 p-6 rounded-lg border max-w-none text-sm ${inputType === 'continuous' ? 'prose-blue border-blue-100' : 'prose-pink border-pink-100'}`}><ReactMarkdown>{aiAnalysis.result}</ReactMarkdown></div> : aiAnalysis.isLoading ? <div className="animate-pulse">Analyzing...</div> : <p className="text-slate-600">Get a professional summary of your data.</p>}</div>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ label, value }: { label: string, value: any }) => (
    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
        <div className="text-xs font-bold text-slate-500 uppercase mb-1">{label}</div>
        <div className="text-lg font-bold text-slate-800 font-mono">{value ?? '-'}</div>
    </div>
);

const TableRow = ({ label, value, se }: { label: string, value: any, se?: any }) => (
    <tr className="hover:bg-slate-50/50">
        <td className="p-3 text-slate-700 font-medium">{label}</td>
        <td className="p-3 text-right font-mono text-slate-800">{value ?? '-'}</td>
        <td className="p-3 text-right font-mono text-slate-500">{se ?? ''}</td>
    </tr>
);

export default DescriptiveView;
