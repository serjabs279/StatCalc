import React, { useState, useRef } from 'react';
import { ShieldCheck, Info, AlertCircle, Wand2, FileText, Check, Copy, ArrowUpRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ReliabilityResult, AnalysisState } from '../../types';
import { parseMatrixData, calculateCronbachAlpha } from '../../utils/statistics';
import { analyzeReliability } from '../../services/geminiService';

const SAMPLE_MATRIX = `3	4	3	4	3
4	5	4	5	4
2	3	2	3	2
5	5	5	4	5
3	3	3	3	3
4	4	3	4	4
2	2	2	2	1
5	4	5	5	5
3	4	3	3	3
4	3	4	4	4`;

const ReliabilityView: React.FC = () => {
    const [inputData, setInputData] = useState<string>("");
    const [result, setResult] = useState<ReliabilityResult | null>(null);
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

    const handleCalculate = () => {
        setError(null);
        setAiAnalysis({ isLoading: false, result: null, error: null });
        setCopied(false);

        const matrix = parseMatrixData(inputData);
        if (!matrix) {
            setError("Invalid data format. Please ensure you have pasted a rectangular matrix of numbers (Rows=Participants, Columns=Items).");
            setResult(null);
            return;
        }

        const reliability = calculateCronbachAlpha(matrix);
        if (!reliability) {
             setError("Calculation failed. Ensure you have at least 2 participants and 2 items.");
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
            const analysis = await analyzeReliability(result);
            setAiAnalysis({ isLoading: false, result: analysis, error: null });
        } catch (e) {
            setAiAnalysis({ isLoading: false, result: null, error: "Failed to generate AI analysis." });
        }
    };

    const loadExample = () => {
        setInputData(SAMPLE_MATRIX);
        setTimeout(() => document.getElementById('run-reliability')?.click(), 100);
    };

    const getInterpretation = (alpha: number) => {
        if (alpha >= 0.9) return { text: "Excellent", color: "text-emerald-600", bg: "bg-emerald-50" };
        if (alpha >= 0.8) return { text: "Good", color: "text-teal-600", bg: "bg-teal-50" };
        if (alpha >= 0.7) return { text: "Acceptable", color: "text-blue-600", bg: "bg-blue-50" };
        if (alpha >= 0.6) return { text: "Questionable", color: "text-amber-600", bg: "bg-amber-50" };
        if (alpha >= 0.5) return { text: "Poor", color: "text-orange-600", bg: "bg-orange-50" };
        return { text: "Unacceptable", color: "text-red-600", bg: "bg-red-50" };
    };

    const generateAPA = () => {
        if (!result) return "";
        const interp = getInterpretation(result.alpha);
        return `The internal consistency of the ${result.nItems}-item scale was assessed using Cronbach's alpha. The analysis revealed a reliability coefficient of α = ${result.alpha.toFixed(2)}, indicating ${interp.text.toLowerCase()} reliability.`;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
            {/* INPUT COL */}
            <div className="lg:col-span-4 xl:col-span-3 space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 sticky top-24">
                     <div className="mb-4">
                        <h3 className="font-semibold text-slate-700 mb-1">Data Input</h3>
                        <p className="text-xs text-slate-500">
                            Paste raw scores matrix. <br/>
                            <span className="font-medium">Rows = Participants (N)</span> <br/>
                            <span className="font-medium">Cols = Items/Questions (k)</span>
                        </p>
                     </div>

                    <textarea 
                        value={inputData} 
                        onChange={e => setInputData(e.target.value)} 
                        className="w-full h-64 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs resize-none text-slate-900 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none" 
                        placeholder={`3  4  5\n2  3  4\n4  5  5\n...`} 
                    />

                    <div className="mt-4 space-y-3">
                        <button 
                            id="run-reliability" 
                            onClick={handleCalculate} 
                            className="w-full py-3 bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
                        >
                            Calculate Alpha
                        </button>
                        <button 
                            onClick={loadExample} 
                            className="w-full py-2 text-xs text-slate-500 hover:text-cyan-600"
                        >
                            Load Example Data
                        </button>
                    </div>
                    {error && <div className="p-3 bg-amber-50 text-amber-700 text-sm rounded-lg mt-4 flex gap-2"><AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{error}</span></div>}
                </div>
            </div>

             {/* RESULTS COL */}
             <div className="lg:col-span-8 xl:col-span-9 space-y-6">
                <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-semibold mb-8 flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-cyan-500" /> 
                        Reliability Analysis Results
                    </h2>

                    {result ? (
                        <div className="space-y-8">
                             {/* SCORE CARD */}
                            <div className="flex flex-col md:flex-row gap-8 items-center justify-between pb-6 border-b border-slate-100">
                                <div className="flex items-center gap-8">
                                    <div className="w-32 h-32 rounded-full bg-cyan-50 flex items-center justify-center ring-8 ring-cyan-50/50 relative">
                                        <div className="text-center">
                                            <div className="text-sm text-cyan-500 font-bold uppercase">Alpha</div>
                                            <div className="text-3xl font-bold text-cyan-800">{result.alpha.toFixed(3)}</div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-500 uppercase">Consistency</h3>
                                        <div className={`text-2xl font-bold ${getInterpretation(result.alpha).color}`}>
                                            {getInterpretation(result.alpha).text}
                                        </div>
                                        <div className="text-sm text-slate-400 mt-1">
                                            {result.nItems} Items, {result.nParticipants} Participants
                                        </div>
                                    </div>
                                </div>
                                <button onClick={handleAIAnalysis} disabled={aiAnalysis.isLoading} className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-bold rounded-xl shadow-lg flex gap-2 disabled:opacity-70"><Wand2 className="w-5 h-5" /> Interpret</button>
                            </div>

                            {/* ITEM-TOTAL TABLE */}
                            <div className="relative">
                                <div className="flex justify-between items-end mb-2">
                                     <h3 className="text-sm font-bold text-slate-700">Item-Total Statistics</h3>
                                     <button 
                                        onClick={handleCopy} 
                                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${copied ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                    >
                                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copied' : 'Copy Table'}
                                    </button>
                                </div>
                                
                                <div className="overflow-x-auto border border-slate-200 rounded-lg" ref={tableRef}>
                                    <table className="w-full text-sm text-left font-sans text-slate-900 bg-white">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200">
                                                <th className="p-3 font-semibold text-slate-700">Item Name</th>
                                                <th className="p-3 font-semibold text-slate-700 text-center">Mean</th>
                                                <th className="p-3 font-semibold text-slate-700 text-center">SD</th>
                                                <th className="p-3 font-semibold text-slate-700 text-center" title="Corrected Item-Total Correlation">Corr. Item-Total</th>
                                                <th className="p-3 font-semibold text-slate-700 text-center text-cyan-700">Alpha if Deleted</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {result.items.map((item) => {
                                                const shouldDrop = item.alphaIfDeleted > result.alpha;
                                                return (
                                                    <tr key={item.id} className={shouldDrop ? "bg-red-50/50" : "hover:bg-slate-50/50"}>
                                                        <td className="p-3 font-medium text-slate-700 flex items-center gap-2">
                                                            {item.name}
                                                            {shouldDrop && <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded flex items-center gap-0.5"><ArrowUpRight className="w-3 h-3"/> Drop?</span>}
                                                        </td>
                                                        <td className="p-3 text-center font-mono text-slate-600">{item.mean.toFixed(2)}</td>
                                                        <td className="p-3 text-center font-mono text-slate-600">{item.stdDev.toFixed(2)}</td>
                                                        <td className="p-3 text-center font-mono text-slate-600">{item.correctedItemTotalCorr.toFixed(3)}</td>
                                                        <td className={`p-3 text-center font-mono font-bold ${shouldDrop ? 'text-emerald-600' : 'text-slate-600'}`}>
                                                            {item.alphaIfDeleted.toFixed(3)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="text-xs text-slate-400 mt-2 italic">* "Drop?" indicates that removing this item would increase the scale's reliability.</div>
                            </div>

                            {/* APA REPORT */}
                            <div className="p-4 bg-cyan-50/50 border border-cyan-100 rounded-lg">
                                <h4 className="text-sm font-semibold text-cyan-900 mb-2 flex items-center gap-2"><FileText className="w-4 h-4" /> APA Style Report</h4>
                                <p className="text-sm text-slate-700 leading-relaxed font-serif select-all">{generateAPA()}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="h-64 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                            <Info className="w-10 h-10 mb-3 opacity-50" />
                            <p className="text-lg font-medium">Enter data to check reliability</p>
                        </div>
                    )}
                </div>

                {/* AI SECTION */}
                <div ref={aiSectionRef} className="bg-gradient-to-br from-cyan-50 to-teal-50 p-8 rounded-xl shadow-sm border border-cyan-100 relative overflow-hidden scroll-mt-24">
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><Wand2 className="w-48 h-48 text-cyan-500" /></div>
                    <div className="relative z-10">
                        <h2 className="text-xl font-semibold flex items-center gap-2 mb-4 text-cyan-900"><Wand2 className="w-6 h-6" /> AI Interpretation</h2>
                        {aiAnalysis.result ? (
                            <div className="prose prose-cyan bg-white/60 p-6 rounded-lg border border-cyan-100 max-w-none text-sm">
                                <ReactMarkdown>{aiAnalysis.result}</ReactMarkdown>
                            </div>
                        ) : aiAnalysis.isLoading ? (
                            <div className="flex items-center gap-2 text-cyan-700 animate-pulse"><div className="w-4 h-4 rounded-full bg-cyan-500 animate-bounce"></div> Analyzing consistency...</div>
                        ) : (
                            <p className="text-slate-600">Get a professional psychometric analysis of your scale.</p>
                        )}
                    </div>
                </div>
             </div>
        </div>
    );
};

export default ReliabilityView;