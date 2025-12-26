
import React, { useState, useMemo } from 'react';
import { Transaction, AssetType } from '../types';
import { Plus, Trash2, Calendar, Search, TrendingUp, TrendingDown, Pencil } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';

// Formatador seguro com tipagem explícita
const formatBRL = (val: number | undefined | null) => {
  const num = typeof val === 'number' ? val : 0;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Interface explícita para corrigir erro de inferência no App.tsx
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

  const resetForm = () => { 
    setForm({
      ticker: '',
      type: 'BUY',
      quantity: '',
      price: '',
      date: new Date().toISOString().split('T')[0],
      assetType: AssetType.FII
    });
    setEditingId(null); 
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
    <div className="pb-32 px-4 space-y-6">
      {/* Resumo de Aportes */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-200 dark:border-white/5 flex items-center justify-between shadow-sm">
         <div className="flex items-center gap-4">
           <div className="w-11 h-11 rounded-2xl bg-accent/10 flex items-center justify-center text-accent"><Calendar className="w-5 h-5" /></div>
           <div>
             <p className="text-[10px] font-black uppercase text-slate-400">Investido no Mês</p>
             <h3 className="font-black text-lg">R$ {formatBRL(monthlyContribution)}</h3>
           </div>
         </div>
      </div>

      {/* Busca e Ação */}
      <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/[0.08] pl-10 pr-4 py-4 rounded-2xl outline-none text-sm font-bold placeholder:text-slate-400" 
              placeholder="Pesquisar ticker..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
          <button 
            onClick={() => { resetForm(); setShowForm(true); }} 
            className="w-14 h-14 bg-accent text-white rounded-2xl shadow-lg active:scale-90 transition-all flex items-center justify-center shrink-0"
          >
            <Plus className="w-7 h-7" strokeWidth={3} />
          </button>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {filtered.map(t => (
            <div key={t.id} className="bg-white dark:bg-slate-800/40 rounded-3xl p-5 flex items-center justify-between border border-slate-200 dark:border-white/[0.03] shadow-sm">
                <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${t.type === 'BUY' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                        {t.type === 'BUY' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-black text-sm">{t.ticker}</h4>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t.quantity} un @ R$ {formatBRL(t.price)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-5">
                    <div className="text-right">
                      <div className="text-sm font-black">R$ {formatBRL(t.quantity * t.price)}</div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase">{t.date.split('-').reverse().slice(0,2).join('/')}</div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <button onClick={() => handleEdit(t)} className="p-1 text-slate-400 hover:text-accent"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => confirm('Remover esta ordem?') && onDeleteTransaction(t.id)} className="p-1 text-slate-400 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                </div>
            </div>
        ))}
        {filtered.length === 0 && <div className="py-20 text-center text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]">Nenhuma ordem encontrada</div>}
      </div>

      {/* Modal Formulário */}
      <SwipeableModal isOpen={showForm} onClose={() => { setShowForm(false); resetForm(); }}>
        <div className="px-6 pt-2 pb-10 min-h-full">
            <h3 className="text-2xl font-black mb-8">{editingId ? 'Editar Ordem' : 'Nova Ordem'}</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="flex bg-slate-100 dark:bg-white/[0.03] p-1.5 rounded-2xl">
                <button type="button" onClick={() => setForm({...form, type: 'BUY'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${form.type === 'BUY' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500'}`}>Compra</button>
                <button type="button" onClick={() => setForm({...form, type: 'SELL'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${form.type === 'SELL' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-500'}`}>Venda</button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ativo</label>
                  <input 
                    type="text" 
                    value={form.ticker} 
                    onChange={(e) => setForm({...form, ticker: e.target.value})} 
                    placeholder="Ticker (ex: IVVB11)" 
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-5 rounded-2xl outline-none font-black uppercase" 
                    required 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantidade</label>
                    <input 
                      type="number" 
                      value={form.quantity} 
                      onChange={(e) => setForm({...form, quantity: e.target.value})} 
                      placeholder="0" 
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-5 rounded-2xl outline-none font-black" 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preço Un.</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={form.price} 
                      onChange={(e) => setForm({...form, price: e.target.value})} 
                      placeholder="0.00" 
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-5 rounded-2xl outline-none font-black" 
                      required 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data</label>
                  <input 
                    type="date" 
                    value={form.date} 
                    onChange={(e) => setForm({...form, date: e.target.value})} 
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-5 rounded-2xl outline-none font-bold" 
                    required 
                  />
                </div>
              </div>

              <button type="submit" className="w-full py-5 rounded-3xl bg-accent text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-accent/20 active:scale-95 transition-all">
                Finalizar Lançamento
              </button>
            </form>
        </div>
      </SwipeableModal>
    </div>
  );
};
