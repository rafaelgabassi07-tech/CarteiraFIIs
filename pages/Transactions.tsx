
import React, { useState, useMemo } from 'react';
import { Transaction, AssetType } from '../types';
import { Plus, Trash2, Calendar, X, Search, TrendingUp, TrendingDown, Pencil, Filter, ArrowRight } from 'lucide-react';

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
      ticker: ticker.toUpperCase().trim(), 
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

  const stats = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => {
      const vol = t.quantity * t.price;
      if (t.type === 'BUY') acc.bought += vol;
      else acc.sold += vol;
      return acc;
    }, { bought: 0, sold: 0 });
  }, [filteredTransactions]);

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
      
      {/* Search and Quick Stats */}
      <div className="space-y-4">
        <div className="flex justify-between items-center gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-accent transition-colors" />
            <input
              type="text"
              className="w-full bg-secondary/30 backdrop-blur-md border border-white/[0.05] pl-11 pr-4 py-4 rounded-3xl outline-none focus:border-accent/30 text-sm font-bold placeholder:text-slate-600 transition-all shadow-sm"
              placeholder="Buscar por ticker..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white/5 text-slate-400">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <button 
            onClick={() => { resetForm(); setShowForm(true); }} 
            className="p-4 bg-accent text-primary rounded-3xl shadow-[0_8px_20px_rgba(56,189,248,0.2)] active:scale-90 transition-all hover:brightness-110 flex-shrink-0"
          >
            <Plus className="w-6 h-6" strokeWidth={3} />
          </button>
        </div>

        {searchTerm && filteredTransactions.length > 0 && (
          <div className="flex items-center gap-3 px-2 overflow-x-auto no-scrollbar py-1">
            <div className="flex-shrink-0 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full flex items-center gap-2">
              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider">Compras: R$ {formatCurrency(stats.bought)}</span>
            </div>
            <div className="flex-shrink-0 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-full flex items-center gap-2">
              <span className="text-[9px] font-black text-rose-400 uppercase tracking-wider">Vendas: R$ {formatCurrency(stats.sold)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-10">
        {Object.keys(groupedTransactions).length === 0 ? (
           <div className="text-center py-24 flex flex-col items-center gap-4 animate-fade-in">
              <div className="p-8 bg-white/[0.02] rounded-[2.5rem] border border-white/[0.05]">
                <Search className="w-10 h-10 text-slate-700 mb-2" />
              </div>
              <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]">Nenhum registro encontrado</p>
           </div>
        ) : (
          (Object.entries(groupedTransactions) as [string, Transaction[]][]).map(([month, trans], gIdx) => (
            <div key={month} className="space-y-5 animate-fade-in-up" style={{ animationDelay: `${gIdx * 80}ms` }}>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] pl-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/[0.05]" />
                  <span className="flex-shrink-0">{month}</span>
                  <div className="h-px flex-1 bg-white/[0.05]" />
                </h3>
                <div className="space-y-3">
                  {trans.map((t, idx) => (
                      <div 
                        key={t.id} 
                        className="glass p-5 rounded-[2rem] flex items-center justify-between group transition-all hover:bg-white/[0.03] border border-white/[0.02] active:scale-[0.99]"
                      >
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${t.type === 'BUY' ? 'bg-emerald-500/10 border-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.05)]' : 'bg-rose-500/10 border-rose-500/10 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.05)]'}`}>
                                {t.type === 'BUY' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="font-black text-white text-base leading-none tracking-tight">{t.ticker}</span>
                                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border ${t.assetType === AssetType.FII ? 'bg-accent/10 text-accent border-accent/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'}`}>
                                    {t.assetType}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                  {t.type === 'BUY' ? 'Compra' : 'Venda'} • {t.date.split('-').reverse().join('/')}
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <div className="text-white text-sm font-black tabular-nums tracking-tight">R$ {formatCurrency(t.quantity * t.price)}</div>
                                <div className="text-[10px] text-slate-500 font-bold tabular-nums opacity-60">{t.quantity} UN • {formatCurrency(t.price)}</div>
                            </div>
                            
                            <div className="flex items-center gap-1.5">
                                <button 
                                  onClick={() => handleEdit(t)} 
                                  className="p-3 rounded-xl bg-white/[0.03] text-slate-500 hover:text-accent hover:bg-accent/10 transition-all active:scale-90"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => { if(confirm('Excluir transação?')) onDeleteTransaction(t.id); }} 
                                  className="p-3 rounded-xl bg-white/[0.03] text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-all active:scale-90"
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
          <div className="bg-primary w-full rounded-t-[3rem] border-t border-white/10 shadow-2xl relative animate-slide-up flex flex-col overflow-hidden max-h-[95vh]">
            
            <div className="p-7 pb-4 space-y-6">
              <div className="w-12 h-1 bg-white/10 rounded-full mx-auto"></div>
              <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-2xl ${editingId ? 'bg-accent/10 text-accent' : 'bg-white/5 text-white'}`}>
                        {editingId ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-white tracking-tight leading-none">
                          {editingId ? `Editando ${ticker || 'Ordem'}` : 'Nova Ordem'}
                        </h3>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1.5">Preencha os dados da operação</p>
                      </div>
                   </div>
                   <button onClick={() => { setShowForm(false); resetForm(); }} className="p-3 rounded-2xl bg-white/5 text-slate-400 active:scale-90 transition-all">
                       <X className="w-5 h-5" />
                   </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-7 pt-2 space-y-6 pb-12 overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-2 bg-white/[0.03] p-1.5 rounded-2xl border border-white/[0.05]">
                <button type="button" onClick={() => setType('BUY')} className={`py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${type === 'BUY' ? 'bg-emerald-500 text-primary shadow-lg shadow-emerald-500/20' : 'text-slate-500'}`}>Compra</button>
                <button type="button" onClick={() => setType('SELL')} className={`py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${type === 'SELL' ? 'bg-rose-500 text-primary shadow-lg shadow-rose-500/20' : 'text-slate-500'}`}>Venda</button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <button type="button" onClick={() => setAssetType(AssetType.FII)} className={`py-4 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all ${assetType === AssetType.FII ? 'bg-accent/10 border-accent/20 text-accent' : 'bg-white/5 border-transparent text-slate-500'}`}>Fundos (FII)</button>
                 <button type="button" onClick={() => setAssetType(AssetType.STOCK)} className={`py-4 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all ${assetType === AssetType.STOCK ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : 'bg-white/5 border-transparent text-slate-500'}`}>Ações</button>
              </div>

              <div className="space-y-4">
                <div className="relative group">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Ticker</span>
                  <input 
                    type="text" 
                    value={ticker} 
                    onChange={(e) => setTicker(e.target.value)} 
                    placeholder="EX: PETR4" 
                    className="w-full glass pl-20 pr-4 py-5 rounded-3xl outline-none focus:border-accent text-sm font-black uppercase tracking-[0.1em] transition-all" 
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
                className="w-full py-5 rounded-[2.5rem] bg-accent text-primary font-black text-sm uppercase tracking-[0.25em] shadow-xl shadow-accent/20 active:scale-[0.98] transition-all hover:brightness-110 flex items-center justify-center gap-3"
              >
                {editingId ? 'Salvar Alterações' : 'Registrar Ordem'}
                <ArrowRight className="w-4 h-4" strokeWidth={3} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
