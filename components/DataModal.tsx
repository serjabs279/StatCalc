import React from 'react';
import { X, Save, Trash2, FileSpreadsheet } from 'lucide-react';
import StatGrid from './StatGrid';
import { TableData, AnalysisMode } from '../types';

interface DataModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: TableData;
  onDataChange: (newData: TableData) => void;
  title?: string;
  mode?: AnalysisMode;
}

const DataModal: React.FC<DataModalProps> = ({ isOpen, onClose, data, onDataChange, title = "Data Spreadsheet", mode = 'advanced' }) => {
  if (!isOpen) return null;

  const handleClear = () => {
    if (confirm("Are you sure you want to clear all observation data?")) {
        const cleared = {
            columns: data.columns.map(c => ({ ...c, values: new Array(10).fill('') })),
            rowCount: 10
        };
        onDataChange(cleared);
    }
  };

  const modalTitle = mode === 'simple' ? "Bivariate Data Editor" : title;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose}></div>
      
      <div className="relative w-full max-w-6xl h-[85vh] bg-zinc-950 rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 bg-black/40 border-b border-white/5">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-white text-black rounded-2xl shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                <FileSpreadsheet className="w-5 h-5" />
             </div>
             <div>
                <h2 className="text-xl font-bold text-white tracking-tight">{modalTitle}</h2>
                <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-[0.1em]">
                  {mode === 'simple' ? "Variable Mapping: Variable X vs Variable Y" : "Standard Statistical Data Spreadsheet"}
                </p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-full transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 overflow-hidden bg-black/20">
           <StatGrid data={data} onChange={onDataChange} mode={mode} />
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-black/40 border-t border-white/5 flex items-center justify-between">
            <button onClick={handleClear} className="flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-red-400 hover:bg-red-400/10 rounded-xl transition-all">
                <Trash2 className="w-4 h-4" /> Clear Dataset
            </button>
            <div className="flex gap-4">
                <button onClick={onClose} className="px-8 py-2.5 text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                    Discard
                </button>
                <button onClick={onClose} className="flex items-center gap-2 px-10 py-2.5 bg-white hover:bg-zinc-200 text-black text-xs font-black uppercase tracking-widest rounded-xl shadow-2xl transition-all active:scale-95">
                    <Save className="w-4 h-4" /> Update Results
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default DataModal;