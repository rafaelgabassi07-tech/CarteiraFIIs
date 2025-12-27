
import React, { useState, useMemo, useCallback } from 'react';
import { Transaction, AssetType } from '../types';
import { Plus, Trash2, Calendar, Search, TrendingUp, TrendingDown, Pencil, Briefcase, Hash, DollarSign, X } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';

const formatBRL = (val: number | undefined | null) => {
  const num = typeof val === 'number' ? val : 0;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatMonthYear = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

interface TransactionsProps {
  transactions: Transaction[];
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  onUpdateTransaction: (id: string, transaction: Omit<Transaction, 'id'>) => void;
  onDeleteTransaction: (id: string) => void;
  monthlyContribution: number;
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
  
  const [form, setForm] = useState({
    ticker: '',
    type: 'BUY' as 'BUY' | 'SELL',
    quantity: '',
    price: '',
    date: new Date().toISOString().split('T')[0],
    assetType: AssetType.FII
  });

  const resetForm = useCallback(() => { 
    setForm({
      ticker: '',
      type: 'BUY',
      quantity: '',
      price: '',
      date: new Date().toISOString().split('T')[0],
      assetType: AssetType.FII
    });
    setEditingId(null); 
  }, []);

  const handleOpenNew = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (t: Transaction) => { 
    setForm({
      ticker: t.ticker,
      type: t.type,
      quantity: t.quantity.toString(),
      price: t.price.toString(),
      date: t.date,
      assetType: t.assetType
    });
    setEditingId(t.id); 
    setShowForm(true); 
  };

  const handleSubmit = (e: React.FormEvent) => { 
    e.preventDefault(); 
    const data = { 
      ticker: form.ticker.toUpperCase().trim(), 
      type: form.type, 
      quantity: Number(form.quantity), 
      price: Number(form.price), 
      date: form.date, 
      assetType: form.assetType 
    }; 
    if (editingId) onUpdateTransaction(editingId, data); 
    else onAddTransaction(data); 
    resetForm(); 
    setShowForm(false); 
  };

  const groupedTransactions = useMemo(() => {
    const filtered = transactions
      .filter(t => t.ticker.toUpperCase().includes(searchTerm.toUpperCase()))
      .sort((a,b) => b.date.localeCompare(a.date));

    const groups: Record<string, { totalInvested: number, items: Transaction[] }> = {};

    filtered.forEach(t => {
      const monthKey = t.date.substring(0, 7); 
      if (!groups[monthKey]) {
        groups[monthKey] = { totalInvested: 0, items: [] };
      }
      groups[monthKey].items.push(t);
      if (t.type === 'BUY') {
        groups[monthKey].totalInvested += (t.price * t.quantity);
      }
    });

    return groups;
  }, [transactions, searchTerm]);

  const sortedMonthKeys = Object.keys(groupedTransactions).sort((a, b) => b.localeCompare(a));

  return (
    <div className="pt-24 pb-28 px-5 space-y-4 max-w-lg mx-auto">
      
      {/* Barra de Busca e Botão Novo Otimizados - Sem Bordas */}
      <div className="sticky top-24 z-30 pt-2 pb-4 bg-slate-100/95 dark:bg-[#020617]/95 backdrop-blur-md -mx-5 px-5 transition-all">
         <div className="flex gap-3">
             <div className="relative flex-1 group">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-accent transition-colors" />
               <input 
                 type="text" 
                 className="w-full bg-white dark:bg-white/5 pl-11 pr-4 py-3 rounded-2xl outline-none text-sm font-semibold placeholder:text-slate-400 focus:ring-4 focus:ring-accent/10 transition-all shadow-sm border border-slate-200/50 dark:border-white/5" 
                 placeholder="Filtrar..." 
                 value={searchTerm} 
                 onChange={(e) => setSearchTerm(e.target.value)} 
               />
             </div>
             <button 
               onClick={handleOpenNew} 
               className="w-12 h-12 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center shrink-0"
             >
               <Plus className="w-5 h-5" strokeWidth={3} />
             </button>
         </div>
      </div>

      <div className="space-y-6 animate-fade-in">
        {sortedMonthKeys.map((monthKey, groupIdx) => {
            const group = groupedTransactions[monthKey];
            return (
                <div key={monthKey} className="animate-fade-in-up" style={{ animationDelay: `${groupIdx * 50}ms` }}>
                    <div className="flex items-center justify-between px-1 mb-3">
                        <div className="flex items-center gap-2">
                           <Calendar className="w-3.5 h-3.5 text-slate-400" />
                           <h3 className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-[0.1em]">
                              {formatMonthYear(monthKey + '-01')}
                           </h3>
                        </div>
                        {group.totalInvested > 0 && (
                            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/5 text-emerald-600 dark:text-emerald-400">
                                <span className="text-[9px] font-bold uppercase tracking-wider">Aporte: R$ {formatBRL(group.totalInvested)}</span>
                            </div>
                        )}
                    </div>
                    
                    <div className="space-y-2">
                        {group.items.map((t) => (
                           <div key={t.id} className="group bg-white dark:bg-[#0f172a] rounded-2xl p-3 flex items-center justify-between shadow-sm active:scale-[0.99] transition-all border border-slate-200/50 dark:border-white/5">
                              <div className="flex items-center gap-3">
                                  {/* Indicador de Tipo Compacto - Sem Borda */}
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${t.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                      {t.type === 'BUY' ? <TrendingUp className="w-4 h-4" strokeWidth={2.5} /> : <TrendingDown className="w-4 h-4" strokeWidth={2.5} />}
                                  </div>
                                  
                                  {/* Info Ativo Refinado */}
                                  <div>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <h4 className="font-bold text-sm text-slate-900 dark:text-white tracking-tight leading-none">{t.ticker}</h4>
                                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded uppercase tracking-wider">{t.date.split('-')[2]}</span>
                                    </div>
                                    <p className={`text-[9px] font-bold uppercase tracking-[0.05em] ${t.type === 'BUY' ? 'text-emerald-600/70' : 'text-rose-600/70'}`}>
                                        {t.type === 'BUY' ? 'Compra' : 'Venda'}
                                    </p>
                                  </div>
                              </div>

                              <div className="flex items-center gap-3">
                                  {/* Valores Organizados */}
                                  <div className="text-right">
                                    <div className="text-sm font-bold text-slate-900 dark:text-white tabular-nums tracking-tight mb-0.5">R$ {formatBRL(t.quantity * t.price)}</div>
                                    <div className="text-[9px] text-slate-400 font-medium tabular-nums leading-none">
                                        {t.quantity} <span className="text-[9px] opacity-50 mx-0.5">x</span> {formatBRL(t.price)}
                                    </div>
                                  </div>
                                  
                                  {/* Ações Compactas */}
                                  <div className="flex flex-col gap-1">
                                      <button onClick={() => handleEdit(t)} className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-50 dark:bg-white/5 text-slate-400 hover:bg-accent/10 hover:text-accent transition-colors active:scale-90"><Pencil className="w-3 h-3" /></button>
                                      <button onClick={() => confirm('Deseja excluir esta ordem?') && onDeleteTransaction(t.id)} className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-50 dark:bg-white/5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 transition-colors active:scale-90"><Trash2 className="w-3 h-3" /></button>
                                  </div>
                              </div>
                           </div>
                        ))}
                    </div>
                </div>
            );
        })}

        {sortedMonthKeys.length === 0 && (
           <div className="py-24 text-center">
             <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-5">
                <Briefcase className="w-6 h-6 text-slate-300" strokeWidth={1.5} />
             </div>
             <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Nenhuma ordem encontrada</p>
           </div>
        )}
      </div>

      <SwipeableModal isOpen={showForm} onClose={() => { setShowForm(false); resetForm(); }}>
        <div className="px-4 py-2 pb-6">
            <div className="flex items-center justify-between mb-6 px-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500"><Plus className="w-5 h-5" strokeWidth={2.5} /></div>
                    <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-tight">{editingId ? 'Editar' : 'Nova Ordem'}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Movimentação</p>
                    </div>
                </div>
                {editingId && (
                    <button onClick={() => { setShowForm(false); resetForm(); }} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 text-slate-400 flex items-center justify-center">
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Toggle Compacto */}
              <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
                 <button type="button" onClick={() => setForm({...form, type: 'BUY'})} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${form.type === 'BUY' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>Compra</button>
                 <button type="button" onClick={() => setForm({...form, type: 'SELL'})} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${form.type === 'SELL' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>Venda</button>
              </div>

              {/* Grid de Inputs Compacto */}
              <div className="bg-white dark:bg-[#0f172a] p-4 rounded-[2rem] shadow-sm border border-slate-100 dark:border-white/5 grid grid-cols-2 gap-3">
                 
                 {/* Linha 1: Ticker e Data */}
                 <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1"><Briefcase className="w-3 h-3" /> Ticker</label>
                    <input 
                      type="text" 
                      value={form.ticker} 
                      onChange={(e) => setForm({...form, ticker: e.target.value})} 
                      placeholder="XXXX11" 
                      className="w-full bg-slate-50 dark:bg-black/20 px-3 py-3 rounded-xl outline-none font-bold uppercase text-sm tracking-wider focus:ring-2 focus:ring-accent/20 transition-all placeholder:text-slate-300/50 text-center" 
                      required 
                    />
                 </div>

                 <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Data</label>
                    <input 
                      type="date" 
                      value={form.date} 
                      onChange={(e) => setForm({...form, date: e.target.value})} 
                      className="w-full bg-slate-50 dark:bg-black/20 px-3 py-3 rounded-xl outline-none font-bold text-sm text-center focus:ring-2 focus:ring-accent/20 transition-all dark:text-white" 
                      required 
                    />
                 </div>
                 
                 {/* Linha 2: Quantidade e Preço */}
                 <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1"><Hash className="w-3 h-3" /> Qtd</label>
                    <input 
                      type="number" 
                      value={form.quantity} 
                      onChange={(e) => setForm({...form, quantity: e.target.value})} 
                      placeholder="0" 
                      className="w-full bg-slate-50 dark:bg-black/20 px-3 py-3 rounded-xl outline-none font-bold text-center text-sm focus:ring-2 focus:ring-accent/20 transition-all placeholder:text-slate-300/50" 
                      required 
                    />
                 </div>

                 <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Preço</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={form.price} 
                      onChange={(e) => setForm({...form, price: e.target.value})} 
                      placeholder="0,00" 
                      className="w-full bg-slate-50 dark:bg-black/20 px-3 py-3 rounded-xl outline-none font-bold text-center text-sm focus:ring-2 focus:ring-accent/20 transition-all placeholder:text-slate-300/50" 
                      required 
                    />
                 </div>
              </div>

              <button type="submit" className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-xl font-bold text-xs uppercase tracking-[0.2em] active:scale-95 transition-all shadow-xl hover:shadow-2xl">
                {editingId ? 'Salvar Alterações' : 'Confirmar'}
              </button>
            </form>
        </div>
      </SwipeableModal>

    </div>
  );
};
