import { Lead } from "../types";

// Helper to parse the GViz JSON response
const parseGVizResponse = (text: string) => {
  const start = text.indexOf("google.visualization.Query.setResponse(");
  const end = text.lastIndexOf(")");
  if (start === -1 || end === -1) return null;
  
  const jsonStr = text.substring(start + 39, end);
  return JSON.parse(jsonStr);
};

// Helper to extract UTMs from a URL string
const parseUtms = (url: string) => {
    try {
        if (!url || url === 'undefined' || url === 'null') {
            return { 
                source: 'direct', medium: 'none', campaign: 'none', 
                content: 'none', term: 'none', id: 'none' 
            };
        }
        
        // Handle potential unencoded chars or partial URLs
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
        return { 
            source: 'direct', medium: 'none', campaign: 'none', 
            content: 'none', term: 'none', id: 'none' 
        };
    }
};

// Map sheet columns to Lead object
// Adjusted Order based on request: 
// 0:CNPJ, 1:Categoria, 2:Nome, 3:Telefone, 4:E-mail, 5:Instagram, 6:Data Submissão, 
// 7:Status CNPJ, 8:Razão Social, 9:URL (Full Link with UTMs)
// ... (Older columns 10-15 are ignored as UTMs come from URL in 9 now)
// 16:Link Whats, 17:Cidade - UF, 18:CEP
const mapRowToLead = (row: any, statusOverride: 'VALID' | 'INVALID'): Lead => {
  const c = row.c || [];
  const getValue = (index: number) => (c[index] ? (c[index].v || c[index].f || '') : '');

  const cidadeUf = getValue(17);
  const [cidade, uf] = cidadeUf.split(' - ').map((s: string) => s.trim());

  // Parse Date
  let dataSubmissao = new Date().toISOString();
  const rawDate = getValue(6);
  if (rawDate) {
    // Attempt to parse "Date(year, month, day, hour, min, sec)" from GViz or standard string
    if (typeof rawDate === 'string' && rawDate.startsWith('Date(')) {
        const parts = rawDate.match(/\d+/g);
        if (parts && parts.length >= 3) {
            // JS months are 0-indexed
            const year = Number(parts[0]);
            const month = Number(parts[1]);
            const day = Number(parts[2]);
            const hours = parts.length > 3 ? Number(parts[3]) : 0;
            const minutes = parts.length > 4 ? Number(parts[4]) : 0;
            const seconds = parts.length > 5 ? Number(parts[5]) : 0;
            
            dataSubmissao = new Date(year, month, day, hours, minutes, seconds).toISOString();
        }
    } else {
        const parsed = new Date(rawDate);
        if (!isNaN(parsed.getTime())) dataSubmissao = parsed.toISOString();
    }
  }

  // Parse UTMs from Column J (Index 9) which is now the "url"
  const fullUrl = String(getValue(9));
  const utmData = parseUtms(fullUrl);

  return {
    id: `lead-${Math.random().toString(36).substr(2, 9)}`,
    cnpj: String(getValue(0)),
    statusCnpj: statusOverride, // We use the tab source to determine validity usually, or column 7
    razaoSocial: String(getValue(8)) || String(getValue(2)), // Fallback to Name if Razao Social empty
    nomeContato: String(getValue(2)),
    telefone: String(getValue(3)),
    email: String(getValue(4)),
    instagram: String(getValue(5)),
    dataSubmissao,
    categoria: String(getValue(1)),
    
    // UTMs Extracted from URL
    utmSource: utmData.source,
    utmMedium: utmData.medium,
    utmCampaign: utmData.campaign,
    utmContent: utmData.content,
    utmTerm: utmData.term,
    utmId: utmData.id, // Ensure this field exists in Lead type or mapped correctly
    
    // Address
    cidade: cidade || 'Desconhecida',
    uf: uf || 'UF',
    cep: String(getValue(18)),

    // Defaults
    dealStatus: 'PENDING',
    notes: [],
    changeLog: []
  };
};

export const fetchLeadsFromSheet = async (sheetId: string, validTabName: string, invalidTabName: string): Promise<Lead[]> => {
  const fetchTab = async (tabName: string, status: 'VALID' | 'INVALID') => {
    // Construct GViz Query URL
    // tq=select * matches all
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tabName)}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch tab: ${tabName}`);
    
    const text = await response.text();
    const json = parseGVizResponse(text);
    
    if (!json || !json.table || !json.table.rows) return [];

    // Skip header row if it looks like a header (check first column for 'CNPJ')
    let rows = json.table.rows;
    const firstRowVal = rows[0]?.c?.[0]?.v;
    if (firstRowVal === 'CNPJ') {
        rows = rows.slice(1);
    }

    return rows.map((r: any) => mapRowToLead(r, status));
  };

  try {
    const [validLeads, invalidLeads] = await Promise.all([
      fetchTab(validTabName, 'VALID'),
      fetchTab(invalidTabName, 'INVALID')
    ]);
    
    return [...validLeads, ...invalidLeads];
  } catch (error) {
    console.error("Sheet sync error:", error);
    throw error;
  }
};