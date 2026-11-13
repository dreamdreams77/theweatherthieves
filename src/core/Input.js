import * as THREE from 'three';
/** Unified keyboard / mouse / touch input. */
export class Input {
  constructor(canvas) {
    this.canvas = canvas; this.keys = new Set(); this.pressed = new Set();
    this.move = new THREE.Vector2(); this.touchMove = new THREE.Vector2();
    this.orbit = new THREE.Vector2(); this.zoom = 0; this.pointer = new THREE.Vector2(0, 0); this.pointerPx = new THREE.Vector2();
    this.down = false; this.justDown = false; this.justUp = false; this.rightDown = false; this.touchMode = false; this.useHeld = false; this.hasPointer = false; this.lock = false;
    this.pressedTouch = new Set(); this.drag = new THREE.Vector2();
    addEventListener('keydown', (e) => { if (e.repeat) return; const menu = document.querySelector('#pause:not(.hidden), #album:not(.hidden), #help:not(.hidden)') || /^(BUTTON|INPUT|SELECT|TEXTAREA)$/.test(e.target?.tagName || ''); if (!menu && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault(); this.keys.add(e.code); this.pressed.add(e.code); });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.down = false; this.rightDown = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') { this.touchStart(e); return; }
      canvas.setPointerCapture(e.pointerId); this.setPtr(e);
      if (e.button === 2 || e.button === 1) this.rightDown = true; else { this.down = true; this.justDown = true; }
    });
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') { this.touchMove_(e); return; }
      const px = this.pointerPx.x, py = this.pointerPx.y; this.setPtr(e);
      if (this.rightDown) { this.orbit.x -= e.movementX ?? (this.pointerPx.x - px); this.orbit.y -= e.movementY ?? (this.pointerPx.y - py); }
    });
    const up = (e) => { if (e.pointerType === 'touch') { this.touchEnd(e); return; } if (e.button === 2 || e.button === 1) this.rightDown = false; else if (this.down) { this.down = false; this.justUp = true; } };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); this.zoom += Math.sign(e.deltaY); }, { passive: false });
    this.touches = new Map();
  }
  setPtr(e) { const r = this.canvas.getBoundingClientRect(); this.pointerPx.set(e.clientX - r.left, e.clientY - r.top); this.pointer.set((this.pointerPx.x / r.width) * 2 - 1, -(this.pointerPx.y / r.height) * 2 + 1); this.hasPointer = true; }
  // --- touch camera drag (single finger on canvas = orbit, tap = pick)
  touchStart(e) { this.touchMode = true; this.canvas.setPointerCapture(e.pointerId); this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() }); }
  touchMove_(e) { const t = this.touches.get(e.pointerId); if (!t) return; const dx = e.clientX - t.x, dy = e.clientY - t.y; t.x = e.clientX; t.y = e.clientY;
    if (this.touches.size >= 2) { const arr = [...this.touches.values()]; /* pinch */ } this.orbit.x -= dx * 1.2; this.orbit.y -= dy * 1.2; }
  touchEnd(e) { const t = this.touches.get(e.pointerId); this.touches.delete(e.pointerId); if (!t) return;
    if (performance.now() - t.t < 260 && Math.hypot(e.clientX - t.sx, e.clientY - t.sy) < 12) { this.setPtr(e); this.tap = true; } }
  wasPressed(code) { return this.pressed.has(code); }
  update() {
    let x = 0, y = 0; const k = this.keys;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1; if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    if (k.has('KeyW') || k.has('ArrowUp')) y += 1; if (k.has('KeyS') || k.has('ArrowDown')) y -= 1;
    this.move.set(x, y); if (x && y) this.move.multiplyScalar(0.7071);
    if (this.touchMove.lengthSq() > 0.01) this.move.copy(this.touchMove);
    this.jump = this.pressed.has('Space') || this.pressedTouch.has('jump');
  }
  endFrame() { this.pressed.clear(); this.pressedTouch.clear(); this.justDown = false; this.justUp = false; this.orbit.set(0, 0); this.zoom = 0; this.tap = false; }
}
