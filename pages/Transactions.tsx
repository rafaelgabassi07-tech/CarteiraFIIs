
import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, AssetType } from '../types';
import { Plus, Trash2, Calendar, X, Search, TrendingUp, TrendingDown, Pencil } from 'lucide-react';

interface TransactionsProps {
  transactions: Transaction[];
  onAddTransaction: (t: Omit<Transaction, 'id'>) => void;
  onUpdateTransaction: (id: string, t: Omit<Transaction, 'id'>) => void;
  onDeleteTransaction: (id: string) => void;
}

export const Transactions: React.FC<TransactionsProps> = ({ 
  transactions, 
  onAddTransaction, 
  onUpdateTransaction,
  onDeleteTransaction 
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [ticker, setTicker] = useState('');
  const [type, setType] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [assetType, setAssetType] = useState<AssetType>(AssetType.FII);

  const resetForm = () => {
    setTicker('');
    setQuantity('');
    setPrice('');
    setDate(new Date().toISOString().split('T')[0]);
    setType('BUY');
    setAssetType(AssetType.FII);
    setEditingId(null);
  };

  const handleEdit = (t: Transaction) => {
    setTicker(t.ticker);
    setQuantity(t.quantity.toString());
    setPrice(t.price.toString());
    setDate(t.date);
    setType(t.type);
    setAssetType(t.assetType);
    setEditingId(t.id);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker || !quantity || !price) return;
    
    const data = { 
      ticker: ticker.toUpperCase(), 
      type, 
      quantity: Number(quantity), 
      price: Number(price), 
      date, 
      assetType 
    };

    if (editingId) {
      onUpdateTransaction(editingId, data);
    } else {
      onAddTransaction(data);
    }
    
    resetForm();
    setShowForm(false);
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

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="pb-32 pt-6 px-5 space-y-6">
      
      <div className="flex justify-between items-center gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-accent transition-colors" />
          <input
            type="text"
            className="w-full bg-secondary/30 backdrop-blur-md border border-white/[0.05] pl-11 pr-4 py-4 rounded-3xl outline-none focus:border-accent/30 text-sm font-bold placeholder:text-slate-600 transition-all shadow-sm"
            placeholder="Buscar ativo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => { resetForm(); setShowForm(true); }} 
          className="p-4 bg-accent text-primary rounded-3xl shadow-lg active:scale-90 transition-all hover:brightness-110 flex-shrink-0"
        >
          <Plus className="w-6 h-6" strokeWidth={3} />
        </button>
      </div>

      <div className="space-y-10">
        {Object.keys(groupedTransactions).length === 0 ? (
           <div className="text-center py-24 flex flex-col items-center gap-4 animate-fade-in">
              <div className="p-6 bg-white/[0.03] rounded-full">
                <Search className="w-8 h-8 text-slate-700" />
              </div>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] opacity-60">Nenhum registro encontrado</p>
           </div>
        ) : (
          (Object.entries(groupedTransactions) as [string, Transaction[]][]).map(([month, trans], gIdx) => (
            <div key={month} className="space-y-5 animate-fade-in-up" style={{ animationDelay: `${gIdx * 100}ms` }}>
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] pl-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent/40" /> {month}
                </h3>
                <div className="space-y-3">
                  {trans.map((t, idx) => (
                      <div 
                        key={t.id} 
                        className="glass p-5 rounded-[2rem] flex items-center justify-between group transition-all hover:bg-white/[0.04] border border-white/[0.02]"
                      >
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${t.type === 'BUY' ? 'bg-emerald-500/10 border-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-rose-500/10 border-rose-500/10 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.1)]'}`}>
                                {t.type === 'BUY' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="font-black text-white text-base leading-none">{t.ticker}</span>
                                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border ${t.assetType === AssetType.FII ? 'bg-accent/10 text-accent border-accent/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'}`}>
                                    {t.assetType}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                  {t.type === 'BUY' ? 'Compra' : 'Venda'} • {t.date.split('-').reverse().join('/')}
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <div className="text-right mr-1">
                                <div className="text-white text-sm font-black tabular-nums tracking-tight">R$ {formatCurrency(t.quantity * t.price)}</div>
                                <div className="text-[10px] text-slate-500 font-bold tabular-nums">{t.quantity} un × {formatCurrency(t.price)}</div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => handleEdit(t)} 
                                  className="p-2.5 rounded-xl bg-white/[0.03] text-slate-500 hover:text-accent hover:bg-accent/10 transition-all active:scale-90"
                                  title="Editar"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => onDeleteTransaction(t.id)} 
                                  className="p-2.5 rounded-xl bg-white/[0.03] text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-all active:scale-90"
                                  title="Excluir"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
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
          <div className="bg-primary w-full rounded-t-[3rem] p-7 border-t border-white/10 shadow-2xl relative animate-slide-up flex flex-col space-y-6 overflow-hidden">
            <div className="w-12 h-1 bg-white/10 rounded-full mx-auto shrink-0"></div>
            <div className="flex items-center justify-between shrink-0">
                 <h3 className="text-2xl font-black text-white tracking-tight">
                   {editingId ? 'Editar Ordem' : 'Nova Ordem'}
                 </h3>
                 <button onClick={() => { setShowForm(false); resetForm(); }} className="p-3 rounded-2xl bg-white/5 text-slate-400 active:scale-90 transition-all">
                     <X className="w-5 h-5" />
                 </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6 pb-12 overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-2 bg-white/[0.03] p-1.5 rounded-2xl border border-white/[0.05]">
                <button type="button" onClick={() => setType('BUY')} className={`py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${type === 'BUY' ? 'bg-emerald-500 text-primary shadow-lg shadow-emerald-500/20' : 'text-slate-500'}`}>Compra</button>
                <button type="button" onClick={() => setType('SELL')} className={`py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${type === 'SELL' ? 'bg-rose-500 text-primary shadow-lg shadow-rose-500/20' : 'text-slate-500'}`}>Venda</button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <button type="button" onClick={() => setAssetType(AssetType.FII)} className={`py-4 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all ${assetType === AssetType.FII ? 'bg-accent/10 border-accent text-accent' : 'bg-white/5 border-transparent text-slate-500'}`}>FII</button>
                 <button type="button" onClick={() => setAssetType(AssetType.STOCK)} className={`py-4 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all ${assetType === AssetType.STOCK ? 'bg-purple-500/10 border-purple-500 text-purple-400' : 'bg-white/5 border-transparent text-slate-500'}`}>Ação</button>
              </div>

              <div className="space-y-4">
                <div className="relative group">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Ativo</span>
                  <input 
                    type="text" 
                    value={ticker} 
                    onChange={(e) => setTicker(e.target.value)} 
                    placeholder="EX: MXRF11" 
                    className="w-full glass pl-20 pr-4 py-5 rounded-3xl outline-none focus:border-accent text-sm font-black uppercase tracking-widest transition-all" 
                    required 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative group">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Qtd</span>
                    <input 
                      type="number" 
                      value={quantity} 
                      onChange={(e) => setQuantity(e.target.value)} 
                      className="w-full glass pl-14 pr-4 py-5 rounded-3xl outline-none focus:border-accent text-sm font-black tabular-nums transition-all" 
                      required 
                    />
                  </div>
                  <div className="relative group">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-500 uppercase tracking-widest">R$</span>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={price} 
                      onChange={(e) => setPrice(e.target.value)} 
                      className="w-full glass pl-12 pr-4 py-5 rounded-3xl outline-none focus:border-accent text-sm font-black tabular-nums transition-all" 
                      required 
                    />
                  </div>
                </div>
                <div className="relative group">
                  <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-accent transition-colors" />
                  <input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)} 
                    className="w-full glass pl-14 pr-4 py-5 rounded-3xl outline-none focus:border-accent text-sm font-bold transition-all" 
                    required 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full py-5 rounded-[2.5rem] bg-accent text-primary font-black text-sm uppercase tracking-[0.25em] shadow-lg shadow-accent/20 active:scale-[0.98] transition-all hover:brightness-110"
              >
                {editingId ? 'Salvar Alterações' : 'Confirmar Ordem'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
