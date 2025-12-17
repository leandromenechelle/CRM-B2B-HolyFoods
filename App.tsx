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

// HolyFoods Logo (PNG URL)
const HOLY_FOODS_LOGO = "https://b2b.holysoup.com.br/wp-content/uploads/2025/12/logo-holyfoods.png";

export default function App() {
  // --- AUTH & USER MANAGEMENT ---
  const [users, setUsers] = useState<User[]>(() => {
      // Changed to v4 to force refresh of INITIAL_USERS (removing old photos definitively)
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

  // Persist Users - Updated key to v4
  useEffect(() => { localStorage.setItem('app_users_v4', JSON.stringify(users)); }, [users]);

  // Derive Salespeople from Users
  const salespeople = useMemo(() => {
      return users.filter(u => u.role === 'SALES' || u.role === 'LEADER' || u.role === 'MASTER').map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          photoUrl: u.photoUrl
      }));
  }, [users]);

  // --- Global State ---
  const [activePage, setActivePage] = useState<Page>('DASHBOARD');
  const [detailLead, setDetailLead] = useState<Lead | null>(null);

  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(() => {
      const saved = localStorage.getItem('app_theme');
      return saved === 'dark'; 
  });

  // DEFAULT TO FALSE to try and load real sheet data first
  const [isTestMode, setIsTestMode] = useState(false);

  const [leads, setLeads] = useState<Lead[]>(() => {
    const saved = localStorage.getItem('app_leads');
    return saved ? JSON.parse(saved) : []; // Default empty to force sync or load mock if toggled
  });
  
  const [templates, setTemplates] = useState<MessageTemplate[]>(() => {
    const saved = localStorage.getItem('app_templates');
    return saved ? JSON.parse(saved) : INITIAL_TEMPLATES;
  });

  // Dist Index for Round Robin
  const [lastSalespersonIndex, setLastSalespersonIndex] = useState<number>(() => {
      const saved = localStorage.getItem('app_dist_index');
      return saved ? parseInt(saved) : 0;
  });

  // Config State
  const [sheetId, setSheetId] = useState(() => localStorage.getItem('app_sheet_id') || '1UISQTws46YK2X8flL7wNVaWU20DQcqMNkzPtB3GYgHo');
  const [tabValid, setTabValid] = useState(() => localStorage.getItem('app_tab_valid') || 'CNPJ Valido');
  const [tabInvalid, setTabInvalid] = useState(() => localStorage.getItem('app_tab_invalid') || 'CNPJ Invalido');
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const hasInitialSyncRun = useRef(false);
  
  // UI State - Filters
  const [hideDuplicates, setHideDuplicates] = useState(true);
  
  // Date Filters - Default to 7 days
  const [datePreset, setDatePreset] = useState<string>('7D'); 
  const [dateStart, setDateStart] = useState(() => {
      const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0];
  });
  const [dateEnd, setDateEnd] = useState(() => new Date().toISOString().split('T')[0]);
  
  const [selectedSalespersonFilter, setSelectedSalespersonFilter] = useState('');

  // UI State - Playbook
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [aiTemplatePrompt, setAiTemplatePrompt] = useState('');
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false);
  const [isRecordingTemplate, setIsRecordingTemplate] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false); // New state for visual feedback
  const [templateMediaRecorder, setTemplateMediaRecorder] = useState<MediaRecorder | null>(null);
  const aiInputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea effect
  useEffect(() => {
      if (aiInputRef.current) {
          aiInputRef.current.style.height = 'auto';
          aiInputRef.current.style.height = `${aiInputRef.current.scrollHeight}px`;
      }
  }, [aiTemplatePrompt]);

  // UI State - User Management
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserRole, setNewUserRole] = useState<Role>('SALES');
  const [newUserPhoto, setNewUserPhoto] = useState(''); // Base64

  // UI State - My Profile
  const [profileName, setProfileName] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  
  // UI State - Profile Password Management
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileNewPass, setProfileNewPass] = useState('');
  const [profileConfirmPass, setProfileConfirmPass] = useState('');

  // Load profile data when config page opens
  useEffect(() => {
      if (currentUser && activePage === 'CONFIG') {
          setProfileName(currentUser.name);
          setProfilePhoto(currentUser.photoUrl || '');
          // Reset password fields
          setIsChangingPassword(false);
          setProfileNewPass('');
          setProfileConfirmPass('');
      }
  }, [currentUser, activePage]);

  // AI Analysis State
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [strategicInsights, setStrategicInsights] = useState<string | null>(() => localStorage.getItem('app_insights_html'));
  const [insightLastUpdated, setInsightLastUpdated] = useState<string | null>(() => localStorage.getItem('app_insights_date'));
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  // Persistence Effects
  useEffect(() => { localStorage.setItem('app_leads', JSON.stringify(leads)); }, [leads]);
  useEffect(() => { localStorage.setItem('app_templates', JSON.stringify(templates)); }, [templates]);
  useEffect(() => { localStorage.setItem('app_dist_index', lastSalespersonIndex.toString()); }, [lastSalespersonIndex]);
  useEffect(() => {
    localStorage.setItem('app_sheet_id', sheetId);
    localStorage.setItem('app_tab_valid', tabValid);
    localStorage.setItem('app_tab_invalid', tabInvalid);
  }, [sheetId, tabValid, tabInvalid]);

  useEffect(() => {
      if (strategicInsights) localStorage.setItem('app_insights_html', strategicInsights);
      if (insightLastUpdated) localStorage.setItem('app_insights_date', insightLastUpdated);
  }, [strategicInsights, insightLastUpdated]);

  // Force Load Mock Data if Test Mode is ON and leads are empty
  useEffect(() => {
      if (isTestMode && leads.length === 0) {
          setLeads(MOCK_LEADS);
      }
  }, [isTestMode]);

  // Auto Sync Effect - Immediate on Mount + Interval
  useEffect(() => {
      if (!isTestMode && currentUser) {
          // Immediate Sync on Mount/Login if not done yet or leads are empty
          if (!hasInitialSyncRun.current || leads.length === 0) {
              handleSyncSheets();
              hasInitialSyncRun.current = true;
          }

          // Interval Sync
          const interval = setInterval(() => {
              handleSyncSheets();
          }, 60000); // 1 minute
          return () => clearInterval(interval);
      }
  }, [isTestMode, currentUser, users]);

  // Dark Mode Logic
  useEffect(() => {
      if (isDarkMode) {
          document.documentElement.classList.add('dark');
          localStorage.setItem('app_theme', 'dark');
      } else {
          document.documentElement.classList.remove('dark');
          localStorage.setItem('app_theme', 'light');
      }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // --- ACTIONS ---

  const handleLogin = (e: React.FormEvent) => {
      e.preventDefault();
      setAuthError('');

      if (!loginEmail.endsWith('@holyfoods.com.br')) {
          setAuthError('Acesso restrito ao domínio @holyfoods.com.br');
          return;
      }

      const user = users.find(u => u.email.toLowerCase() === loginEmail.toLowerCase());

      if (user && user.password === loginPass) {
          if (user.mustChangePassword) {
              setMustChangePassword(true);
              setCurrentUser(user); 
          } else {
              setCurrentUser(user);
              localStorage.setItem('app_user', JSON.stringify(user));
          }
      } else {
          setAuthError('Credenciais inválidas.');
      }
  };

  const handleChangePassword = (e: React.FormEvent) => {
      e.preventDefault();
      if (currentUser && newPasswordInput.length >= 6) {
          const updatedUsers = users.map(u => u.id === currentUser.id ? { ...u, password: newPasswordInput, mustChangePassword: false } : u);
          setUsers(updatedUsers);
          const updatedUser = { ...currentUser, password: newPasswordInput, mustChangePassword: false };
          setCurrentUser(updatedUser);
          localStorage.setItem('app_user', JSON.stringify(updatedUser));
          setMustChangePassword(false);
          setNewPasswordInput('');
      } else {
          setAuthError('Senha deve ter no mínimo 6 caracteres.');
      }
  };

  const handleLogout = () => {
      setCurrentUser(null);
      localStorage.removeItem('app_user');
      setActivePage('DASHBOARD');
      setMustChangePassword(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setter(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  // User Management
  const handleAddUser = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newUserEmail.endsWith('@holyfoods.com.br')) { alert('Email deve ser @holyfoods.com.br'); return; }
      if (users.some(u => u.email === newUserEmail)) { alert('Email já cadastrado.'); return; }

      const newUser: User = {
          id: Date.now().toString(),
          name: newUserName,
          email: newUserEmail,
          password: newUserPass,
          role: newUserRole,
          mustChangePassword: true,
          photoUrl: newUserPhoto || undefined // Ensure undefined if empty
      };
      setUsers([...users, newUser]);
      setNewUserEmail(''); setNewUserName(''); setNewUserPass(''); setNewUserPhoto('');
  };

  const handleDeleteUser = (userId: string) => {
      const userToDelete = users.find(u => u.id === userId);
      if (!userToDelete) return;
      if (userToDelete.role === 'MASTER' && users.filter(u => u.role === 'MASTER').length === 1) {
          alert("Não é possível excluir o único Master.");
          return;
      }

      if (window.confirm(`Tem certeza que deseja excluir ${userToDelete.name}? Os leads serão transferidos provisoriamente para você.`)) {
          const master = users.find(u => u.role === 'MASTER') || currentUser;
          
          if (master) {
              setLeads(prev => prev.map(l => {
                  if (l.salesperson === userToDelete.name) {
                      return {
                          ...l,
                          salesperson: master.name,
                          originalOwner: userToDelete.name,
                          isTransferPending: true,
                          changeLog: [...(l.changeLog || []), { id: Date.now().toString(), description: `Transferido automaticamente de ${userToDelete.name} (Excluído)`, timestamp: new Date().toISOString(), author: 'Sistema' }]
                      };
                  }
                  return l;
              }));
          }
          setUsers(prev => prev.filter(u => u.id !== userId));
      }
  };

  const handleResetUserPassword = (userId: string) => {
      const newPass = prompt("Digite a nova senha provisória:");
      if (newPass) {
          setUsers(prev => prev.map(u => u.id === userId ? { ...u, password: newPass, mustChangePassword: true } : u));
      }
  };

  const handleRedistributePendingLeads = () => {
      const salesTeam = users.filter(u => u.role === 'SALES');
      if (salesTeam.length === 0) { alert("Nenhum vendedor disponível para distribuição."); return; }

      let count = 0;
      let distIndex = 0;

      const updatedLeads = leads.map(l => {
          if (l.isTransferPending) {
              const targetUser = salesTeam[distIndex % salesTeam.length];
              distIndex++;
              count++;
              return {
                  ...l,
                  salesperson: targetUser.name,
                  isTransferPending: false, // Clear flag
                  changeLog: [...(l.changeLog || []), { id: Date.now().toString(), description: `Redistribuído de Ex-${l.originalOwner} para ${targetUser.name}`, timestamp: new Date().toISOString(), author: currentUser?.name || 'Sistema' }]
              };
          }
          return l;
      });

      setLeads(updatedLeads);
      alert(`${count} leads redistribuídos com sucesso entre ${salesTeam.length} vendedores.`);
  };

  const handleDistributeAuditLeads = () => {
      const auditLeads = leads.filter(l => l.statusCnpj === 'INVALID');
      const salesTeam = users.filter(u => u.role === 'SALES');
      
      if (auditLeads.length === 0) { alert("Não há leads em auditoria para distribuir."); return; }
      if (salesTeam.length === 0) { alert("Não há vendedores cadastrados."); return; }

      if (!window.confirm(`Confirma a distribuição de ${auditLeads.length} leads de auditoria entre ${salesTeam.length} vendedores?`)) return;

      let distIndex = 0;
      const updatedLeads = leads.map(l => {
          if (l.statusCnpj === 'INVALID') {
              const salesperson = salesTeam[distIndex % salesTeam.length].name;
              distIndex++;
              return {
                  ...l,
                  salesperson,
                  changeLog: [...(l.changeLog || []), { id: Date.now().toString(), description: `Distribuído automaticamente para auditoria de ${salesperson}`, timestamp: new Date().toISOString(), author: currentUser?.name || 'Sistema' }]
              };
          }
          return l;
      });

      setLeads(updatedLeads);
      alert("Distribuição concluída com sucesso!");
  };

  const handleSaveProfile = (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentUser) return;
      
      let finalPassword = currentUser.password;

      if (isChangingPassword) {
          if (profileNewPass !== profileConfirmPass) {
              alert("As novas senhas não conferem.");
              return;
          }
          if (profileNewPass.length < 6) {
              alert("A senha deve ter no mínimo 6 caracteres.");
              return;
          }
          finalPassword = profileNewPass;
      }
      
      const updatedUser = {
          ...currentUser,
          name: profileName,
          password: finalPassword,
          photoUrl: profilePhoto || undefined
      };

      const updatedUsers = users.map(u => u.id === currentUser.id ? updatedUser : u);
      setUsers(updatedUsers);
      setCurrentUser(updatedUser);
      localStorage.setItem('app_user', JSON.stringify(updatedUser));
      
      setIsChangingPassword(false);
      setProfileNewPass('');
      setProfileConfirmPass('');
      
      alert("Perfil atualizado com sucesso!");
  };

  // Sync Logic
  const handleSyncSheets = async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const fetchedLeads = await fetchLeadsFromSheet(sheetId, tabValid, tabInvalid);
      if (fetchedLeads.length === 0) { 
          if(!isTestMode) console.log("Sync: No data found."); 
          setIsSyncing(false);
          return; 
      }

      // Filter Sales Users for Round Robin
      const salesUsers = users.filter(u => u.role === 'SALES');
      const leaderUser = users.find(u => u.role === 'LEADER');
      const leaderName = leaderUser ? leaderUser.name : 'Alexandre';

      let currentIndex = lastSalespersonIndex;
      let newCount = 0;

      const mergedLeads = fetchedLeads.map(newLead => {
        const existing = leads.find(l => l.cnpj.trim() === newLead.cnpj.trim());
        if (existing) {
            return { 
                ...newLead, 
                id: existing.id, 
                notes: existing.notes, 
                dealStatus: existing.dealStatus, 
                messageSentAt: existing.messageSentAt, 
                messageStatus: existing.messageStatus,
                messageHistory: existing.messageHistory, 
                wonDate: existing.wonDate, 
                wonValue: existing.wonValue, 
                salesperson: existing.salesperson, 
                lastTemplateTitle: existing.lastTemplateTitle, 
                cnpjData: existing.cnpjData, 
                attachments: existing.attachments,
                changeLog: existing.changeLog,
                originalOwner: existing.originalOwner,
                isTransferPending: existing.isTransferPending
            };
        } else {
            newCount++;
            let assignedPerson = 'Não atribuído';

            if (newLead.statusCnpj === 'VALID') {
                if (salesUsers.length > 0) {
                    assignedPerson = salesUsers[currentIndex % salesUsers.length].name;
                    currentIndex++;
                } else {
                    assignedPerson = leaderName;
                }
            } else {
                assignedPerson = leaderName;
            }

            return { ...newLead, salesperson: assignedPerson };
        }
      });

      setLastSalespersonIndex(currentIndex);
      setLeads(mergedLeads);
      if (activePage === 'CONFIG') alert(`${newCount} novos leads sincronizados.`);
    } catch (error) { 
        setSyncError("Sync error."); 
        console.error(error);
    } finally { setIsSyncing(false); }
  };

  // Other Actions...
  const handleUpdateLead = (updatedLead: Lead) => {
    setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
  };

  const handleRunQuickAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await quickAnalysis(visibleLeads);
    setAnalysisResult(result);
    setIsAnalyzing(false);
  };

  const handleGenerateInsights = async () => {
      setIsGeneratingInsights(true);
      const html = await generateStrategicInsights(visibleLeads);
      setStrategicInsights(html);
      setInsightLastUpdated(new Date().toISOString());
      setIsGeneratingInsights(false);
  };

  const handleSaveTemplate = (title: string, content: string) => {
    const newTemplate: MessageTemplate = { 
        id: editingTemplateId || Date.now().toString(), 
        title, 
        content,
        ownerId: currentUser?.role === 'SALES' ? currentUser.id : undefined 
    };
    if (editingTemplateId) {
        setTemplates(prev => prev.map(t => t.id === editingTemplateId ? newTemplate : t));
        setEditingTemplateId(null);
    } else {
        setTemplates([...templates, newTemplate]);
    }
  };

  const handleEditTemplate = (t: MessageTemplate) => setEditingTemplateId(t.id);
  
  const handleDeleteTemplate = (id: string) => {
      if (window.confirm("Excluir template?")) {
          setTemplates(prev => prev.filter(t => t.id !== id));
          if (editingTemplateId === id) setEditingTemplateId(null);
      }
  };

  const handleGenerateAiTemplate = async () => {
      if (!aiTemplatePrompt) return;
      setIsGeneratingTemplate(true);
      const content = await generateTemplateDraft(aiTemplatePrompt);
      const form = document.getElementById('template-form') as HTMLFormElement;
      if(form) {
          const contentField = form.elements.namedItem('content') as HTMLTextAreaElement;
          if (contentField) contentField.value = content;
      }
      setIsGeneratingTemplate(false);
  };

  const handleRecordTemplatePrompt = async () => {
      if (isRecordingTemplate) {
          templateMediaRecorder?.stop();
          setIsRecordingTemplate(false);
          setIsTranscribing(true); // START TRANSCRIBING VISUAL
      } else {
          try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              const recorder = new MediaRecorder(stream);
              const chunks: BlobPart[] = [];
              recorder.ondataavailable = (e) => chunks.push(e.data);
              recorder.onstop = async () => {
                  const blob = new Blob(chunks, { type: 'audio/webm' });
                  // Reuse transcribeAudio from geminiService
                  const transcript = await transcribeAudio(blob);
                  setAiTemplatePrompt(prev => (prev ? prev + " " : "") + transcript);
                  setIsTranscribing(false); // STOP TRANSCRIBING VISUAL
              };
              recorder.start();
              setTemplateMediaRecorder(recorder);
              setIsRecordingTemplate(true);
          } catch (e) {
              alert("Erro ao acessar microfone. Verifique as permissões.");
              setIsTranscribing(false);
          }
      }
  };

  const handleAddTag = (tag: string) => {
      const contentField = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
      if (contentField) {
          const start = contentField.selectionStart;
          const end = contentField.selectionEnd;
          const text = contentField.value;
          const before = text.substring(0, start);
          const after = text.substring(end, text.length);
          // Insert with proper spacing if needed
          const insert = tag; 
          contentField.value = before + insert + after;
          
          // Re-focus and move cursor
          contentField.focus();
          contentField.setSelectionRange(start + insert.length, start + insert.length);
      }
  };

  // ROLE HELPERS
  const canAccessAI = currentUser?.role === 'MASTER' || currentUser?.role === 'LEADER';
  const canManageTeam = currentUser?.role === 'MASTER' || currentUser?.role === 'LEADER';
  const isMaster = currentUser?.role === 'MASTER';
  const isSales = currentUser?.role === 'SALES';

  const visibleLeads = useMemo(() => {
      let visible = leads;
      if (isSales && currentUser) {
          visible = leads.filter(l => l.salesperson === currentUser.name);
      }
      return visible;
  }, [leads, isSales, currentUser, isTestMode]);

  const processedStats = useMemo(() => {
    const cnpjCounts: Record<string, number> = {};
    const uniqueCnpjs = new Set();
    visibleLeads.forEach(l => {
      if (l.cnpj) {
        const clean = l.cnpj.trim();
        cnpjCounts[clean] = (cnpjCounts[clean] || 0) + 1;
        uniqueCnpjs.add(clean);
      }
    });
    return { cnpjCounts, redundantCount: visibleLeads.length - uniqueCnpjs.size };
  }, [visibleLeads]);

  const handleDatePreset = (preset: string) => {
      setDatePreset(preset);
      const today = new Date();
      const end = new Date();
      let start = new Date();

      switch(preset) {
          case 'TODAY':
              start = today;
              break;
          case '7D':
              start.setDate(today.getDate() - 7);
              break;
          case '30D':
              start.setDate(today.getDate() - 30);
              break;
          case 'MONTH':
              start = new Date(today.getFullYear(), today.getMonth(), 1);
              break;
          case 'ALL':
              start = new Date(2020, 0, 1);
              break;
      }
      setDateStart(start.toISOString().split('T')[0]);
      setDateEnd(end.toISOString().split('T')[0]);
  };

  const getFilteredLeads = (baseLeads: Lead[], status?: 'VALID' | 'INVALID') => {
    let filtered = status ? baseLeads.filter(l => l.statusCnpj === status) : baseLeads;
    // Apply Date Filter only if NOT 'ALL'
    if (datePreset !== 'ALL') {
        if (dateStart) filtered = filtered.filter(l => new Date(l.dataSubmissao) >= new Date(dateStart));
        if (dateEnd) { const end = new Date(dateEnd); end.setHours(23, 59, 59); filtered = filtered.filter(l => new Date(l.dataSubmissao) <= end); }
    }
    
    if (selectedSalespersonFilter) filtered = filtered.filter(l => l.salesperson === selectedSalespersonFilter);
    filtered.sort((a, b) => new Date(b.dataSubmissao).getTime() - new Date(a.dataSubmissao).getTime());
    return filtered;
  };

  const applyDuplicateLogic = (list: Lead[]) => {
      if (hideDuplicates) {
        const seen = new Set();
        return list.filter(l => { const clean = l.cnpj.trim(); if (seen.has(clean)) return false; seen.add(clean); return true; });
    }
    return list;
  };

  // --- RENDER CONTENT ---
  
  if (!currentUser || mustChangePassword) {
      return (
          <div className="min-h-screen w-full bg-[#F2F2F7] flex items-center justify-center p-4">
              <div className="bg-white rounded-[32px] shadow-2xl p-10 w-full max-w-md animate-enter">
                  <div className="flex flex-col items-center mb-8">
                      <img src={HOLY_FOODS_LOGO} className="w-24 h-24 object-contain mb-4 rounded-2xl" />
                      <h1 className="text-2xl font-bold text-gray-900">Portal SalesFlow</h1>
                      <p className="text-gray-500 text-sm">Acesso restrito à equipe Holy Foods</p>
                  </div>
                  
                  {mustChangePassword ? (
                      <form onSubmit={handleChangePassword} className="space-y-5">
                          <div className="p-4 bg-orange-50 text-orange-700 text-xs font-bold rounded-xl mb-4 border border-orange-100">
                              Primeiro acesso ou redefinição: Crie uma nova senha.
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 ml-1">Nova Senha</label>
                              <input type="password" required className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:ring-2 focus:ring-hf-lemon/20 focus:border-hf-lemon transition" placeholder="Mínimo 6 caracteres" value={newPasswordInput} onChange={e => setNewPasswordInput(e.target.value)} />
                          </div>
                          <button type="submit" className="w-full bg-hf-lemon text-white font-bold py-4 rounded-2xl shadow-lg shadow-hf-lemon/30 hover:bg-hf-lemonHover transition-all">Salvar Senha</button>
                      </form>
                  ) : (
                      <form onSubmit={handleLogin} className="space-y-5">
                          <div>
                              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 ml-1">Email Corporativo</label>
                              <input type="email" required className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:ring-2 focus:ring-hf-lemon/20 focus:border-hf-lemon transition" placeholder="seu.nome@holyfoods.com.br" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 ml-1">Senha</label>
                              <input type="password" required className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:ring-2 focus:ring-hf-lemon/20 focus:border-hf-lemon transition" placeholder="••••••••" value={loginPass} onChange={e => setLoginPass(e.target.value)} />
                          </div>
                          {authError && <p className="text-red-500 text-xs font-bold text-center bg-red-50 p-2 rounded-xl border border-red-100">{authError}</p>}
                          <button type="submit" className="w-full bg-hf-lemon text-white font-bold py-4 rounded-2xl shadow-lg shadow-hf-lemon/30 hover:bg-hf-lemonHover transition-all transform hover:scale-[1.02] active:scale-[0.98]">Entrar no Sistema</button>
                      </form>
                  )}
              </div>
          </div>
      );
  }

  // --- Helper Components ---
  const FilterBar = () => (
    <div className="flex flex-col xl:flex-row items-center justify-between gap-4 mb-8 sticky top-0 z-20 bg-[#F2F2F7]/95 dark:bg-[#0F0F0F]/95 backdrop-blur-md py-4 px-4 md:px-10 border-b border-gray-200/50 dark:border-white/10 transition-all">
        {/* Unified Date Filters for ALL Roles */}
        <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto">
             <div className="flex bg-gray-200/50 dark:bg-white/5 p-1 rounded-xl">
                 {['TODAY', '7D', '30D', 'MONTH', 'ALL'].map(p => (
                     <button 
                        key={p} 
                        onClick={() => handleDatePreset(p)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${datePreset === p ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
                     >
                         {p === 'TODAY' ? 'Hoje' : p === 'MONTH' ? 'Este Mês' : p === 'ALL' ? 'Tudo' : p}
                     </button>
                 ))}
             </div>
             {datePreset !== 'ALL' && (
                 <>
                    <input type="date" value={dateStart} onChange={e => { setDateStart(e.target.value); setDatePreset('CUSTOM'); }} className="bg-white dark:bg-[#1C1C1E] dark:text-white rounded-xl px-4 py-2 text-xs font-bold border border-gray-100 dark:border-white/10 outline-none" />
                    <span className="text-gray-400">-</span>
                    <input type="date" value={dateEnd} onChange={e => { setDateEnd(e.target.value); setDatePreset('CUSTOM'); }} className="bg-white dark:bg-[#1C1C1E] dark:text-white rounded-xl px-4 py-2 text-xs font-bold border border-gray-100 dark:border-white/10 outline-none" />
                 </>
             )}
        </div>
        
        <div className="flex items-center gap-3 w-full xl:w-auto">
             {!isSales && (
                 <div className="relative flex-1 xl:w-56 group">
                     <select value={selectedSalespersonFilter} onChange={(e) => setSelectedSalespersonFilter(e.target.value)} className="w-full appearance-none bg-white dark:bg-[#1C1C1E] rounded-2xl pl-5 pr-10 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 shadow-soft border border-gray-100 dark:border-white/5 outline-none cursor-pointer">
                        <option value="">Todos Vendedores</option>
                        {users.filter(u => u.role === 'SALES').map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                     </select>
                     <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 rotate-90 pointer-events-none" />
                 </div>
             )}
        </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-[#F2F2F7] dark:bg-[#0F0F0F] overflow-hidden selection:bg-hf-lemon selection:text-white transition-colors duration-500">
      
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-[280px] h-full bg-[#F2F2F7] dark:bg-[#0F0F0F] border-r border-gray-200 dark:border-white/10 flex-shrink-0 transition-colors duration-500">
        <div className="p-8 pb-6">
             <div className="flex items-center gap-4 bg-white dark:bg-[#1C1C1E] p-3 rounded-2xl shadow-soft border border-gray-100 dark:border-white/5 transition-all">
               <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold text-gray-500 dark:text-gray-400">
                 {currentUser.photoUrl ? (
                     <img src={currentUser.photoUrl} className="w-full h-full object-cover" />
                 ) : (
                     <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 text-gray-600 dark:text-gray-300 text-sm">
                         {currentUser.name.charAt(0).toUpperCase()}
                     </div>
                 )}
               </div>
               <div className="overflow-hidden">
                   <span className="font-bold text-gray-900 dark:text-white tracking-tight block truncate">{currentUser.name}</span>
                   <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{currentUser.role === 'SALES' ? 'Vendedor' : currentUser.role}</span>
               </div>
             </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
             <div className="px-4 py-2 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Principal</div>
             <SidebarItem icon={<LayoutDashboard size={20} />} label="Visão Geral" active={activePage === 'DASHBOARD'} onClick={() => setActivePage('DASHBOARD')} />
             {canAccessAI && <SidebarItem icon={<Lightbulb size={20} />} label="Estratégia IA" active={activePage === 'STRATEGY'} onClick={() => setActivePage('STRATEGY')} />}
             
             <div className="mt-8 px-4 py-2 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Leads</div>
             <SidebarItem icon={<Users size={20} />} label="Leads Válidos" active={activePage === 'LEADS_VALID'} onClick={() => setActivePage('LEADS_VALID')} />
             <SidebarItem icon={<AlertTriangle size={20} />} label="Auditoria" active={activePage === 'LEADS_INVALID'} onClick={() => setActivePage('LEADS_INVALID')} />
             
             <div className="mt-8 px-4 py-2 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Gestão</div>
             <SidebarItem icon={<BookOpen size={20} />} label="Playbook" active={activePage === 'PLAYBOOK'} onClick={() => setActivePage('PLAYBOOK')} />
             <SidebarItem icon={<Settings size={20} />} label="Ajustes" active={activePage === 'CONFIG'} onClick={() => setActivePage('CONFIG')} />
        </nav>
        
        <div className="p-6 space-y-4">
            {/* Master Toggle */}
            {isMaster && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-900 text-white shadow-soft">
                    <span className="text-xs font-bold">Modo Teste</span>
                    <button onClick={() => setIsTestMode(!isTestMode)} className={`w-10 h-5 rounded-full p-0.5 transition-colors ${isTestMode ? 'bg-hf-lemon' : 'bg-gray-600'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${isTestMode ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </button>
                </div>
            )}
            
            {/* Dark Mode Toggle */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-[#1C1C1E] shadow-soft border border-gray-100 dark:border-white/5">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    {isDarkMode ? <Moon size={14}/> : <Sun size={14}/>} Tema
                </span>
                <button onClick={toggleTheme} className={`w-10 h-5 rounded-full p-0.5 transition-colors ${isDarkMode ? 'bg-hf-lemon' : 'bg-gray-300'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${isDarkMode ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </button>
            </div>

            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-white/5 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 hover:border-red-100 transition-all text-xs font-bold text-gray-600 dark:text-gray-400">
                <LogOut size={16}/> Sair
            </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#F2F2F7] dark:bg-[#0F0F0F] transition-colors duration-500">
         {/* ... Mobile Header ... */}
         <div className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth">
            {activePage === 'DASHBOARD' && (
                <div className="animate-enter pb-20">
                    <FilterBar />
                    
                    {/* Pending Transfer Alert for Master */}
                    {isMaster && leads.some(l => l.isTransferPending) && (
                        <div className="px-4 md:px-10 mb-6">
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-red-100 dark:bg-red-900/40 rounded-xl text-red-600"><UserX size={24}/></div>
                                    <div>
                                        <h3 className="font-bold text-red-700 dark:text-red-400 text-lg">Leads Órfãos Detectados</h3>
                                        <p className="text-red-600/80 dark:text-red-400/80 text-sm">Existem {leads.filter(l => l.isTransferPending).length} leads atribuídos provisoriamente a você de usuários excluídos.</p>
                                    </div>
                                </div>
                                <button onClick={handleRedistributePendingLeads} className="px-6 py-3 bg-red-600 text-white font-bold rounded-xl text-sm shadow-lg hover:bg-red-700 transition">
                                    Redistribuir Automaticamente
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="px-4 md:px-10">
                        <Dashboard 
                            leads={getFilteredLeads(visibleLeads)} duplicateCount={processedStats.redundantCount} onQuickAnalysis={handleRunQuickAnalysis} analysisResult={analysisResult} isAnalyzing={isAnalyzing} templates={templates} salespeople={salespeople} onUpdateLead={handleUpdateLead} strategicInsights={strategicInsights} isGeneratingInsights={isGeneratingInsights} onRefreshInsights={handleGenerateInsights} insightLastUpdated={insightLastUpdated} isDarkMode={isDarkMode}
                            datePreset={datePreset}
                        />
                    </div>
                </div>
            )}
            
            {activePage === 'LEADS_VALID' && (
                <div className="animate-enter pb-20">
                    <FilterBar />
                    <div className="max-w-7xl mx-auto px-4 md:px-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {applyDuplicateLogic(getFilteredLeads(visibleLeads, 'VALID')).map(lead => (
                                <LeadCard key={lead.id} lead={lead} templates={templates} salespeople={salespeople} onUpdateLead={handleUpdateLead} isDuplicate={(processedStats.cnpjCounts[lead.cnpj.trim()] || 0) > 1} onClick={() => setDetailLead(lead)} />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activePage === 'LEADS_INVALID' && (
                <div className="animate-enter pb-20">
                    <FilterBar />
                    <div className="max-w-7xl mx-auto px-4 md:px-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {applyDuplicateLogic(getFilteredLeads(visibleLeads, 'INVALID')).map(lead => (
                                <LeadCard key={lead.id} lead={lead} templates={templates} salespeople={salespeople} onUpdateLead={handleUpdateLead} isDuplicate={(processedStats.cnpjCounts[lead.cnpj.trim()] || 0) > 1} onClick={() => setDetailLead(lead)} />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activePage === 'PLAYBOOK' && (
                <div className="animate-enter max-w-5xl mx-auto space-y-10 pb-20 p-4 md:px-10 md:py-8">
                    <div className="flex justify-between items-end">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Playbook {isSales ? 'Pessoal' : 'de Vendas'}</h2>
                        </div>
                    </div>
                    
                    <div className="glass rounded-3xl p-8 shadow-medium relative overflow-hidden">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-3 text-gray-800 dark:text-white">{editingTemplateId ? 'Editar' : 'Novo com IA'}</h3>
                        
                        {/* AI Input & Mic */}
                        <div className="mb-6 bg-gray-50 dark:bg-black/20 p-2 rounded-2xl flex items-start gap-3 border border-gray-200 dark:border-white/10">
                             <button 
                                onClick={handleRecordTemplatePrompt} 
                                disabled={isTranscribing} 
                                className={`p-3 rounded-xl transition mt-1 ${
                                    isRecordingTemplate 
                                        ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30' 
                                        : isTranscribing 
                                            ? 'bg-gray-100 dark:bg-white/5 text-gray-400 animate-pulse cursor-wait' 
                                            : 'text-hf-lemon hover:bg-gray-200 dark:hover:bg-white/10'
                                }`} 
                                title={isRecordingTemplate ? "Finalizar Gravação" : isTranscribing ? "Transcrevendo..." : "Ditar Instrução"}
                             >
                                {isTranscribing ? <Mic size={18} /> : (isRecordingTemplate ? <Check size={18} /> : <Mic size={18}/>)}
                             </button>
                             <textarea 
                                ref={aiInputRef}
                                value={aiTemplatePrompt} 
                                onChange={e => setAiTemplatePrompt(e.target.value)} 
                                placeholder="Descreva o template (Ex: Follow-up para cliente que sumiu)..." 
                                className="flex-1 bg-transparent text-sm font-medium outline-none dark:text-white resize-none py-3 min-h-[48px] overflow-hidden" 
                                rows={1}
                             />
                             <button onClick={handleGenerateAiTemplate} disabled={isGeneratingTemplate} className="bg-gray-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50 flex items-center gap-2 mt-1">
                                {isGeneratingTemplate ? <RefreshCw size={14} className="animate-spin"/> : <Sparkles size={14} />}
                                Gerar
                             </button>
                        </div>

                        {/* Editor Form */}
                        <form id="template-form" onSubmit={(e) => { e.preventDefault(); const form = e.target as HTMLFormElement; const title = (form.elements.namedItem('title') as HTMLInputElement).value; const content = (form.elements.namedItem('content') as HTMLTextAreaElement).value; if(title && content) { handleSaveTemplate(title, content); form.reset(); setAiTemplatePrompt(''); } }} className="space-y-4">
                            <input name="title" defaultValue={editingTemplateId ? templates.find(t => t.id === editingTemplateId)?.title : ''} placeholder="Título do Template" className="w-full bg-white dark:bg-[#2C2C2E] border border-gray-200 dark:border-white/5 rounded-2xl px-5 py-4 text-sm font-bold dark:text-white focus:border-hf-lemon outline-none transition" required key={`title-${editingTemplateId}`} />
                            
                            <div className="relative">
                                {/* Tag Toolbar */}
                                <div className="flex gap-2 mb-3 overflow-x-auto pb-2 custom-scrollbar">
                                    {['{nome_cliente}', '{nome_vendedor}', '{razao_social}', '{cnpj}', '{telefone}'].map(tag => (
                                        <button type="button" key={tag} onClick={() => handleAddTag(tag)} className="px-3 py-1.5 bg-gray-100 dark:bg-white/10 hover:bg-hf-lemon hover:text-white dark:hover:bg-hf-lemon rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 transition whitespace-nowrap">
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                                
                                <textarea name="content" defaultValue={editingTemplateId ? templates.find(t => t.id === editingTemplateId)?.content : ''} placeholder="Digite a mensagem aqui..." className="w-full bg-white dark:bg-[#2C2C2E] border border-gray-200 dark:border-white/5 rounded-2xl px-5 py-4 text-sm dark:text-white min-h-[140px] focus:border-hf-lemon outline-none transition" required key={`content-${editingTemplateId}`} />
                            </div>

                            <div className="flex justify-end gap-4">
                                {editingTemplateId && <button type="button" onClick={() => setEditingTemplateId(null)} className="px-6 py-3.5 rounded-2xl bg-gray-100 dark:bg-white/10 text-gray-500 font-bold text-sm">Cancelar</button>}
                                <button type="submit" className="px-8 py-3.5 rounded-2xl bg-gray-900 text-white font-bold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">Salvar Template</button>
                            </div>
                        </form>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {templates.filter(t => !t.ownerId || t.ownerId === currentUser?.id).map(t => (
                            <div key={t.id} className="glass p-6 rounded-3xl shadow-soft group relative hover:-translate-y-1 transition-all duration-300">
                                <h4 className="font-bold text-gray-900 dark:text-white text-lg mb-2">{t.title}</h4>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 font-medium leading-relaxed whitespace-pre-wrap break-words">"{t.content}"</p>
                                {(t.ownerId === currentUser?.id || (!t.ownerId && canManageTeam)) && (
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEditTemplate(t)} className="p-2 bg-gray-100 dark:bg-white/10 rounded-xl text-hf-lemon hover:bg-white hover:shadow-sm"><Edit size={16}/></button>
                                        <button onClick={() => handleDeleteTemplate(t.id)} className="p-2 bg-gray-100 dark:bg-white/10 rounded-xl text-red-500 hover:bg-white hover:shadow-sm"><Trash size={16}/></button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activePage === 'CONFIG' && (
                <div className="animate-enter max-w-4xl mx-auto space-y-10 pb-20 p-4 md:px-10 md:py-8">
                    
                    {/* My Profile - Visible to ALL */}
                    <div className="glass rounded-3xl shadow-soft overflow-hidden">
                        <div className="p-8 border-b border-gray-100 dark:border-white/5 flex items-center gap-5 bg-gradient-to-r from-gray-50 to-white dark:from-[#2C2C2E] dark:to-[#1C1C1E]">
                            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 overflow-hidden shadow-sm border border-blue-100 dark:border-blue-800 font-bold text-2xl">
                                {profilePhoto ? <img src={profilePhoto} className="w-full h-full object-cover" /> : profileName.charAt(0).toUpperCase()}
                            </div>
                            <div><h3 className="font-bold text-gray-900 dark:text-white text-lg">Meu Perfil</h3><p className="text-sm text-gray-500 dark:text-gray-400">Edite suas informações pessoais.</p></div>
                        </div>
                        <div className="p-8">
                            <form onSubmit={handleSaveProfile} className="space-y-8">
                                {/* Dados Pessoais */}
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-4">Dados Pessoais</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 mb-2 ml-1">Nome Completo</label>
                                            <input value={profileName} onChange={e => setProfileName(e.target.value)} className="w-full bg-gray-50 dark:bg-[#2C2C2E] rounded-xl px-4 py-3 text-sm font-bold dark:text-white border border-transparent focus:border-hf-lemon outline-none transition" required />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 mb-2 ml-1">Foto de Perfil</label>
                                            <label className="flex items-center gap-3 w-full bg-gray-50 dark:bg-[#2C2C2E] rounded-xl px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-[#3A3A3C] transition group border border-dashed border-gray-300 dark:border-gray-700">
                                                <Upload size={18} className="text-gray-400 group-hover:text-hf-lemon transition"/>
                                                <span className="font-medium text-gray-500 dark:text-gray-400 truncate">{profilePhoto ? 'Alterar Imagem' : 'Carregar Imagem'}</span>
                                                <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, setProfilePhoto)} className="hidden" />
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Segurança */}
                                <div className="border-t border-gray-100 dark:border-white/5 pt-6">
                                    <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-4">Segurança</h4>
                                    <div className="grid grid-cols-1 gap-6">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 mb-2 ml-1">Senha Atual</label>
                                            <div className="relative">
                                                <input type={showCurrentPass ? "text" : "password"} value={currentUser?.password} readOnly className="w-full bg-gray-100 dark:bg-[#1C1C1E] rounded-xl px-4 py-3 text-sm font-bold dark:text-white border border-transparent outline-none cursor-not-allowed text-gray-500" />
                                                <button type="button" onClick={() => setShowCurrentPass(!showCurrentPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                                    {showCurrentPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </div>

                                        {!isChangingPassword ? (
                                            <button type="button" onClick={() => setIsChangingPassword(true)} className="w-full md:w-auto bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white py-3 px-6 rounded-xl font-bold hover:opacity-90 transition text-sm">
                                                Alterar Senha
                                            </button>
                                        ) : (
                                            <div className="bg-gray-50 dark:bg-[#2C2C2E] p-6 rounded-2xl border border-gray-100 dark:border-white/5 animate-enter">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h5 className="font-bold text-sm text-gray-900 dark:text-white">Definir Nova Senha</h5>
                                                    <button type="button" onClick={() => setIsChangingPassword(false)} className="text-xs text-red-500 font-bold hover:underline">Cancelar</button>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-400 mb-2 ml-1">Nova Senha</label>
                                                        <input type="password" value={profileNewPass} onChange={e => setProfileNewPass(e.target.value)} className="w-full bg-white dark:bg-black/20 rounded-xl px-4 py-3 text-sm font-bold dark:text-white border border-gray-200 dark:border-white/10 focus:border-hf-lemon outline-none transition" placeholder="Mínimo 6 caracteres" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-400 mb-2 ml-1">Confirmar Nova Senha</label>
                                                        <input type="password" value={profileConfirmPass} onChange={e => setProfileConfirmPass(e.target.value)} className="w-full bg-white dark:bg-black/20 rounded-xl px-4 py-3 text-sm font-bold dark:text-white border border-gray-200 dark:border-white/10 focus:border-hf-lemon outline-none transition" placeholder="Repita a senha" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button type="submit" className="w-full bg-gray-900 dark:bg-white text-white dark:text-black py-4 rounded-xl font-bold hover:opacity-90 transition shadow-lg">Salvar Alterações</button>
                            </form>
                        </div>
                    </div>

                    {/* Integration Section (Visible to ALL, Read-Only for Sales) */}
                    <div className="glass rounded-3xl shadow-soft overflow-hidden">
                        <div className="p-8 border-b border-gray-100 dark:border-white/5 flex items-center gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600"><BookOpen size={24}/></div>
                            <div><h3 className="font-bold text-gray-900 dark:text-white text-lg">Google Sheets</h3><p className="text-sm text-gray-500 dark:text-gray-400">Sincronização automática a cada 1 min.</p></div>
                        </div>
                        <div className="p-8 space-y-6">
                            <input value={sheetId} onChange={e => setSheetId(e.target.value)} disabled={!isMaster} className="w-full bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl px-5 py-3.5 text-sm font-bold disabled:opacity-60 dark:text-white" placeholder="Sheet ID" />
                            <div className="grid grid-cols-2 gap-6">
                                <input value={tabValid} onChange={e => setTabValid(e.target.value)} disabled={!isMaster} className="w-full bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl px-5 py-3.5 text-sm font-bold disabled:opacity-60 dark:text-white" />
                                <input value={tabInvalid} onChange={e => setTabInvalid(e.target.value)} disabled={!isMaster} className="w-full bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl px-5 py-3.5 text-sm font-bold disabled:opacity-60 dark:text-white" />
                            </div>
                            <button onClick={handleSyncSheets} disabled={isSyncing} className="w-full bg-hf-lemon text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-hf-lemon/30 hover:bg-hf-lemonHover transition flex items-center justify-center gap-3">
                                <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''}/> {isSyncing ? 'Sincronizando...' : 'Forçar Sincronização Agora'}
                            </button>
                        </div>
                    </div>

                    {/* Management Section - Master & Leader */}
                    {canManageTeam && (
                        <>
                            {/* User Management */}
                            <div className="glass rounded-3xl shadow-soft overflow-hidden">
                                <div className="p-8 border-b border-gray-100 dark:border-white/5 flex items-center gap-5 bg-gradient-to-r from-gray-50 to-white dark:from-[#2C2C2E] dark:to-[#1C1C1E]">
                                    <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600"><Users size={24}/></div>
                                    <div><h3 className="font-bold text-gray-900 dark:text-white text-lg">Gestão de Usuários</h3><p className="text-sm text-gray-500 dark:text-gray-400">Adicione ou remova membros do time.</p></div>
                                </div>
                                <div className="p-8">
                                    <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                                        <input value={newUserName} onChange={e => setNewUserName(e.target.value)} placeholder="Nome" className="bg-gray-50 dark:bg-[#2C2C2E] rounded-xl px-4 py-3 text-sm font-bold dark:text-white" required />
                                        <input value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="Email (@holyfoods)" className="bg-gray-50 dark:bg-[#2C2C2E] rounded-xl px-4 py-3 text-sm font-bold dark:text-white" required type="email" />
                                        <input value={newUserPass} onChange={e => setNewUserPass(e.target.value)} placeholder="Senha Provisória" className="bg-gray-50 dark:bg-[#2C2C2E] rounded-xl px-4 py-3 text-sm font-bold dark:text-white" required />
                                        <select value={newUserRole} onChange={e => setNewUserRole(e.target.value as Role)} className="bg-gray-50 dark:bg-[#2C2C2E] rounded-xl px-4 py-3 text-sm font-bold dark:text-white">
                                            <option value="SALES">Vendedor</option>
                                            <option value="LEADER">Líder</option>
                                            <option value="MASTER">Master</option>
                                        </select>
                                        
                                        {/* Upload for New User */}
                                        <div className="md:col-span-4">
                                            <label className="flex items-center gap-3 w-full bg-gray-50 dark:bg-[#2C2C2E] rounded-xl px-4 py-3 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-[#3A3A3C] transition border border-dashed border-gray-300 dark:border-gray-700">
                                                <Upload size={18} className="text-gray-400"/>
                                                <span className="font-medium text-gray-500 dark:text-gray-400">{newUserPhoto ? 'Imagem Carregada (Pronto)' : 'Upload Foto do Usuário (Opcional)'}</span>
                                                <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, setNewUserPhoto)} className="hidden" />
                                            </label>
                                        </div>

                                        <button type="submit" className="md:col-span-4 bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-black transition">Adicionar Usuário</button>
                                    </form>
                                    <div className="space-y-3">
                                        {users.map(u => (
                                            <div key={u.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-black/20 rounded-2xl border border-gray-100 dark:border-white/5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-white overflow-hidden">
                                                        {u.photoUrl ? <img src={u.photoUrl} className="w-full h-full object-cover" /> : u.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 dark:text-white text-sm">{u.name}</p>
                                                        <p className="text-xs text-gray-500">{u.email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleResetUserPassword(u.id)} className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition" title="Redefinir Senha"><Key size={16}/></button>
                                                    {u.id !== currentUser.id && <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition" title="Excluir"><Trash size={16}/></button>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Leadership Tools: Audit Distribution */}
                            <div className="glass rounded-3xl shadow-soft overflow-hidden">
                                <div className="p-8 border-b border-gray-100 dark:border-white/5 flex items-center gap-5 bg-gradient-to-r from-gray-50 to-white dark:from-[#2C2C2E] dark:to-[#1C1C1E]">
                                    <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600"><Share2 size={24}/></div>
                                    <div><h3 className="font-bold text-gray-900 dark:text-white text-lg">Distribuição de Auditoria</h3><p className="text-sm text-gray-500 dark:text-gray-400">Distribua leads inválidos (Auditoria) entre o time.</p></div>
                                </div>
                                <div className="p-8">
                                    <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl border border-red-100 dark:border-red-900/30 mb-6">
                                        <div className="flex items-center gap-3">
                                            <AlertTriangle size={20} className="text-red-500"/>
                                            <span className="font-bold text-red-700 dark:text-red-400 text-sm">Leads em Auditoria: {leads.filter(l => l.statusCnpj === 'INVALID').length}</span>
                                        </div>
                                    </div>
                                    <button onClick={handleDistributeAuditLeads} className="w-full bg-gray-900 dark:bg-white text-white dark:text-black py-4 rounded-xl font-bold hover:opacity-90 transition shadow-lg flex items-center justify-center gap-2">
                                        <Share2 size={18}/> Distribuir entre Vendedores
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {activePage === 'STRATEGY' && <StrategyView leads={visibleLeads} strategicInsights={strategicInsights} isGeneratingInsights={isGeneratingInsights} onRefreshInsights={handleGenerateInsights} insightLastUpdated={insightLastUpdated} />}
         </div>
      </main>

      {canAccessAI && <ChatWidget leads={visibleLeads} />}
      
      {detailLead && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-white/60 dark:bg-black/80 backdrop-blur-xl animate-enter">
              <div className="glass rounded-[32px] shadow-floating max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-enter ring-1 ring-black/5 dark:ring-white/10 relative">
                  <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-white/50 dark:bg-[#1C1C1E]/50 backdrop-blur sticky top-0 z-10">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">Detalhes do Lead</h3>
                      <button onClick={() => setDetailLead(null)} className="p-2 bg-gray-100 dark:bg-white/10 rounded-full hover:bg-gray-200 dark:hover:bg-white/20 transition text-gray-600 dark:text-gray-300"><XCircle size={20} /></button>
                  </div>
                  <div className="p-8 overflow-y-auto custom-scrollbar bg-white/40 dark:bg-black/40">
                      <LeadCard lead={detailLead} templates={templates} salespeople={salespeople} onUpdateLead={(updated) => { handleUpdateLead(updated); setDetailLead(updated); }} variant="modal" />
                  </div>
              </div>
          </div>,
          document.body
      )}
    </div>
  );
}

const SidebarItem = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm group ${active ? 'bg-gray-200/60 dark:bg-white/10 text-gray-900 dark:text-white font-bold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`}>
    <span className={`transition-colors ${active ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}>{icon}</span>
    {label}
  </button>
);