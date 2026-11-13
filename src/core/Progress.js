/** Cross-chapter save: which chapter to resume, completed chapters, collected weather memories. */
const KEY = 'weather-thieves-progress-v1';
export const Progress = {
  data: { chapter: 1, done: [], memories: [], flags: {} },
  load() { try { const d = JSON.parse(localStorage.getItem(KEY) || 'null'); if (d && typeof d === 'object') { const o = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {}); const tr = o(d.trials); for (const k in tr) if (!tr[k] || typeof tr[k].time !== 'number') delete tr[k]; this.data = { ...d, chapter: Math.max(1, +d.chapter || 1), done: Array.isArray(d.done) ? d.done : [], memories: Array.isArray(d.memories) ? d.memories : [], flags: o(d.flags), trials: tr, arcade: o(d.arcade), almanac: Array.isArray(d.almanac) ? d.almanac : [] }; } } catch {} return this.data; },
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch {} },
  reset() { this.data = { chapter: 1, done: [], memories: [], flags: {} }; try { localStorage.removeItem(KEY); localStorage.removeItem('weather-thieves-save-v1'); } catch {} },
  complete(n) { if (!this.data.done.includes(n)) this.data.done.push(n); this.data.chapter = Math.max(this.data.chapter, n + 1); this.data.unlocked = Math.max(this.data.unlocked || 1, Math.min(4, n + 1)); this.save(); },
  setChapter(n) { this.data.chapter = n; this.data.unlocked = Math.max(this.data.unlocked || 1, n); this.save(); },
  unlocked() { return Math.min(4, Math.max(this.data.unlocked || 1, Math.min(4, this.data.chapter || 1))); },
  addMemory(id) { if (!this.data.memories.includes(id)) { this.data.memories.push(id); this.save(); return true; } return false; },
  hasMemory(id) { return this.data.memories.includes(id); },
  flag(k, v) { if (v === undefined) return this.data.flags[k]; this.data.flags[k] = v; this.save(); },
};
