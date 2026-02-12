
import React, { useState, useRef, useMemo } from 'react';
import { Grid3X3, Wand2, FileSpreadsheet, ChevronDown, Copy, Check, FileText, Info } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import CalculationTrace from '../CalculationTrace';
import DataModal from '../DataModal';
import { ChiSquareResult, AnalysisState, TableData } from '../../types';
import { calculateChiSquare } from '../../utils/statistics';
import { analyzeChiSquare } from '../../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const ChiSquareView: React.FC = () => {
    const [tableData, setTableData] = useState<TableData>({
        columns: [
            { id: '1', name: 'Occupation', values: ['Engineer', 'Engineer', 'Engineer', 'Designer', 'Designer', 'Designer', 'Teacher', 'Teacher', 'Engineer', 'Designer', 'Teacher', 'Teacher'] },
            { id: '2', name: 'Coffee_Pref', values: ['Latte', 'Espresso', 'Latte', 'Espresso', 'Espresso', 'Latte', 'Tea', 'Tea', 'Latte', 'Espresso', 'Tea', 'Espresso'] }
        ],
        rowCount: 12
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedXId, setSelectedXId] = useState<string>('1');
    const [selectedYId, setSelectedYId] = useState<string>('2');
    
    const [result, setResult] = useState<ChiSquareResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [aiAnalysis, setAiAnalysis] = useState<AnalysisState>({ isLoading: false, result: null, error: null });
    const aiSectionRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState<string | null>(null);

    const handleCalculate = () => {
        setError(null);
        setAiAnalysis({ isLoading: false, result: null, error: null });

        const colX = tableData.columns.find(c => c.id === selectedXId);
        const colY = tableData.columns.find(c => c.id === selectedYId);

        if (!colX || !colY) {
            setError("Select two valid categorical columns.");
            return;
        }

        const xValues = colX.values.filter(v => v.trim() !== "");
        const yValues = colY.values.filter(v => v.trim() !== "");

        if (xValues.length < 2 || yValues.length < 2) {
            setError("Ensure both columns have enough categorical data.");
            return;
        }

        const res = calculateChiSquare(xValues, yValues, colX.name, colY.name);
        if (!res) {
            setError("Calculation failed. Ensure multiple categories exist in both variables.");
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
            const analysis = await analyzeChiSquare(result);
            setAiAnalysis({ isLoading: false, result: analysis, error: null });
        } catch (e) {
            setAiAnalysis({ isLoading: false, result: null, error: "AI Error." });
        }
    };

    const handleCopy = (key: string) => {
        const id = `chi-${key}`;
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

    const chartData = useMemo(() => {
        if (!result) return [];
        return result.rows.map((rowName, rIdx) => {
            const entry: any = { name: rowName };
            result.cols.forEach((colName, cIdx) => {
                entry[colName] = result.observed[rIdx][cIdx];
            });
            return entry;
        });
    }, [result]);

    const generateAPAReport = () => {
        if (!result) return '';
        const sig = result.isSignificant ? "was significantly associated" : "was not significantly associated";
        return `A Chi-square test of independence was performed to examine the relation between ${result.labelX} and ${result.labelY}. The relation between these variables ${sig}, χ²(${result.df}, N = ${result.n}) = ${result.chiSquare.toFixed(2)}, p = ${result.pValue < .001 ? '.001' : result.pValue.toFixed(3)}. The association was found to be ${Math.abs(result.cramersV) > 0.3 ? 'moderate to strong' : 'weak'}, with a Cramer's V of ${result.cramersV.toFixed(2)}.`;
    };

    const colors = ['#0d9488', '#2dd4bf', '#99f6e4', '#14b8a6', '#5eead4'];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
            {/* Sidebar */}
            <div className="lg:col-span-4 xl:col-span-3 space-y-6">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 sticky top-24">
                    <div className="mb-6">
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="w-full p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 group hover:border-teal-300 hover:bg-teal-50/30 transition-all"
                        >
                            <FileSpreadsheet className="w-8 h-8 text-slate-300 group-hover:text-teal-400 transition-colors" />
                            <span className="text-xs font-bold text-slate-500 group-hover:text-teal-600">Open Data Spreadsheet</span>
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Nominal Variable 1 (Rows)</label>
                            <div className="relative">
                                <select value={selectedXId} onChange={(e) => setSelectedXId(e.target.value)} className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 appearance-none outline-none">
                                    {tableData.columns.map(col => <option key={col.id} value={col.id}>{col.name}</option>)}
                                </select>
                                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Nominal Variable 2 (Columns)</label>
                            <div className="relative">
                                <select value={selectedYId} onChange={(e) => setSelectedYId(e.target.value)} className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 appearance-none outline-none">
                                    {tableData.columns.map(col => <option key={col.id} value={col.id}>{col.name}</option>)}
                                </select>
                                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                            </div>
                        </div>

                        <button onClick={handleCalculate} className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">Cross-tabulate & Test</button>
                        {error && <div className="mt-4 p-3 bg-amber-50 text-amber-600 text-[11px] font-medium rounded-lg border border-amber-100">{error}</div>}
                    </div>
                </div>
            </div>

            {/* Results */}
            <div className="lg:col-span-8 xl:col-span-9 space-y-6">
                {result ? (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-2 mb-2">
                            <Grid3X3 className="w-5 h-5 text-teal-600" />
                            <h2 className="text-lg font-bold text-slate-800">Chi-Square Relationship Output</h2>
                        </div>

                        {/* Summary Header */}
                        <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-12">
                            <div className="flex items-center gap-10">
                                <div className="w-36 h-36 rounded-3xl bg-teal-600 flex flex-col items-center justify-center text-white shadow-2xl shadow-teal-100 border-4 border-teal-500">
                                    <span className="text-4xl font-black">{result.chiSquare.toFixed(2)}</span>
                                    <span className="text-[11px] font-bold opacity-80 uppercase tracking-widest mt-1">χ² Value</span>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Significance (p-value)</div>
                                    <div className="text-5xl font-black text-slate-800 leading-tight">{result.pValue < .001 ? '< .001' : result.pValue.toFixed(3)}</div>
                                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${result.isSignificant ? 'bg-teal-50 text-teal-600 border border-teal-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                                        {result.isSignificant ? 'Significant Association' : 'No Significant Association'}
                                    </div>
                                </div>
                            </div>
                            <button onClick={handleAIAnalysis} disabled={aiAnalysis.isLoading} className="px-8 py-5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl shadow-xl shadow-teal-50 flex items-center gap-3 transition-all transform hover:scale-[1.02] disabled:opacity-70">
                                <Wand2 className="w-6 h-6" /> 
                                <span className="text-lg">{aiAnalysis.isLoading ? 'Processing...' : 'Analyze Data'}</span>
                            </button>
                        </div>

                        <CalculationTrace type="chisquare" data={result} />

                        {/* Visualization */}
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Grouped Frequency Visualization</h3>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
                                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
                                        <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '11px'}} />
                                        <Legend wrapperStyle={{fontSize: 10, fontWeight: 700, paddingTop: 20}} />
                                        {result.cols.map((col, idx) => (
                                            <Bar key={col} dataKey={col} fill={colors[idx % colors.length]} radius={[4, 4, 0, 0]} />
                                        ))}
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Crosstabulation Table */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xs font-bold text-slate-900 uppercase">{result.labelX} * {result.labelY} Crosstabulation</h3>
                                <button onClick={() => handleCopy('crosstab')} className={`p-1.5 rounded-md transition-all ${copied === 'crosstab' ? 'bg-teal-50 text-teal-600' : 'text-slate-400 hover:bg-slate-100'}`}>
                                    {copied === 'crosstab' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                            <table id="chi-crosstab" className="w-full text-xs text-left border-collapse border border-slate-400 font-sans text-slate-900 bg-white">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-400">
                                        <th colSpan={2} rowSpan={2} className="border border-slate-400 p-2"></th>
                                        <th colSpan={result.cols.length} className="border border-slate-400 p-2 text-center uppercase tracking-wider">{result.labelY}</th>
                                        <th rowSpan={2} className="border border-slate-400 p-2 text-center">Total</th>
                                    </tr>
                                    <tr className="bg-slate-50 border-b border-slate-400">
                                        {result.cols.map(c => <th key={c} className="border border-slate-400 p-2 text-center">{c}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.rows.map((row, rIdx) => (
                                        <React.Fragment key={row}>
                                            <tr className="border-b border-slate-200">
                                                <td rowSpan={2} className="p-2 font-bold border border-slate-400 bg-slate-50/50 min-w-[100px]">{row}</td>
                                                <td className="p-2 border border-slate-400 font-medium italic">Count</td>
                                                {result.observed[rIdx].map((val, cIdx) => (
                                                    <td key={cIdx} className="p-2 text-center border border-slate-400">{val}</td>
                                                ))}
                                                <td className="p-2 text-center border border-slate-400 font-bold">{result.rowTotals[rIdx]}</td>
                                            </tr>
                                            <tr className="border-b border-slate-400">
                                                <td className="p-2 border border-slate-400 text-slate-400 italic">Expected</td>
                                                {result.expected[rIdx].map((val, cIdx) => (
                                                    <td key={cIdx} className="p-2 text-center border border-slate-400 text-slate-400">{val.toFixed(1)}</td>
                                                ))}
                                                <td className="p-2 text-center border border-slate-400 text-slate-400">{result.rowTotals[rIdx].toFixed(1)}</td>
                                            </tr>
                                        </React.Fragment>
                                    ))}
                                    <tr className="font-bold bg-slate-50">
                                        <td colSpan={2} className="p-2 border border-slate-400">Total</td>
                                        {result.colTotals.map((val, i) => <td key={i} className="p-2 text-center border border-slate-400">{val}</td>)}
                                        <td className="p-2 text-center border border-slate-400 bg-teal-50 text-teal-700">{result.grandTotal}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Test Statistics Table */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 max-w-md">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xs font-bold text-slate-900 uppercase">Symmetric Measures</h3>
                            </div>
                            <table className="w-full text-xs text-left border-collapse border border-slate-400 font-sans text-slate-900 bg-white">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-400">
                                        <th className="p-2 border border-slate-400">Measure</th>
                                        <th className="p-2 text-center border border-slate-400">Value</th>
                                        <th className="p-2 text-center border border-slate-400">Approx. Sig.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="p-2 border border-slate-400 font-semibold">Cramer's V</td>
                                        <td className="p-2 text-center border border-slate-400 font-mono">{result.cramersV.toFixed(3)}</td>
                                        <td className="p-2 text-center border border-slate-400 font-bold">{result.pValue < .001 ? '.001' : result.pValue.toFixed(3)}</td>
                                    </tr>
                                    <tr className="bg-slate-50/50">
                                        <td className="p-2 border border-slate-400">N of Valid Cases</td>
                                        <td className="p-2 text-center border border-slate-400">{result.n}</td>
                                        <td className="p-2 border border-slate-400"></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* APA Style Box */}
                        <div className="p-6 bg-teal-50/50 border border-teal-100 rounded-2xl shadow-sm">
                            <h4 className="text-sm font-semibold text-teal-900 mb-2 flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                APA Style Report & Interpretation
                            </h4>
                            <p className="text-sm text-slate-700 leading-relaxed font-serif select-all">
                                {generateAPAReport()}
                            </p>
                        </div>

                        {/* AI Section */}
                        <div ref={aiSectionRef} className="scroll-mt-24">
                            {aiAnalysis.result && (
                                <div className="bg-gradient-to-br from-teal-50 to-emerald-50 p-8 rounded-2xl shadow-sm border border-teal-100 relative overflow-hidden animate-in fade-in duration-700">
                                     <div className="relative z-10">
                                        <h3 className="text-xl font-bold text-teal-900 mb-6 flex items-center gap-2"><Wand2 className="w-6 h-6" /> CATEGORICAL INSIGHT REPORT</h3>
                                        <div className="prose prose-teal bg-white/70 p-8 rounded-xl max-w-none text-sm shadow-sm leading-relaxed"><ReactMarkdown>{aiAnalysis.result}</ReactMarkdown></div>
                                     </div>
                                </div>
                            )}
                         </div>
                    </div>
                ) : (
                    <div className="h-[600px] bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4"><Grid3X3 className="w-8 h-8 text-teal-200" /></div>
                        <h3 className="text-xl font-bold text-slate-600 mb-2">Chi-Square Navigator</h3>
                        <p className="max-w-md text-center text-slate-500 text-sm">Input categorical data (e.g., Job Titles, Regions, Choices) to identify significant associations.</p>
                    </div>
                )}
            </div>

            <DataModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} data={tableData} onDataChange={setTableData} />
        </div>
    );
};

export default ChiSquareView;
