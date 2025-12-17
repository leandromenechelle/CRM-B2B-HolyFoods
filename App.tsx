import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LayoutDashboard, Users, UserX, BookOpen, Menu, Settings, RefreshCw, Calendar as CalendarIcon, AlertTriangle, Filter, Edit, Trash, Plus, Sparkles, Image as ImageIcon, Upload, UserCircle, ChevronRight, PieChart, ToggleLeft, ToggleRight, Moon, Sun, Lightbulb, X, Calendar, XCircle, Check, Save, Lock, LogOut, FileText, Mic, Pause, Key, Eye, EyeOff, Share2 } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { LeadCard } from './components/LeadCard';
import { ChatWidget } from './components/ChatWidget';
import { StrategyView } from './components/StrategyView';
import { MOCK_LEADS, INITIAL_TEMPLATES, INITIAL_USERS } from './constants';
import { Lead, MessageTemplate, Page, Salesperson, User, Role } from './types';
import { quickAnalysis, generateStrategicInsights, generateTemplateDraft, transcribeAudio } from './services/geminiService';
import { fetchLeadsFromSheet } from './services/sheetsService';

const HOLY_FOODS_LOGO = "https://b2b.holysoup.com.br/wp-content/uploads/2025/12/logo-holyfoods.png";

export default function App() {
  const [users, setUsers] = useState<User[]>(() => {
      const saved = localStorage.getItem('app_users_v4');
      return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
      const saved = localStorage.getItem('app_user');
      return saved ? JSON.parse(saved) : null;
  });
  
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [authError, setAuthError] = useState('');
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  useEffect(() => { localStorage.setItem('app_users_v4', JSON.stringify(users)); }, [users]);

  const salespeople = useMemo(() => {
      return users.filter(u => u.role === 'SALES' || u.role === 'LEADER' || u.role === 'MASTER').map(u => ({
          id: u.id, name: u.name, email: u.email, photoUrl: u.photoUrl
      }));
  }, [users]);

  const [activePage, setActivePage] = useState<Page>('DASHBOARD');
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('app_theme') === 'dark');
  const [isTestMode, setIsTestMode] = useState(false);

  const [leads, setLeads] = useState<Lead[]>(() => {
    const saved = localStorage.getItem('app_leads');
    return saved ? JSON.parse(saved) : []; 
  });
  
  const leadsRef = useRef(leads);
  useEffect(() => { 
      leadsRef.current = leads; 
      localStorage.setItem('app_leads', JSON.stringify(leads)); 
  }, [leads]);
  
  const [templates, setTemplates] = useState<MessageTemplate[]>(() => {
    const saved = localStorage.getItem('app_templates');
    return saved ? JSON.parse(saved) : INITIAL_TEMPLATES;
  });

  const [lastSalespersonIndex, setLastSalespersonIndex] = useState<number>(() => {
      const saved = localStorage.getItem('app_dist_index');
      return saved ? parseInt(saved) : 0;
  });

  const [sheetId, setSheetId] = useState(() => localStorage.getItem('app_sheet_id') || '1UISQTws46YK2X8flL7wNVaWU20DQcqMNkzPtB3GYgHo');
  const [tabValid, setTabValid] = useState(() => localStorage.getItem('app_tab_valid') || 'CNPJ Valido');
  const [tabInvalid, setTabInvalid] = useState(() => localStorage.getItem('app_tab_invalid') || 'CNPJ Invalido');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const hasInitialSyncRun = useRef(false);
  const [datePreset, setDatePreset] = useState<string>('7D'); 
  const [dateStart, setDateStart] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]; });
  const [dateEnd, setDateEnd] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedSalespersonFilter, setSelectedSalespersonFilter] = useState('');

  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [aiTemplatePrompt, setAiTemplatePrompt] = useState('');
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false);
  const [isRecordingTemplate, setIsRecordingTemplate] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [templateMediaRecorder, setTemplateMediaRecorder] = useState<MediaRecorder | null>(null);
  const aiInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
      if (aiInputRef.current) {
          aiInputRef.current.style.height = 'auto';
          aiInputRef.current.style.height = `${aiInputRef.current.scrollHeight}px`;
      }
  }, [aiTemplatePrompt]);

  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserRole, setNewUserRole] = useState<Role>('SALES');
  const [newUserPhoto, setNewUserPhoto] = useState(''); 

  const [profileName, setProfileName] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileNewPass, setProfileNewPass] = useState('');
  const [profileConfirmPass, setProfileConfirmPass] = useState('');

  useEffect(() => {
      if (currentUser && activePage === 'CONFIG') {
          setProfileName(currentUser.name);
          setProfilePhoto(currentUser.photoUrl || '');
          setIsChangingPassword(false);
          setProfileNewPass('');
          setProfileConfirmPass('');
      }
  }, [currentUser, activePage]);

  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [strategicInsights, setStrategicInsights] = useState<string | null>(() => localStorage.getItem('app_insights_html'));
  const [insightLastUpdated, setInsightLastUpdated] = useState<string | null>(() => localStorage.getItem('app_insights_date'));
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  useEffect(() => { localStorage.setItem('app_templates', JSON.stringify(templates)); }, [templates]);
  useEffect(() => { localStorage.setItem('app_dist_index', lastSalespersonIndex.toString()); }, [lastSalespersonIndex]);

  const handleSyncSheets = async () => {
    setIsSyncing(true); setSyncError(null);
    try {
      const fetchedLeads = await fetchLeadsFromSheet(sheetId, tabValid, tabInvalid);
      if (fetchedLeads.length === 0) { setIsSyncing(false); return; }
      const salesUsers = users.filter(u => u.role === 'SALES');
      const leaderName = users.find(u => u.role === 'LEADER')?.name || 'Alexandre';
      let currentIndex = lastSalespersonIndex;
      const currentLeads = leadsRef.current; 

      const mergedLeads = fetchedLeads.map(newLead => {
        const newCnpj = newLead.cnpj.trim().replace(/\D/g, '');
        const existing = currentLeads.find(l => {
             const existingCnpj = l.cnpj.trim().replace(/\D/g, '');
             if (newCnpj.length > 5 && existingCnpj.length > 5) return existingCnpj === newCnpj;
             return l.cnpj.trim() === newLead.cnpj.trim();
        });
        if (existing) {
            return { 
                ...newLead, id: existing.id, notes: existing.notes || [], dealStatus: existing.dealStatus, 
                messageSentAt: existing.messageSentAt, messageStatus: existing.messageStatus,
                messageHistory: existing.messageHistory || [], wonDate: existing.wonDate, wonValue: existing.wonValue, 
                salesperson: existing.salesperson, attachments: existing.attachments || [], changeLog: existing.changeLog || [],
                cnpjData: existing.cnpjData, razaoSocial: existing.cnpjData ? existing.cnpjData.razao_social : (newLead.razaoSocial || existing.razaoSocial),
                lostDate: existing.lostDate, lostReason: existing.lostReason
            };
        } else {
            let assignedPerson = 'Não atribuído';
            if (newLead.statusCnpj === 'VALID') {
                if (salesUsers.length > 0) { assignedPerson = salesUsers[currentIndex % salesUsers.length].name; currentIndex++; }
                else assignedPerson = leaderName;
            } else assignedPerson = leaderName;
            return { ...newLead, salesperson: assignedPerson };
        }
      });
      setLastSalespersonIndex(currentIndex);
      setLeads(mergedLeads);
    } catch (error) { setSyncError("Sync error."); } finally { setIsSyncing(false); }
  };

  useEffect(() => {
      if (!isTestMode && currentUser) {
          if (!hasInitialSyncRun.current || leads.length === 0) { handleSyncSheets(); hasInitialSyncRun.current = true; }
          const interval = setInterval(handleSyncSheets, 60000); 
          return () => clearInterval(interval);
      }
  }, [isTestMode, currentUser, users]);

  useEffect(() => {
      if (isDarkMode) { document.documentElement.classList.add('dark'); localStorage.setItem('app_theme', 'dark'); }
      else { document.documentElement.classList.remove('dark'); localStorage.setItem('app_theme', 'light'); }
  }, [isDarkMode]);

  const handleLogin = (e: React.FormEvent) => {
      e.preventDefault();
      setAuthError('');
      if (!loginEmail.endsWith('@holyfoods.com.br')) { setAuthError('Acesso restrito @holyfoods.com.br'); return; }
      const user = users.find(u => u.email.toLowerCase() === loginEmail.toLowerCase());
      if (user && user.password === loginPass) {
          if (user.mustChangePassword) { setMustChangePassword(true); setCurrentUser(user); } 
          else { setCurrentUser(user); localStorage.setItem('app_user', JSON.stringify(user)); }
      } else setAuthError('Credenciais inválidas.');
  };

  const handleSaveProfile = (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentUser) return;
      let finalPassword = currentUser.password;
      if (isChangingPassword) {
          if (profileNewPass !== profileConfirmPass) { alert("Senhas não conferem."); return; }
          if (profileNewPass.length < 6) { alert("Mínimo 6 caracteres."); return; }
          finalPassword = profileNewPass;
      }
      const updatedUser = { ...currentUser, name: profileName, password: finalPassword, photoUrl: profilePhoto || undefined };
      const updatedUsers = users.map(u => u.id === currentUser.id ? updatedUser : u);
      setUsers(updatedUsers); setCurrentUser(updatedUser); localStorage.setItem('app_user', JSON.stringify(updatedUser));
      setIsChangingPassword(false); alert("Perfil atualizado com sucesso!");
  };

  const handleAddTag = (tag: string) => {
      const contentField = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
      if (contentField) {
          const start = contentField.selectionStart; const text = contentField.value;
          contentField.value = text.substring(0, start) + tag + text.substring(contentField.selectionEnd);
          contentField.focus(); contentField.setSelectionRange(start + tag.length, start + tag.length);
      }
  };

  const handleRecordTemplatePrompt = async () => {
      if (isRecordingTemplate) { templateMediaRecorder?.stop(); setIsRecordingTemplate(false); setIsTranscribing(true); } 
      else {
          try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              const recorder = new MediaRecorder(stream);
              const chunks: BlobPart[] = [];
              recorder.ondataavailable = (e) => chunks.push(e.data);
              recorder.onstop = async () => {
                  const blob = new Blob(chunks, { type: 'audio/webm' });
                  const transcript = await transcribeAudio(blob);
                  setAiTemplatePrompt(prev => (prev ? prev + " " : "") + transcript);
                  setIsTranscribing(false);
              };
              recorder.start(); setTemplateMediaRecorder(recorder); setIsRecordingTemplate(true);
          } catch (e) { alert("Microfone bloqueado."); setIsTranscribing(false); }
      }
  };

  const isSales = currentUser?.role === 'SALES';
  const visibleLeads = useMemo(() => isSales ? leads.filter(l => l.salesperson === currentUser?.name) : leads, [leads, isSales, currentUser]);

  if (!currentUser || mustChangePassword) {
      return (
          <div className="min-h-screen w-full bg-[#F2F2F7] flex items-center justify-center p-4">
              <div className="bg-white rounded-[32px] shadow-2xl p-10 w-full max-w-md animate-enter">
                  <div className="flex flex-col items-center mb-8">
                      <img src={HOLY_FOODS_LOGO} className="w-24 h-24 object-contain mb-4 rounded-2xl" />
                      <h1 className="text-2xl font-bold text-gray-900">Portal SalesFlow</h1>
                  </div>
                  {mustChangePassword ? (
                      <form onSubmit={(e) => { e.preventDefault(); if(newPasswordInput.length>=6) { const up = users.map(u=>u.id===currentUser.id?{...u, password:newPasswordInput, mustChangePassword:false}:u); setUsers(up); setCurrentUser({...currentUser, password:newPasswordInput, mustChangePassword:false}); setMustChangePassword(false); } }} className="space-y-5">
                          <div className="p-4 bg-orange-50 text-orange-700 text-xs font-bold rounded-xl mb-4">Crie uma nova senha para acessar o sistema.</div>
                          <input type="password" required className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:border-hf-lemon" placeholder="Nova Senha" value={newPasswordInput} onChange={e => setNewPasswordInput(e.target.value)} />
                          <button type="submit" className="w-full bg-hf-lemon text-white font-bold py-4 rounded-2xl shadow-lg">Salvar Senha</button>
                      </form>
                  ) : (
                      <form onSubmit={handleLogin} className="space-y-5">
                          <input type="email" required className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:border-hf-lemon" placeholder="email@holyfoods.com.br" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
                          <input type="password" required className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:border-hf-lemon" placeholder="••••••••" value={loginPass} onChange={e => setLoginPass(e.target.value)} />
                          {authError && <p className="text-red-500 text-xs font-bold text-center">{authError}</p>}
                          <button type="submit" className="w-full bg-hf-lemon text-white font-bold py-4 rounded-2xl shadow-lg transform hover:scale-[1.02] active:scale-[0.98]">Entrar</button>
                      </form>
                  )}
              </div>
          </div>
      );
  }

  const FilterBar = () => (
    <div className="flex flex-col xl:flex-row items-center justify-between gap-4 mb-8 sticky top-0 z-20 bg-[#F2F2F7]/95 dark:bg-[#0F0F0F]/95 backdrop-blur-md py-4 px-4 md:px-10 border-b border-gray-200/50 dark:border-white/10 transition-all">
        <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto">
             <div className="flex bg-gray-200/50 dark:bg-white/5 p-1 rounded-xl">
                 {['TODAY', '7D', '30D', 'MONTH', 'ALL'].map(p => (
                     <button key={p} onClick={() => { setDatePreset(p); const end=new Date(); let st=new Date(); if(p==='TODAY') st=new Date(); else if(p==='7D') st.setDate(end.getDate()-7); else if(p==='30D') st.setDate(end.getDate()-30); else if(p==='MONTH') st=new Date(end.getFullYear(), end.getMonth(), 1); else st=new Date(2020,0,1); setDateStart(st.toISOString().split('T')[0]); setDateEnd(end.toISOString().split('T')[0]); }} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${datePreset === p ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>{p}</button>
                 ))}
             </div>
        </div>
        {!isSales && (
            <select value={selectedSalespersonFilter} onChange={(e) => setSelectedSalespersonFilter(e.target.value)} className="bg-white dark:bg-[#1C1C1E] rounded-2xl px-5 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 outline-none"><option value="">Todos Vendedores</option>{users.filter(u => u.role === 'SALES').map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select>
        )}
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-[#F2F2F7] dark:bg-[#0F0F0F] overflow-hidden transition-colors duration-500">
      <aside className="hidden md:flex flex-col w-[280px] h-full border-r border-gray-200 dark:border-white/10 bg-[#F2F2F7] dark:bg-[#0F0F0F]">
        <div className="p-8 pb-6"><div className="flex items-center gap-4 bg-white dark:bg-[#1C1C1E] p-3 rounded-2xl border border-gray-100 dark:border-white/5 shadow-soft"><div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold text-gray-500">{currentUser.photoUrl ? <img src={currentUser.photoUrl} className="w-full h-full object-cover" /> : currentUser.name.charAt(0)}</div><div><span className="font-bold text-gray-900 dark:text-white block truncate w-32">{currentUser.name}</span><span className="text-[10px] text-gray-500 uppercase font-bold">{currentUser.role}</span></div></div></div>
        <nav className="flex-1 px-4 space-y-1"><SidebarItem icon={<LayoutDashboard size={20} />} label="Visão Geral" active={activePage === 'DASHBOARD'} onClick={() => setActivePage('DASHBOARD')} /><SidebarItem icon={<Users size={20} />} label="Leads Válidos" active={activePage === 'LEADS_VALID'} onClick={() => setActivePage('LEADS_VALID')} /><SidebarItem icon={<BookOpen size={20} />} label="Playbook" active={activePage === 'PLAYBOOK'} onClick={() => setActivePage('PLAYBOOK')} /><SidebarItem icon={<Settings size={20} />} label="Ajustes" active={activePage === 'CONFIG'} onClick={() => setActivePage('CONFIG')} /></nav>
        <div className="p-6"><button onClick={() => { setCurrentUser(null); localStorage.removeItem('app_user'); }} className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-white dark:bg-[#1C1C1E] text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-red-500 transition-all"><LogOut size={16}/> Sair</button></div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
         <div className="flex-1 overflow-y-auto custom-scrollbar">
            {activePage === 'DASHBOARD' && (
                <div className="animate-enter pb-20">
                    <FilterBar />
                    <div className="px-4 md:px-10"><Dashboard leads={visibleLeads} duplicateCount={0} onQuickAnalysis={async () => { setIsAnalyzing(true); setAnalysisResult(await quickAnalysis(visibleLeads)); setIsAnalyzing(false); }} analysisResult={analysisResult} isAnalyzing={isAnalyzing} templates={templates} salespeople={salespeople} onUpdateLead={(up) => setLeads(prev => prev.map(l => l.id === up.id ? up : l))} strategicInsights={null} isGeneratingInsights={false} onRefreshInsights={()=>{}} insightLastUpdated={null} isDarkMode={isDarkMode} datePreset={datePreset} userRole={currentUser.role} /></div>
                </div>
            )}

            {activePage === 'PLAYBOOK' && (
                <div className="animate-enter max-w-5xl mx-auto space-y-10 pb-20 p-4 md:px-10 md:py-8">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Playbook de Vendas</h2>
                    <div className="glass rounded-3xl p-8 shadow-medium relative overflow-hidden">
                        <h3 className="text-lg font-bold mb-6 text-gray-800 dark:text-white">{editingTemplateId ? 'Editar Template' : 'Novo com Inteligência Artificial'}</h3>
                        <div className="mb-6 bg-gray-50 dark:bg-black/20 p-2 rounded-2xl flex items-start gap-3 border border-gray-200 dark:border-white/10">
                             <button onClick={handleRecordTemplatePrompt} disabled={isTranscribing} className={`p-3 rounded-xl transition mt-1 ${isRecordingTemplate ? 'bg-red-500 text-white animate-pulse shadow-lg' : isTranscribing ? 'bg-gray-100 dark:bg-white/5 text-gray-400 animate-pulse cursor-wait' : 'text-hf-lemon hover:bg-gray-200 dark:hover:bg-white/10'}`}>
                                {isTranscribing ? <RefreshCw size={18} className="animate-spin" /> : (isRecordingTemplate ? <Check size={18} /> : <Mic size={18}/>)}
                             </button>
                             <textarea ref={aiInputRef} value={aiTemplatePrompt} onChange={e => setAiTemplatePrompt(e.target.value)} placeholder="Diga o que você precisa (ex: uma mensagem de follow-up para clientes de hortifruti)..." className="flex-1 bg-transparent text-sm font-medium outline-none dark:text-white resize-none py-3 min-h-[48px]" rows={1} />
                             <button onClick={async () => { setIsGeneratingTemplate(true); const c = await generateTemplateDraft(aiTemplatePrompt); const contentField = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement; if (contentField) contentField.value = c; setIsGeneratingTemplate(false); }} disabled={isGeneratingTemplate || !aiTemplatePrompt} className="bg-gray-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50 flex items-center gap-2 mt-1">
                                {isGeneratingTemplate ? <RefreshCw size={14} className="animate-spin"/> : <Sparkles size={14} />} Gerar
                             </button>
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); const form = e.target as HTMLFormElement; const title = (form.elements.namedItem('title') as HTMLInputElement).value; const content = (form.elements.namedItem('content') as HTMLTextAreaElement).value; const nt = { id: editingTemplateId || Date.now().toString(), title, content, ownerId: isSales ? currentUser.id : undefined }; setTemplates(editingTemplateId ? templates.map(t=>t.id===editingTemplateId?nt:t) : [...templates, nt]); setEditingTemplateId(null); setAiTemplatePrompt(''); form.reset(); }} className="space-y-4">
                            <input name="title" defaultValue={templates.find(t=>t.id===editingTemplateId)?.title} placeholder="Título" className="w-full bg-white dark:bg-[#2C2C2E] border border-gray-200 dark:border-white/5 rounded-2xl px-5 py-4 text-sm font-bold dark:text-white outline-none" required />
                            <div className="flex gap-2 mb-3 overflow-x-auto pb-2 custom-scrollbar">{['{nome_cliente}', '{nome_vendedor}', '{razao_social}'].map(tag => (<button type="button" key={tag} onClick={() => handleAddTag(tag)} className="px-3 py-1.5 bg-gray-100 dark:bg-white/10 hover:bg-hf-lemon hover:text-white rounded-lg text-xs font-bold transition whitespace-nowrap">{tag}</button>))}</div>
                            <textarea name="content" defaultValue={templates.find(t=>t.id===editingTemplateId)?.content} placeholder="Corpo da mensagem..." className="w-full bg-white dark:bg-[#2C2C2E] border border-gray-200 dark:border-white/5 rounded-2xl px-5 py-4 text-sm dark:text-white min-h-[140px] outline-none" required />
                            <div className="flex justify-end gap-4"><button type="submit" className="px-8 py-3.5 rounded-2xl bg-gray-900 text-white font-bold text-sm shadow-lg">Salvar Template</button></div>
                        </form>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{templates.filter(t => !t.ownerId || t.ownerId === currentUser.id).map(t => (<div key={t.id} className="glass p-6 rounded-3xl shadow-soft group hover:-translate-y-1 transition-all"> <h4 className="font-bold dark:text-white mb-2">{t.title}</h4><p className="text-xs text-gray-500 mb-4 whitespace-pre-wrap">"{t.content}"</p><div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition"><button onClick={() => setEditingTemplateId(t.id)} className="p-2 text-hf-lemon hover:bg-gray-100 rounded-xl"><Edit size={16}/></button><button onClick={() => setTemplates(templates.filter(x=>x.id!==t.id))} className="p-2 text-red-500 hover:bg-gray-100 rounded-xl"><Trash size={16}/></button></div></div>))}</div>
                </div>
            )}

            {activePage === 'CONFIG' && (
                <div className="animate-enter max-w-4xl mx-auto space-y-10 pb-20 p-4 md:px-10 md:py-8">
                    <div className="glass rounded-3xl shadow-soft overflow-hidden">
                        <div className="p-8 border-b border-gray-100 dark:border-white/5 flex items-center gap-5 bg-gradient-to-r from-gray-50 to-white dark:from-[#2C2C2E] dark:to-[#1C1C1E]">
                            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 font-bold text-2xl overflow-hidden">{profilePhoto ? <img src={profilePhoto} className="w-full h-full object-cover" /> : profileName.charAt(0)}</div>
                            <div><h3 className="font-bold text-gray-900 dark:text-white text-lg">Meu Perfil</h3><p className="text-sm text-gray-500">Edite suas informações e segurança.</p></div>
                        </div>
                        <div className="p-8">
                            <form onSubmit={handleSaveProfile} className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <input value={profileName} onChange={e => setProfileName(e.target.value)} className="w-full bg-gray-50 dark:bg-[#2C2C2E] rounded-xl px-4 py-3 text-sm font-bold dark:text-white outline-none border border-transparent focus:border-hf-lemon" />
                                    <label className="flex items-center gap-3 w-full bg-gray-50 dark:bg-[#2C2C2E] rounded-xl px-4 py-2.5 text-sm cursor-pointer border border-dashed border-gray-300 dark:border-gray-700 hover:bg-gray-100"><Upload size={18} /><span className="font-medium text-gray-500 truncate">{profilePhoto ? 'Alterar Foto' : 'Carregar Foto'}</span><input type="file" accept="image/*" onChange={(e) => { const file=e.target.files?.[0]; if(file){const r=new FileReader(); r.onloadend=()=>setProfilePhoto(r.result as string); r.readAsDataURL(file);}}} className="hidden" /></label>
                                </div>
                                <div className="border-t border-gray-100 dark:border-white/5 pt-6">
                                    <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-4">Segurança</h4>
                                    <div className="relative mb-6">
                                        <input type={showCurrentPass ? "text" : "password"} value={currentUser.password} readOnly className="w-full bg-gray-100 dark:bg-[#1C1C1E] rounded-xl px-4 py-3 text-sm font-bold text-gray-500 outline-none cursor-not-allowed" />
                                        <button type="button" onClick={() => setShowCurrentPass(!showCurrentPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">{showCurrentPass ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                                    </div>
                                    {!isChangingPassword ? <button type="button" onClick={() => setIsChangingPassword(true)} className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white py-2 px-6 rounded-xl font-bold text-xs hover:opacity-80 transition">Alterar Senha</button> : (
                                        <div className="bg-gray-50 dark:bg-black/20 p-6 rounded-2xl space-y-4 animate-enter">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <input type="password" value={profileNewPass} onChange={e => setProfileNewPass(e.target.value)} placeholder="Nova Senha" className="w-full bg-white dark:bg-black/20 rounded-xl px-4 py-3 text-sm font-bold dark:text-white border border-gray-200 dark:border-white/10" />
                                                <input type="password" value={profileConfirmPass} onChange={e => setProfileConfirmPass(e.target.value)} placeholder="Repetir Senha" className="w-full bg-white dark:bg-black/20 rounded-xl px-4 py-3 text-sm font-bold dark:text-white border border-gray-200 dark:border-white/10" />
                                            </div>
                                            <button type="button" onClick={() => setIsChangingPassword(false)} className="text-xs text-red-500 font-bold">Cancelar</button>
                                        </div>
                                    )}
                                </div>
                                <button type="submit" className="w-full bg-gray-900 dark:bg-white text-white dark:text-black py-4 rounded-xl font-bold shadow-lg transition">Salvar Alterações</button>
                            </form>
                        </div>
                    </div>
                    {!isSales && (
                        <div className="glass rounded-3xl p-8 space-y-6">
                            <h3 className="font-bold text-gray-900 dark:text-white">Sincronização</h3>
                            <input value={sheetId} onChange={e => setSheetId(e.target.value)} className="w-full bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl px-5 py-3.5 text-sm font-bold dark:text-white" placeholder="Sheet ID" />
                            <button onClick={handleSyncSheets} disabled={isSyncing} className="w-full bg-hf-lemon text-white py-4 rounded-2xl font-bold text-sm shadow-lg flex items-center justify-center gap-3"><RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''}/> {isSyncing ? 'Sincronizando...' : 'Forçar Sincronização Agora'}</button>
                        </div>
                    )}
                </div>
            )}
         </div>
      </main>
      <ChatWidget leads={visibleLeads} />
    </div>
  );
}

const SidebarItem = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${active ? 'bg-gray-200/60 dark:bg-white/10 text-gray-900 dark:text-white font-bold' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'}`}>{icon} {label}</button>
);