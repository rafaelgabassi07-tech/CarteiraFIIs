
import React, { useMemo, useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Plus, Calendar, Hash, DollarSign, Trash2, Save, X, ArrowRightLeft, Building2, CandlestickChart } from 'lucide-react';
import * as ReactWindow from 'react-window';
import { SwipeableModal } from '../components/Layout';
import { Transaction, AssetType } from '../types';

const List = ReactWindow.VariableSizeList;

const formatBRL = (val: number, privacy = false) => {
  if (privacy) return '••••••';
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
};

// Componente da Linha da Transação
const TransactionRow = React.memo(({ index, style, data }: any) => {
  const item = data.items[index];
  
  // Cabeçalho de Mês
  if (item.type === 'header') {
      return (
          <div style={style} className="px-2 pt-5 pb-2 anim-fade-in">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{item.monthKey}</h3>
          </div>
      );
  }

  const t = item.data;
  const isBuy = t.type === 'BUY';
  const privacyMode = data.privacyMode;
  
  return (
      <div className="px-0.5 py-1 anim-stagger-item" style={{ ...style, animationDelay: `${(index % 10) * 30}ms` }}>
          <button 
            onClick={() => data.onRowClick(t)}
            className="w-full text-left bg-surface-light dark:bg-surface-dark p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-sm press-effect hover:border-zinc-300 dark:hover:border-zinc-700"
          >
              <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isBuy ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
                      {isBuy ? <TrendingUp className="w-4.5 h-4.5" /> : <TrendingDown className="w-4.5 h-4.5" />}
                  </div>
                  <div>
                      <h4 className="font-black text-sm text-zinc-900 dark:text-white">{t.ticker}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase">{t.date.split('-').reverse().slice(0,2).join('/')}</span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase ${t.assetType === AssetType.FII ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800' : 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-800'}`}>
                            {t.assetType === AssetType.FII ? 'FII' : 'Ação'}
                        </span>
                      </div>
                  </div>
              </div>
              <div className="text-right">
                  <p className="text-sm font-black text-zinc-900 dark:text-white">R$ {formatBRL(t.price * t.quantity, privacyMode)}</p>
                  <p className="text-[10px] text-zinc-400 font-medium">{t.quantity}x {formatBRL(t.price, privacyMode)}</p>
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

const TransactionsComponent: React.FC<TransactionsProps> = ({ transactions, onAddTransaction, onUpdateTransaction, onRequestDeleteConfirmation, privacyMode = false }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    
    // Form States
    const [ticker, setTicker] = useState('');
    const [type, setType] = useState<'BUY' | 'SELL'>('BUY');
    const [assetType, setAssetType] = useState<AssetType>(AssetType.FII);
    const [quantity, setQuantity] = useState('');
    const [price, setPrice] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    // Virtualized List Logic
    const { flatTransactions, getItemSize } = useMemo(() => {
        const sorted = [...transactions].sort((a: any,b: any) => b.date.localeCompare(a.date));
        const groups: any = {};
        sorted.forEach((t: any) => {
            const k = t.date.substring(0, 7);
            if (!groups[k]) groups[k] = [];
            groups[k].push(t);
        });
        const list: any[] = [];
        Object.keys(groups).sort((a,b) => b.localeCompare(a)).forEach(k => {
            list.push({ type: 'header', monthKey: k });
            groups[k].forEach((t: any) => list.push({ type: 'item', data: t }));
        });
        return { flatTransactions: list, getItemSize: (i: number) => list[i].type === 'header' ? 40 : 80 }; // Reduced heights
    }, [transactions]);

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
        
        // Inferência inteligente de tipo baseada no ticker
        // Se termina com 11 ou 11B, provavelmente é FII (ou Unit, mas assumimos FII como padrão user-friendly)
        // Se termina com 3, 4, 5, 6, provavelmente é Ação
        if (!editingId) { // Apenas para novas inserções para não sobrescrever edição
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

    return (
        <div className="anim-fade-in">
            {/* Header Action */}
            <div className="flex items-center justify-between mb-4 px-1 pt-2">
                <div>
                    <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                        {transactions.length} {transactions.length === 1 ? 'Ordem Registrada' : 'Ordens Registradas'}
                    </p>
                </div>
                <button 
                    onClick={handleOpenAdd}
                    className="w-11 h-11 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl flex items-center justify-center shadow-lg press-effect hover:shadow-xl anim-scale-in"
                >
                    <Plus className="w-5 h-5" strokeWidth={2.5} />
                </button>
            </div>

            {/* List */}
            <div className="h-[calc(100vh-220px)]">
                {transactions.length > 0 ? (
                    <List 
                        height={window.innerHeight - 200} 
                        itemCount={flatTransactions.length} 
                        itemSize={getItemSize} 
                        width="100%" 
                        itemData={{ items: flatTransactions, onRowClick: handleOpenEdit, privacyMode }}
                    >
                        {TransactionRow}
                    </List>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-40 anim-fade-in">
                        <ArrowRightLeft className="w-16 h-16 mb-4 text-zinc-300 dark:text-zinc-700" strokeWidth={1} />
                        <p className="text-sm font-bold text-zinc-500">Nenhuma ordem registrada.</p>
                        <button onClick={handleOpenAdd} className="mt-4 text-xs font-bold text-sky-500 uppercase tracking-widest">Adicionar Primeira</button>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
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
                                className="w-10 h-10 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-lg flex items-center justify-center border border-rose-100 dark:border-rose-500/20 press-effect"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    <div className="space-y-5">
                        {/* Ticker Input */}
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 anim-slide-up" style={{ animationDelay: '100ms' }}>
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

                        {/* Types Toggle Grid */}
                        <div className="grid grid-cols-2 gap-4 anim-slide-up" style={{ animationDelay: '150ms' }}>
                            {/* Buy/Sell */}
                            <div className="bg-zinc-50 dark:bg-zinc-900/50 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 flex relative">
                                <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-4px)] bg-white dark:bg-zinc-700 rounded-lg shadow-sm transition-all duration-300 ease-out-soft ${type === 'SELL' ? 'translate-x-[100%] translate-x-1' : 'left-1.5'}`}></div>
                                <button onClick={() => setType('BUY')} className={`relative z-10 flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center transition-colors ${type === 'BUY' ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'}`}>Compra</button>
                                <button onClick={() => setType('SELL')} className={`relative z-10 flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center transition-colors ${type === 'SELL' ? 'text-rose-500' : 'text-zinc-400'}`}>Venda</button>
                            </div>

                            {/* FII/Stock */}
                            <div className="bg-zinc-50 dark:bg-zinc-900/50 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 flex relative">
                                <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-4px)] bg-white dark:bg-zinc-700 rounded-lg shadow-sm transition-all duration-300 ease-out-soft ${assetType === AssetType.STOCK ? 'translate-x-[100%] translate-x-1' : 'left-1.5'}`}></div>
                                <button onClick={() => setAssetType(AssetType.FII)} className={`relative z-10 flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-center transition-colors ${assetType === AssetType.FII ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'}`}>
                                    <Building2 className="w-3 h-3" /> FII
                                </button>
                                <button onClick={() => setAssetType(AssetType.STOCK)} className={`relative z-10 flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-center transition-colors ${assetType === AssetType.STOCK ? 'text-sky-600 dark:text-sky-400' : 'text-zinc-400'}`}>
                                    <CandlestickChart className="w-3 h-3" /> Ação
                                </button>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-4 anim-slide-up" style={{ animationDelay: '200ms' }}>
                            <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
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

                            <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
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

                        {/* Date Input */}
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center gap-4 anim-slide-up" style={{ animationDelay: '250ms' }}>
                            <div className="w-10 h-10 rounded-lg bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
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

                        {/* Save Button */}
                        <button 
                            onClick={handleSave}
                            disabled={!ticker || !quantity || !price}
                            className={`w-full py-4 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg press-effect mt-4 anim-slide-up ${(!ticker || !quantity || !price) ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed' : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'}`}
                            style={{ animationDelay: '300ms' }}
                        >
                            <Save className="w-4 h-4" />
                            {editingId ? 'Salvar Alterações' : 'Confirmar Ordem'}
                        </button>
                    </div>
                </div>
            </SwipeableModal>
        </div>
    );
};

export const Transactions = React.memo(TransactionsComponent);
