/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react';

export const MaskSettingsContext = createContext(null);

export function MaskSettingsProvider({ value, children }) {
  return <MaskSettingsContext.Provider value={value}>{children}</MaskSettingsContext.Provider>;
}

export function useMaskSettings() {
  const context = useContext(MaskSettingsContext);
  if (!context) {
    throw new Error('useMaskSettings must be used within MaskSettingsProvider');
  }
  return context;
}

