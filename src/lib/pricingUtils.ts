export const getMaxExpectedPrice = (durationLabel: string): number => {
  if (!durationLabel) return 150000;

  const lower = durationLabel.toLowerCase();
  const match = lower.match(/(\d+)/);
  const num = match ? parseInt(match[1], 10) : 1;

  let months = 1;
  if (lower.includes('year') || lower.includes('yr')) {
    months = num * 12;
  } else if (lower.includes('month') || lower.includes('mo')) {
    months = num;
  } else if (lower.includes('week') || lower.includes('wk')) {
    months = num / 4;
  } else if (lower.includes('day') || lower.includes('dy')) {
    months = num / 30;
  }

  // Baseline limit calculation:
  // - Yearly: ~60k max per year
  // - Monthly: ~8k max per month
  let maxPrice = 0;
  if (months >= 12) {
    maxPrice = (months / 12) * 60000;
  } else {
    maxPrice = months * 8000;
  }

  // Add a floor limit so we don't flag small plans aggressively (e.g., 1 day pass = 300)
  return Math.max(Math.ceil(maxPrice), 2500);
};
