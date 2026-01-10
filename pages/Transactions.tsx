
import React, { useMemo, useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Plus, Calendar, Hash, DollarSign, Trash2, Save, X, ArrowRightLeft, Building2, CandlestickChart } from 'lucide-react';
import * as ReactWindow from 'react-window';
import { SwipeableModal } from '../components/Layout';
import { Transaction, AssetType } from '../types';

const List = ReactWindow.VariableSizeList;

const formatBRL = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

const TransactionRow = React.memo(({ index, style, data }: any) => {
  const item = data.items[index];
  if (item.type === 'header') {
      return (
          <div style={style} className="px-2 pt-8 pb-3">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">{item.monthKey}</h3>
          </div>
      );
  }
  const t = item.data;
  const isBuy = t.type === 'BUY';
  return (
      <div style={style} className="px-1 py-2">
          <button onClick={() => data.onRowClick(t)} className="w-full text-left bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-card active:scale-[0.98] transition-all hover:border-zinc-300 dark:hover:border-zinc-700">
              <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isBuy ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'}`}>
                      {isBuy ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                  </div>
                  <div>
                      <h4 className="font-black text-base text-zinc-900 dark:text-white leading-tight">{t.ticker}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t.date.split('-').reverse().slice(0,2).join('/')}</span>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${t.assetType === AssetType.FII ? 'bg-indigo-600 text-white' : 'bg-sky-500 text-white'}`}>
                            {t.assetType === AssetType.FII ? 'FII' : 'Ação'}
                        </span>
                      </div>
                  </div>
              </div>
              <div className="text-right">
                  <p className="text-sm font-black text-zinc-900 dark:text-white">R$ {formatBRL(t.price * t.quantity)}</p>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">{t.quantity} Unid.</p>
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
}

const TransactionsComponent: React.FC<TransactionsProps> = ({ transactions, onAddTransaction, onUpdateTransaction, onRequestDeleteConfirmation }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [ticker, setTicker] = useState('');
    const [type, setType] = useState<'BUY' | 'SELL'>('BUY');
    const [assetType, setAssetType] = useState<AssetType>(AssetType.FII);
    const [quantity, setQuantity] = useState('');
    const [price, setPrice] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

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
        return { flatTransactions: list, getItemSize: (i: number) => list[i].type === 'header' ? 60 : 96 };
    }, [transactions]);

    const handleOpenAdd = () => {
        setEditingId(null); setTicker(''); setType('BUY'); setAssetType(AssetType.FII);
        setQuantity(''); setPrice(''); setDate(new Date().toISOString().split('T')[0]);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (t: Transaction) => {
        setEditingId(t.id); setTicker(t.ticker); setType(t.type);
        setAssetType(t.assetType || AssetType.FII); setQuantity(String(t.quantity));
        setPrice(String(t.price)); setDate(t.date.split('T')[0]);
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!ticker || !quantity || !price || !date) return;
        const payload = { ticker: ticker.toUpperCase(), type, assetType, quantity: Number(quantity), price: Number(price), date };
        setIsModalOpen(false);
        if (editingId) await onUpdateTransaction(editingId, payload);
        else await onAddTransaction(payload);
    };

    return (
        <div className="pt-24 pb-32 px-5 max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-8 px-1">
                <div>
                    <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight leading-tight">Ordens</h2>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{transactions.length} Registros</p>
                </div>
                <button onClick={handleOpenAdd} className="w-14 h-14 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-[1.5rem] flex items-center justify-center shadow-xl active:scale-90 transition-transform"><Plus className="w-7 h-7" strokeWidth={3} /></button>
            </div>
            <div className="h-[calc(100vh-220px)]">
                {transactions.length > 0 ? (
                    <List height={window.innerHeight - 220} itemCount={flatTransactions.length} itemSize={getItemSize} width="100%" itemData={{ items: flatTransactions, onRowClick: handleOpenEdit }}>
                        {TransactionRow}
                    </List>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-40">
                        <ArrowRightLeft className="w-16 h-16 mb-4" strokeWidth={1} />
                        <p className="text-sm font-bold">Nenhuma ordem lançada.</p>
                    </div>
                )}
            </div>

            <SwipeableModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <div className="p-8 pb-12">
                    <h2 className="text-2xl font-black text-zinc-900 dark:text-white mb-8">{editingId ? 'Editar Lançamento' : 'Novo Lançamento'}</h2>
                    <div className="space-y-6">
                        <div className="p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Ativo (Ticker)</label>
                            <input type="text" value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} placeholder="EX: PETR4" className="w-full bg-transparent text-3xl font-black text-zinc-900 dark:text-white outline-none uppercase" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-2xl relative">
                                <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white dark:bg-zinc-700 rounded-xl shadow transition-all duration-300 ${type === 'SELL' ? 'translate-x-[100%] translate-x-1.5' : 'left-1.5'}`}></div>
                                <button onClick={() => setType('BUY')} className={`relative z-10 flex-1 py-3 text-[10px] font-black uppercase tracking-widest ${type === 'BUY' ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'}`}>Compra</button>
                                <button onClick={() => setType('SELL')} className={`relative z-10 flex-1 py-3 text-[10px] font-black uppercase tracking-widest ${type === 'SELL' ? 'text-rose-500' : 'text-zinc-400'}`}>Venda</button>
                            </div>
                            <div className="flex p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-2xl relative">
                                <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white dark:bg-zinc-700 rounded-xl shadow transition-all duration-300 ${assetType === AssetType.STOCK ? 'translate-x-[100%] translate-x-1.5' : 'left-1.5'}`}></div>
                                <button onClick={() => setAssetType(AssetType.FII)} className={`relative z-10 flex-1 py-3 text-[10px] font-black uppercase tracking-widest ${assetType === AssetType.FII ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'}`}>FII</button>
                                <button onClick={() => setAssetType(AssetType.STOCK)} className={`relative z-10 flex-1 py-3 text-[10px] font-black uppercase tracking-widest ${assetType === AssetType.STOCK ? 'text-sky-500' : 'text-zinc-400'}`}>Ação</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1 block">Qtd</label>
                                <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full bg-transparent text-xl font-black text-zinc-900 dark:text-white outline-none" />
                            </div>
                            <div className="p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1 block">Preço</label>
                                <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full bg-transparent text-xl font-black text-zinc-900 dark:text-white outline-none" />
                            </div>
                        </div>
                        <button onClick={handleSave} className="w-full py-5 rounded-3xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all">Confirmar Ordem</button>
                    </div>
                </div>
            </SwipeableModal>
        </div>
    );
};

export const Transactions = React.memo(TransactionsComponent);
