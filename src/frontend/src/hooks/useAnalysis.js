import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { analyzeChannel, analyzeVideo, getAnalysisHistory, getDashboardStats, getHealth } from '@/services/api';
import { mockChannelResult, mockVideoResult } from '@/utils/mockData';
import { toastError, toastInfo, toastSuccess } from '@/utils/toast';

const LABEL_MAP = {
  positive: { name: 'Tích cực', color: '#22c55e' },
  negative: { name: 'Tiêu cực', color: '#ef4444' },
  neutral: { name: 'Trung tính', color: '#94a3b8' },
  question: { name: 'Câu hỏi', color: '#a855f7' },
};

/**
 * @param {Array<{text?: string, sentiment?: string, confidence?: number}>} rawComments
 */
function normalizeComments(rawComments) {
  return (rawComments || []).map((comment, index) => {
    const label = (comment.sentiment || 'neutral').toLowerCase();
    const text = comment.text || '';
    const isQuestion = text.includes('?');

    return {
      id: `cmt-${index + 1}`,
      text,
      label: isQuestion ? 'question' : label,
      confidence: Number(comment.confidence || 0),
      time: 'Vừa xong',
    };
  });
}

/**
 * @param {Array<{text?: string, sentiment?: string, confidence?: number}>} rawComments
 */
function buildSummary(rawComments) {
  const comments = normalizeComments(rawComments);
  const total = comments.length;
  const positive = comments.filter((item) => item.label === 'positive').length;
  const negative = comments.filter((item) => item.label === 'negative').length;
  const neutral = comments.filter((item) => item.label === 'neutral').length;
  const question = comments.filter((item) => item.label === 'question').length;
  const avgConfidence = total > 0 ? comments.reduce((sum, item) => sum + item.confidence, 0) / total : 0;

  const distribution = [
    { name: LABEL_MAP.positive.name, value: positive, color: LABEL_MAP.positive.color },
    { name: LABEL_MAP.negative.name, value: negative, color: LABEL_MAP.negative.color },
    { name: LABEL_MAP.neutral.name, value: neutral, color: LABEL_MAP.neutral.color },
    { name: LABEL_MAP.question.name, value: question, color: LABEL_MAP.question.color },
  ];

  return {
    summary: { total, positive, negative, neutral, question, avgConfidence },
    distribution,
    comments,
  };
}

const HISTORY_STORAGE_KEY = 'analysis_history';

function loadLocalHistory() {
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveLocalHistory(items) {
  window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items.slice(0, 50)));
}

function appendLocalHistory(entry) {
  const next = [entry, ...loadLocalHistory()];
  saveLocalHistory(next);
}

/**
 * @param {any} raw
 */
function normalizeVideoResponse(raw) {
  const details = raw?.details || [];
  const mapped = buildSummary(details);

  return {
    ...mapped,
    video: {
      title: 'Video TikTok',
      url: raw?.input_url || '',
      thumbnail: '',
      views: 0,
      likes: 0,
      comments: raw?.comments_analyzed || mapped.summary.total,
      shares: 0,
    },
  };
}

/**
 * @param {any} raw
 */
function normalizeChannelResponse(raw) {
  const videos = raw?.videos || [];
  const ranking = videos.map((video, index) => {
    const summary = buildSummary(video?.details || []);
    const positivePct = summary.summary.total ? (summary.summary.positive / summary.summary.total) * 100 : 0;
    const negativePct = summary.summary.total ? (summary.summary.negative / summary.summary.total) * 100 : 0;
    const neutralPct = summary.summary.total ? (summary.summary.neutral / summary.summary.total) * 100 : 0;
    const questionPct = summary.summary.total ? (summary.summary.question / summary.summary.total) * 100 : 0;

    let rating = 'TB';
    if (positivePct >= 65 && negativePct <= 15) {
      rating = 'Tốt';
    }
    if (negativePct >= 30) {
      rating = 'Cần xem';
    }

    return {
      id: video?.video_id || `video-${index + 1}`,
      title: video?.video_id || `Video ${index + 1}`,
      comments: summary.summary.total,
      pos: Math.round(positivePct),
      neg: Math.round(negativePct),
      neu: Math.round(neutralPct),
      que: Math.round(questionPct),
      rating,
      details: summary.comments,
    };
  });

  const trend = ranking.map((row) => ({
    label: row.title,
    positive: row.pos,
    negative: row.neg,
    neutral: row.neu,
  }));

  const totalComments = ranking.reduce((sum, row) => sum + row.comments, 0);
  const avgPositive = ranking.length
    ? Math.round(ranking.reduce((sum, row) => sum + row.pos, 0) / ranking.length)
    : 0;
  const avgNegative = ranking.length
    ? Math.round(ranking.reduce((sum, row) => sum + row.neg, 0) / ranking.length)
    : 0;

  return {
    channel: {
      name: raw?.username || 'Kênh TikTok',
      username: raw?.username ? `@${raw.username}` : '@',
      avatar: 'https://i.pravatar.cc/120?img=12',
    },
    kpis: {
      totalVideos: raw?.total_videos || ranking.length,
      totalComments: totalComments || raw?.total_comments || 0,
      avgPositive,
      avgNegative,
    },
    trend,
    ranking,
    negatives: ranking
      .flatMap((row) => row.details)
      .filter((item) => item.label === 'negative')
      .slice(0, 5)
      .map((item, index) => ({
        id: `neg-${index + 1}`,
        text: item.text,
        likes: Math.round(item.confidence * 100),
      })),
  };
}

