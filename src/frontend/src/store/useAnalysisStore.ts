import { create } from 'zustand';
import type { ChannelAnalysisResponse, VideoAnalysisResponse } from '@/types/analysis';

interface AnalysisState {
  lastVideoResult: VideoAnalysisResponse | null;
  lastChannelResult: ChannelAnalysisResponse | null;
  setVideoResult: (result: VideoAnalysisResponse) => void;
  setChannelResult: (result: ChannelAnalysisResponse) => void;
  clear: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  lastVideoResult: null,
  lastChannelResult: null,
  setVideoResult: (result) => set({ lastVideoResult: result }),
  setChannelResult: (result) => set({ lastChannelResult: result }),
  clear: () => set({ lastVideoResult: null, lastChannelResult: null }),
}));
