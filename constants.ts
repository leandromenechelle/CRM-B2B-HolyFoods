import { Lead, MessageTemplate, User } from './types';

// Initial Users as per requirements
export const INITIAL_USERS: User[] = [
  {
    id: 'master-1',
    name: 'Leandro',
    email: 'leandro@holyfoods.com.br',
    password: '@Fde51725593*',
    role: 'MASTER',
    photoUrl: 'https://b2b.holysoup.com.br/wp-content/uploads/2025/12/logo-holyfoods.png'
  },
  {
    id: 'leader-1',
    name: 'Alexandre',
    email: 'ale@holyfoods.com.br',
    password: 'Ale@holy26*',
    role: 'LEADER',
    photoUrl: undefined
  },
  {
    id: 'sales-1',
    name: 'Angela',
    email: 'angela@holyfoods.com.br',
    password: 'Angela@holy26*',
    role: 'SALES',
    photoUrl: undefined
  },
  {
    id: 'sales-2',
    name: 'Tadashi',
    email: 'tadashi@holyfoods.com.br',
    password: 'Tadashi@holy26*',
    role: 'SALES',
    photoUrl: undefined
  }
];

export const INITIAL_TEMPLATES: MessageTemplate[] = [
  {
    id: '1',
    title: 'Primeiro Contato',
    content: 'Olá {nome_cliente}! Tudo bem? Vi que sua empresa ({razao_social}) se cadastrou em nosso site buscando produtos da HolySoup. Gostaria de te apresentar nosso catálogo para PJ. Podemos conversar?'
  },
  {
    id: '2',
    title: 'Follow-up (Sem resposta)',
    content: 'Oi {nome_cliente}, tentei contato anteriormente sobre o abastecimento do seu estoque. Temos uma condição especial de frete para sua região essa semana. Tem interesse em ver?'
  },
  {
    id: '3',
    title: 'Boas vindas',
    content: 'Parabéns pela decisão, {nome_cliente}! Estamos muito felizes em ter você como parceiro. Vamos agendar o setup inicial do seu pedido?'
  }
];

// Helper to extract UTMs from the Referrer URL
const parseUtms = (url: string) => {
    try {
        if (!url || url === 'undefined' || url === 'null') return { source: 'direct', medium: 'none', campaign: 'none', content: 'none', term: 'none', id: 'none' };
        
        let safeUrl = url.trim();
        if (!safeUrl.startsWith('http')) safeUrl = `https://${safeUrl}`;
        
        const urlObj = new URL(safeUrl);
        const params = new URLSearchParams(urlObj.search);

        return {
            source: params.get('utm_source') || 'direct',
            medium: params.get('utm_medium') || 'none',
            campaign: params.get('utm_campaign') || 'none',
            content: params.get('utm_content') || 'none',
            term: params.get('utm_term') || 'none',
            id: params.get('utm_id') || 'none'
        };
    } catch (e) {
        return { source: 'direct', medium: 'none', campaign: 'none', content: 'none', term: 'none', id: 'none' };
    }
};

