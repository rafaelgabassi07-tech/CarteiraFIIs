
import React, { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Plus, Hash, Trash2, Save, X, ArrowRightLeft, Building2, CandlestickChart, Filter, Check, Calendar, CheckSquare, Search, ChevronDown } from 'lucide-react';
import { SwipeableModal, ConfirmationModal } from '../components/Layout';
import { Transaction, AssetType } from '../types';
import { supabase } from '../services/supabase';

const formatBRL = (val: number, privacy = false) => {
  if (privacy) return '••••••';
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatMonthHeader = (monthKey: string) => {
    try {
        const [year, month] = monthKey.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    } catch {
        return monthKey;
    }
};

const TransactionsSummary = ({ transactions, privacyMode }: { transactions: Transaction[], privacyMode: boolean }) => {
    const { totalInvested, totalSold, netFlow } = useMemo(() => {
        let invested = 0;
        let sold = 0;
        transactions.forEach(t => {
            const val = t.quantity * t.price;
            if (t.type === 'BUY') invested += val;
            else sold += val;
        });
        return { totalInvested: invested, totalSold: sold, netFlow: invested - sold };
    }, [transactions]);

    return (
        <div className="flex gap-3 mb-6 overflow-x-auto no-scrollbar px-1 snap-x">
            <div className="min-w-[120px] flex-1 bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm snap-start">
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Compras</p>
                <p className="text-sm font-black text-zinc-900 dark:text-white truncate">{formatBRL(totalInvested, privacyMode)}</p>
            </div>
            <div className="min-w-[120px] flex-1 bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm snap-start">
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Vendas</p>
                <p className="text-sm font-black text-zinc-900 dark:text-white truncate">{formatBRL(totalSold, privacyMode)}</p>
            </div>
            <div className="min-w-[120px] flex-1 bg-zinc-100 dark:bg-zinc-800 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-sm snap-start">
                <p className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1">Fluxo Líquido</p>
                <p className="text-sm font-black text-zinc-900 dark:text-white truncate">{formatBRL(netFlow, privacyMode)}</p>
            </div>
        </div>
    );
};

const TransactionRow = React.memo(({ index, data }: any) => {
  const item = data.items[index];
  const privacyMode = data.privacyMode;
  const isSelectionMode = data.isSelectionMode;
  const isSelected = data.selectedIds.has(item.data?.id);
  
  if (item.type === 'header') {
      return (
          <div className="sticky top-[130px] z-10 py-2 bg-primary-light/95 dark:bg-primary-dark/95 backdrop-blur-md -mx-4 px-4 border-b border-zinc-100 dark:border-zinc-800/50 mb-1 mt-2">
              <h3 className="text-xs font-black text-zinc-900 dark:text-white flex justify-between items-center">
                  {formatMonthHeader(item.monthKey)}
                  <span className={`text-[9px] px-2 py-0.5 rounded-full ${item.monthlyNet >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'}`}>
                      {item.monthlyNet > 0 ? '+' : ''}{formatBRL(item.monthlyNet, privacyMode)}
                  </span>
              </h3>
          </div>
      );
  }

  const t = item.data;
  const isBuy = t.type === 'BUY';
  const totalValue = t.price * t.quantity;
  
  return (
      <button 
        onClick={() => isSelectionMode ? data.onToggleSelect(t.id) : data.onRowClick(t)}
        className={`w-full text-left py-3 px-1 flex items-center justify-between group transition-all duration-200 border-b border-dashed border-zinc-200 dark:border-zinc-800 last:border-0 ${
            isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/10 -mx-2 px-3 rounded-lg' : ''
        }`}
      >
          <div className="flex items-center gap-3">
              {isSelectionMode ? (
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all border ${isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-transparent border-zinc-300 dark:border-zinc-600'}`}>
                      {isSelected && <Check className="w-3 h-3" strokeWidth={3} />}
                  </div>
              ) : (
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-[10px] font-black border ${isBuy ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/10 dark:text-emerald-400 dark:border-emerald-900/20' : 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/10 dark:text-rose-400 dark:border-rose-900/20'}`}>
                      {isBuy ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  </div>
              )}
              
              <div>
                  <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-zinc-900 dark:text-white tracking-tight">
                          {t.ticker}
                      </h4>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${t.assetType === AssetType.FII ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400'}`}>
                          {t.assetType === AssetType.FII ? 'FII' : 'AÇÃO'}
                      </span>
                  </div>
                  <p className="text-[10px] font-medium text-zinc-400 mt-0.5">
                      {t.date.split('-').reverse().slice(0,2).join('/')} • {t.quantity} un x {t.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
              </div>
          </div>
          
          <div className="text-right">
              <p className={`text-sm font-black tracking-tight ${isBuy ? 'text-zinc-900 dark:text-white' : 'text-zinc-900 dark:text-white'}`}>
                  {formatBRL(totalValue, privacyMode)}
              </p>
              <p className={`text-[9px] font-bold uppercase tracking-wider ${isBuy ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {isBuy ? 'Compra' : 'Venda'}
              </p>
          </div>
      </button>
  );
});

interface TransactionsProps {
    transactions: Transaction[];
    onAddTransaction: (t: Omit<Transaction, 'id'>) => Promise<void>;
    onUpdateTransaction: (id: string, t: Partial<Transaction>) => Promise<void>;
    onRequestDeleteConfirmation: (id: string) => void;
    privacyMode?: boolean;
}

type FilterOption = 'ALL' | 'BUY' | 'SELL' | 'FII' | 'STOCK';

const TransactionsComponent: React.FC<TransactionsProps> = ({ transactions, onAddTransaction, onUpdateTransaction, onRequestDeleteConfirmation, privacyMode = false }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<FilterOption>('ALL');
    const [isSaving, setIsSaving] = useState(false);
    
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

    // Form states
    const [ticker, setTicker] = useState('');
    const [type, setType] = useState<'BUY' | 'SELL'>('BUY');
    const [assetType, setAssetType] = useState<AssetType>(AssetType.FII);
    const [quantity, setQuantity] = useState('');
    const [price, setPrice] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    
    const estimatedTotal = (parseFloat(quantity) || 0) * (parseFloat(price) || 0);

    const filteredTransactions = useMemo(() => {
        if (activeFilter === 'ALL') return transactions;
        return transactions.filter(t => {
            if (activeFilter === 'BUY') return t.type === 'BUY';
            if (activeFilter === 'SELL') return t.type === 'SELL';
            if (activeFilter === 'FII') return t.assetType === AssetType.FII;
            if (activeFilter === 'STOCK') return t.assetType === AssetType.STOCK;
            return true;
        });
    }, [transactions, activeFilter]);

    const flatTransactions = useMemo(() => {
        const sorted = [...filteredTransactions].sort((a: any,b: any) => b.date.localeCompare(a.date));
        const groups: any = {};
        
        sorted.forEach((t: any) => {
            const k = t.date.substring(0, 7);
            if (!groups[k]) groups[k] = { items: [], totalNet: 0 };
            groups[k].items.push(t);
            const val = t.price * t.quantity;
            if (t.type === 'BUY') groups[k].totalNet += val; 
            else groups[k].totalNet -= val; 
        });

        const list: any[] = [];
        Object.keys(groups).sort((a,b) => b.localeCompare(a)).forEach(k => {
            list.push({ type: 'header', monthKey: k, monthlyNet: groups[k].totalNet });
            groups[k].items.forEach((t: any) => list.push({ type: 'item', data: t }));
        });
        return list; 
    }, [filteredTransactions]);

    const handleOpenAdd = () => {
        setEditingId(null); setTicker(''); setType('BUY'); setAssetType(AssetType.FII);
        setQuantity(''); setPrice(''); setDate(new Date().toISOString().split('T')[0]);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (t: Transaction) => {
        setEditingId(t.id); setTicker(t.ticker); setType(t.type); setAssetType(t.assetType || AssetType.FII);
        setQuantity(String(t.quantity)); setPrice(String(t.price)); setDate(t.date.split('T')[0]);
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!ticker || !quantity || !price || !date || isSaving) return;
        setIsSaving(true);
        const payload = { ticker: ticker.toUpperCase(), type, assetType, quantity: Number(quantity.replace(',', '.')), price: Number(price.replace(',', '.')), date };
        try {
            if (editingId) await onUpdateTransaction(editingId, payload);
            else await onAddTransaction(payload);
            setIsModalOpen(false); 
        } catch (e) { console.error(e); } finally { setIsSaving(false); }
    };

    const handleBulkDelete = async () => {
        try {
            const { error } = await supabase.from('transactions').delete().in('id', Array.from(selectedIds));
            if (error) throw error;
            window.location.reload(); 
        } catch (err) { alert('Erro ao excluir.'); } finally { setShowBulkDeleteConfirm(false); }
    };

    const filters: { id: FilterOption; label: string }[] = [
        { id: 'ALL', label: 'Tudo' },
        { id: 'BUY', label: 'Compras' },
        { id: 'SELL', label: 'Vendas' },
        { id: 'FII', label: 'FIIs' },
        { id: 'STOCK', label: 'Ações' },
    ];

    return (
        <div className="anim-fade-in min-h-screen pb-32">
            {/* Header com Filtros Chips */}
            <div className="sticky top-20 z-20 bg-primary-light dark:bg-primary-dark transition-all -mx-4 px-4 pt-2 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-black text-zinc-900 dark:text-white tracking-tight">
                        {isSelectionMode ? `${selectedIds.size} selecionados` : 'Histórico de Operações'}
                    </h2>
                    
                    <div className="flex items-center gap-2">
                        {isSelectionMode ? (
                            <>
                                {selectedIds.size > 0 && <button onClick={() => setShowBulkDeleteConfirm(true)} className="p-2 bg-rose-100 text-rose-600 rounded-lg"><Trash2 className="w-4 h-4" /></button>}
                                <button onClick={() => { setIsSelectionMode(false); setSelectedIds(new Set()); }} className="text-xs font-bold text-zinc-500">Cancelar</button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => setIsSelectionMode(true)} className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"><CheckSquare className="w-5 h-5" /></button>
                                <button onClick={handleOpenAdd} className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 w-8 h-8 rounded-lg flex items-center justify-center shadow-md press-effect"><Plus className="w-5 h-5" /></button>
                            </>
                        )}
                    </div>
                </div>

                {!isSelectionMode && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {filters.map(f => (
                            <button
                                key={f.id}
                                onClick={() => setActiveFilter(f.id)}
                                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${activeFilter === f.id ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-md' : 'bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800'}`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="pt-2">
                <TransactionsSummary transactions={filteredTransactions} privacyMode={privacyMode} />
                
                {flatTransactions.length > 0 ? (
                    <div className="pb-10">
                        {flatTransactions.map((item: any, index: number) => (
                            <TransactionRow 
                                key={item.data?.id || `header-${item.monthKey}`} 
                                index={index} 
                                data={{ items: flatTransactions, onRowClick: handleOpenEdit, privacyMode, isSelectionMode, selectedIds, onToggleSelect: (id: string) => { const n = new Set(selectedIds); if (n.has(id)) n.delete(id); else n.add(id); setSelectedIds(n); } }}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="py-20 flex flex-col items-center justify-center opacity-50">
                        <ArrowRightLeft className="w-12 h-12 text-zinc-300 mb-3" strokeWidth={1.5} />
                        <p className="text-xs font-bold text-zinc-500">Nenhuma ordem encontrada</p>
                    </div>
                )}
            </div>

            {/* Modal de Edição (Simplificado para manter o contexto) */}
            <SwipeableModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <div className="p-6 pb-20">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-black text-zinc-900 dark:text-white">{editingId ? 'Editar Ordem' : 'Nova Ordem'}</h2>
                        {editingId && <button onClick={() => onRequestDeleteConfirmation(editingId)} className="p-2 text-rose-500 bg-rose-50 rounded-lg"><Trash2 className="w-5 h-5" /></button>}
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                            {['BUY', 'SELL'].map(t => (
                                <button key={t} onClick={() => setType(t as any)} className={`flex-1 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${type === t ? (t === 'BUY' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-rose-500 text-white shadow-lg') : 'text-zinc-400'}`}>
                                    {t === 'BUY' ? 'Compra' : 'Venda'}
                                </button>
                            ))}
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Ativo</label>
                            <div className="flex gap-2 mt-1">
                                <input type="text" value={ticker} onChange={e => { setTicker(e.target.value.toUpperCase()); if (!editingId && e.target.value.endsWith('11')) setAssetType(AssetType.FII); }} placeholder="ABCD11" className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-lg font-black uppercase outline-none focus:border-zinc-400 dark:focus:border-zinc-600" />
                                <button onClick={() => setAssetType(assetType === AssetType.FII ? AssetType.STOCK : AssetType.FII)} className="px-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-bold border border-zinc-200 dark:border-zinc-700 min-w-[60px]">
                                    {assetType === AssetType.FII ? 'FII' : 'AÇÃO'}
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Qtd</label>
                                <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0" className="w-full mt-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-lg font-bold outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Preço</label>
                                <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" className="w-full mt-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-lg font-bold outline-none" />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Data</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full mt-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold outline-none" />
                        </div>

                        <div className="pt-4">
                            <div className="flex justify-between items-center mb-4 px-2">
                                <span className="text-xs font-bold text-zinc-500">Total Estimado</span>
                                <span className="text-xl font-black text-zinc-900 dark:text-white">{formatBRL(estimatedTotal)}</span>
                            </div>
                            <button onClick={handleSave} disabled={isSaving || !ticker || !quantity || !price} className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl press-effect disabled:opacity-50">
                                {isSaving ? 'Salvando...' : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            </SwipeableModal>

            <ConfirmationModal isOpen={showBulkDeleteConfirm} title="Excluir Itens?" message={`Deseja apagar ${selectedIds.size} registros selecionados?`} onConfirm={handleBulkDelete} onCancel={() => setShowBulkDeleteConfirm(false)} />
        </div>
    );
};

export const Transactions = React.memo(TransactionsComponent);
