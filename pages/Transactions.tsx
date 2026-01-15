
import React, { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Plus, Hash, DollarSign, Trash2, Save, X, ArrowRightLeft, Building2, CandlestickChart, Filter, Check, Calendar, CheckSquare, Square, CheckCircle2 } from 'lucide-react';
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

const TransactionRow = React.memo(({ index, data }: any) => {
  const item = data.items[index];
  const privacyMode = data.privacyMode;
  const isSelectionMode = data.isSelectionMode;
  const isSelected = data.selectedIds.has(item.data?.id);
  
  if (item.type === 'header') {
      return (
          <div className={`px-2 pt-8 pb-3 flex items-end justify-between border-b border-zinc-200 dark:border-zinc-800/50 mb-2 anim-fade-in ${index === 0 ? 'mt-4' : ''}`}>
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">{formatMonthHeader(item.monthKey)}</h3>
              {item.monthlyTotal > 0 && (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded uppercase tracking-wider">
                      Aporte: {formatBRL(item.monthlyTotal, privacyMode)}
                  </span>
              )}
          </div>
      );
  }

  const t = item.data;
  const isBuy = t.type === 'BUY';
  
  return (
      <div className="px-0.5 py-1 anim-stagger-item" style={{ animationDelay: `${(index % 10) * 30}ms` }}>
          <button 
            onClick={() => isSelectionMode ? data.onToggleSelect(t.id) : data.onRowClick(t)}
            className={`w-full text-left p-4 rounded-2xl border flex items-center justify-between shadow-sm press-effect transition-all duration-300 ${
                isSelected 
                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 dark:border-indigo-400 shadow-lg shadow-indigo-500/5' 
                : 'bg-surface-light dark:bg-surface-dark border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
            }`}
          >
              <div className="flex items-center gap-4">
                  {isSelectionMode ? (
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-300 dark:text-zinc-600'}`}>
                          {isSelected ? <CheckCircle2 className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                      </div>
                  ) : (
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isBuy ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
                          {isBuy ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                      </div>
                  )}
                  
                  <div>
                      <h4 className={`font-black text-base ${isSelected ? 'text-indigo-900 dark:text-white' : 'text-zinc-900 dark:text-white'}`}>{t.ticker}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-bold uppercase ${isSelected ? 'text-indigo-400' : 'text-zinc-400'}`}>{t.date.split('-').reverse().slice(0,2).join('/')}</span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase ${t.assetType === AssetType.FII ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800' : 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-800'}`}>
                            {t.assetType === AssetType.FII ? 'FII' : 'Ação'}
                        </span>
                      </div>
                  </div>
              </div>
              <div className="text-right">
                  <p className={`text-base font-black ${isSelected ? 'text-indigo-900 dark:text-white' : 'text-zinc-900 dark:text-white'}`}>{formatBRL(t.price * t.quantity, privacyMode)}</p>
                  <p className={`text-[11px] font-medium ${isSelected ? 'text-indigo-400' : 'text-zinc-400'}`}>{t.quantity}x {t.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>
          </button>
      </div>
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
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<FilterOption>('ALL');
    
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

    const [ticker, setTicker] = useState('');
    const [type, setType] = useState<'BUY' | 'SELL'>('BUY');
    const [assetType, setAssetType] = useState<AssetType>(AssetType.FII);
    const [quantity, setQuantity] = useState('');
    const [price, setPrice] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

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
            if (!groups[k]) {
                groups[k] = { items: [], totalBuy: 0 };
            }
            groups[k].items.push(t);
            if (t.type === 'BUY') {
                groups[k].totalBuy += (t.price * t.quantity);
            }
        });

        const list: any[] = [];
        Object.keys(groups).sort((a,b) => b.localeCompare(a)).forEach(k => {
            list.push({ type: 'header', monthKey: k, monthlyTotal: groups[k].totalBuy });
            groups[k].items.forEach((t: any) => list.push({ type: 'item', data: t }));
        });
        return list; 
    }, [filteredTransactions]);

    const handleOpenAdd = () => {
        setEditingId(null);
        setTicker('');
        setType('BUY');
        setAssetType(AssetType.FII);
        setQuantity('');
        setPrice('');
        setDate(new Date().toISOString().split('T')[0]);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (t: Transaction) => {
        setEditingId(t.id);
        setTicker(t.ticker);
        setType(t.type);
        setAssetType(t.assetType || AssetType.FII);
        setQuantity(String(t.quantity));
        setPrice(String(t.price));
        setDate(t.date.split('T')[0]);
        setIsModalOpen(true);
    };

    const handleTickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.toUpperCase();
        setTicker(val);
        if (!editingId) { 
            if (val.endsWith('11') || val.endsWith('11B')) setAssetType(AssetType.FII);
            else if (['3', '4', '5', '6'].some(end => val.endsWith(end))) setAssetType(AssetType.STOCK);
        }
    };

    const handleSave = async () => {
        if (!ticker || !quantity || !price || !date) return;
        const payload = {
            ticker: ticker.toUpperCase(),
            type,
            assetType,
            quantity: Number(quantity.replace(',', '.')),
            price: Number(price.replace(',', '.')),
            date
        };
        setIsModalOpen(false); 
        if (editingId) await onUpdateTransaction(editingId, payload);
        else await onAddTransaction(payload);
    };

    const toggleSelectionMode = () => {
        if (isSelectionMode) {
            setIsSelectionMode(false);
            setSelectedIds(new Set());
        } else {
            setIsSelectionMode(true);
        }
    };

    const handleToggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredTransactions.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(filteredTransactions.map(t => t.id)));
    };

    const handleBulkDelete = async () => {
        try {
            const { error } = await supabase.from('transactions').delete().in('id', Array.from(selectedIds));
            if (error) throw error;
            window.location.reload(); 
        } catch (err) {
            alert('Erro ao excluir itens.');
        } finally {
            setShowBulkDeleteConfirm(false);
        }
    };

    const filters: { id: FilterOption; label: string; icon: any }[] = [
        { id: 'ALL', label: 'Tudo', icon: ArrowRightLeft },
        { id: 'BUY', label: 'Compras', icon: TrendingUp },
        { id: 'SELL', label: 'Vendas', icon: TrendingDown },
        { id: 'FII', label: 'FIIs', icon: Building2 },
        { id: 'STOCK', label: 'Ações', icon: CandlestickChart },
    ];

    return (
        <div className="anim-fade-in relative min-h-screen pb-60">
            {/* Header Sticky Blindado */}
            <div className="sticky top-20 z-40 -mx-4 px-4 py-3 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 shadow-sm transition-all duration-300">
                <div className="flex items-center justify-between">
                    <div>
                        {isSelectionMode ? (
                            <div className="flex flex-col anim-slide-up">
                                <span className="text-[10px] font-black uppercase text-indigo-500 tracking-widest">Modo Seleção</span>
                                <p className="text-sm font-black text-zinc-900 dark:text-white">
                                    {selectedIds.size} selecionados
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Ordens</span>
                                <p className="text-sm font-black text-zinc-900 dark:text-white">
                                    {filters.find(f => f.id === activeFilter)?.label || 'Todos'}
                                </p>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {isSelectionMode && (
                             <button 
                                onClick={toggleSelectAll}
                                className="px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400 active:scale-95 transition-transform"
                            >
                                {selectedIds.size === filteredTransactions.length ? 'Nenhum' : 'Todos'}
                            </button>
                        )}
                        <button 
                            onClick={toggleSelectionMode}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isSelectionMode ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'}`}
                        >
                            <CheckSquare className="w-5 h-5" />
                        </button>
                        {!isSelectionMode && (
                            <>
                                <button 
                                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeFilter !== 'ALL' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'}`}
                                >
                                    <Filter className="w-5 h-5" />
                                </button>
                                <button 
                                    onClick={handleOpenAdd}
                                    className="w-10 h-10 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl flex items-center justify-center shadow-lg press-effect"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {isFilterOpen && !isSelectionMode && (
                    <div className="absolute top-full left-0 right-0 p-3 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 anim-slide-up grid grid-cols-5 gap-2 shadow-2xl">
                        {filters.map(f => (
                            <button
                                key={f.id}
                                onClick={() => { setActiveFilter(f.id); setIsFilterOpen(false); }}
                                className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${activeFilter === f.id ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-400'}`}
                            >
                                <f.icon className="w-4 h-4 mb-1" />
                                <span className="text-[8px] font-black uppercase tracking-tighter">{f.label}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="px-1 pt-4">
                {flatTransactions.length > 0 ? (
                    <div className="space-y-1">
                        {flatTransactions.map((item: any, index: number) => (
                            <TransactionRow 
                                key={item.data?.id || `header-${index}`} 
                                index={index} 
                                data={{ 
                                    items: flatTransactions, 
                                    onRowClick: handleOpenEdit, 
                                    privacyMode,
                                    isSelectionMode,
                                    selectedIds,
                                    onToggleSelect: handleToggleSelect
                                }}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="h-[50vh] flex flex-col items-center justify-center opacity-40 anim-fade-in">
                        <ArrowRightLeft className="w-16 h-16 mb-4 text-zinc-300 dark:text-zinc-700" strokeWidth={1} />
                        <p className="text-sm font-bold text-zinc-500">Nenhuma ordem encontrada.</p>
                    </div>
                )}
            </div>

            {/* BARRA DE EXCLUSÃO FIXA (SUSPENSA ACIMA DO MENU) */}
            {isSelectionMode && selectedIds.size > 0 && (
                <div className="fixed bottom-28 left-4 right-4 z-[100] anim-slide-up">
                    <div className="bg-zinc-900 dark:bg-white p-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center justify-between border border-white/5 dark:border-black/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-zinc-800 dark:bg-zinc-100 flex items-center justify-center font-black text-white dark:text-zinc-900">
                                {selectedIds.size}
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Selecionados</span>
                        </div>
                        <button 
                            onClick={() => setShowBulkDeleteConfirm(true)}
                            className="bg-rose-600 hover:bg-rose-500 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 active:scale-95 transition-all shadow-lg shadow-rose-600/20"
                        >
                            <Trash2 className="w-4 h-4" /> Excluir
                        </button>
                    </div>
                </div>
            )}

            <SwipeableModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <div className="p-6 pb-12">
                    <div className="flex items-center justify-between mb-8 anim-slide-up">
                        <div>
                            <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight leading-none">
                                {editingId ? 'Editar Ordem' : 'Nova Ordem'}
                            </h2>
                            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-2">
                                {editingId ? 'Atualizar registro' : 'Lançar movimentação'}
                            </p>
                        </div>
                        {editingId && (
                            <button 
                                onClick={() => onRequestDeleteConfirmation(editingId)}
                                className="w-12 h-12 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-2xl flex items-center justify-center border border-rose-100 dark:border-rose-900/30 press-effect"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    <div className="space-y-5">
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 anim-slide-up" style={{ animationDelay: '100ms' }}>
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 block">Ativo (Ticker)</label>
                            <input 
                                type="text" 
                                value={ticker}
                                onChange={handleTickerChange}
                                placeholder="EX: HGLG11"
                                className="w-full bg-transparent text-3xl font-black text-zinc-900 dark:text-white placeholder:text-zinc-200 dark:placeholder:text-zinc-800 outline-none uppercase tracking-tight"
                                autoFocus={!editingId}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 anim-slide-up" style={{ animationDelay: '150ms' }}>
                            <div className="bg-zinc-50 dark:bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex relative">
                                <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-4px)] bg-white dark:bg-zinc-700 rounded-xl shadow-sm transition-all duration-300 ease-out-soft ${type === 'SELL' ? 'translate-x-[100%] translate-x-1' : 'left-1.5'}`}></div>
                                <button onClick={() => setType('BUY')} className={`relative z-10 flex-1 py-3 text-[10px] font-black uppercase tracking-wider text-center transition-colors ${type === 'BUY' ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'}`}>Compra</button>
                                <button onClick={() => setType('SELL')} className={`relative z-10 flex-1 py-3 text-[10px] font-black uppercase tracking-wider text-center transition-colors ${type === 'SELL' ? 'text-rose-500' : 'text-zinc-400'}`}>Venda</button>
                            </div>

                            <div className="bg-zinc-50 dark:bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex relative">
                                <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-4px)] bg-white dark:bg-zinc-700 rounded-xl shadow-sm transition-all duration-300 ease-out-soft ${assetType === AssetType.STOCK ? 'translate-x-[100%] translate-x-1' : 'left-1.5'}`}></div>
                                <button onClick={() => setAssetType(AssetType.FII)} className={`relative z-10 flex-1 py-3 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-center transition-colors ${assetType === AssetType.FII ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'}`}>FII</button>
                                <button onClick={() => setAssetType(AssetType.STOCK)} className={`relative z-10 flex-1 py-3 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-center transition-colors ${assetType === AssetType.STOCK ? 'text-sky-600 dark:text-sky-400' : 'text-zinc-400'}`}>Ação</button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 anim-slide-up" style={{ animationDelay: '200ms' }}>
                            <div className="bg-zinc-50 dark:bg-zinc-900/50 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Quantidade</label>
                                <input 
                                    type="number" 
                                    inputMode="numeric"
                                    value={quantity}
                                    onChange={e => setQuantity(e.target.value)}
                                    placeholder="0"
                                    className="w-full bg-transparent text-2xl font-black text-zinc-900 dark:text-white placeholder:text-zinc-200 outline-none"
                                />
                            </div>

                            <div className="bg-zinc-50 dark:bg-zinc-900/50 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Preço (Unit)</label>
                                <input 
                                    type="number" 
                                    inputMode="decimal"
                                    value={price}
                                    onChange={e => setPrice(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-transparent text-2xl font-black text-zinc-900 dark:text-white placeholder:text-zinc-200 outline-none"
                                />
                            </div>
                        </div>

                        <div className="bg-zinc-50 dark:bg-zinc-900/50 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center gap-4 anim-slide-up" style={{ animationDelay: '250ms' }}>
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 flex items-center justify-center text-zinc-500">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Data da Operação</label>
                                <input 
                                    type="date" 
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    className="w-full bg-transparent text-sm font-black text-zinc-900 dark:text-white outline-none"
                                />
                            </div>
                        </div>

                        <button 
                            onClick={handleSave}
                            disabled={!ticker || !quantity || !price}
                            className={`w-full py-5 rounded-3xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-xl press-effect mt-6 transition-all ${(!ticker || !quantity || !price) ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed' : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'}`}
                            style={{ animationDelay: '300ms' }}
                        >
                            <Save className="w-4 h-4" />
                            {editingId ? 'Salvar Alterações' : 'Confirmar Ordem'}
                        </button>
                    </div>
                </div>
            </SwipeableModal>

            <ConfirmationModal 
                isOpen={showBulkDeleteConfirm} 
                title="Excluir Selecionados?" 
                message={`Deseja realmente apagar estes ${selectedIds.size} registros? Esta ação é irreversível.`} 
                onConfirm={handleBulkDelete} 
                onCancel={() => setShowBulkDeleteConfirm(false)} 
            />
        </div>
    );
};

export const Transactions = React.memo(TransactionsComponent);
