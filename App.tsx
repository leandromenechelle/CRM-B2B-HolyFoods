import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { LayoutDashboard, Users, UserX, BookOpen, Menu, Settings, RefreshCw, Calendar as CalendarIcon, AlertTriangle, Filter, Edit, Trash, Plus, Sparkles, Image as ImageIcon, Upload, UserCircle, ChevronRight, PieChart, ToggleLeft, ToggleRight, Moon, Sun, Lightbulb, X, Calendar, XCircle, Check, Save } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { LeadCard } from './components/LeadCard';
import { ChatWidget } from './components/ChatWidget';
import { StrategyView } from './components/StrategyView';
import { MOCK_LEADS, INITIAL_TEMPLATES } from './constants';
import { Lead, MessageTemplate, Page, Salesperson } from './types';
import { quickAnalysis, generateStrategicInsights, generateTemplateDraft } from './services/geminiService';
import { fetchLeadsFromSheet } from './services/sheetsService';

// SVG Base64 for HolyFoods Logo (Green Smiley) - Shared Constant
const HOLY_FOODS_LOGO = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%237BCA0C'/%3E%3Ccircle cx='30' cy='40' r='12' fill='%23005234'/%3E%3Ccircle cx='70' cy='40' r='12' fill='%23005234'/%3E%3Cpath d='M 20 65 Q 50 90 80 65' stroke='%23005234' stroke-width='10' fill='none' stroke-linecap='round'/%3E%3C/svg%3E";

