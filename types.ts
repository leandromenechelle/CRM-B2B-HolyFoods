export interface Attachment {
  id: string;
  name: string;
  data: string; // Base64 string
  type: string; // MIME type
  size: number;
}

export type Role = 'MASTER' | 'LEADER' | 'SALES';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // In a real app, this would be hashed. Storing plain for demo requirement.
  role: Role;
  photoUrl?: string;
  mustChangePassword?: boolean;
}

export interface Salesperson {
  id: string;
  name: string;
  email?: string;
  photoUrl?: string;
}

export interface ChangeLogItem {
  id: string;
  description: string;
  timestamp: string;
  author: string;
}

export interface Lead {
  id: string;
  cnpj: string;
  statusCnpj: 'VALID' | 'INVALID';
  razaoSocial: string;
  nomeContato: string;
  telefone: string;
  email: string;
  cidade: string;
  uf: string;
  cep: string;
  dataSubmissao: string;
  categoria: string;
  instagram?: string;
  
  cnpjData?: CnpjData;

  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent?: string;
  utmTerm?: string;
  utmId?: string;
  
  messageSentAt?: string;
  messageStatus?: 'SENT' | 'FAILED' | 'PENDING_CONFIRMATION';
  lastTemplateTitle?: string;
  messageHistory?: MessageHistoryItem[];
  
  salesperson?: string;
  
  // Fields for reallocation logic
  originalOwner?: string; // Name of the deleted user
  isTransferPending?: boolean; // If true, belongs to Master temporarily

  dealStatus: 'PENDING' | 'WON' | 'LOST';
  wonDate?: string;
  wonValue?: number;
  lostDate?: string;
  lostReason?: string;
  
  attachments?: Attachment[];
  notes: Note[];
  changeLog?: ChangeLogItem[];
}

export interface CnpjData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  data_inicio_atividade: string;
  cnae_fiscal_descricao: string;
  cnaes_secundarios: { codigo: number; descricao: string }[];
  natureza_juridica: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  email: string;
  ddd_telefone_1: string;
  porte: string;
  descricao_situacao_cadastral: string;
  data_situacao_cadastral: string;
  motivo_situacao_cadastral: string;
  situacao_especial: string;
  data_situacao_especial: string;
  ente_federativo_responsavel: string;
  qsa: { nome_socio: string; qualifica_socio: string }[];
}

export interface MessageHistoryItem {
  sentAt: string;
  templateTitle: string;
  salesperson: string;
  status?: 'SUCCESS' | 'FAILED';
}

export interface Note {
  id: string;
  type: 'TEXT' | 'AUDIO';
  content: string;
  audioUrl?: string;
  createdAt: string;
}

export interface MessageTemplate {
  id: string;
  title: string;
  content: string;
  ownerId?: string;
}

export type Page = 'DASHBOARD' | 'LEADS_VALID' | 'LEADS_INVALID' | 'PLAYBOOK' | 'CONFIG' | 'STRATEGY';

export interface UtmData {
  name: string;
  value: number;
}