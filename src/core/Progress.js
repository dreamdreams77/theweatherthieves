/** Cross-chapter save: which chapter to resume, completed chapters, collected weather memories. */
const KEY = 'weather-thieves-progress-v1';
export const Progress = {
  data: { chapter: 1, done: [], memories: [], flags: {} },
  load() { try { const d = JSON.parse(localStorage.getItem(KEY) || 'null'); if (d) this.data = { chapter: 1, done: [], memories: [], flags: {}, ...d }; } catch {} return this.data; },
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch {} },
  reset() { this.data = { chapter: 1, done: [], memories: [], flags: {} }; try { localStorage.removeItem(KEY); localStorage.removeItem('weather-thieves-save-v1'); } catch {} },
  complete(n) { if (!this.data.done.includes(n)) this.data.done.push(n); this.data.chapter = Math.max(this.data.chapter, n + 1); this.save(); },
  setChapter(n) { this.data.chapter = n; this.save(); },
  addMemory(id) { if (!this.data.memories.includes(id)) { this.data.memories.push(id); this.save(); return true; } return false; },
  hasMemory(id) { return this.data.memories.includes(id); },
  flag(k, v) { if (v === undefined) return this.data.flags[k]; this.data.flags[k] = v; this.save(); },
};
