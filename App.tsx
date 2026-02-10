import React, { useState, Component, ErrorInfo, ReactNode } from 'react';
import { Calculator, BarChart3, TrendingUp, Sigma, ArrowRight, AlertTriangle, ShieldCheck } from 'lucide-react';
import { ViewState } from './types';
import CorrelationView from './components/views/CorrelationView';
import AnovaView from './components/views/AnovaView';
import DescriptiveView from './components/views/DescriptiveView';
import ReliabilityView from './components/views/ReliabilityView';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
          <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
               <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h2>
            <p className="text-slate-600 mb-6 text-sm leading-relaxed">
              The application encountered an unexpected error. This is often due to a missing API key or a momentary glitch.
            </p>
            {this.state.error && (
              <div className="text-xs text-left bg-slate-100 p-4 rounded-lg mb-6 overflow-auto max-h-40 border border-slate-200 font-mono text-red-600">
                {this.state.error.toString()}
              </div>
            )}
            <button 
              onClick={() => window.location.reload()} 
              className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm w-full"
            >
              Reload Application
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
      default: return <Dashboard onViewSelect={setCurrentView} />;
    }
  };

  const getSubHeader = () => {
      switch(currentView) {
          case 'correlation': return 'Correlation';
          case 'anova': return 'ANOVA';
          case 'descriptive': return 'Descriptives';
          case 'reliability': return 'Reliability';
          default: return '';
      }
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 font-sans">
        {/* Global Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm/50 backdrop-blur-md bg-white/90">
          <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
            <button 
              onClick={() => setCurrentView('dashboard')}
              className="flex items-center gap-2 group outline-none"
            >
              <div className={`p-2 rounded-lg transition-colors ${currentView === 'dashboard' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                <Calculator className="w-5 h-5" />
              </div>
              <div className="flex flex-col items-start">
                <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent leading-tight">
                  StatSuite
                </h1>
                {currentView !== 'dashboard' && (
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {getSubHeader()}
                  </span>
                )}
              </div>
            </button>
            
            {currentView !== 'dashboard' && (
               <button 
                 onClick={() => setCurrentView('dashboard')}
                 className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
               >
                 Back to Dashboard
               </button>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <main className="max-w-[1600px] mx-auto px-6 py-8">
          {renderView()}
        </main>
        
        {/* Global Footer */}
        <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-sm text-slate-400">
          <p>© {new Date().getFullYear()} StatSuite. Powered by Gemini & JuliusAI. Coded by richmondjabla</p>
        </footer>
      </div>
    </ErrorBoundary>
  );
}

const Dashboard = ({ onViewSelect }: { onViewSelect: (v: ViewState) => void }) => {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center max-w-2xl mx-auto mb-16 pt-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">Advanced Statistical Analysis Made Simple</h2>
        <p className="text-lg text-slate-600 leading-relaxed">
          Select an analytical tool to begin. All tools feature AI-powered interpretation, APA style reporting, and export-ready visualizations.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 max-w-7xl mx-auto">
        {/* Correlation Card */}
        <button 
          onClick={() => onViewSelect('correlation')}
          className="group bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-indigo-200 transition-all duration-300 text-left flex flex-col relative overflow-hidden h-full"
        >
           <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><TrendingUp className="w-32 h-32" /></div>
           <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-6 h-6" />
           </div>
           <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-700 transition-colors">Correlation Analyst</h3>
           <p className="text-slate-500 text-sm leading-relaxed mb-6">
             Calculate Pearson's r and Spearman's rho. Features simple bivariate analysis and advanced hybrid construct strategy.
           </p>
           <div className="mt-auto flex items-center text-sm font-bold text-indigo-600 gap-1 opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all">
             Open Tool <ArrowRight className="w-4 h-4" />
           </div>
        </button>

        {/* ANOVA Card */}
        <button 
          onClick={() => onViewSelect('anova')}
          className="group bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-emerald-200 transition-all duration-300 text-left flex flex-col relative overflow-hidden h-full"
        >
           <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><BarChart3 className="w-32 h-32" /></div>
           <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <BarChart3 className="w-6 h-6" />
           </div>
           <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-emerald-700 transition-colors">Group Comparison</h3>
           <p className="text-slate-500 text-sm leading-relaxed mb-6">
             One-Way ANOVA testing for comparing means across 3+ groups. Includes Post-hoc logic and significance reporting.
           </p>
           <div className="mt-auto flex items-center text-sm font-bold text-emerald-600 gap-1 opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all">
             Open Tool <ArrowRight className="w-4 h-4" />
           </div>
        </button>

        {/* Descriptive Card */}
        <button 
          onClick={() => onViewSelect('descriptive')}
          className="group bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-pink-200 transition-all duration-300 text-left flex flex-col relative overflow-hidden h-full"
        >
           <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Sigma className="w-32 h-32" /></div>
           <div className="w-12 h-12 bg-pink-50 text-pink-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Sigma className="w-6 h-6" />
           </div>
           <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-pink-700 transition-colors">Descriptive Stats</h3>
           <p className="text-slate-500 text-sm leading-relaxed mb-6">
             Analyze frequencies for categorical data or central tendency (Mean, Median, SD) and distribution for continuous data.
           </p>
           <div className="mt-auto flex items-center text-sm font-bold text-pink-600 gap-1 opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all">
             Open Tool <ArrowRight className="w-4 h-4" />
           </div>
        </button>

        {/* Reliability Card */}
        <button 
          onClick={() => onViewSelect('reliability')}
          className="group bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-cyan-200 transition-all duration-300 text-left flex flex-col relative overflow-hidden h-full"
        >
           <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><ShieldCheck className="w-32 h-32" /></div>
           <div className="w-12 h-12 bg-cyan-50 text-cyan-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
           </div>
           <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-cyan-700 transition-colors">Reliability Analysis</h3>
           <p className="text-slate-500 text-sm leading-relaxed mb-6">
             Assess scale consistency using Cronbach's Alpha. Includes "Alpha if Item Deleted" to identify problematic items.
           </p>
           <div className="mt-auto flex items-center text-sm font-bold text-cyan-600 gap-1 opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all">
             Open Tool <ArrowRight className="w-4 h-4" />
           </div>
        </button>
      </div>
    </div>
  );
};

export default App;