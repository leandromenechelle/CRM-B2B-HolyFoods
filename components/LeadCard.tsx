import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  UserCircle, Calendar, MessageCircle, DollarSign, ThumbsDown, 
  Clock, History, XCircle, CheckCircle, Send, Trash2, 
  Mic, Pause, FileText, Edit, Copy, Download, MapPin, Building, AlertTriangle
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Lead, MessageTemplate, Salesperson, Note, CnpjData } from '../types';
import { transcribeAudio } from '../services/geminiService';
import { fetchCnpjData } from '../services/cnpjService';

interface LeadCardProps {
  lead: Lead;
  templates: MessageTemplate[];
  salespeople: Salesperson[];
  onUpdateLead: (lead: Lead) => void;
  variant?: 'card' | 'modal';
  onClick?: () => void;
  isDuplicate?: boolean;
}

export const LeadCard: React.FC<LeadCardProps> = ({ 
  lead, templates, salespeople, onUpdateLead, variant = 'card', onClick, isDuplicate 
}) => {
  const [showWhatsModal, setShowWhatsModal] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  // State for Modal actions
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [wonValue, setWonValue] = useState('');
  const [lostReason, setLostReason] = useState('');
  const [isLoadingCnpj, setIsLoadingCnpj] = useState(false);
  const [hasFetchError, setHasFetchError] = useState(false);
  
  // Local state for CNPJ editing
  const [cnpjInput, setCnpjInput] = useState(lead.cnpj);

  // Sync local state if prop changes
  useEffect(() => {
      setCnpjInput(lead.cnpj);
  }, [lead.cnpj]);
  
  // State for Notes
  const [newNote, setNewNote] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  // Helpers
  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const daysSince = (dateString?: string, endDateString?: string) => {
      if (!dateString) return 0;
      const start = new Date(dateString);
      const end = endDateString ? new Date(endDateString) : new Date();
      const diffTime = Math.abs(end.getTime() - start.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  };

  const getUtmColor = (source: string) => {
      const s = (source || '').toLowerCase();
      if (s.includes('meta') || s.includes('facebook')) return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
      if (s.includes('google')) return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
      if (s.includes('instagram') || s.includes('ig')) return 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800';
      return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
  };
  
  const currentSalespersonObj = salespeople.find(s => s.name === lead.salesperson);

  // Actions
  const handleSendMessage = () => {
      const template = templates.find(t => t.id === selectedTemplateId);
      const messageBody = customMessage || template?.content || '';
      
      // Update Lead
      const updatedLead: Lead = {
          ...lead,
          messageSentAt: new Date().toISOString(),
          lastTemplateTitle: template?.title || 'Personalizada',
          messageHistory: [
              ...(lead.messageHistory || []),
              { sentAt: new Date().toISOString(), templateTitle: template?.title || 'Personalizada', salesperson: lead.salesperson || 'Desconhecido' }
          ],
          dealStatus: lead.dealStatus === 'PENDING' ? 'PENDING' : lead.dealStatus
      };
      
      onUpdateLead(updatedLead);
      setShowWhatsModal(false);
      
      // Open WhatsApp Web
      const phone = lead.telefone.replace(/\D/g, '');
      const encodedMsg = encodeURIComponent(messageBody.replace('[Nome]', lead.nomeContato).replace('[Razao Social]', lead.razaoSocial));
      window.open(`https://web.whatsapp.com/send?phone=55${phone}&text=${encodedMsg}`, '_blank');
  };

  const handleMarkWon = () => {
      const val = parseFloat(wonValue.replace('R$', '').replace('.', '').replace(',', '.').trim());
      onUpdateLead({
          ...lead,
          dealStatus: 'WON',
          wonDate: new Date().toISOString(),
          wonValue: isNaN(val) ? 0 : val
      });
      setShowWinModal(false);
  };

  const handleMarkLost = () => {
      onUpdateLead({
          ...lead,
          dealStatus: 'LOST',
          lostDate: new Date().toISOString(),
          lostReason: lostReason
      });
      setShowConfirmModal(false);
  };
  
  const triggerMarkLost = (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowConfirmModal(true);
  };

  const handleOpenWinModal = (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowWinModal(true);
  };

  const handleSaveCnpj = () => {
      if (cnpjInput !== lead.cnpj) {
          onUpdateLead({
              ...lead,
              cnpj: cnpjInput,
              statusCnpj: 'VALID' // Assume valid upon manual edit, user will audit via "Carregar Dados"
          });
      }
  };

  const handleFetchCnpj = async () => {
      setIsLoadingCnpj(true);
      setHasFetchError(false);
      try {
          // Use current input value if it differs from lead, or use lead.cnpj
          const cnpjToFetch = cnpjInput || lead.cnpj;
          const data = await fetchCnpjData(cnpjToFetch);
          if (data) {
              onUpdateLead({ 
                  ...lead, 
                  cnpj: cnpjToFetch, // Fix the CNPJ in the lead record
                  cnpjData: data,
                  // Auto-update address fields based on API
                  cidade: data.municipio,
                  uf: data.uf,
                  cep: data.cep
              });
          } else {
              setHasFetchError(true);
          }
      } catch (err) {
          setHasFetchError(true);
          console.error(err);
      } finally {
          setIsLoadingCnpj(false);
      }
  };

  const handleCopyEmail = (e: React.MouseEvent) => {
      e.stopPropagation();
      if(lead.email) {
          navigator.clipboard.writeText(lead.email);
          // Optional: Add a toast notification here if desired
      }
  };

  const handleCopyCnpjData = () => {
      if (!lead.cnpjData) return;
      const d = lead.cnpjData;
      const text = `
RAZÃO SOCIAL: ${d.razao_social}
NOME FANTASIA: ${d.nome_fantasia || '-'}
CNPJ: ${d.cnpj}
SITUAÇÃO: ${d.descricao_situacao_cadastral}
ABERTURA: ${d.data_inicio_atividade}
ENDEREÇO: ${d.logradouro}, ${d.numero} ${d.complemento} - ${d.bairro}, ${d.municipio}/${d.uf}
CEP: ${d.cep}
ATIVIDADE: ${d.cnae_fiscal_descricao}
      `.trim();
      navigator.clipboard.writeText(text);
      alert("Dados copiados para a área de transferência!");
  };

  const handleDownloadCnpjPdf = () => {
      if (!lead.cnpjData) return;
      const d = lead.cnpjData;
      const doc = new jsPDF();
      
      doc.setFontSize(16);
      doc.text("Ficha Cadastral CNPJ", 10, 20);
      
      doc.setFontSize(10);
      let y = 30;
      const addLine = (label: string, value: string) => {
          doc.setFont("helvetica", "bold");
          doc.text(`${label}:`, 10, y);
          doc.setFont("helvetica", "normal");
          doc.text(value || '-', 50, y);
          y += 8;
      };

      addLine("Razão Social", d.razao_social);
      addLine("Fantasia", d.nome_fantasia);
      addLine("CNPJ", d.cnpj);
      addLine("Situação", d.descricao_situacao_cadastral);
      addLine("Data Abertura", d.data_inicio_atividade);
      addLine("Logradouro", `${d.logradouro}, ${d.numero}`);
      addLine("Complemento", d.complemento);
      addLine("Bairro", d.bairro);
      addLine("Município/UF", `${d.municipio}/${d.uf}`);
      addLine("CEP", d.cep);
      addLine("Email", d.email);
      addLine("Telefone", d.ddd_telefone_1);
      addLine("Atividade Principal", d.cnae_fiscal_descricao);

      doc.save(`${d.cnpj}_ficha.pdf`);
  };
  
  const handleAddNote = () => {
      if(!newNote.trim()) return;
      const note: Note = {
          id: Date.now().toString(),
          type: 'TEXT',
          content: newNote,
          createdAt: new Date().toISOString()
      };
      onUpdateLead({ ...lead, notes: [note, ...(lead.notes || [])] });
      setNewNote('');
  };

  const handleRecordAudio = async () => {
      if (isRecording) {
          mediaRecorder?.stop();
          setIsRecording(false);
      } else {
          try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              const recorder = new MediaRecorder(stream);
              const chunks: BlobPart[] = [];
              
              recorder.ondataavailable = (e) => chunks.push(e.data);
              recorder.onstop = async () => {
                  const blob = new Blob(chunks, { type: 'audio/webm' });
                  const transcript = await transcribeAudio(blob);
                  
                  const note: Note = {
                      id: Date.now().toString(),
                      type: 'AUDIO',
                      content: transcript,
                      createdAt: new Date().toISOString()
                  };
                  onUpdateLead({ ...lead, notes: [note, ...(lead.notes || [])] });
              };
              
              recorder.start();
              setMediaRecorder(recorder);
              setIsRecording(true);
          } catch (e) {
              alert("Microfone não permitido.");
          }
      }
  };

  // Render Modals with React Portal to ensure they break out of the Card container
  const renderWhatsModal = () => createPortal(
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); setShowWhatsModal(false); }}>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-100 dark:border-white/10" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Enviar Mensagem</h3>
              
              <div className="space-y-4">
                  <div>
                      <label className="block text-xs font-bold text-gray-500 mb-2">Template</label>
                      <select 
                          className="w-full bg-gray-50 dark:bg-[#2C2C2E] rounded-xl px-4 py-3 text-sm dark:text-white outline-none focus:ring-2 focus:ring-hf-lemon"
                          value={selectedTemplateId}
                          onChange={(e) => {
                              setSelectedTemplateId(e.target.value);
                              const t = templates.find(tpl => tpl.id === e.target.value);
                              if(t) setCustomMessage(t.content.replace('[Nome]', lead.nomeContato).replace('[Razao Social]', lead.razaoSocial));
                          }}
                      >
                          <option value="">Selecione um template...</option>
                          {templates.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                      </select>
                  </div>
                  
                  <div>
                      <label className="block text-xs font-bold text-gray-500 mb-2">Mensagem</label>
                      <textarea 
                          className="w-full bg-gray-50 dark:bg-[#2C2C2E] rounded-xl px-4 py-3 text-sm dark:text-white h-32 resize-none outline-none focus:ring-2 focus:ring-hf-lemon"
                          value={customMessage}
                          onChange={(e) => setCustomMessage(e.target.value)}
                      />
                  </div>
                  
                  <div className="flex gap-3 mt-6">
                      <button onClick={() => setShowWhatsModal(false)} className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold text-sm">Cancelar</button>
                      <button onClick={handleSendMessage} className="flex-1 py-3 rounded-xl bg-hf-lemon text-white font-bold text-sm hover:bg-hf-lemonHover">Enviar WhatsApp</button>
                  </div>
              </div>
          </div>
      </div>,
      document.body
  );

  const renderWinModal = () => createPortal(
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); setShowWinModal(false); }}>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-100 dark:border-white/10" onClick={e => e.stopPropagation()}>
              <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4"><DollarSign size={32}/></div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Venda Realizada!</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Qual foi o valor total do pedido?</p>
              </div>
              
              <div className="mb-6">
                  <input 
                      type="number" 
                      placeholder="0,00" 
                      className="w-full text-center text-3xl font-bold bg-transparent border-b-2 border-gray-200 dark:border-gray-700 pb-2 focus:border-green-500 outline-none dark:text-white"
                      value={wonValue}
                      onChange={(e) => setWonValue(e.target.value)}
                      autoFocus
                  />
              </div>
              
              <div className="flex gap-3">
                  <button onClick={() => setShowWinModal(false)} className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold text-sm">Cancelar</button>
                  <button onClick={handleMarkWon} className="flex-1 py-3 rounded-xl bg-green-500 text-white font-bold text-sm hover:bg-green-600 shadow-lg shadow-green-500/30">Confirmar</button>
              </div>
          </div>
      </div>,
      document.body
  );

  const renderConfirmModal = () => createPortal(
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); setShowConfirmModal(false); }}>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-100 dark:border-white/10" onClick={e => e.stopPropagation()}>
               <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><ThumbsDown size={32}/></div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Marcar como Perdido</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Por que esse lead foi perdido?</p>
              </div>

               <div className="space-y-3 mb-6">
                  {['Sem contato', 'Preço alto', 'Concorrente', 'Sem interesse', 'Outro'].map(reason => (
                      <button 
                          key={reason}
                          onClick={() => setLostReason(reason)}
                          className={`w-full py-3 rounded-xl text-sm font-semibold transition ${lostReason === reason ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-gray-50 dark:bg-[#2C2C2E] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3A3A3C]'}`}
                      >
                          {reason}
                      </button>
                  ))}
               </div>
               
               <div className="flex gap-3">
                  <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold text-sm">Cancelar</button>
                  <button onClick={handleMarkLost} disabled={!lostReason} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 disabled:opacity-50">Confirmar</button>
              </div>
          </div>
      </div>,
      document.body
  );

  const isAuditoria = lead.statusCnpj === 'INVALID' && lead.dealStatus === 'PENDING';
  const isAguardando = lead.statusCnpj === 'VALID' && !lead.messageSentAt && lead.dealStatus === 'PENDING';
  const isEmContato = lead.messageSentAt && lead.dealStatus === 'PENDING';

  if (variant === 'card') {
    return (
        <>
            <div onClick={onClick} className={`
                glass rounded-[24px] p-6 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-medium group relative
            `}>
                {/* Header */}
                <div className="flex justify-between items-start mb-5 mt-2">
                    <div className="flex items-center gap-3">
                        {currentSalespersonObj?.photoUrl ? (
                            <img src={currentSalespersonObj.photoUrl} className="w-10 h-10 rounded-full object-cover shadow-sm ring-2 ring-white dark:ring-white/10" alt="vendedor" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-400 dark:text-gray-500 ring-2 ring-white dark:ring-white/10"><UserCircle size={20} /></div>
                        )}
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Vendedor</p>
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{lead.salesperson || 'Não atribuído'}</p>
                        </div>
                    </div>

                    {/* Submission Timestamp */}
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                        <Calendar size={12} /> {formatDateTime(lead.dataSubmissao)}
                    </div>
                </div>

                {/* Main Content */}
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-snug mb-2 truncate" title={lead.nomeContato}>{lead.nomeContato}</h3>
                    <div className="flex flex-wrap items-center gap-2">
                         <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide border ${getUtmColor(lead.utmSource)}`}>{lead.utmSource || 'Direct'}</span>
                         <span className="text-[11px] font-mono font-medium text-gray-400 dark:text-gray-500">{lead.cnpj}</span>
                    </div>
                </div>

                {/* Status/History Area */}
                <div className="mb-5">
                     {lead.messageHistory?.length ? (
                         <div className="bg-gray-50 dark:bg-black/20 rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden">
                             {/* Show latest */}
                             <div className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition" onClick={(e) => { e.stopPropagation(); setShowHistory(!showHistory); }}>
                                 <div className="flex items-center gap-2 overflow-hidden">
                                     <MessageCircle size={14} className="text-hf-lemon flex-shrink-0" />
                                     <span className="text-xs font-medium text-gray-600 dark:text-gray-300 truncate">{lead.messageHistory[lead.messageHistory.length-1].templateTitle}</span>
                                 </div>
                                 <div className="flex items-center gap-1">
                                     <span className="text-[10px] text-gray-400 dark:text-gray-500">{formatDateTime(lead.messageHistory[lead.messageHistory.length-1].sentAt)}</span>
                                     <History size={12} className={`text-gray-400 transition-transform ${showHistory ? 'rotate-180' : ''}`}/>
                                 </div>
                             </div>
                             
                             {/* Expanded History */}
                             {showHistory && (
                                 <div className="border-t border-gray-100 dark:border-white/5 max-h-[120px] overflow-y-auto custom-scrollbar bg-gray-50/50 dark:bg-black/20">
                                     {lead.messageHistory.slice().reverse().slice(1).map((msg, idx) => ( 
                                         <div key={idx} className="p-2 px-3 flex justify-between items-center text-[10px] border-b border-gray-100 dark:border-white/5 last:border-0 hover:bg-gray-100 dark:hover:bg-white/5">
                                             <span className="text-gray-500 dark:text-gray-400 truncate max-w-[120px]">{msg.templateTitle}</span>
                                             <span className="text-gray-400 dark:text-gray-600 font-mono">{formatDateTime(msg.sentAt)}</span>
                                         </div>
                                     ))}
                                     {lead.messageHistory.length === 1 && <p className="p-2 text-[10px] text-gray-400 text-center italic">Apenas 1 mensagem enviada.</p>}
                                 </div>
                             )}
                         </div>
                     ) : (
                         <div className="bg-gray-50 dark:bg-black/20 rounded-xl p-3 border border-gray-100 dark:border-white/5 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 italic">
                             <Clock size={14}/> Aguardando primeiro contato
                         </div>
                     )}
                </div>

                {/* Footer Actions & Stats - Added relative z-50 to ensure clickability over glass pseudo-element */}
                <div className="flex items-center justify-between border-t border-gray-100 dark:border-white/10 pt-4 mt-auto relative z-50">
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={(e) => { e.stopPropagation(); setShowWhatsModal(true); }} className="w-10 h-10 rounded-full bg-hf-lemon text-white flex items-center justify-center hover:bg-hf-lemonHover hover:scale-105 transition-all shadow-lg shadow-hf-lemon/30 tap-active"><MessageCircle size={18} /></button>
                        
                        {isEmContato && (
                            <>
                                <button type="button" onClick={handleOpenWinModal} className="w-10 h-10 rounded-full bg-white dark:bg-white/10 border border-gray-200 dark:border-white/5 text-gray-400 dark:text-gray-500 flex items-center justify-center hover:text-hf-green hover:border-hf-green transition-all shadow-sm hover:shadow-md tap-active"><DollarSign size={18}/></button>
                                <button type="button" onClick={triggerMarkLost} className="w-10 h-10 rounded-full bg-white dark:bg-white/10 border border-gray-200 dark:border-white/5 text-gray-400 dark:text-gray-500 flex items-center justify-center hover:text-red-500 hover:border-red-200 transition-all shadow-sm hover:shadow-md tap-active"><ThumbsDown size={18}/></button>
                            </>
                        )}
                    </div>
                    
                    {lead.dealStatus === 'WON' && (
                        <div className="flex flex-col items-end mr-4 flex-1">
                            <span className="text-sm font-bold text-hf-green dark:text-[#7BCA0C] tabular-nums">
                                {lead.wonValue ? `R$ ${lead.wonValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                            </span>
                            <span className="text-[10px] font-medium text-gray-400">
                                {lead.wonDate ? new Date(lead.wonDate).toLocaleDateString('pt-BR') : ''}
                            </span>
                        </div>
                    )}

                    {lead.dealStatus === 'LOST' && (
                        <div className="flex flex-col items-end mr-4 flex-1">
                            <span className="text-sm font-bold text-red-500 dark:text-red-400 tabular-nums truncate max-w-[100px]" title={lead.lostReason}>
                                {lead.lostReason || 'Perdido'}
                            </span>
                            <span className="text-[10px] font-medium text-gray-400">
                                {lead.lostDate ? new Date(lead.lostDate).toLocaleDateString('pt-BR') : ''}
                            </span>
                        </div>
                    )}
                    
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Dias</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white tabular-nums leading-none">
                            {lead.dealStatus === 'WON' 
                              ? daysSince(lead.dataSubmissao, lead.wonDate) 
                              : lead.dealStatus === 'LOST'
                                ? daysSince(lead.dataSubmissao, lead.lostDate)
                                : daysSince(lead.dataSubmissao)
                            }
                        </p>
                    </div>
                </div>
            </div>
            
            {showWhatsModal && renderWhatsModal()}
            {showWinModal && renderWinModal()}
            {showConfirmModal && renderConfirmModal()}
        </>
    );
  }

  // --- MODAL VIEW (DETAILED - NEW LAYOUT) ---
  return (
      <div className="space-y-6">
          
          {/* 1. Header: Name (Left) + Inline Tags (Right) */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
               <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{lead.nomeContato}</h2>
               <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wide border ${getUtmColor(lead.utmSource)}`}>{lead.utmSource || 'Direct'}</span>
                    <span className="text-xs font-mono font-bold bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/5">{lead.cnpj}</span>
                    {lead.categoria && <span className="text-xs font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 px-3 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800">{lead.categoria}</span>}
               </div>
          </div>
          
          {/* 2. KPIs Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Status</p>
                    <p className={`text-lg font-bold ${lead.dealStatus === 'WON' ? 'text-green-500' : lead.dealStatus === 'LOST' ? 'text-red-500' : 'text-gray-700 dark:text-white'}`}>
                        {lead.dealStatus === 'WON' ? 'Ganho' : lead.dealStatus === 'LOST' ? 'Perdido' : 'Em Negociação'}
                    </p>
                </div>
                <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Tempo de Ciclo</p>
                    <p className="text-lg font-bold text-gray-700 dark:text-white">{daysSince(lead.dataSubmissao)} dias</p>
                </div>
                <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Vendedor</p>
                     <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{lead.salesperson || 'N/A'}</p>
                </div>
                 <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Submissão</p>
                     <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{new Date(lead.dataSubmissao).toLocaleDateString('pt-BR')}</p>
                </div>
          </div>
          
          {/* 3. Contact Info (Full Width) - Changed from lg:grid-cols-4 to md:grid-cols-2 */}
          <div className="glass p-6 rounded-3xl border border-gray-100 dark:border-white/5 w-full">
               <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2 border-b border-gray-100 dark:border-white/5 pb-2">
                   <UserCircle size={18} className="text-gray-400"/> Dados de Contato
               </h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div><label className="text-xs text-gray-400 uppercase font-bold block mb-1">Razão Social</label><p className="font-medium text-gray-800 dark:text-gray-200 break-words">{lead.razaoSocial}</p></div>
                  
                  <div>
                      <label className="text-xs text-gray-400 uppercase font-bold block mb-1">Email</label>
                      <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-800 dark:text-gray-200 break-words truncate max-w-[200px] sm:max-w-none" title={lead.email}>{lead.email}</p>
                          {lead.email && (
                              <button onClick={handleCopyEmail} className="p-1.5 text-gray-400 hover:text-hf-lemon hover:bg-hf-lemon/10 rounded-lg transition" title="Copiar Email">
                                  <Copy size={14} />
                              </button>
                          )}
                      </div>
                  </div>
                  
                  <div><label className="text-xs text-gray-400 uppercase font-bold block mb-1">Telefone</label><p className="font-medium text-gray-800 dark:text-gray-200">{lead.telefone}</p></div>
                  <div><label className="text-xs text-gray-400 uppercase font-bold block mb-1">Localização</label><p className="font-medium text-gray-800 dark:text-gray-200">{lead.cidade}/{lead.uf}</p></div>
               </div>
          </div>

          {/* 4. CNPJ Data (Full Width - New Section) */}
          <div className="glass p-6 rounded-3xl border border-gray-100 dark:border-white/5 w-full">
              <div className="flex flex-wrap justify-between items-center mb-4 border-b border-gray-100 dark:border-white/5 pb-4 gap-4">
                  <div className="flex items-center gap-3 w-full md:w-auto">
                      <FileText size={18} className="text-gray-400"/> 
                      <h4 className="font-bold text-gray-900 dark:text-white mr-2 whitespace-nowrap">Dados do CNPJ (BrasilAPI)</h4>
                      <input 
                          type="text" 
                          value={cnpjInput} 
                          onChange={(e) => setCnpjInput(e.target.value)}
                          onBlur={handleSaveCnpj}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveCnpj()}
                          className="bg-gray-50 dark:bg-[#2C2C2E] border border-gray-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm font-mono font-bold text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-hf-lemon outline-none w-48 transition-all"
                      />
                  </div>
                  <div className="flex gap-2 ml-auto">
                      {lead.cnpjData && (
                          <>
                              <button onClick={handleCopyCnpjData} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-500 transition" title="Copiar Dados"><Copy size={16}/></button>
                              <button onClick={handleDownloadCnpjPdf} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-500 transition" title="Baixar PDF"><Download size={16}/></button>
                          </>
                      )}
                      <button onClick={handleFetchCnpj} disabled={isLoadingCnpj} className="text-xs bg-gray-900 dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg font-bold hover:bg-black dark:hover:bg-gray-200 transition shadow-sm">
                           {isLoadingCnpj ? 'Carregando...' : 'Carregar Dados'}
                      </button>
                  </div>
              </div>
              
              {lead.cnpjData ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                      <div className="space-y-3">
                          <div><span className="block text-[10px] uppercase font-bold text-gray-400">Razão Social Oficial</span><span className="font-semibold text-gray-800 dark:text-gray-200">{lead.cnpjData.razao_social}</span></div>
                          <div><span className="block text-[10px] uppercase font-bold text-gray-400">Nome Fantasia</span><span className="font-semibold text-gray-800 dark:text-gray-200">{lead.cnpjData.nome_fantasia || '-'}</span></div>
                          <div><span className="block text-[10px] uppercase font-bold text-gray-400">Situação Cadastral</span><span className={`font-bold ${lead.cnpjData.descricao_situacao_cadastral === 'ATIVA' ? 'text-green-500' : 'text-red-500'}`}>{lead.cnpjData.descricao_situacao_cadastral}</span></div>
                      </div>
                      <div className="space-y-3">
                          <div><span className="block text-[10px] uppercase font-bold text-gray-400">Logradouro</span><span className="font-medium text-gray-800 dark:text-gray-300">{lead.cnpjData.logradouro}, {lead.cnpjData.numero}</span></div>
                           <div><span className="block text-[10px] uppercase font-bold text-gray-400">Bairro/Cidade</span><span className="font-medium text-gray-800 dark:text-gray-300">{lead.cnpjData.bairro} - {lead.cnpjData.municipio}/{lead.cnpjData.uf}</span></div>
                           <div><span className="block text-[10px] uppercase font-bold text-gray-400">CEP</span><span className="font-medium text-gray-800 dark:text-gray-300">{lead.cnpjData.cep}</span></div>
                      </div>
                      <div className="space-y-3">
                          <div><span className="block text-[10px] uppercase font-bold text-gray-400">Atividade Principal</span><span className="font-medium text-gray-800 dark:text-gray-300 text-xs leading-tight">{lead.cnpjData.cnae_fiscal_descricao}</span></div>
                          <div><span className="block text-[10px] uppercase font-bold text-gray-400">Abertura</span><span className="font-medium text-gray-800 dark:text-gray-300">{lead.cnpjData.data_inicio_atividade}</span></div>
                      </div>
                  </div>
              ) : hasFetchError ? (
                  <div className="text-center py-6 text-red-600 dark:text-red-400 font-bold text-sm bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/30 flex items-center justify-center gap-2">
                       <AlertTriangle size={16} /> CNPJ Inválido. Não encontrado.
                  </div>
              ) : (
                  <div className="text-center py-6 text-gray-400 text-sm italic bg-gray-50 dark:bg-black/20 rounded-xl">
                      Dados detalhados do CNPJ não carregados.
                  </div>
              )}
          </div>

          {/* 5. Split Row: Actions (Left) & History (Right) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Actions */}
              <div className="glass p-6 rounded-3xl border border-gray-100 dark:border-white/5 bg-hf-lemon/5 dark:bg-hf-lemon/5 h-full">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-4">Ações Rápidas</h4>
                  <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setShowWhatsModal(true)} className="py-4 px-4 bg-hf-lemon text-white rounded-xl font-bold text-sm shadow-lg shadow-hf-lemon/20 hover:bg-hf-lemonHover transition flex items-center justify-center gap-2 col-span-2 tap-active"><MessageCircle size={18}/> Enviar WhatsApp</button>
                      {lead.dealStatus === 'PENDING' && (
                          <>
                            <button onClick={handleOpenWinModal} className="py-3 px-4 bg-white dark:bg-[#2C2C2E] text-green-600 font-bold text-sm rounded-xl border border-gray-200 dark:border-white/5 hover:border-green-200 transition flex items-center justify-center gap-2 tap-active"><CheckCircle size={18}/> Venda</button>
                            <button onClick={triggerMarkLost} className="py-3 px-4 bg-white dark:bg-[#2C2C2E] text-red-500 font-bold text-sm rounded-xl border border-gray-200 dark:border-white/5 hover:border-red-200 transition flex items-center justify-center gap-2 tap-active"><XCircle size={18}/> Perda</button>
                          </>
                      )}
                  </div>
              </div>

              {/* History */}
              <div className="glass p-6 rounded-3xl border border-gray-100 dark:border-white/5 h-full overflow-hidden flex flex-col">
                   <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><History size={18} className="text-gray-400"/> Histórico de Contato</h4>
                   <div className="relative border-l-2 border-gray-100 dark:border-white/10 ml-3 space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[200px]">
                       {lead.messageHistory?.slice().reverse().map((msg, i) => (
                           <div key={i} className="pl-6 relative">
                               <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-[#1C1C1E]"></div>
                               <p className="text-xs font-bold text-gray-400 mb-1">{formatDateTime(msg.sentAt)}</p>
                               <p className="font-medium text-gray-800 dark:text-gray-200 text-sm">{msg.templateTitle}</p>
                               <p className="text-xs text-gray-500">Enviado por: {msg.salesperson}</p>
                           </div>
                       ))}
                       {!lead.messageHistory?.length && <p className="pl-6 text-gray-400 text-sm italic">Nenhum contato registrado.</p>}
                   </div>
              </div>
          </div>
          
           {/* 6. Notes & Audio (Full Width Bottom) */}
           <div className="glass p-6 rounded-3xl border border-gray-100 dark:border-white/5 w-full">
              <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">Notas & Áudio</h4>
              <div className="flex gap-2 mb-4">
                  <input 
                    value={newNote} 
                    onChange={(e) => setNewNote(e.target.value)} 
                    placeholder="Adicionar nota..." 
                    className="flex-1 bg-gray-50 dark:bg-[#2C2C2E] rounded-xl px-4 py-3 text-sm outline-none dark:text-white focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700 transition"
                  />
                  <button onClick={handleAddNote} className="p-3 bg-gray-200 dark:bg-gray-700 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition"><Send size={18}/></button>
                  <button onClick={handleRecordAudio} className={`p-3 rounded-xl transition ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
                     {isRecording ? <Pause size={18} /> : <Mic size={18} />}
                  </button>
              </div>
              <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar">
                  {lead.notes?.map(note => (
                      <div key={note.id} className="bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-xl border border-gray-100 dark:border-white/5">
                          <div className="flex justify-between items-center mb-1">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${note.type === 'AUDIO' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' : 'bg-gray-200 text-gray-600 dark:bg-gray-700'}`}>{note.type}</span>
                              <span className="text-[10px] text-gray-400">{formatDateTime(note.createdAt)}</span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{note.content}</p>
                      </div>
                  ))}
                  {!lead.notes?.length && <p className="text-center text-gray-400 text-sm italic py-4">Nenhuma nota.</p>}
              </div>
           </div>

          {showWhatsModal && renderWhatsModal()}
          {showWinModal && renderWinModal()}
          {showConfirmModal && renderConfirmModal()}
      </div>
  );
};