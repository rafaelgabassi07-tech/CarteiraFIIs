import React, { useState } from 'react';
import { Transaction, AssetType } from '../types';
import { Plus, Trash2, Calendar, X, Check, Search } from 'lucide-react';

interface TransactionsProps {
  transactions: Transaction[];
  onAddTransaction: (t: Omit<Transaction, 'id'>) => void;
  onDeleteTransaction: (id: string) => void;
}

export const Transactions: React.FC<TransactionsProps> = ({ transactions, onAddTransaction, onDeleteTransaction }) => {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [ticker, setTicker] = useState('');
  const [type, setType] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [assetType, setAssetType] = useState<AssetType>(AssetType.FII);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker || !quantity || !price) return;
    
    onAddTransaction({
      ticker: ticker.toUpperCase(),
      type,
      quantity: Number(quantity),
      price: Number(price),
      date,
      assetType
    });
    // Reset
    setTicker('');
    setQuantity('');
    setPrice('');
    setShowForm(false);
  };

  // 1. Sort by date desc
  const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // 2. Filter by Search Term
  const filteredTransactions = sortedTransactions.filter(t => 
    t.ticker.toUpperCase().includes(searchTerm.toUpperCase())
  );

  return (
    <div className="pb-28 pt-6 px-4 max-w-lg mx-auto relative min-h-screen">
      
      {/* Header Action */}
      <div className="flex justify-between items-center mb-4 sticky top-16 z-30 py-3 bg-primary/95 backdrop-blur-xl -mx-4 px-4 border-b border-white/5">
        <h2 className="text-white font-bold text-lg tracking-tight">Histórico</h2>
        <button 
          onClick={() => setShowForm(true)}
          className="bg-accent hover:bg-sky-400 text-slate-950 font-bold py-2 px-4 rounded-full flex items-center gap-2 text-xs transition-all shadow-lg shadow-accent/20 active:scale-95"
        >
          <Plus className="w-4 h-4" /> Nova
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6 group">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-500 group-focus-within:text-accent transition-colors" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-3 border border-white/5 rounded-xl leading-5 bg-secondary/40 text-slate-200 placeholder-slate-500 focus:outline-none focus:bg-secondary/60 focus:border-accent focus:ring-1 focus:ring-accent transition-all text-sm font-medium"
          placeholder="Buscar ativo (ex: MXRF11)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-white"
          >
            <div className="bg-white/10 rounded-full p-0.5">
              <X className="h-3 w-3" />
            </div>
          </button>
        )}
      </div>

      {/* List */}
      <div className="space-y-3 animate-slide-up">
        {filteredTransactions.length === 0 ? (
           <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl bg-white/5">
              {searchTerm ? (
                <>
                  <p className="text-slate-400 font-medium mb-1">Nenhum resultado encontrado</p>
                  <p className="text-slate-600 text-xs">Busca: "{searchTerm}"</p>
                </>
              ) : (
                <p className="text-slate-500 font-medium">Nenhuma transação registrada.</p>
              )}
           </div>
        ) : (
          filteredTransactions.map((t) => (
            <div key={t.id} className="bg-secondary/40 backdrop-blur-sm p-4 rounded-xl border border-white/5 flex items-center justify-between hover:border-white/10 transition-colors group">
              <div className="flex items-center gap-4">
                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-sm ${t.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' : 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20'}`}>
                    {t.type === 'BUY' ? 'C' : 'V'}
                 </div>
                 <div>
                    <div className="font-bold text-white text-base tracking-tight">{t.ticker}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                       <Calendar className="w-3 h-3 text-slate-500" /> 
                       {new Date(t.date).toLocaleDateString('pt-BR')}
                    </div>
                 </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-white text-sm font-medium tabular-nums">
                    {t.quantity} x R$ {t.price.toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-500 tabular-nums font-medium">
                    Total: R$ {(t.quantity * t.price).toFixed(2)}
                  </div>
                </div>
                <button 
                    onClick={() => onDeleteTransaction(t.id)} 
                    className="p-2 text-slate-600 hover:text-white hover:bg-rose-500 rounded-lg transition-all"
                    aria-label="Deletar"
                >
                   <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={() => setShowForm(false)} />
          
          <div className="bg-slate-900 w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border-t sm:border border-white/10 relative animate-slide-up z-10">
            <div className="flex items-center justify-between mb-6">
                 <h3 className="text-xl font-bold text-white tracking-tight">Nova Transação</h3>
                 <button onClick={() => setShowForm(false)} className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                     <X className="w-6 h-6" />
                 </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Toggle Type */}
              <div className="grid grid-cols-2 bg-slate-950 p-1 rounded-xl border border-white/5">
                <button
                    type="button"
                    onClick={() => setType('BUY')}
                    className={`py-2 rounded-lg text-sm font-bold transition-all ${type === 'BUY' ? 'bg-emerald-500/20 text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Compra
                </button>
                <button
                    type="button"
                    onClick={() => setType('SELL')}
                    className={`py-2 rounded-lg text-sm font-bold transition-all ${type === 'SELL' ? 'bg-rose-500/20 text-rose-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Venda
                </button>
              </div>

              {/* Asset Type */}
               <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Tipo de Ativo</label>
                  <div className="grid grid-cols-2 gap-3">
                     <label className={`cursor-pointer border border-white/5 rounded-xl p-3 flex items-center justify-center gap-2 transition-all ${assetType === AssetType.FII ? 'bg-accent/10 border-accent/30 text-accent' : 'bg-slate-950 text-slate-400'}`}>
                        <input type="radio" name="assetType" className="hidden" checked={assetType === AssetType.FII} onChange={() => setAssetType(AssetType.FII)} />
                        <span className="text-sm font-bold">FII</span>
                     </label>
                     <label className={`cursor-pointer border border-white/5 rounded-xl p-3 flex items-center justify-center gap-2 transition-all ${assetType === AssetType.STOCK ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 'bg-slate-950 text-slate-400'}`}>
                        <input type="radio" name="assetType" className="hidden" checked={assetType === AssetType.STOCK} onChange={() => setAssetType(AssetType.STOCK)} />
                        <span className="text-sm font-bold">Ação</span>
                     </label>
                  </div>
               </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Ticker</label>
                <input 
                  type="text" 
                  value={ticker} 
                  onChange={(e) => setTicker(e.target.value)} 
                  placeholder="Ex: HGLG11" 
                  className="w-full bg-slate-950 text-white rounded-xl p-3.5 border border-white/5 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all uppercase font-bold tracking-wider placeholder:normal-case placeholder:font-normal placeholder:tracking-normal"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                   <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Qtd</label>
                   <input type="number" inputMode="numeric" min="0" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full bg-slate-950 text-white rounded-xl p-3.5 border border-white/5 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all font-medium tabular-nums" required placeholder="0" />
                </div>
                <div className="space-y-1.5">
                   <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Preço (R$)</label>
                   <input type="number" inputMode="decimal" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full bg-slate-950 text-white rounded-xl p-3.5 border border-white/5 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all font-medium tabular-nums" required placeholder="0,00" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Data</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-slate-950 text-white rounded-xl p-3.5 border border-white/5 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all text-sm font-medium" required />
              </div>

              <button type="submit" className="w-full py-4 rounded-xl bg-accent text-slate-950 hover:bg-sky-400 font-bold text-base shadow-lg shadow-accent/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4">
                <Check className="w-5 h-5" /> Salvar Transação
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};