
// ... existing imports ...
// ... existing code ...

const CeilingPriceCalc = () => {
    const [ticker, setTicker] = useState('');
    const [isLoadingTicker, setIsLoadingTicker] = useState(false);
    const [assetData, setAssetData] = useState<{ price: number, dy: number, method?: string } | null>(null); // Added method
    const [searchError, setSearchError] = useState<string | null>(null);

    const [dividend, setDividend] = useState('');
    const [yieldTarget, setYieldTarget] = useState('6');
    const [result, setResult] = useState<number | null>(null);

    const calculate = () => {
        // Handle BR format (1.200,50) correctly
        const cleanDiv = dividend.replace(/\./g, '').replace(',', '.'); 
        const cleanYield = yieldTarget.replace(',', '.');
        
        const d = parseFloat(cleanDiv) || 0;
        const y = parseFloat(cleanYield) || 0;
        
        if (y > 0) setResult((d / y) * 100);
        else setResult(null);
    };

    // Auto-recalculate when inputs change
    useEffect(() => {
        calculate();
    }, [dividend, yieldTarget]);

    const handleFetchTicker = async () => {
        const cleanTicker = ticker.trim().toUpperCase();
        if (!cleanTicker || cleanTicker.length < 3) return;
        
        setIsLoadingTicker(true);
        setSearchError(null);
        setAssetData(null);
        
        try {
            const results = await triggerScraperUpdate([cleanTicker], true);
            const data = results[0];
            
            if (data && data.status === 'success') {
                const price = data.details?.price || 0;
                let dyPercent = data.details?.dy || 0;
                let calculatedDiv = 0;
                let calculationMethod = 'Manual';

                // LÓGICA DE ESTIMATIVA DE DIVIDENDOS
                // 1. Tenta somar os dividendos reais dos últimos 12 meses (Mais preciso)
                let sum12m = 0;
                if (data.dividendsFound && data.dividendsFound.length > 0) {
                    const now = new Date();
                    const oneYearAgo = new Date();
                    oneYearAgo.setFullYear(now.getFullYear() - 1);
                    
                    data.dividendsFound.forEach((d: any) => {
                        // Suporta camelCase (types) e snake_case (api raw)
                        const dateStr = d.paymentDate || d.payment_date || d.dateCom || d.date_com;
                        if (!dateStr) return;
                        
                        const dDate = new Date(dateStr);
                        if (dDate >= oneYearAgo && dDate <= now) {
                            const val = typeof d.rate === 'number' ? d.rate : parseFloat(d.rate);
                            if (!isNaN(val)) sum12m += val;
                        }
                    });
                }

                if (sum12m > 0) {
                    calculatedDiv = sum12m;
                    calculationMethod = 'Soma 12m (Scraper)';
                    if (price > 0 && dyPercent === 0) dyPercent = (sum12m / price) * 100;
                }
                // 2. Se a soma falhar (ex: ativo novo no scraper), usa o DY anualizado fornecido pelo site
                else if (dyPercent > 0 && price > 0) {
                    calculatedDiv = price * (dyPercent / 100);
                    calculationMethod = 'DY Anual (Indicador)';
                }
                // 3. Fallback: Último rendimento x12 (Run Rate)
                else if (data.rawFundamentals) {
                    const lastDiv = typeof data.rawFundamentals.ultimo_rendimento === 'number' 
                        ? data.rawFundamentals.ultimo_rendimento 
                        : parseFloat(data.rawFundamentals.ultimo_rendimento);
                        
                    if (!isNaN(lastDiv) && lastDiv > 0) {
                        calculatedDiv = lastDiv * 12;
                        if (price > 0) dyPercent = (calculatedDiv / price) * 100;
                        calculationMethod = 'Último x12 (Estimado)';
                    }
                }

                if (price > 0) {
                    setAssetData({ price, dy: dyPercent, method: calculationMethod });
                    
                    if (calculatedDiv > 0) {
                        setDividend(calculatedDiv.toFixed(2).replace('.', ','));
                    } else {
                        setSearchError('Preço encontrado, mas sem histórico de dividendos.');
                    }
                } else {
                    setSearchError('Ativo não encontrado ou sem liquidez.');
                }
            } else {
                setSearchError('Falha ao buscar dados do ativo.');
            }
        } catch (e) {
            console.error('Error fetching ticker for calc', e);
            setSearchError('Erro de conexão.');
        } finally {
            setIsLoadingTicker(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className={`p-3 rounded-2xl border transition-colors ${searchError ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800' : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-100 dark:border-zinc-800'}`}>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 block ml-1">Buscar Automático</label>
                <div className="relative flex gap-2">
                    <input 
                        type="text" 
                        value={ticker} 
                        onChange={e => setTicker(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === 'Enter' && handleFetchTicker()}
                        placeholder="Ex: MXRF11" 
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-indigo-500 transition-all uppercase placeholder:normal-case" 
                    />
                    <button 
                        onClick={handleFetchTicker}
                        disabled={isLoadingTicker || ticker.length < 3}
                        className="bg-indigo-500 text-white rounded-xl px-3 flex items-center justify-center press-effect disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoadingTicker ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </button>
                </div>
                
                {/* Feedback Area */}
                {searchError && (
                    <p className="text-[10px] text-rose-500 font-bold mt-2 ml-1">{searchError}</p>
                )}

                {assetData && (
                    <div className="mt-3 flex flex-wrap gap-3 px-1 border-t border-zinc-200 dark:border-zinc-700 pt-2">
                        <span className="text-[10px] text-zinc-500 font-medium">Preço: <strong className="text-zinc-900 dark:text-white">{formatCurrency(assetData.price)}</strong></span>
                        <span className="text-[10px] text-zinc-500 font-medium">DY: <strong className="text-zinc-900 dark:text-white">{assetData.dy.toFixed(2)}%</strong></span>
                        {assetData.method && <span className="text-[10px] text-indigo-500 font-bold bg-indigo-50 dark:bg-indigo-900/20 px-1.5 rounded">{assetData.method}</span>}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Div. Projetado (Anual)</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">R$</span>
                        <input 
                            type="text" // Text to allow formatting
                            inputMode="decimal"
                            value={dividend} 
                            onChange={e => {
                                // Allow only numbers and comma/dot
                                const val = e.target.value.replace(/[^0-9,.]/g, '');
                                setDividend(val);
                            }} 
                            className="input-field pl-8" 
                            placeholder="0,00" 
                        />
                    </div>
                </div>
                <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Yield Alvo (%)</label>
                    <div className="relative">
                        <input 
                            type="number" 
                            value={yieldTarget} 
                            onChange={e => setYieldTarget(e.target.value)} 
                            className="input-field" 
                            placeholder="6" 
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">%</span>
                    </div>
                </div>
            </div>
            
            {result !== null && result > 0 && (
                <div className="mt-4 anim-scale-in space-y-3">
                    <div className="p-5 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl text-white text-center shadow-lg shadow-indigo-500/20 relative overflow-hidden">
                        {/* Background pattern */}
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                        
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1 relative z-10">Preço Teto ({yieldTarget}%)</p>
                        <div className="flex flex-col items-center justify-center gap-1 relative z-10">
                            <p className="text-3xl font-black tracking-tight">{formatCurrency(result)}</p>
                            
                            {assetData && (
                                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg backdrop-blur-sm border border-white/20 ${assetData.price <= result ? 'bg-emerald-400/20 text-emerald-50' : 'bg-rose-400/20 text-rose-50'}`}>
                                    <span className="text-[10px] font-bold uppercase tracking-wider">
                                        {assetData.price <= result ? 'Abaixo do Teto' : 'Acima do Teto'}
                                    </span>
                                </div>
                            )}
                        </div>
                        
                        {assetData && (
                            <div className="mt-3 pt-3 border-t border-white/10 flex justify-between text-[10px] opacity-90 relative z-10">
                                <span>Margem: {((1 - (assetData.price / result)) * 100).toFixed(1)}%</span>
                                <span>Cotação: {formatCurrency(assetData.price)}</span>
                            </div>
                        )}
                    </div>

                    {/* Matriz de Sensibilidade */}
                    <div className="grid grid-cols-3 gap-2">
                        {[6, 8, 10].map(y => {
                            // Helper para calcular rapidamente
                            const cleanDiv = dividend.replace(/\./g, '').replace(',', '.');
                            const val = ((parseFloat(cleanDiv) || 0) / y) * 100;
                            const isSelected = parseFloat(yieldTarget.replace(',', '.')) === y;
                            return (
                                <button 
                                    key={y} 
                                    onClick={() => setYieldTarget(String(y))} 
                                    className={`p-2 rounded-xl border text-center transition-all active:scale-95 ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-500/20' : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}`}
                                >
                                    <p className="text-[9px] text-zinc-400 font-bold uppercase">{y}% Yield</p>
                                    <p className={`text-xs font-bold ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
                                        {val > 0 ? formatCurrency(val) : '-'}
                                    </p>
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
