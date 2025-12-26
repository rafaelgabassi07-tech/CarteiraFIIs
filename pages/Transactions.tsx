
import React, { useState, useMemo } from 'react';
import { Transaction, AssetType } from '../types';
import { Plus, Trash2, Calendar, X, Search, TrendingUp, TrendingDown, Pencil, ArrowRight } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';

export const Transactions: React.FC<{ transactions: Transaction[], onAddTransaction: any, onUpdateTransaction: any, onDeleteTransaction: any, monthlyContribution: number }> = ({ transactions, onAddTransaction, onUpdateTransaction, onDeleteTransaction, monthlyContribution }) => {
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
    const data = { 
      ticker: ticker.toUpperCase().trim(), 
      type, 
      quantity: Number(quantity), 
      price: Number(price), 
      date, 
      assetType 
    }; 
    if (editingId) onUpdateTransaction(editingId, data); 
    else onAddTransaction(data); 
    resetForm(); 
    setShowForm(false); 
  };

  const filtered = useMemo(() => transactions.filter(t => t.ticker.toUpperCase().includes(searchTerm.toUpperCase())).sort((a,b) => b.date.localeCompare(a.date)), [transactions, searchTerm]);
  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="pb-32 pt-2 px-4 space-y-6">
      <div className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-slate-200 dark:border-white/5 flex items-center justify-between shadow-sm">
         <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent"><Calendar className="w-5 h-5" /></div><div><p className="text-[10px] font-black uppercase text-slate-400">Total no Mês</p><h3 className="text-slate-900 dark:text-white font-black text-base">R$ {formatCurrency(monthlyContribution)}</h3></div></div>
      </div>

      <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/[0.08] pl-10 pr-4 py-3.5 rounded-2xl outline-none text-sm font-bold placeholder:text-slate-400 text-slate-900 dark:text-white" placeholder="Pesquisar ativo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="w-12 h-12 bg-accent text-white rounded-2xl shadow-lg active:scale-90 transition-all flex items-center justify-center shrink-0"><Plus className="w-6 h-6" strokeWidth={3} /></button>
      </div>

      <div className="space-y-3">
        {filtered.map(t => (
            <div key={t.id} className="bg-white dark:bg-slate-800/40 rounded-2xl p-4 flex items-center justify-between border border-slate-200 dark:border-white/[0.03] shadow-sm">
                <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${t.type === 'BUY' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                        {t.type === 'BUY' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    </div>
                    <div><h4 className="font-black text-slate-900 dark:text-white text-sm">{t.ticker}</h4><p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t.quantity} un @ R$ {formatCurrency(t.price)} • {t.assetType}</p></div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right"><div className="text-sm font-black text-slate-900 dark:text-white">R$ {formatCurrency(t.quantity * t.price)}</div><div className="text-[9px] text-slate-400 font-bold uppercase">{t.date.split('-').reverse().slice(0,2).join('/')}</div></div>
                    <div className="flex flex-col gap-1">
                        <button onClick={() => handleEdit(t)} className="p-1 text-slate-400 hover:text-accent"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => confirm('Excluir?') && onDeleteTransaction(t.id)} className="p-1 text-slate-400 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                </div>
            </div>
        ))}
      </div>

      <SwipeableModal isOpen={showForm} onClose={() => { setShowForm(false); resetForm(); }}>
        <div className="px-6 pt-2 pb-10 bg-white dark:bg-secondary-dark min-h-full">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter mb-8">{editingId ? 'Editar Ordem' : 'Nova Ordem'}</h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Operação</label>
                <div className="flex bg-slate-100 dark:bg-white/[0.03] p-1.5 rounded-[1.5rem] border border-slate-200 dark:border-white/10">
                  <button type="button" onClick={() => setType('BUY')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${type === 'BUY' ? 'bg-emerald-500 text-white' : 'text-slate-500'}`}>Compra</button>
                  <button type="button" onClick={() => setType('SELL')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${type === 'SELL' ? 'bg-rose-500 text-white' : 'text-slate-500'}`}>Venda</button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoria do Ativo</label>
                <div className="flex bg-slate-100 dark:bg-white/[0.03] p-1.5 rounded-[1.5rem] border border-slate-200 dark:border-white/10">
                  <button type="button" onClick={() => setAssetType(AssetType.FII)} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${assetType === AssetType.FII ? 'bg-accent text-white' : 'text-slate-500'}`}>FII</button>
                  <button type="button" onClick={() => setAssetType(AssetType.STOCK)} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${assetType === AssetType.STOCK ? 'bg-accent text-white' : 'text-slate-500'}`}>Ação</button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ticker</label>
                  <input type="text" value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="EX: PETR4 ou HGLG11" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-5 rounded-2xl outline-none text-slate-900 dark:text-white font-black uppercase shadow-inner focus:border-accent transition-colors" required />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantidade</label>
                    <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-5 rounded-2xl outline-none text-slate-900 dark:text-white font-black shadow-inner" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preço Unitário</label>
                    <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-5 rounded-2xl outline-none text-slate-900 dark:text-white font-black shadow-inner" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data da Operação</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-5 rounded-2xl outline-none text-slate-500 font-bold shadow-inner" required />
                </div>
              </div>

              <button type="submit" className="w-full py-5 rounded-[2rem] bg-accent text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-accent/20 active:scale-95 transition-all mt-4">Salvar Operação</button>
            </form>
        </div>
      </SwipeableModal>
    </div>
  );
};
