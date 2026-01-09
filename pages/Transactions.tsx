
import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Plus } from 'lucide-react';
import * as ReactWindow from 'react-window';

const List = ReactWindow.VariableSizeList;

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
          <div className="bg-white dark:bg-[#0F1623] p-4 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isBuy ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
                      {isBuy ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                  </div>
                  <div>
                      <h4 className="font-black text-sm text-slate-900 dark:text-white">{t.ticker}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{t.date.split('-').reverse().slice(0,2).join('/')} • {isBuy ? 'Compra' : 'Venda'}</p>
                  </div>
              </div>
              <div className="text-right">
                  <p className="text-sm font-black text-slate-900 dark:text-white">R$ {formatBRL(t.price * t.quantity)}</p>
                  <p className="text-[10px] text-slate-400">{t.quantity}x {formatBRL(t.price)}</p>
              </div>
          </div>
      </div>
  );
});

const TransactionsComponent: React.FC<any> = ({ transactions, onAddTransaction }) => {
    const { flatTransactions, getItemSize } = useMemo(() => {
        const sorted = [...transactions].sort((a: any,b: any) => b.date.localeCompare(a.date));
        const groups: any = {};
        sorted.forEach((t: any) => {
            const k = t.date.substring(0, 7);
            if (!groups[k]) groups[k] = [];
            groups[k].push(t);
        });
        const list: any[] = [];
        Object.keys(groups).sort((a,b) => b.localeCompare(a)).forEach(k => {
            list.push({ type: 'header', monthKey: k });
            groups[k].forEach((t: any) => list.push({ type: 'item', data: t }));
        });
        return { flatTransactions: list, getItemSize: (i: number) => list[i].type === 'header' ? 45 : 88 };
    }, [transactions]);

    return (
        <div className="pt-24 pb-32 px-5 max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Ordens</h2>
                <button className="w-10 h-10 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform">
                    <Plus className="w-5 h-5" />
                </button>
            </div>
            <div className="h-[calc(100vh-200px)]">
                <List 
                    height={window.innerHeight - 200} 
                    itemCount={flatTransactions.length} 
                    itemSize={getItemSize} 
                    width="100%" 
                    itemData={{ items: flatTransactions }}
                >
                    {TransactionRow}
                </List>
            </div>
        </div>
    );
};

export const Transactions = React.memo(TransactionsComponent);
