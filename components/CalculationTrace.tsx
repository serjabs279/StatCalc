import React, { useState } from 'react';
import { ChevronDown, BookOpen, Sigma, Hash, Zap, Info, PenTool, Activity, Layers, Box, Grid3X3, ArrowRight } from 'lucide-react';
import { StatisticsResult, AnovaResult, TTestResult, RegressionResult, ChiSquareResult, MannWhitneyResult, KruskalWallisResult, ReliabilityResult, NormalityResult, DescriptiveResult } from '../types';

interface CalculationTraceProps {
  type: 'correlation' | 'anova' | 'reliability' | 'descriptive' | 'ttest' | 'regression' | 'chisquare' | 'mannwhitney' | 'kruskalwallis' | 'normality';
  data: any;
}

const CalculationTrace: React.FC<CalculationTraceProps> = ({ type, data }) => {
  const [isOpen, setIsOpen] = useState(false);

  const StepHeader = ({ num, title, icon: Icon }: { num: number; title: string; icon: any }) => (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-7 h-7 rounded-lg bg-white text-black flex items-center justify-center text-[10px] font-black shrink-0 shadow-[0_0_10px_rgba(255,255,255,0.2)]">{num}</div>
      <h4 className="font-black text-white text-xs uppercase tracking-[0.2em] flex items-center gap-3">
        <Icon className="w-3.5 h-3.5 text-zinc-500" /> {title}
      </h4>
    </div>
  );

  const FormulaBlock = ({ formula, substitution, result, note }: { formula: string; substitution: string; result: string; note?: string }) => (
    <div className="space-y-4 mb-8 animate-in slide-in-from-left-4 duration-500">
      <div className="bg-zinc-950 border border-white/10 rounded-[1.5rem] overflow-hidden shadow-2xl">
        <div className="px-6 py-2.5 bg-white/5 border-b border-white/5 text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em]">Formula Breakdown</div>
        <div className="p-6 space-y-4">
          <div className="text-xs text-zinc-500 font-mono">Equation: <span className="text-white font-bold">{formula}</span></div>
          <div className="text-xs text-zinc-500 font-mono">Substitution: <span className="text-zinc-300 italic">{substitution}</span></div>
          <div className="pt-4 border-t border-white/5 flex items-baseline gap-3">
            <span className="text-[10px] font-black text-white uppercase tracking-widest">Calculated Value:</span>
            <span className="text-2xl font-black text-white tracking-tighter shadow-white/10 drop-shadow-xl">{result}</span>
          </div>
        </div>
      </div>
      {note && (
        <div className="flex gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-2xl">
          <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-zinc-400 leading-relaxed font-medium"><span className="text-white font-bold uppercase tracking-widest text-[9px]">Statistical Note:</span> {note}</p>
        </div>
      )}
    </div>
  );

  const renderCorrelationTrace = (stats: StatisticsResult) => {
    if (!stats.sums) return <div className="text-zinc-600 italic text-xs">Detailed calculations not available for this session.</div>;
    const { sumX, sumY, sumX2, sumY2, sumXY, ssX, ssY, spXY } = stats.sums;
    const n = stats.n;

    return (
      <div className="space-y-10 font-sans">
        <section>
          <StepHeader num={1} title="Descriptive Sums" icon={Hash} />
          <p className="text-xs text-zinc-500 mb-6 font-medium leading-relaxed">Calculating the fundamental sums of the paired variables and their squared values.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'ΣX', val: sumX }, { label: 'ΣY', val: sumY },
              { label: 'ΣX²', val: sumX2 }, { label: 'ΣY²', val: sumY2 },
              { label: 'ΣXY', val: sumXY }, { label: 'N', val: n }
            ].map(item => (
              <div key={item.label} className="bg-zinc-900 p-4 rounded-2xl border border-white/5 text-center shadow-inner">
                <div className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">{item.label}</div>
                <div className="text-sm font-black text-white">{item.val.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <StepHeader num={2} title="Sum of Squares (SS)" icon={Sigma} />
          <FormulaBlock 
            formula="SSx = ΣX² - [(ΣX)² / N]"
            substitution={`SSx = ${sumX2.toFixed(2)} - [(${sumX.toFixed(2)})² / ${n}]`}
            result={`SSx = ${ssX.toFixed(4)}`}
            note="Sum of Squares (SS) measures the total variability within a variable."
          />
          <FormulaBlock 
            formula="SSy = ΣY² - [(ΣY)² / N]"
            substitution={`SSy = ${sumY2.toFixed(2)} - [(${sumY.toFixed(2)})² / ${n}]`}
            result={`SSy = ${ssY.toFixed(4)}`}
          />
        </section>

        <section>
          <StepHeader num={3} title="Sum of Products (SP)" icon={Activity} />
          <FormulaBlock 
            formula="SPxy = ΣXY - [(ΣX * ΣY) / N]"
            substitution={`SPxy = ${sumXY.toFixed(2)} - [(${sumX.toFixed(2)} * ${sumY.toFixed(2)}) / ${n}]`}
            result={`SPxy = ${spXY.toFixed(4)}`}
            note="Sum of Products (SP) represents the shared variability between the two variables."
          />
        </section>

        <section>
          <StepHeader num={4} title="Pearson Coefficient Synthesis" icon={Zap} />
          <div className="bg-white text-black p-10 rounded-[3rem] shadow-[0_0_50px_rgba(255,255,255,0.15)] space-y-8 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-5"><PenTool className="w-40 h-40 text-black" /></div>
             <div className="text-center space-y-3">
                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em]">Correlation Formula</div>
                <div className="text-3xl font-black tracking-tighter text-black">r = SPxy / √(SSx * SSy)</div>
             </div>
             <div className="p-8 bg-black/5 rounded-[2rem] border border-black/5 space-y-6">
                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Numerical Calculation:</div>
                <div className="text-xl font-mono font-bold tracking-tight text-black italic">
                  r = {spXY.toFixed(3)} / √({ssX.toFixed(3)} * {ssY.toFixed(3)})
                </div>
                <div className="pt-8 border-t border-black/10 flex flex-col items-center">
                    <span className="text-[11px] font-black uppercase text-zinc-400 tracking-[0.2em] mb-2">Pearson Result</span>
                    <div className="text-7xl font-black tracking-tighter text-black">r = {stats.r.toFixed(4)}</div>
                </div>
             </div>
             <p className="text-[11px] text-zinc-500 text-center font-bold uppercase tracking-widest italic">Standard Range: [-1.00 to +1.00]</p>
          </div>
        </section>
      </div>
    );
  };

  const renderAnovaTrace = (res: AnovaResult) => {
    return (
      <div className="space-y-10 font-sans">
        <section>
          <StepHeader num={1} title="Group-Wise Descriptives" icon={Hash} />
          <p className="text-xs text-zinc-500 mb-6 font-medium leading-relaxed">Processing individual group summations and variance components.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {res.groups.map((g, i) => (
              <div key={i} className="bg-zinc-900 p-4 rounded-2xl border border-white/5 shadow-inner">
                <div className="text-[10px] font-black text-white uppercase tracking-widest mb-2 border-b border-white/5 pb-2">{g.name}</div>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div className="text-zinc-600">ΣX: <span className="text-zinc-300">{g.sum.toFixed(2)}</span></div>
                  <div className="text-zinc-600">N: <span className="text-zinc-300">{g.n}</span></div>
                  <div className="text-zinc-600">Mean: <span className="text-zinc-300">{g.mean.toFixed(3)}</span></div>
                  <div className="text-zinc-600">SS: <span className="text-zinc-300">{g.ss.toFixed(3)}</span></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <StepHeader num={2} title="Between-Groups Variance" icon={Sigma} />
          <FormulaBlock 
            formula="SSB = Σ [ni * (Mi - GrandMean)²]"
            substitution={`SSB = ${res.groups.map(g => `${g.n} * (${g.mean.toFixed(2)} - ${res.grandMean.toFixed(2)})²`).join(' + ')}`}
            result={`SSB = ${res.ssBetween.toFixed(4)}`}
            note="SSB captures the spread between group means, weighted by sample size."
          />
        </section>

        <section>
          <StepHeader num={3} title="Within-Groups Variance" icon={Layers} />
          <FormulaBlock 
            formula="SSW = Σ SSi"
            substitution={`SSW = ${res.groups.map(g => g.ss.toFixed(2)).join(' + ')}`}
            result={`SSW = ${res.ssWithin.toFixed(4)}`}
            note="SSW represents the 'error' or variation within each group around its own mean."
          />
        </section>

        <section>
          <StepHeader num={4} title="F-Ratio Integration" icon={Zap} />
          <div className="bg-white text-black p-10 rounded-[3rem] shadow-[0_0_50px_rgba(255,255,255,0.15)] space-y-8 relative overflow-hidden">
             <div className="text-center space-y-3">
                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em]">F-Statistic Formula</div>
                <div className="text-3xl font-black tracking-tighter text-black">F = (SSB / dfB) / (SSW / dfW)</div>
             </div>
             <div className="p-8 bg-black/5 rounded-[2rem] border border-black/5 space-y-6">
                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Numerical Calculation:</div>
                <div className="text-xl font-mono font-bold tracking-tight text-black italic">
                  F = ({res.msBetween.toFixed(3)}) / ({res.msWithin.toFixed(3)})
                </div>
                <div className="pt-8 border-t border-black/10 flex flex-col items-center">
                    <span className="text-[11px] font-black uppercase text-zinc-400 tracking-[0.2em] mb-2">Omnibus F-Result</span>
                    <div className="text-7xl font-black tracking-tighter text-black">F = {res.fStat.toFixed(4)}</div>
                </div>
             </div>
          </div>
        </section>
      </div>
    );
  };

  const renderTTestTrace = (res: TTestResult) => {
    return (
      <div className="space-y-10 font-sans">
        <section>
          <StepHeader num={1} title="Mean Comparison" icon={Hash} />
          <p className="text-xs text-zinc-500 mb-6 font-medium leading-relaxed">Calculating the difference between sample means.</p>
          <FormulaBlock 
            formula="Diff = M1 - M2"
            substitution={`Diff = ${res.group1.mean.toFixed(3)} - ${res.group2.mean.toFixed(3)}`}
            result={`Diff = ${res.meanDifference.toFixed(4)}`}
          />
        </section>

        <section>
          <StepHeader num={2} title="Error Quantification" icon={Activity} />
          <p className="text-xs text-zinc-500 mb-6 font-medium leading-relaxed">Deriving the Standard Error of the difference.</p>
          <FormulaBlock 
            formula="SE_diff = √(Var1/n1 + Var2/n2)"
            substitution={`SE_diff = √(${res.group1.stdDev.toFixed(2)}²/${res.group1.n} + ${res.group2.stdDev.toFixed(2)}²/${res.group2.n})`}
            result={`SE_diff = ${res.stdErrorDifference.toFixed(4)}`}
            note="Standard Error estimates the expected chance variation between sample means."
          />
        </section>

        <section>
          <StepHeader num={3} title="T-Statistic Synthesis" icon={Zap} />
          <div className="bg-white text-black p-10 rounded-[3rem] shadow-[0_0_50px_rgba(255,255,255,0.15)] space-y-8 relative overflow-hidden">
             <div className="text-center space-y-3">
                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em]">T-Ratio Formula</div>
                <div className="text-3xl font-black tracking-tighter text-black">t = (M1 - M2) / SE_diff</div>
             </div>
             <div className="p-8 bg-black/5 rounded-[2rem] border border-black/5 space-y-6">
                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Numerical Calculation:</div>
                <div className="text-xl font-mono font-bold tracking-tight text-black italic">
                  t = {res.meanDifference.toFixed(3)} / {res.stdErrorDifference.toFixed(3)}
                </div>
                <div className="pt-8 border-t border-black/10 flex flex-col items-center">
                    <span className="text-[11px] font-black uppercase text-zinc-400 tracking-[0.2em] mb-2">Independent T-Result</span>
                    <div className="text-7xl font-black tracking-tighter text-black">t = {res.tStat.toFixed(4)}</div>
                </div>
             </div>
          </div>
        </section>
      </div>
    );
  };

  const renderRegressionTrace = (res: RegressionResult) => {
    const { sumX, sumY, sumX2, sumXY, ssX, spXY } = res.sums;
    return (
      <div className="space-y-10 font-sans">
        <section>
          <StepHeader num={1} title="Parameter Estimation" icon={Sigma} />
          <p className="text-xs text-zinc-500 mb-6 font-medium leading-relaxed">Calculating the Least-Squares slope coefficient (β).</p>
          <FormulaBlock 
            formula="b = SPxy / SSx"
            substitution={`b = ${spXY.toFixed(2)} / ${ssX.toFixed(2)}`}
            result={`b (Slope) = ${res.slope.toFixed(4)}`}
            note="The slope represents the predicted change in Y for every 1-unit increase in X."
          />
        </section>

        <section>
          <StepHeader num={2} title="Intercept Derivation" icon={Layers} />
          <p className="text-xs text-zinc-500 mb-6 font-medium leading-relaxed">Solving for the constant Y-intercept (α).</p>
          <FormulaBlock 
            formula="a = My - (b * Mx)"
            substitution={`a = ${(sumY/res.n).toFixed(2)} - (${res.slope.toFixed(3)} * ${(sumX/res.n).toFixed(2)})`}
            result={`a (Intercept) = ${res.intercept.toFixed(4)}`}
          />
        </section>

        <section>
          <StepHeader num={3} title="Model Synthesis" icon={Zap} />
          <div className="bg-white text-black p-10 rounded-[3rem] shadow-[0_0_50px_rgba(255,255,255,0.15)] space-y-8 relative overflow-hidden">
             <div className="text-center space-y-3">
                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em]">Regression Equation</div>
                <div className="text-3xl font-black tracking-tighter text-black">Ŷ = a + bX</div>
             </div>
             <div className="p-8 bg-black/5 rounded-[2rem] border border-black/5 space-y-6">
                <div className="text-center">
                    <span className="text-[11px] font-black uppercase text-zinc-400 tracking-[0.2em] mb-4 block">Final Prediction Model</span>
                    <div className="text-4xl font-mono font-black tracking-tight italic text-black">
                      Ŷ = {res.intercept.toFixed(3)} + ({res.slope.toFixed(3)})X
                    </div>
                </div>
             </div>
             <p className="text-[11px] text-zinc-500 text-center font-bold uppercase tracking-widest italic">Goodness of Fit (R²): {res.rSquared.toFixed(4)}</p>
          </div>
        </section>
      </div>
    );
  };

  const renderChiSquareTrace = (res: ChiSquareResult) => {
    return (
      <div className="space-y-10 font-sans">
        <section>
          <StepHeader num={1} title="Expected Frequencies" icon={Grid3X3} />
          <p className="text-xs text-zinc-500 mb-6 font-medium leading-relaxed">Calculating the frequency expected under the Null Hypothesis (No association).</p>
          <FormulaBlock 
            formula="E = (RowTotal * ColTotal) / GrandTotal"
            substitution={`Example: (${res.rowTotals[0]} * ${res.colTotals[0]}) / ${res.grandTotal}`}
            result={`E[1,1] = ${res.expected[0][0].toFixed(2)}`}
            note="Expected frequencies represent a distribution of absolute independence."
          />
        </section>

        <section>
          <StepHeader num={2} title="Deviation Summation" icon={Sigma} />
          <p className="text-xs text-zinc-500 mb-6 font-medium leading-relaxed">Summing squared differences between observed (O) and expected (E) counts.</p>
          <FormulaBlock 
            formula="χ² = Σ [ (O - E)² / E ]"
            substitution={`χ² = (${res.observed[0][0]} - ${res.expected[0][0].toFixed(1)})² / ${res.expected[0][0].toFixed(1)} + ...`}
            result={`χ² = ${res.chiSquare.toFixed(4)}`}
          />
        </section>

        <section>
          <StepHeader num={3} title="Significance Synthesis" icon={Zap} />
          <div className="bg-white text-black p-10 rounded-[3rem] shadow-[0_0_50px_rgba(255,255,255,0.15)] space-y-8 relative overflow-hidden">
             <div className="text-center">
                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] mb-4">Independence Result</div>
                <div className="text-7xl font-black tracking-tighter text-black">χ² = {res.chiSquare.toFixed(3)}</div>
                <div className="mt-4 text-[11px] font-bold text-zinc-500 uppercase tracking-widest italic">Degrees of Freedom (df): {res.df}</div>
             </div>
          </div>
        </section>
      </div>
    );
  };

  const renderDescriptiveTrace = (res: DescriptiveResult) => {
    if (res.type === 'categorical') return <div className="text-zinc-500 italic text-xs py-10 text-center uppercase tracking-widest font-black">Categorical trace simplified to frequency mapping...</div>;
    return (
      <div className="space-y-10 font-sans">
        <section>
          <StepHeader num={1} title="Central Tendency" icon={Hash} />
          <FormulaBlock 
            formula="Mean (M) = ΣX / N"
            substitution={`M = ${res.sumX?.toFixed(2)} / ${res.n}`}
            result={`M = ${res.mean?.toFixed(4)}`}
          />
        </section>

        <section>
          <StepHeader num={2} title="Unbiased Variance" icon={Sigma} />
          <FormulaBlock 
            formula="s² = SS / (N - 1)"
            substitution={`s² = ${res.ss?.toFixed(2)} / (${res.n} - 1)`}
            result={`s² = ${res.variance?.toFixed(4)}`}
            note="N-1 (Bessel's correction) is used to provide an unbiased estimate of population variance."
          />
        </section>

        <section>
          <StepHeader num={3} title="Standard Deviation" icon={Zap} />
          <div className="bg-white text-black p-10 rounded-[3rem] shadow-[0_0_50px_rgba(255,255,255,0.15)] space-y-8 relative overflow-hidden">
             <div className="text-center">
                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] mb-4">Dispersion Metric</div>
                <div className="text-7xl font-black tracking-tighter italic text-black">SD = {res.stdDev?.toFixed(4)}</div>
                <div className="mt-4 text-[11px] font-bold text-zinc-500 uppercase tracking-widest italic">√Variance</div>
             </div>
          </div>
        </section>
      </div>
    );
  };

  const renderMannWhitneyTrace = (res: MannWhitneyResult) => {
    return (
      <div className="space-y-10 font-sans">
        <section>
          <StepHeader num={1} title="Rank Integration" icon={Hash} />
          <p className="text-xs text-zinc-500 mb-6 font-medium leading-relaxed">Summing the relative ranks for each independent group.</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900 p-4 rounded-2xl border border-white/5 shadow-inner text-center">
              <div className="text-[9px] font-black text-zinc-600 uppercase mb-1">{res.group1.name} RankSum</div>
              <div className="text-xl font-black text-white">{res.group1.rankSum.toFixed(1)}</div>
            </div>
            <div className="bg-zinc-900 p-4 rounded-2xl border border-white/5 shadow-inner text-center">
              <div className="text-[9px] font-black text-zinc-600 uppercase mb-1">{res.group2.name} RankSum</div>
              <div className="text-xl font-black text-white">{res.group2.rankSum.toFixed(1)}</div>
            </div>
          </div>
        </section>

        <section>
          <StepHeader num={2} title="U-Statistic Derivation" icon={Sigma} />
          <FormulaBlock 
            formula="U = n1*n2 + [n1*(n1+1)/2] - R1"
            substitution={`U = ${res.group1.n} * ${res.group2.n} + [${res.group1.n} * (${res.group1.n} + 1) / 2] - ${res.group1.rankSum.toFixed(1)}`}
            result={`U = ${res.uStat.toFixed(2)}`}
            note="U measures the degree of overlap between the two rank distributions."
          />
        </section>

        <section>
          <StepHeader num={3} title="Normal Approximation" icon={Zap} />
          <div className="bg-white text-black p-10 rounded-[3rem] shadow-[0_0_50px_rgba(255,255,255,0.15)] space-y-8 relative overflow-hidden">
             <div className="text-center">
                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] mb-4 text-zinc-400">Standardized Z-Score</div>
                <div className="text-7xl font-black tracking-tighter italic text-black">z = {res.zStat.toFixed(4)}</div>
             </div>
          </div>
        </section>
      </div>
    );
  };

  const renderKruskalWallisTrace = (res: KruskalWallisResult) => {
    return (
      <div className="space-y-10 font-sans">
        <section>
          <StepHeader num={1} title="Mean Rank Mapping" icon={Hash} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {res.groups.map((g, i) => (
              <div key={i} className="bg-zinc-900 p-4 rounded-2xl border border-white/5 text-center">
                <div className="text-[9px] font-black text-zinc-600 uppercase mb-1">{g.name}</div>
                <div className="text-lg font-black text-white">{g.meanRank.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <StepHeader num={2} title="H-Statistic Integration" icon={Sigma} />
          <FormulaBlock 
            formula="H = [12 / N(N+1)] * Σ(Ri² / ni) - 3(N+1)"
            substitution={`H = [12 / (${res.totalN} * (${res.totalN} + 1))] * Σ(RankSum²/n) - 3 * (${res.totalN} + 1)`}
            result={`H = ${res.hStat.toFixed(4)}`}
            note="The H-statistic tests whether samples originate from the same distribution based on ranks."
          />
        </section>

        <section>
          <StepHeader num={3} title="Non-Parametric Synthesis" icon={Zap} />
          <div className="bg-white text-black p-10 rounded-[3rem] shadow-[0_0_50px_rgba(255,255,255,0.15)] space-y-8 relative overflow-hidden">
             <div className="text-center">
                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] mb-4">Final H-Result</div>
                <div className="text-7xl font-black tracking-tighter text-black">H = {res.hStat.toFixed(3)}</div>
                <div className="mt-4 text-[11px] font-bold text-zinc-500 uppercase tracking-widest italic">Degrees of Freedom: {res.df}</div>
             </div>
          </div>
        </section>
      </div>
    );
  };

  const renderReliabilityTrace = (res: ReliabilityResult) => {
    const colorClass = res.alpha >= 0.8 ? 'emerald' : res.alpha >= 0.7 ? 'amber' : 'rose';
    
    return (
      <div className="space-y-10 font-sans">
        <section>
          <StepHeader num={1} title="Item Count Assessment" icon={Box} />
          <p className="text-xs text-zinc-500 mb-6 font-medium leading-relaxed">Identifying the number of items included in the reliability analysis.</p>
          <div className="bg-zinc-900 p-6 rounded-2xl border border-white/5 inline-block min-w-[200px] shadow-inner text-center">
            <div className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Number of Items (k)</div>
            <div className="text-3xl font-black text-white">{res.nItems}</div>
          </div>
        </section>

        <section>
          <StepHeader num={2} title="Item Variance Summation" icon={Sigma} />
          <p className="text-xs text-zinc-500 mb-6 font-medium leading-relaxed">Summing the individual variances of each scale component.</p>
          <FormulaBlock 
            formula="Σs²i = s²1 + s²2 + ... + s²k"
            substitution={`Σs²i = ${res.items.slice(0, 5).map(i => i.variance.toFixed(3)).join(' + ')}${res.items.length > 5 ? ' ...' : ''}`}
            result={`Σs²i = ${res.sumItemVariances.toFixed(4)}`}
            note="Item variance represents the individual score dispersion for each scale item."
          />
        </section>

        <section>
          <StepHeader num={3} title="Total Scale Variance" icon={Layers} />
          <p className="text-xs text-zinc-500 mb-6 font-medium leading-relaxed">Calculating the variance of the summed total scores across the sample.</p>
          <FormulaBlock 
            formula="s²t = Total Composite Variance"
            substitution={`s²t = ${res.totalVariance.toFixed(4)}`}
            result={`s²t = ${res.totalVariance.toFixed(4)}`}
          />
        </section>

        <section>
          <StepHeader num={4} title="Cronbach's Alpha Synthesis" icon={Zap} />
          <div className="bg-white text-black p-10 rounded-[3rem] shadow-[0_0_50px_rgba(255,255,255,0.15)] space-y-8 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-5"><PenTool className="w-40 h-40 text-black" /></div>
             <div className="text-center space-y-3">
                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em]">Internal Consistency</div>
                <div className="text-3xl font-black tracking-tighter text-black">α = (k / (k - 1)) * [1 - (Σs²i / s²t)]</div>
             </div>
             <div className={`p-8 bg-black/5 rounded-[2rem] border border-black/5 space-y-6 transition-colors duration-700 ${colorClass === 'emerald' ? 'border-emerald-500/10' : colorClass === 'amber' ? 'border-amber-500/10' : 'border-rose-500/10'}`}>
                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Numerical Calculation:</div>
                <div className="text-xl font-mono font-bold tracking-tight italic text-black">
                  α = ({res.nItems} / {res.nItems - 1}) * [1 - ({res.sumItemVariances.toFixed(3)} / {res.totalVariance.toFixed(3)})]
                </div>
                <div className="pt-8 border-t border-black/10 flex flex-col items-center">
                    <span className="text-[11px] font-black uppercase text-zinc-400 tracking-[0.2em] mb-2">Alpha Coefficient</span>
                    <div className={`text-7xl font-black tracking-tighter transition-colors duration-700 ${colorClass === 'emerald' ? 'text-emerald-600' : colorClass === 'amber' ? 'text-amber-600' : 'text-rose-600'}`}>α = {res.alpha.toFixed(4)}</div>
                </div>
             </div>
          </div>
        </section>
      </div>
    );
  };

  const renderNormalityTrace = (res: NormalityResult) => {
    return (
      <div className="space-y-10 font-sans">
        <section>
          <StepHeader num={1} title="Empirical Distribution" icon={Activity} />
          <p className="text-xs text-zinc-500 mb-6 font-medium leading-relaxed">Sorting observations to define the empirical cumulative distribution function (ECDF).</p>
          <div className="bg-zinc-900 p-6 rounded-2xl border border-white/5 inline-block min-w-[200px] shadow-inner text-center">
            <div className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Sample Size (N)</div>
            <div className="text-3xl font-black text-white">{res.n}</div>
          </div>
        </section>

        <section>
          <StepHeader num={2} title="Theoretical Gaussian Comparison" icon={Sigma} />
          <p className="text-xs text-zinc-500 mb-6 font-medium leading-relaxed">Comparing sample points to the theoretical normal distribution based on M={res.mean.toFixed(2)} and SD={res.stdDev.toFixed(2)}.</p>
          <FormulaBlock 
            formula="Z = (X - μ) / σ"
            substitution={`Z = (Observed - ${res.mean.toFixed(2)}) / ${res.stdDev.toFixed(2)}`}
            result={`μ=${res.mean.toFixed(3)}, σ=${res.stdDev.toFixed(3)}`}
            note="Z-scores standardize the data for comparison against the idealized normal curve."
          />
        </section>

        <section>
          <StepHeader num={3} title="KS Distance Calculation" icon={Zap} />
          <p className="text-xs text-zinc-500 mb-6 font-medium leading-relaxed">Identifying the maximum absolute difference (D) between the sample and theoretical distribution.</p>
          <FormulaBlock 
            formula="D = max | F_n(x) - F(x) |"
            substitution={`D = Maximum absolute deviation found at sample points`}
            result={`D = ${res.ksStat.toFixed(4)}`}
            note="The KS Statistic (D) quantifies the degree of deviation from normality."
          />
        </section>

        <section>
          <StepHeader num={4} title="Probability Synthesis" icon={Layers} />
          <div className="bg-white text-black p-10 rounded-[3rem] shadow-[0_0_50px_rgba(255,255,255,0.15)] space-y-8 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-5"><PenTool className="w-40 h-40 text-black" /></div>
             <div className="text-center space-y-3">
                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em]">Significance Testing</div>
                <div className="text-3xl font-black tracking-tighter italic text-black">p-value derivation</div>
             </div>
             <div className={`p-8 bg-black/5 rounded-[2rem] border border-black/5 space-y-6 transition-colors duration-700 ${res.pValue > 0.05 ? 'border-emerald-500/10' : 'border-rose-500/10'}`}>
                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Significance Level:</div>
                <div className="text-xl font-mono font-bold tracking-tight text-black">
                  D({res.n}) = {res.ksStat.toFixed(4)}
                </div>
                <div className="pt-8 border-t border-black/10 flex flex-col items-center">
                    <span className="text-[11px] font-black uppercase text-zinc-400 tracking-[0.2em] mb-2">Calculated p-value</span>
                    <div className={`text-7xl font-black tracking-tighter ${res.pValue > 0.05 ? 'text-emerald-600' : 'text-rose-600'}`}>p = {res.pValue.toFixed(4)}</div>
                </div>
             </div>
             <p className="text-[11px] text-zinc-500 text-center font-bold uppercase tracking-widest italic">Alpha (α) = 0.05 threshold applied for verification.</p>
          </div>
        </section>
      </div>
    );
  };

  return (
    <div className="mt-8 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl transition-all duration-700 hover:shadow-[0_0_50px_rgba(255,255,255,0.03)] bg-zinc-950/30 backdrop-blur-md">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className={`w-full flex items-center justify-between px-8 py-6 transition-all duration-500 ${isOpen ? 'bg-white/5' : 'hover:bg-white/[0.02]'}`}
      >
        <div className="flex items-center gap-6">
          <div className={`p-4 rounded-2xl transition-all duration-500 shadow-inner ${isOpen ? 'bg-white text-black scale-110 shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'bg-zinc-800 text-zinc-500'}`}>
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h3 className="text-base font-black text-white tracking-tight uppercase">MATHEMATICAL EQUATION TRACE</h3>
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mt-1">STEP-BY-STEP COMPUTATIONAL BREAKDOWN</p>
          </div>
        </div>
        <div className={`transition-all duration-700 ${isOpen ? 'rotate-180 text-white' : 'text-zinc-600'}`}>
          <ChevronDown className="w-8 h-8" />
        </div>
      </button>
      {isOpen && (
        <div className="p-10 bg-black/40 border-t border-white/5 animate-in slide-in-from-top-6 duration-700 max-h-[80vh] overflow-y-auto custom-scrollbar">
           {type === 'correlation' && renderCorrelationTrace(data)}
           {type === 'reliability' && renderReliabilityTrace(data)}
           {type === 'normality' && renderNormalityTrace(data)}
           {type === 'anova' && renderAnovaTrace(data)}
           {type === 'ttest' && renderTTestTrace(data)}
           {type === 'regression' && renderRegressionTrace(data)}
           {type === 'chisquare' && renderChiSquareTrace(data)}
           {type === 'descriptive' && renderDescriptiveTrace(data)}
           {type === 'mannwhitney' && renderMannWhitneyTrace(data)}
           {type === 'kruskalwallis' && renderKruskalWallisTrace(data)}
           <div className="mt-16 pt-8 border-t border-white/5 text-[9px] text-zinc-700 font-black uppercase tracking-[0.4em] text-center">Verified Statistical Trace • StatSuite 1.0</div>
        </div>
      )}
    </div>
  );
};

export default CalculationTrace;