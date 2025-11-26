import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Icons } from './components/Icons';
import { StatCard } from './components/StatCard';
import { StatusDistributionChart, SubsecretariaChart, TopSubjectsChart, GeoDistributionChart } from './components/Charts';
import { AnalystsTable, DetailedRequestsTable } from './components/Tables';
import { MOCK_DATA } from './constants';
import { SigamiRequest, FilterState } from './types';

// Helper for excel date parsing (approximate)
const parseExcelDate = (value: any): string => {
  if (!value) return '';
  if (typeof value === 'number') {
    // Excel date to JS Date
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    return date.toISOString().split('T')[0];
  }
  return String(value);
};

// Helper to normalize text to Title Case (e.g. "AREIA BRANCA" -> "Areia Branca")
const normalizeText = (text: any): string => {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .trim()
    .split(' ')
    .map(word => word.length > 2 ? word.charAt(0).toUpperCase() + word.slice(1) : word) // Simple Title Case
    .join(' ');
};

// Helper to safely get value from row with multiple possible keys (case-insensitive & accent tolerant)
const getRowValue = (row: any, ...keys: string[]) => {
  // 1. Try exact match from provided keys
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) return row[key];
  }
  
  // 2. Try case-insensitive match against row keys
  const rowKeys = Object.keys(row);
  for (const key of keys) {
    const foundKey = rowKeys.find(k => k.toLowerCase() === key.toLowerCase());
    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) return row[foundKey];
  }

  return undefined;
};

// Normalize mock data initially
const NORMALIZED_MOCK_DATA = MOCK_DATA.map(item => ({
  ...item,
  bairro: normalizeText(item.bairro),
  cidade: normalizeText(item.cidade),
  analista: normalizeText(item.analista),
  subsecretaria: item.subsecretaria, // Keep acronyms if needed, or normalize
  assunto: normalizeText(item.assunto)
}));