// Raw CSV Data Injection (Used for Mock/Test Mode)
const RAW_CSV_DATA = `
"","","","","","","","64857899000146","Hortifruti","","Alfredo","+5511964071896","alfredomoreiranetto2@gmail.com","on","","LP B2B LEADS FORM (18b37d6)",1683,"2025-12-14 22:35:32","0","Mozilla/5.0","177.26.248.226","https://b2b.holysoup.com.br/?utm_source=Meta&utm_medium=cpc&utm_campaign=Holyfoods_Meta_Meio-Leads_AON_Nacional&utm_content=LAL-Compradores-2025&utm_term=Semana-do-Consumidor-2025_EST2_09102025&fbclid=IwZXh0bgNhZW0BMABhZGlkAasrHzUNiwxzcnRjBmFwcF9pZAwzNTA2ODU1MzE3MjgAAR7b8217xjMEyGcya68JWH0gMAwgmT0Bs2NrIWJ2K8oPbUBO3gtZVg0e-Nipjw_aem_e1wEq4alKeDa_LRhIeLF5Q&utm_id=120235371682910668"
"","","","","@lgdis.tribuidor","","","24.120.314\/0001-96","Distribuidor","","Luiz","32984876607","lgdistribuidoradealimentos@yahoo.com","","","LP B2B LEADS FORM (18b37d6)",1682,"2025-12-14 20:19:48","0","Mozilla/5.0","191.38.232.57","https://b2b.holysoup.com.br/?utm_source=Meta&utm_medium=cpc&utm_campaign=Holyfoods_Meta_Meio-Leads_AON_Nacional&utm_content=Sul-Sudeste_Hipermercado-Proprietario&utm_term=Semana-do-Consumidor-2025_EST2_09102025&fbclid=IwZXh0bgNhZW0BMABhZGlkAasrHzUWssxzcnRjBmFwcF9pZAwzNTA2ODU1MzE3MjgAAR4NEu7acMEJ9Xifo2ml9BjYGOax7gifNJAaRx3sfiW0UKkskhzSUJ32vlvTLw_aem_hT2l2hgWdD43aART4RZEug&utm_id=120235371682910668"
`;

// Process raw csv data into Lead objects
const processRawCsv = (csvText: string): Lead[] => {
    const lines = csvText.trim().split('\n');
    const leads: Lead[] = [];
    const targetCount = 30; // Reduced for cleanliness in demo, real sync handles volume
    let loopCount = Math.ceil(targetCount / Math.max(1, lines.length));

    for (let i = 0; i < loopCount; i++) {
        lines.forEach((line, idx) => {
            const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
            if (!matches) return;

            const cols = matches.map(col => col.replace(/^"|"$/g, ''));
            let cnpj, category, name, phone, email, dateStr, url;

            if (cols[0] === "" && cols[7] && cols[7].length > 5) {
                cnpj = cols[7]; category = cols[8]; name = cols[10]; phone = cols[11]; email = cols[12]; dateStr = cols[17]; url = cols[21];
            } else {
                cnpj = cols[0]; category = cols[4]; name = cols[5]; phone = cols[6]; email = cols[7]; dateStr = cols[12]; url = cols[16];
            }

            const utms = parseUtms(url);
            const cleanCnpj = (cnpj || '').replace(/\D/g, '');
            const isCnpjValid = cleanCnpj.length === 14;

            // Distribute MOCK data
            const statusSales = isCnpjValid ? (idx % 2 === 0 ? 'Angela' : 'Tadashi') : 'Alexandre';

            let finalDate = new Date().toISOString();
            if (dateStr && dateStr.includes('-')) {
                finalDate = dateStr; 
            } else {
                 const dateOffset = (idx * 2) % 30; 
                 const baseDate = new Date();
                 baseDate.setDate(baseDate.getDate() - dateOffset);
                 finalDate = baseDate.toISOString();
            }

            leads.push({
                id: `lead-mock-${i}-${idx}`,
                cnpj: cnpj || '00000000000000',
                statusCnpj: isCnpjValid ? 'VALID' : 'INVALID',
                razaoSocial: name || 'Empresa Desconhecida',
                nomeContato: name || 'Contato',
                telefone: phone || '',
                email: email || '',
                instagram: '',
                categoria: category || 'Outros',
                cidade: 'Não informado', 
                uf: 'BR',
                cep: '00000-000',
                dataSubmissao: finalDate,
                utmSource: utms.source,
                utmMedium: utms.medium,
                utmCampaign: utms.campaign,
                utmContent: utms.content,
                utmTerm: utms.term,
                utmId: utms.id,
                dealStatus: 'PENDING',
                salesperson: statusSales,
                notes: [],
                changeLog: []
            });
        });
    }
    return leads.slice(0, targetCount);
};

export const MOCK_LEADS: Lead[] = processRawCsv(RAW_CSV_DATA);