
import React, { useState, useRef, useMemo } from 'react';
import { LineChart, Wand2, FileSpreadsheet, ChevronDown, Copy, Check, FileText, Zap, HelpCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import CalculationTrace from '../CalculationTrace';
import DataModal from '../DataModal';
import { RegressionResult, AnalysisState, TableData } from '../../types';
import { calculateRegression } from '../../utils/statistics';
import { analyzeRegression } from '../../services/geminiService';
import { ComposedChart, Scatter, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const RegressionView: React.FC = () => {
    const [tableData, setTableData] = useState<TableData>({
        columns: [
            { id: '1', name: 'Study_Hours', values: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] },
            { id: '2', name: 'Exam_Score', values: ['52', '55', '60', '68', '72', '78', '84', '88', '92', '95'] }
        ],
        rowCount: 10
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedXId, setSelectedXId] = useState<string>('1');
    const [selectedYId, setSelectedYId] = useState<string>('2');
    
    const [predictionX, setPredictionX] = useState<string>('');
    const [result, setResult] = useState<RegressionResult | null>(null);
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
            setError("Select valid Predictor (X) and Outcome (Y) columns.");
            return;
        }

        const xValues = colX.values.map(v => parseFloat(v)).filter(v => !isNaN(v));
        const yValues = colY.values.map(v => parseFloat(v)).filter(v => !isNaN(v));

        if (xValues.length < 2 || yValues.length < 2) {
            setError("Ensure at least 2 points of numeric data in both columns.");
            return;
        }

        const minLen = Math.min(xValues.length, yValues.length);
        const points = xValues.slice(0, minLen).map((x, i) => ({ id: i, x, y: yValues[i] }));
        
        const regResult = calculateRegression(points, colX.name, colY.name);
        if (!regResult) {
            setError("Calculation failed. Ensure variation in Predictor variable.");
            setResult(null);
            return;
        }
        setResult(regResult);
    };

    const handleAIAnalysis = async () => {
        if (!result) return;
        setAiAnalysis({ isLoading: true, result: null, error: null });
        setTimeout(() => aiSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
        try {
            const analysis = await analyzeRegression(result);
            setAiAnalysis({ isLoading: false, result: analysis, error: null });
        } catch (e) {
            setAiAnalysis({ isLoading: false, result: null, error: "AI Error." });
        }
    };

    const handleCopy = (key: string) => {
        const id = `reg-${key}`;
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

    const predictedY = useMemo(() => {
        if (!result || !predictionX) return null;
        const x = parseFloat(predictionX);
        if (isNaN(x)) return null;
        return result.intercept + result.slope * x;
    }, [result, predictionX]);

    const chartData = useMemo(() => {
        if (!result) return [];
        const colX = tableData.columns.find(c => c.id === selectedXId);
        const colY = tableData.columns.find(c => c.id === selectedYId);
        if (!colX || !colY) return [];

        const xValues = colX.values.map(v => parseFloat(v)).filter(v => !isNaN(v));
        const yValues = colY.values.map(v => parseFloat(v)).filter(v => !isNaN(v));
        const minLen = Math.min(xValues.length, yValues.length);
        
        const points = xValues.slice(0, minLen).map((x, i) => ({ x, y: yValues[i] }));
        
        const minX = Math.min(...xValues);
        const maxX = Math.max(...xValues);
        
        const linePoints = [
            { lineX: minX, lineY: result.intercept + result.slope * minX },
            { lineX: maxX, lineY: result.intercept + result.slope * maxX }
        ];

        return points.map((p, i) => ({
            ...p,
            ...(linePoints[i] || {})
        }));
    }, [result, tableData, selectedXId, selectedYId]);

    const generateAPAReport = () => {
        if (!result) return '';
        const sig = result.isSignificant ? "significantly predicted" : "did not significantly predict";
        return `A simple linear regression was calculated to predict ${result.labelY} based on ${result.labelX}. A significant regression equation was found (F(${result.anova.dfReg}, ${result.anova.dfRes}) = ${result.fStat.toFixed(2)}, p = ${result.pValue < .001 ? '.001' : result.pValue.toFixed(3)}), with an R² of ${result.rSquared.toFixed(3)}. Participants' predicted ${result.labelY} is equal to ${result.intercept.toFixed(2)} + ${result.slope.toFixed(2)} (${result.labelX}) when ${result.labelX} is measured in its respective units. ${result.labelX} ${sig} ${result.labelY}.`;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
            {/* Sidebar */}
            <div className="lg:col-span-4 xl:col-span-3 space-y-6">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 sticky top-24">
                    <div className="mb-6">
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="w-full p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 group hover:border-amber-300 hover:bg-amber-50/30 transition-all"
                        >
                            <FileSpreadsheet className="w-8 h-8 text-slate-300 group-hover:text-amber-400 transition-colors" />
                            <span className="text-xs font-bold text-slate-500 group-hover:text-amber-600">Open Data Spreadsheet</span>
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Predictor Variable (X)</label>
                            <div className="relative">
                                <select value={selectedXId} onChange={(e) => setSelectedXId(e.target.value)} className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 appearance-none outline-none">
                                    {tableData.columns.map(col => <option key={col.id} value={col.id}>{col.name}</option>)}
                                </select>
                                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Outcome Variable (Y)</label>
                            <div className="relative">
                                <select value={selectedYId} onChange={(e) => setSelectedYId(e.target.value)} className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 appearance-none outline-none">
                                    {tableData.columns.map(col => <option key={col.id} value={col.id}>{col.name}</option>)}
                                </select>
                                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                            </div>
                        </div>

                        <button onClick={handleCalculate} className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">Run Regression Engine</button>
                        {error && <div className="mt-4 p-3 bg-amber-50 text-amber-600 text-[11px] font-medium rounded-lg border border-amber-100">{error}</div>}
                    </div>

                    {result && (
                        <div className="mt-8 pt-6 border-t border-slate-100">
                             <div className="flex items-center gap-2 mb-4">
                                <Zap className="w-4 h-4 text-amber-600" />
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Outcome Predictor</h4>
                             </div>
                             <div className="space-y-3">
                                <div>
                                    <label className="text-[9px] font-bold text-slate-400 mb-1 block">Enter Predictor Value ({result.labelX})</label>
                                    <input 
                                        type="number" 
                                        value={predictionX} 
                                        onChange={e => setPredictionX(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                        placeholder="e.g. 5"
                                    />
                                </div>
                                {predictedY !== null && (
                                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 animate-in fade-in zoom-in-95 duration-300">
                                        <div className="text-[9px] font-bold text-amber-400 uppercase mb-1">Predicted {result.labelY}</div>
                                        <div className="text-2xl font-black text-amber-700">{predictedY.toFixed(3)}</div>
                                    </div>
                                )}
                             </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Results */}
            <div className="lg:col-span-8 xl:col-span-9 space-y-6">
                {result ? (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-2 mb-2">
                            <LineChart className="w-5 h-5 text-amber-600" />
                            <h2 className="text-lg font-bold text-slate-800">Linear Regression Report <span className="text-slate-400 font-normal ml-2">| Prediction Model</span></h2>
                        </div>

                        {/* Top Summary Dashboard */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
                                <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Model Confidence (R²)</div>
                                <div className="text-3xl font-black text-amber-600">{(result.rSquared * 100).toFixed(1)}%</div>
                                <div className="text-[10px] font-medium text-slate-400 mt-1">Variance Explained</div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
                                <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Significance</div>
                                <div className="text-3xl font-black text-slate-800">{result.pValue < .001 ? '< .001' : result.pValue.toFixed(3)}</div>
                                <div className={`text-[10px] font-bold mt-1 ${result.isSignificant ? 'text-emerald-500' : 'text-amber-500'}`}>{result.isSignificant ? 'VALID MODEL' : 'NON-SIGNIFICANT'}</div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center col-span-1 md:col-span-1">
                                <button onClick={handleAIAnalysis} disabled={aiAnalysis.isLoading} className="w-full h-full bg-amber-600 text-white font-bold rounded-xl shadow-lg flex flex-col items-center justify-center gap-2 disabled:opacity-70 group">
                                    <Wand2 className="w-6 h-6 group-hover:rotate-12 transition-transform" /> 
                                    <span>{aiAnalysis.isLoading ? 'Processing...' : 'Analyze'}</span>
                                </button>
                            </div>
                        </div>

                        <CalculationTrace type="regression" data={result} />

                        {/* Visualization */}
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Regression Line & Data Scatter</h3>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="x" type="number" tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} label={{ value: result.labelX, position: 'insideBottomRight', offset: -5, fontSize: 10, fontWeight: 700 }} />
                                        <YAxis type="number" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} label={{ value: result.labelY, angle: -90, position: 'insideLeft', fontSize: 10, fontWeight: 700 }} />
                                        <Tooltip cursor={{strokeDasharray: '3 3'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '11px'}} />
                                        <Scatter name="Observations" dataKey="y" fill="#f59e0b" fillOpacity={0.6} />
                                        <Line name="Best Fit Line" dataKey="lineY" stroke="#7c3aed" strokeWidth={3} dot={false} activeDot={false} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Model Statistics Tables */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xs font-bold text-slate-900 uppercase">Model Summary</h3>
                                    <button onClick={() => handleCopy('summary')} className={`p-1.5 rounded-md transition-all ${copied === 'summary' ? 'bg-amber-50 text-amber-600' : 'text-slate-400 hover:bg-slate-100'}`}>
                                        {copied === 'summary' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                                <table id="reg-summary" className="w-full text-xs text-left border-collapse border border-slate-400 font-sans text-slate-900 bg-white">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-400">
                                            <th className="p-2 text-center border-r border-slate-400">R</th>
                                            <th className="p-2 text-center border-r border-slate-400">R Square</th>
                                            <th className="p-2 text-center border-r border-slate-400">Adjusted R Square</th>
                                            <th className="p-2 text-center">Std. Error of Estimate</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="p-3 text-center border-r border-slate-400">{Math.abs(result.r).toFixed(3)}</td>
                                            <td className="p-3 text-center border-r border-slate-400 font-bold">{result.rSquared.toFixed(3)}</td>
                                            <td className="p-3 text-center border-r border-slate-400">{result.adjRSquared.toFixed(3)}</td>
                                            <td className="p-3 text-center">{result.stdErrorEstimate.toFixed(4)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xs font-bold text-slate-900 uppercase">ANOVA</h3>
                                    <button onClick={() => handleCopy('anova')} className={`p-1.5 rounded-md transition-all ${copied === 'anova' ? 'bg-amber-50 text-amber-600' : 'text-slate-400 hover:bg-slate-100'}`}>
                                        {copied === 'anova' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                                <table id="reg-anova" className="w-full text-xs text-left border-collapse border border-slate-400 font-sans text-slate-900 bg-white">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-400">
                                            <th className="p-2 border-r border-slate-400">Model</th>
                                            <th className="p-2 text-center border-r border-slate-400">Sum of Squares</th>
                                            <th className="p-2 text-center border-r border-slate-400">df</th>
                                            <th className="p-2 text-center border-r border-slate-400">F</th>
                                            <th className="p-2 text-center">Sig.</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-b border-slate-200">
                                            <td className="p-2 font-semibold border-r border-slate-400 bg-slate-50/50">Regression</td>
                                            <td className="p-2 text-center border-r border-slate-400">{result.anova.ssReg.toFixed(3)}</td>
                                            <td className="p-2 text-center border-r border-slate-400">{result.anova.dfReg}</td>
                                            <td className="p-2 text-center border-r border-slate-400 font-bold">{result.fStat.toFixed(3)}</td>
                                            <td className="p-2 text-center font-bold">{result.pValue < .001 ? '.001' : result.pValue.toFixed(3)}</td>
                                        </tr>
                                        <tr className="border-b border-slate-200">
                                            <td className="p-2 font-semibold border-r border-slate-400 bg-slate-50/50">Residual</td>
                                            <td className="p-2 text-center border-r border-slate-400">{result.anova.ssRes.toFixed(3)}</td>
                                            <td className="p-2 text-center border-r border-slate-400">{result.anova.dfRes}</td>
                                            <td colSpan={2}></td>
                                        </tr>
                                        <tr className="font-bold border-t-2 border-slate-400">
                                            <td className="p-2 border-r border-slate-400 bg-slate-50/50">Total</td>
                                            <td className="p-2 text-center border-r border-slate-400">{result.anova.ssTotal.toFixed(3)}</td>
                                            <td className="p-2 text-center border-r border-slate-400">{result.anova.dfTotal}</td>
                                            <td colSpan={2}></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Final Equation Block */}
                        <div className="bg-amber-900 text-amber-50 p-8 rounded-3xl shadow-xl flex flex-col items-center justify-center relative overflow-hidden">
                             <div className="absolute top-[-20px] left-[-20px] w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
                             <div className="text-[10px] font-bold text-amber-300 uppercase tracking-[0.2em] mb-4">Regression Equation</div>
                             <div className="text-3xl font-serif italic text-center leading-relaxed">
                                {result.labelY} = {result.intercept.toFixed(3)} + ({result.slope.toFixed(3)}) * {result.labelX}
                             </div>
                             <div className="mt-6 flex items-center gap-2 text-[10px] text-amber-400 font-bold">
                                <HelpCircle className="w-3 h-3" />
                                <span>Meaning: For every 1 unit increase in {result.labelX}, {result.labelY} is predicted to change by {result.slope.toFixed(3)} units.</span>
                             </div>
                        </div>

                        {/* APA Style Box */}
                        <div className="p-6 bg-amber-50/50 border border-amber-100 rounded-2xl shadow-sm">
                            <h4 className="text-sm font-semibold text-amber-900 mb-2 flex items-center gap-2">
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
                                <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-8 rounded-2xl shadow-sm border border-amber-100 relative overflow-hidden animate-in fade-in duration-700">
                                     <div className="relative z-10">
                                        <h3 className="text-xl font-bold text-amber-900 mb-6 flex items-center gap-2"><Wand2 className="w-6 h-6" /> AI ANALYTICAL PREDICTION</h3>
                                        <div className="prose prose-amber bg-white/70 p-8 rounded-xl max-w-none text-sm shadow-sm leading-relaxed"><ReactMarkdown>{aiAnalysis.result}</ReactMarkdown></div>
                                     </div>
                                </div>
                            )}
                         </div>
                    </div>
                ) : (
                    <div className="h-[600px] bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4"><LineChart className="w-8 h-8 text-amber-200" /></div>
                        <h3 className="text-xl font-bold text-slate-600 mb-2">Regression Analysis</h3>
                        <p className="max-w-md text-center text-slate-500 text-sm">Input your data into the spreadsheet and define which variable predicts the other to begin modeling.</p>
                    </div>
                )}
            </div>

            <DataModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} data={tableData} onDataChange={setTableData} />
        </div>
    );
};

export default RegressionView;
