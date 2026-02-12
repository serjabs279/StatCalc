import React, { useState, useRef } from 'react';
import { BarChart3, Plus, Wand2, FileSpreadsheet, Activity, Copy, Check, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import CalculationTrace from '../CalculationTrace';
import DataModal from '../DataModal';
import { GroupInput, AnovaResult, AnalysisState, TableData } from '../../types';
import { calculateOneWayAnova } from '../../utils/statistics';
import { analyzeAnova } from '../../services/geminiService';

const AnovaView: React.FC = () => {
    // Spreadsheet State
    const [tableData, setTableData] = useState<TableData>({
        columns: [
            { id: '1', name: 'Control', values: ['5', '6', '5', '4', '7', '6'] },
            { id: '2', name: 'Treatment_A', values: ['7', '8', '9', '8', '7', '9'] },
            { id: '3', name: 'Treatment_B', values: ['9', '10', '8', '9', '10', '11'] }
        ],
        rowCount: 6
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [mappedColumnIds, setMappedColumnIds] = useState<string[]>(['1', '2', '3']);

    // Analysis State
    const [result, setResult] = useState<AnovaResult | null>(null);
    const [excludedCount, setExcludedCount] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);
    const [aiAnalysis, setAiAnalysis] = useState<AnalysisState>({ isLoading: false, result: null, error: null });
    const aiSectionRef = useRef<HTMLDivElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState<string | null>(null);

    const handleCalculate = () => {
        setError(null);
        setAiAnalysis({ isLoading: false, result: null, error: null });

        let totalInvalid = 0;
        const groupInputs: GroupInput[] = mappedColumnIds.map(id => {
            const col = tableData.columns.find(c => c.id === id);
            const rawValues = col?.values || [];
            const parsed = rawValues.map(v => parseFloat(v)).filter(v => !isNaN(v));
            totalInvalid += (rawValues.filter(v => v.trim() !== "").length - parsed.length);
            return {
                id,
                name: col?.name || "Unknown",
                value: "",
                parsed: parsed
            };
        });

        const validGroups = groupInputs.filter(g => g.parsed && g.parsed.length > 1);
        
        if (validGroups.length < 2) {
            setError("Select at least 2 columns with numeric data for comparison.");
            setResult(null);
            return;
        }

        const anova = calculateOneWayAnova(validGroups);
        if (!anova) {
            setError("Analysis failed. Ensure columns contain enough numeric variance.");
            setResult(null);
            return;
        }
        setExcludedCount(totalInvalid);
        setResult(anova);
    };

    const handleInterpretation = async () => {
        if (!result) return;
        setAiAnalysis({ isLoading: true, result: null, error: null });
        setTimeout(() => aiSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
        try {
            const names = mappedColumnIds.map(id => tableData.columns.find(c => c.id === id)?.name || "Group");
            const analysis = await analyzeAnova(result, names);
            setAiAnalysis({ isLoading: false, result: analysis, error: null });
        } catch (e) {
            setAiAnalysis({ isLoading: false, result: null, error: "Failed to generate statistical analysis." });
        }
    };

    const handleCopy = (key: string) => {
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

    const toggleColumnMapping = (id: string) => {
        setMappedColumnIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const generateAPAReport = () => {
        if (!result) return '';
        const sig = result.isSignificant ? "was statistically significant" : "was not statistically significant";
        return `A one-way between-subjects ANOVA was conducted to compare the effect of the independent variable on the dependent measure across ${result.groups.length} groups. There ${sig} effect for the ${result.groups.length} conditions, F(${result.dfBetween}, ${result.dfWithin}) = ${result.fStat.toFixed(2)}, p = ${result.pValue < .001 ? '.001' : result.pValue.toFixed(3)}. Descriptive statistics indicate that ${result.groups[0].name} (M = ${result.groups[0].mean.toFixed(2)}) and ${result.groups[result.groups.length-1].name} (M = ${result.groups[result.groups.length-1].mean.toFixed(2)}) were among the observed group variations.`;
    };

    const totalValidParticipants = result?.groups.reduce((acc, g) => acc + g.n, 0) || 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 animate-in fade-in duration-500">
            {/* Sidebar */}
            <div className="md:col-span-4 xl:col-span-3 space-y-6">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 sticky top-24">
                    <div className="mb-6">
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="w-full p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 group hover:border-emerald-300 hover:bg-emerald-50/30 transition-all"
                        >
                            <FileSpreadsheet className="w-8 h-8 text-slate-300 group-hover:text-emerald-400 transition-colors" />
                            <span className="text-xs font-bold text-slate-500 group-hover:text-emerald-600">Open Data Spreadsheet</span>
                        </button>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Select Groups for Analysis</label>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                            {tableData.columns.map(col => (
                                <button
                                    key={col.id}
                                    onClick={() => toggleColumnMapping(col.id)}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-xs font-bold transition-all ${
                                        mappedColumnIds.includes(col.id)
                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                            : 'bg-white border-slate-200 text-slate-400 hover:border-emerald-100'
                                    }`}
                                >
                                    <span className="truncate pr-2">{col.name}</span>
                                    {mappedColumnIds.includes(col.id) && <Plus className="w-3 h-3 rotate-45 shrink-0" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-8 pt-4 border-t border-slate-100">
                        <button onClick={handleCalculate} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-[11px] uppercase tracking-widest">Run ANOVA</button>
                        {error && <div className="mt-4 p-3 bg-amber-50 text-amber-600 text-[11px] font-medium rounded-lg border border-amber-100">{error}</div>}
                    </div>
                </div>
            </div>

            {/* Results */}
            <div className="md:col-span-8 xl:col-span-9 space-y-6" ref={resultsRef}>
                {result ? (
                    <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
                         <div className="flex items-center gap-2 mb-2">
                            <Activity className="w-5 h-5 text-emerald-600" />
                            <h2 className="text-lg font-bold text-slate-800">ANOVA Results Output</h2>
                        </div>

                        {/* Top Summary Header */}
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-8">
                            <div className="flex items-center gap-8">
                                <div className="w-32 h-32 rounded-full bg-emerald-50 flex items-center justify-center border-4 border-white shadow-inner">
                                    <div className="text-center">
                                        <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">F-Stat</div>
                                        <div className="text-3xl font-bold text-emerald-700">{result.fStat.toFixed(3)}</div>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Significance</div>
                                    <div className="text-4xl font-bold text-slate-800">{result.pValue < .001 ? '< .001' : result.pValue.toFixed(3)}</div>
                                    <div className={`text-xs font-bold mt-1 ${result.isSignificant ? 'text-emerald-500' : 'text-amber-500'}`}>{result.isSignificant ? 'SIGNIFICANT DIFFERENCE' : 'NO SIGNIFICANT DIFFERENCE'}</div>
                                </div>
                            </div>
                            <button onClick={handleInterpretation} disabled={aiAnalysis.isLoading} className="px-8 py-4 bg-emerald-600 text-white font-bold rounded-xl shadow-lg flex items-center gap-2 disabled:opacity-70 group uppercase tracking-widest text-[11px]"><Wand2 className="w-5 h-5 group-hover:rotate-12 transition-transform" /> {aiAnalysis.isLoading ? 'Processing...' : 'Methodological Analysis'}</button>
                        </div>

                        <CalculationTrace type="anova" data={result} />

                        {/* Tables group */}
                        <div className="space-y-12">
                            
                            {/* 1. Case Processing Summary */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xs font-bold text-slate-900 uppercase">Case Processing Summary</h3>
                                    <button onClick={() => handleCopy('case')} className={`p-1.5 rounded-md transition-all ${copied === 'case' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:bg-slate-100'}`}>
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
                                            <td className="p-2 text-center border-r border-slate-400">{totalValidParticipants}</td>
                                            <td className="p-2 text-center">{((totalValidParticipants / (totalValidParticipants + excludedCount)) * 100).toFixed(1)}</td>
                                        </tr>
                                        <tr className="border-b border-slate-200">
                                            <td className="p-2 font-semibold border-r border-slate-400 bg-slate-50/50">Excluded</td>
                                            <td className="p-2 text-center border-r border-slate-400">{excludedCount}</td>
                                            <td className="p-2 text-center">{((excludedCount / (totalValidParticipants + excludedCount)) * 100).toFixed(1)}</td>
                                        </tr>
                                        <tr className="border-t-2 border-slate-400 font-bold">
                                            <td className="p-2 border-r border-slate-400 bg-slate-50/50">Total</td>
                                            <td className="p-2 text-center border-r border-slate-400">{totalValidParticipants + excludedCount}</td>
                                            <td className="p-2 text-center">100.0</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* 2. Descriptives Table */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xs font-bold text-slate-900 uppercase">Descriptives</h3>
                                    <button onClick={() => handleCopy('desc')} className={`p-1.5 rounded-md transition-all ${copied === 'desc' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:bg-slate-100'}`}>
                                        {copied === 'desc' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                                <table id="table-desc" className="w-full text-xs text-left border-collapse border border-slate-400 font-sans text-slate-900 bg-white">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-400">
                                            <th className="p-2 border-r border-slate-400"></th>
                                            <th className="p-2 text-center border-r border-slate-400">N</th>
                                            <th className="p-2 text-center border-r border-slate-400">Mean</th>
                                            <th className="p-2 text-center border-r border-slate-400">Std. Deviation</th>
                                            <th className="p-2 text-center">Std. Error</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.groups.map((group, idx) => (
                                            <tr key={idx} className="border-b border-slate-200">
                                                <td className="p-2 font-semibold border-r border-slate-400 bg-slate-50/50">{group.name}</td>
                                                <td className="p-2 text-center border-r border-slate-400">{group.n}</td>
                                                <td className="p-2 text-center border-r border-slate-400">{group.mean.toFixed(4)}</td>
                                                <td className="p-2 text-center border-r border-slate-400">{group.stdDev.toFixed(4)}</td>
                                                <td className="p-2 text-center">{(group.stdDev / Math.sqrt(group.n)).toFixed(4)}</td>
                                            </tr>
                                        ))}
                                        <tr className="border-t-2 border-slate-400 font-bold bg-slate-50/30">
                                            <td className="p-2 border-r border-slate-400">Total</td>
                                            <td className="p-2 text-center border-r border-slate-400">{totalValidParticipants}</td>
                                            <td className="p-2 text-center border-r border-slate-400">{result.grandMean.toFixed(4)}</td>
                                            <td className="p-2 text-center border-r border-slate-400">---</td>
                                            <td className="p-2 text-center">---</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* 3. ANOVA Table */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xs font-bold text-slate-900 uppercase">ANOVA</h3>
                                    <button onClick={() => handleCopy('anova')} className={`p-1.5 rounded-md transition-all ${copied === 'anova' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:bg-slate-100'}`}>
                                        {copied === 'anova' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                                <table id="table-anova" className="w-full text-xs text-left border-collapse border border-slate-400 font-sans text-slate-900 bg-white">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-400">
                                            <th className="p-2 border-r border-slate-400"></th>
                                            <th className="p-2 text-center border-r border-slate-400">Sum of Squares</th>
                                            <th className="p-2 text-center border-r border-slate-400">df</th>
                                            <th className="p-2 text-center border-r border-slate-400">Mean Square</th>
                                            <th className="p-2 text-center border-r border-slate-400">F</th>
                                            <th className="p-2 text-center">Sig.</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-b border-slate-200">
                                            <td className="p-2 font-semibold border-r border-slate-400 bg-slate-50/50">Between Groups</td>
                                            <td className="p-2 text-center border-r border-slate-400">{result.ssBetween.toFixed(3)}</td>
                                            <td className="p-2 text-center border-r border-slate-400">{result.dfBetween}</td>
                                            <td className="p-2 text-center border-r border-slate-400">{result.msBetween.toFixed(3)}</td>
                                            <td className="p-2 text-center border-r border-slate-400 font-bold">{result.fStat.toFixed(3)}</td>
                                            <td className="p-2 text-center font-bold">{result.pValue < .001 ? '.001' : result.pValue.toFixed(3)}</td>
                                        </tr>
                                        <tr className="border-b border-slate-200">
                                            <td className="p-2 font-semibold border-r border-slate-400 bg-slate-50/50">Within Groups</td>
                                            <td className="p-2 text-center border-r border-slate-400">{result.ssWithin.toFixed(3)}</td>
                                            <td className="p-2 text-center border-r border-slate-400">{result.dfWithin}</td>
                                            <td className="p-2 text-center border-r border-slate-400">{result.msWithin.toFixed(3)}</td>
                                            <td className="p-2 text-center border-r border-slate-400"></td>
                                            <td className="p-2 text-center"></td>
                                        </tr>
                                        <tr className="border-t-2 border-slate-400 font-bold">
                                            <td className="p-2 border-r border-slate-400 bg-slate-50/50">Total</td>
                                            <td className="p-2 text-center border-r border-slate-400">{result.ssTotal.toFixed(3)}</td>
                                            <td className="p-2 text-center border-r border-slate-400">{result.dfTotal}</td>
                                            <td colSpan={3} className="bg-slate-50/10"></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* APA Style Report Box */}
                        <div className="p-6 bg-emerald-50/50 border border-emerald-100 rounded-2xl shadow-sm">
                            <h4 className="text-sm font-semibold text-emerald-900 mb-2 flex items-center gap-2">
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
                                        <h3 className="text-xl font-bold text-black mb-6 flex items-center gap-2"><Wand2 className="w-6 h-6 text-zinc-400" /> Methodological Summary</h3>
                                        <div className="prose prose-zinc bg-zinc-50 p-8 rounded-2xl max-w-none text-sm text-black shadow-inner leading-relaxed font-medium"><ReactMarkdown>{aiAnalysis.result}</ReactMarkdown></div>
                                     </div>
                                </div>
                            )}
                         </div>
                    </div>
                ) : (
                    <div className="h-[600px] bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4"><BarChart3 className="w-8 h-8 text-emerald-200" /></div>
                        <h3 className="text-xl font-bold text-slate-600 mb-2">ANOVA Ready</h3>
                        <p className="max-w-md text-center text-slate-500 text-sm">Open the spreadsheet and pick 2 or more columns to compare their means across groups.</p>
                    </div>
                )}
            </div>

            <DataModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} data={tableData} onDataChange={setTableData} />
        </div>
    );
};

export default AnovaView;