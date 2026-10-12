function generateAreasForRsd(n: number, mean: number, targetRsdPct: number): number[] {
  if (n <= 1 || targetRsdPct === 0) return Array(n).fill(Math.round(mean));
  const targetSd = mean * targetRsdPct / 100;
  const base = [];
  for (let i = 0; i < n; i++) {
    base.push(i - (n - 1) / 2); // symmetric around 0
  }
  const baseVar = base.reduce((a, b) => a + b * b, 0) / (n - 1);
  const baseSd = Math.sqrt(baseVar);
  const scale = targetSd / baseSd;
  return base.map(x => Math.round(mean + x * scale));
}
console.log(generateAreasForRsd(5, 1000000, 1.2));
