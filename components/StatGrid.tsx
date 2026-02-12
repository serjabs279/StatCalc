import React from 'react';
import { Plus, Trash2, Hash } from 'lucide-react';
import { TableData, TableColumn, AnalysisMode } from '../types';

interface StatGridProps {
  data: TableData;
  onChange: (newData: TableData) => void;
  mode?: AnalysisMode;
}

const StatGrid: React.FC<StatGridProps> = ({ data, onChange, mode = 'advanced' }) => {
  const isSimple = mode === 'simple';

  const handleCellChange = (colIndex: number, rowIndex: number, value: string) => {
    const newColumns = [...data.columns];
    newColumns[colIndex].values[rowIndex] = value;
    onChange({ ...data, columns: newColumns });
  };

  const handleColumnNameChange = (colIndex: number, name: string) => {
    const newColumns = [...data.columns];
    newColumns[colIndex].name = name;
    onChange({ ...data, columns: newColumns });
  };

  const addRow = () => {
    const newColumns = data.columns.map(col => ({
      ...col,
      values: [...col.values, '']
    }));
    onChange({ columns: newColumns, rowCount: data.rowCount + 1 });
  };

  const addColumn = () => {
    if (isSimple) return;
    const newCol: TableColumn = {
      id: Date.now().toString(),
      name: `Variable ${data.columns.length + 1}`,
      values: new Array(data.rowCount).fill('')
    };
    onChange({ columns: [...data.columns, newCol], rowCount: data.rowCount });
  };

  const deleteColumn = (id: string) => {
    if (isSimple || data.columns.length <= 1) return;
    onChange({ ...data, columns: data.columns.filter(c => c.id !== id) });
  };

  const handlePaste = (e: React.ClipboardEvent, startCol: number, startRow: number) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const rows = pastedData.split(/\r?\n/).filter(r => r.length > 0);
    const grid = rows.map(r => r.split(/\t/));

    const newColumns = [...data.columns];
    let finalRowCount = data.rowCount;

    grid.forEach((pastedRow, rIdx) => {
      const targetRow = startRow + rIdx;
      if (targetRow >= finalRowCount) {
        finalRowCount = targetRow + 1;
        newColumns.forEach(col => {
            while (col.values.length < finalRowCount) col.values.push('');
        });
      }

      pastedRow.forEach((value, cIdx) => {
        const targetCol = startCol + cIdx;
        if (targetCol < newColumns.length) {
          newColumns[targetCol].values[targetRow] = value.trim();
        }
      });
    });

    onChange({ columns: newColumns, rowCount: finalRowCount });
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 rounded-3xl overflow-hidden border border-white/10 shadow-inner">
      <div className="flex items-center justify-between p-4 border-b border-white/5 bg-zinc-800/50">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Data Entry Table</span>
          <div className="flex gap-2">
            {!isSimple && (
              <button onClick={addColumn} className="flex items-center gap-2 px-4 py-1.5 bg-zinc-800 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:text-white hover:bg-zinc-700 transition-all">
                <Plus className="w-3 h-3 text-white" /> Add Variable
              </button>
            )}
            <button onClick={addRow} className="flex items-center gap-2 px-4 py-1.5 bg-zinc-800 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:text-white hover:bg-zinc-700 transition-all">
              <Plus className="w-3 h-3 text-white" /> Add Row
            </button>
          </div>
        </div>
        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full border border-white/5">
          {data.rowCount} N × {data.columns.length} Var
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full border-collapse table-fixed min-w-full">
          <thead className="sticky top-0 z-20">
            <tr>
              <th className="w-12 bg-black/40 border-b border-r border-white/10 p-2"></th>
              {data.columns.map((col, cIdx) => (
                <th key={col.id} className="min-w-[150px] bg-zinc-900 border-b border-r border-white/10 p-0 group relative">
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5 bg-black/20">
                       <Hash className="w-2.5 h-2.5 text-zinc-600" />
                       {!isSimple && (
                         <button onClick={() => deleteColumn(col.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-red-500">
                           <Trash2 className="w-3 h-3" />
                         </button>
                       )}
                    </div>
                    <input 
                      value={col.name} 
                      onChange={(e) => handleColumnNameChange(cIdx, e.target.value)}
                      readOnly={isSimple && cIdx > 1}
                      className="w-full px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white bg-transparent border-none focus:ring-0 focus:bg-white/5 transition-colors text-center placeholder-zinc-700"
                      placeholder="Var Name"
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: data.rowCount }).map((_, rIdx) => (
              <tr key={rIdx} className="hover:bg-white/[0.02] transition-colors group">
                <td className="bg-black/40 border-b border-r border-white/5 text-[9px] font-black text-zinc-700 text-center select-none">
                  {rIdx + 1}
                </td>
                {data.columns.map((col, cIdx) => (
                  <td key={`${col.id}-${rIdx}`} className="border-b border-r border-white/5 p-0 focus-within:bg-white/[0.04]">
                    <input 
                      value={col.values[rIdx] || ''} 
                      onChange={(e) => handleCellChange(cIdx, rIdx, e.target.value)}
                      onPaste={(e) => handlePaste(e, cIdx, rIdx)}
                      className="w-full h-full px-4 py-3 text-xs font-mono text-zinc-400 bg-transparent border-none focus:ring-0 focus:text-white outline-none"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StatGrid;