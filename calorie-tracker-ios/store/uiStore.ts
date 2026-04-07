import { create } from 'zustand';
import { FoodAnalysisResult } from '@/types/ai';

type ScanState = 'idle' | 'capturing' | 'analyzing' | 'result' | 'error';

interface UIState {
  scanState: ScanState;
  scanResult: FoodAnalysisResult | null;
  scanError: string | null;
  isVoiceListening: boolean;

  setScanState: (state: ScanState) => void;
  setScanResult: (result: FoodAnalysisResult) => void;
  setScanError: (error: string) => void;
  resetScan: () => void;
  setVoiceListening: (listening: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  scanState: 'idle',
  scanResult: null,
  scanError: null,
  isVoiceListening: false,

  setScanState: (scanState) => set({ scanState }),
  setScanResult: (scanResult) => set({ scanResult, scanState: 'result' }),
  setScanError: (scanError) => set({ scanError, scanState: 'error' }),
  resetScan: () => set({ scanState: 'idle', scanResult: null, scanError: null }),
  setVoiceListening: (isVoiceListening) => set({ isVoiceListening }),
}));
