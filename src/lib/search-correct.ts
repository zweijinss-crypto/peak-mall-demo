/**
 * S5: 拼写纠错 — Levenshtein 距离
 *
 * 简单 DP 实现,适合词典 < 200 词的情况。
 * 距离 ≤ 2 时返回最接近的候选。
 */

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  // 用一维 DP 省内存
  const prev = new Array(n + 1);
  const curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,        // deletion
        curr[j - 1] + 1,    // insertion
        prev[j - 1] + cost, // substitution
      );
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}

/**
 * S5: 从词典里找最接近 query 的候选 (Levenshtein 距离 ≤ maxDist)。
 *
 * - 忽略大小写
 * - 词典为空或 query 太短(<3 字符)返回 null (避免误纠)
 * - 多候选时返回距离最小;距离相等返回词典中较早出现的(稳定)
 */
export function suggestCorrection(
  query: string,
  dictionary: string[],
  maxDist = 2,
): string | null {
  const q = query.trim().toLowerCase();
  if (q.length < 3) return null;
  // S5: 动态阈值 — query 越长,容忍更宽
  const threshold = Math.max(maxDist, Math.floor(q.length * 0.34));
  let best: { word: string; dist: number } | null = null;
  for (const word of dictionary) {
    const w = word.toLowerCase();
    if (w === q) return null; // 完全匹配,不需要纠错
    // 不纠与词典项长度差距过大的(避免 "labtop" 纠到 "Ultra-Slim Business Laptop")
    if (Math.abs(w.length - q.length) > threshold) continue;
    const dist = levenshtein(q, w);
    if (dist > 0 && dist <= threshold && (!best || dist < best.dist)) {
      best = { word, dist };
    }
  }
  return best?.word ?? null;
}

/** S5: 给搜索场景提供词典 — 从 PRODUCTS.name + 分类名 */
export function buildDictionary(names: string[], categories: string[]): string[] {
  return Array.from(new Set([...names, ...categories]));
}