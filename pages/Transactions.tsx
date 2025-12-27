
import React, { useState, useMemo, useCallback } from 'react';
import { Transaction, AssetType } from '../types';
import { Plus, Trash2, Calendar, Search, TrendingUp, TrendingDown, Pencil, Briefcase, Hash, DollarSign, ArrowUpCircle } from 'lucide-react';
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
    <div className="pt-24 pb-28 px-5 space-y-6">
      
      <div className="sticky top-20 z-30 pt-4 pb-2 bg-primary-light/95 dark:bg-primary-dark/95 backdrop-blur-md -mx-5 px-5 transition-all">
         <div className="flex gap-3">
             <div className="relative flex-1 group">
               <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-accent transition-colors" />
               <input 
                 type="text" 
                 className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 pl-12 pr-5 py-4 rounded-[1.2rem] outline-none text-sm font-bold placeholder:text-slate-400 focus:border-accent/50 transition-all shadow-sm" 
                 placeholder="Buscar ordem..." 
                 value={searchTerm} 
                 onChange={(e) => setSearchTerm(e.target.value)} 
               />
             </div>
             <button 
               onClick={handleOpenNew} 
               className="w-14 h-14 bg-gradient-to-tr from-indigo-500 to-purple-600 text-white rounded-[1.2rem] shadow-lg shadow-indigo-500/30 active:scale-90 transition-all flex items-center justify-center shrink-0 hover:brightness-110"
             >
               <Plus className="w-6 h-6" strokeWidth={3} />
             </button>
         </div>
      </div>

      <div className="space-y-8 animate-fade-in">
        {sortedMonthKeys.map((monthKey, groupIdx) => {
            const group = groupedTransactions[monthKey];
            return (
                <div key={monthKey} className="animate-fade-in-up" style={{ animationDelay: `${groupIdx * 50}ms` }}>
                    <div className="flex items-center justify-between px-2 mb-3">
                        <h3 className="text-slate-500 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                           <Calendar className="w-3.5 h-3.5" />
                           {formatMonthYear(monthKey + '-01')}
                        </h3>
                        {group.totalInvested > 0 && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10">
                                <ArrowUpCircle className="w-3 h-3" />
                                <span className="text-[10px] font-black uppercase tracking-wide">R$ {formatBRL(group.totalInvested)}</span>
                            </div>
                        )}
                    </div>
                    
                    <div className="space-y-3">
                        {group.items.map((t) => (
                           <div key={t.id} className="group bg-white dark:bg-[#0f172a] rounded-[1.5rem] p-4 flex items-center justify-between border border-slate-100 dark:border-white/5 shadow-sm active:scale-[0.98] transition-all">
                              <div className="flex items-center gap-4">
                                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-colors ${t.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/10' : 'bg-rose-500/10 text-rose-500 border-rose-500/10'}`}>
                                      {t.type === 'BUY' ? <TrendingUp className="w-5 h-5" strokeWidth={2} /> : <TrendingDown className="w-5 h-5" strokeWidth={2} />}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-black text-base text-slate-900 dark:text-white">{t.ticker}</h4>
                                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-md uppercase tracking-wider">{t.date.split('-')[2]}</span>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.type === 'BUY' ? 'Compra' : 'Venda'}</p>
                                  </div>
                              </div>
                              <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <div className="text-sm font-black text-slate-900 dark:text-white tabular-nums tracking-tight">R$ {formatBRL(t.quantity * t.price)}</div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tabular-nums">{t.quantity} x {formatBRL(t.price)}</div>
                                  </div>
                                  <div className="flex gap-2">
                                      <button onClick={() => handleEdit(t)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-accent hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"><Pencil className="w-4 h-4" strokeWidth={2} /></button>
                                      <button onClick={() => confirm('Remover?') && onDeleteTransaction(t.id)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"><Trash2 className="w-4 h-4" strokeWidth={2} /></button>
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
             <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                <Briefcase className="w-8 h-8 text-slate-300 dark:text-slate-600" strokeWidth={1.5} />
             </div>
             <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]">Nenhuma ordem encontrada</p>
           </div>
        )}
      </div>

      <SwipeableModal isOpen={showForm} onClose={() => { setShowForm(false); resetForm(); }}>
        <div className="px-4 py-2">
            <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-indigo-500/10 rounded-[1.2rem] flex items-center justify-center text-indigo-500 border border-indigo-500/20 shadow-sm">
                    <Plus className="w-7 h-7" strokeWidth={2.5} />
                </div>
                <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{editingId ? 'Editar Ordem' : 'Nova Ordem'}</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Preencha os dados</p>
                </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <section>
                 <div className="flex bg-slate-100 dark:bg-white/5 p-1.5 rounded-[1.5rem] border border-slate-200 dark:border-white/5">
                    <button type="button" onClick={() => setForm({...form, type: 'BUY'})} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${form.type === 'BUY' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>Compra</button>
                    <button type="button" onClick={() => setForm({...form, type: 'SELL'})} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${form.type === 'SELL' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>Venda</button>
                 </div>
              </section>

              <section className="bg-white dark:bg-[#0f172a] p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-sm">
                 <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Briefcase className="w-3 h-3" /> Ativo</label>
                      <input 
                        type="text" 
                        value={form.ticker} 
                        onChange={(e) => setForm({...form, ticker: e.target.value})} 
                        placeholder="EX: PETR4" 
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 rounded-2xl outline-none font-black uppercase text-xl text-center tracking-wider focus:border-accent transition-colors" 
                        required 
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Hash className="w-3 h-3" /> Qtd</label>
                        <input 
                          type="number" 
                          value={form.quantity} 
                          onChange={(e) => setForm({...form, quantity: e.target.value})} 
                          placeholder="0" 
                          className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 rounded-2xl outline-none font-black text-center text-xl focus:border-accent transition-colors" 
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><DollarSign className="w-3 h-3" /> Preço</label>
                        <input 
                          type="number" 
                          step="0.01" 
                          value={form.price} 
                          onChange={(e) => setForm({...form, price: e.target.value})} 
                          placeholder="0,00" 
                          className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 rounded-2xl outline-none font-black text-center text-xl focus:border-accent transition-colors" 
                          required 
                        />
                      </div>
                    </div>
                 </div>
              </section>

              <section>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block flex items-center gap-2 ml-1"><Calendar className="w-3 h-3" /> Data da Execução</label>
                  <input 
                    type="date" 
                    value={form.date} 
                    onChange={(e) => setForm({...form, date: e.target.value})} 
                    className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/5 p-5 rounded-[1.5rem] outline-none font-bold text-center focus:border-accent transition-colors dark:text-white shadow-sm" 
                    required 
                  />
              </section>

              <button type="submit" className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl hover:shadow-2xl">
                {editingId ? 'Salvar Alterações' : 'Adicionar Ordem'}
              </button>
            </form>
        </div>
      </SwipeableModal>

    </div>
  );
};
