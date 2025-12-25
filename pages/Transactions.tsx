
import React, { useState, useMemo } from 'react';
import { Transaction, AssetType } from '../types';
import { Plus, Trash2, Calendar, X, Check, Search, TrendingUp, TrendingDown } from 'lucide-react';

interface TransactionsProps {
  transactions: Transaction[];
  onAddTransaction: (t: Omit<Transaction, 'id'>) => void;
  onDeleteTransaction: (id: string) => void;
}

export const Transactions: React.FC<TransactionsProps> = ({ transactions, onAddTransaction, onDeleteTransaction }) => {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [ticker, setTicker] = useState('');
  const [type, setType] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [assetType, setAssetType] = useState<AssetType>(AssetType.FII);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker || !quantity || !price) return;
    onAddTransaction({ ticker: ticker.toUpperCase(), type, quantity: Number(quantity), price: Number(price), date, assetType });
    setTicker(''); setQuantity(''); setPrice(''); setShowForm(false);
  };

  const filteredTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter(t => t.ticker.toUpperCase().includes(searchTerm.toUpperCase()));
  }, [transactions, searchTerm]);

  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filteredTransactions.forEach(t => {
        const d = new Date(t.date + 'T12:00:00');
        const month = d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        if (!groups[month]) groups[month] = [];
        groups[month].push(t);
    });
    return groups;
  }, [filteredTransactions]);

  return (
    <div className="pb-32 pt-6 px-5 space-y-6">
      
      <div className="flex justify-between items-center">
        <div className="relative flex-1 mr-4 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-accent transition-colors" />
          <input
            type="text"
            className="w-full glass pl-11 pr-4 py-4 rounded-3xl outline-none focus:border-accent/30 text-sm font-bold placeholder:text-slate-600 transition-all"
            placeholder="Buscar ativo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button onClick={() => setShowForm(true)} className="p-4 bg-accent text-primary rounded-3xl shadow-lg active:scale-90 transition-all">
          <Plus className="w-6 h-6" strokeWidth={3} />
        </button>
      </div>

      <div className="space-y-8">
        {Object.keys(groupedTransactions).length === 0 ? (
           <div className="text-center py-20 text-slate-500 font-bold uppercase tracking-widest text-xs opacity-50">Nenhuma transação</div>
        ) : (
          /* Fix: Added explicit type cast for Object.entries to resolve 'unknown' map error on line 74 */
          (Object.entries(groupedTransactions) as [string, Transaction[]][]).map(([month, trans], gIdx) => (
            <div key={month} className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] pl-2">{month}</h3>
                <div className="space-y-3">
                  {trans.map((t, idx) => (
                      <div key={t.id} className="glass p-5 rounded-[2rem] flex items-center justify-between group animate-fade-in-up" style={{ animationDelay: `${idx * 40}ms` }}>
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${t.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                {t.type === 'BUY' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                            </div>
                            <div>
                                <div className="font-black text-white text-base leading-none mb-1">{t.ticker}</div>
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t.type === 'BUY' ? 'Compra' : 'Venda'} • {t.date.split('-').reverse().join('/')}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-5">
                            <div className="text-right">
                                <div className="text-white text-sm font-black tabular-nums">R$ {(t.quantity * t.price).toFixed(2)}</div>
                                <div className="text-[10px] text-slate-500 font-bold tabular-nums">{t.quantity} un × {t.price.toFixed(2)}</div>
                            </div>
                            <button onClick={() => onDeleteTransaction(t.id)} className="p-2 text-slate-600 hover:text-rose-500 transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                      </div>
                  ))}
                </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-0">
          <div className="absolute inset-0 bg-primary/80 backdrop-blur-md animate-fade-in" onClick={() => setShowForm(false)} />
          <div className="bg-primary w-full rounded-t-[3rem] p-7 border-t border-white/10 shadow-2xl relative animate-slide-up flex flex-col space-y-6">
            <div className="w-12 h-1 bg-white/10 rounded-full mx-auto"></div>
            <div className="flex items-center justify-between">
                 <h3 className="text-2xl font-black text-white tracking-tight">Nova Ordem</h3>
                 <button onClick={() => setShowForm(false)} className="p-3 rounded-2xl bg-white/5 text-slate-400">
                     <X className="w-5 h-5" />
                 </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6 pb-12">
              <div className="grid grid-cols-2 bg-white/5 p-1.5 rounded-2xl border border-white/5">
                <button type="button" onClick={() => setType('BUY')} className={`py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${type === 'BUY' ? 'bg-emerald-500 text-primary' : 'text-slate-500'}`}>Compra</button>
                <button type="button" onClick={() => setType('SELL')} className={`py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${type === 'SELL' ? 'bg-rose-500 text-primary' : 'text-slate-500'}`}>Venda</button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <button type="button" onClick={() => setAssetType(AssetType.FII)} className={`py-4 rounded-2xl border font-black text-xs uppercase tracking-widest transition-all ${assetType === AssetType.FII ? 'bg-accent/10 border-accent text-accent' : 'bg-white/5 border-transparent text-slate-500'}`}>FII</button>
                 <button type="button" onClick={() => setAssetType(AssetType.STOCK)} className={`py-4 rounded-2xl border font-black text-xs uppercase tracking-widest transition-all ${assetType === AssetType.STOCK ? 'bg-purple-500/10 border-purple-500 text-purple-400' : 'bg-white/5 border-transparent text-slate-500'}`}>Ação</button>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-500 uppercase">Ticker</span>
                  <input type="text" value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="MXRF11" className="w-full glass pl-20 pr-4 py-4 rounded-2xl outline-none focus:border-accent text-sm font-black uppercase tracking-widest" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-500 uppercase">Qtd</span>
                    <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full glass pl-12 pr-4 py-4 rounded-2xl outline-none focus:border-accent text-sm font-black tabular-nums" required />
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-500 uppercase">R$</span>
                    <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full glass pl-12 pr-4 py-4 rounded-2xl outline-none focus:border-accent text-sm font-black tabular-nums" required />
                  </div>
                </div>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full glass pl-12 pr-4 py-4 rounded-2xl outline-none focus:border-accent text-sm font-bold" required />
                </div>
              </div>

              <button type="submit" className="w-full py-5 rounded-[2rem] bg-accent text-primary font-black text-sm uppercase tracking-[0.2em] shadow-lg shadow-accent/20 active:scale-[0.98] transition-all">Salvar Ordem</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
