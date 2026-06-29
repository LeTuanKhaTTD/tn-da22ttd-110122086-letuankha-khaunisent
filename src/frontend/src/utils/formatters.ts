export function formatPercent(value: number): string {
  const normalized = Number.isFinite(value) ? value : 0;
  const asPercent = normalized > 1 ? normalized : normalized * 100;
  return `${asPercent.toFixed(1)}%`;
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(Number.isFinite(value) ? Math.round(value) : 0);
}
