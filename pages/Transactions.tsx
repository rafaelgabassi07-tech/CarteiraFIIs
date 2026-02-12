
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TrendingUp, TrendingDown, Plus, Hash, Trash2, Save, X, ArrowRightLeft, Building2, CandlestickChart, Filter, Check, Calendar, CheckSquare, Search, ChevronDown, RefreshCw, Wallet, DollarSign, ArrowUpRight, ArrowDownLeft, Pencil } from 'lucide-react';
import { SwipeableModal, ConfirmationModal } from '../components/Layout';
import { Transaction, AssetType } from '../types';

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
    const { totalInvested, totalSold, netFlow, count } = useMemo(() => {
        let invested = 0;
        let sold = 0;
        transactions.forEach(t => {
            const val = t.quantity * t.price;
            if (t.type === 'BUY') invested += val;
            else sold += val;
        });
        return { totalInvested: invested, totalSold: sold, netFlow: invested - sold, count: transactions.length };
    }, [transactions]);

    return (
        <div className="space-y-3 mb-6">
            {/* Hero Card: Resultado Líquido */}
            <div className="relative overflow-hidden bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-200/50 dark:shadow-black/50">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Wallet className="w-16 h-16 text-zinc-500" />
                </div>
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Resultado Líquido</span>
                        <span className="text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-500 border border-zinc-200 dark:border-zinc-700">{count} Ordens</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
                            {formatBRL(Math.abs(netFlow), privacyMode)}
                        </h2>
                        <span className={`text-xs font-black px-1.5 py-0.5 rounded-md ${netFlow >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                            {netFlow >= 0 ? 'INVESTIDO' : 'RETIRADO'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Grid Secundário: Entradas e Saídas */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <ArrowDownLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
                        </div>
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">Compras</span>
                    </div>
                    <p className="text-sm font-black text-zinc-900 dark:text-white truncate">{formatBRL(totalInvested, privacyMode)}</p>
                </div>
                
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-900/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
                            <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                        </div>
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">Vendas</span>
                    </div>
                    <p className="text-sm font-black text-zinc-900 dark:text-white truncate">{formatBRL(totalSold, privacyMode)}</p>
                </div>
            </div>
        </div>
    );
};

// Componente Customizado para Filtro de Ano
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
  
  if (item.type === 'header') {
      return (
          <div className="sticky top-[158px] z-10 py-3 bg-primary-light/95 dark:bg-primary-dark/95 backdrop-blur-xl -mx-4 px-4 border-b border-zinc-100 dark:border-zinc-800/50 mb-1 mt-2 shadow-sm">
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
        onClick={() => isSelectionMode ? data.onToggleSelect(t.id) : data.onRowClick(t)}
        className={`w-full text-left py-3 px-2 flex items-center justify-between group transition-all duration-200 border-b border-zinc-50 dark:border-zinc-800/50 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 rounded-xl mb-1 ${
            isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-900/30 ring-1 ring-indigo-500/20' : ''
        }`}
      >
          <div className="flex items-center gap-3">
              {isSelectionMode ? (
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all border ${isSelected ? 'bg-zinc-900 dark:bg-white border-transparent text-white dark:text-zinc-900' : 'bg-transparent border-zinc-300 dark:border-zinc-600'}`}>
                      {isSelected && <Check className="w-3 h-3" strokeWidth={3} />}
                  </div>
              ) : (
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-[10px] font-black border shadow-sm ${isBuy ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30' : 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/30'}`}>
                      {isBuy ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  </div>
              )}
              
              <div>
                  <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-zinc-900 dark:text-white tracking-tight">
                          {t.ticker}
                      </h4>
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide ${t.assetType === AssetType.FII ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' : 'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400'}`}>
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
    onBulkDelete: (ids: string[]) => Promise<void>;
    onRequestDeleteConfirmation: (id: string) => void;
    privacyMode?: boolean;
}

