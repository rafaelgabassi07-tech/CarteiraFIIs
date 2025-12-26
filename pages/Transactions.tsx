
import React, { useState, useMemo } from 'react';
import { Transaction, AssetType } from '../types';
import { Plus, Trash2, Calendar, X, Search, TrendingUp, TrendingDown, Pencil, ArrowRight } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';

interface TransactionsProps {
  transactions: Transaction[];
  onAddTransaction: (t: Omit<Transaction, 'id'>) => void;
  onUpdateTransaction: (id: string, t: Omit<Transaction, 'id'>) => void;
  onDeleteTransaction: (id: string) => void;
  monthlyContribution: number;
}

export const Transactions: React.FC<TransactionsProps> = ({ 
  transactions, 
  onAddTransaction, 
  onUpdateTransaction,
  onDeleteTransaction,
  monthlyContribution
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
    <div className="pb-32 pt-2 px-4 space-y-6 relative">
      {/* Luz ambiente */}
      <div className="fixed top-0 left-0 right-0 h-64 bg-slate-800/20 blur-[80px] -z-10 pointer-events-none"></div>
      
      {/* Resumo Aporte Mensal */}
      <div className="animate-fade-in-up">
        <div className="glass p-4 rounded-[2rem] border border-white/5 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-accent/20 to-blue-500/10 flex items-center justify-center text-accent ring-1 ring-white/5">
                 <Calendar className="w-5 h-5" />
              </div>
              <div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Aporte em {new Date().toLocaleString('pt-BR', { month: 'long' })}</p>
                 <h3 className="text-white font-black text-base tracking-tight">Total Investido</h3>
              </div>
           </div>
           <div className="text-right">
              <div className="text-lg font-black text-white tabular-nums tracking-tight">
                 R$ {formatCurrency(monthlyContribution)}
              </div>
           </div>
        </div>
      </div>

      {/* Busca e Adicionar */}
      <div className="flex justify-between items-center gap-3">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-accent transition-colors" />
            <input
              type="text"
              className="w-full bg-slate-800/50 backdrop-blur-md border border-white/[0.08] pl-10 pr-4 py-3.5 rounded-2xl outline-none focus:border-accent/40 focus:bg-slate-800 text-sm font-bold placeholder:text-slate-600 transition-all shadow-sm text-white"
              placeholder="Filtrar por ticker..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white/5 text-slate-400 active:scale-90">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <button 
            onClick={() => { resetForm(); setShowForm(true); }} 
            className="w-12 h-12 bg-accent text-primary rounded-2xl shadow-[0_0_15px_rgba(56,189,248,0.2)] active:scale-90 transition-all hover:brightness-110 flex items-center justify-center flex-shrink-0"
          >
            <Plus className="w-6 h-6" strokeWidth={3} />
          </button>
      </div>

      <div className="space-y-6">
        {Object.keys(groupedTransactions).length === 0 ? (
           <div className="text-center py-20 flex flex-col items-center gap-3 animate-fade-in opacity-50">
              <div className="p-6 bg-white/[0.02] rounded-[2rem] border border-white/[0.05]">
                <Search className="w-8 h-8 text-slate-700 mb-1" />
              </div>
              <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[9px]">Nenhuma movimentação</p>
           </div>
        ) : (
          (Object.entries(groupedTransactions) as [string, Transaction[]][]).map(([month, trans], gIdx) => (
            <div key={month} className="space-y-3 animate-fade-in-up" style={{ animationDelay: `${gIdx * 80}ms` }}>
                <div className="sticky top-24 z-10 flex items-center mb-2">
                  <div className="bg-slate-900/95 backdrop-blur-xl px-3 py-1 rounded-lg border border-white/5 shadow-md">
                     <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">
                        {month}
                     </h3>
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-white/5 to-transparent ml-2" />
                </div>

                <div className="space-y-2">
                  {trans.map((t) => (
                      <div 
                        key={t.id} 
                        className="bg-slate-800/40 rounded-2xl flex items-center relative overflow-hidden group border border-white/[0.03] active:scale-[0.99] shadow-sm"
                      >
                        {/* Indicador de Tipo Lateral */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${t.type === 'BUY' ? 'bg-emerald-500' : 'bg-rose-500'}`} />

                        <div className="flex-1 flex items-center py-3 pl-4 pr-1 gap-3 min-w-0">
                            {/* Icone */}
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all ${t.type === 'BUY' ? 'bg-emerald-500/10 border-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 border-rose-500/10 text-rose-400'}`}>
                                {t.type === 'BUY' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                            </div>
                            
                            {/* Grid de Conteúdo - Separação clara */}
                            <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 items-center">
                                {/* Linha 1: Ticker e Valor Total */}
                                <div className="font-black text-white text-sm truncate tracking-tight">{t.ticker}</div>
                                <div className="text-white text-sm font-black tabular-nums tracking-tight text-right">R$ {formatCurrency(t.quantity * t.price)}</div>

                                {/* Linha 2: Data/Tipo e Detalhes */}
                                <div className="flex items-center gap-1.5 overflow-hidden">
                                   <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-[1px] rounded ${t.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                      {t.type === 'BUY' ? 'Compra' : 'Venda'}
                                   </span>
                                   <span className="text-[10px] text-slate-500 font-bold truncate">
                                      {t.date.split('-').reverse().slice(0,2).join('/')}
                                   </span>
                                </div>
                                <div className="text-[10px] text-slate-400 font-medium tabular-nums text-right truncate">
                                   {t.quantity} un x {formatCurrency(t.price)}
                                </div>
                            </div>
                        </div>
                        
                        {/* Ações Laterais */}
                        <div className="flex flex-col gap-1 pr-2 pl-2 border-l border-white/5 py-2">
                            <button 
                              onClick={() => handleEdit(t)} 
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-accent hover:bg-white/5 transition-colors active:scale-90"
                            >
                                <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => { if(confirm('Excluir?')) onDeleteTransaction(t.id); }} 
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-500 hover:bg-white/5 transition-colors active:scale-90"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
