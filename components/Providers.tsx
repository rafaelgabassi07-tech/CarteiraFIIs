import React from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { DataProvider } from '../contexts/DataContext';
import { SettingsProvider } from '../contexts/SettingsContext';
import { NotificationProvider } from '../contexts/NotificationContext';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <NotificationProvider>
      <SettingsProvider>
        <AuthProvider>
          <DataProvider>
            {children}
          </DataProvider>
        </AuthProvider>
      </SettingsProvider>
    </NotificationProvider>
  );
};