function App() {
  const [data, setData] = useState<SigamiRequest[]>(NORMALIZED_MOCK_DATA);
  const [filters, setFilters] = useState<FilterState>({
    startDate: '',
    endDate: '',
    status: '',
    subsecretaria: '',
    search: '',
    onlyLinhaVerde: false
  });
  // Extra state for drill-down filters from charts that might not match exact main dropdowns
  const [dynamicFilter, setDynamicFilter] = useState<{key: keyof SigamiRequest, value: string} | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const jsonData = XLSX.utils.sheet_to_json(ws) as any[];

      // Map raw Excel data to our interface with robust key checking
      const mappedData: SigamiRequest[] = jsonData.map((row, idx) => ({
        id: idx.toString(),
        protocolo: String(getRowValue(row, 'protocolo', 'Protocolo') || ''),
        nprocessopmbr: String(getRowValue(row, 'nprocessopmbr', 'Nprocessopmbr', 'Processo') || ''),
        assunto: normalizeText(getRowValue(row, 'assunto', 'Assunto')) || 'Outros',
        subsecretaria: String(getRowValue(row, 'subsecretaria', 'Subsecretaria') || 'N/A'),
        prioridade: String(getRowValue(row, 'prioridade', 'Prioridade') || 'Média'),
        status: String(getRowValue(row, 'status', 'Status') || 'Não Iniciado'),
        abertura: parseExcelDate(getRowValue(row, 'abertura', 'Abertura')),
        prazo: parseExcelDate(getRowValue(row, 'prazo', 'Prazo')),
        conclusao: String(getRowValue(row, 'conclusão', 'conclusao', 'Conclusão', 'Conclusao') || ''),
        solicitante: normalizeText(getRowValue(row, 'solicitante', 'Solicitante')),
        analista: normalizeText(getRowValue(row, 'analista', 'Analista')) || 'Não Atribuído',
        // Robust check for description variations
        descricao: String(getRowValue(row, 'descrição', 'descricao', 'Descrição', 'Descricao') || ''),
        logradouro: normalizeText(getRowValue(row, 'logradouro', 'Logradouro')),
        bairro: normalizeText(getRowValue(row, 'bairro', 'Bairro')),
        cidade: normalizeText(getRowValue(row, 'cidade', 'Cidade')),
        uf: String(getRowValue(row, 'uf', 'UF', 'Uf') || ''),
        cep: String(getRowValue(row, 'cep', 'CEP', 'Cep') || '')
      }));

      setData(mappedData);
    };
    reader.readAsBinaryString(file);
  };

  const handleUpdate = () => {
    // Simulating a refresh, normally would refetch from API
    // For now, just shuffle/reset to normalized mock to simulate change
    const shuffled = [...NORMALIZED_MOCK_DATA].sort(() => 0.5 - Math.random());
    setData(shuffled);
  };

  // Filter Logic
  const filteredData = useMemo(() => {
    return data.filter(item => {
      // Search
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = 
        !filters.search || 
        String(item.protocolo).toLowerCase().includes(searchLower) ||
        String(item.assunto).toLowerCase().includes(searchLower) ||
        String(item.analista).toLowerCase().includes(searchLower) ||
        String(item.bairro).toLowerCase().includes(searchLower);

      // Status
      const matchesStatus = !filters.status || filters.status === 'Todos os Status' || item.status === filters.status;

      // Subsecretaria
      const matchesSub = !filters.subsecretaria || filters.subsecretaria === 'Todas as Subsecretarias' || item.subsecretaria === filters.subsecretaria;
      
      // Dynamic Filter (from Chart Clicks)
      let matchesDynamic = true;
      if (dynamicFilter) {
         const val = item[dynamicFilter.key];
         // Loose comparison for normalized data
         matchesDynamic = String(val) === dynamicFilter.value || String(val).toLowerCase() === dynamicFilter.value.toLowerCase();
      }

      // Date Range logic
      let matchesDate = true;
      if (filters.startDate) {
        matchesDate = matchesDate && item.abertura >= filters.startDate;
      }
      if (filters.endDate) {
        matchesDate = matchesDate && item.abertura <= filters.endDate;
      }
      
      // Linha Verde Filter
      const matchesLinhaVerde = !filters.onlyLinhaVerde || (String(item.descricao || '').toLowerCase().includes('linha verde'));

      return matchesSearch && matchesStatus && matchesSub && matchesDynamic && matchesDate && matchesLinhaVerde;
    });
  }, [data, filters, dynamicFilter]);

  // Derived Stats
  const stats = useMemo(() => {
    const total = filteredData.length;
    const completed = filteredData.filter(i => i.status.toLowerCase().includes('conclu')).length;
    const inProgress = filteredData.filter(i => i.status.toLowerCase().includes('andamento') || i.status.toLowerCase().includes('atendimento')).length;
    const notStarted = filteredData.filter(i => i.status.toLowerCase().includes('iniciado')).length;
    const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0.0';

    return { total, completed, inProgress, notStarted, completionRate };
  }, [filteredData]);

  // Specific "Linha Verde" Data subset (used for the dedicated section, kept for redundancy/highlighting)
  const linhaVerdeData = useMemo(() => {
    return filteredData.filter(item => 
      String(item.descricao || '').toLowerCase().includes('linha verde')
    );
  }, [filteredData]);

  // Unique values for dropdowns
  const statuses = ['Todos os Status', ...Array.from(new Set(data.map(i => i.status)))];
  const subs = ['Todas as Subsecretarias', ...Array.from(new Set(data.map(i => i.subsecretaria)))];

  // Handler for chart clicks
  const handleChartFilter = (field: keyof SigamiRequest, value: string) => {
    // If clicking "Outros", we probably shouldn't filter or should filter by exclusion, 
    // but for simplicity let's just ignore or handle normally if it matches a real value.
    if (value === 'Outros') return; 
    setDynamicFilter({ key: field, value });
  };

  const clearDynamicFilter = () => setDynamicFilter(null);
  const clearAllFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      status: '',
      subsecretaria: '',
      search: '',
      onlyLinhaVerde: false
    });
    setDynamicFilter(null);
  };

  return (
    <div className="min-h-screen bg-[#1a1c23] text-slate-300 pb-10 font-sans">
      {/* Navbar */}
      <nav className="bg-[#22d3ee] h-16 flex items-center justify-between px-4 sm:px-8 shadow-lg sticky top-0 z-50">
        <div className="flex items-center space-x-3">
            {/* Leaf Icon */}
            <div className="p-1.5 bg-slate-900 rounded-full">
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#22d3ee]">
                   <path fillRule="evenodd" d="M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.177 7.547 7.547 0 0 1-1.705-1.715.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.717-2.248ZM15.75 14.25a3.75 3.75 0 1 1-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 0 1 1.925-3.545 3.75 3.75 0 0 1 3.255 3.717Z" clipRule="evenodd" />
               </svg>
            </div>
          <div>
            <h1 className="text-slate-900 font-extrabold text-xl tracking-tight leading-none">SIGAMI</h1>
            <p className="text-slate-800 text-[10px] font-semibold uppercase tracking-wide opacity-80">Gestão Ambiental - Belford Roxo</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-4">
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Icons.Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Upload Excel</span>
          </button>
          <button 
            onClick={handleUpdate}
            className="flex items-center justify-center p-2 bg-slate-900/10 hover:bg-slate-900/20 text-slate-900 rounded-lg transition-colors"
            title="Atualizar Dados"
          >
            <Icons.Refresh className="w-5 h-5" />
          </button>
        </div>
      </nav>

      <main className="container mx-auto px-4 sm:px-6 pt-8 space-y-8">
        
        {/* Dynamic Filter Banner */}
        {dynamicFilter && (
           <div className="bg-cyan-900/30 border border-cyan-500/50 text-cyan-200 px-4 py-3 rounded-lg flex items-center justify-between animate-fade-in">
              <span className="text-sm">
                Filtrando por <strong>{dynamicFilter.key.toUpperCase()}</strong>: <span className="font-bold text-white">{dynamicFilter.value}</span>
              </span>
              <button onClick={clearDynamicFilter} className="text-xs bg-cyan-500/20 hover:bg-cyan-500/40 px-2 py-1 rounded text-cyan-100 transition-colors">
                 Limpar filtro
              </button>
           </div>
        )}

        {/* Filter Bar */}
        <div className="bg-[#24262d] p-5 rounded-xl border border-slate-700 shadow-lg">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white mb-2 sm:mb-0">Filtros Avançados</h2>
              <button onClick={clearAllFilters} className="text-xs text-slate-400 hover:text-white underline">Limpar tudo</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
             {/* Dates */}
             <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider ml-1">Data Início</label>
                <div className="relative">
                  <input 
                    type="date" 
                    value={filters.startDate}
                    onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                    className="w-full bg-[#1a1c23] border border-slate-600 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
             </div>
             <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider ml-1">Data Fim</label>
                <div className="relative">
                   <input 
                    type="date" 
                    value={filters.endDate}
                    onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                    className="w-full bg-[#1a1c23] border border-slate-600 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
             </div>

             {/* Status Dropdown */}
             <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider ml-1">Status</label>
                <select 
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                  className="w-full bg-[#1a1c23] border border-slate-600 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-cyan-500 appearance-none transition-colors"
                >
                  {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
             </div>

             {/* Subsecretaria Dropdown */}
             <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider ml-1">Subsecretaria</label>
                <select 
                  value={filters.subsecretaria}
                  onChange={(e) => setFilters({...filters, subsecretaria: e.target.value})}
                  className="w-full bg-[#1a1c23] border border-slate-600 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-cyan-500 appearance-none transition-colors"
                >
                  {subs.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
             </div>

             {/* Search */}
             <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider ml-1">Buscar</label>
                <div className="relative group">
                  <Icons.Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Protocolo, assunto..." 
                    value={filters.search}
                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                    className="w-full bg-[#1a1c23] pl-10 border border-slate-600 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-cyan-500 placeholder-slate-600 transition-colors"
                  />
                </div>
             </div>

             {/* Linha Verde Toggle */}
             <div className="flex flex-col space-y-1.5 justify-end">
                <button
                  onClick={() => setFilters(prev => ({ ...prev, onlyLinhaVerde: !prev.onlyLinhaVerde }))}
                  className={`w-full h-[38px] px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center space-x-2 border ${
                    filters.onlyLinhaVerde 
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                      : 'bg-[#1a1c23] border-slate-600 text-slate-400 hover:border-emerald-500/50 hover:text-emerald-400'
                  }`}
                >
                  <Icons.Phone className="w-4 h-4" />
                  <span>Linha Verde</span>
                </button>
             </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="Total" value={stats.total} subtext="Solicitações" icon={Icons.Total} colorClass="text-cyan-400" />
          <StatCard title="Concluídas" value={stats.completed} subtext="Resolvidos" icon={Icons.Completed} colorClass="text-emerald-400" />
          <StatCard title="Em Andamento" value={stats.inProgress} subtext="Em análise" icon={Icons.InProgress} colorClass="text-amber-400" />
          <StatCard title="Pendentes" value={stats.notStarted} subtext="Aguardando" icon={Icons.NotStarted} colorClass="text-rose-400" />
          <StatCard title="Eficiência" value={`${stats.completionRate}%`} subtext="Taxa conclusão" icon={Icons.Rate} colorClass="text-purple-400" />
        </div>

        {/* Main Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="lg:col-span-1">
               <StatusDistributionChart data={filteredData} onFilterClick={handleChartFilter} />
            </div>
            <div className="lg:col-span-1">
               <SubsecretariaChart data={filteredData} onFilterClick={handleChartFilter} />
            </div>
            <div className="lg:col-span-1">
               <TopSubjectsChart data={filteredData} onFilterClick={handleChartFilter} />
            </div>
            <div className="lg:col-span-1">
               <GeoDistributionChart data={filteredData} onFilterClick={handleChartFilter} />
            </div>
        </div>

        {/* Linha Verde Section */}
        {!filters.onlyLinhaVerde && linhaVerdeData.length > 0 && (
          <div className="bg-[#1f2937] border border-emerald-500/30 p-6 rounded-xl relative overflow-hidden shadow-lg animate-fade-in">
             <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-48 h-48 text-emerald-500">
                   <path fillRule="evenodd" d="M1.5 4.5a3 3 0 0 1 3-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 0 1-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 0 0 6.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 0 1 1.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 0 1-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 5.25V4.5Z" clipRule="evenodd" />
                </svg>
             </div>
             <div className="relative z-10">
               <h2 className="text-xl font-bold text-emerald-400 mb-6 flex items-center border-b border-emerald-500/30 pb-2">
                  <Icons.Phone className="mr-2 w-6 h-6" /> Monitoramento Linha Verde
               </h2>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-1 flex flex-col justify-center">
                    <StatCard 
                       title="Solicitações" 
                       value={linhaVerdeData.length} 
                       subtext="Via Linha Verde" 
                       icon={Icons.Phone} 
                       colorClass="text-emerald-400" 
                    />
                    <div className="mt-4 p-4 bg-emerald-900/20 rounded-lg border border-emerald-500/20">
                      <p className="text-sm text-emerald-200">
                        Visualizando solicitações que contêm "Linha Verde" na descrição.
                      </p>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                       <TopSubjectsChart data={linhaVerdeData} onFilterClick={handleChartFilter} title="Top 5 Assuntos (Linha Verde)" />
                  </div>
               </div>
             </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">
           {/* Analysts Table */}
           <AnalystsTable data={filteredData} />
           
           {/* Detailed Requests Table */}
           <DetailedRequestsTable data={filteredData} />
        </div>

      </main>

      <footer className="mt-12 py-6 text-center text-slate-600 text-xs border-t border-slate-800">
         <p>&copy; {new Date().getFullYear()} SEMAS Belford Roxo. Todos os direitos reservados.</p>
         <p className="mt-1 opacity-50">Desenvolvido para gestão eficiente de recursos ambientais.</p>
      </footer>
    </div>
  );
}

export default App;