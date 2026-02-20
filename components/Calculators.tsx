import React, { useState, useEffect } from 'react';
import { Calculator, TrendingUp, DollarSign, Percent, ChevronDown, ChevronUp, RefreshCw, ArrowRight } from 'lucide-react';

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface CalculatorCardProps {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

const CalculatorCard: React.FC<CalculatorCardProps> = ({ title, icon: Icon, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border-t border-zinc-100 dark:border-zinc-800 first:border-t-0">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group text-left"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                        <Icon className="w-5 h-5" strokeWidth={2} />
                    </div>
                    <span className="text-sm font-bold text-zinc-900 dark:text-white">{title}</span>
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
            </button>
            
            {isOpen && (
                <div className="p-4 pt-0 bg-zinc-50/30 dark:bg-zinc-800/10 anim-slide-up">
                    {children}
                </div>
            )}
        </div>
    );
};

export const CompoundInterestCalculator = () => {
    const [initial, setInitial] = useState('');
    const [monthly, setMonthly] = useState('');
    const [rate, setRate] = useState('');
    const [years, setYears] = useState('');
    const [result, setResult] = useState<{ total: number, invested: number, interest: number } | null>(null);

    const calculate = () => {
        const p = parseFloat(initial.replace(',', '.')) || 0;
        const pm = parseFloat(monthly.replace(',', '.')) || 0;
        const r = (parseFloat(rate.replace(',', '.')) || 0) / 100;
        const t = (parseFloat(years.replace(',', '.')) || 0) * 12;

        if (t <= 0) return;

        const monthlyRate = Math.pow(1 + r, 1/12) - 1;
        
        let futureValue = p * Math.pow(1 + monthlyRate, t);
        for (let i = 0; i < t; i++) {
            futureValue += pm * Math.pow(1 + monthlyRate, t - 1 - i);
        }

        const totalInvested = p + (pm * t);
        setResult({
            total: futureValue,
            invested: totalInvested,
            interest: futureValue - totalInvested
        });
    };

    return (
        <CalculatorCard title="Juros Compostos" icon={TrendingUp}>
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase ml-1 mb-1 block">Inicial (R$)</label>
                    <input type="number" className="input-field" placeholder="0,00" value={initial} onChange={e => setInitial(e.target.value)} />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase ml-1 mb-1 block">Mensal (R$)</label>
                    <input type="number" className="input-field" placeholder="0,00" value={monthly} onChange={e => setMonthly(e.target.value)} />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase ml-1 mb-1 block">Taxa Anual (%)</label>
                    <input type="number" className="input-field" placeholder="10" value={rate} onChange={e => setRate(e.target.value)} />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase ml-1 mb-1 block">Anos</label>
                    <input type="number" className="input-field" placeholder="10" value={years} onChange={e => setYears(e.target.value)} />
                </div>
            </div>
            <button onClick={calculate} className="w-full btn-primary mb-6">
                Calcular Futuro <ArrowRight className="w-4 h-4 ml-1" />
            </button>
            
            {result && (
                <div className="bg-white dark:bg-zinc-950 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-zinc-500">Total Investido</span>
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">{formatCurrency(result.invested)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-zinc-500">Juros Recebidos</span>
                        <span className="text-sm font-bold text-emerald-500">+{formatCurrency(result.interest)}</span>
                    </div>
                    <div className="pt-3 border-t border-dashed border-zinc-200 dark:border-zinc-800 flex justify-between items-end">
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">Patrimônio Final</span>
                        <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(result.total)}</span>
                    </div>
                </div>
            )}
        </CalculatorCard>
    );
};

export const AveragePriceCalculator = () => {
    const [currentQty, setCurrentQty] = useState('');
    const [currentAvg, setCurrentAvg] = useState('');
    const [newQty, setNewQty] = useState('');
    const [newPrice, setNewPrice] = useState('');
    const [result, setResult] = useState<number | null>(null);

    useEffect(() => {
        const q1 = parseFloat(currentQty) || 0;
        const p1 = parseFloat(currentAvg.replace(',', '.')) || 0;
        const q2 = parseFloat(newQty) || 0;
        const p2 = parseFloat(newPrice.replace(',', '.')) || 0;

        if (q1 + q2 > 0) {
            const totalVal = (q1 * p1) + (q2 * p2);
            setResult(totalVal / (q1 + q2));
        } else {
            setResult(null);
        }
    }, [currentQty, currentAvg, newQty, newPrice]);

    return (
        <CalculatorCard title="Preço Médio" icon={Calculator}>
            <div className="space-y-4">
                <div className="bg-zinc-100 dark:bg-zinc-900/50 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <div className="text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-2">Posição Atual</div>
                    <div className="grid grid-cols-2 gap-3">
                        <input type="number" className="input-field bg-white dark:bg-zinc-950" placeholder="Qtd Atual" value={currentQty} onChange={e => setCurrentQty(e.target.value)} />
                        <input type="number" className="input-field bg-white dark:bg-zinc-950" placeholder="PM Atual (R$)" value={currentAvg} onChange={e => setCurrentAvg(e.target.value)} />
                    </div>
                </div>
                
                <div className="bg-indigo-50 dark:bg-indigo-900/10 p-3 rounded-xl border border-indigo-100 dark:border-indigo-500/20">
                    <div className="text-[10px] font-black text-indigo-400 uppercase tracking-wider mb-2">Nova Compra</div>
                    <div className="grid grid-cols-2 gap-3">
                        <input type="number" className="input-field bg-white dark:bg-zinc-950" placeholder="Qtd Nova" value={newQty} onChange={e => setNewQty(e.target.value)} />
                        <input type="number" className="input-field bg-white dark:bg-zinc-950" placeholder="Preço (R$)" value={newPrice} onChange={e => setNewPrice(e.target.value)} />
                    </div>
                </div>
            </div>

            {result !== null && (
                <div className="mt-4 bg-white dark:bg-zinc-950 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm flex justify-between items-center animate-pulse-once">
                    <span className="text-sm font-bold text-zinc-500">Novo Preço Médio</span>
                    <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(result)}</span>
                </div>
            )}
        </CalculatorCard>
    );
};

export const YieldOnCostCalculator = () => {
    const [price, setPrice] = useState('');
    const [dividend, setDividend] = useState('');
    const [result, setResult] = useState<number | null>(null);

    useEffect(() => {
        const p = parseFloat(price.replace(',', '.')) || 0;
        const d = parseFloat(dividend.replace(',', '.')) || 0;
        if (p > 0) {
            setResult((d / p) * 100);
        } else {
            setResult(null);
        }
    }, [price, dividend]);

    return (
        <CalculatorCard title="Yield on Cost (YoC)" icon={Percent}>
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase ml-1 mb-1 block">Preço Médio (R$)</label>
                    <input type="number" className="input-field" placeholder="0,00" value={price} onChange={e => setPrice(e.target.value)} />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase ml-1 mb-1 block">Div. Anual (R$)</label>
                    <input type="number" className="input-field" placeholder="0,00" value={dividend} onChange={e => setDividend(e.target.value)} />
                </div>
            </div>
            {result !== null && (
                <div className="bg-white dark:bg-zinc-950 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm flex justify-between items-center">
                    <span className="text-sm font-bold text-zinc-500">YoC Anual</span>
                    <span className="text-2xl font-black text-emerald-500">{result.toFixed(2)}%</span>
                </div>
            )}
        </CalculatorCard>
    );
};
