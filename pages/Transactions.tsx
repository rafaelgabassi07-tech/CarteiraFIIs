
import React, { useState, useMemo } from 'react';
import { Transaction, AssetType } from '../types';
import { Plus, Trash2, Calendar, X, Search, TrendingUp, TrendingDown, Pencil, Filter, ArrowRight } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';

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
    <div className="pb-32 pt-2 px-5 space-y-6 relative">
      {/* Luz ambiente */}
      <div className="fixed top-0 left-0 right-0 h-64 bg-slate-800/20 blur-[80px] -z-10 pointer-events-none"></div>

      {/* Busca e Estatísticas Rápidas */}
      <div className="space-y-4">
        <div className="flex justify-between items-center gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-accent transition-colors" />
            <input
              type="text"
              className="w-full bg-slate-800/80 backdrop-blur-md border border-white/[0.08] pl-11 pr-4 py-4 rounded-3xl outline-none focus:border-accent/40 focus:bg-slate-800 text-sm font-bold placeholder:text-slate-500 transition-all shadow-sm text-white"
              placeholder="Buscar ativo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white/5 text-slate-400 active:scale-90">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <button 
            onClick={() => { resetForm(); setShowForm(true); }} 
            className="w-14 h-14 bg-accent text-primary rounded-3xl shadow-[0_0_20px_rgba(56,189,248,0.3)] active:scale-90 transition-all hover:brightness-110 flex items-center justify-center flex-shrink-0"
          >
            <Plus className="w-7 h-7" strokeWidth={3} />
          </button>
        </div>

        {searchTerm && filteredTransactions.length > 0 && (
          <div className="flex items-center gap-3 px-1 overflow-x-auto no-scrollbar">
            <div className="flex-shrink-0 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full flex items-center gap-2">
              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider">Total Comprado: R$ {formatCurrency(stats.bought)}</span>
            </div>
            <div className="flex-shrink-0 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-full flex items-center gap-2">
              <span className="text-[9px] font-black text-rose-400 uppercase tracking-wider">Total Vendido: R$ {formatCurrency(stats.sold)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-8">
        {Object.keys(groupedTransactions).length === 0 ? (
           <div className="text-center py-24 flex flex-col items-center gap-4 animate-fade-in opacity-50">
              <div className="p-8 bg-white/[0.02] rounded-[2.5rem] border border-white/[0.05]">
                <Search className="w-10 h-10 text-slate-700 mb-2" />
              </div>
              <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]">Nenhuma movimentação</p>
           </div>
        ) : (
          (Object.entries(groupedTransactions) as [string, Transaction[]][]).map(([month, trans], gIdx) => (
            <div key={month} className="space-y-4 animate-fade-in-up" style={{ animationDelay: `${gIdx * 80}ms` }}>
                <div className="flex items-center gap-4 sticky top-24 z-10 py-2">
                  <div className="bg-slate-800/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 shadow-lg">
                     <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] whitespace-nowrap">
                        {month}
                     </h3>
                  </div>
                  <div className="h-px flex-1 bg-white/[0.05]" />
                </div>

                <div className="space-y-3">
                  {trans.map((t) => (
                      <div 
                        key={t.id} 
                        className="bg-slate-800/40 p-5 rounded-[2.2rem] flex items-center justify-between group transition-all hover:bg-slate-800/60 border border-white/[0.05] active:scale-[0.98] shadow-sm"
                      >
                        <div className="flex items-center gap-4 flex-1">
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border transition-all shadow-sm ${t.type === 'BUY' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                                {t.type === 'BUY' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-black text-white text-base leading-none tracking-tight truncate">{t.ticker}</span>
                                  <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-md border uppercase tracking-wider ${t.assetType === AssetType.FII ? 'bg-accent/10 text-accent border-accent/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'}`}>
                                    {t.assetType}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[8px] font-black uppercase tracking-[0.15em] ${t.type === 'BUY' ? 'text-emerald-500/70' : 'text-rose-500/70'}`}>
                                    {t.type === 'BUY' ? 'Compra' : 'Venda'}
                                  </span>
                                  <span className="w-1 h-1 rounded-full bg-slate-600" />
                                  <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">
                                    {t.date.split('-').reverse().join('/')}
                                  </span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <div className="text-right flex flex-col justify-center">
                                <div className="text-white text-[15px] font-black tabular-nums tracking-tighter mb-0.5">
                                  <span className="text-[10px] text-slate-500 mr-1 font-bold">R$</span>
                                  {formatCurrency(t.quantity * t.price)}
                                </div>
                                <div className="text-[9px] text-slate-500 font-black tabular-nums tracking-tight opacity-80">
                                  {t.quantity} un <span className="text-[7px] mx-0.5 opacity-40">@</span> {formatCurrency(t.price)}
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-1 ml-1">
                                <button 
                                  onClick={() => handleEdit(t)} 
                                  className="p-2.5 rounded-xl bg-white/[0.03] text-slate-500 hover:text-accent hover:bg-accent/10 transition-all active:scale-90 border border-white/5"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => { if(confirm('Deseja realmente excluir esta movimentação?')) onDeleteTransaction(t.id); }} 
                                  className="p-2.5 rounded-xl bg-white/[0.03] text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-all active:scale-90 border border-white/5"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
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

      <SwipeableModal isOpen={showForm} onClose={() => { setShowForm(false); resetForm(); }}>
        <div className="px-6 pt-2 pb-10">
              <div className="flex items-center justify-between mb-8">
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
                   <button onClick={() => { setShowForm(false); resetForm(); }} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 active:scale-90 transition-all hover:bg-white/10">
                       <X className="w-5 h-5" />
                   </button>
              </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 bg-white/[0.03] p-1.5 rounded-[1.5rem] border border-white/[0.05]">
                <button type="button" onClick={() => setType('BUY')} className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${type === 'BUY' ? 'bg-emerald-500 text-primary shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-white'}`}>Compra</button>
                <button type="button" onClick={() => setType('SELL')} className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${type === 'SELL' ? 'bg-rose-500 text-primary shadow-lg shadow-rose-500/20' : 'text-slate-500 hover:text-white'}`}>Venda</button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <button type="button" onClick={() => setAssetType(AssetType.FII)} className={`py-4 rounded-3xl border font-black text-[10px] uppercase tracking-widest transition-all ${assetType === AssetType.FII ? 'bg-accent/10 border-accent/20 text-accent shadow-lg shadow-accent/5' : 'bg-white/5 border-transparent text-slate-500'}`}>Fundos (FII)</button>
                 <button type="button" onClick={() => setAssetType(AssetType.STOCK)} className={`py-4 rounded-3xl border font-black text-[10px] uppercase tracking-widest transition-all ${assetType === AssetType.STOCK ? 'bg-purple-500/10 border-purple-500/20 text-purple-400 shadow-lg shadow-purple-500/5' : 'bg-white/5 border-transparent text-slate-500'}`}>Ações</button>
              </div>

              <div className="space-y-5">
                <div className="relative group">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-500 uppercase tracking-widest pointer-events-none group-focus-within:text-accent transition-colors">Ticker</span>
                  <input 
                    type="text" 
                    value={ticker} 
                    onChange={(e) => setTicker(e.target.value)} 
                    placeholder="EX: PETR4" 
                    className="w-full bg-white/[0.03] border border-white/[0.05] pl-24 pr-6 py-5 rounded-[1.5rem] outline-none focus:border-accent/40 focus:bg-white/[0.06] text-sm font-black uppercase tracking-[0.1em] transition-all placeholder:text-slate-700" 
                    required 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative group">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-500 uppercase tracking-widest pointer-events-none group-focus-within:text-accent transition-colors">Qtd</span>
                    <input 
                      type="number" 
                      value={quantity} 
                      onChange={(e) => setQuantity(e.target.value)} 
                      className="w-full bg-white/[0.03] border border-white/[0.05] pl-16 pr-6 py-5 rounded-[1.5rem] outline-none focus:border-accent/40 focus:bg-white/[0.06] text-sm font-black tabular-nums transition-all" 
                      required 
                    />
                  </div>
                  <div className="relative group">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-500 uppercase tracking-widest pointer-events-none group-focus-within:text-accent transition-colors">R$</span>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={price} 
                      onChange={(e) => setPrice(e.target.value)} 
                      className="w-full bg-white/[0.03] border border-white/[0.05] pl-14 pr-6 py-5 rounded-[1.5rem] outline-none focus:border-accent/40 focus:bg-white/[0.06] text-sm font-black tabular-nums transition-all" 
                      required 
                    />
                  </div>
                </div>
                
                <div className="relative group">
                  <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-accent transition-colors pointer-events-none" />
                  <input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)} 
                    className="w-full bg-white/[0.03] border border-white/[0.05] pl-14 pr-6 py-5 rounded-[1.5rem] outline-none focus:border-accent/40 focus:bg-white/[0.06] text-sm font-bold transition-all text-slate-300" 
                    required 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full py-5 rounded-[2rem] bg-accent text-primary font-black text-sm uppercase tracking-[0.25em] shadow-xl shadow-accent/20 active:scale-[0.98] transition-all hover:brightness-110 flex items-center justify-center gap-3 mt-4"
              >
                {editingId ? 'Salvar Alterações' : 'Confirmar Ordem'}
                <ArrowRight className="w-4 h-4" strokeWidth={3} />
              </button>
            </form>
        </div>
      </SwipeableModal>
    </div>
  );
};