export default function App() {
  // --- Global State ---
  const [activePage, setActivePage] = useState<Page>('DASHBOARD');
  
  // Detail Lead State (Modal)
  const [detailLead, setDetailLead] = useState<Lead | null>(null);

  // Theme State - Default to Dark Mode if not set
  const [isDarkMode, setIsDarkMode] = useState(() => {
      const saved = localStorage.getItem('app_theme');
      // Se não houver salvo, retorna true (Dark Mode), senão respeita o salvo
      return saved === null ? true : saved === 'dark';
  });

  const [leads, setLeads] = useState<Lead[]>(() => {
    const saved = localStorage.getItem('app_leads');
    return saved ? JSON.parse(saved) : MOCK_LEADS;
  });
  
  const [templates, setTemplates] = useState<MessageTemplate[]>(() => {
    const saved = localStorage.getItem('app_templates');
    return saved ? JSON.parse(saved) : INITIAL_TEMPLATES;
  });

  const [salespeople, setSalespeople] = useState<Salesperson[]>(() => {
    const saved = localStorage.getItem('app_salespeople_v2');
    if (saved) return JSON.parse(saved);
    
    return [
        { 
          id: '1', 
          name: 'HolyFoods', 
          photoUrl: HOLY_FOODS_LOGO
        },
        { 
          id: '2', 
          name: 'João Silva', 
          photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' 
        },
        { 
          id: '3', 
          name: 'Maria Oliveira', 
          photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' 
        }
    ];
  });

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
  
  // UI State - Filters
  const [hideDuplicates, setHideDuplicates] = useState(true);
  
  // Initialize Date Filter with "Last 7 Days"
  const [dateStart, setDateStart] = useState(() => {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return d.toISOString().split('T')[0];
  });
  const [dateEnd, setDateEnd] = useState(() => new Date().toISOString().split('T')[0]);
  const [datePreset, setDatePreset] = useState<string>('7D'); // Track active preset

  const [selectedSalespersonFilter, setSelectedSalespersonFilter] = useState('');

  // UI State - Playbook Editing & AI Generation
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [aiTemplatePrompt, setAiTemplatePrompt] = useState('');
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false);

  // UI State - Salesperson Config (Add New)
  const [newSalespersonName, setNewSalespersonName] = useState('');
  const [newSalespersonPhoto, setNewSalespersonPhoto] = useState('');

  // UI State - Salesperson Config (Edit Existing)
  const [editingSalespersonId, setEditingSalespersonId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhoto, setEditPhoto] = useState('');

  // AI Analysis State (Quick)
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // AI Strategic Insights (Cached)
  const [strategicInsights, setStrategicInsights] = useState<string | null>(() => localStorage.getItem('app_insights_html'));
  const [insightLastUpdated, setInsightLastUpdated] = useState<string | null>(() => localStorage.getItem('app_insights_date'));
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  // Persistence Effects
  useEffect(() => { localStorage.setItem('app_leads', JSON.stringify(leads)); }, [leads]);
  useEffect(() => { localStorage.setItem('app_templates', JSON.stringify(templates)); }, [templates]);
  useEffect(() => { localStorage.setItem('app_salespeople_v2', JSON.stringify(salespeople)); }, [salespeople]);
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

  const processedStats = useMemo(() => {
    const cnpjCounts: Record<string, number> = {};
    const uniqueCnpjs = new Set();
    leads.forEach(l => {
      if (l.cnpj) {
        const cleanCnpj = l.cnpj.trim();
        cnpjCounts[cleanCnpj] = (cnpjCounts[cleanCnpj] || 0) + 1;
        uniqueCnpjs.add(cleanCnpj);
      }
    });
    const redundantCount = leads.length - uniqueCnpjs.size;
    return { cnpjCounts, redundantCount };
  }, [leads]);

  // Actions
  const handleUpdateLead = (updatedLead: Lead) => {
    setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
  };

  const handleRunQuickAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await quickAnalysis(leads);
    setAnalysisResult(result);
    setIsAnalyzing(false);
  };

  const handleGenerateInsights = async () => {
      setIsGeneratingInsights(true);
      const html = await generateStrategicInsights(leads);
      setStrategicInsights(html);
      setInsightLastUpdated(new Date().toISOString());
      setIsGeneratingInsights(false);
  };

  const handleSaveTemplate = (title: string, content: string) => {
    if (editingTemplateId) {
        setTemplates(prev => prev.map(t => t.id === editingTemplateId ? { ...t, title, content } : t));
        setEditingTemplateId(null);
    } else {
        const newTemplate: MessageTemplate = { id: Date.now().toString(), title, content };
        setTemplates([...templates, newTemplate]);
    }
  };

  const handleEditTemplate = (template: MessageTemplate) => {
      setEditingTemplateId(template.id);
  };

  const handleDeleteTemplate = (id: string) => {
      if (window.confirm("Tem certeza que deseja excluir este template?")) {
          setTemplates(prev => prev.filter(t => t.id !== id));
          if (editingTemplateId === id) setEditingTemplateId(null);
      }
  };

  const handleGenerateAiTemplate = async () => {
      if (!aiTemplatePrompt) return;
      setIsGeneratingTemplate(true);
      const content = await generateTemplateDraft(aiTemplatePrompt);
      const contentField = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
      if (contentField) contentField.value = content;
      setIsGeneratingTemplate(false);
  };

  const handleAddSalesperson = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSalespersonName && !salespeople.some(s => s.name === newSalespersonName)) {
        setSalespeople([...salespeople, { id: Date.now().toString(), name: newSalespersonName, photoUrl: newSalespersonPhoto }]);
        setNewSalespersonName(''); setNewSalespersonPhoto('');
    }
  };

  const handleStartEditSalesperson = (person: Salesperson) => {
      setEditingSalespersonId(person.id);
      setEditName(person.name);
      setEditPhoto(person.photoUrl || '');
  };

  const handleCancelEditSalesperson = () => {
      setEditingSalespersonId(null);
      setEditName('');
      setEditPhoto('');
  };

  const handleSaveSalesperson = () => {
      if (!editingSalespersonId || !editName.trim()) return;
      setSalespeople(prev => prev.map(s => 
          s.id === editingSalespersonId 
            ? { ...s, name: editName, photoUrl: editPhoto } 
            : s
      ));
      setEditingSalespersonId(null);
      setEditName('');
      setEditPhoto('');
  };

  const handleDeleteSalesperson = (id: string) => {
      if (window.confirm("Tem certeza que deseja remover este vendedor?")) {
          setSalespeople(prev => prev.filter(s => s.id !== id));
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) { alert("Max 2MB."); return; }
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result as string);
      reader.readAsDataURL(file);
  };

  const handleSyncSheets = async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const fetchedLeads = await fetchLeadsFromSheet(sheetId, tabValid, tabInvalid);
      if (fetchedLeads.length === 0) { setSyncError("No data found."); return; }

      let currentIndex = lastSalespersonIndex;
      const availableSalespeople = salespeople.length > 0 ? salespeople : [{id:'0', name:'HolyFoods'}];

      const mergedLeads = fetchedLeads.map(newLead => {
        const existing = leads.find(l => l.cnpj.trim() === newLead.cnpj.trim());
        if (existing) {
            return { ...newLead, id: existing.id, notes: existing.notes, dealStatus: existing.dealStatus, messageSentAt: existing.messageSentAt, messageHistory: existing.messageHistory, wonDate: existing.wonDate, wonValue: existing.wonValue, salesperson: existing.salesperson, lastTemplateTitle: existing.lastTemplateTitle, cnpjData: existing.cnpjData, attachments: existing.attachments };
        } else {
            const assignedPerson = availableSalespeople[currentIndex % availableSalespeople.length];
            currentIndex++;
            return { ...newLead, salesperson: assignedPerson.name };
        }
      });
      setLastSalespersonIndex(currentIndex);
      setLeads(mergedLeads);
      alert(`${mergedLeads.length} leads sync complete.`);
    } catch (error) { setSyncError("Sync error."); } finally { setIsSyncing(false); }
  };

  const getFilteredLeads = (baseLeads: Lead[], status?: 'VALID' | 'INVALID') => {
    let filtered = status ? baseLeads.filter(l => l.statusCnpj === status) : baseLeads;
    if (dateStart) filtered = filtered.filter(l => new Date(l.dataSubmissao) >= new Date(dateStart));
    if (dateEnd) { const end = new Date(dateEnd); end.setHours(23, 59, 59); filtered = filtered.filter(l => new Date(l.dataSubmissao) <= end); }
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

  // Date Logic Helper
  const applyDatePreset = (preset: string) => {
      setDatePreset(preset);
      const end = new Date();
      const start = new Date();
      const year = end.getFullYear();

      switch (preset) {
        case '1D': // Hoje
            // Start and End are already Today
            break;
        case '7D':
            start.setDate(end.getDate() - 7);
            break;
        case '15D':
            start.setDate(end.getDate() - 15);
            break;
        case '30D':
            start.setDate(end.getDate() - 30);
            break;
        case '60D':
            start.setDate(end.getDate() - 60);
            break;
        case '90D':
            start.setDate(end.getDate() - 90);
            break;
        case 'T1':
            start.setMonth(0, 1); // Jan 1
            start.setFullYear(year);
            end.setMonth(2, 31);  // Mar 31
            end.setFullYear(year);
            break;
        case 'T2':
            start.setMonth(3, 1); // Apr 1
            start.setFullYear(year);
            end.setMonth(5, 30);  // Jun 30
            end.setFullYear(year);
            break;
        case 'T3':
            start.setMonth(6, 1); // Jul 1
            start.setFullYear(year);
            end.setMonth(8, 30);  // Sep 30
            end.setFullYear(year);
            break;
        case 'T4':
            start.setMonth(9, 1); // Oct 1
            start.setFullYear(year);
            end.setMonth(11, 31); // Dec 31
            end.setFullYear(year);
            break;
        case 'ALL':
            setDateStart('');
            setDateEnd('');
            return;
        case 'CUSTOM':
            return; // Do nothing, manual entry
        default:
            return;
      }

      setDateStart(start.toISOString().split('T')[0]);
      setDateEnd(end.toISOString().split('T')[0]);
  };

  // --- Filter Bar Component ---
  const FilterBar = () => (
    <div className="flex flex-col xl:flex-row items-center justify-between gap-4 mb-8 sticky top-0 z-20 bg-[#F2F2F7]/95 dark:bg-[#0F0F0F]/95 backdrop-blur-md py-4 px-4 md:px-10 border-b border-gray-200/50 dark:border-white/10 transition-all">
        <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto">
            {/* Quick Filters */}
            <div className="relative group w-full md:w-auto">
                 <select 
                    value={datePreset} 
                    onChange={(e) => applyDatePreset(e.target.value)} 
                    className="w-full md:w-48 appearance-none bg-white dark:bg-[#1C1C1E] rounded-2xl pl-5 pr-10 py-3 text-sm font-bold text-gray-700 dark:text-gray-200 shadow-soft border border-gray-100 dark:border-white/5 outline-none cursor-pointer group-hover:border-hf-lemon/30 transition-all"
                 >
                    <option value="ALL">Todo o Período</option>
                    <option disabled>--- Recentes ---</option>
                    <option value="1D">Hoje (1D)</option>
                    <option value="7D">Últimos 7 Dias</option>
                    <option value="15D">Últimos 15 Dias</option>
                    <option value="30D">Últimos 30 Dias</option>
                    <option value="60D">Últimos 60 Dias</option>
                    <option value="90D">Últimos 90 Dias</option>
                    <option disabled>--- Trimestres ---</option>
                    <option value="T1">1º Trimestre (Jan-Mar)</option>
                    <option value="T2">2º Trimestre (Abr-Jun)</option>
                    <option value="T3">3º Trimestre (Jul-Set)</option>
                    <option value="T4">4º Trimestre (Out-Dez)</option>
                    <option disabled>--- Outro ---</option>
                    <option value="CUSTOM">Personalizado</option>
                 </select>
                 <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>

            {/* Manual Date Inputs */}
            <div className="flex items-center gap-2 bg-white dark:bg-[#1C1C1E] rounded-2xl px-4 py-2.5 shadow-soft border border-gray-100 dark:border-white/5 w-full md:w-auto overflow-x-auto transition-colors">
                <input 
                    type="date" 
                    value={dateStart} 
                    onChange={e => { setDateStart(e.target.value); setDatePreset('CUSTOM'); }} 
                    className="bg-transparent text-sm font-medium text-gray-700 dark:text-gray-200 outline-none hover:text-hf-lemon transition cursor-pointer dark:[color-scheme:dark]" 
                />
                <span className="text-gray-300 dark:text-gray-600">→</span>
                <input 
                    type="date" 
                    value={dateEnd} 
                    onChange={e => { setDateEnd(e.target.value); setDatePreset('CUSTOM'); }} 
                    className="bg-transparent text-sm font-medium text-gray-700 dark:text-gray-200 outline-none hover:text-hf-lemon transition cursor-pointer dark:[color-scheme:dark]" 
                />
            </div>
        </div>
        
        <div className="flex items-center gap-3 w-full xl:w-auto">
             <div className="relative flex-1 xl:w-56 group">
                 <select value={selectedSalespersonFilter} onChange={(e) => setSelectedSalespersonFilter(e.target.value)} className="w-full appearance-none bg-white dark:bg-[#1C1C1E] rounded-2xl pl-5 pr-10 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 shadow-soft border border-gray-100 dark:border-white/5 outline-none cursor-pointer group-hover:border-hf-lemon/30 transition-all">
                    <option value="">Todos Vendedores</option>
                    {salespeople.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                 </select>
                 <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 rotate-90 pointer-events-none" />
             </div>
             {(dateStart || dateEnd || selectedSalespersonFilter) && (
                <button onClick={() => { setDateStart(''); setDateEnd(''); setDatePreset('ALL'); setSelectedSalespersonFilter(''); }} className="bg-white dark:bg-[#1C1C1E] text-gray-400 dark:text-gray-500 p-3 rounded-2xl shadow-soft border border-transparent hover:border-red-200 dark:hover:border-red-900/30 hover:text-red-500 transition tap-active" title="Limpar todos os filtros">
                    <Trash size={16} />
                </button>
             )}
        </div>
    </div>
  );

  const renderContent = () => {
    const filteredLeadsGlobal = getFilteredLeads(leads);

    switch (activePage) {
      case 'DASHBOARD':
        return (
          <div className="animate-enter pb-20">
             <FilterBar />
             <div className="px-4 md:px-10">
                <Dashboard 
                    leads={filteredLeadsGlobal} duplicateCount={processedStats.redundantCount} onQuickAnalysis={handleRunQuickAnalysis} analysisResult={analysisResult} isAnalyzing={isAnalyzing} templates={templates} salespeople={salespeople} onUpdateLead={handleUpdateLead} strategicInsights={strategicInsights} isGeneratingInsights={isGeneratingInsights} onRefreshInsights={handleGenerateInsights} insightLastUpdated={insightLastUpdated} isDarkMode={isDarkMode}
                />
             </div>
          </div>
        );
      
      case 'LEADS_VALID':
        const displayValid = applyDuplicateLogic(getFilteredLeads(leads, 'VALID'));
        return (
          <div className="animate-enter pb-20">
             <FilterBar />
             <div className="max-w-7xl mx-auto px-4 md:px-10">
                <div className="flex justify-between items-end mb-8 px-2">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Leads Válidos</h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">{displayValid.length} oportunidades ativas</p>
                    </div>
                    <button onClick={() => setHideDuplicates(!hideDuplicates)} className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all shadow-soft tap-active ${hideDuplicates ? 'bg-white dark:bg-[#1C1C1E] text-hf-green dark:text-hf-lemon border border-hf-green/20 dark:border-hf-lemon/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                        {hideDuplicates ? <ToggleRight size={18}/> : <ToggleLeft size={18}/>}
                        {hideDuplicates ? 'Ocultando Duplicados' : 'Mostrando Duplicados'}
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayValid.map(lead => (
                        <LeadCard 
                            key={lead.id} 
                            lead={lead} 
                            templates={templates} 
                            salespeople={salespeople} 
                            onUpdateLead={handleUpdateLead} 
                            isDuplicate={(processedStats.cnpjCounts[lead.cnpj.trim()] || 0) > 1}
                            onClick={() => setDetailLead(lead)} 
                        />
                    ))}
                </div>
             </div>
          </div>
        );

      case 'LEADS_INVALID':
        const displayInvalid = applyDuplicateLogic(getFilteredLeads(leads, 'INVALID'));
        return (
           <div className="animate-enter pb-20">
             <FilterBar />
             <div className="max-w-7xl mx-auto px-4 md:px-10">
                <div className="flex justify-between items-end mb-8 px-2">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
                            Auditoria <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-sm px-3 py-1 rounded-full">{displayInvalid.length}</span>
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">Verificação manual de CNPJs inválidos</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayInvalid.map(lead => (
                        <LeadCard 
                            key={lead.id} 
                            lead={lead} 
                            templates={templates} 
                            salespeople={salespeople} 
                            onUpdateLead={handleUpdateLead} 
                            isDuplicate={(processedStats.cnpjCounts[lead.cnpj.trim()] || 0) > 1}
                            onClick={() => setDetailLead(lead)} 
                        />
                    ))}
                </div>
             </div>
          </div>
        );

      case 'STRATEGY':
        return (
            <div className="p-4 md:px-10 md:py-8">
                <StrategyView 
                    leads={filteredLeadsGlobal}
                    strategicInsights={strategicInsights}
                    isGeneratingInsights={isGeneratingInsights}
                    onRefreshInsights={handleGenerateInsights}
                    insightLastUpdated={insightLastUpdated}
                />
            </div>
        );

      case 'PLAYBOOK':
        return (
          <div className="animate-enter max-w-5xl mx-auto space-y-10 pb-20 p-4 md:px-10 md:py-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Playbook de Vendas</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">Padronize a comunicação do time.</p>
                </div>
            </div>

            <div className="glass rounded-3xl p-8 shadow-medium relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-hf-lemon via-hf-green to-hf-lemon"></div>
                <h3 className="text-lg font-bold mb-6 flex items-center gap-3 text-gray-800 dark:text-white">
                    {editingTemplateId ? <div className="p-2 bg-hf-lemon/10 rounded-xl text-hf-lemon"><Edit size={20}/></div> : <div className="p-2 bg-hf-lemon/10 rounded-xl text-hf-lemon"><Plus size={20}/></div>}
                    {editingTemplateId ? 'Editar Template' : 'Novo Template'}
                </h3>
                
                <div className="mb-8 bg-gray-50 dark:bg-black/20 p-2 rounded-2xl flex items-center gap-3 border border-gray-200 dark:border-white/10 focus-within:bg-white dark:focus-within:bg-[#2C2C2E] focus-within:ring-4 focus-within:ring-hf-lemon/10 transition-all shadow-inner">
                    <span className="bg-white dark:bg-[#1C1C1E] p-2 rounded-xl shadow-sm text-hf-lemon"><Sparkles size={18} /></span>
                    <input type="text" value={aiTemplatePrompt} onChange={e => setAiTemplatePrompt(e.target.value)} placeholder="IA: 'Escreva uma mensagem para recuperar ex-clientes...'" className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-gray-400 text-gray-800 dark:text-white" />
                    <button onClick={handleGenerateAiTemplate} disabled={isGeneratingTemplate} className="bg-gray-900 dark:bg-white dark:text-black text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-black dark:hover:bg-gray-200 transition disabled:opacity-50 tap-active">
                        {isGeneratingTemplate ? 'Gerando...' : 'Gerar com IA'}
                    </button>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); const form = e.target as HTMLFormElement; const title = (form.elements.namedItem('title') as HTMLInputElement).value; const content = (form.elements.namedItem('content') as HTMLTextAreaElement).value; if(title && content) { handleSaveTemplate(title, content); form.reset(); setAiTemplatePrompt(''); } }} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 ml-1">Título</label>
                        <input name="title" defaultValue={editingTemplateId ? templates.find(t => t.id === editingTemplateId)?.title : ''} placeholder="Ex: Abordagem Inicial" className="w-full bg-white dark:bg-[#2C2C2E] border border-gray-200 dark:border-white/5 rounded-2xl px-5 py-4 text-sm font-semibold text-gray-800 dark:text-white outline-none focus:border-hf-lemon focus:ring-4 focus:ring-hf-lemon/10 transition-all" required key={editingTemplateId ? `title-${editingTemplateId}` : 'title-new'} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 ml-1">Mensagem</label>
                        <textarea name="content" defaultValue={editingTemplateId ? templates.find(t => t.id === editingTemplateId)?.content : ''} placeholder="Olá [Nome]..." className="w-full bg-white dark:bg-[#2C2C2E] border border-gray-200 dark:border-white/5 rounded-2xl px-5 py-4 text-sm text-gray-600 dark:text-gray-300 min-h-[140px] outline-none focus:border-hf-lemon focus:ring-4 focus:ring-hf-lemon/10 resize-none transition-all leading-relaxed" required key={editingTemplateId ? `content-${editingTemplateId}` : 'content-new'} />
                    </div>
                    <div className="flex gap-4 pt-2">
                        <button type="submit" className={`px-8 py-3.5 rounded-2xl text-white font-bold text-sm shadow-medium tap-active transition-all flex-1 ${editingTemplateId ? 'bg-hf-lemon hover:bg-hf-lemonHover' : 'bg-gray-900 dark:bg-white dark:text-black hover:bg-black'}`}>
                            {editingTemplateId ? 'Salvar Alterações' : 'Criar Template'}
                        </button>
                        {editingTemplateId && <button type="button" onClick={() => setEditingTemplateId(null)} className="px-8 py-3.5 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-300 font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 tap-active">Cancelar</button>}
                    </div>
                </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map(t => (
                    <div key={t.id} className="glass p-6 rounded-3xl shadow-soft hover:shadow-medium transition-all cursor-pointer group relative h-full flex flex-col">
                        <h4 className="font-bold text-gray-900 dark:text-white mb-3 text-lg">{t.title}</h4>
                        <div className="flex-1 bg-gray-50 dark:bg-black/20 rounded-2xl p-4 mb-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-4 leading-relaxed font-medium">"{t.content}"</p>
                        </div>
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => {e.stopPropagation(); handleEditTemplate(t)}} className="p-2 text-hf-lemon bg-hf-lemon/10 rounded-xl hover:bg-hf-lemon hover:text-white transition"><Edit size={16}/></button>
                            <button onClick={(e) => {e.stopPropagation(); handleDeleteTemplate(t.id)}} className="p-2 text-red-500 bg-red-50 rounded-xl hover:bg-red-500 hover:text-white transition"><Trash size={16}/></button>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        );

      case 'CONFIG':
        return (
            <div className="animate-enter max-w-4xl mx-auto space-y-10 pb-20 p-4 md:px-10 md:py-8">
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Ajustes</h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">Configure seu ambiente.</p>
                    </div>
                </div>
                
                {/* Team Section */}
                <div className="glass rounded-3xl shadow-soft overflow-hidden">
                    <div className="p-8 border-b border-gray-100 dark:border-white/5 flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600"><Users size={24}/></div>
                        <div><h3 className="font-bold text-gray-900 dark:text-white text-lg">Time de Vendas</h3><p className="text-sm text-gray-500 dark:text-gray-400">Gerencie quem atende os leads.</p></div>
                    </div>
                    <div className="p-8">
                        {/* Add New Salesperson Form */}
                        <form onSubmit={handleAddSalesperson} className="flex gap-4 mb-8">
                            <input value={newSalespersonName} onChange={(e) => setNewSalespersonName(e.target.value)} placeholder="Nome do Vendedor" className="flex-1 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl px-5 py-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-green-500/20 transition dark:text-white" required />
                             <label className="cursor-pointer bg-white dark:bg-[#2C2C2E] border border-gray-200 dark:border-white/10 hover:bg-gray-50 px-5 py-3.5 rounded-2xl transition flex items-center gap-3 text-gray-600 dark:text-gray-300 font-bold text-sm shadow-sm tap-active"><ImageIcon size={18} /><span className="hidden sm:inline">Foto</span><input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setNewSalespersonPhoto)} /></label>
                            <button type="submit" className="bg-gray-900 dark:bg-white dark:text-black text-white px-8 py-3.5 rounded-2xl font-bold text-sm hover:bg-black transition shadow-medium tap-active">Adicionar</button>
                        </form>
                        
                        {/* Salespeople List */}
                        <div className="space-y-3">
                            {salespeople.map(s => (
                                <div key={s.id} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 hover:bg-white dark:hover:bg-[#3A3A3C] hover:shadow-soft transition group">
                                    {editingSalespersonId === s.id ? (
                                        // Edit Mode
                                        <div className="flex items-center gap-3 w-full">
                                            <div className="relative">
                                                {editPhoto ? <img src={editPhoto} className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-white/10" /> : <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 ring-2 ring-white dark:ring-white/10"><UserCircle size={20}/></div>}
                                                <label className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-700 p-1 rounded-full shadow-sm cursor-pointer border border-gray-200 dark:border-gray-600">
                                                    <Upload size={10} className="text-gray-600 dark:text-gray-300" />
                                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setEditPhoto)} />
                                                </label>
                                            </div>
                                            <input 
                                                value={editName} 
                                                onChange={(e) => setEditName(e.target.value)} 
                                                className="flex-1 bg-white dark:bg-[#2C2C2E] border border-green-200 dark:border-green-800 rounded-xl px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-green-500/20 transition dark:text-white"
                                                autoFocus
                                            />
                                            <div className="flex gap-2">
                                                <button onClick={handleSaveSalesperson} className="p-2 text-green-600 bg-green-50 dark:bg-green-900/30 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/50 transition"><Check size={18}/></button>
                                                <button onClick={handleCancelEditSalesperson} className="p-2 text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition"><X size={18}/></button>
                                            </div>
                                        </div>
                                    ) : (
                                        // Display Mode
                                        <>
                                            <div className="flex items-center gap-4">
                                                {s.photoUrl ? <img src={s.photoUrl} className="w-10 h-10 rounded-full object-cover shadow-sm ring-2 ring-white dark:ring-white/10" /> : <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 ring-2 ring-white dark:ring-white/10"><UserCircle size={20}/></div>}
                                                <span className="font-semibold text-gray-800 dark:text-gray-200">{s.name}</span>
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleStartEditSalesperson(s)} className="text-gray-400 hover:text-hf-lemon p-2 rounded-xl hover:bg-hf-lemon/10 transition"><Edit size={18}/></button>
                                                <button onClick={() => handleDeleteSalesperson(s.id)} className="text-gray-400 hover:text-red-500 p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 transition"><Trash size={18}/></button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                
                {/* Integration Section */}
                 <div className="glass rounded-3xl shadow-soft overflow-hidden">
                    <div className="p-8 border-b border-gray-100 dark:border-white/5 flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600"><BookOpen size={24}/></div>
                        <div><h3 className="font-bold text-gray-900 dark:text-white text-lg">Google Sheets</h3><p className="text-sm text-gray-500 dark:text-gray-400">Conecte sua base de dados.</p></div>
                    </div>
                    <div className="p-8 space-y-6">
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 block ml-1">ID da Planilha</label>
                            <input value={sheetId} onChange={(e) => setSheetId(e.target.value)} className="w-full bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl px-5 py-3.5 text-sm font-medium outline-none border border-transparent focus:bg-white dark:focus:bg-[#3A3A3C] focus:border-orange-200 focus:shadow-soft transition dark:text-white" placeholder="Cole o ID aqui..." />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 block ml-1">Aba Válidos</label>
                                <input value={tabValid} onChange={(e) => setTabValid(e.target.value)} className="w-full bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl px-5 py-3.5 text-sm font-medium outline-none border border-transparent focus:bg-white dark:focus:bg-[#3A3A3C] focus:border-orange-200 transition dark:text-white" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 block ml-1">Aba Inválidos</label>
                                <input value={tabInvalid} onChange={(e) => setTabInvalid(e.target.value)} className="w-full bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl px-5 py-3.5 text-sm font-medium outline-none border border-transparent focus:bg-white dark:focus:bg-[#3A3A3C] focus:border-orange-200 transition dark:text-white" />
                            </div>
                        </div>
                        <button onClick={handleSyncSheets} disabled={isSyncing} className="w-full bg-hf-lemon text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-hf-lemon/30 hover:bg-hf-lemonHover transition flex items-center justify-center gap-3 tap-active disabled:opacity-70">
                            <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''}/> {isSyncing ? 'Sincronizando dados...' : 'Sincronizar Agora'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#F2F2F7] dark:bg-[#0F0F0F] overflow-hidden selection:bg-hf-lemon selection:text-white transition-colors duration-500">
      {/* Sidebar - Apple Style */}
      <aside className="hidden md:flex flex-col w-[280px] h-full bg-[#F2F2F7] dark:bg-[#0F0F0F] border-r border-gray-200 dark:border-white/10 flex-shrink-0 transition-colors duration-500">
        <div className="p-8 pb-6">
             <div className="flex items-center gap-4 bg-white dark:bg-[#1C1C1E] p-3 rounded-2xl shadow-soft border border-gray-100 dark:border-white/5 transition-all">
               <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800">
                 <img src={HOLY_FOODS_LOGO} className="w-full h-full object-cover" />
               </div>
               <span className="font-bold text-gray-900 dark:text-white tracking-tight">Holy Foods</span>
             </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
             <div className="px-4 py-2 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Principal</div>
             <SidebarItem icon={<LayoutDashboard size={20} />} label="Visão Geral" active={activePage === 'DASHBOARD'} onClick={() => setActivePage('DASHBOARD')} />
             <SidebarItem icon={<Lightbulb size={20} />} label="Estratégia IA" active={activePage === 'STRATEGY'} onClick={() => setActivePage('STRATEGY')} />
             
             <div className="mt-8 px-4 py-2 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Leads</div>
             <SidebarItem icon={<Users size={20} />} label="Leads Válidos" active={activePage === 'LEADS_VALID'} onClick={() => setActivePage('LEADS_VALID')} />
             <SidebarItem icon={<AlertTriangle size={20} />} label="Auditoria" active={activePage === 'LEADS_INVALID'} onClick={() => setActivePage('LEADS_INVALID')} />
             
             <div className="mt-8 px-4 py-2 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Gestão</div>
             <SidebarItem icon={<BookOpen size={20} />} label="Playbook" active={activePage === 'PLAYBOOK'} onClick={() => setActivePage('PLAYBOOK')} />
             <SidebarItem icon={<Settings size={20} />} label="Ajustes" active={activePage === 'CONFIG'} onClick={() => setActivePage('CONFIG')} />
        </nav>
        
        <div className="p-6 space-y-4">
            {/* Theme Toggle */}
            <button onClick={toggleTheme} className="w-full flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-[#1C1C1E] shadow-soft border border-gray-100 dark:border-white/5 group transition-all tap-active">
                <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-orange-100 text-orange-500'}`}>
                        {isDarkMode ? <Moon size={16}/> : <Sun size={16}/>}
                    </div>
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{isDarkMode ? 'Modo Escuro' : 'Modo Claro'}</span>
                </div>
                <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${isDarkMode ? 'bg-hf-lemon' : 'bg-gray-300'}`}>
                    <div className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${isDarkMode ? 'translate-x-4' : 'translate-x-0'}`}></div>
                </div>
            </button>

            <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-white/5 flex items-center gap-3 transition-colors">
                <div className="relative">
                    <span className="w-2.5 h-2.5 bg-hf-lemon rounded-full block animate-pulse shadow-glow-lemon"></span>
                </div>
                <div className="flex-1">
                    <p className="text-xs font-bold text-gray-900 dark:text-white">Sistema Online</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">v3.0.0 • Atualizado</p>
                </div>
            </div>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#F2F2F7] dark:bg-[#0F0F0F] transition-colors duration-500">
         {/* Mobile Header */}
         <div className="md:hidden p-4 flex justify-between items-center bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-md border-b border-gray-200 dark:border-white/5 sticky top-0 z-50">
             <span className="font-bold text-lg text-gray-900 dark:text-white">Holy Foods</span>
             <button onClick={() => {}} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800"><Menu size={20} className="text-gray-600 dark:text-gray-300"/></button>
         </div>

         <div className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth">
            {renderContent()}
         </div>
      </main>

      {/* Chat Widget */}
      <ChatWidget leads={leads} />
      
      {/* Detail Modal Portal for App-Level Pages (Valid/Invalid Leads) */}
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
  <button 
    onClick={onClick} 
    className={`
        w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm group
        ${active 
            ? 'bg-gray-200/60 dark:bg-white/10 text-gray-900 dark:text-white font-bold' 
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}
    `}
  >
    <span className={`transition-colors ${active ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}>{icon}</span>
    {label}
  </button>
);