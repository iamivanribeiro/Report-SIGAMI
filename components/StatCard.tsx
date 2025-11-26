import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: React.ElementType;
  colorClass: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, subtext, icon: Icon, colorClass }) => {
  return (
    <div className="bg-[#24262d] p-4 rounded-lg border border-slate-700 shadow-lg flex items-center space-x-4">
      <div className={`p-3 rounded-full bg-opacity-20 ${colorClass.replace('text-', 'bg-')}`}>
        <Icon className={`w-6 h-6 ${colorClass}`} />
      </div>
      <div>
        <h3 className="text-2xl font-bold text-white">{value}</h3>
        <p className="text-sm text-slate-400">{subtext || title}</p>
      </div>
    </div>
  );
};
