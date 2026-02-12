import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart
} from 'recharts';
import { DataPoint, StatisticsResult } from '../types';

interface ScatterVisProps {
  data: DataPoint[];
  stats: StatisticsResult | null;
  labelX: string;
  labelY: string;
}

const ScatterVis: React.FC<ScatterVisProps> = ({ data, stats, labelX, labelY }) => {
  if (!stats || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-900 border border-white/5 rounded-3xl text-zinc-600 font-black uppercase tracking-[0.2em] text-[10px]">
        Awaiting Data Entry...
      </div>
    );
  }

  const xValues = data.map(d => d.x);
  const yValues = data.map(d => d.y);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);

  const xPadding = (maxX - minX) * 0.1 || 1;
  const yPadding = (maxY - minY) * 0.1 || 1;

  return (
    <div className="w-full h-full bg-black/40 p-8 rounded-[2rem] border border-white/5">
      <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
        Scatter Plot Visualization
      </h3>
      <ResponsiveContainer width="100%" height="90%">
        <ComposedChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
          <XAxis 
            dataKey="x" 
            type="number" 
            name={labelX} 
            domain={[minX - xPadding, maxX + xPadding]}
            label={{ value: labelX, position: 'bottom', offset: 0, fill: '#525252', fontSize: 10, fontWeight: 900 }}
            tick={{ fill: '#525252', fontSize: 10, fontWeight: 700 }}
            tickFormatter={(val) => val.toFixed(2)}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
          />
          <YAxis 
            dataKey="y" 
            type="number" 
            name={labelY} 
            domain={[minY - yPadding, maxY + yPadding]}
            label={{ value: labelY, angle: -90, position: 'left', offset: 0, fill: '#525252', fontSize: 10, fontWeight: 900 }}
            tick={{ fill: '#525252', fontSize: 10, fontWeight: 700 }}
            tickFormatter={(val) => val.toFixed(2)}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
          />
          <Tooltip 
            cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.2)' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const point = payload[0].payload;
                return (
                  <div className="bg-zinc-900/90 backdrop-blur-xl border border-white/10 text-[10px] font-black uppercase tracking-widest p-3 rounded-xl shadow-2xl">
                    <p className="text-zinc-500 mb-1">{`${labelX}: ${point.x}`}</p>
                    <p className="text-white">{`${labelY}: ${point.y}`}</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Scatter 
            name="Observations" 
            data={data} 
            fill="#ffffff" 
            shape="circle" 
            fillOpacity={0.8}
            className="drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ScatterVis;