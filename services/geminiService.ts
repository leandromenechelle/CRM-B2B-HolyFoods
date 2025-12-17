import { GoogleGenAI } from "@google/genai";
import { Lead } from "../types";

// Helper to get API Key (safely assumes env var is present per instructions)
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Transcribes audio using Gemini 2.5 Flash
 */
export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  try {
    const ai = getAiClient();
    
    // Convert Blob to Base64
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: audioBlob.type || 'audio/webm',
              data: base64Data
            }
          },
          {
            text: "Transcreva este áudio para português do Brasil. Retorne apenas o texto transcrito, sem comentários adicionais."
          }
        ]
      }
    });

    return response.text || "Não foi possível transcrever o áudio.";
  } catch (error) {
    console.error("Transcription error:", error);
    return "Erro na transcrição.";
  }
};

/**
 * Chat with the dataset using Gemini 3 Pro Preview
 */
export const chatWithData = async (query: string, leads: Lead[]): Promise<string> => {
  try {
    const ai = getAiClient();
    
    // Prepare context
    const contextData = JSON.stringify(leads.map(l => ({
      ...l,
      notes: l.notes.map(n => ({ type: n.type, content: n.content, date: n.createdAt }))
    })));

    const systemPrompt = `
      Você é um assistente especialista em operações de vendas.
      Você tem acesso aos seguintes dados de leads em formato JSON:
      ${contextData}

      Responda às perguntas do usuário sobre essa operação. 
      Seja analítico e útil. 
      Analise tendências de UTM, tempos de resposta, conversão, etc.
      O hoje é ${new Date().toLocaleDateString('pt-BR')}.
      
      IMPORTANTE: Use Markdown para formatar sua resposta (negrito, listas, tabelas se necessário).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: query,
      config: {
        systemInstruction: systemPrompt,
      }
    });

    return response.text || "Desculpe, não consegui analisar os dados agora.";
  } catch (error) {
    console.error("Chat error:", error);
    return "Ocorreu um erro ao processar sua pergunta.";
  }
};

/**
 * Quick analysis using Gemini 2.5 Flash
 */
export const quickAnalysis = async (leads: Lead[]): Promise<string> => {
  try {
    const ai = getAiClient();
    // Reduce payload size for quick analysis
    const summaryData = JSON.stringify(leads.map(l => ({ s: l.statusCnpj, utm: l.utmSource, deal: l.dealStatus })));
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Switched to stable Flash model for reliability
      contents: `Analise rapidamente este JSON de vendas e me dê um resumo de 1 frase sobre a saúde da operação (foco em volume e origem): ${summaryData}`,
    });

    return response.text || "Sem dados suficientes.";
  } catch (error) {
    console.error("Quick analysis error:", error);
    return "Análise indisponível no momento.";
  }
};

/**
 * Generate Sales Message Template with strict tag rules
 */
export const generateTemplateDraft = async (instruction: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `ATUE COMO: Um especialista em Copywriting B2B para WhatsApp.
      
      TAREFA: Crie um template de mensagem de vendas curto, direto e persuasivo baseado na instrução abaixo.
      INSTRUÇÃO: "${instruction}"
      
      REGRAS RÍGIDAS DE FORMATAÇÃO:
      1. Use APENAS estas tags dinâmicas onde apropriado: {nome_cliente}, {nome_vendedor}, {razao_social}, {cnpj}, {telefone}.
      2. NUNCA responda como um chat ("Aqui está sua mensagem..."). Retorne APENAS o texto da mensagem.
      3. Não use aspas no início ou fim.
      4. O tom deve ser profissional mas acessível (Holy Foods style).`,
    });
    return response.text || "";
  } catch (error) {
    console.error("Template gen error", error);
    return "Erro ao gerar template.";
  }
};

/**
 * Generate Deep Strategic Insights (Dedicated Page)
 */
export const generateStrategicInsights = async (leads: Lead[]): Promise<string> => {
  try {
    const ai = getAiClient();
    
    // 1. Pre-calculate metrics in JS to avoid LLM hallucination on math
    const total = leads.length;
    const won = leads.filter(l => l.dealStatus === 'WON');
    const lost = leads.filter(l => l.dealStatus === 'LOST');
    
    const winRate = total > 0 ? ((won.length / total) * 100).toFixed(1) : 0;
    const avgTicket = won.reduce((sum, l) => sum + (l.wonValue || 0), 0) / (won.length || 1);
    
    // Channel Analysis
    const channels: Record<string, { total: number, won: number }> = {};
    leads.forEach(l => {
        const src = l.utmSource || 'Direct';
        if (!channels[src]) channels[src] = { total: 0, won: 0 };
        channels[src].total++;
        if (l.dealStatus === 'WON') channels[src].won++;
    });
    
    // Convert to readable string for Prompt
    const channelStats = Object.entries(channels)
        .map(([name, stat]) => `${name}: ${stat.won}/${stat.total} wins (${((stat.won/stat.total)*100).toFixed(1)}%)`)
        .join(', ');

    const prompt = `
      ATUE COMO: Um Analista Sênior de Revenue Operations (RevOps) auditando uma operação B2B.
      
      DADOS REAIS DA OPERAÇÃO (JÁ CALCULADOS):
      - Total Leads: ${total}
      - Taxa de Conversão Global: ${winRate}%
      - Ticket Médio: R$ ${avgTicket.toFixed(2)}
      - Performance por Canal: ${channelStats}
      
      OBJETIVO: Identificar ineficiências ocultas e propor ações táticas. Evite generalismos. Seja técnico e direto.
      
      ESTRUTURA DE RESPOSTA (HTML):
      Retorne APENAS o HTML dentro de uma div. Use classes Tailwind CSS.
      Estilo: Minimalista, fundo transparente, textos legíveis em modo Dark (use text-gray-900 dark:text-white).
      
      SEÇÕES OBRIGATÓRIAS:
      
      1. <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
         - Card "Raio-X de Conversão": Analise a taxa de ${winRate}%. Compare canais de alto volume vs alta conversão. Por que o canal X está performando melhor? É a qualidade do lead ou o volume?
         - Card "Gargalo Crítico": Identifique onde o dinheiro está sendo queimado (ex: canal com muitos leads e zero vendas).
      
      2. <div class="mt-10 p-8 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-3xl"> 
         <h3 class="...">Plano de Ação Tático (Próximos 7 dias)</h3>
         - Liste 3 ações granulares. Exemplo: "Pausar campanha X no Meta pois o CAC está alto", "Criar script específico para leads de origem Y".
         - Para cada ação, defina o impacto esperado (Baixo, Médio, Alto).
      
      IMPORTANTE:
      - Use <span class="px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-bold">TAGS</span> para destacar pontos críticos.
      - Não invente dados. Use os dados fornecidos.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
    });

    return response.text || "<p>Análise indisponível.</p>";
  } catch (error) {
    console.error("Strategic insights error", error);
    return "<p>Erro ao processar dados estratégicos.</p>";
  }
};