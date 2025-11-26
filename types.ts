export interface SigamiRequest {
  id: string; // generated unique id
  protocolo: string;
  nprocessopmbr: string;
  assunto: string;
  subsecretaria: string;
  prioridade: string;
  status: string;
  abertura: string; // ISO Date string or format 'DD/MM/YYYY'
  prazo: string;
  conclusao: string;
  solicitante: string;
  analista: string;
  descricao: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
}

export interface FilterState {
  startDate: string;
  endDate: string;
  status: string;
  subsecretaria: string;
  search: string;
  onlyLinhaVerde: boolean;
}

export interface DashboardStats {
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  completionRate: number;
}

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig {
  key: keyof SigamiRequest | null;
  direction: SortDirection;
}

export interface ChartClickPayload {
  name: string;
  value: number;
  activeLabel?: string;
}