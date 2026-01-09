
import React, { useState, useMemo, useCallback } from 'react';
import { Transaction, AssetType } from '../types';
import { Plus, Trash2, Calendar, Search, TrendingUp, TrendingDown, Pencil, Briefcase, Hash, DollarSign, X, Building2, BarChart3 } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';
// Fix: Use namespace import for VariableSizeList to resolve type error
import * as ReactWindow from 'react-window';

const List = ReactWindow.VariableSizeList;

const formatBRL = (val: number | undefined | null) => {
  const num = typeof val === 'number' ? val : 0;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatMonthYear = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  if (parts.length < 2) return dateStr;
  const monthIndex = parseInt(parts[1], 10) - 1;
  return `${months[monthIndex]} ${parts[0]}`;
};

const formatDayMonth = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  return dateStr;
};

// --- Tipos e Interfaces Auxiliares ---

interface TransactionsProps {
  transactions: Transaction[];
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  onUpdateTransaction: (id: string, transaction: Omit<Transaction, 'id'>) => void;
  onRequestDeleteConfirmation: (id: string) => void;
}

interface RowData {
  items: any[];
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
}

interface RowProps<T> {
    index: number;
    style: React.CSSProperties;
    data: T;
}

const areEqual = (prev: RowProps<RowData>, next: RowProps<RowData>) => {
    return (
        prev.index === next.index &&
        prev.style === next.style &&
        prev.data === next.data
    );
};

// --- Componente Row Otimizado (Fora do Componente Principal) ---

