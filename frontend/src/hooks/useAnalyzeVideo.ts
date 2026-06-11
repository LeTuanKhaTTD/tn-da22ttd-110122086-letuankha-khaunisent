import { useMutation } from '@tanstack/react-query';
import { analyzeVideo } from '@/services/analysis.api';
import { useAnalysisStore } from '@/store/useAnalysisStore';
import { normalizeComment } from '@/utils/normalizeComment';
import type { VideoAnalysisPayload, VideoAnalysisResponse } from '@/types/analysis';

function normalizeVideoResponse(data: VideoAnalysisResponse): VideoAnalysisResponse {
  return {
    ...data,
    comments: (data.comments ?? []).map((comment) => normalizeComment(comment)),
  };
}

export function useAnalyzeVideo() {
  const setVideoResult = useAnalysisStore((state) => state.setVideoResult);

  return useMutation({
    mutationFn: (payload: VideoAnalysisPayload) => analyzeVideo(payload),
    onSuccess: (data) => {
      setVideoResult(normalizeVideoResponse(data));
    },
  });
}
