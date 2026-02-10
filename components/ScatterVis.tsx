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
      <div className="h-full flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg text-slate-400">
        Enter data to visualize correlation
      </div>
    );
  }

  // Calculate domain for chart with padding
  const xValues = data.map(d => d.x);
  const yValues = data.map(d => d.y);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);

  const xPadding = (maxX - minX) * 0.1 || 1;
  const yPadding = (maxY - minY) * 0.1 || 1;

  return (
    <div className="w-full h-full bg-white p-4 rounded-xl">
      <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
        Visual Relationship
      </h3>
      <ResponsiveContainer width="100%" height="90%">
        <ComposedChart
          margin={{ top: 20, right: 30, bottom: 20, left: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis 
            dataKey="x" 
            type="number" 
            name={labelX} 
            domain={[minX - xPadding, maxX + xPadding]}
            label={{ value: labelX, position: 'bottom', offset: 0, fill: '#64748b', fontSize: 12 }}
            tick={{ fill: '#64748b', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#cbd5e1' }}
          />
          <YAxis 
            dataKey="y" 
            type="number" 
            name={labelY} 
            domain={[minY - yPadding, maxY + yPadding]}
            label={{ value: labelY, angle: -90, position: 'left', offset: 0, fill: '#64748b', fontSize: 12 }}
            tick={{ fill: '#64748b', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#cbd5e1' }}
          />
          <Tooltip 
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const point = payload[0].payload;
                return (
                  <div className="bg-slate-800 text-white text-xs p-2 rounded shadow-lg">
                    <p>{`${labelX}: ${point.x}`}</p>
                    <p>{`${labelY}: ${point.y}`}</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Scatter 
            name="Data Points" 
            data={data} 
            fill="#6366f1" 
            shape="circle" 
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ScatterVis;