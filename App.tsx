import React, { useState, ErrorInfo, ReactNode, Component } from 'react';
import { Calculator, BarChart3, TrendingUp, Sigma, ArrowRight, AlertTriangle, ShieldCheck, Target, Database, Info, Activity, LineChart, Grid3X3, Layers, Box, CheckCircle2 } from 'lucide-react';
import { ViewState } from './types';
import CorrelationView from './components/views/CorrelationView';
import AnovaView from './components/views/AnovaView';
import DescriptiveView from './components/views/DescriptiveView';
import ReliabilityView from './components/views/ReliabilityView';
import TTestView from './components/views/TTestView';
import RegressionView from './components/views/RegressionView';
import ChiSquareView from './components/views/ChiSquareView';
import MannWhitneyView from './components/views/MannWhitneyView';
import KruskalWallisView from './components/views/KruskalWallisView';
import NormalityView from './components/views/NormalityView';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-black p-4 font-sans text-white">
          <div className="bg-zinc-900 p-8 rounded-2xl shadow-2xl border border-white/10 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
               <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold mb-2">Unexpected Error</h2>
            <p className="text-zinc-400 mb-6 text-sm leading-relaxed">
              The application encountered an error. Please verify your data format or API configuration.
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-6 py-2.5 bg-white text-black text-sm font-bold rounded-lg hover:bg-zinc-200 transition-colors shadow-sm w-full"
            >
              Restart Analysis
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');

  const renderView = () => {
    switch (currentView) {
      case 'correlation': return <CorrelationView />;
      case 'anova': return <AnovaView />;
      case 'descriptive': return <DescriptiveView />;
      case 'reliability': return <ReliabilityView />;
      case 'ttest': return <TTestView />;
      case 'regression': return <RegressionView />;
      case 'chisquare': return <ChiSquareView />;
      case 'mannwhitney': return <MannWhitneyView />;
      case 'kruskalwallis': return <KruskalWallisView />;
      case 'normality': return <NormalityView />;
      default: return <Dashboard onViewSelect={setCurrentView} />;
    }
  };

  const getSubHeader = () => {
      switch(currentView) {
          case 'correlation': return 'Correlation Analysis';
          case 'anova': return 'Analysis of Variance';
          case 'descriptive': return 'Descriptive Statistics';
          case 'reliability': return 'Scale Reliability';
          case 'ttest': return 'T-Test Comparison';
          case 'regression': return 'Regression Modeling';
          case 'chisquare': return 'Categorical Association';
          case 'mannwhitney': return 'Mann-Whitney U Test';
          case 'kruskalwallis': return 'Kruskal-Wallis Test';
          case 'normality': return 'Assumption Verification';
          default: return '';
      }
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-black to-zinc-950 text-white pb-20 font-sans selection:bg-white/20">
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/50 border-b border-white/5">
          <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
            <button onClick={() => setCurrentView('dashboard')} className="flex items-center gap-3 group outline-none">
              <div className={`p-2 rounded-lg transition-all duration-300 ${currentView === 'dashboard' ? 'bg-white text-black scale-110 shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700 group-hover:text-white'}`}>
                <Calculator className="w-5 h-5" />
              </div>
              <div className="flex flex-col items-start">
                <h1 className="text-xl font-bold tracking-tight text-white leading-tight">StatSuite</h1>
                {currentView !== 'dashboard' && <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">{getSubHeader()}</span>}
              </div>
            </button>
            {currentView !== 'dashboard' && (
              <button 
                onClick={() => setCurrentView('dashboard')} 
                className="text-xs font-bold text-zinc-400 hover:text-white transition-colors border border-white/10 px-4 py-1.5 rounded-full hover:bg-white/5"
              >
                Return to Dashboard
              </button>
            )}
          </div>
        </header>

        <main className="max-w-[1600px] mx-auto px-6 py-8">
          {renderView()}
        </main>
        
        <footer className="py-12 mt-12 text-center text-xs text-zinc-600 border-t border-white/5">
          <p className="tracking-wide">© {new Date().getFullYear()} <span className="text-zinc-400 font-bold">StatSuite</span> • Statistical Research Tool • Developed by Richmond Jabla</p>
        </footer>
      </div>
    </ErrorBoundary>
  );
}

