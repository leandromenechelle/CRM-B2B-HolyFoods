

export interface Attachment {
  id: string;
  name: string;
  data: string; // Base64 string
  type: string; // MIME type
  size: number;
}

export interface Salesperson {
  id: string;
  name: string;
  photoUrl?: string; // Base64 string for avatar
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
  dataSubmissao: string; // ISO Date string
  categoria: string;
  instagram?: string;
  
  // CNPJ Card Data (BrasilAPI)
  cnpjData?: CnpjData;

  // UTMs
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent?: string;
  utmTerm?: string;
  utmId?: string;
  
  // Sales Process
  messageSentAt?: string; // ISO Date string
  lastTemplateTitle?: string; // Title of the last sent template
  messageHistory?: MessageHistoryItem[]; // History of sent messages
  salesperson?: string; // Name of the salesperson (linked to Salesperson.name)
  dealStatus: 'PENDING' | 'WON' | 'LOST';
  wonDate?: string;
  wonValue?: number;
  lostDate?: string;
  lostReason?: string;
  
  // Attachments (Multiple)
  attachments?: Attachment[];
  
  // Notes
  notes: Note[];
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
}

export interface Note {
  id: string;
  type: 'TEXT' | 'AUDIO';
  content: string; // Text content or Transcript
  audioUrl?: string; // For playback
  createdAt: string;
}

export interface MessageTemplate {
  id: string;
  title: string;
  content: string;
}

export type Page = 'DASHBOARD' | 'LEADS_VALID' | 'LEADS_INVALID' | 'PLAYBOOK' | 'CONFIG' | 'STRATEGY';

// Chart Data Types
export interface UtmData {
  name: string;
  value: number;
}