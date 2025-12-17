import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, ComposedChart, Line
} from 'recharts';
import { Lead, MessageTemplate, MessageHistoryItem, Attachment, Salesperson, Role } from '../types';
import { 
  Users, CheckCircle, XCircle, DollarSign, Zap, Copy, Clock, MessageSquare, AlertCircle, 
  MessageCircle, Edit, Send, Upload, Trophy, ExternalLink, Calendar, MapPin, User, ThumbsDown, AlertTriangle, Paperclip, Eye, Trash2, Maximize2, RefreshCw, Lightbulb, ChevronDown, ChevronUp, BarChart2, ArrowUp, ArrowDown, ArrowUpDown, MousePointerClick, TrendingUp, ListFilter, Percent
} from 'lucide-react';
import { LeadCard } from './LeadCard';

interface DashboardProps {
  leads: Lead[];
  duplicateCount: number;
  onQuickAnalysis: () => void;
  analysisResult: string | null;
  isAnalyzing: boolean;
  templates: MessageTemplate[];
  salespeople: Salesperson[];
  onUpdateLead: (updatedLead: Lead) => void;
  strategicInsights: string | null;
  isGeneratingInsights: boolean;
  onRefreshInsights: () => void;
  insightLastUpdated: string | null;
  isDarkMode: boolean;
  datePreset: string;
  userRole: Role; // Added to control visibility
}

const BRAND = {
    LEMON: '#7BCA0C',
    DARK_GREEN: '#005234',
    ORANGE: '#F45218',
    YELLOW: '#FFC51D',
    CREAM: '#FFFAE0',
    BLACK: '#1A1A1A'
};

const truncateLabel = (value: string, maxLength: number = 40) => {
    if (value.length <= maxLength) return value;
    return `${value.substring(0, maxLength)}...`;
};

