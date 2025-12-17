import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  UserCircle, Calendar, MessageCircle, DollarSign, ThumbsDown, 
  Clock, History, XCircle, CheckCircle, Send, Trash2, 
  Mic, Pause, FileText, Edit, Copy, Download, MapPin, Building, AlertTriangle, Save, RefreshCw, X, AlertOctagon, Check, UserX, Tag, Target
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Lead, MessageTemplate, Salesperson, Note, CnpjData, ChangeLogItem } from '../types';
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
  const [showSentConfirmModal, setShowSentConfirmModal] = useState(false);
  
  const [showHistory, setShowHistory] = useState(false);
  
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [wonValue, setWonValue] = useState('');
  const [lostReason, setLostReason] = useState('');
  const [isLoadingCnpj, setIsLoadingCnpj] = useState(false);
  const [hasFetchError, setHasFetchError] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(lead.nomeContato);
  const [editPhone, setEditPhone] = useState(lead.telefone);
  const [editEmail, setEditEmail] = useState(lead.email);
  const [editSalesperson, setEditSalesperson] = useState(lead.salesperson || '');
  
  const [cnpjInput, setCnpjInput] = useState(lead.cnpj);

  useEffect(() => {
      setCnpjInput(lead.cnpj);
      setEditName(lead.nomeContato);
      setEditPhone(lead.telefone);
      setEditEmail(lead.email);
      setEditSalesperson(lead.salesperson || '');
      if (lead.messageStatus === 'PENDING_CONFIRMATION') { setShowSentConfirmModal(true); }
  }, [lead]);
  
  const [newNote, setNewNote] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

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
  const handleStartSend = () => {
      const template = templates.find(t => t.id === selectedTemplateId);
      const messageBody = customMessage || template?.content || '';
      const phone = lead.telefone.replace(/\D/g, '');
      const encodedMsg = encodeURIComponent(messageBody.replace('{nome_cliente}', lead.nomeContato).replace('{razao_social}', lead.razaoSocial).replace('{cnpj}', lead.cnpj).replace('{nome_vendedor}', lead.salesperson || 'Eu'));
      onUpdateLead({ ...lead, messageStatus: 'PENDING_CONFIRMATION', lastTemplateTitle: template?.title || 'Personalizada' });
      setShowWhatsModal(false); setShowSentConfirmModal(true); window.open(`https://web.whatsapp.com/send?phone=55${phone}&text=${encodedMsg}`, '_blank');
  };

  const handleConfirmSent = () => {
      onUpdateLead({ ...lead, messageSentAt: new Date().toISOString(), messageStatus: 'SENT', dealStatus: lead.dealStatus === 'PENDING' ? 'PENDING' : lead.dealStatus, messageHistory: [ ...(lead.messageHistory || []), { sentAt: new Date().toISOString(), templateTitle: lead.lastTemplateTitle || 'Mensagem WhatsApp', salesperson: lead.salesperson || 'Desconhecido', status: 'SUCCESS' } ] });
      setShowSentConfirmModal(false);
  };

  const handleConfirmFailed = () => {
      onUpdateLead({ ...lead, messageStatus: 'FAILED', changeLog: [...(lead.changeLog || []), { id: Date.now().toString(), description: 'Falha no envio de mensagem WhatsApp', timestamp: new Date().toISOString(), author: 'Sistema' }], messageHistory: [ ...(lead.messageHistory || []), { sentAt: new Date().toISOString(), templateTitle: 'Tentativa Falha', salesperson: lead.salesperson || 'Desconhecido', status: 'FAILED' } ] });
      setShowSentConfirmModal(false);
  };

  const handleMarkWon = () => {
      const val = parseFloat(wonValue.replace('R$', '').replace('.', '').replace(',', '.').trim());
      onUpdateLead({ ...lead, dealStatus: 'WON', wonDate: new Date().toISOString(), wonValue: isNaN(val) ? 0 : val });
      setShowWinModal(false);
  };

  const handleMarkLost = () => {
      onUpdateLead({ ...lead, dealStatus: 'LOST', lostDate: new Date().toISOString(), lostReason: lostReason });
      setShowConfirmModal(false);
  };
  
  const triggerMarkLost = (e: React.MouseEvent) => { e.stopPropagation(); setShowConfirmModal(true); };
  const handleOpenWinModal = (e: React.MouseEvent) => { e.stopPropagation(); setShowWinModal(true); };

  const logChange = (description: string) => ({ id: Date.now().toString(), description, timestamp: new Date().toISOString(), author: 'Operador' });

  const handleSaveChanges = () => {
      const changes: ChangeLogItem[] = [];
      if (editName !== lead.nomeContato) changes.push(logChange(`Alterou Nome de "${lead.nomeContato}" para "${editName}"`));
      if (editPhone !== lead.telefone) changes.push(logChange(`Alterou Telefone de "${lead.telefone}" para "${editPhone}"`));
      if (editEmail !== lead.email) changes.push(logChange(`Alterou Email de "${lead.email}" para "${editEmail}"`));
      if (editSalesperson !== lead.salesperson) changes.push(logChange(`Alterou Vendedor de "${lead.salesperson || 'N/A'}" para "${editSalesperson}"`));
      if (cnpjInput !== lead.cnpj) changes.push(logChange(`Alterou CNPJ de "${lead.cnpj}" para "${cnpjInput}"`));

      if (changes.length > 0) {
          onUpdateLead({ ...lead, nomeContato: editName, telefone: editPhone, email: editEmail, salesperson: editSalesperson, cnpj: cnpjInput, statusCnpj: cnpjInput !== lead.cnpj ? 'VALID' : lead.statusCnpj, changeLog: [...(lead.changeLog || []), ...changes] });
      }
      setIsEditing(false);
  };

  const handleToggleStatus = () => {
      const newStatus = lead.statusCnpj === 'VALID' ? 'INVALID' : 'VALID';
      const log = logChange(`Moveu lead de ${lead.statusCnpj === 'VALID' ? 'Válido' : 'Auditoria'} para ${newStatus === 'VALID' ? 'Válido' : 'Auditoria'}`);
      onUpdateLead({ ...lead, statusCnpj: newStatus, changeLog: [...(lead.changeLog || []), log] });
  };

  const handleFetchCnpj = async () => {
      setIsLoadingCnpj(true); setHasFetchError(false);
      try {
          const cnpjToFetch = cnpjInput || lead.cnpj;
          const data = await fetchCnpjData(cnpjToFetch);
          if (data) {
              const log = logChange(`Carregou dados automáticos do CNPJ ${cnpjToFetch}`);
              onUpdateLead({ ...lead, cnpj: cnpjToFetch, cnpjData: data, razaoSocial: data.razao_social, cidade: data.municipio, uf: data.uf, cep: data.cep, changeLog: [...(lead.changeLog || []), log] });
          } else { setHasFetchError(true); }
      } catch (err) { setHasFetchError(true); console.error(err); } finally { setIsLoadingCnpj(false); }
  };

  const handleCopyEmail = (e: React.MouseEvent) => { e.stopPropagation(); if(lead.email) navigator.clipboard.writeText(lead.email); };

  const handleCopyCnpjData = () => {
      if (!lead.cnpjData) return;
      const d = lead.cnpjData;
      const text = `RAZÃO SOCIAL: ${d.razao_social}\nNOME FANTASIA: ${d.nome_fantasia || '-'}\nCNPJ: ${d.cnpj}\n...`;
      navigator.clipboard.writeText(text);
      alert("Dados copiados para a área de transferência!");
  };

  const handleDownloadCnpjPdf = () => {
      if (!lead.cnpjData) return;
      const d = lead.cnpjData;
      const doc = new jsPDF();

      doc.setFontSize(18);
      doc.text("Ficha Cadastral do Cliente", 10, 20);
      
      doc.setFontSize(12);
      doc.text(`CNPJ: ${d.cnpj}`, 10, 35);
      doc.text(`Razão Social: ${d.razao_social}`, 10, 45);
      doc.text(`Nome Fantasia: ${d.nome_fantasia || 'N/A'}`, 10, 55);
      doc.text(`Situação: ${d.descricao_situacao_cadastral}`, 10, 65);
      
      doc.text("Endereço:", 10, 80);
      doc.setFontSize(10);
      doc.text(`${d.logradouro}, ${d.numero}`, 10, 87);
      doc.text(`${d.bairro} - ${d.municipio}/${d.uf}`, 10, 93);
      doc.text(`CEP: ${d.cep}`, 10, 99);

      doc.setFontSize(12);
      doc.text("Atividade Principal:", 10, 115);
      doc.setFontSize(10);
      doc.text(doc.splitTextToSize(d.cnae_fiscal_descricao, 180), 10, 122);

      if (d.qsa && d.qsa.length > 0) {
          doc.setFontSize(12);
          doc.text("Quadro Societário:", 10, 140);
          doc.setFontSize(10);
          let y = 147;
          d.qsa.forEach(socio => {
              doc.text(`- ${socio.nome_socio} (${socio.qualifica_socio})`, 10, y);
              y += 6;
          });
      }

      doc.save(`Ficha_${d.cnpj}.pdf`);
  };
  
  const handleAddNote = () => {
      if(!newNote.trim()) return;
      const note: Note = { id: Date.now().toString(), type: 'TEXT', content: newNote, createdAt: new Date().toISOString() };
      onUpdateLead({ ...lead, notes: [note, ...(lead.notes || [])] });
      setNewNote('');
  };

  const handleRecordAudio = async () => {
      if (isRecording) { mediaRecorder?.stop(); setIsRecording(false); } 
      else {
          try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              const recorder = new MediaRecorder(stream);
              const chunks: BlobPart[] = [];
              recorder.ondataavailable = (e) => chunks.push(e.data);
              recorder.onstop = async () => {
                  const blob = new Blob(chunks, { type: 'audio/webm' });
                  const transcript = await transcribeAudio(blob);
                  const note: Note = { id: Date.now().toString(), type: 'AUDIO', content: transcript, createdAt: new Date().toISOString() };
                  onUpdateLead({ ...lead, notes: [note, ...(lead.notes || [])] });
              };
              recorder.start(); setMediaRecorder(recorder); setIsRecording(true);
          } catch (e) { alert("Microfone não permitido."); }
      }
  };

  // Render Modals (Same logic as before, just kept for context)
  const renderWhatsModal = () => createPortal(
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); setShowWhatsModal(false); }}>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-100 dark:border-white/10" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Enviar Mensagem</h3>
              <div className="space-y-4">
                  <div><label className="block text-xs font-bold text-gray-500 mb-2">Template</label><select className="w-full bg-gray-50 dark:bg-[#2C2C2E] rounded-xl px-4 py-3 text-sm dark:text-white outline-none focus:ring-2 focus:ring-hf-lemon" value={selectedTemplateId} onChange={(e) => { setSelectedTemplateId(e.target.value); const t = templates.find(tpl => tpl.id === e.target.value); if(t) setCustomMessage(t.content.replace('{nome_cliente}', lead.nomeContato).replace('{razao_social}', lead.razaoSocial).replace('{cnpj}', lead.cnpj).replace('{nome_vendedor}', lead.salesperson || 'Eu')); }}><option value="">Selecione um template...</option>{templates.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select></div>
                  <div><label className="block text-xs font-bold text-gray-500 mb-2">Mensagem</label><textarea className="w-full bg-gray-50 dark:bg-[#2C2C2E] rounded-xl px-4 py-3 text-sm dark:text-white h-32 resize-none outline-none focus:ring-2 focus:ring-hf-lemon" value={customMessage} onChange={(e) => setCustomMessage(e.target.value)} /></div>
                  <div className="flex gap-3 mt-6"><button onClick={() => setShowWhatsModal(false)} className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold text-sm">Cancelar</button><button onClick={handleStartSend} className="flex-1 py-3 rounded-xl bg-hf-lemon text-white font-bold text-sm hover:bg-hf-lemonHover">Enviar WhatsApp</button></div>
              </div>
          </div>
      </div>, document.body
  );
  
  const renderSentConfirmModal = () => createPortal(
      <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-8 w-full max-w-sm shadow-floating border-2 border-hf-lemon/50 animate-enter text-center">
              <div className="w-16 h-16 bg-hf-lemon/20 text-hf-lemon rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse"><MessageCircle size={32} /></div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Confirmação de Envio</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Foi possível enviar a mensagem para <strong>{lead.nomeContato}</strong> no WhatsApp Web?</p>
              <div className="space-y-3"><button onClick={handleConfirmSent} className="w-full py-4 rounded-xl bg-hf-lemon text-white font-bold text-sm hover:bg-hf-lemonHover shadow-lg shadow-hf-lemon/30 flex items-center justify-center gap-2"><Check size={18} /> SIM, mensagem enviada</button><button onClick={handleConfirmFailed} className="w-full py-4 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-bold text-sm hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition flex items-center justify-center gap-2"><X size={18} /> NÃO, houve um erro</button></div>
          </div>
      </div>, document.body
  );

  const renderWinModal = () => createPortal(
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); setShowWinModal(false); }}>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-100 dark:border-white/10" onClick={e => e.stopPropagation()}>
              <div className="text-center mb-6"><div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4"><DollarSign size={32}/></div><h3 className="text-xl font-bold text-gray-900 dark:text-white">Venda Realizada!</h3></div>
              <div className="mb-6"><input type="number" placeholder="0,00" className="w-full text-center text-3xl font-bold bg-transparent border-b-2 border-gray-200 dark:border-gray-700 pb-2 focus:border-green-500 outline-none dark:text-white" value={wonValue} onChange={(e) => setWonValue(e.target.value)} autoFocus /></div>
              <div className="flex gap-3"><button onClick={() => setShowWinModal(false)} className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold text-sm">Cancelar</button><button onClick={handleMarkWon} className="flex-1 py-3 rounded-xl bg-green-500 text-white font-bold text-sm hover:bg-green-600 shadow-lg shadow-green-500/30">Confirmar</button></div>
          </div>
      </div>, document.body
  );

  const renderConfirmModal = () => createPortal(
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); setShowConfirmModal(false); }}>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-100 dark:border-white/10" onClick={e => e.stopPropagation()}>
               <div className="text-center mb-6"><div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><ThumbsDown size={32}/></div><h3 className="text-xl font-bold text-gray-900 dark:text-white">Marcar como Perdido</h3></div>
               <div className="space-y-3 mb-6">{['Sem contato', 'Preço alto', 'Concorrente', 'Sem interesse', 'Outro'].map(reason => (<button key={reason} onClick={() => setLostReason(reason)} className={`w-full py-3 rounded-xl text-sm font-semibold transition ${lostReason === reason ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-gray-50 dark:bg-[#2C2C2E] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3A3A3C]'}`}>{reason}</button>))}</div>
               <div className="flex gap-3"><button onClick={() => setShowConfirmModal(false)} className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold text-sm">Cancelar</button><button onClick={handleMarkLost} disabled={!lostReason} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 disabled:opacity-50">Confirmar</button></div>
          </div>
      </div>, document.body
  );

  const isEmContato = lead.messageSentAt && lead.dealStatus === 'PENDING';

  if (variant === 'card') {
    const latestMsg = lead.messageHistory && lead.messageHistory.length > 0 ? lead.messageHistory[lead.messageHistory.length - 1] : null;
    const isLatestFailed = latestMsg?.status === 'FAILED' || latestMsg?.templateTitle === 'Tentativa Falha';
    return (
        <>
            <div onClick={onClick} className={`glass rounded-[24px] p-6 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-medium group relative ${lead.messageStatus === 'PENDING_CONFIRMATION' ? 'ring-2 ring-orange-400 animate-pulse' : ''}`}>
                <div className="flex justify-between items-start mb-5 mt-2">
                    <div className="flex items-center gap-3">{currentSalespersonObj?.photoUrl ? <img src={currentSalespersonObj.photoUrl} className="w-10 h-10 rounded-full object-cover shadow-sm ring-2 ring-white dark:ring-white/10" alt="vendedor" /> : <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-400 dark:text-gray-500 ring-2 ring-white dark:ring-white/10"><UserCircle size={20} /></div>}<div><p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Vendedor</p><p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{lead.salesperson || 'Não atribuído'}</p></div></div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide"><Calendar size={12} /> {formatDateTime(lead.dataSubmissao)}</div>
                </div>
                <div className="mb-6"><h3 className="text-lg font-bold text-gray-900 dark:text-white leading-snug mb-2 truncate" title={lead.nomeContato}>{lead.nomeContato}</h3><div className="flex flex-wrap items-center gap-2"><span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide border ${getUtmColor(lead.utmSource)}`}>{lead.utmSource || 'Direct'}</span><span className="text-[11px] font-mono font-medium text-gray-400 dark:text-gray-500">{lead.cnpj}</span><span className="text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide border bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800 flex items-center gap-1"><Tag size={10} /> {lead.categoria || 'Outros'}</span></div></div>
                <div className="mb-5">
                     {lead.isTransferPending && <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 border border-red-100 dark:border-red-900/30 flex items-center gap-2 text-xs text-red-600 font-bold mb-2"><UserX size={14}/> Ex-{lead.originalOwner} (Pendente)</div>}
                     {lead.messageStatus === 'PENDING_CONFIRMATION' && <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 border border-orange-100 dark:border-orange-900/30 flex items-center gap-2 text-xs text-orange-600 font-bold mb-2"><AlertOctagon size={14}/> Aguardando Confirmação</div>}
                     {lead.messageHistory?.length && latestMsg ? (<div className={`rounded-xl border overflow-hidden ${isLatestFailed ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30' : 'bg-gray-50 dark:bg-black/20 border-gray-100 dark:border-white/5'}`}><div className="p-3 flex items-center justify-between cursor-pointer hover:opacity-80 transition" onClick={(e) => { e.stopPropagation(); setShowHistory(!showHistory); }}><div className="flex items-center gap-2 overflow-hidden"><MessageCircle size={14} className={`${isLatestFailed ? 'text-red-500' : 'text-hf-lemon'} flex-shrink-0`} /><span className={`text-xs font-medium truncate ${isLatestFailed ? 'text-red-600 dark:text-red-400 font-bold' : 'text-gray-600 dark:text-gray-300'}`}>{latestMsg.templateTitle}</span></div><div className="flex items-center gap-1"><span className="text-[10px] text-gray-400 dark:text-gray-500">{formatDateTime(latestMsg.sentAt)}</span><History size={12} className={`text-gray-400 transition-transform ${showHistory ? 'rotate-180' : ''}`}/></div></div>{showHistory && (<div className={`border-t max-h-[120px] overflow-y-auto custom-scrollbar ${isLatestFailed ? 'border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10' : 'border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-black/20'}`}>{lead.messageHistory.slice().reverse().slice(1).map((msg, idx) => { const isMsgFailed = msg.status === 'FAILED' || msg.templateTitle === 'Tentativa Falha'; return (<div key={idx} className={`p-2 px-3 flex justify-between items-center text-[10px] border-b last:border-0 ${isMsgFailed ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30' : 'border-gray-100 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/5'}`}><span className={`truncate max-w-[120px] ${isMsgFailed ? 'text-red-600 dark:text-red-400 font-bold' : 'text-gray-500 dark:text-gray-400'}`}>{msg.templateTitle}</span><span className="text-gray-400 dark:text-gray-600 font-mono">{formatDateTime(msg.sentAt)}</span></div>); })}{lead.messageHistory.length === 1 && <p className="p-2 text-[10px] text-gray-400 text-center italic">Apenas 1 mensagem enviada.</p>}</div>)}</div>) : (<div className="bg-gray-50 dark:bg-black/20 rounded-xl p-3 border border-gray-100 dark:border-white/5 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 italic"><Clock size={14}/> Aguardando primeiro contato</div>)}
                </div>
                <div className="flex items-center justify-between border-t border-gray-100 dark:border-white/10 pt-4 mt-auto relative z-50">
                    <div className="flex items-center gap-3"><button type="button" onClick={(e) => { e.stopPropagation(); setShowWhatsModal(true); }} className="w-10 h-10 rounded-full bg-hf-lemon text-white flex items-center justify-center hover:bg-hf-lemonHover hover:scale-105 transition-all shadow-lg shadow-hf-lemon/30 tap-active"><MessageCircle size={18} /></button>{isEmContato && (<><button type="button" onClick={handleOpenWinModal} className="w-10 h-10 rounded-full bg-white dark:bg-white/10 border border-gray-200 dark:border-white/5 text-gray-400 dark:text-gray-500 flex items-center justify-center hover:text-hf-green hover:border-hf-green transition-all shadow-sm hover:shadow-md tap-active"><DollarSign size={18}/></button><button type="button" onClick={triggerMarkLost} className="w-10 h-10 rounded-full bg-white dark:bg-white/10 border border-gray-200 dark:border-white/5 text-gray-400 dark:text-gray-500 flex items-center justify-center hover:text-red-500 hover:border-red-200 transition-all shadow-sm hover:shadow-md tap-active"><ThumbsDown size={18}/></button></>)}</div>
                    {lead.dealStatus === 'WON' && (<div className="flex flex-col items-end mr-4 flex-1"><span className="text-sm font-bold text-hf-green dark:text-[#7BCA0C] tabular-nums">{lead.wonValue ? `R$ ${lead.wonValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</span><span className="text-[10px] font-medium text-gray-400">{lead.wonDate ? new Date(lead.wonDate).toLocaleDateString('pt-BR') : ''}</span></div>)}
                    {lead.dealStatus === 'LOST' && (<div className="flex flex-col items-end mr-4 flex-1"><span className="text-sm font-bold text-red-500 dark:text-red-400 tabular-nums truncate max-w-[100px]" title={lead.lostReason}>{lead.lostReason || 'Perdido'}</span><span className="text-[10px] font-medium text-gray-400">{lead.lostDate ? new Date(lead.lostDate).toLocaleDateString('pt-BR') : ''}</span></div>)}
                    <div className="text-right"><p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Dias</p><p className="text-xl font-bold text-gray-900 dark:text-white tabular-nums leading-none">{lead.dealStatus === 'WON' ? daysSince(lead.dataSubmissao, lead.wonDate) : lead.dealStatus === 'LOST' ? daysSince(lead.dataSubmissao, lead.lostDate) : daysSince(lead.dataSubmissao)}</p></div>
                </div>
            </div>
            {showWhatsModal && renderWhatsModal()}{showWinModal && renderWinModal()}{showConfirmModal && renderConfirmModal()}{showSentConfirmModal && renderSentConfirmModal()}
        </>
    );
  }

  // --- MODAL VIEW ---
  return (
      <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
               <div>{isEditing ? <input value={editName} onChange={(e) => setEditName(e.target.value)} className="text-2xl font-bold bg-white dark:bg-white/10 border border-hf-lemon rounded-lg px-2 py-1 outline-none text-gray-900 dark:text-white w-full md:w-96" placeholder="Nome do Contato"/> : <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{lead.nomeContato}</h2>}</div>
               <div className="flex flex-wrap items-center gap-2"><button onClick={() => isEditing ? handleSaveChanges() : setIsEditing(true)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 border ${isEditing ? 'bg-hf-lemon text-white border-hf-lemon' : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-hf-lemon hover:text-hf-lemon'}`}>{isEditing ? <Save size={14} /> : <Edit size={14} />}{isEditing ? 'Salvar Edição' : 'Editar Dados'}</button>{isEditing && <button onClick={() => { setIsEditing(false); setEditName(lead.nomeContato); setEditPhone(lead.telefone); setEditEmail(lead.email); setEditSalesperson(lead.salesperson || ''); setCnpjInput(lead.cnpj); }} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 dark:bg-white/10 text-gray-500 hover:text-red-500 transition"><X size={14} /></button>}<button onClick={handleToggleStatus} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 border ${lead.statusCnpj === 'INVALID' ? 'bg-orange-100 text-orange-600 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-green-100 text-green-600 border-green-200 dark:bg-green-900/30 dark:text-green-400'}`} title={lead.statusCnpj === 'VALID' ? 'Mover para Auditoria' : 'Mover para Válidos'}><RefreshCw size={14} />{lead.statusCnpj === 'VALID' ? 'Válido' : 'Auditoria'}</button><span className={`text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wide border ${getUtmColor(lead.utmSource)}`}>{lead.utmSource || 'Direct'}</span><span className="text-xs font-mono font-bold bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/5">{lead.cnpj}</span><span className="text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wide border bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800 flex items-center gap-1"><Tag size={12} /> {lead.categoria || 'Outros'}</span></div>
          </div>
          {lead.isTransferPending && <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-100 dark:border-red-900/30 flex items-center gap-3 text-red-600 dark:text-red-400 font-bold"><UserX size={20}/><div><p className="text-sm">Lead Órfão (Ex-{lead.originalOwner})</p><p className="text-xs font-medium opacity-80">Este lead aguarda redistribuição.</p></div></div>}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-2xl border border-gray-100 dark:border-white/5"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Status</p><p className={`text-lg font-bold ${lead.dealStatus === 'WON' ? 'text-green-500' : lead.dealStatus === 'LOST' ? 'text-red-500' : 'text-gray-700 dark:text-white'}`}>{lead.dealStatus === 'WON' ? 'Ganho' : lead.dealStatus === 'LOST' ? 'Perdido' : 'Em Negociação'}</p></div>
                <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-2xl border border-gray-100 dark:border-white/5"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Tempo de Ciclo</p><p className="text-lg font-bold text-gray-700 dark:text-white">{daysSince(lead.dataSubmissao)} dias</p></div>
                <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-2xl border border-gray-100 dark:border-white/5"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Vendedor</p>{isEditing ? <select value={editSalesperson} onChange={(e) => setEditSalesperson(e.target.value)} className="w-full bg-white dark:bg-white/10 border border-hf-lemon rounded px-2 py-1 text-sm font-semibold outline-none text-gray-900 dark:text-white"><option value="">Não atribuído</option>{salespeople.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select> : <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{lead.salesperson || 'N/A'}</p>}</div>
                <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-2xl border border-gray-100 dark:border-white/5"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Submissão</p><p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{new Date(lead.dataSubmissao).toLocaleDateString('pt-BR')}</p></div>
          </div>
          
          <div className="glass p-6 rounded-3xl border border-gray-100 dark:border-white/5 w-full"><h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2 border-b border-gray-100 dark:border-white/5 pb-2"><Target size={18} className="text-gray-400"/> Dados de Campanha (UTMs)</h4><div className="grid grid-cols-2 md:grid-cols-3 gap-6"><div><label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Source</label><p className="font-mono text-sm font-bold text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-white/5 p-2 rounded-lg">{lead.utmSource || '-'}</p></div><div><label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Medium</label><p className="font-mono text-sm font-bold text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-white/5 p-2 rounded-lg">{lead.utmMedium || '-'}</p></div><div><label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Campaign</label><p className="font-mono text-sm font-medium text-gray-800 dark:text-gray-200 truncate" title={lead.utmCampaign}>{lead.utmCampaign || '-'}</p></div><div><label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Content</label><p className="font-mono text-sm font-medium text-gray-800 dark:text-gray-200 truncate" title={lead.utmContent}>{lead.utmContent || '-'}</p></div><div><label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Term</label><p className="font-mono text-sm font-medium text-gray-800 dark:text-gray-200 truncate" title={lead.utmTerm}>{lead.utmTerm || '-'}</p></div><div><label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">ID</label><p className="font-mono text-sm font-medium text-gray-800 dark:text-gray-200 truncate" title={lead.utmId}>{lead.utmId || '-'}</p></div></div></div>

          <div className="glass p-6 rounded-3xl border border-gray-100 dark:border-white/5 w-full">
               <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2 border-b border-gray-100 dark:border-white/5 pb-2"><UserCircle size={18} className="text-gray-400"/> Dados de Contato</h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6"><div><label className="text-xs text-gray-400 uppercase font-bold block mb-1">Razão Social</label><p className="font-medium text-gray-800 dark:text-gray-200 break-words">{lead.razaoSocial}</p></div><div><label className="text-xs text-gray-400 uppercase font-bold block mb-1">Email</label><div className="flex items-center gap-2">{isEditing ? <input value={editEmail} onChange={e => setEditEmail(e.target.value)} className="w-full bg-white dark:bg-white/10 border border-hf-lemon rounded px-2 py-1 text-sm font-medium outline-none text-gray-900 dark:text-white" /> : <p className="font-medium text-gray-800 dark:text-gray-200 break-words truncate max-w-[200px] sm:max-w-none" title={lead.email}>{lead.email}</p>}{!isEditing && lead.email && <button onClick={handleCopyEmail} className="p-1.5 text-gray-400 hover:text-hf-lemon hover:bg-hf-lemon/10 rounded-lg transition" title="Copiar Email"><Copy size={14} /></button>}</div></div><div><label className="text-xs text-gray-400 uppercase font-bold block mb-1">Telefone</label>{isEditing ? <input value={editPhone} onChange={e => setEditPhone(e.target.value)} className="w-full bg-white dark:bg-white/10 border border-hf-lemon rounded px-2 py-1 text-sm font-medium outline-none text-gray-900 dark:text-white" /> : <p className="font-medium text-gray-800 dark:text-gray-200">{lead.telefone}</p>}</div><div><label className="text-xs text-gray-400 uppercase font-bold block mb-1">Localização</label><p className="font-medium text-gray-800 dark:text-gray-200">{lead.cidade}/{lead.uf}</p></div></div>
          </div>

          <div className="glass p-6 rounded-3xl border border-gray-100 dark:border-white/5 w-full">
              <div className="flex flex-wrap justify-between items-center mb-4 border-b border-gray-100 dark:border-white/5 pb-4 gap-4">
                  <div className="flex items-center gap-3 w-full md:w-auto"><FileText size={18} className="text-gray-400"/> <h4 className="font-bold text-gray-900 dark:text-white mr-2 whitespace-nowrap">Dados do CNPJ (BrasilAPI)</h4><input type="text" value={cnpjInput} onChange={(e) => setCnpjInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleFetchCnpj()} disabled={!isEditing} className={`bg-gray-50 dark:bg-[#2C2C2E] border border-gray-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm font-mono font-bold text-gray-700 dark:text-gray-200 outline-none w-48 transition-all ${isEditing ? 'focus:ring-2 focus:ring-hf-lemon' : 'opacity-70 cursor-not-allowed'}`} /></div>
                  <div className="flex gap-2 ml-auto">{lead.cnpjData && (<><button onClick={handleCopyCnpjData} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-500 transition" title="Copiar Dados"><Copy size={16}/></button><button onClick={handleDownloadCnpjPdf} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-500 transition" title="Baixar PDF"><Download size={16}/></button></>)}<button onClick={handleFetchCnpj} disabled={isLoadingCnpj} className="text-xs bg-gray-900 dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg font-bold hover:bg-black dark:hover:bg-gray-200 transition shadow-sm">{isLoadingCnpj ? 'Carregando...' : 'Carregar Dados'}</button></div>
              </div>
              {lead.cnpjData ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                      <div className="space-y-3"><div><span className="block text-[10px] uppercase font-bold text-gray-400">Razão Social Oficial</span><span className="font-semibold text-gray-800 dark:text-gray-200">{lead.cnpjData.razao_social}</span></div><div><span className="block text-[10px] uppercase font-bold text-gray-400">Nome Fantasia</span><span className="font-semibold text-gray-800 dark:text-gray-200">{lead.cnpjData.nome_fantasia || '-'}</span></div><div><span className="block text-[10px] uppercase font-bold text-gray-400">Situação Cadastral</span><span className={`font-bold ${lead.cnpjData.descricao_situacao_cadastral === 'ATIVA' ? 'text-green-500' : 'text-red-500'}`}>{lead.cnpjData.descricao_situacao_cadastral}</span></div></div>
                      <div className="space-y-3"><div><span className="block text-[10px] uppercase font-bold text-gray-400">Logradouro</span><span className="font-medium text-gray-800 dark:text-gray-300">{lead.cnpjData.logradouro}, {lead.cnpjData.numero}</span></div><div><span className="block text-[10px] uppercase font-bold text-gray-400">Bairro/Cidade</span><span className="font-medium text-gray-800 dark:text-gray-300">{lead.cnpjData.bairro} - {lead.cnpjData.municipio}/{lead.cnpjData.uf}</span></div><div><span className="block text-[10px] uppercase font-bold text-gray-400">CEP</span><span className="font-medium text-gray-800 dark:text-gray-300">{lead.cnpjData.cep}</span></div></div>
                      <div className="space-y-3"><div><span className="block text-[10px] uppercase font-bold text-gray-400">Atividade Principal</span><span className="font-medium text-gray-800 dark:text-gray-300 text-xs leading-tight">{lead.cnpjData.cnae_fiscal_descricao}</span></div><div><span className="block text-[10px] uppercase font-bold text-gray-400">Abertura</span><span className="font-medium text-gray-800 dark:text-gray-300">{lead.cnpjData.data_inicio_atividade}</span></div></div>
                  </div>
              ) : hasFetchError ? (<div className="text-center py-6 text-red-600 dark:text-red-400 font-bold text-sm bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/30 flex items-center justify-center gap-2"><AlertTriangle size={16} /> CNPJ Inválido. Não encontrado.</div>) : (<div className="text-center py-6 text-gray-400 text-sm italic bg-gray-50 dark:bg-black/20 rounded-xl">Dados detalhados do CNPJ não carregados.</div>)}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass p-6 rounded-3xl border border-gray-100 dark:border-white/5 bg-hf-lemon/5 dark:bg-hf-lemon/5 h-full"><h4 className="font-bold text-gray-900 dark:text-white mb-4">Ações Rápidas</h4><div className="grid grid-cols-2 gap-3"><button onClick={() => setShowWhatsModal(true)} className="py-4 px-4 bg-hf-lemon text-white rounded-xl font-bold text-sm shadow-lg shadow-hf-lemon/20 hover:bg-hf-lemonHover transition flex items-center justify-center gap-2 col-span-2 tap-active"><MessageCircle size={18}/> Enviar WhatsApp</button>{lead.dealStatus === 'PENDING' && (<><button onClick={handleOpenWinModal} className="py-3 px-4 bg-white dark:bg-[#2C2C2E] text-green-600 font-bold text-sm rounded-xl border border-gray-200 dark:border-white/5 hover:border-green-200 transition flex items-center justify-center gap-2 tap-active"><CheckCircle size={18}/> Venda</button><button onClick={triggerMarkLost} className="py-3 px-4 bg-white dark:bg-[#2C2C2E] text-red-500 font-bold text-sm rounded-xl border border-gray-200 dark:border-white/5 hover:border-red-200 transition flex items-center justify-center gap-2 tap-active"><XCircle size={18}/> Perda</button></>)}</div></div>
              <div className="glass p-6 rounded-3xl border border-gray-100 dark:border-white/5 h-full overflow-hidden flex flex-col"><h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><History size={18} className="text-gray-400"/> Histórico de Contato</h4><div className="relative border-l-2 border-gray-100 dark:border-white/10 ml-3 space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[200px]">{lead.messageHistory?.slice().reverse().map((msg, i) => (<div key={i} className="pl-6 relative"><div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white dark:border-[#1C1C1E] ${msg.status === 'FAILED' ? 'bg-red-500' : 'bg-gray-200 dark:bg-gray-700'}`}></div><p className="text-xs font-bold text-gray-400 mb-1">{formatDateTime(msg.sentAt)}</p><p className={`font-medium text-sm ${msg.status === 'FAILED' ? 'text-red-500' : 'text-gray-800 dark:text-gray-200'}`}>{msg.templateTitle}</p><p className="text-xs text-gray-500">Enviado por: {msg.salesperson}</p></div>))}{!lead.messageHistory?.length && <p className="pl-6 text-gray-400 text-sm italic">Nenhum contato registrado.</p>}</div></div>
          </div>
          
           <div className="glass p-6 rounded-3xl border border-gray-100 dark:border-white/5 w-full">
              <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">Notas & Áudio</h4>
              <div className="flex gap-2 mb-4"><input value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Adicionar nota..." className="flex-1 bg-gray-50 dark:bg-[#2C2C2E] rounded-xl px-4 py-3 text-sm outline-none dark:text-white focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700 transition" /><button onClick={handleAddNote} className="p-3 bg-gray-200 dark:bg-gray-700 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition"><Send size={18}/></button><button onClick={handleRecordAudio} className={`p-3 rounded-xl transition ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>{isRecording ? <Pause size={18} /> : <Mic size={18} />}</button></div>
              <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar">{lead.notes?.map(note => (<div key={note.id} className="bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-xl border border-gray-100 dark:border-white/5"><div className="flex justify-between items-center mb-1"><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${note.type === 'AUDIO' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' : 'bg-gray-200 text-gray-600 dark:bg-gray-700'}`}>{note.type}</span><span className="text-[10px] text-gray-400">{formatDateTime(note.createdAt)}</span></div><p className="text-sm text-gray-700 dark:text-gray-300">{note.content}</p></div>))}{!lead.notes?.length && <p className="text-center text-gray-400 text-sm italic py-4">Nenhuma nota.</p>}</div>
           </div>

           <div className="glass p-6 rounded-3xl border border-gray-100 dark:border-white/5 w-full"><h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2 text-sm uppercase tracking-wide"><Edit size={16} className="text-gray-400"/> Registro de Alterações</h4><div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar">{lead.changeLog?.slice().reverse().map(log => (<div key={log.id} className="text-xs text-gray-600 dark:text-gray-400 py-2 border-b border-gray-100 dark:border-white/5 last:border-0 flex justify-between items-center"><span><span className="font-bold text-gray-800 dark:text-gray-300">{log.author}</span> {log.description.replace(/^Operador /, '')}</span><span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">{formatDateTime(log.timestamp)}</span></div>))}{!lead.changeLog?.length && <p className="text-gray-400 text-xs italic">Nenhuma alteração registrada manualmente.</p>}</div></div>

          {showWhatsModal && renderWhatsModal()}{showWinModal && renderWinModal()}{showConfirmModal && renderConfirmModal()}{showSentConfirmModal && renderSentConfirmModal()}
      </div>
  );
};