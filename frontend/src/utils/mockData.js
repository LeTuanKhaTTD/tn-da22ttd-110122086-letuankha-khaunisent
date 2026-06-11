/**
 * @typedef {Object} MockVideoComment
 * @property {string} id
 * @property {string} text
 * @property {'positive'|'negative'|'neutral'|'question'} label
 * @property {number} confidence
 * @property {string} time
 */

/**
 * @typedef {Object} MockVideoResult
 * @property {Object} summary
 * @property {number} summary.total
 * @property {number} summary.positive
 * @property {number} summary.negative
 * @property {number} summary.neutral
 * @property {number} summary.question
 * @property {number} summary.avgConfidence
 * @property {MockVideoComment[]} comments
 * @property {Object[]} distribution
 */

export const mockVideoResult = {
  summary: {
    total: 240,
    positive: 130,
    negative: 35,
    neutral: 60,
    question: 15,
    avgConfidence: 0.82,
  },
  distribution: [
    { name: 'Tích cực', value: 130, color: '#22c55e' },
    { name: 'Tiêu cực', value: 35, color: '#ef4444' },
    { name: 'Trung tính', value: 60, color: '#94a3b8' },
    { name: 'Câu hỏi', value: 15, color: '#a855f7' },
  ],
  comments: [
    {
      id: 'cmt-1',
      text: 'Video này quá hay, cảm ơn trường!',
      label: 'positive',
      confidence: 0.91,
      time: '2 giờ trước',
    },
    {
      id: 'cmt-2',
      text: 'Mình chưa hiểu thủ tục này, giải thích thêm được không?',
      label: 'question',
      confidence: 0.72,
      time: '3 giờ trước',
    },
    {
      id: 'cmt-3',
      text: 'Nội dung ổn nhưng hơi dài.',
      label: 'neutral',
      confidence: 0.67,
      time: 'Hôm qua',
    },
    {
      id: 'cmt-4',
      text: 'Mình thấy chưa thuyết phục lắm.',
      label: 'negative',
      confidence: 0.61,
      time: '2 ngày trước',
    },
  ],
};

export const mockChannelResult = {
  channel: {
    name: 'Trà Vinh University',
    username: '@travinhuniversity',
    avatar: 'https://i.pravatar.cc/120?img=12',
  },
  kpis: {
    totalVideos: 10,
    totalComments: 1480,
    avgPositive: 62,
    avgNegative: 14,
  },
  trend: [
    { label: 'Video 1', positive: 65, negative: 10, neutral: 25 },
    { label: 'Video 2', positive: 58, negative: 18, neutral: 24 },
    { label: 'Video 3', positive: 70, negative: 12, neutral: 18 },
    { label: 'Video 4', positive: 60, negative: 15, neutral: 25 },
    { label: 'Video 5', positive: 55, negative: 20, neutral: 25 },
  ],
  ranking: [
    { id: 'vid-1', title: 'Video 1', comments: 210, pos: 68, neg: 12, neu: 20, que: 0, rating: 'Tốt' },
    { id: 'vid-2', title: 'Video 2', comments: 180, pos: 59, neg: 18, neu: 21, que: 2, rating: 'TB' },
    { id: 'vid-3', title: 'Video 3', comments: 160, pos: 52, neg: 22, neu: 24, que: 2, rating: 'Cần xem' },
  ],
  negatives: [
    { id: 'neg-1', text: 'Thông tin chưa rõ ràng, mong cập nhật.', likes: 24 },
    { id: 'neg-2', text: 'Không thấy hướng dẫn chi tiết.', likes: 18 },
    { id: 'neg-3', text: 'Mình cần hỗ trợ thêm.', likes: 12 },
  ],
};
