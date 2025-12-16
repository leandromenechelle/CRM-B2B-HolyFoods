import React, { useEffect } from 'react';
import { Lead } from '../types';
import { RefreshCw, Lightbulb, TrendingUp, Target, AlertTriangle } from 'lucide-react';

interface StrategyViewProps {
  leads: Lead[];
  strategicInsights: string | null;
  isGeneratingInsights: boolean;
  onRefreshInsights: () => void;
  insightLastUpdated: string | null;
}

export const StrategyView: React.FC<StrategyViewProps> = ({
  leads,
  strategicInsights,
  isGeneratingInsights,
  onRefreshInsights,
  insightLastUpdated
}) => {
  
  // Auto-generate if empty on mount
  useEffect(() => {
      if (!strategicInsights && !isGeneratingInsights) {
          onRefreshInsights();
      }
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-24 animate-enter">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-gray-200 dark:border-white/10 pb-8">
            <div>
                <h2 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-hf-lemon to-hf-green text-white rounded-2xl shadow-lg shadow-hf-lemon/20">
                        <Lightbulb size={32} />
                    </div>
                    Inteligência Estratégica
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-4 text-lg font-medium max-w-2xl leading-relaxed">
                    Auditoria automática de funil realizada pelo Gemini 3 Pro.
                </p>
            </div>
            
            <button 
                onClick={onRefreshInsights} 
                disabled={isGeneratingInsights}
                className="group flex items-center gap-4 px-6 py-4 bg-white dark:bg-[#1C1C1E] text-gray-900 dark:text-white rounded-2xl shadow-soft hover:shadow-medium border border-gray-100 dark:border-white/5 transition-all tap-active disabled:opacity-50"
            >
                <div className={`p-2 rounded-full bg-gray-100 dark:bg-white/10 group-hover:rotate-180 transition-transform duration-700 ${isGeneratingInsights ? 'animate-spin' : ''}`}>
                    <RefreshCw size={20} className="text-gray-600 dark:text-white" />
                </div>
                <div className="text-left">
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">Última atualização</p>
                    <p className="text-sm font-bold tabular-nums">{insightLastUpdated ? new Date(insightLastUpdated).toLocaleTimeString() : 'Pendente'}</p>
                </div>
            </button>
        </div>

        {/* Main Content Area */}
        <div className="min-h-[600px] relative">
            {isGeneratingInsights ? (
                <div className="flex flex-col items-center justify-center h-[500px] space-y-8">
                    <div className="relative">
                        <div className="w-20 h-20 border-[6px] border-hf-lemon/20 border-t-hf-lemon rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Lightbulb size={28} className="text-hf-lemon animate-pulse" />
                        </div>
                    </div>
                    <div className="text-center space-y-2">
                        <p className="text-xl font-bold text-gray-900 dark:text-white animate-pulse">Processando Dados...</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Analisando UTMs, conversões e padrões de perda.</p>
                    </div>
                </div>
            ) : strategicInsights ? (
                <div 
                    className="prose prose-lg max-w-none dark:prose-invert prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-600 dark:prose-p:text-gray-300 prose-p:leading-relaxed prose-strong:text-gray-900 dark:prose-strong:text-white prose-li:text-gray-600 dark:prose-li:text-gray-300"
                    dangerouslySetInnerHTML={{ __html: strategicInsights }} 
                />
            ) : (
                <div className="flex flex-col items-center justify-center h-[400px] text-gray-400 dark:text-gray-600 bg-gray-50 dark:bg-[#1C1C1E] rounded-[32px] border border-gray-100 dark:border-white/5">
                    <AlertTriangle size={64} className="mb-6 opacity-20" />
                    <p className="text-lg font-medium">Nenhuma análise disponível.</p>
                    <button onClick={onRefreshInsights} className="mt-4 text-hf-lemon font-bold hover:underline">Gerar agora</button>
                </div>
            )}
        </div>
    </div>
  );
};