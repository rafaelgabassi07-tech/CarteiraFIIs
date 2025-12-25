import React, { useState } from 'react';
import { Transaction, AssetType } from '../types';
import { Plus, Trash2, Calendar } from 'lucide-react';

interface TransactionsProps {
  transactions: Transaction[];
  onAddTransaction: (t: Omit<Transaction, 'id'>) => void;
  onDeleteTransaction: (id: string) => void;
}

export const Transactions: React.FC<TransactionsProps> = ({ transactions, onAddTransaction, onDeleteTransaction }) => {
  const [showForm, setShowForm] = useState(false);
  
  // Form State
  const [ticker, setTicker] = useState('');
  const [type, setType] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [assetType, setAssetType] = useState<AssetType>(AssetType.FII);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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

  const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto relative min-h-screen">
      
      {/* Header Action */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-white font-bold">Histórico</h2>
        <button 
          onClick={() => setShowForm(true)}
          className="bg-accent text-slate-900 hover:bg-sky-400 font-bold py-2 px-4 rounded-full flex items-center gap-2 text-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Nova
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {sortedTransactions.length === 0 ? (
           <p className="text-center text-gray-500 py-10">Nenhuma transação registrada.</p>
        ) : (
          sortedTransactions.map((t) => (
            <div key={t.id} className="bg-secondary p-4 rounded-xl border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${t.type === 'BUY' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                    {t.type === 'BUY' ? 'C' : 'V'}
                 </div>
                 <div>
                    <div className="font-bold text-white text-sm">{t.ticker}</div>
                    <div className="text-xs text-gray-400 flex items-center gap-1">
                       <Calendar className="w-3 h-3" /> {new Date(t.date).toLocaleDateString('pt-BR')}
                    </div>
                 </div>
              </div>
              <div className="text-right">
                <div className="text-white text-sm font-medium">
                  {t.quantity} x R$ {t.price.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500">
                  Total: R$ {(t.quantity * t.price).toFixed(2)}
                </div>
              </div>
              <button onClick={() => onDeleteTransaction(t.id)} className="ml-2 text-gray-600 hover:text-danger">
                 <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-white/10 animate-in slide-in-from-bottom-10 fade-in duration-300">
            <h3 className="text-xl font-bold text-white mb-4">Nova Transação</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Tipo</label>
                  <select value={type} onChange={(e) => setType(e.target.value as any)} className="w-full bg-slate-900 text-white rounded-lg p-3 border border-slate-700 outline-none focus:border-accent">
                    <option value="BUY">Compra</option>
                    <option value="SELL">Venda</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Ativo</label>
                  <select value={assetType} onChange={(e) => setAssetType(e.target.value as any)} className="w-full bg-slate-900 text-white rounded-lg p-3 border border-slate-700 outline-none focus:border-accent">
                    <option value={AssetType.FII}>FII</option>
                    <option value={AssetType.STOCK}>Ação</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400">Código (Ticker)</label>
                <input 
                  type="text" 
                  value={ticker} 
                  onChange={(e) => setTicker(e.target.value)} 
                  placeholder="Ex: HGLG11" 
                  className="w-full bg-slate-900 text-white rounded-lg p-3 border border-slate-700 outline-none focus:border-accent uppercase"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                   <label className="text-xs text-gray-400">Quantidade</label>
                   <input type="number" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full bg-slate-900 text-white rounded-lg p-3 border border-slate-700 outline-none focus:border-accent" required />
                </div>
                <div className="space-y-1">
                   <label className="text-xs text-gray-400">Preço (R$)</label>
                   <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full bg-slate-900 text-white rounded-lg p-3 border border-slate-700 outline-none focus:border-accent" required />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400">Data</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-slate-900 text-white rounded-lg p-3 border border-slate-700 outline-none focus:border-accent" required />
              </div>

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-lg bg-slate-700 text-white hover:bg-slate-600 font-medium">Cancelar</button>
                <button type="submit" className="flex-1 py-3 rounded-lg bg-accent text-slate-900 hover:bg-sky-400 font-bold">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};