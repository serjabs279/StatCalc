import React, { useState, useRef } from 'react';
import { ShieldCheck, Info, AlertCircle, Wand2, FileText, Check, Copy, ArrowUpRight, ArrowRightLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ReliabilityResult, AnalysisState } from '../../types';
import { parseMatrixData, calculateCronbachAlpha } from '../../utils/statistics';
import { analyzeReliability } from '../../services/geminiService';

const SAMPLE_STANDARD = `4	4	3	4
3	2	3	2
5	5	4	5
3	3	3	3
4	4	4	4
2	1	2	1
5	5	5	5
3	3	3	3
4	4	4	4`;

const SAMPLE_REVERSE = `2	2
4	5
2	1
1	2
3	3
4	5
1	1
3	2
2	2`;

const ReliabilityView: React.FC = () => {
    // Input State
    const [scaleName, setScaleName] = useState<string>("Interpretation");
    const [inputData, setInputData] = useState<string>("");
    const [reverseInputData, setReverseInputData] = useState<string>("");
    
    // Analysis State
    const [result, setResult] = useState<ReliabilityResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [aiAnalysis, setAiAnalysis] = useState<AnalysisState>({ isLoading: false, result: null, error: null });
    const aiSectionRef = useRef<HTMLDivElement>(null);
    
    // Copy functionality generalized
    const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});
    const caseProcessingRef = useRef<HTMLDivElement>(null);
    const reliabilityStatsRef = useRef<HTMLDivElement>(null);
    const itemTotalRef = useRef<HTMLDivElement>(null);

    const handleCopy = (key: string, ref: React.RefObject<HTMLElement>) => {
        if (!ref.current) return;
        const range = document.createRange();
        range.selectNode(ref.current);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
        document.execCommand('copy');
        
        setCopiedMap(prev => ({ ...prev, [key]: true }));
        setTimeout(() => setCopiedMap(prev => ({ ...prev, [key]: false })), 2000);
        window.getSelection()?.removeAllRanges();
    };

    const handleCalculate = () => {
        setError(null);
        setAiAnalysis({ isLoading: false, result: null, error: null });
        setCopiedMap({});
        setResult(null);

        // Simple parsing without Likert config
        const matrixA = parseMatrixData(inputData);
        const matrixB = parseMatrixData(reverseInputData);

        if (!matrixA && !matrixB) {
            setError("Please enter data in at least one of the input fields.");
            return;
        }

        let finalMatrix: number[][] = [];
        let itemNames: string[] = [];

        // Assume standard 5-point scale for reverse calculation if not specified, 
        // or just simple reverse (max+1 - val).
        // Since we removed the config, we will default to 5-point scale reversal for simplicity in this reverted version,
        // or just expect the user to manually reverse.
        // However, the original code had a default. Let's assume 5-point for now to keep it working reasonably.
        const points = 5;

        // Logic to merge and reverse
        if (matrixA && matrixB) {
            // Check row consistency
            if (matrixA.length !== matrixB.length) {
                setError(`Row Mismatch: Standard items have ${matrixA.length} participants, but Reverse items have ${matrixB.length}. These must match exactly to combine them.`);
                return;
            }

            // Reverse Matrix B
            const reversedB = matrixB.map(row => row.map(val => (points + 1) - val));
            
            // Merge A + B
            finalMatrix = matrixA.map((row, i) => [...row, ...reversedB[i]]);
            
            // Generate names
            const kA = matrixA[0].length;
            const kB = matrixB[0].length;
            itemNames = [
                ...Array.from({length: kA}, (_, i) => `Item ${i + 1}`),
                ...Array.from({length: kB}, (_, i) => `RevItem ${i + 1} (R)`)
            ];
            
        } else if (matrixA) {
            finalMatrix = matrixA;
            // Default naming
        } else if (matrixB) {
            // Only reverse items
            finalMatrix = matrixB.map(row => row.map(val => (points + 1) - val));
            itemNames = Array.from({length: matrixB[0].length}, (_, i) => `RevItem ${i + 1} (R)`);
        }

        if (finalMatrix.length < 2 || finalMatrix[0].length < 2) {
             setError("Calculation failed. Ensure the final dataset has at least 2 participants and 2 items.");
             return;
        }

        const reliability = calculateCronbachAlpha(finalMatrix, itemNames);
        if (!reliability) {
             setError("Calculation failed due to variance issues (e.g., constant columns). Check your data.");
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
            setAiAnalysis({ isLoading: false, result: null, error: "Failed to generate AI analysis." });
        }
    };

    const loadExample = () => {
        setInputData(SAMPLE_STANDARD);
        setReverseInputData(SAMPLE_REVERSE);
        setScaleName("Job Satisfaction Scale");
        setTimeout(() => document.getElementById('run-reliability')?.click(), 100);
    };

    const formatSPSS = (num: number) => {
        const fixed = num.toFixed(3);
        if (num > -1 && num < 1) {
             return fixed.replace(/^0+/, '').replace(/^-0+/, '-');
        }
        return fixed;
    };

    const getInterpretation = (alpha: number) => {
        if (alpha >= 0.9) return "excellent";
        if (alpha >= 0.8) return "good";
        if (alpha >= 0.7) return "acceptable";
        if (alpha >= 0.6) return "questionable";
        if (alpha >= 0.5) return "poor";
        return "unacceptable";
    };

    const generateAPA = () => {
        if (!result) return "";
        const interp = getInterpretation(result.alpha);
        return `The internal consistency of the ${scaleName} (${result.nItems} items) was assessed using Cronbach's alpha. The analysis revealed a reliability coefficient of α = ${formatSPSS(result.alpha)}, indicating ${interp} reliability.`;
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 animate-in fade-in duration-500">
            {/* INPUT COL */}
            <div className="md:col-span-4 xl:col-span-3 space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 md:sticky md:top-24 max-h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar">
                     <div className="mb-4 pb-4 border-b border-slate-100">
                        <h3 className="font-semibold text-slate-700 mb-1">Data Input Strategy</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Combine standard items with reverse-scored items. We will automatically flip the reverse scores and merge the datasets.
                        </p>
                     </div>

                     <div className="mb-4">
                        <label className="text-sm font-medium text-slate-700 block mb-1">Interpretation</label>
                        <input value={scaleName} onChange={e => setScaleName(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900" placeholder="e.g. Job Satisfaction" />
                     </div>

                     {/* STANDARD ITEMS */}
                     <div className="space-y-2">
                        <div className="flex justify-between items-center">
                             <label className="text-xs font-bold text-slate-700 uppercase flex flex-col">
                                <span>Standard Items</span>
                                <span className="text-[10px] text-slate-400 font-normal normal-case">e.g. Part 1, 3</span>
                            </label>
                        </div>
                        <textarea 
                            value={inputData} 
                            onChange={e => setInputData(e.target.value)} 
                            className="w-full h-40 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs resize-none text-slate-900 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all" 
                            placeholder={`Paste matrix (Rows=Participants)\n3  4\n2  3\n...`} 
                        />
                     </div>

                     {/* REVERSE ITEMS */}
                     <div className="space-y-2 pt-2">
                        <div className="flex justify-between items-center">
                             <label className="text-xs font-bold text-slate-700 uppercase flex flex-col">
                                <span>Reverse Items</span>
                                <span className="text-[10px] text-slate-400 font-normal normal-case">Scores will be flipped (Default 5-pt)</span>
                            </label>
                        </div>
                        <textarea 
                            value={reverseInputData} 
                            onChange={e => setReverseInputData(e.target.value)} 
                            className="w-full h-32 px-3 py-2 bg-amber-50/50 border border-amber-200 rounded-lg font-mono text-xs resize-none text-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all" 
                            placeholder={`Paste reverse items (e.g. Part 2)\n2  1\n4  5\n...`} 
                        />
                     </div>

                    <div className="mt-4 space-y-3 pt-2 border-t border-slate-100">
                        <button 
                            id="run-reliability" 
                            onClick={handleCalculate} 
                            className="w-full py-3 bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                            <ArrowRightLeft className="w-4 h-4" /> Merge & Calculate
                        </button>
                        <button 
                            onClick={loadExample} 
                            className="w-full py-2 text-xs text-slate-500 hover:text-cyan-600"
                        >
                            Load Example (3 Parts)
                        </button>
                    </div>
                    {error && <div className="p-3 bg-amber-50 text-amber-700 text-xs rounded-lg mt-4 flex gap-2 items-start"><AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span className="leading-snug">{error}</span></div>}
                </div>
            </div>

             {/* RESULTS COL */}
             <div className="md:col-span-8 xl:col-span-9 space-y-6">
                <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-semibold mb-8 flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-cyan-500" /> 
                        Reliability Analysis Results
                    </h2>

                    {result ? (
                        <div className="space-y-12">
                            
                            {/* SPSS STYLE TABLES SECTION */}
                            <div className="flex flex-col gap-8 items-start">
                                
                                {/* TABLE 1: Case Processing Summary */}
                                <div>
                                    <div className="relative flex justify-center items-center mb-2 w-[300px]">
                                        <h3 className="font-bold text-slate-900 text-sm">Case Processing Summary</h3>
                                        <button 
                                            onClick={() => handleCopy('case', caseProcessingRef)}
                                            className={`absolute right-0 p-1 rounded transition-colors ${copiedMap['case'] ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-cyan-600 hover:bg-slate-100'}`}
                                            title="Copy Table"
                                        >
                                            {copiedMap['case'] ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                    <div ref={caseProcessingRef} className="border-2 border-black bg-white inline-block">
                                        <table className="text-sm text-slate-900 border-collapse min-w-[300px]">
                                            <thead>
                                                <tr className="border-b border-black">
                                                    <th className="p-1 w-24"></th>
                                                    <th className="p-1 text-center border-l border-black w-16">N</th>
                                                    <th className="p-1 text-center border-l border-black w-16">%</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td className="p-1 pl-2 border-r border-black align-top">
                                                        <div className="flex gap-4">
                                                            <span className="font-medium w-10">Cases</span>
                                                            <span>Valid</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-1 text-center border-r border-black">{result.nParticipants}</td>
                                                    <td className="p-1 text-center">100.0</td>
                                                </tr>
                                                <tr>
                                                    <td className="p-1 pl-2 border-r border-black align-top">
                                                        <div className="flex gap-4">
                                                            <span className="w-10"></span>
                                                            <span>Excluded<sup>a</sup></span>
                                                        </div>
                                                    </td>
                                                    <td className="p-1 text-center border-r border-black">0</td>
                                                    <td className="p-1 text-center">.0</td>
                                                </tr>
                                                <tr className="border-t border-black">
                                                    <td className="p-1 pl-2 border-r border-black align-top">
                                                        <div className="flex gap-4">
                                                            <span className="w-10"></span>
                                                            <span>Total</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-1 text-center border-r border-black">{result.nParticipants}</td>
                                                    <td className="p-1 text-center">100.0</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="text-[10px] text-slate-600 mt-1 max-w-[300px]">
                                        a. Listwise deletion based on all variables in the procedure.
                                    </div>
                                </div>

                                {/* TABLE 2: Reliability Statistics */}
                                <div>
                                    <div className="relative flex justify-center items-center mb-2 w-[250px]">
                                        <h3 className="font-bold text-slate-900 text-sm">Reliability Statistics</h3>
                                        <button 
                                            onClick={() => handleCopy('reliability', reliabilityStatsRef)}
                                            className={`absolute right-0 p-1 rounded transition-colors ${copiedMap['reliability'] ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-cyan-600 hover:bg-slate-100'}`}
                                            title="Copy Table"
                                        >
                                            {copiedMap['reliability'] ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                    <div ref={reliabilityStatsRef} className="border-2 border-black bg-white inline-block">
                                        <table className="text-sm text-slate-900 border-collapse min-w-[250px]">
                                            <thead>
                                                <tr className="border-b border-black">
                                                    <th className="p-2 text-center border-r border-black">Cronbach's<br/>Alpha</th>
                                                    <th className="p-2 text-center">N of Items</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td className="p-2 text-center border-r border-black font-medium">{formatSPSS(result.alpha)}</td>
                                                    <td className="p-2 text-center">{result.nItems}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                            
                            {/* ITEM-TOTAL STATISTICS */}
                            <div className="relative">
                                <div className="flex justify-between items-end mb-2">
                                     <h3 className="text-sm font-bold text-slate-900">Item-Total Statistics</h3>
                                     <button 
                                        onClick={() => handleCopy('itemTotal', itemTotalRef)} 
                                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${copiedMap['itemTotal'] ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                    >
                                        {copiedMap['itemTotal'] ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copiedMap['itemTotal'] ? 'Copied' : 'Copy Table'}
                                    </button>
                                </div>
                                
                                <div className="overflow-x-auto border-2 border-black bg-white" ref={itemTotalRef}>
                                    <table className="w-full text-sm text-left font-sans text-slate-900 bg-white border-collapse">
                                        <thead>
                                            <tr className="border-b-2 border-black bg-slate-50">
                                                <th className="p-2 font-bold text-slate-900 border-r border-slate-300">Item Name</th>
                                                <th className="p-2 font-bold text-slate-900 text-center border-r border-slate-300">Scale Mean if Item Deleted</th>
                                                <th className="p-2 font-bold text-slate-900 text-center border-r border-slate-300">Corrected Item-Total Correlation</th>
                                                <th className="p-2 font-bold text-slate-900 text-center">Cronbach's Alpha if Item Deleted</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {result.items.map((item) => {
                                                const shouldDrop = item.alphaIfDeleted > result.alpha;
                                                const meanIfDeleted = result.scaleMean - item.mean;
                                                return (
                                                    <tr key={item.id} className={shouldDrop ? "bg-amber-50" : "hover:bg-slate-50"}>
                                                        <td className="p-2 font-medium text-slate-900 border-r border-slate-200 flex items-center gap-2">
                                                            {item.name}
                                                            {shouldDrop && <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded flex items-center gap-0.5 border border-red-200 ml-auto"><ArrowUpRight className="w-3 h-3"/> Improve?</span>}
                                                        </td>
                                                        <td className="p-2 text-center font-mono text-slate-700 border-r border-slate-200">{meanIfDeleted.toFixed(2)}</td>
                                                        <td className="p-2 text-center font-mono text-slate-700 border-r border-slate-200">{formatSPSS(item.correctedItemTotalCorr)}</td>
                                                        <td className={`p-2 text-center font-mono font-bold ${shouldDrop ? 'text-emerald-700' : 'text-slate-700'}`}>
                                                            {formatSPSS(item.alphaIfDeleted)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="text-xs text-slate-400 mt-2 italic">* "Improve?" indicates that removing this item would increase the scale's overall reliability.</div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* APA REPORT */}
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                                    <h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2"><FileText className="w-4 h-4" /> APA Style Report</h4>
                                    <p className="text-sm text-slate-700 leading-relaxed font-serif select-all">{generateAPA()}</p>
                                </div>

                                {/* AI ACTION */}
                                <div className="flex items-center justify-center p-4">
                                     <button onClick={handleAIAnalysis} disabled={aiAnalysis.isLoading} className="w-full h-full px-6 py-4 bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-bold rounded-xl shadow-lg flex flex-col items-center justify-center gap-2 disabled:opacity-70 hover:shadow-xl transition-all">
                                        <div className="flex items-center gap-2">
                                            <Wand2 className="w-5 h-5" /> 
                                            <span>Generate Professional Interpretation</span>
                                        </div>
                                        <span className="text-xs font-normal opacity-90">Powered by Gemini AI</span>
                                     </button>
                                </div>
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
                <div ref={aiSectionRef} className="bg-gradient-to-br from-slate-50 to-cyan-50/30 p-8 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden scroll-mt-24">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Wand2 className="w-48 h-48 text-cyan-500" /></div>
                    <div className="relative z-10">
                        <h2 className="text-xl font-semibold flex items-center gap-2 mb-4 text-slate-900"><Wand2 className="w-6 h-6 text-cyan-600" /> Interpretation</h2>
                        {aiAnalysis.result ? (
                            <div className="prose prose-slate bg-white p-6 rounded-lg border border-slate-200 max-w-none text-sm shadow-sm">
                                <ReactMarkdown>{aiAnalysis.result}</ReactMarkdown>
                            </div>
                        ) : aiAnalysis.isLoading ? (
                            <div className="flex items-center gap-2 text-cyan-700 animate-pulse"><div className="w-4 h-4 rounded-full bg-cyan-500 animate-bounce"></div> Analyzing consistency...</div>
                        ) : (
                            <p className="text-slate-500 italic">Generate statistics first, then click "Generate Professional Interpretation" above.</p>
                        )}
                    </div>
                </div>
             </div>
        </div>
    );
};

export default ReliabilityView;