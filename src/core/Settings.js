/** Player settings (persisted per browser): volume, music, reduced motion, larger text. */
const KEY = 'weather-thieves-settings-v1';
export const Settings = {
  data: { volume: 0.8, music: 1, reduceMotion: false, bigText: false, invertY: false },
  load() { try { Object.assign(this.data, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch {} if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches && localStorage.getItem(KEY) === null) this.data.reduceMotion = true; return this.data; },
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch {} },
};
