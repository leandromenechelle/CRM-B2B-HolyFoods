import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, ComposedChart, Line
} from 'recharts';
import { Lead, MessageTemplate, MessageHistoryItem, Attachment, Salesperson } from '../types';
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
}

// Brand Palette Constants
const BRAND = {
    LEMON: '#7BCA0C',
    DARK_GREEN: '#005234',
    ORANGE: '#F45218',
    YELLOW: '#FFC51D',
    CREAM: '#FFFAE0',
    BLACK: '#1A1A1A'
};

// Ajustado para 40 chars para equilibrar com a nova largura do eixo Y (200px)
const truncateLabel = (value: string, maxLength: number = 40) => {
    if (value.length <= maxLength) return value;
    return `${value.substring(0, maxLength)}...`;
};

const ResultsSummary = ({ leads, isDarkMode }: { leads: Lead[], isDarkMode: boolean }) => {
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
            // Calcula o total do mês atual somando as barras empilhadas
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

    const tickColor = isDarkMode ? '#9CA3AF' : '#6B7280';

    return (
        <div className="glass rounded-[32px] p-8 shadow-soft hover:shadow-medium transition-all duration-500 h-[460px] flex flex-col relative group">
            <div className="flex items-center gap-3 mb-10 relative z-10">
                 <div className="w-10 h-10 bg-gray-50 dark:bg-white/10 rounded-2xl flex items-center justify-center text-hf-lemon"><BarChart2 size={20} /></div>
                 <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">Performance Geral</h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Últimos 6 meses</p>
                 </div>
            </div>

            <div className="flex items-center gap-12 mb-10 relative z-10 px-2">
                <div>
                    <div className="flex items-end gap-2">
                        <p className="text-5xl font-bold text-gray-900 dark:text-white tracking-tighter leading-none">{stats.total.toLocaleString()}</p>
                        <span className="text-sm font-bold text-gray-400 dark:text-gray-500 mb-1">(100%)</span>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                        <span className="w-2 h-2 rounded-full bg-gray-900 dark:bg-white"></span>
                        <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Total de Leads</span>
                    </div>
                </div>
                <div className="h-12 w-px bg-gray-100 dark:bg-white/10"></div>
                <div>
                     <div className="flex items-end gap-2">
                        <p className="text-5xl font-bold text-hf-lemon tracking-tighter leading-none">{stats.won.toLocaleString()}</p>
                        <span className="text-sm font-bold text-hf-lemon/70 mb-1">({stats.wonPct}%)</span>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                        <span className="w-2 h-2 rounded-full bg-hf-lemon"></span>
                        <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Convertidos</span>
                    </div>
                </div>
                <div className="h-12 w-px bg-gray-100 dark:bg-white/10"></div>
                 <div>
                    <div className="flex items-end gap-2">
                        <p className="text-5xl font-bold text-gray-300 dark:text-gray-600 tracking-tighter leading-none" style={{ color: BRAND.ORANGE }}>{stats.lost.toLocaleString()}</p>
                        <span className="text-sm font-bold text-gray-400 dark:text-gray-600 mb-1">({stats.lostPct}%)</span>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: BRAND.ORANGE }}></span>
                        <span className="text-sm font-semibold text-gray-400 dark:text-gray-500">Perdidos</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 w-full text-xs relative z-10 overflow-hidden rounded-b-[24px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }} barSize={100}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#333" : "#F3F4F6"} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: tickColor, fontSize: 12, fontWeight: 600 }} dy={10} />
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

