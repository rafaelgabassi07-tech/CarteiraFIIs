import { useState, useEffect } from 'react';

export interface DailyVariationRecord {
    date: string;
    variationValue: number;
    variationPercent: number;
    totalValue: number;
}

const STORAGE_KEY = 'investfiis_daily_variation_history_v1';

export const useDailyVariationHistory = (
    currentTotalValue: number, 
    currentDailyVariation: number,
    userId?: string
) => {
    const [history, setHistory] = useState<DailyVariationRecord[]>([]);

    // Load history on mount or user change
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const allHistory = JSON.parse(stored);
                const userHistory = userId ? (allHistory[userId] || []) : (allHistory['guest'] || []);
                setHistory(userHistory);
            }
        } catch (e) {
            console.error("Failed to load variation history", e);
        }
    }, [userId]);

    // Update history when values change
    useEffect(() => {
        if (currentTotalValue === 0) return;

        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            const allHistory = stored ? JSON.parse(stored) : {};
            const userKey = userId || 'guest';
            const userHistory: DailyVariationRecord[] = allHistory[userKey] || [];

            const existingIndex = userHistory.findIndex(h => h.date === today);
            
            const newRecord: DailyVariationRecord = {
                date: today,
                variationValue: currentDailyVariation,
                variationPercent: (currentTotalValue - currentDailyVariation) > 0 
                    ? (currentDailyVariation / (currentTotalValue - currentDailyVariation)) * 100 
                    : 0,
                totalValue: currentTotalValue
            };

            let updatedHistory;
            if (existingIndex >= 0) {
                // Update today's record
                updatedHistory = [...userHistory];
                updatedHistory[existingIndex] = newRecord;
            } else {
                // Add new record
                updatedHistory = [...userHistory, newRecord];
            }

            // Sort by date descending
            updatedHistory.sort((a, b) => b.date.localeCompare(a.date));

            // Save
            allHistory[userKey] = updatedHistory;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(allHistory));
            setHistory(updatedHistory);

        } catch (e) {
            console.error("Failed to save variation history", e);
        }
    }, [currentTotalValue, currentDailyVariation, userId]);

    return history;
};
