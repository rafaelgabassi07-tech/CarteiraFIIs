
import React, { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Plus, Hash, DollarSign, Trash2, Save, X, ArrowRightLeft, Building2, CandlestickChart, Filter, Check, Calendar, CheckSquare, Square, CheckCircle2 } from 'lucide-react';
import { SwipeableModal, ConfirmationModal } from '../components/Layout';
import { Transaction, AssetType } from '../types';
import { supabase } from '../services/supabase';

const formatBRL = (val: number, privacy = false) => {
  if (privacy) return '••••••';
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Helper para formatar Mês/Ano
const formatMonthHeader = (monthKey: string) => {
    try {
        const [year, month] = monthKey.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    } catch {
        return monthKey;
    }
};

// Componente da Linha da Transação
const TransactionRow = React.memo(({ index, style, data }: any) => {
  const item = data.items[index];
  const privacyMode = data.privacyMode;
  const isSelectionMode = data.isSelectionMode;
  const isSelected = data.selectedIds.has(item.data?.id);
  
  // Cabeçalho de Mês
  if (item.type === 'header') {
      return (
          <div style={style} className="px-2 pt-6 pb-2 anim-fade-in flex items-end justify-between border-b border-zinc-100 dark:border-zinc-800/50 mb-1">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">{formatMonthHeader(item.monthKey)}</h3>
              {item.monthlyTotal > 0 && (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded uppercase tracking-wider">
                      Aporte: {formatBRL(item.monthlyTotal, privacyMode)}
                  </span>
              )}
          </div>
      );
  }

  const t = item.data;
  const isBuy = t.type === 'BUY';
  
  return (
      <div className="px-0.5 py-1 anim-stagger-item" style={{ ...style, animationDelay: `${(index % 10) * 30}ms` }}>
          <button 
            onClick={() => isSelectionMode ? data.onToggleSelect(t.id) : data.onRowClick(t)}
            className={`w-full text-left p-3.5 rounded-2xl border flex items-center justify-between shadow-sm press-effect transition-all duration-300 ${
                isSelected 
                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-500/30' 
                : 'bg-surface-light dark:bg-surface-dark border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
            }`}
          >
              <div className="flex items-center gap-3">
                  {isSelectionMode ? (
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-300 dark:text-zinc-600'}`}>
                          {isSelected ? <CheckCircle2 className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                      </div>
                  ) : (
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isBuy ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
                          {isBuy ? <TrendingUp className="w-4.5 h-4.5" /> : <TrendingDown className="w-4.5 h-4.5" />}
                      </div>
                  )}
                  
                  <div>
                      <h4 className={`font-black text-sm ${isSelected ? 'text-indigo-900 dark:text-indigo-100' : 'text-zinc-900 dark:text-white'}`}>{t.ticker}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-bold uppercase ${isSelected ? 'text-indigo-400' : 'text-zinc-400'}`}>{t.date.split('-').reverse().slice(0,2).join('/')}</span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase ${t.assetType === AssetType.FII ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800' : 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-800'}`}>
                            {t.assetType === AssetType.FII ? 'FII' : 'Ação'}
                        </span>
                      </div>
                  </div>
              </div>
              <div className="text-right">
                  <p className={`text-sm font-black ${isSelected ? 'text-indigo-900 dark:text-indigo-100' : 'text-zinc-900 dark:text-white'}`}>{formatBRL(t.price * t.quantity, privacyMode)}</p>
                  <p className={`text-[10px] font-medium ${isSelected ? 'text-indigo-400' : 'text-zinc-400'}`}>{t.quantity}x {t.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
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
    
    // Selection Mode States
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Form States
    const [ticker, setTicker] = useState('');
    const [type, setType] = useState<'BUY' | 'SELL'>('BUY');
    const [assetType, setAssetType] = useState<AssetType>(AssetType.FII);
    const [quantity, setQuantity] = useState('');
    const [price, setPrice] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    // Filter Logic
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

    // Calculation Logic
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
            if (val.endsWith('11') || val.endsWith('11B')) {
                setAssetType(AssetType.FII);
            } else if (['3', '4', '5', '6'].some(end => val.endsWith(end))) {
                setAssetType(AssetType.STOCK);
            }
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

        if (editingId) {
            await onUpdateTransaction(editingId, payload);
        } else {
            await onAddTransaction(payload);
        }
    };

    const handleDelete = () => {
        if (editingId) {
            setIsModalOpen(false);
            onRequestDeleteConfirmation(editingId);
        }
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
        if (selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0) {
            setSelectedIds(new Set());
        } else {
            const allIds = new Set(filteredTransactions.map(t => t.id));
            setSelectedIds(allIds);
        }
    };

    const handleBulkDelete = async () => {
        setIsDeleting(true);
        try {
            const idsToDelete = Array.from(selectedIds);
            const { error } = await supabase.from('transactions').delete().in('id', idsToDelete);
            
            if (error) throw error;
            window.location.reload(); 
        } catch (err) {
            console.error(err);
            alert('Erro ao excluir itens.');
        } finally {
            setIsDeleting(false);
            setShowBulkDeleteConfirm(false);
            setIsSelectionMode(false);
            setSelectedIds(new Set());
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
        <div className="anim-fade-in relative min-h-screen pb-32">
            {/* STICKY HEADER FIX: Top at 5.5rem aligns with App header padding */}
            <div className="sticky top-[5.5rem] z-30 -mx-4 px-4 py-3 bg-primary-light/95 dark:bg-primary-dark/95 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50 transition-all shadow-sm mb-2">
                <div className="flex items-center justify-between">
                    <div>
                        {isSelectionMode ? (
                             <div className="flex items-center gap-2 anim-slide-up">
                                <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                                    {selectedIds.size}
                                </p>
                                <span className="text-zinc-500 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-wider">Selecionados</span>
                             </div>
                        ) : (
                            <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest anim-slide-up">
                                {filteredTransactions.length} {filteredTransactions.length === 1 ? 'Registro' : 'Registros'}
                                {activeFilter !== 'ALL' && <span className="text-accent ml-1">• Filtrado</span>}
                            </p>
                        )}
                    </div>
                    
                    <div className="flex gap-2">
                        {isSelectionMode && (
                            <button
                                onClick={toggleSelectAll}
                                className="px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 active:scale-95 transition-all anim-scale-in"
                            >
                                {selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0 ? 'Desmarcar' : 'Todos'}
                            </button>
                        )}

                        <button 
                            onClick={toggleSelectionMode}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm press-effect transition-all ${isSelectionMode ? 'bg-indigo-500 text-white ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-black' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}
                        >
                             {isSelectionMode ? <CheckSquare className="w-5 h-5" /> : <CheckSquare className="w-5 h-5 opacity-50" />}
                        </button>

                        {!isSelectionMode && (
                            <>
                                <div className="relative z-30">
                                    <button 
                                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm press-effect transition-colors ${activeFilter !== 'ALL' ? 'bg-indigo-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}
                                    >
                                        {isFilterOpen ? <X className="w-5 h-5" /> : <Filter className="w-5 h-5" strokeWidth={2.5} />}
                                    </button>

                                    {isFilterOpen && (
                                        <>
                                            <div 
                                                className="fixed inset-0 z-20 bg-black/5 dark:bg-black/20 backdrop-blur-[1px]" 
                                                onClick={() => setIsFilterOpen(false)}
                                            ></div>
                                            <div className="absolute top-full right-0 mt-2 w-56 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-2 z-30 anim-scale-in origin-top-right ring-1 ring-black/5 dark:ring-white/5">
                                                <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800/50 mb-1">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Filtrar Ordens</span>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    {filters.map((f) => (
                                                        <button
                                                            key={f.id}
                                                            onClick={() => { setActiveFilter(f.id); setIsFilterOpen(false); }}
                                                            className={`flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${
                                                                activeFilter === f.id 
                                                                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-700' 
                                                                : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-700 dark:hover:text-zinc-300'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <f.icon className={`w-4 h-4 ${activeFilter === f.id ? 'text-indigo-500' : 'text-zinc-400'}`} strokeWidth={activeFilter === f.id ? 2.5 : 2} />
                                                                <span>{f.label}</span>
                                                            </div>
                                                            {activeFilter === f.id && <Check className="w-4 h-4 text-indigo-500" strokeWidth={3} />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <button 
                                    onClick={handleOpenAdd}
                                    className={`w-10 h-10 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl flex items-center justify-center shadow-lg press-effect hover:shadow-xl anim-scale-in`}
                                >
                                    <Plus className="w-5 h-5" strokeWidth={2.5} />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="px-1">
                {flatTransactions.length > 0 ? (
                    <div>
                        {flatTransactions.map((item: any, index: number) => (
                            <TransactionRow 
                                key={index} 
                                index={index} 
                                data={{ 
                                    items: flatTransactions, 
                                    onRowClick: handleOpenEdit, 
                                    privacyMode,
                                    isSelectionMode,
                                    selectedIds,
                                    onToggleSelect: handleToggleSelect
                                }}
                                style={{}} 
                            />
                        ))}
                    </div>
                ) : (
                    <div className="h-[50vh] flex flex-col items-center justify-center opacity-40 anim-fade-in">
                        <ArrowRightLeft className="w-16 h-16 mb-4 text-zinc-300 dark:text-zinc-700" strokeWidth={1} />
                        <p className="text-sm font-bold text-zinc-500">Nenhuma ordem encontrada.</p>
                        {activeFilter !== 'ALL' && (
                            <button onClick={() => setActiveFilter('ALL')} className="mt-4 text-xs font-bold text-indigo-500 uppercase tracking-widest">Limpar Filtros</button>
                        )}
                        {activeFilter === 'ALL' && (
                            <button onClick={handleOpenAdd} className="mt-4 text-xs font-bold text-sky-500 uppercase tracking-widest">Adicionar Primeira</button>
                        )}
                    </div>
                )}
            </div>

            {/* Barra Flutuante de Ação em Massa - Z-INDEX e BOTTOM corrigidos */}
            {isSelectionMode && selectedIds.size > 0 && (
                <div className="fixed bottom-[6.5rem] left-4 right-4 z-[100] anim-slide-up">
                    <div className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 p-4 rounded-2xl shadow-2xl flex items-center justify-between border border-zinc-800 dark:border-zinc-200">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-zinc-800 dark:bg-zinc-100 flex items-center justify-center font-black text-sm">
                                {selectedIds.size}
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wide">Selecionados</span>
                        </div>
                        <button 
                            onClick={() => setShowBulkDeleteConfirm(true)}
                            className="bg-rose-600 hover:bg-rose-500 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 active:scale-95 transition-all"
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
                            <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                                {editingId ? 'Editar Ordem' : 'Nova Ordem'}
                            </h2>
                            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">
                                {editingId ? 'Atualizar registro' : 'Lançar movimentação'}
                            </p>
                        </div>
                        {editingId && (
                            <button 
                                onClick={handleDelete}
                                className="w-10 h-10 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center border border-rose-100 dark:border-rose-500/20 press-effect"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    <div className="space-y-5">
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 anim-slide-up" style={{ animationDelay: '100ms' }}>
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 block">Ativo (Ticker)</label>
                            <input 
                                type="text" 
                                value={ticker}
                                onChange={handleTickerChange}
                                placeholder="EX: HGLG11"
                                className="w-full bg-transparent text-2xl font-black text-zinc-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-zinc-700 outline-none uppercase"
                                autoFocus={!editingId}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 anim-slide-up" style={{ animationDelay: '150ms' }}>
                            <div className="bg-zinc-50 dark:bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex relative">
                                <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-4px)] bg-white dark:bg-zinc-700 rounded-xl shadow-sm transition-all duration-300 ease-out-soft ${type === 'SELL' ? 'translate-x-[100%] translate-x-1' : 'left-1.5'}`}></div>
                                <button onClick={() => setType('BUY')} className={`relative z-10 flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center transition-colors ${type === 'BUY' ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'}`}>Compra</button>
                                <button onClick={() => setType('SELL')} className={`relative z-10 flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center transition-colors ${type === 'SELL' ? 'text-rose-500' : 'text-zinc-400'}`}>Venda</button>
                            </div>

                            <div className="bg-zinc-50 dark:bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex relative">
                                <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-4px)] bg-white dark:bg-zinc-700 rounded-xl shadow-sm transition-all duration-300 ease-out-soft ${assetType === AssetType.STOCK ? 'translate-x-[100%] translate-x-1' : 'left-1.5'}`}></div>
                                <button onClick={() => setAssetType(AssetType.FII)} className={`relative z-10 flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-center transition-colors ${assetType === AssetType.FII ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'}`}>
                                    <Building2 className="w-3 h-3" /> FII
                                </button>
                                <button onClick={() => setAssetType(AssetType.STOCK)} className={`relative z-10 flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-center transition-colors ${assetType === AssetType.STOCK ? 'text-sky-600 dark:text-sky-400' : 'text-zinc-400'}`}>
                                    <CandlestickChart className="w-3 h-3" /> Ação
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 anim-slide-up" style={{ animationDelay: '200ms' }}>
                            <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <Hash className="w-3 h-3 text-zinc-400" />
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Quantidade</label>
                                </div>
                                <input 
                                    type="number" 
                                    inputMode="numeric"
                                    value={quantity}
                                    onChange={e => setQuantity(e.target.value)}
                                    placeholder="0"
                                    className="w-full bg-transparent text-xl font-bold text-zinc-900 dark:text-white placeholder:text-zinc-300 outline-none"
                                />
                            </div>

                            <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <DollarSign className="w-3 h-3 text-zinc-400" />
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Preço (Unit)</label>
                                </div>
                                <input 
                                    type="number" 
                                    inputMode="decimal"
                                    value={price}
                                    onChange={e => setPrice(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-transparent text-xl font-bold text-zinc-900 dark:text-white placeholder:text-zinc-300 outline-none"
                                />
                            </div>
                        </div>

                        <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center gap-4 anim-slide-up" style={{ animationDelay: '250ms' }}>
                            <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Data da Operação</label>
                                <input 
                                    type="date" 
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    className="w-full bg-transparent text-sm font-bold text-zinc-900 dark:text-white outline-none"
                                />
                            </div>
                        </div>

                        <button 
                            onClick={handleSave}
                            disabled={!ticker || !quantity || !price}
                            className={`w-full py-4 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg press-effect mt-4 anim-slide-up ${(!ticker || !quantity || !price) ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed' : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'}`}
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
                title="Excluir Itens?" 
                message={`Tem certeza que deseja apagar ${selectedIds.size} ordens selecionadas? Esta ação não pode ser desfeita.`} 
                onConfirm={handleBulkDelete} 
                onCancel={() => setShowBulkDeleteConfirm(false)} 
            />
        </div>
    );
};

export const Transactions = React.memo(TransactionsComponent);
