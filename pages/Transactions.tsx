
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
  
  // Header Mensal com Saldo
  if (item.type === 'header') {
      const netValue = item.monthlyNet || 0;
      const isPositive = netValue >= 0;
      return (
          <div className={`pl-4 pr-2 pt-8 pb-4 flex items-end justify-between anim-fade-in relative z-10 bg-primary-light dark:bg-primary-dark ${index === 0 ? 'mt-2' : ''}`}>
              <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-700 border-4 border-white dark:border-zinc-900 shadow-sm"></div>
                  <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">{formatMonthHeader(item.monthKey)}</h3>
              </div>
              <div className="flex flex-col items-end">
                  <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Saldo do Mês</span>
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
      <div className="relative pl-4 pr-1 anim-stagger-item" style={{ animationDelay: `${(index % 10) * 30}ms` }}>
          {/* Linha do Tempo */}
          <div className={`absolute left-[5px] top-0 w-[2px] bg-zinc-200 dark:bg-zinc-800 ${isLastInGroup ? 'h-1/2' : 'h-full'}`}></div>
          
          <button 
            onClick={() => isSelectionMode ? data.onToggleSelect(t.id) : data.onRowClick(t)}
            className={`relative ml-4 w-[calc(100%-1rem)] text-left p-4 mb-3 rounded-2xl flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.03)] dark:shadow-none press-effect transition-all duration-300 border group ${
                isSelected 
                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 dark:border-indigo-400 z-10' 
                : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 z-0'
            }`}
          >
              <div className="absolute -left-[21px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-zinc-200 dark:bg-zinc-700 border-2 border-white dark:border-zinc-900 group-hover:bg-indigo-500 transition-colors"></div>

              <div className="flex items-center gap-4">
                  {isSelectionMode ? (
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-300 dark:text-zinc-600'}`}>
                          {isSelected ? <CheckCircle2 className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                      </div>
                  ) : (
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border text-xs font-black shadow-sm ${isBuy ? 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30' : 'bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/30'}`}>
                          {t.ticker.substring(0,2)}
                      </div>
                  )}
                  
                  <div>
                      <h4 className={`font-black text-sm flex items-center gap-2 ${isSelected ? 'text-indigo-900 dark:text-white' : 'text-zinc-900 dark:text-white'}`}>
                          {t.ticker}
                          <span className={`text-[8px] font-bold px-1 rounded uppercase ${isBuy ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
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
                groups[k] = { items: [], totalNet: 0 };
            }
            groups[k].items.push(t);
            const val = t.price * t.quantity;
            // Cálculo de Saldo (Compra = Saída de Caixa negativo?, Venda = Entrada positivo?)
            // Para visualização de "Volume de Investimento", geralmente soma-se Compras como positivo (Aporte)
            // Se o usuário quer ver Fluxo de Caixa: Compra (-), Venda (+).
            // Vamos adotar: Saldo de Movimentação. (Quanto comprei - Quanto vendi)
            if (t.type === 'BUY') groups[k].totalNet -= val; // Gastei dinheiro
            else groups[k].totalNet += val; // Recebi dinheiro
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
            {/* Header Sticky */}
            <div className="sticky top-20 z-30 bg-primary-light/95 dark:bg-primary-dark/95 backdrop-blur-md border-b border-zinc-200/50 dark:border-zinc-800/50 transition-all -mx-4 px-4 py-3">
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
                    <div className="absolute top-full left-0 right-0 p-4 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 anim-slide-up grid grid-cols-5 gap-2 shadow-2xl z-20">
                        {filters.map(f => (
                            <button
                                key={f.id}
                                onClick={() => { setActiveFilter(f.id); setIsFilterOpen(false); }}
                                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${activeFilter === f.id ? 'bg-zinc-900 dark:bg-zinc-800 border-zinc-900 dark:border-zinc-800 text-white' : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-400'}`}
                            >
                                <f.icon className="w-5 h-5 mb-1" />
                                <span className="text-[8px] font-black uppercase tracking-tighter">{f.label}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Lista de Transações */}
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
                        <ArrowRightLeft className="w-16 h-16 mb-4 text-zinc-300 dark:text-zinc-700" strokeWidth={1} />
                        <p className="text-sm font-bold text-zinc-500">Nenhuma ordem encontrada.</p>
                    </div>
                )}
            </div>

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
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 p-5 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/40 anim-slide-up" style={{ animationDelay: '100ms' }}>
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
                            <div className="bg-zinc-50 dark:bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/40 flex relative">
                                <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-4px)] bg-white dark:bg-zinc-700 rounded-xl shadow-sm transition-all duration-300 ease-out-soft ${type === 'SELL' ? 'translate-x-[100%] translate-x-1' : 'left-1.5'}`}></div>
                                <button onClick={() => setType('BUY')} className={`relative z-10 flex-1 py-3 text-[10px] font-black uppercase tracking-wider text-center transition-colors ${type === 'BUY' ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'}`}>Compra</button>
                                <button onClick={() => setType('SELL')} className={`relative z-10 flex-1 py-3 text-[10px] font-black uppercase tracking-wider text-center transition-colors ${type === 'SELL' ? 'text-rose-500' : 'text-zinc-400'}`}>Venda</button>
                            </div>

                            <div className="bg-zinc-50 dark:bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/40 flex relative">
                                <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-4px)] bg-white dark:bg-zinc-700 rounded-xl shadow-sm transition-all duration-300 ease-out-soft ${assetType === AssetType.STOCK ? 'translate-x-[100%] translate-x-1' : 'left-1.5'}`}></div>
                                <button onClick={() => setAssetType(AssetType.FII)} className={`relative z-10 flex-1 py-3 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-center transition-colors ${assetType === AssetType.FII ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'}`}>FII</button>
                                <button onClick={() => setAssetType(AssetType.STOCK)} className={`relative z-10 flex-1 py-3 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-center transition-colors ${assetType === AssetType.STOCK ? 'text-sky-600 dark:text-sky-400' : 'text-zinc-400'}`}>Ação</button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 anim-slide-up" style={{ animationDelay: '200ms' }}>
                            <div className="bg-zinc-50 dark:bg-zinc-900/50 p-5 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/40">
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

                            <div className="bg-zinc-50 dark:bg-zinc-900/50 p-5 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/40">
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

                        <div className="bg-zinc-50 dark:bg-zinc-900/50 p-5 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/40 flex items-center gap-4 anim-slide-up" style={{ animationDelay: '250ms' }}>
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
