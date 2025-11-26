import React, { useState } from 'react';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend 
} from 'recharts';
import { COLORS } from '../constants';
import { SigamiRequest } from '../types';

interface ChartProps {
  data: SigamiRequest[];
  onFilterClick?: (field: keyof SigamiRequest, value: string) => void;
  title?: string; // Added optional title prop
}

// Helper to aggregate data
const aggregateBy = (data: SigamiRequest[], key: keyof SigamiRequest) => {
  const counts: Record<string, number> = {};
  data.forEach(item => {
    const val = item[key] || 'N/A';
    counts[val] = (counts[val] || 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 p-2 rounded shadow-lg z-50">
        <p className="text-white font-medium text-xs">{`${label || payload[0].name} : ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

export const StatusDistributionChart: React.FC<ChartProps> = ({ data, onFilterClick }) => {
  const chartData = aggregateBy(data, 'status');

  return (
    <div className="bg-[#24262d] p-4 rounded-lg border border-slate-700 h-96 flex flex-col shadow-lg hover:border-slate-600 transition-colors">
      <h3 className="text-white font-semibold mb-2 text-sm uppercase tracking-wider text-slate-400">Distribuição por Status</h3>
      <div className="flex-1 cursor-pointer">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={100}
              paddingAngle={4}
              dataKey="value"
              onClick={(data) => onFilterClick && onFilterClick('status', data.name)}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS.chart[index % COLORS.chart.length]} className="hover:opacity-80 transition-opacity" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <p className="text-center text-xs text-slate-500 mt-2">Clique para filtrar</p>
    </div>
  );
};

export const SubsecretariaChart: React.FC<ChartProps> = ({ data, onFilterClick }) => {
  const chartData = aggregateBy(data, 'subsecretaria');

  return (
    <div className="bg-[#24262d] p-4 rounded-lg border border-slate-700 h-96 flex flex-col shadow-lg hover:border-slate-600 transition-colors">
      <h3 className="text-white font-semibold mb-2 text-sm uppercase tracking-wider text-slate-400">Por Subsecretaria</h3>
      <div className="flex-1 cursor-pointer">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={chartData} 
            layout="vertical" 
            margin={{ left: 10, right: 10 }}
            onClick={(data) => {
              if (data && data.activePayload && data.activePayload.length > 0) {
                 onFilterClick && onFilterClick('subsecretaria', data.activePayload[0].payload.name);
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
            <XAxis type="number" stroke="#94a3b8" fontSize={11} />
            <YAxis dataKey="name" type="category" stroke="#94a3b8" width={70} tick={{fontSize: 11}} />
            <Tooltip cursor={{fill: '#334155', opacity: 0.2}} content={<CustomTooltip />} />
            <Bar dataKey="value" fill={COLORS.primary} radius={[0, 4, 4, 0]} barSize={24} className="hover:opacity-80 transition-opacity" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-center text-xs text-slate-500 mt-2">Clique para filtrar</p>
    </div>
  );
};

export const TopSubjectsChart: React.FC<ChartProps> = ({ data, onFilterClick, title }) => {
  const chartData = aggregateBy(data, 'assunto')
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return (
    <div className="bg-[#24262d] p-4 rounded-lg border border-slate-700 h-96 flex flex-col shadow-lg hover:border-slate-600 transition-colors">
      <h3 className="text-white font-semibold mb-2 text-sm uppercase tracking-wider text-slate-400">
        {title || 'Top 5 Assuntos'}
      </h3>
      <div className="flex-1 cursor-pointer">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={chartData} 
            layout="vertical" 
            margin={{ left: 10, right: 10 }}
            onClick={(data) => {
               if (data && data.activePayload && data.activePayload.length > 0) {
                 onFilterClick && onFilterClick('assunto', data.activePayload[0].payload.name);
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
            <XAxis type="number" stroke="#94a3b8" hide />
            <YAxis dataKey="name" type="category" stroke="#94a3b8" width={90} tick={{fontSize: 10}} />
            <Tooltip cursor={{fill: '#334155', opacity: 0.2}} content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20} className="hover:opacity-80 transition-opacity">
               {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS.chart[index % COLORS.chart.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-center text-xs text-slate-500 mt-2">Clique para filtrar</p>
    </div>
  );
};

export const GeoDistributionChart: React.FC<ChartProps> = ({ data, onFilterClick }) => {
  const [view, setView] = useState<'cidade' | 'bairro'>('cidade');
  
  // Custom grouping logic: Top 10 + Others
  const rawData = aggregateBy(data, view);
  // Sort by value descending
  rawData.sort((a, b) => b.value - a.value);
  
  const TOP_N = 10;
  let chartData = rawData;
  let hasOthers = false;

  if (rawData.length > TOP_N) {
    const top = rawData.slice(0, TOP_N);
    const othersCount = rawData.slice(TOP_N).reduce((acc, curr) => acc + curr.value, 0);
    chartData = [...top, { name: 'Outros', value: othersCount }];
    hasOthers = true;
  }

  return (
    <div className="bg-[#24262d] p-4 rounded-lg border border-slate-700 h-96 flex flex-col relative shadow-lg hover:border-slate-600 transition-colors">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-white font-semibold w-1/2 text-sm uppercase tracking-wider text-slate-400">Geografia</h3>
        <div className="flex bg-slate-800 rounded p-1 border border-slate-700">
          <button 
            onClick={() => setView('cidade')}
            className={`text-[10px] px-2 py-1 rounded transition-colors ${view === 'cidade' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
          >
            Cidade
          </button>
          <button 
             onClick={() => setView('bairro')}
             className={`text-[10px] px-2 py-1 rounded transition-colors ${view === 'bairro' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
          >
            Bairro
          </button>
        </div>
      </div>
      <div className="flex-1 cursor-pointer">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              dataKey="value"
              paddingAngle={2}
              onClick={(data) => {
                 if (data.name !== 'Outros' && onFilterClick) {
                   onFilterClick(view, data.name);
                 }
              }}
            >
              {chartData.map((entry, index) => {
                // Use a specific color for "Outros" (e.g., slate-500 equivalent) or cycle through colors
                const color = entry.name === 'Outros' ? '#64748b' : COLORS.chart[index % COLORS.chart.length];
                return (
                   <Cell key={`cell-${index}`} fill={color} className="hover:opacity-80 transition-opacity" />
                );
              })}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={36} 
              iconType="circle" 
              formatter={(value) => <span className="text-xs text-slate-300 ml-1">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
       <p className="text-center text-xs text-slate-500 mt-2">
         {hasOthers ? "Top 10 localidades exibidas" : "Clique para filtrar"}
       </p>
    </div>
  );
};