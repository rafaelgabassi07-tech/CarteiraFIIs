
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TrendingUp, TrendingDown, Plus, Trash2, X, ArrowRightLeft, Check, Calendar, CheckSquare, Search, ChevronDown, Wallet, ArrowUpRight, ArrowDownLeft, Calculator, Tag } from 'lucide-react';
import { SwipeableModal, ConfirmationModal, InfoTooltip } from '../components/Layout';
import { Transaction, AssetType } from '../types';
import { supabase } from '../services/supabase';
import { formatBRL } from '../utils/formatters';

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
        <div className="mb-5 px-1">
            <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${netFlow >= 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-900/10 dark:border-emerald-900/30 dark:text-emerald-400' : 'bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-900/10 dark:border-rose-900/30 dark:text-rose-400'}`}>
                        <Wallet className="w-5 h-5" strokeWidth={2} />
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Fluxo Líquido</span>
                            <InfoTooltip title="Fluxo Líquido" text="Diferença entre o total comprado e o total vendido. Representa o capital efetivamente alocado." />
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">
                                {formatBRL(Math.abs(netFlow), privacyMode)}
                            </span>
                            <span className={`text-[9px] font-bold uppercase tracking-wider ${netFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {netFlow >= 0 ? 'Entrada' : 'Saída'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span>Buy: {formatBRL(totalInvested, true)}</span> 
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        <span>Sell: {formatBRL(totalSold, true)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const YearFilterChip = ({ years, selectedYear, onChange }: { years: string[], selectedYear: string, onChange: (y: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [coords, setCoords] = useState({ top: 0, left: 0 });

    const handleToggle = () => {
        if (!isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setCoords({ top: rect.bottom + 6, left: rect.left });
        }
        setIsOpen(!isOpen);
    };

    return (
        <>
            <button 
                ref={buttonRef}
                onClick={handleToggle}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all shrink-0 ${selectedYear !== 'ALL' ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent shadow-md' : 'bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}`}
            >
                <Calendar className="w-3 h-3" />
                <span>{selectedYear === 'ALL' ? 'Ano' : selectedYear}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && createPortal(
                <>
                    <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)}></div>
                    <div 
                        className="fixed w-32 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-xl z-[9999] overflow-hidden anim-scale-in p-1"
                        style={{ top: coords.top, left: coords.left }}
                    >
                        <div className="max-h-64 overflow-y-auto no-scrollbar space-y-1">
                            <button 
                                onClick={() => { onChange('ALL'); setIsOpen(false); }}
                                className={`w-full text-left px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wide transition-colors ${selectedYear === 'ALL' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white' : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
                            >
                                Todos
                            </button>
                            {years.map(year => (
                                <button 
                                    key={year}
                                    onClick={() => { onChange(year); setIsOpen(false); }}
                                    className={`w-full text-left px-3 py-2 rounded-xl text-[10px] font-bold transition-colors ${selectedYear === year ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900' : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
                                >
                                    {year}
                                </button>
                            ))}
                        </div>
                    </div>
                </>,
                document.body
            )}
        </>
    );
};

