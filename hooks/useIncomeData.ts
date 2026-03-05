import { useMemo } from 'react';
import { DividendReceipt } from '../types';
import { getMonthName } from '../utils/formatters';

export const useIncomeData = (dividendReceipts: DividendReceipt[]) => {
    return useMemo(() => {
        const groups: Record<string, number> = {};
        const historyList: { date: string, ticker: string, type: string, amount: number, paymentDate: string, status: 'paid' | 'provisioned' }[] = [];
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        // Initialize last 12 months with local keys (YYYY-MM)
        for (let i = 0; i < 12; i++) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            groups[monthKey] = 0;
        }

        let last12mTotal = 0;
        let provisionedTotal = 0;
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const oneYearAgoStr = `${oneYearAgo.getFullYear()}-${String(oneYearAgo.getMonth() + 1).padStart(2, '0')}-${String(oneYearAgo.getDate()).padStart(2, '0')}`;

        const sortedReceipts = [...dividendReceipts].sort((a, b) => {
            const dateA = a.paymentDate || a.dateCom;
            const dateB = b.paymentDate || b.dateCom;
            return dateB.localeCompare(dateA);
        });

        sortedReceipts.forEach(d => {
            if (!d.paymentDate || d.paymentDate === 'A Definir') return;
            
            const isFuture = d.paymentDate > todayStr;
            const status = isFuture ? 'provisioned' : 'paid';

            if (isFuture) {
                provisionedTotal += d.totalReceived;
            } else {
                if (d.paymentDate >= oneYearAgoStr) last12mTotal += d.totalReceived;
            }

            const monthKey = d.paymentDate.substring(0, 7);
            // Add to group (create if not exists, as it can be future or older than 12m)
            if (groups[monthKey] === undefined) groups[monthKey] = 0;
            groups[monthKey] += d.totalReceived;

            historyList.push({
                date: d.paymentDate,
                ticker: d.ticker,
                type: d.type,
                amount: d.totalReceived,
                paymentDate: d.paymentDate,
                status
            });
        });
        
        const chartData = Object.entries(groups)
            .map(([date, value]) => ({ 
                date, 
                value, 
                label: getMonthName(date + '-01').substring(0,3).toUpperCase(),
                isFuture: date > todayStr.substring(0, 7)
            }))
            .sort((a, b) => a.date.localeCompare(b.date));

        const groupedHistory: Record<string, typeof historyList> = {};
        historyList.forEach(h => {
            const mKey = h.date.substring(0, 7);
            if (!groupedHistory[mKey]) groupedHistory[mKey] = [];
            groupedHistory[mKey].push(h);
        });

        // Calculate average only for past/closed months to avoid distortion
        const pastMonths = chartData.filter(d => !d.isFuture);
        const average = pastMonths.length > 0 ? pastMonths.reduce((acc, cur) => acc + cur.value, 0) / pastMonths.length : 0;
        const max = Math.max(...chartData.map(d => d.value));
        
        // Current Month Total (Paid + Provisioned)
        const currentMonthKey = todayStr.substring(0, 7);
        const currentMonth = groups[currentMonthKey] || 0;

        return { chartData, average, max, last12mTotal, provisionedTotal, currentMonth, groupedHistory };
    }, [dividendReceipts]);
};