const ResultsSummary = ({ leads, isDarkMode, subtitle }: { leads: Lead[], isDarkMode: boolean, subtitle: string }) => {
    const monthlyData = useMemo(() => {
        const today = new Date();
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            months.push({
                name: d.toLocaleString('pt-BR', { month: 'short' }).replace('.', ''),
                monthIndex: d.getMonth(),
                year: d.getFullYear(),
                active: 0, won: 0, lost: 0, revenue: 0
            });
        }
        leads.forEach(lead => {
            const date = new Date(lead.dataSubmissao);
            const monthEntry = months.find(m => m.monthIndex === date.getMonth() && m.year === date.getFullYear());
            if (monthEntry) {
                if (lead.dealStatus === 'WON') { monthEntry.won++; monthEntry.revenue += (lead.wonValue || 0); }
                else if (lead.dealStatus === 'LOST') monthEntry.lost++;
                else monthEntry.active++;
            }
        });
        return months.map(m => ({ ...m, name: m.name.charAt(0).toUpperCase() + m.name.slice(1) }));
    }, [leads]);

    const stats = useMemo(() => {
        const total = leads.length;
        const won = leads.filter(l => l.dealStatus === 'WON').length;
        const lost = leads.filter(l => l.dealStatus === 'LOST').length;
        const active = total - won - lost;
        
        const activePct = total > 0 ? ((active / total) * 100).toFixed(1) : '0.0';
        const wonPct = total > 0 ? ((won / total) * 100).toFixed(1) : '0.0';
        const lostPct = total > 0 ? ((lost / total) * 100).toFixed(1) : '0.0';

        return { total, won, lost, active, activePct, wonPct, lostPct };
    }, [leads]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const monthTotal = payload.reduce((acc: number, entry: any) => acc + (Number(entry.value) || 0), 0);
            return (
                <div className="bg-white/95 dark:bg-[#2C2C2E]/95 backdrop-blur-xl p-4 rounded-2xl shadow-floating border border-white/20 dark:border-white/10 text-xs min-w-[200px] z-50">
                    <div className="flex justify-between items-center mb-3 border-b border-gray-100 dark:border-white/10 pb-2">
                        <p className="font-bold text-gray-900 dark:text-white text-sm capitalize">{label}</p>
                        <span className="font-bold text-gray-500 dark:text-gray-400">Total: {monthTotal}</span>
                    </div>
                    {payload.map((entry: any, index: number) => {
                        const val = Number(entry.value);
                        const pct = monthTotal > 0 ? ((val / monthTotal) * 100).toFixed(1) : '0.0';
                        return (
                            <div key={index} className="flex items-center justify-between gap-4 mb-2 last:mb-0">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-md shadow-sm" style={{ backgroundColor: entry.color }} />
                                    <span className="text-gray-500 dark:text-gray-300 font-medium capitalize">
                                        {entry.name === 'active' ? 'Em Aberto' : entry.name === 'won' ? 'Vendas' : 'Perdidos'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-900 dark:text-white tabular-nums">{val}</span>
                                    <span className="text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-white/10 px-1.5 rounded tabular-nums">({pct}%)</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="glass rounded-[32px] p-8 shadow-soft hover:shadow-medium transition-all duration-500 h-[460px] flex flex-col relative group">
            <div className="flex items-center gap-3 mb-10 relative z-10">
                 <div className="w-10 h-10 bg-gray-50 dark:bg-white/10 rounded-2xl flex items-center justify-center text-hf-lemon"><BarChart2 size={20} /></div>
                 <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">Performance Geral</h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">{subtitle}</p>
                 </div>
            </div>
            <div className="flex items-center gap-12 mb-10 relative z-10 px-2">
                <div>
                    <div className="flex items-end gap-2">
                        <p className="text-5xl font-bold text-gray-900 dark:text-white tracking-tighter leading-none">{stats.total.toLocaleString()}</p>
                        <span className="text-sm font-bold text-gray-400 dark:text-gray-500 mb-1">(100%)</span>
                    </div>
                    <div className="flex items-center gap-2 mt-3"><span className="w-2 h-2 rounded-full bg-gray-900 dark:bg-white"></span><span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Total de Leads</span></div>
                </div>
                <div className="h-12 w-px bg-gray-100 dark:bg-white/10"></div>
                <div>
                     <div className="flex items-end gap-2">
                        <p className="text-5xl font-bold text-hf-lemon tracking-tighter leading-none">{stats.won.toLocaleString()}</p>
                        <span className="text-sm font-bold text-hf-lemon/70 mb-1">({stats.wonPct}%)</span>
                    </div>
                    <div className="flex items-center gap-2 mt-3"><span className="w-2 h-2 rounded-full bg-hf-lemon"></span><span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Convertidos</span></div>
                </div>
                <div className="h-12 w-px bg-gray-100 dark:bg-white/10"></div>
                 <div>
                    <div className="flex items-end gap-2">
                        <p className="text-5xl font-bold tracking-tighter leading-none" style={{ color: BRAND.ORANGE }}>{stats.lost.toLocaleString()}</p>
                        <span className="text-sm font-bold text-gray-400 dark:text-gray-600 mb-1">({stats.lostPct}%)</span>
                    </div>
                    <div className="flex items-center gap-2 mt-3"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: BRAND.ORANGE }}></span><span className="text-sm font-semibold text-gray-400 dark:text-gray-500">Perdidos</span></div>
                </div>
            </div>
            <div className="flex-1 w-full text-xs relative z-10 overflow-hidden rounded-b-[24px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }} barSize={100}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#333" : "#F3F4F6"} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#9CA3AF' : '#6B7280', fontSize: 12, fontWeight: 600 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#6B7280' : '#D1D5DB', fontSize: 11, fontWeight: 500 }} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: isDarkMode ? '#FFFFFF10' : '#F9FAFB', radius: 12 }} />
                        <Bar dataKey="active" stackId="a" fill={BRAND.DARK_GREEN} radius={[0, 0, 8, 8]} />
                        <Bar dataKey="won" stackId="a" fill={BRAND.LEMON} />
                        <Bar dataKey="lost" stackId="a" fill={BRAND.ORANGE} radius={[8, 8, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

// ... Rest of charts remain same, but will be conditionally rendered below ...
const EfficiencyChart = ({ data, isDarkMode }: { data: any[], isDarkMode: boolean }) => (
    <div className="glass rounded-[32px] p-8 shadow-soft h-[400px] flex flex-col hover:shadow-medium transition-all duration-300">
        <div className="flex justify-between items-center mb-6"><div><h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Eficiência por Canal</h3><p className="text-[10px] text-gray-400 mt-1">Ganhos vs Perdas</p></div></div>
        <div className="flex-1 w-full overflow-y-auto custom-scrollbar pr-2 space-y-6">
            {data.map((item, index) => {
                const total = item.won + item.lost;
                const winPct = total > 0 ? (item.won / total) * 100 : 0;
                return (
                    <div key={index} className="group">
                        <div className="flex justify-between items-end mb-2"><span className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate max-w-[60%]">{item.name}</span><div className="flex items-center gap-2 text-xs"><span className="font-bold" style={{ color: BRAND.LEMON }}>{item.won} <span className="font-normal opacity-50">v</span></span><span className="font-bold" style={{ color: BRAND.ORANGE }}>{item.lost} <span className="font-normal opacity-50">p</span></span></div></div>
                        <div className="w-full h-2 bg-gray-100 dark:bg-white/5 rounded-full flex overflow-hidden"><div style={{ width: `${winPct}%`, backgroundColor: BRAND.LEMON }} className="h-full"></div><div style={{ width: `${100 - winPct}%`, backgroundColor: BRAND.ORANGE }} className="h-full"></div></div>
                    </div>
                )
            })}
        </div>
    </div>
);

const SimpleBarChart = ({ data, color, title, isDarkMode }: { data: any[], color: string, title: string, isDarkMode: boolean }) => {
    const total = data.reduce((acc, curr) => acc + (curr.value || 0), 0);
    return (
        <div className="glass rounded-[32px] p-8 shadow-soft h-[400px] flex flex-col hover:shadow-medium transition-all duration-300">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-6 uppercase tracking-wider">{title}</h3>
            <div className="flex-1 w-full overflow-y-auto custom-scrollbar pr-2 space-y-5">
                {data.map((item, index) => (
                    <div key={index} className="group">
                        <div className="flex justify-between items-end mb-2"><span className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate">{item.name}</span><span className="text-sm font-bold dark:text-white">{item.value}</span></div>
                        <div className="w-full h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${total > 0 ? (item.value / total) * 100 : 0}%`, backgroundColor: color }}></div></div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const CountPieChart = ({ data, title, colors, isDarkMode }: { data: any[], title: string, colors: string[], isDarkMode: boolean }) => (
    <div className="glass rounded-[32px] p-8 shadow-soft h-[400px] flex flex-col hover:shadow-medium transition-all duration-300 relative">
        <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-wider">{title}</h3>
        <div className="flex-1 w-full relative flex items-center justify-center">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={data} innerRadius={85} outerRadius={110} paddingAngle={5} dataKey="value" stroke="none" cornerRadius={8}>{data.map((entry, index) => (<Cell key={`cell-${index}`} fill={colors[index % colors.length]} />))}</Pie><Tooltip /></PieChart>
            </ResponsiveContainer>
        </div>
    </div>
);

const RevenueDonutChart = ({ data, isDarkMode }: { data: any[], isDarkMode: boolean }) => {
    const totalRev = data.reduce((acc, curr) => acc + (curr.value || 0), 0);
    const colors = [BRAND.LEMON, BRAND.DARK_GREEN, BRAND.YELLOW, BRAND.ORANGE];
    return (
        <div className="glass rounded-[32px] p-8 shadow-soft h-[400px] flex flex-col hover:shadow-medium transition-all duration-300 relative">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-wider">Receita por Canal</h3>
            <div className="flex-1 w-full relative flex items-center justify-center">
                 <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"><p className="text-3xl font-bold dark:text-white">R$ {totalRev >= 1000 ? (totalRev/1000).toFixed(0) + 'k' : totalRev}</p></div>
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart><Pie data={data} innerRadius={85} outerRadius={110} paddingAngle={5} dataKey="value" stroke="none" cornerRadius={8}>{data.map((entry, index) => (<Cell key={`cell-${index}`} fill={colors[index % colors.length]} />))}</Pie><Tooltip /></PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const KanbanColumn = ({ title, icon: Icon, leads, templates, salespeople, onUpdateLead, onLeadClick, dateField, accentColor, sortOrder, onToggleSort }: any) => {
  const sortedLeads = useMemo(() => {
    const effectiveSort = sortOrder || 'desc';
    return [...leads].sort((a, b) => {
      let dateA = new Date(a[dateField] || a.dataSubmissao).getTime();
      let dateB = new Date(b[dateField] || b.dataSubmissao).getTime();
      return effectiveSort === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [leads, sortOrder, dateField]);

  return (
    <div className="flex flex-col h-full">
       <div className="flex items-center justify-between mb-4 px-1 sticky top-0 bg-[#F2F2F7] dark:bg-[#0F0F0F] z-10 py-2 border-b border-gray-200 dark:border-white/5">
          <div className="flex items-center gap-3"><div className={`p-2 rounded-xl ${accentColor} bg-opacity-10 dark:bg-opacity-20`}><Icon size={18} className={accentColor.replace('bg-', 'text-')} /></div><div><h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm tracking-tight">{title}</h3><span className="text-[10px] font-medium text-gray-400">{leads.length} leads</span></div></div>
          <button onClick={onToggleSort} className="p-2 rounded-lg hover:bg-white dark:hover:bg-white/10 transition text-gray-400">{sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}</button>
       </div>
       <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar pb-24">
          {sortedLeads.map((lead: Lead) => (<LeadCard key={lead.id} lead={lead} templates={templates} salespeople={salespeople} onUpdateLead={onUpdateLead} variant="card" onClick={() => onLeadClick(lead)} />))}
       </div>
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ 
    leads, duplicateCount, onQuickAnalysis, analysisResult, isAnalyzing, 
    templates, salespeople, onUpdateLead,
    strategicInsights, isGeneratingInsights, onRefreshInsights, insightLastUpdated,
    isDarkMode, datePreset, userRole
}) => {
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [columnSorts, setColumnSorts] = useState<Record<string, 'asc' | 'desc' | null>>({});

  const toggleColumnSort = (key: string) => {
      setColumnSorts(prev => ({ ...prev, [key]: prev[key] === 'desc' ? 'asc' : 'desc' }));
  };

  const processedLeads = useMemo(() => {
      const groups: Record<string, Lead[]> = {};
      const emailMap = new Map<string, string>();
      const cnpjMap = new Map<string, string>();

      leads.forEach(lead => {
          const cleanCnpj = (lead.cnpj || '').replace(/\D/g, '');
          const email = (lead.email || '').trim().toLowerCase();
          let groupKey = (cleanCnpj && cnpjMap.has(cleanCnpj)) ? cnpjMap.get(cleanCnpj)! : (email && emailMap.has(email)) ? emailMap.get(email)! : (cleanCnpj ? `cnpj-${cleanCnpj}` : (email ? `email-${email}` : `id-${lead.id}`));
          if (cleanCnpj) cnpjMap.set(cleanCnpj, groupKey);
          if (email) emailMap.set(email, groupKey);
          if (!groups[groupKey]) groups[groupKey] = [];
          groups[groupKey].push(lead);
      });

      return Object.values(groups).map(group => group.sort((a, b) => new Date(b.dataSubmissao).getTime() - new Date(a.dataSubmissao).getTime())[0]);
  }, [leads]);

  const validPending = processedLeads.filter(l => l.statusCnpj === 'VALID' && !l.messageSentAt && l.dealStatus === 'PENDING');
  const invalidPending = processedLeads.filter(l => l.statusCnpj === 'INVALID' && !l.messageSentAt && l.dealStatus === 'PENDING');
  const contactedLeads = processedLeads.filter(l => l.messageSentAt && l.dealStatus === 'PENDING');
  const wonLeads = processedLeads.filter(l => l.dealStatus === 'WON');
  const lostLeads = processedLeads.filter(l => l.dealStatus === 'LOST');

  const efficiencyData = useMemo(() => {
      const map: Record<string, { won: number, lost: number }> = {};
      leads.forEach(l => {
          if (l.dealStatus === 'PENDING') return;
          let source = l.utmSource || 'direct';
          if (!map[source]) map[source] = { won: 0, lost: 0 };
          if (l.dealStatus === 'WON') map[source].won++; else map[source].lost++;
      });
      return Object.entries(map).map(([name, stats]) => ({ name, won: stats.won, lost: stats.lost, total: stats.won + stats.lost })).sort((a,b) => b.total - a.total).slice(0, 6);
  }, [leads]);

  const revenueBySource = useMemo(() => {
      const map: Record<string, number> = {};
      leads.filter(l => l.dealStatus === 'WON').forEach(l => {
          let val = l.utmSource || 'direct';
          map[val] = (map[val] || 0) + (l.wonValue || 0);
      });
      return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 5);
  }, [leads]);

  const wonByContent = useMemo(() => {
      const map: Record<string, number> = {};
      leads.filter(l => l.dealStatus === 'WON').forEach(l => {
          let val = l.utmContent || 'N/A';
          map[val] = (map[val] || 0) + 1;
      });
      return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 5);
  }, [leads]);

  const getDateLabel = () => {
    switch (datePreset) {
        case 'TODAY': return 'Hoje';
        case '7D': return 'Últimos 7 dias';
        case '30D': return 'Últimos 30 dias';
        case 'MONTH': return 'Este Mês';
        case 'ALL': return 'Todo o Período';
        default: return 'Filtro Ativo';
    }
  };

  return (
    <div className="space-y-12 max-w-[1600px] mx-auto">
      <div className="flex justify-between items-end">
        <div><h2 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">Visão Geral</h2><p className="text-gray-500 font-medium mt-2 text-lg">Centro de comando de vendas.</p></div>
        <button onClick={onQuickAnalysis} disabled={isAnalyzing} className="group relative flex items-center gap-3 px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-black rounded-2xl hover:bg-black transition-all shadow-medium hover:-translate-y-1 disabled:opacity-50 tap-active"><Zap size={20} className={isAnalyzing ? "animate-pulse" : ""} /><span className="font-bold text-sm">{isAnalyzing ? 'Analisando...' : 'Gerar Insights IA'}</span></button>
      </div>

      {analysisResult && (
        <div className="bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl border border-hf-lemon/30 p-8 rounded-3xl shadow-soft flex items-start gap-6 animate-enter"><div className="p-4 bg-hf-lemon/10 rounded-2xl text-hf-lemon"><Zap size={28} /></div><div><h4 className="font-bold text-gray-900 dark:text-white mb-2 text-lg">Análise Rápida</h4><p className="font-medium text-gray-600 dark:text-gray-300 leading-relaxed text-base">{analysisResult}</p></div></div>
      )}

      <div className="w-full"><ResultsSummary leads={leads} isDarkMode={isDarkMode} subtitle={getDateLabel()} /></div>

      {/* Analytics Deep Dive - Hidden for Sales Role */}
      {userRole !== 'SALES' && (
          <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">Analytics <span className="text-gray-400 dark:text-gray-600 font-medium text-lg">Deep Dive</span></h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <EfficiencyChart data={efficiencyData} isDarkMode={isDarkMode} />
                <RevenueDonutChart data={revenueBySource} isDarkMode={isDarkMode} />
                <SimpleBarChart data={wonByContent} color={BRAND.YELLOW} title="Top Criativos" isDarkMode={isDarkMode} />
              </div>
          </div>
      )}

      <div>
         <div className="flex justify-between items-end mb-8 mt-16"><h3 className="text-2xl font-bold text-gray-900 dark:text-white">Pipeline Ativo</h3></div>
         <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 h-[850px]">
            <KanbanColumn title="Aguardando" icon={Clock} leads={validPending} templates={templates} salespeople={salespeople} onUpdateLead={onUpdateLead} onLeadClick={setDetailLead} dateField="dataSubmissao" accentColor="bg-gray-800" sortOrder={columnSorts['waiting']} onToggleSort={() => toggleColumnSort('waiting')} />
            <KanbanColumn title="Auditoria" icon={AlertCircle} leads={invalidPending} templates={templates} salespeople={salespeople} onUpdateLead={onUpdateLead} onLeadClick={setDetailLead} dateField="dataSubmissao" accentColor="bg-red-500" sortOrder={columnSorts['audit']} onToggleSort={() => toggleColumnSort('audit')} />
            <KanbanColumn title="Em Contato" icon={CheckCircle} leads={contactedLeads} templates={templates} salespeople={salespeople} onUpdateLead={onUpdateLead} onLeadClick={setDetailLead} dateField="messageSentAt" accentColor="bg-hf-lemon" sortOrder={columnSorts['contact']} onToggleSort={() => toggleColumnSort('contact')} />
            <KanbanColumn title="Ganhos" icon={Trophy} leads={wonLeads} templates={templates} salespeople={salespeople} onUpdateLead={onUpdateLead} onLeadClick={setDetailLead} dateField="wonDate" accentColor="bg-hf-green" sortOrder={columnSorts['won']} onToggleSort={() => toggleColumnSort('won')} />
            <KanbanColumn title="Perdidos" icon={ThumbsDown} leads={lostLeads} templates={templates} salespeople={salespeople} onUpdateLead={onUpdateLead} onLeadClick={setDetailLead} dateField="lostDate" accentColor="bg-gray-400" sortOrder={columnSorts['lost']} onToggleSort={() => toggleColumnSort('lost')} />
         </div>
      </div>

      {detailLead && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-white/60 dark:bg-black/80 backdrop-blur-xl animate-enter">
              <div className="glass rounded-[32px] shadow-floating max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-enter ring-1 ring-black/5 dark:ring-white/10 relative">
                  <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-white/50 dark:bg-[#1C1C1E]/50 backdrop-blur sticky top-0 z-10">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">Detalhes do Lead</h3>
                      <button onClick={() => setDetailLead(null)} className="p-2 bg-gray-100 dark:bg-white/10 rounded-full hover:bg-gray-200 dark:hover:bg-white/20 transition text-gray-600 dark:text-gray-300"><XCircle size={20} /></button>
                  </div>
                  <div className="p-8 overflow-y-auto custom-scrollbar bg-white/40 dark:bg-black/40">
                      <LeadCard lead={detailLead} templates={templates} salespeople={salespeople} onUpdateLead={(updated) => { onUpdateLead(updated); setDetailLead(updated); }} variant="modal" />
                  </div>
              </div>
          </div>,
          document.body
      )}
    </div>
  );
};