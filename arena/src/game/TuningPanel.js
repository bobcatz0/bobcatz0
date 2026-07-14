/**
 * TuningPanel — a DEV-ONLY playtest tuning panel.
 *
 * Exposes the movement + Combat V1 values as live sliders so you can feel
 * changes while playing, reset everything to the boot defaults, and export the
 * current set as JSON to save a good config. It only MUTATES live objects the
 * sim already reads each step (MovementController.cfg, the weapons' `combat`
 * blocks, and the two Health instances) — it does not change any source
 * defaults. All exposed combat numbers are PROPOSED standalone PvP values, not
 * extracted Diggerz server values.
 *
 * Hidden by default; toggle with the on-screen button (or `#tune` in the URL).
 */
export class TuningPanel {
  constructor(scene, { panelEl, toggleBtn } = {}) {
    this.scene = scene;
    this.panelEl = panelEl;
    this.toggleBtn = toggleBtn;
    if (!panelEl) return;

    this.fields = this._buildFields(scene);
    this.fieldById = Object.fromEntries(this.fields.map((f) => [f.id, f]));
    // Snapshot the boot values as the "defaults" to reset back to.
    this.defaults = Object.fromEntries(this.fields.map((f) => [f.id, f.get()]));

    this._render();

    if (toggleBtn) toggleBtn.addEventListener('click', () => this.toggle());
    if (location.hash === '#tune') this.show();
  }

  // ── Field model ─────────────────────────────────────────────────────────────
  _buildFields(scene) {
    const mc = scene.movement.cfg;
    const slots = scene.combat.hotbar.slots;
    const sword = (slots.find((w) => w.combat.kind === 'melee') || {}).combat;
    const ray = (slots.find((w) => w.id === 79) || {}).combat;
    const shotgun = (slots.find((w) => w.id === 248) || {}).combat;
    const healths = [scene.combat.attacker.health, scene.combat.dummy.health];

    const onCfg = (key) => ({ get: () => mc[key], set: (v) => { mc[key] = v; } });
    const onObj = (obj, key) => ({ get: () => obj[key], set: (v) => { obj[key] = v; } });
    const onHealth = (key) => ({ get: () => healths[0][key], set: (v) => healths.forEach((h) => { h[key] = v; }) });

    const F = (id, label, group, range, accessor, unit = '', title = '') => ({ id, label, group, unit, title, ...range, ...accessor });

    const fields = [
      // ── Movement (MovementController.cfg) ──
      F('moveSpeed', 'move speed', 'Movement', { min: 50, max: 600, step: 5 }, onCfg('moveSpeed'), 'px/s'),
      F('acceleration', 'acceleration', 'Movement', { min: 200, max: 6000, step: 50 }, onCfg('groundAccel'), 'px/s²'),
      F('friction', 'friction', 'Movement', { min: 0, max: 6000, step: 50 }, onCfg('groundFriction'), 'px/s²'),
      F('gravity', 'gravity', 'Movement', { min: 200, max: 4000, step: 50 }, onCfg('gravity'), 'px/s²'),
      F('jumpSpeed', 'jump power', 'Movement', { min: 200, max: 1400, step: 10 }, onCfg('jumpSpeed'), 'px/s',
        'Upward launch velocity. Higher = higher jump, lower = lower jump.'),
    ];
    if (sword) {
      fields.push(
        F('swordDamage', 'sword damage', 'Fake Sword', { min: 1, max: 100, step: 1 }, onObj(sword, 'damage'), 'hp'),
        F('swordCooldown', 'sword cooldown', 'Fake Sword', { min: 0.05, max: 2, step: 0.05 }, onObj(sword, 'cooldown'), 's',
          'CONFIRMED 9 game ticks; tick rate assumed 30/s (0.3s).'),
        F('swordReach', 'sword reach', 'Fake Sword', { min: 10, max: 150, step: 2 }, onObj(sword, 'reach'), 'px',
          'CONFIRMED client strike distance: tileSize/1.5 ≈ 26.7px.'),
        F('swordStrikeRadius', 'strike radius', 'Fake Sword', { min: 0, max: 30, step: 1 }, onObj(sword, 'proposedStrikeRadius'), 'px',
          'PROPOSED forgiveness around the strike point — NOT extracted from Diggerz. 0 = pure authentic point.'),
      );
    }
    if (ray) {
      fields.push(
        F('rayDamage', 'ray gun damage', 'Blue Ray Gun', { min: 1, max: 100, step: 1 }, onObj(ray, 'damage'), 'hp'),
        F('rayCooldown', 'ray gun cooldown', 'Blue Ray Gun', { min: 0.05, max: 2, step: 0.05 }, onObj(ray, 'cooldown'), 's'),
        F('rayRange', 'ray gun beam range', 'Blue Ray Gun', { min: 80, max: 800, step: 5 }, onObj(ray, 'range'), 'px',
          'PROPOSED_STANDALONE 285px ≈ 7.1 tiles — a medium-range beam TEST cap, not the OG long-range raygun.'),
        F('rayStartup', 'ray gun startup', 'Blue Ray Gun', { min: 0, max: 20, step: 1 }, onObj(ray, 'startupFrames'), 'f',
          'Startup frames (1f = 1/60s): muzzle shine/flash before the beam hitbox exists.'),
        F('rayActive', 'ray gun active', 'Blue Ray Gun', { min: 1, max: 12, step: 1 }, onObj(ray, 'activeFrames'), 'f',
          'Active frames: the beam line hitbox can damage (design: 1-2f). Recovery fade is visual only.'),
      );
    }
    if (shotgun) {
      fields.push(
        F('shotgunRange', 'shotgun range', 'Shotgun', { min: 80, max: 600, step: 10 }, onObj(shotgun, 'range'), 'px',
          'PROPOSED_STANDALONE — capped at 250px = 6.25 tiles @40px (kept below the ray beam’s 285px).'),
        F('shotgunDamage', 'shotgun damage', 'Shotgun', { min: 1, max: 100, step: 1 }, onObj(shotgun, 'damage'), 'hp',
          'PROPOSED_STANDALONE (server damage lost).'),
        F('shotgunCooldown', 'shotgun cooldown', 'Shotgun', { min: 0.05, max: 3, step: 0.05 }, onObj(shotgun, 'cooldown'), 's',
          'CONFIRMED_FROM_CLIENT 40 game ticks; tick rate assumed 30/s (1.33s).'),
      );
    }
    fields.push(
      F('respawnTime', 'respawn time', 'Respawn', { min: 0, max: 6, step: 0.1 }, onHealth('respawnDelay'), 's'),
      F('invuln', 'invulnerability time', 'Respawn', { min: 0, max: 5, step: 0.1 }, onHealth('invulnTime'), 's'),
    );
    return fields;
  }

