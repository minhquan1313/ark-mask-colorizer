/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, type PropsWithChildren } from 'react';
import type { MaskSettingsStateValue } from '../hooks/useMaskSettingsState';

export const MaskSettingsContext = createContext<MaskSettingsStateValue | null>(null);

interface MaskSettingsProviderProps {
  value: MaskSettingsStateValue;
}

export function MaskSettingsProvider({ value, children }: PropsWithChildren<MaskSettingsProviderProps>): JSX.Element {
  return <MaskSettingsContext.Provider value={value}>{children}</MaskSettingsContext.Provider>;
}

export function useMaskSettings(): MaskSettingsStateValue {
  const context = useContext(MaskSettingsContext);
  if (!context) {
    throw new Error('useMaskSettings must be used within MaskSettingsProvider');
  }
  return context;
}
