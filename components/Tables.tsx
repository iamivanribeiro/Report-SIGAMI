import React, { useState, useMemo } from 'react';
import { SigamiRequest, SortConfig } from '../types';
import { Icons } from './Icons';
import * as XLSX from 'xlsx';

interface TableProps {
  data: SigamiRequest[];
}

const getStatusColor = (status: string) => {
  const s = String(status).toLowerCase();
  if (s.includes('conclu')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  if (s.includes('andamento') || s.includes('atendimento')) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  if (s.includes('iniciado')) return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
  if (s.includes('aguardando')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  return 'bg-slate-700 text-slate-300';
};

export const AnalystsTable: React.FC<TableProps> = ({ data }) => {
  // Aggregate by analyst
  const analystStats = data.reduce((acc, curr) => {
    const name = curr.analista || 'Não Atribuído';
    if (!acc[name]) {
      acc[name] = { count: 0, active: true }; 
    }
    acc[name].count += 1;
    return acc;
  }, {} as Record<string, { count: number; active: boolean }>);

  const rows = Object.entries(analystStats).map(([name, stats]) => {
     // Explicitly cast stats to the expected type
    const s = stats as { count: number; active: boolean };
    return {
      name,
      count: s.count,
      active: s.active
    };
  }).sort((a, b) => b.count - a.count);

  return (
    <div className="bg-[#24262d] rounded-lg border border-slate-700 overflow-hidden mb-8 shadow-lg">
      <div className="p-4 border-b border-slate-700 bg-slate-800/30">
        <h3 className="text-white font-semibold text-lg flex items-center">
          <Icons.Total className="w-5 h-5 mr-2 text-cyan-400"/>
          Produtividade por Analista
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-slate-400">
          <thead className="text-xs text-slate-500 uppercase bg-[#1f2128]">
            <tr>
              <th className="px-6 py-4 font-normal tracking-wider">Analista</th>
              <th className="px-6 py-4 font-normal tracking-wider text-center">Solicitações Atribuídas</th>
              <th className="px-6 py-4 font-normal tracking-wider text-right">Status no Sistema</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-b border-slate-800 hover:bg-slate-800/20 transition-colors">
                <td className="px-6 py-4 font-bold text-white text-base">{row.name}</td>
                <td className="px-6 py-4 text-center">
                  <span className="bg-slate-700 text-white px-3 py-1.5 rounded-md text-sm font-bold shadow-sm">{row.count}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="px-3 py-1 text-[10px] font-bold rounded border border-emerald-600 text-emerald-500 tracking-wider">
                    ATIVO
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const DetailedRequestsTable: React.FC<TableProps> = ({ data }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: null });

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Solicitações");
    XLSX.writeFile(wb, "relatorio_sigami.xlsx");
  };

  // Sorting Logic
  const sortedData = useMemo(() => {
    let sortableItems = [...data];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        // Safe access with fallback
        const aVal = a[sortConfig.key!]?.toString().toLowerCase() || '';
        const bVal = b[sortConfig.key!]?.toString().toLowerCase() || '';
        
        if (aVal < bVal) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [data, sortConfig]);

  // Pagination Logic
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const requestSort = (key: keyof SigamiRequest) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }: { columnKey: keyof SigamiRequest }) => {
    if (sortConfig.key !== columnKey) return <span className="opacity-20 ml-1">⇅</span>;
    return sortConfig.direction === 'asc' ? <span className="text-cyan-400 ml-1">↑</span> : <span className="text-cyan-400 ml-1">↓</span>;
  };

  // Reset page when data length changes (e.g. filtering)
  React.useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);

  return (
    <div className="bg-[#24262d] rounded-lg border border-slate-700 overflow-hidden shadow-lg flex flex-col">
      <div className="p-4 border-b border-slate-700 bg-slate-800/30 flex flex-col sm:flex-row justify-between items-center gap-4">
        <h3 className="text-white font-semibold text-lg flex items-center">
           <Icons.Excel className="w-5 h-5 mr-2 text-emerald-400"/>
           Solicitações Detalhadas
        </h3>
        <button 
          onClick={handleExport}
          className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded text-xs flex items-center transition-colors border border-slate-600"
        >
          <Icons.Download className="w-3 h-3 mr-1" />
          Exportar
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-slate-400">
          <thead className="text-xs text-slate-500 uppercase bg-[#1f2128]">
            <tr>
              <th onClick={() => requestSort('protocolo')} className="px-4 py-3 cursor-pointer hover:text-white transition-colors">
                <div className="flex items-center">Protocolo <SortIcon columnKey="protocolo" /></div>
              </th>
              <th onClick={() => requestSort('assunto')} className="px-4 py-3 cursor-pointer hover:text-white transition-colors">
                 <div className="flex items-center">Assunto <SortIcon columnKey="assunto" /></div>
              </th>
              <th onClick={() => requestSort('subsecretaria')} className="px-4 py-3 cursor-pointer hover:text-white transition-colors">
                 <div className="flex items-center">Subsecretaria <SortIcon columnKey="subsecretaria" /></div>
              </th>
              <th onClick={() => requestSort('status')} className="px-4 py-3 cursor-pointer hover:text-white transition-colors">
                 <div className="flex items-center">Status <SortIcon columnKey="status" /></div>
              </th>
              <th onClick={() => requestSort('abertura')} className="px-4 py-3 cursor-pointer hover:text-white transition-colors">
                 <div className="flex items-center">Abertura <SortIcon columnKey="abertura" /></div>
              </th>
              <th onClick={() => requestSort('prazo')} className="px-4 py-3 cursor-pointer hover:text-white transition-colors">
                 <div className="flex items-center">Prazo <SortIcon columnKey="prazo" /></div>
              </th>
              <th onClick={() => requestSort('analista')} className="px-4 py-3 cursor-pointer hover:text-white transition-colors">
                 <div className="flex items-center">Analista <SortIcon columnKey="analista" /></div>
              </th>
               <th onClick={() => requestSort('cidade')} className="px-4 py-3 cursor-pointer hover:text-white transition-colors">
                 <div className="flex items-center">Cidade <SortIcon columnKey="cidade" /></div>
              </th>
               <th onClick={() => requestSort('bairro')} className="px-4 py-3 cursor-pointer hover:text-white transition-colors">
                 <div className="flex items-center">Bairro <SortIcon columnKey="bairro" /></div>
              </th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {paginatedData.map((req) => (
              <tr key={req.id} className="border-b border-slate-800 hover:bg-slate-800/20 transition-colors">
                <td className="px-4 py-3 font-medium text-white">{req.protocolo}</td>
                <td className="px-4 py-3">{req.assunto}</td>
                <td className="px-4 py-3">{req.subsecretaria}</td>
                <td className="px-4 py-3">
                   <span className={`px-2 py-0.5 rounded border text-[10px] uppercase font-bold ${getStatusColor(req.status)}`}>
                     {req.status}
                   </span>
                </td>
                <td className="px-4 py-3">{req.abertura}</td>
                <td className="px-4 py-3">{req.prazo}</td>
                <td className="px-4 py-3">{req.analista}</td>
                <td className="px-4 py-3">{req.cidade}</td>
                <td className="px-4 py-3">{req.bairro}</td>
              </tr>
            ))}
            {paginatedData.length === 0 && (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-slate-500">
                  Nenhum registro encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="p-4 border-t border-slate-700 bg-slate-800/30 flex justify-between items-center text-xs text-slate-400">
         <div>
            Mostrando <span className="font-semibold text-white">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-semibold text-white">{Math.min(currentPage * itemsPerPage, sortedData.length)}</span> de <span className="font-semibold text-white">{sortedData.length}</span> resultados
         </div>
         <div className="flex space-x-1">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
               // Simple logic to show a window of pages, centering current if possible
               let p = i + 1;
               if (totalPages > 5) {
                 if (currentPage > 3) p = currentPage - 2 + i;
                 if (p > totalPages) p = totalPages - 4 + i;
               }
               
               return (
                <button 
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`px-3 py-1 rounded transition-colors ${currentPage === p ? 'bg-cyan-600 text-white font-bold' : 'bg-slate-700 hover:bg-slate-600'}`}
                >
                  {p}
                </button>
               );
            })}
            <button 
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Próxima
            </button>
         </div>
      </div>
    </div>
  );
};