  // ── Rendering ───────────────────────────────────────────────────────────────
  _render() {
    const el = this.panelEl;
    el.innerHTML = '';
    el.classList.add('tuning');

    const head = document.createElement('div');
    head.className = 'tuning-head';
    head.innerHTML = '<b>Playtest tuning</b> <span class="tuning-note">dev only · live · PROPOSED values</span>';
    const close = document.createElement('button');
    close.textContent = '×'; close.title = 'close'; close.className = 'tuning-x';
    close.addEventListener('click', () => this.hide());
    head.appendChild(close);
    el.appendChild(head);

    const body = document.createElement('div');
    body.className = 'tuning-body';
    let lastGroup = null;
    for (const f of this.fields) {
      if (f.group !== lastGroup) {
        const g = document.createElement('div'); g.className = 'tuning-group'; g.textContent = f.group;
        body.appendChild(g); lastGroup = f.group;
      }
      body.appendChild(this._row(f));
    }
    el.appendChild(body);

    // Buttons.
    const actions = document.createElement('div');
    actions.className = 'tuning-actions';
    const reset = document.createElement('button'); reset.textContent = 'Reset to defaults';
    reset.addEventListener('click', () => this.resetDefaults());
    const exp = document.createElement('button'); exp.textContent = 'Export JSON';
    exp.addEventListener('click', () => this._toggleExport());
    actions.append(reset, exp);
    el.appendChild(actions);

    // Export area (hidden until "Export JSON").
    this.exportBox = document.createElement('div'); this.exportBox.className = 'tuning-export'; this.exportBox.style.display = 'none';
    this.exportText = document.createElement('textarea'); this.exportText.readOnly = true; this.exportText.rows = 12; this.exportText.spellcheck = false;
    const expBtns = document.createElement('div'); expBtns.className = 'tuning-actions';
    const copy = document.createElement('button'); copy.textContent = 'Copy';
    copy.addEventListener('click', () => this._copyExport(copy));
    const dl = document.createElement('button'); dl.textContent = 'Download .json';
    dl.addEventListener('click', () => this._download());
    expBtns.append(copy, dl);
    this.exportBox.append(this.exportText, expBtns);
    el.appendChild(this.exportBox);

    // Typing into the panel must NOT drive the game (move/jump/weapon/zoom live
    // on window listeners) — stop key events from bubbling out of the panel.
    for (const ev of ['keydown', 'keyup', 'keypress']) el.addEventListener(ev, (e) => e.stopPropagation());
  }

