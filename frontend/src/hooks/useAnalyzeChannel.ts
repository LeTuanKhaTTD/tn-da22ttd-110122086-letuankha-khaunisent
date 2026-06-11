import { useMutation } from '@tanstack/react-query';
import { analyzeChannel } from '@/services/analysis.api';
import { useAnalysisStore } from '@/store/useAnalysisStore';
import { normalizeComment } from '@/utils/normalizeComment';
import type { ChannelAnalysisPayload, ChannelAnalysisResponse } from '@/types/analysis';

function normalizeChannelResponse(data: ChannelAnalysisResponse): ChannelAnalysisResponse {
  return {
    ...data,
    videos: (data.videos ?? []).map((video) => ({
      ...video,
      comments: (video.comments ?? []).map((comment) => normalizeComment(comment)),
    })),
  };
}

export function useAnalyzeChannel() {
  const setChannelResult = useAnalysisStore((state) => state.setChannelResult);

  return useMutation({
    mutationFn: (payload: ChannelAnalysisPayload) => analyzeChannel(payload),
    onSuccess: (data) => {
      setChannelResult(normalizeChannelResponse(data));
    },
  });
}
