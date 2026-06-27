/**
 * CharacterSprite — draws the player.
 *
 * Diggerz characters are skeletal (assembled from body-part sprites in
 * tiles.png, e.g. ADVTORSO_PNG / ALIENHEAD_PNG / ARM_PNG). When the atlas
 * image is present this composes the real torso + head sprites (a recognisable
 * Diggerz figure, the "minimum real sprite" the brief asked for). When it
 * isn't, it draws a faithful procedural Diggerz-style character with proper
 * idle / run / jump / fall animation — never a flat rectangle.
 *
 * Animation is driven by wall-clock time + the body's velocity, so the run
 * cycle, idle bob and jump/fall squash-stretch read clearly.
 */

const TEAM = {
  body: '#ef8c3a',
  bodyDark: '#c96f25',
  outline: '#23160b',
  head: '#ffb56b',
  limb: '#b5611f',
  eyeWhite: '#ffffff',
  eyePupil: '#1a1208',
};

// Real Diggerz parts to compose when the texture is available.
const PART = {
  torso: 'ADVTORSO_PNG', // [138,4,34,39]
  head: 'ALIENHEAD_PNG', // [18,61,60,65]
};

export class CharacterSprite {
  constructor(assets) {
    this.assets = assets;
  }

  /**
   * @param state { x, y, width, height, vx, vy, grounded, facing, anim }
   * @param nowSec  monotonically increasing seconds (for animation timing)
   */
  draw(ctx, state, nowSec) {
    if (this.assets && this.assets.ready && this._drawReal(ctx, state, nowSec)) return;
    this._drawProcedural(ctx, state, nowSec);
  }

  // ── Real sprite composition (torso + head) ─────────────────────────────────
  _drawReal(ctx, s, nowSec) {
    const torso = this.assets.getSprite(PART.torso);
    const head = this.assets.getSprite(PART.head);
    if (!torso || !head) return false;

    const dir = s.facing >= 0 ? 1 : -1;
    const bob = s.anim === 'run' ? Math.abs(Math.sin(nowSec * 12)) * 2 : 0;
    const cx = s.x + s.width / 2;
    const bottom = s.y + s.height - bob;

    // scale torso to roughly fill the body box
    const tw = s.width * 1.15;
    const th = (torso.sh / torso.sw) * tw;
    const tx = cx - tw / 2;
    const ty = bottom - th;

    ctx.save();
    if (dir < 0) { ctx.translate(cx, 0); ctx.scale(-1, 1); ctx.translate(-cx, 0); }
    // head sits above the torso, slightly overlapping
    const hw = tw * 1.05;
    const hh = (head.sh / head.sw) * hw;
    ctx.drawImage(head.image, head.sx, head.sy, head.sw, head.sh, cx - hw / 2, ty - hh * 0.72, hw, hh);
    ctx.drawImage(torso.image, torso.sx, torso.sy, torso.sw, torso.sh, tx, ty, tw, th);
    ctx.restore();
    return true;
  }

  // ── Procedural Diggerz-style character ─────────────────────────────────────
  _drawProcedural(ctx, s, nowSec) {
    const dir = s.facing >= 0 ? 1 : -1;
    const cx = s.x + s.width / 2;
    const feet = s.y + s.height;

    // Animation parameters per state.
    let bob = 0, legA = 0, legB = 0, armSwing = 0, sx = 1, sy = 1;
    if (s.anim === 'run') {
      const t = nowSec * 12;
      legA = Math.sin(t) * 5;
      legB = -Math.sin(t) * 5;
      bob = Math.abs(Math.sin(t)) * 2;
      armSwing = Math.sin(t) * 0.6;
    } else if (s.anim === 'idle') {
      bob = Math.sin(nowSec * 3) * 1.2;
    } else if (s.anim === 'jump') {
      sx = 0.9; sy = 1.12; legA = -3; legB = -3; armSwing = -0.8;
    } else if (s.anim === 'fall') {
      sx = 1.08; sy = 0.94; legA = 4; legB = 4; armSwing = 0.4;
    }

    const bodyW = s.width * sx;
    const bodyH = s.height * 0.52 * sy;
    const bodyX = cx - bodyW / 2;
    const bodyY = s.y + bob + s.height * 0.18;
    const headR = s.width * 0.42 * sx;
    const headCx = cx;
    const headCy = bodyY - headR * 0.55;

    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = TEAM.outline;
    ctx.lineJoin = 'round';

    // ── legs ──
    const legW = s.width * 0.28;
    const legTop = bodyY + bodyH - 2;
    for (const [lx, off] of [[cx - legW - 1, legA], [cx + 1, legB]]) {
      fillStrokeRect(ctx, lx, legTop, legW, feet - legTop + off * 0.0 + 6, TEAM.limb, 3);
      // foot
      fillStrokeRect(ctx, lx - 1, legTop + (feet - legTop) + off, legW + 3, 4, TEAM.bodyDark, 2);
    }

    // ── back arm ──
    drawArm(ctx, cx - dir * bodyW * 0.30, bodyY + bodyH * 0.25, dir, -armSwing, s.width, TEAM.limb);

    // ── body ──
    roundRectPath(ctx, bodyX, bodyY, bodyW, bodyH, 7);
    ctx.fillStyle = TEAM.body;
    ctx.fill();
    ctx.stroke();
    // belly shading
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    roundRectPath(ctx, bodyX, bodyY + bodyH * 0.55, bodyW, bodyH * 0.45, 6);
    ctx.fill();

    // ── head ──
    ctx.beginPath();
    ctx.arc(headCx, headCy, headR, 0, Math.PI * 2);
    ctx.fillStyle = TEAM.head;
    ctx.fill();
    ctx.stroke();

    // ── eye (facing side) ──
    const eyeX = headCx + dir * headR * 0.35;
    const eyeY = headCy - headR * 0.05;
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, headR * 0.30, 0, Math.PI * 2);
    ctx.fillStyle = TEAM.eyeWhite;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(eyeX + dir * headR * 0.12, eyeY, headR * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = TEAM.eyePupil;
    ctx.fill();

    // ── front arm ──
    drawArm(ctx, cx + dir * bodyW * 0.30, bodyY + bodyH * 0.25, dir, armSwing, s.width, TEAM.bodyDark);

    ctx.restore();
  }
}

// ── drawing helpers ──────────────────────────────────────────────────────────

function drawArm(ctx, x, y, dir, swing, scale, color) {
  const len = scale * 0.5;
  const w = scale * 0.22;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(swing);
  fillStrokeRect(ctx, -w / 2, 0, w, len, color, 3);
  ctx.restore();
}

function fillStrokeRect(ctx, x, y, w, h, fill, r) {
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.stroke();
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