function recordAnalysisHistory(entry) {
  try {
    appendLocalHistory({
      ...entry,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    // Ignore localStorage failures.
  }
}

export function useHealth() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHealth = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getHealth();
      setHealth(data);
      setError(null);
    } catch (err) {
      setError('Không thể kết nối backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  return { health, loading, error, refresh: fetchHealth };
}

export function useDashboardStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getDashboardStats();
      setStats(data);
      setError(null);
    } catch (err) {
      setError('Không thể tải KPI dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refresh: fetchStats };
}

export function useVideoAnalysis() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('');
  const stepTimer = useRef();

  const run = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    setStep('Đang crawl bình luận...');

    if (stepTimer.current) {
      clearTimeout(stepTimer.current);
    }

    stepTimer.current = setTimeout(() => {
      setStep('Đang phân tích cảm xúc...');
    }, 4000);

    try {
      const raw = await analyzeVideo(payload);
      setData(normalizeVideoResponse(raw));
      recordAnalysisHistory({
        type: 'video',
        title: 'Phân tích Video',
        input: { url: payload.url, max_comments: payload.max_comments, model: payload.model },
        summary: raw?.summary || {},
        model_used: raw?.model_used || payload.model,
      });
      toastSuccess('Phân tích video hoàn tất');
    } catch (err) {
      setError('Không thể phân tích video, hiển thị dữ liệu mẫu.');
      setData(mockVideoResult);
      toastError('Không thể phân tích video, hiển thị dữ liệu mẫu');
    } finally {
      setStep('Hoàn tất!');
      setTimeout(() => setLoading(false), 400);
    }
  }, []);

  const useMock = useCallback(() => {
    setData(mockVideoResult);
    toastInfo('Đã tải dữ liệu mẫu cho video');
  }, []);

  return { data, loading, error, step, run, useMock };
}

export function useChannelAnalysis() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const progressTimer = useRef();

  const run = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    setProgress({ current: 1, total: payload.max_videos || 10 });

    if (progressTimer.current) {
      clearInterval(progressTimer.current);
    }

    progressTimer.current = setInterval(() => {
      setProgress((prev) => {
        if (prev.current >= prev.total) {
          return prev;
        }
        return { ...prev, current: prev.current + 1 };
      });
    }, 1500);

    try {
      const raw = await analyzeChannel(payload);
      setData(normalizeChannelResponse(raw));
      recordAnalysisHistory({
        type: 'channel',
        title: 'Phân tích Kênh',
        input: {
          username: payload.username,
          max_videos: payload.max_videos,
          comments_per_video: payload.comments_per_video,
          model: payload.model,
        },
        summary: raw?.overall_summary || {},
        model_used: raw?.model_used || payload.model,
      });
      toastSuccess('Phân tích kênh hoàn tất');
    } catch (err) {
      setError('Không thể phân tích kênh, hiển thị dữ liệu mẫu.');
      setData(mockChannelResult);
      toastError('Không thể phân tích kênh, hiển thị dữ liệu mẫu');
    } finally {
      clearInterval(progressTimer.current);
      setLoading(false);
    }
  }, []);

  const useMock = useCallback(() => {
    setData(mockChannelResult);
    toastInfo('Đã tải dữ liệu mẫu cho kênh');
  }, []);

  return { data, loading, error, progress, run, useMock };
}
