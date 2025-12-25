import React, { useState, useMemo } from 'react';
import { Transaction, AssetType } from '../types';
import { Plus, Trash2, Calendar, X, Check, Search, TrendingUp, TrendingDown } from 'lucide-react';

interface TransactionsProps {
  transactions: Transaction[];
  onAddTransaction: (t: Omit<Transaction, 'id'>) => void;
  onDeleteTransaction: (id: string) => void;
}

export const Transactions: React.FC<TransactionsProps> = ({ transactions, onAddTransaction, onDeleteTransaction }) => {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Helper para obter data local no formato YYYY-MM-DD
  const getTodayLocal = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Form State
  const [ticker, setTicker] = useState('');
  const [type, setType] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(getTodayLocal());
  const [assetType, setAssetType] = useState<AssetType>(AssetType.FII);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker || !quantity || !price) return;
    
    onAddTransaction({
      ticker: ticker.toUpperCase(),
      type,
      quantity: Number(quantity),
      price: Number(price),
      date, // Salva como string YYYY-MM-DD
      assetType
    });
    // Reset
    setTicker('');
    setQuantity('');
    setPrice('');
    // Mantém a data atual ou reseta, conforme preferência. Mantendo atual para agilidade.
    setShowForm(false);
  };

  // Helper para formatar data visualmente sem conversão de timezone
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  // Helper para obter nome do mês/ano
  const getMonthYear = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    // Cria data definindo hora para meio-dia para evitar virada de dia em qualquer fuso
    const date = new Date(year, month - 1, day, 12, 0, 0); 
    const monthName = date.toLocaleString('pt-BR', { month: 'long' });
    return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} de ${year}`;
  };

  // 1. Filtrar e Ordenar
  const filteredTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => {
          // Ordenação por data (decrescente) e depois por ID para estabilidade
          if (b.date !== a.date) return b.date.localeCompare(a.date);
          return b.id.localeCompare(a.id);
      })
      .filter(t => t.ticker.toUpperCase().includes(searchTerm.toUpperCase()));
  }, [transactions, searchTerm]);

  // 2. Agrupar por Mês
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filteredTransactions.forEach(t => {
        const key = getMonthYear(t.date);
        if (!groups[key]) groups[key] = [];
        groups[key].push(t);
    });
    return groups;
  }, [filteredTransactions]);

  return (
    <div className="pb-28 pt-6 px-4 max-w-lg mx-auto relative min-h-screen">
      
      {/* Header Action */}
      <div className="flex justify-between items-center mb-6 sticky top-16 z-30 py-3 bg-primary/95 backdrop-blur-xl -mx-4 px-4 border-b border-white/5 shadow-sm transition-all animate-fade-in-up">
        <h2 className="text-white font-bold text-lg tracking-tight">Histórico</h2>
        <button 
          onClick={() => setShowForm(true)}
          className="bg-accent hover:bg-sky-400 text-slate-950 font-bold py-2.5 px-5 rounded-full flex items-center gap-2 text-xs transition-all shadow-lg shadow-accent/20 active:scale-95 hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" /> Nova
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-8 group animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-500 group-focus-within:text-accent transition-colors duration-300" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-3.5 border border-white/5 rounded-2xl leading-5 bg-secondary/40 text-slate-200 placeholder-slate-500 focus:outline-none focus:bg-secondary/60 focus:border-accent focus:ring-1 focus:ring-accent transition-all text-sm font-medium shadow-sm"
          placeholder="Buscar ativo (ex: MXRF11)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-white transition-colors"
          >
            <div className="bg-white/10 rounded-full p-0.5 hover:bg-white/20">
              <X className="h-3 w-3" />
            </div>
          </button>
        )}
      </div>

      {/* List */}
      <div className="space-y-8">
        {Object.keys(groupedTransactions).length === 0 ? (
           <div className="text-center py-16 border border-dashed border-white/10 rounded-3xl bg-white/5 animate-fade-in mx-2">
              {searchTerm ? (
                <>
                  <p className="text-slate-400 font-medium mb-1">Nenhum resultado encontrado</p>
                  <p className="text-slate-600 text-xs">Busca: "{searchTerm}"</p>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3">
                   <div className="p-4 bg-slate-800 rounded-full">
                     <Search className="w-6 h-6 text-slate-500" />
                   </div>
                   <p className="text-slate-500 font-medium">Nenhuma transação registrada.</p>
                </div>
              )}
           </div>
        ) : (
          (Object.entries(groupedTransactions) as [string, Transaction[]][]).map(([month, trans], groupIndex) => (
            <div key={month} className="space-y-4 animate-fade-in-up" style={{ animationDelay: `${groupIndex * 100 + 150}ms` }}>
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-2 sticky top-32 bg-primary/95 py-2 z-20 backdrop-blur-xl w-fit pr-4 rounded-r-lg border-y border-transparent">
                    {month}
                </h3>
                <div className="space-y-3">
                  {trans.map((t) => (
                      <div key={t.id} className="bg-secondary/40 backdrop-blur-md p-4 rounded-2xl border border-white/5 flex items-center justify-between hover:border-white/10 hover:bg-secondary/60 transition-all duration-300 group relative overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5">
                      <div className="flex items-center gap-4 relative z-10">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shadow-inner transition-transform group-hover:scale-110 duration-300 ${t.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' : 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20'}`}>
                              {t.type === 'BUY' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                          </div>
                          <div>
                              <div className="font-bold text-white text-base tracking-tight flex items-center gap-2">
                                  {t.ticker}
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wide border ${t.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                      {t.type === 'BUY' ? 'Compra' : 'Venda'}
                                  </span>
                              </div>
                              <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-1 font-medium">
                                  <Calendar className="w-3 h-3 text-slate-500" /> 
                                  {formatDate(t.date)}
                              </div>
                          </div>
                      </div>
                      <div className="flex items-center gap-4 relative z-10">
                          <div className="text-right">
                          <div className="text-white text-sm font-bold tabular-nums">
                              R$ {(t.quantity * t.price).toFixed(2)}
                          </div>
                          <div className="text-[11px] text-slate-500 tabular-nums font-medium">
                              {t.quantity} x R$ {t.price.toFixed(2)}
                          </div>
                          </div>
                          <button 
                              onClick={() => onDeleteTransaction(t.id)} 
                              className="p-2.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all active:scale-90"
                              aria-label="Deletar"
                          >
                              <Trash2 className="w-4 h-4" />
                          </button>
                      </div>
                      {/* Background gradient hint */}
                      <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-[40px] opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none ${t.type === 'BUY' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                      </div>
                  ))}
                </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity animate-fade-in" onClick={() => setShowForm(false)} />
          
          <div className="bg-slate-900 w-full max-w-sm rounded-t-[2rem] sm:rounded-3xl p-6 shadow-2xl border-t sm:border border-white/10 relative animate-slide-up z-10 ring-1 ring-white/5">
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-6 sm:hidden"></div>
            
            <div className="flex items-center justify-between mb-6">
                 <h3 className="text-xl font-bold text-white tracking-tight">Nova Transação</h3>
                 <button onClick={() => setShowForm(false)} className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors bg-white/5">
                     <X className="w-5 h-5" />
                 </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Toggle Type */}
              <div className="grid grid-cols-2 bg-slate-950 p-1.5 rounded-2xl border border-white/5">
                <button
                    type="button"
                    onClick={() => setType('BUY')}
                    className={`py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 duration-300 ${type === 'BUY' ? 'bg-emerald-500/20 text-emerald-400 shadow-sm ring-1 ring-emerald-500/20' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                >
                    <TrendingUp className="w-4 h-4" /> Compra
                </button>
                <button
                    type="button"
                    onClick={() => setType('SELL')}
                    className={`py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 duration-300 ${type === 'SELL' ? 'bg-rose-500/20 text-rose-400 shadow-sm ring-1 ring-rose-500/20' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                >
                    <TrendingDown className="w-4 h-4" /> Venda
                </button>
              </div>

              {/* Asset Type */}
               <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Tipo de Ativo</label>
                  <div className="grid grid-cols-2 gap-3">
                     <label className={`cursor-pointer border rounded-2xl p-3 flex items-center justify-center gap-2 transition-all duration-300 ${assetType === AssetType.FII ? 'bg-accent/10 border-accent/30 text-accent ring-1 ring-accent/20' : 'bg-slate-950 border-white/5 text-slate-400 hover:bg-white/5'}`}>
                        <input type="radio" name="assetType" className="hidden" checked={assetType === AssetType.FII} onChange={() => setAssetType(AssetType.FII)} />
                        <span className="text-sm font-bold">FII</span>
                     </label>
                     <label className={`cursor-pointer border rounded-2xl p-3 flex items-center justify-center gap-2 transition-all duration-300 ${assetType === AssetType.STOCK ? 'bg-purple-500/10 border-purple-500/30 text-purple-400 ring-1 ring-purple-500/20' : 'bg-slate-950 border-white/5 text-slate-400 hover:bg-white/5'}`}>
                        <input type="radio" name="assetType" className="hidden" checked={assetType === AssetType.STOCK} onChange={() => setAssetType(AssetType.STOCK)} />
                        <span className="text-sm font-bold">Ação</span>
                     </label>
                  </div>
               </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Ticker</label>
                <input 
                  type="text" 
                  value={ticker} 
                  onChange={(e) => setTicker(e.target.value)} 
                  placeholder="Ex: HGLG11" 
                  className="w-full bg-slate-950 text-white rounded-xl p-4 border border-white/5 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all uppercase font-bold tracking-wider placeholder:normal-case placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Qtd</label>
                   <input type="number" inputMode="numeric" min="0" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full bg-slate-950 text-white rounded-xl p-4 border border-white/5 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all font-medium tabular-nums placeholder:text-slate-600" required placeholder="0" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Preço (R$)</label>
                   <input type="number" inputMode="decimal" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full bg-slate-950 text-white rounded-xl p-4 border border-white/5 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all font-medium tabular-nums placeholder:text-slate-600" required placeholder="0,00" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Data</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-slate-950 text-white rounded-xl p-4 border border-white/5 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all text-sm font-medium" required />
              </div>

              <button type="submit" className="w-full py-4 rounded-xl bg-accent text-slate-950 hover:bg-sky-400 font-bold text-base shadow-lg shadow-accent/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 hover:-translate-y-0.5 duration-300">
                <Check className="w-5 h-5" /> Salvar Transação
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};