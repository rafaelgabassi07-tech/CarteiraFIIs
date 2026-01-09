
import React, { useMemo } from 'react';
import { Transaction } from '../types';
import { TrendingUp, TrendingDown, Plus, Trash2 } from 'lucide-react';
import { VariableSizeList as List } from 'react-window';

const formatBRL = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

const TransactionRow = React.memo(({ index, style, data }: any) => {
  const item = data.items[index];
  if (item.type === 'header') {
      return (
          <div style={style} className="px-2 pt-6 pb-2">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.monthKey}</h3>
          </div>
      );
  }

  const t = item.data;
  const isBuy = t.type === 'BUY';
  
  return (
      <div style={style} className="px-1 py-1.5">
          <div className="bg-white dark:bg-[#0f172a] p-5 rounded-[2rem] border border-slate-200 dark:border-white/5 flex items-center justify-between shadow-sm active:scale-[0.99] transition-transform">
              <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isBuy ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 border border-emerald-100 dark:border-emerald-500/20' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-500 border border-rose-100 dark:border-rose-500/20'}`}>
                      {isBuy ? <TrendingUp className="w-5 h-5" strokeWidth={2.5} /> : <TrendingDown className="w-5 h-5" strokeWidth={2.5} />}
                  </div>
                  <div>
                      <h4 className="font-black text-sm text-slate-900 dark:text-white">{t.ticker}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">{t.date.split('-').reverse().slice(0,2).join('/')} • {isBuy ? 'Compra' : 'Venda'}</p>
                  </div>
              </div>
              <div className="text-right">
                  <p className="text-sm font-black text-slate-900 dark:text-white tabular-nums">R$ {formatBRL(t.price * t.quantity)}</p>
                  <p className="text-[10px] text-slate-400 font-medium tabular-nums mt-0.5">{t.quantity}x {formatBRL(t.price)}</p>
              </div>
          </div>
      </div>
  );
});

const TransactionsComponent: React.FC<any> = ({ transactions, onAddTransaction }) => {
    // Reusing logic, adjusting visuals
    const { flatTransactions, getItemSize } = useMemo(() => {
        const sorted = [...transactions].sort((a,b) => b.date.localeCompare(a.date));
        const groups: any = {};
        sorted.forEach(t => {
            const k = t.date.substring(0, 7);
            if (!groups[k]) groups[k] = [];
            groups[k].push(t);
        });
        const list: any[] = [];
        Object.keys(groups).sort((a,b) => b.localeCompare(a)).forEach(k => {
            // Friendly month name logic could go here
            list.push({ type: 'header', monthKey: k });
            groups[k].forEach((t: any) => list.push({ type: 'item', data: t }));
        });
        // Increased height for better aesthetics (96px vs 88px)
        return { flatTransactions: list, getItemSize: (i: number) => list[i].type === 'header' ? 45 : 96 };
    }, [transactions]);

    return (
        <div className="pt-28 pb-32 px-5 max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-6 px-1 anim-fade-in-up is-visible">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Ordens</h2>
                    <p className="text-xs text-slate-500 font-medium mt-1">Histórico de negociações</p>
                </div>
                <button className="w-12 h-12 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl flex items-center justify-center shadow-xl shadow-slate-900/10 active:scale-90 transition-all border border-transparent dark:border-white/50">
                    <Plus className="w-6 h-6" strokeWidth={2.5} />
                </button>
            </div>
            <div className="h-[calc(100vh-220px)] anim-fade-in is-visible">
                <List 
                    height={window.innerHeight - 220} 
                    itemCount={flatTransactions.length} 
                    itemSize={getItemSize} 
                    width="100%" 
                    itemData={{ items: flatTransactions }}
                    className="hide-scrollbar"
                >
                    {TransactionRow}
                </List>
            </div>
        </div>
    );
};

export const Transactions = React.memo(TransactionsComponent);