const TransactionRow = React.memo(({ index, style, data }: RowProps<RowData>) => {
  const item = data.items[index];

  if (item.type === 'header') {
    return (
      <div style={style} className="flex items-center justify-between px-1 pt-4 pb-1">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <h3 className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-[0.1em]">
            {formatMonthYear(item.monthKey)}
          </h3>
        </div>
        {item.totalInvested > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10">
            <span className="text-[9px] font-bold uppercase tracking-wider">Aporte: R$ {formatBRL(item.totalInvested)}</span>
          </div>
        )}
      </div>
    );
  }

  const t = item.data as Transaction;
  const isBuy = t.type === 'BUY';
  const isFII = t.assetType === AssetType.FII;

  return (
    <div style={style} className="px-1 py-1">
      <div className="group bg-white dark:bg-slate-900 rounded-2xl p-3 flex items-center justify-between shadow-sm active:scale-[0.98] transition-all border border-slate-200 dark:border-slate-800 h-full hover:shadow-md">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isBuy ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-500'}`}>
            {isBuy ? <TrendingUp className="w-4 h-4" strokeWidth={2.5} /> : <TrendingDown className="w-4 h-4" strokeWidth={2.5} />}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white tracking-tight leading-none">{t.ticker}</h4>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${isFII ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'}`}>
                {isFII ? 'FII' : 'Ação'}
              </span>
            </div>
            <p className={`text-[9px] font-bold uppercase tracking-[0.05em] ${isBuy ? 'text-emerald-600/70' : 'text-rose-600/70'}`}>
              {isBuy ? 'Compra' : 'Venda'} • {formatDayMonth(t.date)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-bold text-slate-900 dark:text-white tabular-nums tracking-tight mb-0.5">
              R$ {formatBRL(t.quantity * t.price)}
            </div>
            <div className="text-[9px] text-slate-400 font-medium tabular-nums leading-none">
              {t.quantity} <span className="text-[9px] opacity-50 mx-0.5">x</span> {formatBRL(t.price)}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <button onClick={() => data.onEdit(t)} className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-sky-500/10 hover:text-sky-500 transition-colors active:scale-90 border border-slate-100 dark:border-slate-700/50">
              <Pencil className="w-3 h-3" />
            </button>
            <button onClick={() => data.onDelete(t.id)} className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 transition-colors active:scale-90 border border-slate-100 dark:border-slate-700/50">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}, areEqual);


const TransactionsComponent: React.FC<TransactionsProps> = ({ transactions, onAddTransaction, onUpdateTransaction, onRequestDeleteConfirmation }) => {
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
    setForm({ ticker: '', type: 'BUY', quantity: '', price: '', date: new Date().toISOString().split('T')[0], assetType: AssetType.FII }); 
    setEditingId(null); 
  }, []);

  const handleOpenNew = () => { resetForm(); setShowForm(true); };
  
  const handleEdit = useCallback((t: Transaction) => { 
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
  }, []);
  
  const handleSubmit = (e: React.FormEvent) => { 
    e.preventDefault(); 
    const data = { 
      ticker: form.ticker.toUpperCase().trim(), 
      type: form.type, 
      quantity: Number(form.quantity.toString().replace(',', '.')), 
      price: Number(form.price.toString().replace(',', '.')), 
      date: form.date, 
      assetType: form.assetType 
    }; 
    if (editingId) onUpdateTransaction(editingId, data); 
    else onAddTransaction(data); 
    resetForm(); 
    setShowForm(false); 
  };

  // Prepara dados da lista
  const { flatTransactions, getItemSize } = useMemo(() => {
    const filtered = transactions
      .filter(t => t.ticker.toUpperCase().includes(searchTerm.toUpperCase()))
      .sort((a,b) => b.date.localeCompare(a.date));
    
    const groups: Record<string, { totalInvested: number, items: Transaction[] }> = {};
    
    filtered.forEach(t => {
      const monthKey = t.date.substring(0, 7); 
      if (!groups[monthKey]) groups[monthKey] = { totalInvested: 0, items: [] };
      groups[monthKey].items.push(t);
      if (t.type === 'BUY') groups[monthKey].totalInvested += (t.price * t.quantity);
    });
    
    const sortedMonthKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    const flatList: any[] = [];
    
    sortedMonthKeys.forEach(monthKey => {
      flatList.push({ type: 'header', monthKey, totalInvested: groups[monthKey].totalInvested });
      groups[monthKey].items.forEach(item => flatList.push({ type: 'item', data: item }));
    });
    
    const sizeFn = (index: number) => flatList[index].type === 'header' ? 45 : 84;
    return { flatTransactions: flatList, getItemSize: sizeFn };
  }, [transactions, searchTerm]);

  // Dados passados para o Row via itemData para evitar recriação de funções
  const itemData = useMemo(() => ({
    items: flatTransactions,
    onEdit: handleEdit,
    onDelete: onRequestDeleteConfirmation
  }), [flatTransactions, handleEdit, onRequestDeleteConfirmation]);

  return (
    <div className="pt-24 pb-28 px-5 max-w-lg mx-auto">
      <div className="sticky top-24 z-30 pt-2 pb-4 bg-slate-50 dark:bg-slate-950 -mx-5 px-5 transition-all">
         <div className="flex gap-3">
           <div className="relative flex-1 group">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-accent transition-colors" />
             <input type="text" className="w-full bg-white dark:bg-slate-900 pl-11 pr-4 py-3 rounded-2xl outline-none text-sm font-semibold placeholder:text-slate-400 focus:ring-4 focus:ring-accent/10 transition-all shadow-sm border border-slate-200 dark:border-slate-800" placeholder="Filtrar FIIs ou Ações..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
           </div>
           <button onClick={handleOpenNew} className="w-12 h-12 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center shrink-0">
             <Plus className="w-5 h-5" strokeWidth={3} />
           </button>
         </div>
      </div>
      
      <div className="h-[calc(100vh-190px)]"> 
        {flatTransactions.length > 0 ? (
          <List 
            height={window.innerHeight - 190} 
            itemCount={flatTransactions.length} 
            itemSize={getItemSize} 
            width="100%"
            itemData={itemData}
            style={{ paddingBottom: '120px' }} // Padding extra para o final da lista não ficar escondido
          >
            {TransactionRow}
          </List>
        ) : (
          <div className="py-24 text-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800/50 rounded-3xl flex items-center justify-center mx-auto mb-5">
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
              <div className="w-10 h-10 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500">
                <Plus className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-tight">{editingId ? 'Editar' : 'Nova Ordem'}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">FIIs & Ações</p>
              </div>
            </div>
            {editingId && (
              <button onClick={() => { setShowForm(false); resetForm(); }} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-3">
              <button type="button" onClick={() => setForm({...form, assetType: AssetType.FII})} className={`flex-1 p-3 rounded-2xl border transition-all flex flex-col items-center gap-1 ${form.assetType === AssetType.FII ? 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20 text-orange-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'}`}>
                <Building2 className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Fundo Imob.</span>
              </button>
              <button type="button" onClick={() => setForm({...form, assetType: AssetType.STOCK})} className={`flex-1 p-3 rounded-2xl border transition-all flex flex-col items-center gap-1 ${form.assetType === AssetType.STOCK ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'}`}>
                <BarChart3 className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Ação</span>
              </button>
            </div>
            
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button type="button" onClick={() => setForm({...form, type: 'BUY'})} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${form.type === 'BUY' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>Compra</button>
              <button type="button" onClick={() => setForm({...form, type: 'SELL'})} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${form.type === 'SELL' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>Venda</button>
            </div>
            
            <div className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-3">
              <div className="relative col-span-2">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input type="text" value={form.ticker} onChange={(e) => setForm({...form, ticker: e.target.value})} placeholder={form.assetType === AssetType.FII ? "MXRF11" : "PETR4"} className="w-full bg-slate-50 dark:bg-slate-800 pl-11 pr-4 py-3 rounded-xl outline-none font-bold uppercase text-base tracking-wider focus:ring-2 focus:ring-accent/20 transition-all placeholder:text-slate-300/50 text-center" required />
              </div>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input type="text" inputMode="decimal" value={form.quantity} onChange={(e) => setForm({...form, quantity: e.target.value})} placeholder="Qtd." className="w-full bg-slate-50 dark:bg-slate-800 pl-11 pr-4 py-3 rounded-xl outline-none font-bold text-center text-sm focus:ring-2 focus:ring-accent/20 transition-all placeholder:text-slate-300/50" required />
              </div>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input type="text" inputMode="decimal" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} placeholder="Preço" className="w-full bg-slate-50 dark:bg-slate-800 pl-11 pr-4 py-3 rounded-xl outline-none font-bold text-center text-sm focus:ring-2 focus:ring-accent/20 transition-all placeholder:text-slate-300/50" required />
              </div>
              <div className="relative col-span-2">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 pl-11 pr-4 py-3 rounded-xl outline-none font-bold text-sm text-center focus:ring-2 focus:ring-accent/20 transition-all dark:text-white" required />
              </div>
            </div>
            
            <button type="submit" className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-xl font-bold text-xs uppercase tracking-[0.2em] active:scale-95 transition-all shadow-xl hover:shadow-2xl">
              {editingId ? 'Salvar Alterações' : 'Confirmar Ordem'}
            </button>
          </form>
        </div>
      </SwipeableModal>
    </div>
  );
};

export const Transactions = React.memo(TransactionsComponent);
