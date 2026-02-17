
// --- CENTRALIZED FORMATTERS ---

export const formatBRL = (val: any, privacy = false) => {
  if (privacy) return '••••••';
  const num = typeof val === 'number' ? val : parseFloat(val) || 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const formatPercent = (val: number | undefined | null) => {
    if (val === undefined || val === null || isNaN(val)) return '-';
    return `${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
};

export const formatNumber = (val: number | undefined | null, decimals = 2) => {
    if (val === undefined || val === null || isNaN(val)) return '-';
    return val.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

export const formatDateShort = (dateStr?: string) => {
    if (!dateStr || typeof dateStr !== 'string' || dateStr.length < 10) return '--/--';
    try {
        const parts = dateStr.split('-'); // Espera YYYY-MM-DD
        if (parts.length === 3) return `${parts[2]}/${parts[1]}`; // Retorna DD/MM
        return '--/--';
    } catch {
        return '--/--';
    }
};

export const getMonthName = (dateStr: string) => {
    try {
        const date = new Date(dateStr + 'T12:00:00'); 
        return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    } catch {
        return dateStr;
    }
};

export const getDaysUntil = (dateStr: string) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const target = new Date(dateStr + 'T12:00:00');
    target.setHours(0,0,0,0);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};
