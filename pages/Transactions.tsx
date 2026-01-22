
import React, { useMemo, useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Plus, Hash, DollarSign, Trash2, Save, X, ArrowRightLeft, Building2, CandlestickChart, Filter, Check, Calendar, CheckSquare, Square, CheckCircle2, Calculator, Loader2 } from 'lucide-react';
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
        <div className="grid grid-cols-3 gap-3 mb-6 px-1 anim-fade-in">
            <div className="bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm text-center">
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Total Comprado</p>
                <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">{formatBRL(totalInvested, privacyMode)}</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm text-center">
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Total Vendido</p>
                <p className="text-xs font-black text-rose-500">{formatBRL(totalSold, privacyMode)}</p>
            </div>
            <div className="bg-zinc-900 dark:bg-white p-3 rounded-2xl border border-zinc-900 dark:border-zinc-200 shadow-sm text-center">
                <p className="text-[9px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1">Fluxo Líquido</p>
                <p className="text-xs font-black text-white dark:text-zinc-900">{formatBRL(netFlow, privacyMode)}</p>
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
      const netValue = item.monthlyNet || 0;
      const isPositive = netValue >= 0;
      return (
          <div className={`flex items-end justify-between anim-fade-in relative z-10 pt-6 pb-3 ${index === 0 ? 'mt-0' : 'mt-2'}`}>
              {/* Linha vertical conectando ao próximo grupo */}
              <div className="absolute left-[7px] top-[40px] bottom-0 w-[1px] bg-zinc-200 dark:bg-zinc-800 -z-10"></div>
              
              <div className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-lg border border-white dark:border-zinc-700 shadow-sm">
                  <h3 className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.15em]">{formatMonthHeader(item.monthKey)}</h3>
              </div>
              <div className="flex items-center gap-1.5 px-2">
                  <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Saldo Mês</span>
                  <span className={`text-[10px] font-black ${isPositive ? 'text-indigo-500' : 'text-rose-500'}`}>
                      {isPositive ? '+' : ''}{formatBRL(netValue, privacyMode)}
                  </span>
              </div>
          </div>
      );
  }

  const t = item.data;
  const isBuy = t.type === 'BUY';
  const isLastInGroup = data.items[index + 1]?.type === 'header' || index === data.items.length - 1;
  
  return (
      <div className="relative pl-6 pr-1 anim-stagger-item" style={{ animationDelay: `${(index % 10) * 30}ms` }}>
          {/* Linha do Tempo Contínua */}
          <div className={`absolute left-[7px] top-0 w-[1px] bg-zinc-200 dark:bg-zinc-800 ${isLastInGroup ? 'h-1/2' : 'h-full'}`}></div>
          
          {/* Ponto indicador */}
          <div className={`absolute left-[3px] top-1/2 -translate-y-1/2 w-[9px] h-[9px] rounded-full border-2 bg-white dark:bg-zinc-950 z-10 ${isBuy ? 'border-emerald-400' : 'border-rose-400'}`}></div>
          
          <button 
            onClick={() => isSelectionMode ? data.onToggleSelect(t.id) : data.onRowClick(t)}
            className={`relative ml-2 w-full text-left p-3.5 mb-2 rounded-2xl flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-none press-effect transition-all duration-300 border group ${
                isSelected 
                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 dark:border-indigo-400 z-10' 
                : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 z-0'
            }`}
          >
              <div className="flex items-center gap-3">
                  {isSelectionMode ? (
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-300 dark:text-zinc-600'}`}>
                          {isSelected ? <CheckCircle2 className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                      </div>
                  ) : (
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border text-[10px] font-black shadow-sm ${isBuy ? 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30' : 'bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/30'}`}>
                          {t.ticker.substring(0,2)}
                      </div>
                  )}
                  
                  <div>
                      <h4 className={`font-black text-sm flex items-center gap-2 ${isSelected ? 'text-indigo-900 dark:text-white' : 'text-zinc-900 dark:text-white'}`}>
                          {t.ticker}
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${isBuy ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                              {isBuy ? 'Compra' : 'Venda'}
                          </span>
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-bold uppercase ${isSelected ? 'text-indigo-400' : 'text-zinc-400'}`}>{t.date.split('-').reverse().slice(0,2).join('/')}</span>
                        <span className="text-[10px] text-zinc-300 dark:text-zinc-600">•</span>
                        <span className={`text-[9px] font-bold uppercase ${t.assetType === AssetType.FII ? 'text-indigo-400' : 'text-sky-400'}`}>
                            {t.assetType === AssetType.FII ? 'FII' : 'Ação'}
                        </span>
                      </div>
                  </div>
              </div>
              <div className="text-right">
                  <p className={`text-sm font-black ${isSelected ? 'text-indigo-900 dark:text-white' : 'text-zinc-900 dark:text-white'}`}>{formatBRL(t.price * t.quantity, privacyMode)}</p>
                  <p className={`text-[10px] font-medium ${isSelected ? 'text-indigo-400' : 'text-zinc-400'}`}>{t.quantity} un x {t.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
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
    const [isSaving, setIsSaving] = useState(false);
    
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

    const [ticker, setTicker] = useState('');
    const [type, setType] = useState<'BUY' | 'SELL'>('BUY');
    const [assetType, setAssetType] = useState<AssetType>(AssetType.FII);
    const [quantity, setQuantity] = useState('');
    const [price, setPrice] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    
    const estimatedTotal = useMemo(() => {
        const q = parseFloat(quantity) || 0;
        const p = parseFloat(price) || 0;
        return q * p;
    }, [quantity, price]);

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
                groups[k] = { items: [], totalNet: 0 };
            }
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
        if (!ticker || !quantity || !price || !date || isSaving) return;
        setIsSaving(true);
        const payload = {
            ticker: ticker.toUpperCase(),
            type,
            assetType,
            quantity: Number(quantity.replace(',', '.')),
            price: Number(price.replace(',', '.')),
            date
        };
        
        try {
            if (editingId) await onUpdateTransaction(editingId, payload);
            else await onAddTransaction(payload);
            setIsModalOpen(false); 
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
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

    const isBuy = type === 'BUY';

    return (
        <div className="anim-fade-in relative min-h-screen pb-60">
            <div className="relative z-20 bg-primary-light dark:bg-primary-dark border-b border-zinc-200/50 dark:border-zinc-800/50 transition-all -mx-4 px-4 py-3">
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
                        {isSelectionMode && selectedIds.size > 0 && (
                            <button 
                                onClick={() => setShowBulkDeleteConfirm(true)}
                                className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-100 dark:border-rose-900/30 active:scale-95 transition-all shadow-sm anim-scale-in"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}
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
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all press-effect ${isSelectionMode ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'}`}
                        >
                            <CheckSquare className="w-5 h-5" />
                        </button>
                        {!isSelectionMode && (
                            <>
                                <button 
                                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all press-effect ${activeFilter !== 'ALL' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'}`}
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
                    <div className="absolute top-full left-0 right-0 p-4 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 anim-scale-in grid grid-cols-5 gap-2 shadow-2xl z-20 origin-top">
                        {filters.map(f => (
                            <button
                                key={f.id}
                                onClick={() => { setActiveFilter(f.id); setIsFilterOpen(false); }}
                                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all press-effect ${activeFilter === f.id ? 'bg-zinc-900 dark:bg-zinc-800 border-zinc-900 dark:border-zinc-800 text-white' : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-400'}`}
                            >
                                <f.icon className="w-5 h-5 mb-1" />
                                <span className="text-[8px] font-black uppercase tracking-tighter">{f.label}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <TransactionsSummary transactions={filteredTransactions} privacyMode={privacyMode} />

            <div className="px-1 pt-0">
                {flatTransactions.length > 0 ? (
                    <div className="space-y-0">
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
                        <ArrowRightLeft className="w-16 h-16 mb-4 text-zinc-300 dark:text-zinc-700 anim-float" strokeWidth={1} />
                        <p className="text-sm font-bold text-zinc-500">Nenhuma ordem encontrada.</p>
                    </div>
                )}
            </div>

            {/* Modal de Edição/Criação mantido idêntico mas beneficiando do SwipeableModal atualizado */}
            <SwipeableModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <div className="p-6 pb-12 bg-white dark:bg-zinc-950 min-h-full">
                    <div className="flex items-center justify-between mb-6 anim-slide-up">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm ${editingId ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30 text-amber-600' : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white'}`}>
                                {editingId ? <ArrowRightLeft className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight leading-none">
                                    {editingId ? 'Editar Ordem' : 'Nova Ordem'}
                                </h2>
                                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">
                                    {editingId ? 'Atualizar registro' : 'Lançar movimentação'}
                                </p>
                            </div>
                        </div>
                        {editingId && (
                            <button 
                                onClick={() => onRequestDeleteConfirmation(editingId)}
                                className="w-10 h-10 bg-rose-50 dark:bg-rose-900/10 text-rose-500 rounded-xl flex items-center justify-center border border-rose-100 dark:border-rose-900/30 press-effect hover:bg-rose-100 dark:hover:bg-rose-900/20"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl flex relative anim-slide-up" style={{ animationDelay: '50ms' }}>
                            <div 
                                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg shadow-sm transition-all duration-300 ease-out-mola ${isBuy ? 'left-1 bg-emerald-500' : 'translate-x-[100%] left-1 bg-rose-500'}`}
                            ></div>
                            <button 
                                onClick={() => setType('BUY')} 
                                className={`relative z-10 flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-center transition-colors ${isBuy ? 'text-white' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                            >
                                <span className="flex items-center justify-center gap-1.5"><TrendingUp className="w-3 h-3" /> Compra</span>
                            </button>
                            <button 
                                onClick={() => setType('SELL')} 
                                className={`relative z-10 flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-center transition-colors ${!isBuy ? 'text-white' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                            >
                                <span className="flex items-center justify-center gap-1.5"><TrendingDown className="w-3 h-3" /> Venda</span>
                            </button>
                        </div>

                        <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 focus-within:border-zinc-400 dark:focus-within:border-zinc-600 transition-colors anim-slide-up" style={{ animationDelay: '100ms' }}>
                            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2 block flex items-center gap-1">
                                <Hash className="w-3 h-3" /> Ticker do Ativo
                            </label>
                            <input 
                                type="text" 
                                value={ticker}
                                onChange={handleTickerChange}
                                placeholder="EX: HGLG11"
                                className="w-full bg-transparent text-3xl font-black text-zinc-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-zinc-700 outline-none uppercase tracking-tight"
                                autoFocus={!editingId}
                            />
                            <div className="flex gap-2 mt-3">
                                <button onClick={() => setAssetType(AssetType.FII)} className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider border transition-colors ${assetType === AssetType.FII ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 border-indigo-200 dark:border-indigo-900/30' : 'bg-transparent text-zinc-400 border-transparent hover:bg-zinc-200 dark:hover:bg-zinc-800'}`}>
                                    FII
                                </button>
                                <button onClick={() => setAssetType(AssetType.STOCK)} className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider border transition-colors ${assetType === AssetType.STOCK ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 border-sky-200 dark:border-sky-900/30' : 'bg-transparent text-zinc-400 border-transparent hover:bg-zinc-200 dark:hover:bg-zinc-800'}`}>
                                    Ação
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 anim-slide-up" style={{ animationDelay: '150ms' }}>
                            <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 focus-within:border-zinc-400 dark:focus-within:border-zinc-600 transition-colors">
                                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1 block">Quantidade</label>
                                <input 
                                    type="number" 
                                    inputMode="numeric"
                                    value={quantity}
                                    onChange={e => setQuantity(e.target.value)}
                                    placeholder="0"
                                    className="w-full bg-transparent text-xl font-bold text-zinc-900 dark:text-white placeholder:text-zinc-300 outline-none"
                                />
                            </div>

                            <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 focus-within:border-zinc-400 dark:focus-within:border-zinc-600 transition-colors">
                                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1 block">Preço (R$)</label>
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

                        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-4 rounded-2xl flex justify-between items-center anim-slide-up shadow-sm" style={{ animationDelay: '200ms' }}>
                            <div className="flex items-center gap-2 text-zinc-400">
                                <Calculator className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Total Operação</span>
                            </div>
                            <span className={`text-lg font-black ${isBuy ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {formatBRL(estimatedTotal)}
                            </span>
                        </div>

                        <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 flex items-center gap-4 anim-slide-up" style={{ animationDelay: '250ms' }}>
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 flex items-center justify-center text-zinc-500 shadow-sm">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Data do Pregão</label>
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
                            disabled={!ticker || !quantity || !price || isSaving}
                            className={`w-full py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-xl press-effect mt-6 transition-all ${(!ticker || !quantity || !price || isSaving) ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed' : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100'}`}
                            style={{ animationDelay: '300ms' }}
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {isSaving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Confirmar Ordem'}
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