// --- Gráfico de Eficiência (100% Stacked) - Custom HTML Implementation ---
const EfficiencyChart = ({ data, isDarkMode }: { data: any[], isDarkMode: boolean }) => {
    return (
        <div className="glass rounded-[32px] p-8 shadow-soft h-[400px] flex flex-col hover:shadow-medium transition-all duration-300">
            {/* Header Title */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Eficiência por Canal</h3>
                    <p className="text-[10px] text-gray-400 mt-1">Ganhos (Verde) vs Perdas (Laranja)</p>
                </div>
            </div>

            {/* List - Wrapped in inner container to prevent shadow clipping */}
            <div className="flex-1 w-full overflow-y-auto custom-scrollbar pr-2 space-y-6">
                {data.map((item, index) => {
                    const total = item.won + item.lost;
                    const winPct = total > 0 ? (item.won / total) * 100 : 0;
                    const lostPct = total > 0 ? (item.lost / total) * 100 : 0;

                    return (
                        <div key={index} className="group">
                            {/* Top Row: Name and Counts */}
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate max-w-[60%]" title={item.name}>
                                    {item.name}
                                </span>
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="font-bold" style={{ color: BRAND.LEMON }}>{item.won} <span className="text-[10px] font-normal text-gray-400">ganhos</span></span>
                                    <span className="text-gray-300 dark:text-gray-600">|</span>
                                    <span className="font-bold" style={{ color: BRAND.ORANGE }}>{item.lost} <span className="text-[10px] font-normal text-gray-400">perdas</span></span>
                                </div>
                            </div>

                            {/* Bar: Stacked Progress Bar */}
                            <div className="w-full h-2 bg-gray-100 dark:bg-white/5 rounded-full flex overflow-hidden">
                                <div style={{ width: `${winPct}%`, backgroundColor: BRAND.LEMON }} className="h-full transition-all duration-1000 relative group-hover:brightness-110"></div>
                                <div style={{ width: `${lostPct}%`, backgroundColor: BRAND.ORANGE }} className="h-full transition-all duration-1000 relative group-hover:brightness-110"></div>
                            </div>

                            {/* Bottom Row: Percentages */}
                            <div className="flex justify-between mt-1.5 text-[10px] font-bold">
                                <span style={{ color: BRAND.LEMON }}>{winPct.toFixed(1)}% conv.</span>
                                <span style={{ color: BRAND.ORANGE }}>{lostPct.toFixed(1)}% perda</span>
                            </div>
                        </div>
                    )
                })}
                {data.length === 0 && (
                     <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600 opacity-50">
                        <TrendingUp size={32} className="mb-2"/>
                        <p className="text-xs font-medium">Sem dados suficientes</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Custom Bar Chart List for Top Creatives ---
const SimpleBarChart = ({ data, color, title, unit = '', isDarkMode }: { data: any[], color: string, title: string, unit?: string, isDarkMode: boolean }) => {
    // Calcula o total para as porcentagens
    const totalValue = data.reduce((acc, curr) => acc + (curr.value || 0), 0);

    return (
        <div className="glass rounded-[32px] p-8 shadow-soft h-[400px] flex flex-col hover:shadow-medium transition-all duration-300">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-6 uppercase tracking-wider sticky top-0 bg-transparent z-10">{title}</h3>
            
            <div className="flex-1 w-full overflow-y-auto custom-scrollbar pr-2 space-y-5">
                {data.map((item, index) => {
                    const percentage = totalValue > 0 ? ((item.value / totalValue) * 100) : 0;
                    
                    return (
                        <div key={index} className="group">
                             {/* Top Row: Name (Left) and Count (Right) */}
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate max-w-[70%]" title={item.name}>
                                    {item.name === 'none' ? 'Desconhecido' : item.name}
                                </span>
                                <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                                    {item.value} <span className="text-[10px] text-gray-400 font-normal ml-0.5">leads</span>
                                </span>
                            </div>

                            {/* Middle: The Bar */}
                            <div className="w-full h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                                <div 
                                    className="h-full rounded-full transition-all duration-1000 ease-out relative group-hover:brightness-110" 
                                    style={{ width: `${percentage}%`, backgroundColor: color }}
                                ></div>
                            </div>

                            {/* Bottom Row: Percentage (Right) */}
                            <div className="flex justify-end mt-1.5">
                                <span className="text-[10px] font-bold" style={{ color: color }}>
                                    {percentage.toFixed(1)}% do total
                                </span>
                            </div>
                        </div>
                    );
                })}
                {data.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600 opacity-50">
                        <BarChart2 size={32} className="mb-2"/>
                        <p className="text-xs font-medium">Sem dados</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Generic Count Pie Chart (For Categories & Loss Reasons) ---
const CountPieChart = ({ data, title, colors, isDarkMode }: { data: any[], title: string, colors: string[], isDarkMode: boolean }) => {
    const totalCount = data.reduce((acc, curr) => acc + (curr.value || 0), 0);

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const item = payload[0].payload;
            const percent = totalCount > 0 ? ((item.value / totalCount) * 100).toFixed(1) : 0;

            return (
                <div className="bg-white/95 dark:bg-[#2C2C2E]/95 backdrop-blur-xl p-4 rounded-2xl shadow-floating border border-white/20 dark:border-white/10 text-xs min-w-[200px] z-50">
                    <p className="font-bold text-gray-900 dark:text-white mb-2 text-sm border-b border-gray-100 dark:border-white/10 pb-2 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }}></span>
                        {item.name}
                    </p>
                    <div>
                         <div className="flex justify-between text-gray-500 dark:text-gray-400 mb-1">
                            <span>Quantidade</span>
                            <span className="font-bold text-gray-900 dark:text-white">{item.value}</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                            <div className="h-full" style={{ width: `${percent}%`, backgroundColor: item.fill }}></div>
                        </div>
                        <p className="text-[10px] text-right mt-1 font-bold" style={{ color: item.fill }}>{percent}% do total</p>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="glass rounded-[32px] p-8 shadow-soft h-[400px] flex flex-col hover:shadow-medium transition-all duration-300 relative">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-wider">{title}</h3>
            
            <div className="flex-1 w-full relative flex items-center justify-center">
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-3xl font-bold text-gray-900 dark:text-white tracking-tighter">{totalCount}</p>
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wide">Total</p>
                </div>

                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            innerRadius={85}
                            outerRadius={110}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                            cornerRadius={8}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap justify-center gap-3 mt-4">
                {data.slice(0, 4).map((entry, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[index % colors.length] }}></div>
                        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 truncate max-w-[80px]">{truncateLabel(entry.name, 15)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Novo Gráfico de Financeiro por Categoria ---
const CategoryFinancialChart = ({ data, isDarkMode }: { data: any[], isDarkMode: boolean }) => {
    return (
        <div className="glass rounded-[32px] p-8 shadow-soft h-[400px] flex flex-col hover:shadow-medium transition-all duration-300">
            {/* Header Title */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Resultado por Categoria</h3>
                    <p className="text-[10px] text-gray-400 mt-1">Ganhos, Perdas e Receita</p>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 w-full overflow-y-auto custom-scrollbar pr-2 space-y-6">
                {data.map((item, index) => {
                    const total = item.won + item.lost;
                    const winPct = total > 0 ? (item.won / total) * 100 : 0;
                    
                    return (
                        <div key={index} className="group">
                            {/* Top Row: Name and Revenue Badge */}
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate max-w-[50%]" title={item.name}>
                                    {item.name}
                                </span>
                                <div className="flex items-center gap-2">
                                     <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">{item.revenueShare.toFixed(1)}% Fat.</span>
                                     <span className="text-xs font-bold text-hf-green dark:text-hf-lemon bg-hf-green/10 dark:bg-hf-lemon/10 px-2 py-0.5 rounded-lg border border-hf-green/10 dark:border-hf-lemon/10">
                                        R$ {item.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                     </span>
                                </div>
                            </div>

                            {/* Bar: Win/Loss Ratio */}
                            <div className="w-full h-1.5 bg-gray-100 dark:bg-white/5 rounded-full flex overflow-hidden mb-1.5">
                                <div style={{ width: `${winPct}%`, backgroundColor: BRAND.LEMON }} className="h-full transition-all duration-1000 relative group-hover:brightness-110"></div>
                                <div style={{ width: `${100 - winPct}%`, backgroundColor: BRAND.ORANGE }} className="h-full transition-all duration-1000 relative group-hover:brightness-110"></div>
                            </div>
                            
                            {/* Bottom Labels */}
                            <div className="flex justify-between text-[9px] font-bold text-gray-400">
                                <span>{item.won} Ganhos</span>
                                <span>{item.lost} Perdas</span>
                            </div>
                        </div>
                    )
                })}
                {data.length === 0 && (
                     <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600 opacity-50">
                        <TrendingUp size={32} className="mb-2"/>
                        <p className="text-xs font-medium">Sem dados suficientes</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Novo Gráfico de Receita (Rosca) ---
const RevenueDonutChart = ({ data, isDarkMode }: { data: any[], isDarkMode: boolean }) => {
    // Calcular totais
    const totalRevenue = data.reduce((acc, curr) => acc + (curr.value || 0), 0);
    const totalOrders = data.reduce((acc, curr) => acc + (curr.count || 0), 0);

    // Cores para o gráfico (padrão da marca)
    const COLORS = [BRAND.LEMON, BRAND.DARK_GREEN, BRAND.YELLOW, BRAND.ORANGE, '#4D8B08', '#003320'];

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const item = payload[0].payload;
            const revPercent = totalRevenue > 0 ? ((item.value / totalRevenue) * 100).toFixed(1) : 0;
            const orderPercent = totalOrders > 0 ? ((item.count / totalOrders) * 100).toFixed(1) : 0;

            return (
                <div className="bg-white/95 dark:bg-[#2C2C2E]/95 backdrop-blur-xl p-4 rounded-2xl shadow-floating border border-white/20 dark:border-white/10 text-xs min-w-[200px] z-50">
                    <p className="font-bold text-gray-900 dark:text-white mb-2 text-sm border-b border-gray-100 dark:border-white/10 pb-2 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }}></span>
                        {item.name}
                    </p>
                    
                    <div className="space-y-3">
                        <div>
                            <div className="flex justify-between text-gray-500 dark:text-gray-400 mb-1">
                                <span>Receita</span>
                                <span className="font-bold text-gray-900 dark:text-white">R$ {item.value.toLocaleString()}</span>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                                <div className="h-full" style={{ width: `${revPercent}%`, backgroundColor: BRAND.YELLOW }}></div>
                            </div>
                            <p className="text-[10px] text-right mt-1 font-bold" style={{ color: BRAND.YELLOW }}>{revPercent}% do total</p>
                        </div>

                        <div>
                             <div className="flex justify-between text-gray-500 dark:text-gray-400 mb-1">
                                <span>Pedidos</span>
                                <span className="font-bold text-gray-900 dark:text-white">{item.count} vendas</span>
                            </div>
                             <div className="w-full bg-gray-100 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                                <div className="h-full" style={{ width: `${orderPercent}%`, backgroundColor: BRAND.DARK_GREEN }}></div>
                            </div>
                            <p className="text-[10px] text-right mt-1 font-bold" style={{ color: BRAND.DARK_GREEN }}>{orderPercent}% do total</p>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="glass rounded-[32px] p-8 shadow-soft h-[400px] flex flex-col hover:shadow-medium transition-all duration-300 relative">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-wider">Receita por Canal</h3>
            
            <div className="flex-1 w-full relative flex items-center justify-center">
                {/* Center Text Overlay - Moved before chart so it renders behind the tooltip */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-3xl font-bold text-gray-900 dark:text-white tracking-tighter">
                        {totalRevenue >= 1000000 
                            ? `${(totalRevenue / 1000000).toFixed(1)}M` 
                            : totalRevenue >= 1000 
                                ? `${(totalRevenue / 1000).toFixed(0)}k` 
                                : totalRevenue}
                    </p>
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wide">
                        {totalOrders} Pedidos
                    </p>
                </div>

                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            innerRadius={85}
                            outerRadius={110}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                            cornerRadius={8}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Legend simplified */}
            <div className="flex flex-wrap justify-center gap-3 mt-4">
                {data.slice(0, 4).map((entry, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 truncate max-w-[80px]">{truncateLabel(entry.name, 12)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Kanban Column Component
interface KanbanColumnProps {
    title: string;
    icon: any;
    leads: Lead[];
    templates: MessageTemplate[];
    salespeople: Salesperson[];
    onUpdateLead: (updatedLead: Lead) => void;
    onLeadClick: (lead: Lead) => void;
    dateField: keyof Lead;
    sortLabel: string;
    accentColor: string;
    sortOrder: 'asc' | 'desc' | null;
    onToggleSort: () => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ 
  title, icon: Icon, leads, templates, salespeople, onUpdateLead, onLeadClick, dateField, sortLabel, accentColor, sortOrder, onToggleSort
}) => {
  
  const sortedLeads = useMemo(() => {
    // If sortOrder is null, use the default logic (usually Descending/Newest first unless specified otherwise)
    const effectiveSort = sortOrder || 'desc';

    return [...leads].sort((a, b) => {
      let dateA = new Date((a[dateField] as string) || a.dataSubmissao).getTime();
      let dateB = new Date((b[dateField] as string) || b.dataSubmissao).getTime();
      
      // Fallback for missing dates to 0 so they go to the bottom/top correctly
      if (isNaN(dateA)) dateA = 0;
      if (isNaN(dateB)) dateB = 0;

      return effectiveSort === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [leads, sortOrder, dateField]);

  // Calculate Total Revenue for "Ganhos" column
  const totalRevenue = useMemo(() => {
    if (title === 'Ganhos') {
        return leads.reduce((acc, lead) => acc + (lead.wonValue || 0), 0);
    }
    return 0;
  }, [leads, title]);

  return (
    <div className="flex flex-col h-full">
       <div className="flex items-center justify-between mb-4 px-1 sticky top-0 bg-[#F2F2F7] dark:bg-[#0F0F0F] z-10 py-2 transition-colors border-b border-gray-200 dark:border-white/5">
          <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${accentColor} bg-opacity-10 dark:bg-opacity-20`}>
                  <Icon size={18} className={accentColor.replace('bg-', 'text-')} />
              </div>
              <div>
                  <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm tracking-tight">{title}</h3>
                  <div className="flex items-baseline gap-2">
                     <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">{leads.length} leads</span>
                     {title === 'Ganhos' && totalRevenue > 0 && (
                         <span className="text-xs font-bold text-hf-lemon dark:text-[#7BCA0C]">
                             R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                         </span>
                     )}
                  </div>
              </div>
          </div>
          <button onClick={onToggleSort} className={`p-2 rounded-lg hover:bg-white dark:hover:bg-white/10 transition ${sortOrder ? 'text-gray-900 dark:text-white bg-white dark:bg-white/10 shadow-sm' : 'text-gray-400'}`}>
              {sortOrder === 'asc' ? <ArrowUp size={14} /> : sortOrder === 'desc' ? <ArrowDown size={14} /> : <ListFilter size={14} />}
          </button>
       </div>
       
       <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar pb-24">
          {sortedLeads.map((lead: Lead) => (
              <LeadCard key={lead.id} lead={lead} templates={templates} salespeople={salespeople} onUpdateLead={onUpdateLead} variant="card" onClick={() => onLeadClick(lead)} />
          ))}
          {sortedLeads.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center opacity-30">
               <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-800 mb-3"></div>
               <div className="w-20 h-2 rounded-full bg-gray-200 dark:bg-gray-800"></div>
            </div>
          )}
       </div>
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ 
    leads, duplicateCount, onQuickAnalysis, analysisResult, isAnalyzing, 
    templates, salespeople, onUpdateLead,
    strategicInsights, isGeneratingInsights, onRefreshInsights, insightLastUpdated,
    isDarkMode
}) => {

  const [detailLead, setDetailLead] = useState<Lead | null>(null);

  // Sorting State
  const [columnSorts, setColumnSorts] = useState<Record<string, 'asc' | 'desc' | null>>({});

  const handleGlobalSort = (direction: 'asc' | 'desc' | null) => {
      setColumnSorts({
          'waiting': direction,
          'audit': direction,
          'contact': direction,
          'won': direction,
          'lost': direction
      });
  };

  const toggleColumnSort = (key: string) => {
      setColumnSorts(prev => {
          const current = prev[key];
          let next: 'asc' | 'desc' | null = 'desc';
          if (current === 'desc') next = 'asc';
          if (current === 'asc') next = null; // Reset to default
          return { ...prev, [key]: next };
      });
  };

  // Deduplication Logic for Pipeline/Kanban
  const processedLeads = useMemo(() => {
      const groups: Record<string, Lead[]> = {};
      const emailMap = new Map<string, string>(); // Email -> GroupKey
      const cnpjMap = new Map<string, string>();  // CNPJ -> GroupKey

      leads.forEach(lead => {
          const rawCnpj = lead.cnpj ? lead.cnpj.trim() : '';
          const cleanCnpj = rawCnpj.replace(/\D/g, '');
          const hasValidCnpj = cleanCnpj.length >= 11; // CPF/CNPJ
          
          const email = lead.email ? lead.email.trim().toLowerCase() : '';
          
          // Determine Group Key logic to enable merging by either CNPJ or Email
          let groupKey = '';

          // 1. Try to find existing group by valid CNPJ
          if (hasValidCnpj && cnpjMap.has(cleanCnpj)) {
              groupKey = cnpjMap.get(cleanCnpj)!;
          } 
          // 2. Try to find existing group by Email
          else if (email && emailMap.has(email)) {
              groupKey = emailMap.get(email)!;
          }
          // 3. Create New Group Key
          else {
              groupKey = hasValidCnpj ? `cnpj-${cleanCnpj}` : (email ? `email-${email}` : `id-${lead.id}`);
          }

          // Update Maps to link this lead's attributes to the found/new groupKey
          // This allows subsequent leads to find the same group via either attribute
          if (hasValidCnpj) cnpjMap.set(cleanCnpj, groupKey);
          if (email) emailMap.set(email, groupKey);

          if (!groups[groupKey]) groups[groupKey] = [];
          groups[groupKey].push(lead);
      });

      // Select Best Lead per Group
      return Object.values(groups).map(group => {
          if (group.length === 1) return group[0];

          return group.sort((a, b) => {
              // Priority 1: Status CNPJ (VALID wins)
              const aValid = a.statusCnpj === 'VALID';
              const bValid = b.statusCnpj === 'VALID';
              if (aValid && !bValid) return -1;
              if (!aValid && bValid) return 1;

              // Priority 2: Data Completeness
              const countData = (l: Lead) => {
                  let score = 0;
                  if (l.email) score++;
                  if (l.telefone) score++;
                  if (l.nomeContato) score++;
                  if (l.razaoSocial) score++;
                  if (l.cidade) score++;
                  if (l.uf) score++;
                  return score;
              };
              const scoreA = countData(a);
              const scoreB = countData(b);
              if (scoreA !== scoreB) return scoreB - scoreA;

              // Priority 3: Recency
              const timeA = new Date(a.dataSubmissao).getTime();
              const timeB = new Date(b.dataSubmissao).getTime();
              return timeB - timeA;
          })[0];
      });
  }, [leads]);

  // Kanban Data - Using processedLeads (Unique) instead of raw leads
  const validPending = processedLeads.filter(l => l.statusCnpj === 'VALID' && !l.messageSentAt && l.dealStatus === 'PENDING').slice(0, 50);
  const invalidPending = processedLeads.filter(l => l.statusCnpj === 'INVALID' && !l.messageSentAt && l.dealStatus === 'PENDING').slice(0, 50);
  const contactedLeads = processedLeads.filter(l => l.messageSentAt && l.dealStatus === 'PENDING').slice(0, 50);
  const wonLeads = processedLeads.filter(l => l.dealStatus === 'WON').slice(0, 50);
  const lostLeads = processedLeads.filter(l => l.dealStatus === 'LOST').slice(0, 50);

  // Chart Data Helpers
  const aggregateData = (filterFn: (l: Lead) => boolean, key: keyof Lead) => {
      const map: Record<string, number> = {};
      leads.filter(filterFn).forEach(l => {
          let val = String(l[key] || 'N/A');
          if (val === 'none' || val === '') val = 'N/A';
          val = val.replace(/_/g, ' ').replace(/-/g, ' '); // Clean
          map[val] = (map[val] || 0) + 1;
      });
      return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 5);
  };
  
  // New Generic Aggregator for Pie Charts
  const aggregateCount = (data: Lead[], key: keyof Lead, filterFn?: (l: Lead) => boolean) => {
      const map: Record<string, number> = {};
      const list = filterFn ? data.filter(filterFn) : data;
      list.forEach(l => {
          let val = String(l[key] || 'Não informado');
          if (val === '') val = 'Não informado';
          map[val] = (map[val] || 0) + 1;
      });
      return Object.entries(map)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 6); // Top 6 segments
  };

  const aggregateRevenue = (key: keyof Lead) => {
      const map: Record<string, { value: number, count: number }> = {};
      leads.filter(l => l.dealStatus === 'WON').forEach(l => {
          let val = String(l[key] || 'N/A');
          if (val === 'none' || val === '') val = 'N/A';
          val = val.replace(/_/g, ' ').replace(/-/g, ' '); // Clean
          
          if (!map[val]) map[val] = { value: 0, count: 0 };
          map[val].value += (l.wonValue || 0);
          map[val].count += 1;
      });
      return Object.entries(map).map(([name, data]) => ({ name, value: data.value, count: data.count })).sort((a,b) => b.value - a.value).slice(0, 5);
  };

  // Efficiency Data Preparation
  const efficiencyData = useMemo(() => {
      const map: Record<string, { won: number, lost: number }> = {};
      
      leads.forEach(l => {
          if (l.dealStatus === 'PENDING') return;
          
          let source = l.utmSource || 'direct';
          if (source === 'none' || source === '') source = 'direct';
          
          // Simplify names for cleaner display
          if (source.toLowerCase().includes('meta')) source = 'Meta Ads';
          if (source.toLowerCase().includes('google')) source = 'Google Ads';
          if (source.toLowerCase().includes('ig') || source.toLowerCase().includes('instagram')) source = 'Instagram';
          
          if (!map[source]) map[source] = { won: 0, lost: 0 };
          
          if (l.dealStatus === 'WON') map[source].won++;
          if (l.dealStatus === 'LOST') map[source].lost++;
      });

      return Object.entries(map)
        .map(([name, stats]) => ({
            name,
            won: stats.won, 
            lost: stats.lost,
            realWon: stats.won, 
            realLost: stats.lost,
            total: stats.won + stats.lost
        }))
        .filter(item => item.total > 2) 
        .sort((a, b) => b.total - a.total) 
        .slice(0, 6);
  }, [leads]);

  const revenueBySource = useMemo(() => aggregateRevenue('utmSource'), [leads]);
  const wonByContent = useMemo(() => aggregateData(l => l.dealStatus === 'WON', 'utmContent'), [leads]);
  
  // New Data Calculations
  const categoryData = useMemo(() => aggregateCount(leads, 'categoria'), [leads]);
  const lossReasonData = useMemo(() => aggregateCount(leads, 'lostReason', l => l.dealStatus === 'LOST'), [leads]);
  
  const categoryFinancialData = useMemo(() => {
        const map: Record<string, { won: number, lost: number, revenue: number }> = {};
        let globalRevenue = 0;

        leads.forEach(l => {
            let cat = l.categoria || 'Outros';
            if (cat === '') cat = 'Outros';
            
            if (!map[cat]) map[cat] = { won: 0, lost: 0, revenue: 0 };
            
            if (l.dealStatus === 'WON') {
                map[cat].won++;
                const val = l.wonValue || 0;
                map[cat].revenue += val;
                globalRevenue += val;
            } else if (l.dealStatus === 'LOST') {
                map[cat].lost++;
            }
        });

        return Object.entries(map).map(([name, stats]) => ({
            name,
            won: stats.won,
            lost: stats.lost,
            revenue: stats.revenue,
            revenueShare: globalRevenue > 0 ? (stats.revenue / globalRevenue) * 100 : 0
        })).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [leads]);

  // Brand Palette Arrays for Pie Charts
  const COLORS_CAT = [BRAND.LEMON, BRAND.DARK_GREEN, BRAND.YELLOW, BRAND.ORANGE, '#A4E040', '#007A4D'];
  const COLORS_LOSS = [BRAND.ORANGE, '#D63D0A', '#FF7A4D', '#FF9E7D', '#8C2805', '#1A1A1A'];

  return (
    <div className="space-y-12 max-w-[1600px] mx-auto">
      
      {/* Header & Quick Actions */}
      <div className="flex justify-between items-end">
        <div>
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight transition-colors">Visão Geral</h2>
            <p className="text-gray-500 dark:text-gray-400 font-medium mt-2 text-lg">Centro de comando de vendas.</p>
        </div>
        <button onClick={onQuickAnalysis} disabled={isAnalyzing} className="group relative flex items-center gap-3 px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-black rounded-2xl hover:bg-black dark:hover:bg-gray-200 transition-all shadow-medium hover:shadow-floating hover:-translate-y-1 disabled:opacity-50 tap-active">
            <span className="absolute inset-0 rounded-2xl bg-white/10 dark:bg-black/5 blur opacity-0 group-hover:opacity-100 transition"></span>
            <Zap size={20} className={isAnalyzing ? "animate-pulse" : ""} />
            <span className="font-bold text-sm">{isAnalyzing ? 'Analisando...' : 'Gerar Insights IA'}</span>
        </button>
      </div>

      {analysisResult && (
        <div className="bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl border border-hf-lemon/30 dark:border-hf-lemon/10 p-8 rounded-3xl shadow-soft flex items-start gap-6 animate-enter">
             <div className="p-4 bg-hf-lemon/10 rounded-2xl text-hf-lemon"><Zap size={28} /></div>
             <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-2 text-lg">Análise Rápida</h4>
                <p className="font-medium text-gray-600 dark:text-gray-300 leading-relaxed text-base">{analysisResult}</p>
             </div>
        </div>
      )}

      {/* Results Summary (Agora ocupa a largura toda no mobile/tablet, mas mantém a grade) */}
      <div className="w-full">
           <ResultsSummary leads={leads} isDarkMode={isDarkMode} />
      </div>

      {/* Analytics Deep Dive */}
      <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">Analytics <span className="text-gray-400 dark:text-gray-600 font-medium text-lg">Deep Dive</span></h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-1">
                <EfficiencyChart data={efficiencyData} isDarkMode={isDarkMode} />
            </div>
            <RevenueDonutChart data={revenueBySource} isDarkMode={isDarkMode} />
            <SimpleBarChart data={wonByContent} color={BRAND.YELLOW} title="Top Criativos" isDarkMode={isDarkMode} />
          </div>
          
          {/* New Row for Pie Charts & Financial Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <CountPieChart data={categoryData} title="Categorias de Clientes" colors={COLORS_CAT} isDarkMode={isDarkMode} />
              <CountPieChart data={lossReasonData} title="Motivos de Perda" colors={COLORS_LOSS} isDarkMode={isDarkMode} />
              <CategoryFinancialChart data={categoryFinancialData} isDarkMode={isDarkMode} />
          </div>
      </div>

      {/* Pipeline / Kanban */}
      <div>
         <div className="flex flex-col md:flex-row justify-between items-end mb-8 mt-16 gap-4">
             <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Pipeline Ativo</h3>
             
             {/* Global Sort Toolbar */}
             <div className="flex items-center bg-white dark:bg-[#1C1C1E] rounded-xl p-1 shadow-soft border border-gray-100 dark:border-white/5">
                 <button onClick={() => handleGlobalSort('asc')} className="px-4 py-2 rounded-lg text-xs font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/10 transition flex items-center gap-2">
                    <ArrowUp size={14} /> Mais Antigos
                 </button>
                 <div className="w-px h-4 bg-gray-200 dark:bg-white/10 mx-1"></div>
                 <button onClick={() => handleGlobalSort('desc')} className="px-4 py-2 rounded-lg text-xs font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/10 transition flex items-center gap-2">
                    <ArrowDown size={14} /> Mais Recentes
                 </button>
                 <div className="w-px h-4 bg-gray-200 dark:bg-white/10 mx-1"></div>
                 <button onClick={() => handleGlobalSort(null)} className="px-4 py-2 rounded-lg text-xs font-bold text-gray-400 hover:text-red-500 transition" title="Limpar Ordenação">
                    <XCircle size={14} />
                 </button>
             </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 h-[850px]">
            <KanbanColumn 
                title="Aguardando" 
                icon={Clock} 
                leads={validPending} 
                templates={templates} 
                salespeople={salespeople} 
                onUpdateLead={onUpdateLead} 
                onLeadClick={setDetailLead} 
                dateField="dataSubmissao" 
                sortLabel="ANTIGO" 
                accentColor="bg-gray-800"
                sortOrder={columnSorts['waiting'] || null}
                onToggleSort={() => toggleColumnSort('waiting')}
            />
            <KanbanColumn 
                title="Auditoria" 
                icon={AlertCircle} 
                leads={invalidPending} 
                templates={templates} 
                salespeople={salespeople} 
                onUpdateLead={onUpdateLead} 
                onLeadClick={setDetailLead} 
                dateField="dataSubmissao" 
                sortLabel="ANTIGO" 
                accentColor="bg-red-500"
                sortOrder={columnSorts['audit'] || null}
                onToggleSort={() => toggleColumnSort('audit')}
            />
            <KanbanColumn 
                title="Em Contato" 
                icon={CheckCircle} 
                leads={contactedLeads} 
                templates={templates} 
                salespeople={salespeople} 
                onUpdateLead={onUpdateLead} 
                onLeadClick={setDetailLead} 
                dateField="messageSentAt" 
                sortLabel="RECENTE" 
                accentColor="bg-hf-lemon"
                sortOrder={columnSorts['contact'] || null}
                onToggleSort={() => toggleColumnSort('contact')}
            />
            <KanbanColumn 
                title="Ganhos" 
                icon={Trophy} 
                leads={wonLeads} 
                templates={templates} 
                salespeople={salespeople} 
                onUpdateLead={onUpdateLead} 
                onLeadClick={setDetailLead} 
                dateField="wonDate" 
                sortLabel="RECENTE" 
                accentColor="bg-hf-green"
                sortOrder={columnSorts['won'] || null}
                onToggleSort={() => toggleColumnSort('won')}
            />
            <KanbanColumn 
                title="Perdidos" 
                icon={ThumbsDown} 
                leads={lostLeads} 
                templates={templates} 
                salespeople={salespeople} 
                onUpdateLead={onUpdateLead} 
                onLeadClick={setDetailLead} 
                dateField="lostDate" 
                sortLabel="RECENTE" 
                accentColor="bg-gray-400"
                sortOrder={columnSorts['lost'] || null}
                onToggleSort={() => toggleColumnSort('lost')}
            />
         </div>
      </div>

      {/* Lead Detail Modal - Rendered here for context, but CSS fixed in LeadCard content (if it was inline) or here */}
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