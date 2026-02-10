
import React, { useState, useRef } from 'react';
import { BarChart3, Plus, Trash2, Wand2, Info, AlertCircle, Settings2, FileText, Check, Copy } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { GroupInput, AnovaResult, LikertConfig, AnalysisState } from '../../types';
import { parseInputData, calculateOneWayAnova } from '../../utils/statistics';
import { analyzeAnova } from '../../services/geminiService';

const DEFAULT_LABELS_5 = ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"];
const DEFAULT_LABELS_7 = ["Strongly Disagree", "Disagree", "Somewhat Disagree", "Neutral", "Somewhat Agree", "Agree", "Strongly Agree"];

const AnovaView: React.FC = () => {
    const [groups, setGroups] = useState<GroupInput[]>([
        { id: '1', name: 'Group A', value: '' },
        { id: '2', name: 'Group B', value: '' },
        { id: '3', name: 'Group C', value: '' },
    ]);
    const [likertConfig, setLikertConfig] = useState<LikertConfig>({
        enabled: false, points: 5, isReversed: false, labels: [...DEFAULT_LABELS_5]
    });
    const [result, setResult] = useState<AnovaResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [aiAnalysis, setAiAnalysis] = useState<AnalysisState>({ isLoading: false, result: null, error: null });
    const aiSectionRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState(false);
    const tableRef = useRef<HTMLDivElement>(null);

    const addGroup = () => setGroups(p => [...p, { id: Date.now().toString(), name: `Group ${String.fromCharCode(65 + p.length)}`, value: '' }]);
    const removeGroup = (id: string) => groups.length > 2 && setGroups(p => p.filter(g => g.id !== id));
    const updateGroup = (id: string, field: 'name' | 'value', val: string) => setGroups(p => p.map(g => g.id === id ? { ...g, [field]: val } : g));

    const handleCalculate = () => {
        setError(null);
        setAiAnalysis({ isLoading: false, result: null, error: null });
        
        const parsedGroups = groups.map(g => ({
            ...g,
            parsed: parseInputData(g.value, likertConfig)
        }));

        const validGroups = parsedGroups.filter(g => g.parsed.length > 0);
        if (validGroups.length < 2) {
            setError("At least 2 groups must have valid numerical data.");
            setResult(null);
            return;
        }

        const anova = calculateOneWayAnova(validGroups);
        if (!anova) {
            setError("Calculation failed.");
            setResult(null);
            return;
        }
        setResult(anova);
    };

    const handleAIAnalysis = async () => {
        if (!result) return;
        setAiAnalysis({ isLoading: true, result: null, error: null });
        setTimeout(() => aiSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
        try {
            const analysis = await analyzeAnova(result, groups.map(g => g.name));
            setAiAnalysis({ isLoading: false, result: analysis, error: null });
        } catch (e) {
            setAiAnalysis({ isLoading: false, result: null, error: "Failed to generate AI analysis." });
        }
    };

    const loadExample = () => {
        setGroups([
            { id: '1', name: 'Control', value: '5, 6, 5, 4, 7, 6' },
            { id: '2', name: 'Treatment A', value: '7, 8, 9, 8, 7, 9' },
            { id: '3', name: 'Treatment B', value: '9, 10, 8, 9, 10, 11' }
        ]);
        setTimeout(() => document.getElementById('run-anova')?.click(), 100);
    };

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

    const generateAPA = () => {
        if (!result) return "";
        const sig = result.isSignificant ? "statistically significant" : "not statistically significant";
        return `A one-way analysis of variance (ANOVA) was conducted to compare the effect of group membership on the dependent variable. There was a ${sig} difference in means between the groups, F(${result.dfBetween}, ${result.dfWithin}) = ${result.fStat.toFixed(3)}, p = ${result.pValue < .001 ? '< .001' : result.pValue.toFixed(3)}.`;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
            {/* INPUT COL */}
            <div className="lg:col-span-4 xl:col-span-3 space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-semibold text-slate-700">Groups</h3>
                        <button onClick={() => setLikertConfig(c => ({...c, enabled: !c.enabled}))} className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${likertConfig.enabled ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}><Settings2 className="w-3 h-3" /> Likert</button>
                    </div>
                    <div className="space-y-4">
                        {groups.map((g, i) => (
                            <div key={g.id} className="relative group">
                                <div className="flex justify-between mb-1">
                                    <input value={g.name} onChange={e => updateGroup(g.id, 'name', e.target.value)} className="text-xs font-medium text-slate-900 bg-transparent" placeholder={`Group ${i+1}`} />
                                    {groups.length > 2 && <button onClick={() => removeGroup(g.id)}><Trash2 className="w-3 h-3 text-slate-300 hover:text-red-500" /></button>}
                                </div>
                                <textarea value={g.value} onChange={e => updateGroup(g.id, 'value', e.target.value)} className="w-full h-16 px-2 py-1.5 bg-white border border-slate-200 rounded font-mono text-xs resize-none text-slate-900" placeholder="Data..." />
                            </div>
                        ))}
                        <button onClick={addGroup} className="w-full py-2 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded flex justify-center gap-1"><Plus className="w-3 h-3" /> Add Group</button>
                        <button id="run-anova" onClick={handleCalculate} className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all mt-4">Calculate ANOVA</button>
                        <button onClick={loadExample} className="w-full py-2 text-xs text-slate-500 hover:text-emerald-600">Load Example Data</button>
                    </div>
                    {error && <div className="p-3 bg-amber-50 text-amber-700 text-sm rounded-lg mt-4 flex gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
                </div>
            </div>

            {/* RESULTS COL */}
            <div className="lg:col-span-8 xl:col-span-9 space-y-6">
                <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-semibold mb-8 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-emerald-500" /> One-Way ANOVA Results</h2>
                    
                    {result ? (
                        <div className="space-y-8">
                            <div className="flex flex-col md:flex-row gap-8 items-center justify-between pb-6 border-b border-slate-100">
                                <div className="flex items-center gap-8">
                                    <div className="w-32 h-32 rounded-full bg-emerald-50 flex items-center justify-center ring-8 ring-emerald-50/50">
                                        <div className="text-center">
                                            <div className="text-sm text-emerald-400 font-bold uppercase">F-Statistic</div>
                                            <div className="text-3xl font-bold text-emerald-700">{result.fStat.toFixed(2)}</div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-500 uppercase">P-Value</h3>
                                        <div className="text-4xl font-bold text-slate-800">{result.pValue < .001 ? '< .001' : result.pValue.toFixed(3)}</div>
                                        <div className={`text-lg ${result.isSignificant ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>{result.isSignificant ? "Significant Difference" : "No Significant Difference"}</div>
                                    </div>
                                </div>
                                <button onClick={handleAIAnalysis} disabled={aiAnalysis.isLoading} className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl shadow-lg flex gap-2 disabled:opacity-70"><Wand2 className="w-5 h-5" /> Interpret</button>
                            </div>

                            {/* TABLE */}
                            <div className="relative">
                                <div className="flex justify-end mb-2">
                                    <button onClick={handleCopy} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${copied ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} Copy</button>
                                </div>
                                <div className="overflow-x-auto" ref={tableRef}>
                                    <table className="w-full text-sm text-left border-collapse font-sans text-slate-900">
                                        <thead className="bg-slate-50 border-b-2 border-slate-200">
                                            <tr><th className="p-3 font-semibold">Source</th><th className="p-3 font-semibold text-center">SS</th><th className="p-3 font-semibold text-center">df</th><th className="p-3 font-semibold text-center">MS</th><th className="p-3 font-semibold text-center">F</th><th className="p-3 font-semibold text-center">Sig.</th></tr>
                                        </thead>
                                        <tbody>
                                            <tr className="border-b border-slate-100">
                                                <td className="p-3 font-medium">Between Groups</td>
                                                <td className="p-3 text-center">{result.ssBetween.toFixed(3)}</td>
                                                <td className="p-3 text-center">{result.dfBetween}</td>
                                                <td className="p-3 text-center">{result.msBetween.toFixed(3)}</td>
                                                <td className="p-3 text-center font-bold">{result.fStat.toFixed(3)}</td>
                                                <td className="p-3 text-center">{result.pValue < .001 ? '< .001' : result.pValue.toFixed(3)}</td>
                                            </tr>
                                            <tr className="border-b border-slate-100">
                                                <td className="p-3 font-medium">Within Groups</td>
                                                <td className="p-3 text-center">{result.ssWithin.toFixed(3)}</td>
                                                <td className="p-3 text-center">{result.dfWithin}</td>
                                                <td className="p-3 text-center">{result.msWithin.toFixed(3)}</td>
                                                <td className="p-3 text-center"></td><td className="p-3 text-center"></td>
                                            </tr>
                                            <tr className="bg-slate-50/50 font-semibold">
                                                <td className="p-3">Total</td>
                                                <td className="p-3 text-center">{result.ssTotal.toFixed(3)}</td>
                                                <td className="p-3 text-center">{result.dfTotal}</td>
                                                <td colSpan={3}></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            
                            {/* Descriptives */}
                            <div className="mt-6">
                                <h4 className="text-sm font-bold text-slate-700 mb-2">Group Descriptives</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {result.groups.map(g => (
                                        <div key={g.name} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                            <div className="font-semibold text-slate-800 mb-1">{g.name}</div>
                                            <div className="flex justify-between text-sm"><span className="text-slate-500">Mean:</span> <span className="font-mono">{g.mean.toFixed(2)}</span></div>
                                            <div className="flex justify-between text-sm"><span className="text-slate-500">SD:</span> <span className="font-mono">{g.stdDev.toFixed(2)}</span></div>
                                            <div className="flex justify-between text-sm"><span className="text-slate-500">N:</span> <span className="font-mono">{g.n}</span></div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-6 p-4 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                                <h4 className="text-sm font-semibold text-emerald-900 mb-2 flex items-center gap-2"><FileText className="w-4 h-4" /> APA Style Report</h4>
                                <p className="text-sm text-slate-700 leading-relaxed font-serif select-all">{generateAPA()}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="h-64 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300"><Info className="w-10 h-10 mb-3 opacity-50" /><p className="text-lg font-medium">Enter at least 2 groups to calculate ANOVA</p></div>
                    )}
                </div>

                <div ref={aiSectionRef} className="bg-gradient-to-br from-emerald-50 to-teal-50 p-8 rounded-xl shadow-sm border border-emerald-100 relative overflow-hidden scroll-mt-24">
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><Wand2 className="w-48 h-48 text-emerald-500" /></div>
                    <div className="relative z-10"><h2 className="text-xl font-semibold flex items-center gap-2 text-emerald-900 mb-4"><Wand2 className="w-6 h-6 text-emerald-600" /> AI Interpretation</h2>
                    {aiAnalysis.result ? <div className="prose prose-emerald bg-white/60 p-6 rounded-lg border border-emerald-100 max-w-none text-sm"><ReactMarkdown>{aiAnalysis.result}</ReactMarkdown></div> : aiAnalysis.isLoading ? <div className="text-emerald-600 animate-pulse">Analyzing...</div> : <p className="text-slate-600">Get a professional interpretation of your ANOVA results.</p>}</div>
                </div>
            </div>
        </div>
    );
};

export default AnovaView;