  _row(f) {
    const row = document.createElement('label'); row.className = 'tuning-row';
    if (f.title) row.title = f.title; // hover tooltip explaining the control
    const name = document.createElement('span'); name.className = 'tuning-label'; name.textContent = f.label;
    const range = document.createElement('input'); range.type = 'range'; range.min = f.min; range.max = f.max; range.step = f.step;
    const num = document.createElement('input'); num.type = 'number'; num.min = f.min; num.max = f.max; num.step = f.step; num.className = 'tuning-num';
    const unit = document.createElement('span'); unit.className = 'tuning-unit'; unit.textContent = f.unit;

    const sync = (v, fromRange) => {
      v = this._clamp(f, v);
      f.set(v);
      const s = this._fmt(f, v);
      if (fromRange) num.value = s; else range.value = v;
      if (!fromRange && range) range.value = v;
      if (fromRange) num.value = s;
      if (this.exportBox && this.exportBox.style.display !== 'none') this._refreshExport();
    };
    range.addEventListener('input', () => sync(parseFloat(range.value), true));
    num.addEventListener('input', () => { if (num.value !== '') sync(parseFloat(num.value), false); });

    f._els = { range, num };
    const v0 = f.get(); range.value = v0; num.value = this._fmt(f, v0);
    row.append(name, range, num, unit);
    return row;
  }

  _clamp(f, v) {
    if (Number.isNaN(v)) return f.get();
    return Math.min(f.max, Math.max(f.min, v));
  }

  _decimals(step) { const s = String(step); const i = s.indexOf('.'); return i < 0 ? 0 : s.length - i - 1; }
  _fmt(f, v) { return v.toFixed(this._decimals(f.step)); }

  _refreshField(f) {
    const v = f.get();
    if (f._els) { f._els.range.value = v; f._els.num.value = this._fmt(f, v); }
  }

  // ── Actions ─────────────────────────────────────────────────────────────────
  resetDefaults() {
    for (const f of this.fields) { f.set(this.defaults[f.id]); this._refreshField(f); }
    if (this.exportBox && this.exportBox.style.display !== 'none') this._refreshExport();
  }

  exportConfig() {
    const v = (id) => this.fieldById[id]?.get();
    const cfg = {
      movement: { moveSpeed: v('moveSpeed'), acceleration: v('acceleration'), friction: v('friction'), gravity: v('gravity'), jumpSpeed: v('jumpSpeed') },
    };
    if (this.fieldById.swordDamage) cfg.fakeSword = { damage: v('swordDamage'), cooldown: v('swordCooldown'), reach: v('swordReach'), proposedStrikeRadius: v('swordStrikeRadius') };
    if (this.fieldById.rayDamage) cfg.blueRayGun = { damage: v('rayDamage'), cooldown: v('rayCooldown'), range: v('rayRange'), rangeTiles: round(v('rayRange') / 40), startupFrames: v('rayStartup'), activeFrames: v('rayActive') };
    if (this.fieldById.shotgunRange) cfg.shotgun = { range: v('shotgunRange'), rangeTiles: round(v('shotgunRange') / 40), damage: v('shotgunDamage'), cooldown: v('shotgunCooldown') };
    cfg.respawn = { time: v('respawnTime'), invulnerability: v('invuln') };
    cfg._note = 'PROPOSED standalone PvP tuning values (not extracted Diggerz server values).';
    return cfg;
  }

  _json() { return JSON.stringify(this.exportConfig(), null, 2); }
  _refreshExport() { this.exportText.value = this._json(); }

  _toggleExport() {
    const open = this.exportBox.style.display === 'none';
    this.exportBox.style.display = open ? 'block' : 'none';
    if (open) { this._refreshExport(); this.exportText.focus(); this.exportText.select(); }
  }

  async _copyExport(btn) {
    const text = this._json();
    try { await navigator.clipboard.writeText(text); btn.textContent = 'Copied!'; }
    catch { this.exportText.focus(); this.exportText.select(); btn.textContent = 'Select+copy'; }
    setTimeout(() => { btn.textContent = 'Copy'; }, 1200);
  }

  _download() {
    const blob = new Blob([this._json()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'arena-tuning.json';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  // ── Visibility ──────────────────────────────────────────────────────────────
  show() { if (this.panelEl) this.panelEl.style.display = 'block'; if (this.toggleBtn) this.toggleBtn.setAttribute('aria-expanded', 'true'); }
  hide() { if (this.panelEl) this.panelEl.style.display = 'none'; if (this.toggleBtn) this.toggleBtn.setAttribute('aria-expanded', 'false'); }
  toggle() { (this.panelEl.style.display === 'none' || !this.panelEl.style.display) ? this.show() : this.hide(); }
}

function round(n) { return Math.round(n * 100) / 100; }