const FilterChip = ({ label, active, onClick, icon: Icon }: any) => (
    <button 
        onClick={onClick} 
        className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${active ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent shadow-md' : 'bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}`}
    >
        {Icon && <Icon className="w-3 h-3" />}
        {label}
    </button>
);

const TransactionRow = React.memo(({ index, data }: any) => {
  const item = data.items[index];
  const privacyMode = data.privacyMode;
  const isSelectionMode = data.isSelectionMode;
  const isSelected = data.selectedIds.has(item.data?.id);
  
  const timerRef = useRef<number | null>(null);
  const isLongPressTriggered = useRef(false);

  const handleStart = () => {
      isLongPressTriggered.current = false;
      timerRef.current = window.setTimeout(() => {
          isLongPressTriggered.current = true;
          if (data.onLongPress && item.data?.id) data.onLongPress(item.data.id);
      }, 500); 
  };

  const handleEnd = (e: React.MouseEvent | React.TouchEvent) => {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      if (isLongPressTriggered.current) { e.preventDefault(); e.stopPropagation(); }
  };

  const handleCancel = () => {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  };

  const handleClick = (e: React.MouseEvent) => {
      if (isLongPressTriggered.current) { isLongPressTriggered.current = false; return; }
      if (isSelectionMode) data.onToggleSelect(item.data?.id);
      else data.onRowClick(item.data);
  };
  
  if (item.type === 'header') {
      return (
          <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top)+60px)] z-10 py-3 bg-primary-light/95 dark:bg-primary-dark/95 backdrop-blur-xl -mx-4 px-4 border-b border-zinc-100 dark:border-zinc-800/50 mb-1 mt-2 shadow-sm">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex justify-between items-center">
                  {formatMonthHeader(item.monthKey)}
                  <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold ${item.monthlyNet >= 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'}`}>
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
        onClick={handleClick}
        onMouseDown={handleStart}
        onMouseUp={handleEnd}
        onMouseLeave={handleCancel}
        onTouchStart={handleStart}
        onTouchEnd={handleEnd}
        onTouchMove={handleCancel}
        className={`w-full flex items-center justify-between py-3 px-1 group transition-all active:scale-[0.98] border-b border-zinc-50 dark:border-zinc-800/30 last:border-0 select-none ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/20 rounded-xl' : ''}`}
      >
          <div className="flex items-center gap-3.5">
              {isSelectionMode ? (
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all border ${isSelected ? 'bg-zinc-900 dark:bg-white border-transparent text-white dark:text-zinc-900' : 'bg-transparent border-zinc-300 dark:border-zinc-600'}`}>
                      {isSelected && <Check className="w-3 h-3" strokeWidth={3} />}
                  </div>
              ) : (
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${isBuy ? 'bg-emerald-100/50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-100/50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
                      {isBuy ? <ArrowDownLeft className="w-5 h-5" strokeWidth={2.5} /> : <ArrowUpRight className="w-5 h-5" strokeWidth={2.5} />}
                  </div>
              )}
              
              <div className="text-left">
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-white leading-tight">{t.ticker}</h4>
                  <p className="text-[11px] font-medium text-zinc-400 mt-0.5">
                      {t.date.split('-').reverse().slice(0,2).join('/')} <span className="mx-1">·</span> {t.quantity} un
                  </p>
              </div>
          </div>
          
          <div className="text-right">
              <p className={`font-bold text-sm tabular-nums tracking-tight ${isBuy ? 'text-zinc-900 dark:text-white' : 'text-zinc-900 dark:text-white'}`}>
                  {formatBRL(totalValue, privacyMode)}
              </p>
              <p className="text-[10px] font-medium text-zinc-400 tabular-nums">{formatBRL(t.price)}</p>
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

const TransactionsComponent: React.FC<TransactionsProps> = ({ transactions, onAddTransaction, onUpdateTransaction, onRequestDeleteConfirmation, privacyMode = false }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
    const [assetFilter, setAssetFilter] = useState<'ALL' | 'FII' | 'STOCK'>('ALL');
    const [yearFilter, setYearFilter] = useState<string>('ALL');
    
    // Selection
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

    // Form
    const [ticker, setTicker] = useState('');
    const [type, setType] = useState<'BUY' | 'SELL'>('BUY');
    const [assetType, setAssetType] = useState<AssetType>(AssetType.FII);
    const [quantity, setQuantity] = useState('');
    const [price, setPrice] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    
    const rawPrice = useMemo(() => {
        if (!price) return 0;
        return parseFloat(price.replace(/\./g, '').replace(',', '.')) || 0;
    }, [price]);

    const estimatedTotal = (parseFloat(quantity) || 0) * rawPrice;

    useEffect(() => {
        document.body.style.overscrollBehaviorY = isSelectionMode ? 'none' : 'auto';
        return () => { document.body.style.overscrollBehaviorY = 'auto'; };
    }, [isSelectionMode]);

    const availableYears = useMemo(() => {
        const years = new Set(transactions.map(t => t.date.substring(0, 4)));
        return Array.from(years).sort((a,b) => String(b).localeCompare(String(a)));
    }, [transactions]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const matchesSearch = searchTerm === '' || t.ticker.includes(searchTerm.toUpperCase());
            const matchesType = typeFilter === 'ALL' || t.type === typeFilter;
            const matchesAsset = assetFilter === 'ALL' || t.assetType === assetFilter;
            const matchesYear = yearFilter === 'ALL' || t.date.startsWith(yearFilter);
            return matchesSearch && matchesType && matchesAsset && matchesYear;
        });
    }, [transactions, searchTerm, typeFilter, assetFilter, yearFilter]);

    const flatTransactions = useMemo(() => {
        const sorted = [...filteredTransactions].sort((a: Transaction, b: Transaction) => String(b.date || '').localeCompare(String(a.date || '')));
        const groups: Record<string, { items: Transaction[], totalNet: number }> = {};
        
        sorted.forEach((t) => {
            if (!t.date) return;
            const k = t.date.substring(0, 7);
            if (!groups[k]) groups[k] = { items: [], totalNet: 0 };
            groups[k].items.push(t);
            const val = t.price * t.quantity;
            if (t.type === 'BUY') groups[k].totalNet += val; 
            else groups[k].totalNet -= val; 
        });

        const list: any[] = [];
        Object.keys(groups).sort((a, b) => String(b).localeCompare(String(a))).forEach(k => {
            list.push({ type: 'header', monthKey: k, monthlyNet: groups[k].totalNet });
            groups[k].items.forEach((t) => list.push({ type: 'item', data: t }));
        });
        return list; 
    }, [filteredTransactions]);

    const handleLongPress = (id: string) => {
        if (!isSelectionMode) {
            if (navigator.vibrate) navigator.vibrate(50);
            setIsSelectionMode(true);
            setSelectedIds(new Set([id]));
        }
    };

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, "");
        if (!value) { setPrice(""); return; }
        const formatted = (Number(value) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        setPrice(formatted);
    };

    const handleOpenAdd = () => {
        setEditingId(null); setTicker(''); setType('BUY'); setAssetType(AssetType.FII);
        setQuantity(''); setPrice(''); setDate(new Date().toISOString().split('T')[0]);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (t: Transaction) => {
        setEditingId(t.id); setTicker(t.ticker); setType(t.type); setAssetType(t.assetType || AssetType.FII);
        setQuantity(String(t.quantity)); 
        setPrice(t.price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        setDate(t.date.split('T')[0]);
        setIsModalOpen(true);
    };

    const handleTickerChange = (raw: string) => {
        const up = raw.toUpperCase().trim();
        setTicker(up);
        if (!editingId && up.length >= 4) {
            if (up.endsWith('11') || up.endsWith('11B')) setAssetType(AssetType.FII);
            else if (up.match(/\d$/) && ['3','4','5','6'].includes(up.slice(-1))) setAssetType(AssetType.STOCK);
        }
    };

    const handleSave = async () => {
        if (!ticker || !quantity || !price || !date || isSaving) return;
        setIsSaving(true);
        const finalPrice = parseFloat(price.replace(/\./g, '').replace(',', '.'));
        const payload = { ticker: ticker.toUpperCase(), type, assetType, quantity: Number(quantity.replace(',', '.')), price: finalPrice, date };
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

    const clearFilters = () => {
        setSearchTerm(''); setTypeFilter('ALL'); setAssetFilter('ALL'); setYearFilter('ALL');
    };

    return (
        <div className="anim-fade-in min-h-screen pb-32">
            <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 bg-primary-light dark:bg-primary-dark transition-all -mx-4 px-4 pt-2 pb-3 border-b border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        {isSelectionMode ? (
                            <span className="text-sm font-black text-indigo-500">{selectedIds.size} selecionados</span>
                        ) : (
                            <div className="flex gap-2">
                                <YearFilterChip years={availableYears} selectedYear={yearFilter} onChange={setYearFilter} />
                                <FilterChip label={typeFilter === 'ALL' ? 'Tipo' : typeFilter === 'BUY' ? 'Compras' : 'Vendas'} active={typeFilter !== 'ALL'} onClick={() => setTypeFilter(prev => prev === 'ALL' ? 'BUY' : prev === 'BUY' ? 'SELL' : 'ALL')} />
                                <FilterChip label={assetFilter === 'ALL' ? 'Classe' : assetFilter === 'FII' ? 'FIIs' : 'Ações'} active={assetFilter !== 'ALL'} onClick={() => setAssetFilter(prev => prev === 'ALL' ? 'FII' : prev === 'FII' ? 'STOCK' : 'ALL')} />
                            </div>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {isSelectionMode ? (
                            <>
                                {selectedIds.size > 0 && <button onClick={() => setShowBulkDeleteConfirm(true)} className="p-2 bg-rose-100 text-rose-600 rounded-lg"><Trash2 className="w-4 h-4" /></button>}
                                <button onClick={() => { setIsSelectionMode(false); setSelectedIds(new Set()); }} className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Cancelar</button>
                            </>
                        ) : (
                            <>
                                {(searchTerm || typeFilter !== 'ALL' || assetFilter !== 'ALL' || yearFilter !== 'ALL') && (
                                    <button onClick={clearFilters} className="text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-900/20 w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-rose-100">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                <button onClick={() => setIsSelectionMode(true)} className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors bg-zinc-100 dark:bg-zinc-800 rounded-lg"><CheckSquare className="w-4 h-4" /></button>
                                <button onClick={handleOpenAdd} className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 w-8 h-8 rounded-lg flex items-center justify-center shadow-md press-effect"><Plus className="w-5 h-5" /></button>
                            </>
                        )}
                    </div>
                </div>

                {!isSelectionMode && (
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input type="text" placeholder="Buscar ativo..." value={searchTerm} onChange={e => setSearchTerm(e.target.value.toUpperCase())} className="w-full bg-zinc-100 dark:bg-zinc-800 pl-10 pr-4 py-2 rounded-xl text-xs font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all border border-transparent focus:bg-white dark:focus:bg-zinc-900 focus:border-indigo-500/20" />
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
                                data={{ 
                                    items: flatTransactions, 
                                    onRowClick: handleOpenEdit, 
                                    privacyMode, 
                                    isSelectionMode, 
                                    selectedIds, 
                                    onToggleSelect: (id: string) => { const n = new Set(selectedIds); if (n.has(id)) n.delete(id); else n.add(id); setSelectedIds(n); },
                                    onLongPress: handleLongPress
                                }}
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

            <SwipeableModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <div className="p-5 h-full flex flex-col">
                    <div className="flex justify-between items-center mb-6 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${editingId ? 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600'}`}>
                                {editingId ? <ArrowRightLeft className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-zinc-900 dark:text-white leading-none">{editingId ? 'Editar Ordem' : 'Nova Ordem'}</h2>
                                <p className="text-xs text-zinc-500 font-medium mt-0.5">Preencha os dados do ativo</p>
                            </div>
                        </div>
                        {editingId && <button onClick={() => onRequestDeleteConfirmation(editingId)} className="p-2 text-rose-500 bg-rose-50 rounded-lg press-effect"><Trash2 className="w-5 h-5" /></button>}
                    </div>
                    
                    <div className="space-y-4 flex-1 overflow-y-auto no-scrollbar pb-10">
                        <div className="relative bg-zinc-100 dark:bg-zinc-800 p-1 rounded-2xl flex h-12">
                            <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-zinc-700 rounded-xl shadow-sm transition-all duration-300 ease-out-mola ${type === 'BUY' ? 'left-1' : 'left-[calc(50%)]'}`}></div>
                            <button onClick={() => setType('BUY')} className={`relative z-10 flex-1 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-colors ${type === 'BUY' ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'}`}><ArrowDownLeft className="w-4 h-4" strokeWidth={3} /> Compra</button>
                            <button onClick={() => setType('SELL')} className={`relative z-10 flex-1 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-colors ${type === 'SELL' ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'}`}><ArrowUpRight className="w-4 h-4" strokeWidth={3} /> Venda</button>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1 px-1">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Código do Ativo</label>
                                {ticker.length >= 4 && (
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 ${assetType === AssetType.FII ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'}`}>
                                        <Tag className="w-2.5 h-2.5" /> {assetType === AssetType.FII ? 'Fundo Imob.' : 'Ação'}
                                    </span>
                                )}
                            </div>
                            <div className="relative group">
                                <input type="text" value={ticker} onChange={e => handleTickerChange(e.target.value)} placeholder="EX: PETR4" className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-4 text-2xl font-black uppercase outline-none focus:border-zinc-400 dark:focus:border-zinc-600 focus:ring-4 focus:ring-zinc-100 dark:focus:ring-zinc-800 transition-all placeholder:text-zinc-300" />
                                {ticker && <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1"><button onClick={() => setAssetType(assetType === AssetType.FII ? AssetType.STOCK : AssetType.FII)} className="px-3 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-[10px] font-bold text-zinc-500 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors">Trocar</button></div>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1 mb-1 block">Quantidade</label>
                                <div className="relative">
                                    <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0" className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-4 pr-8 py-3.5 text-lg font-bold outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-all" />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-400 uppercase">un</span>
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center gap-1 mb-1 ml-1">
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Preço Unitário</label>
                                    <InfoTooltip title="Preço Unitário" text="Valor exato de execução da ordem." />
                                </div>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">R$</span>
                                    <input type="text" inputMode="numeric" value={price} onChange={handlePriceChange} placeholder="0,00" className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-9 pr-4 py-3.5 text-lg font-bold outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-all" />
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1 px-1">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Data da Ordem</label>
                                <button onClick={() => setDate(new Date().toISOString().split('T')[0])} className="text-[9px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded hover:bg-indigo-100 transition-colors">Hoje</button>
                            </div>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3.5 text-sm font-bold outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-all" />
                        </div>

                        <div className="pt-2">
                            <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl p-3 flex justify-between items-center relative overflow-hidden">
                                <div className="flex items-center gap-3 pl-2">
                                    <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-500"><Calculator className="w-5 h-5" /></div>
                                    <div>
                                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Estimado</p>
                                        <p className="text-xs text-zinc-500 font-medium">{quantity || 0} un x {formatBRL(rawPrice)}</p>
                                    </div>
                                </div>
                                <div className="text-right pr-2">
                                    <p className={`text-lg font-black tracking-tight ${type === 'BUY' ? 'text-zinc-900 dark:text-white' : 'text-emerald-500'}`}>{formatBRL(estimatedTotal)}</p>
                                </div>
                            </div>
                            <button onClick={handleSave} disabled={isSaving || !ticker || !quantity || !price} className="w-full mt-3 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl press-effect disabled:opacity-50 disabled:cursor-not-allowed">
                                {isSaving ? 'Salvando...' : 'Confirmar Ordem'}
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