const Dashboard = ({ onViewSelect }: { onViewSelect: (v: ViewState) => void }) => {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="text-center max-w-3xl mx-auto mb-16 pt-12">
        <h2 className="text-5xl font-black text-white mb-6 tracking-tighter">Statistical Test Selection</h2>
        <p className="text-lg text-zinc-400 leading-relaxed font-light">Select the appropriate statistical procedure for your research hypothesis.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-[1500px] mx-auto">
        <div className="col-span-full mb-4">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] flex items-center gap-3">
                <span className="h-px flex-1 bg-white/5"></span>
                <Layers className="w-3 h-3" /> Preliminary Assumptions
                <span className="h-px flex-1 bg-white/5"></span>
            </h3>
        </div>

        <DashboardCard 
            title="Normality Test" 
            icon={<ShieldCheck className="w-6 h-6" />}
            objective="Verify distributional assumptions (KS-Test)."
            requirement="1 Continuous Variable."
            examples={["Check distribution shape", "Verify ANOVA criteria"]}
            onClick={() => onViewSelect('normality')}
            isSpecial
        />

        <DashboardCard 
            title="Pearson Correlation" 
            icon={<TrendingUp className="w-6 h-6" />}
            objective="Analyze relationship between variables."
            requirement="Two continuous scale variables."
            examples={["Height vs Weight", "Test scores vs GPA"]}
            onClick={() => onViewSelect('correlation')}
        />

        <DashboardCard 
            title="Linear Regression" 
            icon={<LineChart className="w-6 h-6" />}
            objective="Predict outcomes based on predictor data."
            requirement="1 Predictor (X) + 1 Outcome (Y)."
            examples={["Predict salary from experience", "Score forecasting"]}
            onClick={() => onViewSelect('regression')}
        />

        <DashboardCard 
            title="T-Test Comparison" 
            icon={<Activity className="w-6 h-6" />}
            objective="Compare means between two groups."
            requirement="1 Categorical (2 level) + 1 Scale variable."
            examples={["Group A vs Group B", "Pre-test vs Post-test"]}
            onClick={() => onViewSelect('ttest')}
        />

        <DashboardCard 
            title="One-Way ANOVA" 
            icon={<BarChart3 className="w-6 h-6" />}
            objective="Compare means across 3+ groups."
            requirement="1 Categorical (3+ level) + 1 Scale variable."
            examples={["Comparing multiple treatment types"]}
            onClick={() => onViewSelect('anova')}
        />

        <div className="col-span-full mt-12 mb-4">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] flex items-center gap-3">
                <span className="h-px flex-1 bg-white/5"></span>
                <Box className="w-3 h-3" /> Non-Parametric Procedures
                <span className="h-px flex-1 bg-white/5"></span>
            </h3>
        </div>

        <DashboardCard 
            title="Mann-Whitney U" 
            icon={<Layers className="w-6 h-6" />}
            objective="Compare non-normal groups (2-groups)."
            requirement="Non-normal ordinal or scale data."
            examples={["Comparing skewed ranks", "Ordinal ratings"]}
            onClick={() => onViewSelect('mannwhitney')}
        />

        <DashboardCard 
            title="Kruskal-Wallis" 
            icon={<Box className="w-6 h-6" />}
            objective="Compare non-normal groups (3+ groups)."
            requirement="Non-normal ordinal or scale data."
            examples={["Ranks across multiple conditions"]}
            onClick={() => onViewSelect('kruskalwallis')}
        />

        <DashboardCard 
            title="Chi-Square Analysis" 
            icon={<Grid3X3 className="w-6 h-6" />}
            objective="Test association between categories."
            requirement="2 Categorical nominal variables."
            examples={["Preference vs Occupation"]}
            onClick={() => onViewSelect('chisquare')}
        />

        <DashboardCard 
            title="Scale Reliability" 
            icon={<ShieldCheck className="w-6 h-6" />}
            objective="Analyze internal consistency (Alpha)."
            requirement="2+ Related scale items."
            examples={["Questionnaire consistency"]}
            onClick={() => onViewSelect('reliability')}
        />

        <DashboardCard 
            title="Descriptive Summary" 
            icon={<Sigma className="w-6 h-6" />}
            objective="Summarize sample characteristics."
            requirement="Any numeric or nominal data."
            examples={["Mean, Median, SD, Frequencies"]}
            onClick={() => onViewSelect('descriptive')}
        />
      </div>
    </div>
  );
};

const DashboardCard = ({ title, icon, objective, requirement, examples, onClick, isSpecial }: any) => {
    return (
        <button 
          onClick={onClick} 
          className={`group relative bg-zinc-900/40 backdrop-blur-xl p-8 rounded-3xl border ${isSpecial ? 'border-white/30 shadow-[0_0_30px_rgba(255,255,255,0.05)]' : 'border-white/5'} hover:border-white/40 hover:bg-zinc-800/50 hover:shadow-[0_0_40px_rgba(255,255,255,0.08)] transition-all duration-500 text-left flex flex-col h-full overflow-hidden`}
        >
           {isSpecial && <div className="absolute top-0 right-0 bg-white text-black px-4 py-1 text-[8px] font-black uppercase tracking-[0.2em] rounded-bl-xl">Foundational</div>}
           <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-8 bg-zinc-800 text-zinc-400 group-hover:bg-white group-hover:text-black group-hover:scale-110 transition-all duration-500 shadow-inner`}>
              {icon}
           </div>
           <h3 className="text-xl font-bold text-white mb-4 tracking-tight group-hover:translate-x-1 transition-transform">{title}</h3>
           <div className="space-y-5 mb-8">
             <div><p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-1">Objective</p><p className="text-xs text-zinc-300 font-medium leading-relaxed">{objective}</p></div>
             <div><p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-1">Data Requirements</p><p className="text-xs text-zinc-400 font-medium leading-relaxed">{requirement}</p></div>
             <div>
                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-1">Typical Applications</p>
                <ul className="text-[11px] text-zinc-500 space-y-1 mt-1 font-medium italic">
                   {examples.map((ex: string, i: number) => <li key={i} className="flex gap-2"><span>•</span>{ex}</li>)}
                </ul>
             </div>
           </div>
           <div className={`mt-auto flex items-center text-[10px] font-black uppercase tracking-[0.2em] gap-2 opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all duration-500 text-white`}>
             Open Analysis <ArrowRight className="w-3 h-3" />
           </div>
        </button>
    )
}

export default App;