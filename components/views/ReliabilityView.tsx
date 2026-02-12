import React, { useState, useRef } from 'react';
import { ShieldCheck, Info, AlertCircle, Wand2, Activity, FileSpreadsheet, ChevronDown, Plus, Copy, Check, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import CalculationTrace from '../CalculationTrace';
import DataModal from '../DataModal';
import { ReliabilityResult, AnalysisState, TableData } from '../../types';
import { calculateCronbachAlpha } from '../../utils/statistics';
import { analyzeReliability } from '../../services/geminiService';

const ReliabilityView: React.FC = () => {
    // Spreadsheet State
    const [tableData, setTableData] = useState<TableData>({
        columns: [
            { id: '1', name: 'Item_1', values: ['4', '5', '4', '3', '5', '4', '5', '4'] },
            { id: '2', name: 'Item_2', values: ['5', '4', '5', '4', '4', '5', '4', '5'] },
            { id: '3', name: 'Item_3', values: ['4', '5', '4', '4', '5', '4', '5', '4'] },
            { id: '4', name: 'Item_4', values: ['1', '2', '2', '1', '1', '2', '1', '2'] } // Low correlation item
        ],
        rowCount: 8
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>(['1', '2', '3', '4']);

    const [scaleName, setScaleName] = useState<string>("Subjective Wellbeing Scale");
    const [result, setResult] = useState<ReliabilityResult | null>(null);
    const [excludedCount, setExcludedCount] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);
    const [aiAnalysis, setAiAnalysis] = useState<AnalysisState>({ isLoading: false, result: null, error: null });
    const aiSectionRef = useRef<HTMLDivElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState<string | null>(null);

    const handleCalculate = () => {
        setError(null); 
        setAiAnalysis({ isLoading: false, result: null, error: null });

        if (selectedItemIds.length < 2) {
            setError("Select at least 2 items (columns) for reliability analysis.");
            setResult(null);
            return;
        }

        // Prepare Matrix
        const matrix: number[][] = [];
        const nRows = tableData.rowCount;
        let valid = 0;
        let invalid = 0;
        
        for (let r = 0; r < nRows; r++) {
            const rowValues: number[] = [];
            let rowValid = true;
            let rowEmpty = true;

            for (const id of selectedItemIds) {
                const col = tableData.columns.find(c => c.id === id);
                const valStr = col?.values[r]?.trim() || "";
                if (valStr !== "") rowEmpty = false;
                
                const val = parseFloat(valStr);
                if (isNaN(val)) {
                    rowValid = false;
                    break;
                }
                rowValues.push(val);
            }

            if (rowValid && !rowEmpty) {
                matrix.push(rowValues);
                valid++;
            } else if (!rowEmpty) {
                invalid++;
            }
        }

        if (matrix.length < 2) {
            setError("Insufficient valid numeric rows across all selected items.");
            setResult(null);
            return;
        }

        setExcludedCount(invalid);
        const names = selectedItemIds.map(id => tableData.columns.find(c => c.id === id)?.name || "Item");
        const reliability = calculateCronbachAlpha(matrix, names);
        if (!reliability) { 
            setError("Calculation failed. Ensure data variability."); 
            setResult(null);
            return; 
        }
        setResult(reliability);
    };

    const handleAIAnalysis = async () => {
        if (!result) return;
        setAiAnalysis({ isLoading: true, result: null, error: null });
        setTimeout(() => aiSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
        try {
            const analysis = await analyzeReliability(result, scaleName);
            setAiAnalysis({ isLoading: false, result: analysis, error: null });
        } catch (e) { 
            setAiAnalysis({ isLoading: false, result: null, error: "System Error." }); 
        }
    };

    const handleCopyTable = (key: string) => {
        const tableId = `table-${key}`;
        const el = document.getElementById(tableId);
        if (!el) return;
        
        const range = document.createRange();
        range.selectNode(el);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
        try {
            document.execCommand('copy');
            setCopied(key);
            setTimeout(() => setCopied(null), 2000);
        } catch (err) { console.error(err); }
        window.getSelection()?.removeAllRanges();
    };

    const toggleItemSelection = (id: string) => {
        setSelectedItemIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const generateAPAReport = () => {
        if (!result) return '';
        const interpretation = result.alpha >= 0.7 ? "acceptable" : "low";
        return `The internal consistency of the ${result.nItems}-item ${scaleName} was assessed using Cronbach’s alpha coefficient (N = ${result.nParticipants}). The scale demonstrated ${interpretation} reliability, α = ${result.alpha.toFixed(3)}. Descriptive analysis of individual items suggested that reliability ${result.items.some(i => i.alphaIfDeleted > result.alpha) ? 'could be improved by the removal of problematic items' : 'was consistent across all included components'}.`;
    };

    const getReliabilityColor = (alpha: number) => {
        if (alpha >= 0.8) return { 
            primary: 'text-emerald-500', 
            bg: 'bg-emerald-500', 
            border: 'border-emerald-500/20', 
            shadow: 'shadow-[0_0_25px_rgba(16,185,129,0.3)]',
            light: 'text-emerald-400'
        };
        if (alpha >= 0.7) return { 
            primary: 'text-amber-500', 
            bg: 'bg-amber-500', 
            border: 'border-amber-500/20', 
            shadow: 'shadow-[0_0_25px_rgba(245,158,11,0.3)]',
            light: 'text-amber-400'
        };
        return { 
            primary: 'text-rose-500', 
            bg: 'bg-rose-500', 
            border: 'border-rose-500/20', 
            shadow: 'shadow-[0_0_25px_rgba(244,63,94,0.3)]',
            light: 'text-rose-400'
        };
    };

    const semanticColors = result ? getReliabilityColor(result.alpha) : null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 animate-in fade-in duration-500">
            {/* Sidebar */}
            <div className="md:col-span-4 xl:col-span-3 space-y-6">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 sticky top-24">
                    <div className="mb-6">
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="w-full p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 group hover:border-cyan-300 hover:bg-cyan-50/30 transition-all"
                        >
                            <FileSpreadsheet className="w-8 h-8 text-slate-300 group-hover:text-cyan-400 transition-colors" />
                            <span className="text-xs font-bold text-slate-500 group-hover:text-cyan-600">Open Data Spreadsheet</span>
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Scale Name</label>
                            <input 
                                value={scaleName} 
                                onChange={e => setScaleName(e.target.value)} 
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500 transition-all" 
                                placeholder="e.g. Life Satisfaction"
                            />
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-100">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Select Scale Items</label>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                                {tableData.columns.map(col => (
                                    <button
                                        key={col.id}
                                        onClick={() => toggleItemSelection(col.id)}
                                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-xs font-bold transition-all ${
                                            selectedItemIds.includes(col.id)
                                                ? 'bg-cyan-50 border-cyan-200 text-cyan-700'
                                                : 'bg-white border-slate-200 text-slate-400 hover:border-cyan-100'
                                        }`}
                                    >
                                        <span className="truncate pr-2">{col.name}</span>
                                        {selectedItemIds.includes(col.id) && <Plus className="w-3 h-3 rotate-45 shrink-0" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button onClick={handleCalculate} className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">Run Reliability</button>
                        {error && <div className="mt-4 p-3 bg-amber-50 text-amber-600 text-[11px] font-medium rounded-lg border border-amber-100">{error}</div>}
                    </div>
                </div>
            </div>

            {/* Results */}
            <div className="md:col-span-8 xl:col-span-9 space-y-6" ref={resultsRef}>
                {result && semanticColors ? (
                    <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-8">
                        <div className="flex items-center gap-2 mb-2">
                            <ShieldCheck className="w-5 h-5 text-cyan-600" />
                            <h2 className="text-lg font-bold text-slate-800">Reliability Analysis Output <span className="text-slate-400 font-normal ml-2">| {scaleName}</span></h2>
                        </div>

                        {/* Summary Cards */}
                        <div className={`bg-white p-8 rounded-[2.5rem] shadow-sm border ${semanticColors.border} flex flex-col md:flex-row items-center justify-between gap-8 transition-all duration-700`}>
                            <div className="flex items-center gap-8">
                                <div className={`relative w-40 h-40 flex items-center justify-center p-4 rounded-full bg-slate-50/50 ${semanticColors.shadow}`}>
                                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 144 144">
                                        <circle cx="72" cy="72" r="60" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
                                        <circle cx="72" cy="72" r="60" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={377} strokeDashoffset={377 - (377 * Math.max(0, result.alpha))} className={`${semanticColors.primary} transition-all duration-1000`} strokeLinecap="round" />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className={`text-4xl font-black ${semanticColors.primary}`}>{result.alpha.toFixed(3)}</span>
                                        <span className={`text-[10px] font-black ${semanticColors.light} uppercase tracking-[0.2em]`}>Alpha Index</span>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Consistency Status</div>
                                    <div className={`text-5xl font-black tracking-tighter ${semanticColors.primary}`}>
                                        {result.alpha >= 0.9 ? "Excellent" : result.alpha >= 0.8 ? "Good" : result.alpha >= 0.7 ? "Acceptable" : result.alpha >= 0.6 ? "Questionable" : "Poor"}
                                    </div>
                                    <div className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-2">Matrix Profile: {result.nItems} Items</div>
                                </div>
                            </div>
                            <button onClick={handleAIAnalysis} disabled={aiAnalysis.isLoading} className={`px-10 py-5 ${semanticColors.bg} text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl flex items-center gap-3 transition-all hover:scale-105 active:scale-95 disabled:opacity-70 group`}><Wand2 className="w-5 h-5 group-hover:rotate-12 transition-transform" /> {aiAnalysis.isLoading ? 'Processing...' : 'Interpretation Consultant'}</button>
                        </div>

                        <CalculationTrace type="reliability" data={result} />

                        {/* SPSS TABLES GROUP */}
                        <div className="space-y-10">
                            {/* 1. Case Processing Summary */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xs font-bold text-slate-900 uppercase">Case Processing Summary</h3>
                                    <button onClick={() => handleCopyTable('case')} className={`p-1.5 rounded-md transition-all ${copied === 'case' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:bg-slate-100'}`}>
                                        {copied === 'case' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                                <table id="table-case" className="w-full text-xs text-left border-collapse border border-slate-400 font-sans text-slate-900 bg-white">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-400">
                                            <th className="p-2 border-r border-slate-400"></th>
                                            <th className="p-2 text-center border-r border-slate-400">N</th>
                                            <th className="p-2 text-center">%</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-b border-slate-200">
                                            <td className="p-2 font-semibold border-r border-slate-400 bg-slate-50/50">Cases Valid</td>
                                            <td className="p-2 text-center border-r border-slate-400">{result.nParticipants}</td>
                                            <td className="p-2 text-center">{((result.nParticipants / (result.nParticipants + excludedCount)) * 100).toFixed(1)}</td>
                                        </tr>
                                        <tr className="border-b border-slate-200">
                                            <td className="p-2 font-semibold border-r border-slate-400 bg-slate-50/50">Excluded<sup>a</sup></td>
                                            <td className="p-2 text-center border-r border-slate-400">{excludedCount}</td>
                                            <td className="p-2 text-center">{((excludedCount / (result.nParticipants + excludedCount)) * 100).toFixed(1)}</td>
                                        </tr>
                                        <tr className="border-t-2 border-slate-400 font-bold">
                                            <td className="p-2 border-r border-slate-400 bg-slate-50/50">Total</td>
                                            <td className="p-2 text-center border-r border-slate-400">{result.nParticipants + excludedCount}</td>
                                            <td className="p-2 text-center">100.0</td>
                                        </tr>
                                    </tbody>
                                    <tfoot>
                                        <tr><td colSpan={3} className="p-2 text-[10px] text-slate-500 italic">a. Listwise deletion based on all variables in the procedure.</td></tr>
                                    </tfoot>
                                </table>
                            </div>

                            {/* 2. Reliability Statistics */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 max-w-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xs font-bold text-slate-900 uppercase">Reliability Statistics</h3>
                                    <button onClick={() => handleCopyTable('rel-stats')} className={`p-1.5 rounded-md transition-all ${copied === 'rel-stats' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:bg-slate-100'}`}>
                                        {copied === 'rel-stats' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                                <table id="table-rel-stats" className="w-full text-xs text-left border-collapse border border-slate-400 font-sans text-slate-900 bg-white">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-400">
                                            <th className="p-2 text-center border-r border-slate-400">Cronbach's Alpha</th>
                                            <th className="p-2 text-center">N of Items</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className={`p-3 text-center border-r border-slate-400 font-black text-sm ${semanticColors.primary}`}>{result.alpha.toFixed(3)}</td>
                                            <td className="p-3 text-center font-black text-sm">{result.nItems}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* 3. Item-Total Statistics */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xs font-bold text-slate-900 uppercase">Item-Total Statistics</h3>
                                    <button onClick={() => handleCopyTable('item-stats')} className={`p-1.5 rounded-md transition-all ${copied === 'item-stats' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:bg-slate-100'}`}>
                                        {copied === 'item-stats' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                                <table id="table-item-stats" className="w-full text-[11px] text-left border-collapse border border-slate-400 font-sans text-slate-900 bg-white">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-400">
                                            <th className="p-2 border-r border-slate-400 min-w-[120px]">Item</th>
                                            <th className="p-2 text-center border-r border-slate-400">Scale Mean if Item Deleted</th>
                                            <th className="p-2 text-center border-r border-slate-400">Scale Variance if Item Deleted</th>
                                            <th className="p-2 text-center border-r border-slate-400">Corrected Item-Total Correlation</th>
                                            <th className="p-2 text-center">Cronbach's Alpha if Item Deleted</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.items.map((item, idx) => {
                                            const improves = item.alphaIfDeleted > result.alpha;
                                            return (
                                                <tr key={item.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} border-b border-slate-200 hover:bg-cyan-50/30 transition-colors`}>
                                                    <td className="p-2 font-semibold border-r border-slate-400">{item.name}</td>
                                                    <td className="p-2 text-center border-r border-slate-400">{(result.scaleMean - item.mean).toFixed(2)}</td>
                                                    <td className="p-2 text-center border-r border-slate-400">{(result.totalVariance + item.variance - (2 * item.correctedItemTotalCorr * result.scaleStdDev * item.stdDev)).toFixed(2)}</td>
                                                    <td className="p-2 text-center border-r border-slate-400">{item.correctedItemTotalCorr.toFixed(3)}</td>
                                                    <td className={`p-2 text-center font-black ${improves ? 'text-rose-600 bg-rose-50/50' : 'text-slate-900'}`}>
                                                        {item.alphaIfDeleted.toFixed(3)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* APA Style Report Box */}
                        <div className={`p-8 rounded-[2rem] border ${semanticColors.border} bg-slate-50/50 transition-all`}>
                            <h4 className={`text-sm font-black uppercase tracking-widest ${semanticColors.primary} mb-4 flex items-center gap-2`}>
                                <FileText className="w-5 h-5" />
                                APA Style Report & Synthesis
                            </h4>
                            <p className="text-sm text-slate-700 leading-relaxed font-serif select-all italic">
                                {generateAPAReport()}
                            </p>
                        </div>

                        {/* Interpretation Section */}
                        <div ref={aiSectionRef} className="scroll-mt-24">
                            {aiAnalysis.result && (
                                <div className={`p-10 rounded-[3rem] shadow-sm border ${semanticColors.border} bg-white/40 backdrop-blur-md relative overflow-hidden animate-in fade-in duration-700`}>
                                     <div className="relative z-10">
                                        <h3 className={`text-xl font-black uppercase tracking-[0.2em] ${semanticColors.primary} mb-8 flex items-center gap-3`}><Wand2 className="w-8 h-8" /> Statistical Consistency Audit</h3>
                                        <div className={`prose prose-slate bg-white/70 p-10 rounded-[2rem] max-w-none text-sm shadow-inner leading-relaxed selection:${semanticColors.bg}/10`}><ReactMarkdown>{aiAnalysis.result}</ReactMarkdown></div>
                                     </div>
                                </div>
                            )}
                         </div>
                    </div>
                ) : (
                    <div className="h-[600px] bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4"><ShieldCheck className="w-8 h-8 text-cyan-200" /></div>
                        <h3 className="text-xl font-bold text-slate-600 mb-2">Reliability Ready</h3>
                        <p className="max-w-md text-center text-slate-500 text-sm">Open the spreadsheet and select 2+ items from your scale to calculate internal consistency.</p>
                    </div>
                )}
            </div>

            <DataModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} data={tableData} onDataChange={setTableData} />
        </div>
    );
};

export default ReliabilityView;