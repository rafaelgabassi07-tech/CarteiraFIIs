
import React, { useState, useMemo, useCallback } from 'react';
import { Transaction, AssetType } from '../types';
import { Plus, Trash2, Calendar, Search, TrendingUp, TrendingDown, Pencil, Briefcase, Hash, DollarSign } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';

// Formatador seguro com tipagem explícita
const formatBRL = (val: number | undefined | null) => {
  const num = typeof val === 'number' ? val : 0;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Interface explícita
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
  onDeleteTransaction, 
  monthlyContribution 
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

  const filtered = useMemo(() => 
    transactions
      .filter(t => t.ticker.toUpperCase().includes(searchTerm.toUpperCase()))
      .sort((a,b) => b.date.localeCompare(a.date)), 
  [transactions, searchTerm]);

  return (
    <div className="pb-32 px-5 space-y-6">
      
      {/* Busca e Ação Sticky */}
      <div className="sticky top-24 z-30 pt-4 pb-2 bg-primary-light/95 dark:bg-primary-dark/95 backdrop-blur-md -mx-5 px-5">
         <div className="flex gap-4">
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
               className="w-14 h-14 bg-gradient-to-tr from-accent to-indigo-500 text-white rounded-[1.2rem] shadow-lg shadow-accent/30 active:scale-90 transition-all flex items-center justify-center shrink-0 hover:brightness-110"
             >
               <Plus className="w-6 h-6" strokeWidth={3} />
             </button>
         </div>
      </div>

      {/* Lista */}
      <div className="space-y-4">
        {filtered.map((t, i) => (
            <div key={t.id} className="group bg-white dark:bg-[#0f172a] rounded-[2rem] p-5 flex items-center justify-between border border-slate-100 dark:border-white/5 shadow-sm hover:border-slate-300 dark:hover:border-white/10 transition-all animate-fade-in-up" style={{ animationDelay: `${i * 30}ms` }}>
                <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center shrink-0 border ${t.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                        {t.type === 'BUY' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-slate-900 dark:text-white mb-0.5">{t.ticker}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.type === 'BUY' ? 'Compra' : 'Venda'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-sm font-black text-slate-900 dark:text-white tabular-nums">R$ {formatBRL(t.quantity * t.price)}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tabular-nums">{t.quantity}un @ {formatBRL(t.price)}</div>
                    </div>
                    <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(t)} className="p-1.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 hover:text-accent hover:scale-110 transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => confirm('Remover esta ordem?') && onDeleteTransaction(t.id)} className="p-1.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 hover:text-rose-500 hover:scale-110 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                </div>
            </div>
        ))}
        {filtered.length === 0 && (
           <div className="py-24 text-center">
             <Briefcase className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
             <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]">Nenhuma ordem encontrada</p>
           </div>
        )}
      </div>

      {/* Modal Formulário */}
      <SwipeableModal isOpen={showForm} onClose={() => { setShowForm(false); resetForm(); }}>
        <div className="bg-slate-50 dark:bg-[#0b1121] min-h-full">
            <div className="sticky top-0 bg-slate-50/80 dark:bg-[#0b1121]/80 backdrop-blur-xl p-6 z-20 border-b border-slate-200 dark:border-white/5">
                <h3 className="text-2xl font-black text-center text-slate-900 dark:text-white">{editingId ? 'Editar Ordem' : 'Nova Movimentação'}</h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-8">
              
              {/* Tipo de Operação */}
              <section>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Tipo de Operação</label>
                 <div className="flex bg-white dark:bg-[#0f172a] p-1.5 rounded-[1.5rem] border border-slate-200 dark:border-white/5 shadow-sm">
                    <button type="button" onClick={() => setForm({...form, type: 'BUY'})} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${form.type === 'BUY' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>Compra</button>
                    <button type="button" onClick={() => setForm({...form, type: 'SELL'})} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${form.type === 'SELL' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>Venda</button>
                 </div>
              </section>

              {/* Dados do Ativo */}
              <section className="bg-white dark:bg-[#0f172a] p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-sm">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Briefcase className="w-3 h-3" /> Detalhes do Ativo
                 </h4>
                 
                 <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide ml-1">Código (Ticker)</label>
                      <input 
                        type="text" 
                        value={form.ticker} 
                        onChange={(e) => setForm({...form, ticker: e.target.value})} 
                        placeholder="EX: PETR4" 
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4 rounded-xl outline-none font-black uppercase text-lg text-center tracking-wider focus:border-accent transition-colors" 
                        required 
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide ml-1 flex items-center gap-1"><Hash className="w-3 h-3" /> Qtd</label>
                        <input 
                          type="number" 
                          value={form.quantity} 
                          onChange={(e) => setForm({...form, quantity: e.target.value})} 
                          placeholder="0" 
                          className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4 rounded-xl outline-none font-black text-center text-lg focus:border-accent transition-colors" 
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide ml-1 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Preço</label>
                        <input 
                          type="number" 
                          step="0.01" 
                          value={form.price} 
                          onChange={(e) => setForm({...form, price: e.target.value})} 
                          placeholder="0,00" 
                          className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4 rounded-xl outline-none font-black text-center text-lg focus:border-accent transition-colors" 
                          required 
                        />
                      </div>
                    </div>
                 </div>
              </section>

              {/* Data */}
              <section>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block flex items-center gap-2"><Calendar className="w-3 h-3" /> Data da Execução</label>
                  <input 
                    type="date" 
                    value={form.date} 
                    onChange={(e) => setForm({...form, date: e.target.value})} 
                    className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/5 p-5 rounded-[1.5rem] outline-none font-bold text-center focus:border-accent transition-colors dark:text-white shadow-sm" 
                    required 
                  />
              </section>

              <button type="submit" className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-widest active:scale-95 transition-all shadow-xl hover:shadow-2xl">
                {editingId ? 'Salvar Alterações' : 'Adicionar Ordem'}
              </button>
            </form>
        </div>
      </SwipeableModal>

    </div>
  );
};