const TransactionsComponent: React.FC<TransactionsProps> = ({ transactions, onAddTransaction, onUpdateTransaction, onBulkDelete, onRequestDeleteConfirmation, privacyMode = false }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    // --- ESTADOS DE FILTRO ---
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
    const [assetFilter, setAssetFilter] = useState<'ALL' | 'FII' | 'STOCK'>('ALL');
    const [yearFilter, setYearFilter] = useState<string>('ALL');
    
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
    
    const estimatedTotal = (parseFloat(quantity.replace(',','.')) || 0) * (parseFloat(price.replace(',','.')) || 0);

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

    // Nova função de Delete em Massa que usa o callback do pai (App.tsx)
    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        try {
            await onBulkDelete(Array.from(selectedIds));
            setSelectedIds(new Set());
            setIsSelectionMode(false);
        } catch (err) { alert('Erro ao excluir.'); } finally { setShowBulkDeleteConfirm(false); }
    };

    const clearFilters = () => {
        setSearchTerm(''); setTypeFilter('ALL'); setAssetFilter('ALL'); setYearFilter('ALL');
    };

    const hasActiveFilters = searchTerm || typeFilter !== 'ALL' || assetFilter !== 'ALL' || yearFilter !== 'ALL';

    return (
        <div className="anim-fade-in min-h-screen pb-32">
            {/* Header Sticky com Filtros */}
            <div className="sticky top-20 z-20 bg-primary-light dark:bg-primary-dark transition-all -mx-4 px-4 pt-2 pb-3 border-b border-zinc-200 dark:border-zinc-800 shadow-sm">
                
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                        {isSelectionMode ? (
                            <span className="text-indigo-500">{selectedIds.size} selecionados</span>
                        ) : (
                            <>Histórico</>
                        )}
                    </h2>
                    
                    <div className="flex items-center gap-2">
                        {isSelectionMode ? (
                            <>
                                {selectedIds.size > 0 && <button onClick={() => setShowBulkDeleteConfirm(true)} className="p-2 bg-rose-100 text-rose-600 rounded-lg"><Trash2 className="w-4 h-4" /></button>}
                                <button onClick={() => { setIsSelectionMode(false); setSelectedIds(new Set()); }} className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Cancelar</button>
                            </>
                        ) : (
                            <>
                                {hasActiveFilters && (
                                    <button onClick={clearFilters} className="text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-3 py-1.5 rounded-lg flex items-center gap-1 mr-1 transition-colors hover:bg-rose-100">
                                        <X className="w-3 h-3" /> Limpar
                                    </button>
                                )}
                                <button onClick={() => setIsSelectionMode(true)} className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors bg-zinc-100 dark:bg-zinc-800 rounded-lg"><CheckSquare className="w-4 h-4" /></button>
                                <button onClick={handleOpenAdd} className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 w-8 h-8 rounded-lg flex items-center justify-center shadow-md press-effect"><Plus className="w-5 h-5" /></button>
                            </>
                        )}
                    </div>
                </div>

                {!isSelectionMode && (
                    <div className="space-y-3">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Buscar ativo..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value.toUpperCase())}
                                className="w-full bg-zinc-100 dark:bg-zinc-800 pl-10 pr-4 py-2 rounded-xl text-xs font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all border border-transparent focus:bg-white dark:focus:bg-zinc-900 focus:border-indigo-500/20"
                            />
                        </div>

                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                            <YearFilterChip years={availableYears} selectedYear={yearFilter} onChange={setYearFilter} />
                            <FilterChip label={typeFilter === 'ALL' ? 'Tipo' : typeFilter === 'BUY' ? 'Compras' : 'Vendas'} active={typeFilter !== 'ALL'} onClick={() => setTypeFilter(prev => prev === 'ALL' ? 'BUY' : prev === 'BUY' ? 'SELL' : 'ALL')} />
                            <FilterChip label={assetFilter === 'ALL' ? 'Classe' : assetFilter === 'FII' ? 'FIIs' : 'Ações'} active={assetFilter !== 'ALL'} onClick={() => setAssetFilter(prev => prev === 'ALL' ? 'FII' : prev === 'FII' ? 'STOCK' : 'ALL')} />
                        </div>
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
                        {hasActiveFilters && <button onClick={clearFilters} className="mt-2 text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Limpar filtros</button>}
                    </div>
                )}
            </div>

            {/* Modal de Edição MELHORADO */}
            <SwipeableModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <div className="flex flex-col h-full bg-[#F2F2F2] dark:bg-black relative">
                    
                    {/* Header Colorido Dinâmico */}
                    <div className={`pt-6 pb-8 px-6 rounded-b-[2rem] transition-colors duration-300 ${type === 'BUY' ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-rose-500 text-white shadow-rose-500/20'} shadow-lg mb-4`}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-black">{editingId ? 'Editar Ordem' : 'Nova Ordem'}</h2>
                            {editingId && (
                                <button onClick={() => onRequestDeleteConfirmation(editingId)} className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-colors">
                                    <Trash2 className="w-5 h-5 text-white" />
                                </button>
                            )}
                        </div>
                        <div className="flex bg-black/10 p-1 rounded-xl backdrop-blur-sm">
                            <button onClick={() => setType('BUY')} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${type === 'BUY' ? 'bg-white text-emerald-600 shadow-md' : 'text-white/70 hover:text-white'}`}>Compra</button>
                            <button onClick={() => setType('SELL')} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${type === 'SELL' ? 'bg-white text-rose-600 shadow-md' : 'text-white/70 hover:text-white'}`}>Venda</button>
                        </div>
                    </div>

                    <div className="px-6 space-y-5 pb-20">
                        {/* Input Ticker */}
                        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center justify-between">
                            <div className="flex-1">
                                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Código do Ativo</label>
                                <input 
                                    type="text" 
                                    value={ticker} 
                                    onChange={e => { 
                                        const val = e.target.value.toUpperCase();
                                        setTicker(val); 
                                        if (!editingId) {
                                            if (val.endsWith('11') || val.endsWith('11B')) setAssetType(AssetType.FII);
                                            else if (val.length >= 5) setAssetType(AssetType.STOCK);
                                        }
                                    }} 
                                    placeholder="PETR4" 
                                    className="w-full bg-transparent text-2xl font-black text-zinc-900 dark:text-white outline-none placeholder:text-zinc-300 uppercase"
                                />
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => setAssetType(AssetType.STOCK)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${assetType === AssetType.STOCK ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent' : 'bg-transparent text-zinc-400 border-zinc-200 dark:border-zinc-700'}`}>Ação</button>
                                <button onClick={() => setAssetType(AssetType.FII)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${assetType === AssetType.FII ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent' : 'bg-transparent text-zinc-400 border-zinc-200 dark:border-zinc-700'}`}>FII</button>
                            </div>
                        </div>

                        {/* Grid Quantidade e Preço */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Quantidade</label>
                                <input 
                                    type="number" 
                                    value={quantity} 
                                    onChange={e => setQuantity(e.target.value)} 
                                    placeholder="0" 
                                    className="w-full bg-transparent text-xl font-bold text-zinc-900 dark:text-white outline-none placeholder:text-zinc-300" 
                                />
                            </div>
                            <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Preço Unitário</label>
                                <div className="flex items-center gap-1">
                                    <span className="text-zinc-400 font-medium text-sm">R$</span>
                                    <input 
                                        type="number" 
                                        value={price} 
                                        onChange={e => setPrice(e.target.value)} 
                                        placeholder="0.00" 
                                        className="w-full bg-transparent text-xl font-bold text-zinc-900 dark:text-white outline-none placeholder:text-zinc-300" 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Data */}
                        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-zinc-400" />
                            <div className="flex-1">
                                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Data da Operação</label>
                                <input 
                                    type="date" 
                                    value={date} 
                                    onChange={e => setDate(e.target.value)} 
                                    className="w-full bg-transparent text-sm font-bold text-zinc-900 dark:text-white outline-none pt-0.5" 
                                />
                            </div>
                        </div>

                        {/* Total Estimado */}
                        <div className="flex items-center justify-between px-2 pt-2">
                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Total da Ordem</span>
                            <span className={`text-2xl font-black ${type === 'BUY' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {formatBRL(estimatedTotal)}
                            </span>
                        </div>

                        <button 
                            onClick={handleSave} 
                            disabled={isSaving || !ticker || !quantity || !price} 
                            className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl press-effect disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors ${type === 'BUY' ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-rose-500 shadow-rose-500/20'}`}
                        >
                            {isSaving ? 'Salvando...' : editingId ? 'Atualizar Ordem' : 'Confirmar Ordem'}
                        </button>
                    </div>
                </div>
            </SwipeableModal>

            <ConfirmationModal isOpen={showBulkDeleteConfirm} title="Excluir Itens?" message={`Deseja apagar ${selectedIds.size} registros selecionados?`} onConfirm={handleBulkDelete} onCancel={() => setShowBulkDeleteConfirm(false)} />
        </div>
    );
};

export const Transactions = React.memo(TransactionsComponent);
