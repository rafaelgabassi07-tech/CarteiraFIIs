import React, { useState, useEffect } from 'react';
import { ExternalLink, Clock, TrendingUp, Newspaper, Building2, Globe } from 'lucide-react';
import { NewsItem } from '../types';

// Mock Data para simulação (pode ser substituído por API real no futuro)
const MOCK_NEWS: NewsItem[] = [
    {
        id: '1',
        title: 'IFIX fecha em alta e renova máxima histórica impulsionado por fundos de papel',
        summary: 'Índice de Fundos Imobiliários segue trajetória positiva com queda dos juros futuros e otimismo no setor de recebíveis.',
        source: 'Investidor10',
        url: 'https://investidor10.com.br',
        date: 'Há 2 horas',
        category: 'FIIs'
    },
    {
        id: '2',
        title: 'Petrobras anuncia pagamento de dividendos extraordinários',
        summary: 'Conselho de administração aprovou distribuição complementar referente ao exercício de 2024.',
        source: 'InfoMoney',
        url: '#',
        date: 'Há 4 horas',
        category: 'Ações'
    },
    {
        id: '3',
        title: 'Copom reduz taxa Selic em 0,50 p.p. conforme esperado pelo mercado',
        summary: 'Comitê sinaliza manutenção do ritmo de cortes para as próximas reuniões, visando controle inflacionário.',
        source: 'Valor Econômico',
        url: '#',
        date: 'Ontem',
        category: 'Macro'
    },
    {
        id: '4',
        title: 'MXRF11 anuncia nova emissão de cotas para expansão de portfólio',
        summary: 'Fundo mais popular da bolsa busca captar R$ 500 milhões para novas alocações em CRIs.',
        source: 'Suno Notícias',
        url: '#',
        date: 'Ontem',
        category: 'FIIs'
    },
    {
        id: '5',
        title: 'Bancos reportam lucro recorde no 3º trimestre com queda na inadimplência',
        summary: 'Setor bancário mostra resiliência e melhora na qualidade de crédito impulsiona resultados.',
        source: 'Bloomberg Línea',
        url: '#',
        date: 'Há 2 dias',
        category: 'Ações'
    }
];

const SkeletonNews = () => (
    <div className="space-y-4">
        {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 animate-pulse">
                <div className="flex justify-between items-center mb-3">
                    <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                    <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                </div>
                <div className="h-5 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded mb-2"></div>
                <div className="h-5 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded mb-3"></div>
                <div className="h-10 w-full bg-zinc-100 dark:bg-zinc-800/50 rounded-xl"></div>
            </div>
        ))}
    </div>
);

const getCategoryStyle = (category: string) => {
    switch (category) {
        case 'FIIs': return 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30';
        case 'Ações': return 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-900/30';
        case 'Macro': return 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30';
        default: return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700';
    }
};

const getCategoryIcon = (category: string) => {
    switch (category) {
        case 'FIIs': return Building2;
        case 'Ações': return TrendingUp;
        case 'Macro': return Globe;
        default: return Newspaper;
    }
};

export const News: React.FC = () => {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simula carregamento de API
        const timer = setTimeout(() => {
            setNews(MOCK_NEWS);
            setLoading(false);
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="pb-32 min-h-screen">
            {/* Header Falso (Já que o App.tsx controla o header principal, este é para espaçamento/título se necessário, mas o design pede consistência) */}
            <div className="px-4 pt-4 pb-2">
                <div className="flex items-center gap-2 mb-4 px-1 opacity-60">
                    <Newspaper className="w-4 h-4 text-zinc-500" />
                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Últimas do Mercado</span>
                </div>

                {loading ? (
                    <SkeletonNews />
                ) : (
                    <div className="space-y-4">
                        {news.map((item, index) => {
                            const CategoryIcon = getCategoryIcon(item.category);
                            return (
                                <a 
                                    key={item.id}
                                    href={item.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-all press-effect group anim-slide-up"
                                    style={{ animationDelay: `${index * 100}ms` }}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${getCategoryStyle(item.category)}`}>
                                            <CategoryIcon className="w-3 h-3" />
                                            {item.category}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400">
                                            <Clock className="w-3 h-3" />
                                            {item.date}
                                        </div>
                                    </div>
                                    
                                    <h3 className="text-sm font-black text-zinc-900 dark:text-white mb-2 leading-snug group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                                        {item.title}
                                    </h3>
                                    
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium mb-4 line-clamp-2">
                                        {item.summary}
                                    </p>

                                    <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{item.source}</span>
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-sky-600 dark:text-sky-400 group-hover:underline">
                                            Ler notícia <ExternalLink className="w-3 h-3" />
                                        </div>
                                    </div>
                                </a>
                            );
                        })}
                        
                        <div className="pt-4 text-center">
                            <p className="text-[10px] text-zinc-400 font-medium">
                                Fim das notícias recentes
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};