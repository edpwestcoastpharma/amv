function seededDrift(seedStr: string, maxDrift: number): number {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = Math.imul(31, hash) + seedStr.charCodeAt(i) | 0;
  }
  const random = (Math.abs(hash) % 1000) / 1000;
  return maxDrift * (random * 2 - 1);
}
console.log(seededDrift("Standard 1", 0.03));
console.log(seededDrift("Standard 2", 0.03));
