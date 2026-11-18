/* Isometric rainy street diorama for the BarStreet home page.
 * Inspired by the reference mood (cozy 3D/2.5D street, rain, warm windows,
 * plants and soft pastel light) but drawn as original inline SVG. */
(function () {
  "use strict";

  const escape = (value) => String(value == null ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  const pt = (x, y) => Math.round(x) + "," + Math.round(y);
  const pts = (list) => list.map((p) => pt(p[0], p[1])).join(" ");

  function isoDefs() {
    return '<defs>' +
      '<linearGradient id="isoGroundGrad" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="#cfd9bd"/><stop offset="1" stop-color="#a9bd91"/>' +
      '</linearGradient>' +
      '<linearGradient id="isoWalkGrad" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="#efe5d1"/><stop offset="1" stop-color="#cfc1a7"/>' +
      '</linearGradient>' +
      '<linearGradient id="isoGrassGrad" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="#a9c486"/><stop offset="1" stop-color="#7f9f63"/>' +
      '</linearGradient>' +
      '<linearGradient id="isoRoadGrad" x1="0" y1="0" x2="1" y2="0">' +
        '<stop offset="0" stop-color="#59646e"/><stop offset=".45" stop-color="#6e7882"/>' +
        '<stop offset="1" stop-color="#454f59"/>' +
      '</linearGradient>' +
      '<radialGradient id="isoLampGlow">' +
        '<stop offset="0" stop-color="#ffd88a" stop-opacity=".85"/>' +
        '<stop offset="1" stop-color="#ffd88a" stop-opacity="0"/>' +
      '</radialGradient>' +
      '<radialGradient id="isoPuddleGrad">' +
        '<stop offset="0" stop-color="#c7e0ea" stop-opacity=".55"/>' +
        '<stop offset="1" stop-color="#86a9bd" stop-opacity="0"/>' +
      '</radialGradient>' +
      '<radialGradient id="isoVignette">' +
        '<stop offset=".58" stop-color="#101722" stop-opacity="0"/>' +
        '<stop offset="1" stop-color="#101722" stop-opacity=".32"/>' +
      '</radialGradient>' +
      '<filter id="isoShadow" x="-35%" y="-35%" width="170%" height="190%">' +
        '<feDropShadow dx="0" dy="14" stdDeviation="11" flood-color="#1b2430" flood-opacity=".28"/>' +
      '</filter>' +
      '<filter id="isoGlow" x="-80%" y="-80%" width="260%" height="260%">' +
        '<feGaussianBlur stdDeviation="5" result="b"/>' +
        '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>' +
      '</filter>' +
      '<filter id="isoMist" x="-40%" y="-40%" width="180%" height="180%">' +
        '<feGaussianBlur stdDeviation="16"/>' +
      '</filter>' +
    '</defs>';
  }

  function isoGround() {
    const crosswalk = [];
    for (let i = 0; i < 6; i += 1) {
      crosswalk.push('<rect x="' + (-60 + i * 22) + '" y="-78" width="11" height="156" rx="2" fill="#f7f1e5"/>');
    }
    return '<rect width="900" height="1000" fill="url(#isoGroundGrad)"/>' +
      '<g opacity=".55" filter="url(#isoMist)">' +
        '<ellipse cx="120" cy="90" rx="260" ry="110" fill="#e8efd9"/>' +
        '<ellipse cx="790" cy="920" rx="300" ry="140" fill="#9eb287"/>' +
        '<ellipse cx="760" cy="120" rx="230" ry="100" fill="#eaf0de"/>' +
        '<ellipse cx="180" cy="620" rx="160" ry="80" fill="#dfe8cf"/>' +
      '</g>' +
      '<g filter="url(#isoShadow)">' +
        '<polygon points="-63,655 837,205 963,455 63,905" fill="#d9cebb"/>' +
        '<polygon points="-43,695 857,245 943,415 43,865" fill="url(#isoRoadGrad)"/>' +
      '</g>' +
      '<line x1="0" y1="780" x2="900" y2="330" stroke="#efe8d7" stroke-width="5" stroke-dasharray="26 24" opacity=".55"/>' +
      '<line x1="-43" y1="695" x2="857" y2="245" stroke="#aab6c0" stroke-width="2" opacity=".45"/>' +
      '<line x1="43" y1="865" x2="943" y2="415" stroke="#aab6c0" stroke-width="2" opacity=".45"/>' +
      '<g transform="translate(450 555) rotate(-26.565)" opacity=".82">' + crosswalk.join("") + '</g>' +
      '<ellipse cx="255" cy="735" rx="92" ry="24" fill="url(#isoPuddleGrad)"/>' +
      '<ellipse cx="645" cy="505" rx="80" ry="21" fill="url(#isoPuddleGrad)"/>' +
      '<ellipse cx="500" cy="665" rx="110" ry="28" fill="url(#isoPuddleGrad)"/>' +
      '<path d="M220 726 q45 -7 86 0" stroke="#e9f2f6" stroke-width="2" opacity=".45" fill="none"/>' +
      '<path d="M615 498 q38 -5 72 0" stroke="#e9f2f6" stroke-width="2" opacity=".4" fill="none"/>' +
      '<path d="M470 656 q55 -8 100 0" stroke="#e9f2f6" stroke-width="2" opacity=".35" fill="none"/>' +
      '<path d="M60 820 L810 280" stroke="#e8f1f5" stroke-width="10" opacity=".05"/>' +
      '<path d="M95 790 L845 250" stroke="#e8f1f5" stroke-width="4" opacity=".06"/>';
  }

  function isoIsland(cx, cy, w, d) {
    const top = [cx, cy - d / 2];
    const right = [cx + w / 2, cy];
    const bottom = [cx, cy + d / 2];
    const left = [cx - w / 2, cy];
    const t = 22;
    const leftB = [left[0], left[1] + t];
    const bottomB = [bottom[0], bottom[1] + t];
    const rightB = [right[0], right[1] + t];
    const inset = 0.8;
    const itop = [cx, cy - (d / 2) * inset];
    const iright = [cx + (w / 2) * inset, cy];
    const ibottom = [cx, cy + (d / 2) * inset];
    const ileft = [cx - (w / 2) * inset, cy];
    return '<g filter="url(#isoShadow)">' +
      '<polygon points="' + pts([left, bottom, bottomB, leftB]) + '" fill="#a99d88"/>' +
      '<polygon points="' + pts([bottom, right, rightB, bottomB]) + '" fill="#c4b7a0"/>' +
      '<polygon points="' + pts([top, right, bottom, left]) + '" fill="url(#isoWalkGrad)"/>' +
      '<polygon points="' + pts([itop, iright, ibottom, ileft]) + '" fill="url(#isoGrassGrad)"/>' +
      '<polygon points="' + pts([itop, iright, ibottom, ileft]) + '" fill="none" stroke="#7f9a67" stroke-width="2" opacity=".55"/>' +
      '<polyline points="' + pts([left, top, right]) + '" fill="none" stroke="#f7efe0" stroke-width="3" opacity=".6"/>' +
    '</g>';
  }

  function isoTree(x, y, s, leaf, light) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')" filter="url(#isoShadow)">' +
      '<ellipse cx="0" cy="2" rx="24" ry="8" fill="#1b2430" opacity=".2"/>' +
      '<rect x="-4" y="-26" width="8" height="28" rx="3" fill="#7a5a3a"/>' +
      '<circle cx="-12" cy="-30" r="16" fill="' + (leaf || "#5f7f4f") + '"/>' +
      '<circle cx="12" cy="-32" r="17" fill="' + (leaf || "#5f7f4f") + '" opacity=".92"/>' +
      '<circle cx="0" cy="-45" r="15" fill="' + (light || "#9fbd7d") + '" opacity=".92"/>' +
      '<circle cx="-6" cy="-38" r="9" fill="#c1d8a4" opacity=".5"/>' +
    '</g>';
  }

  function isoBush(x, y, s, leaf) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
      '<ellipse cx="0" cy="2" rx="17" ry="6" fill="#1b2430" opacity=".18"/>' +
      '<circle cx="-9" cy="-7" r="10" fill="' + (leaf || "#6f9a5a") + '"/>' +
      '<circle cx="8" cy="-8" r="11" fill="' + (leaf || "#6f9a5a") + '" opacity=".92"/>' +
      '<circle cx="0" cy="-14" r="10" fill="#9fbd7d" opacity=".8"/>' +
    '</g>';
  }

  function isoPlanter(x, y, s, flower) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
      '<polygon points="-16,-6 16,-6 12,8 -12,8" fill="#b07d3c"/>' +
      '<polygon points="-16,-6 16,-6 10,-12 -10,-12" fill="#8a5a2b"/>' +
      '<circle cx="-6" cy="-12" r="7" fill="#6f9a5a"/>' +
      '<circle cx="7" cy="-13" r="8" fill="#7fae68"/>' +
      '<circle cx="-2" cy="-18" r="5" fill="' + (flower || "#f2c94c") + '"/>' +
      '<circle cx="9" cy="-20" r="4" fill="' + (flower || "#f2994a") + '"/>' +
    '</g>';
  }

  function isoLamp(x, y, s) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
      '<circle cx="0" cy="-58" r="36" fill="url(#isoLampGlow)" opacity=".7"/>' +
      '<ellipse cx="0" cy="0" rx="10" ry="4" fill="#1b2430" opacity=".2"/>' +
      '<rect x="-3" y="-58" width="6" height="58" fill="#4f4a44"/>' +
      '<rect x="-12" y="-62" width="24" height="10" rx="4" fill="#3a3632"/>' +
      '<circle cx="0" cy="-57" r="6" fill="#ffd88a" filter="url(#isoGlow)"/>' +
      '<path d="M-16 -52 L16 -52 L8 -36 L-8 -36 Z" fill="#ffd88a" opacity=".12"/>' +
    '</g>';
  }

  function isoSignBoard(x, y, s, kind) {
    const arrow = kind === "cross"
      ? '<path d="M-10 -59 L0 -59 L0 -66 L12 -53 L0 -40 L0 -47 L-10 -47 Z" fill="#fff"/>'
      : '<path d="M0 -66 L0 -44 M-8 -52 L0 -44 L8 -52" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>';
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
      '<rect x="-3" y="-50" width="6" height="50" fill="#4f4a44"/>' +
      '<rect x="-19" y="-72" width="38" height="28" rx="5" fill="#3f7fd1" stroke="#e8eef7" stroke-width="2"/>' +
      arrow +
    '</g>';
  }

  function isoTable(x, y, s, color) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
      '<ellipse cx="0" cy="4" rx="22" ry="8" fill="#1b2430" opacity=".18"/>' +
      '<ellipse cx="0" cy="-8" rx="22" ry="9" fill="#f0e2c8" stroke="#b8a588" stroke-width="2"/>' +
      '<rect x="-2" y="-8" width="4" height="14" fill="#8a6a45"/>' +
      '<circle cx="-16" cy="2" r="5" fill="#c9b79a"/>' +
      '<circle cx="16" cy="2" r="5" fill="#c9b79a"/>' +
      '<g transform="translate(0 -20)">' +
        '<rect x="-2" y="-26" width="4" height="26" fill="#8a6a45"/>' +
        '<path d="M-28 -26 Q0 -46 28 -26 Z" fill="' + color + '" opacity=".9"/>' +
        '<path d="M-28 -26 Q0 -35 28 -26 Z" fill="#f7f1e5" opacity=".75"/>' +
      '</g>' +
    '</g>';
  }

  function isoCat(x, y, s) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
      '<ellipse cx="0" cy="0" rx="13" ry="4" fill="#1b2430" opacity=".2"/>' +
      '<ellipse cx="0" cy="-8" rx="10" ry="7" fill="#3a3158"/>' +
      '<circle cx="-7" cy="-14" r="4" fill="#3a3158"/>' +
      '<circle cx="7" cy="-14" r="4" fill="#3a3158"/>' +
      '<circle cx="-8" cy="-15" r="1" fill="#ffd166"/>' +
      '<circle cx="6" cy="-15" r="1" fill="#ffd166"/>' +
      '<path d="M10 -8 q10 -4 6 -12" stroke="#3a3158" stroke-width="3" fill="none"/>' +
    '</g>';
  }

  function isoScooter(x, y, s) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
      '<ellipse cx="0" cy="0" rx="22" ry="6" fill="#1b2430" opacity=".2"/>' +
      '<circle cx="-13" cy="-10" r="7" fill="#2f2f2f" stroke="#111" stroke-width="2"/>' +
      '<circle cx="13" cy="-10" r="7" fill="#2f2f2f" stroke="#111" stroke-width="2"/>' +
      '<path d="M-14 -12 L-4 -25 L10 -25 L17 -12" stroke="#e8a34a" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      '<rect x="-6" y="-31" width="18" height="6" rx="3" fill="#39c5cf"/>' +
      '<rect x="13" y="-34" width="3" height="12" fill="#4f4a44"/>' +
    '</g>';
  }

  function isoBuilding(bar, cx, cy, opts) {
    const w = opts.w;
    const d = opts.d;
    const h = opts.h;
    const accent = escape(bar.accent);
    const top = [cx, cy - d / 2];
    const right = [cx + w / 2, cy];
    const bottom = [cx, cy + d / 2];
    const left = [cx - w / 2, cy];
    const topH = [cx, cy - d / 2 - h];
    const rightH = [cx + w / 2, cy - h];
    const bottomH = [cx, cy + d / 2 - h];
    const leftH = [cx - w / 2, cy - h];
    const rw = (u, v) => [cx + (w / 2) * u, cy + d / 2 - (d / 2) * u - v];
    const lw = (u, v) => [cx - (w / 2) * u, cy + d / 2 - (d / 2) * u - v];
    const rwq = (u, v, du, dv) => pts([rw(u, v), rw(u + du, v), rw(u + du, v + dv), rw(u, v + dv)]);
    const lwq = (u, v, du, dv) => pts([lw(u, v), lw(u + du, v), lw(u + du, v + dv), lw(u, v + dv)]);

    const windows = [];
    windows.push('<polygon points="' + rwq(0.16, h * 0.4, 0.22, 34) + '" fill="#2a2230" stroke="#6b5540" stroke-width="2"/>');
    windows.push('<polygon points="' + rwq(0.18, h * 0.4 + 3, 0.18, 28) + '" fill="#ffd27a" opacity=".82" filter="url(#isoGlow)"/>');
    windows.push('<polygon points="' + rwq(0.45, h * 0.4, 0.22, 34) + '" fill="#2a2230" stroke="#6b5540" stroke-width="2"/>');
    windows.push('<polygon points="' + rwq(0.47, h * 0.4 + 3, 0.18, 28) + '" fill="#ffd27a" opacity=".82" filter="url(#isoGlow)"/>');
    windows.push('<polygon points="' + lwq(0.3, h * 0.42, 0.24, 32) + '" fill="#2a2230" stroke="#6b5540" stroke-width="2"/>');
    windows.push('<polygon points="' + lwq(0.32, h * 0.42 + 3, 0.2, 26) + '" fill="#ffd27a" opacity=".72" filter="url(#isoGlow)"/>');

    const door = '<polygon points="' + rwq(0.72, 0, 0.14, 62) + '" fill="#2a1b18" stroke="#6b4a32" stroke-width="2"/>' +
      '<polygon points="' + rwq(0.74, 5, 0.1, 52) + '" fill="#ffc46b" opacity=".5"/>' +
      '<circle cx="' + rw(0.83, 30)[0] + '" cy="' + rw(0.83, 30)[1] + '" r="2.5" fill="#ffd166"/>';

    let awning = "";
    if (opts.awning) {
      const n = 6;
      const u0 = 0.12;
      const u1 = 0.94;
      const v0 = h * 0.62;
      const du = (u1 - u0) / n;
      for (let i = 0; i < n; i += 1) {
        awning += '<polygon points="' + rwq(u0 + i * du, v0, du, 12) + '" fill="' +
          (i % 2 ? opts.awningA : opts.awningB) + '" opacity=".96"/>';
      }
      awning += '<polyline points="' + pts([rw(u0, v0 + 12), rw(u1, v0 + 12)]) +
        '" fill="none" stroke="#3a2a2a" stroke-width="2" opacity=".35"/>';
    }

    let roof = "";
    if (opts.roof === "hip") {
      const apex = [cx, cy - h - (opts.roofH || 38)];
      roof = '<polygon points="' + pts([topH, leftH, apex]) + '" fill="' + opts.roofDark + '"/>' +
        '<polygon points="' + pts([topH, rightH, apex]) + '" fill="' + opts.roofDark + '"/>' +
        '<polygon points="' + pts([leftH, bottomH, apex]) + '" fill="' + opts.roofLight + '"/>' +
        '<polygon points="' + pts([bottomH, rightH, apex]) + '" fill="' + opts.roof + '"/>' +
        '<polyline points="' + pts([bottomH, apex, rightH]) + '" fill="none" stroke="#f4e6d0" stroke-width="2" opacity=".45"/>';
    } else if (opts.roof === "terrace") {
      roof = '<polygon points="' + pts([topH, rightH, bottomH, leftH]) + '" fill="' + opts.roof + '"/>' +
        '<polygon points="' + pts([[cx, cy - (d / 2) * 0.82 - h], [cx + (w / 2) * 0.82, cy - h], [cx, cy + (d / 2) * 0.82 - h], [cx - (w / 2) * 0.82, cy - h]]) + '" fill="' + opts.roofLight + '"/>' +
        '<polyline points="' + pts([leftH, bottomH, rightH]) + '" fill="none" stroke="#f4e6d0" stroke-width="3" opacity=".8"/>' +
        '<g transform="translate(' + cx + ' ' + (cy - h - 18) + ')">' +
          '<rect x="-2" y="-26" width="4" height="26" fill="#6b5540"/>' +
          '<path d="M-28 -26 Q0 -48 28 -26 Z" fill="' + accent + '" opacity=".88"/>' +
          '<path d="M-28 -26 Q0 -36 28 -26 Z" fill="#f6e8c8" opacity=".8"/>' +
        '</g>' +
        '<circle cx="' + (cx + 40) + '" cy="' + (cy - h - 30) + '" r="10" fill="#e8f0f5" opacity=".92" filter="url(#isoGlow)"/>' +
        '<circle cx="' + (cx + 40) + '" cy="' + (cy - h - 30) + '" r="3" fill="#fff"/>';
    } else if (opts.roof === "industrial") {
      roof = '<polygon points="' + pts([topH, rightH, bottomH, leftH]) + '" fill="' + opts.roof + '"/>' +
        '<polygon points="' + pts([topH, rightH, bottomH, leftH]) + '" fill="none" stroke="#3a3632" stroke-width="3"/>' +
        '<polygon points="' + pts([[cx - w / 4, cy - h - d / 4], [cx, cy - h - d / 2], [cx + w / 4, cy - h - d / 4], [cx, cy - h]]) + '" fill="' + opts.roofLight + '"/>' +
        '<rect x="' + (cx + w / 4) + '" y="' + (cy - h - 60) + '" width="18" height="50" fill="#5a5f66" stroke="#3a3632" stroke-width="2"/>' +
        '<rect x="' + (cx + w / 4 - 2) + '" y="' + (cy - h - 66) + '" width="22" height="8" fill="#b07d3c"/>' +
        '<ellipse cx="' + (cx + w / 4 + 9) + '" cy="' + (cy - h - 74) + '" rx="18" ry="8" fill="#e8e8e8" opacity=".32" filter="url(#isoMist)"/>' +
        '<path d="M' + (cx - w / 3) + ' ' + (cy - h + 8) + ' q40 -22 80 0" stroke="#8a5a2b" stroke-width="6" fill="none" opacity=".85"/>';
    } else {
      roof = '<polygon points="' + pts([topH, rightH, bottomH, leftH]) + '" fill="' + opts.roof + '"/>' +
        '<polygon points="' + pts([[cx, cy - (d / 2) * 0.82 - h], [cx + (w / 2) * 0.82, cy - h], [cx, cy + (d / 2) * 0.82 - h], [cx - (w / 2) * 0.82, cy - h]]) + '" fill="' + opts.roofLight + '"/>' +
        '<polyline points="' + pts([leftH, topH, rightH]) + '" fill="none" stroke="#f4e6d0" stroke-width="3" opacity=".5"/>';
    }

    const signLift = opts.roof === "terrace" ? 38 : 0;
    const signY = cy - h - (opts.roof === "hip" ? (opts.roofH || 38) : 0) - 34 - signLift;
    const sign = '<g filter="url(#isoGlow)">' +
      '<rect x="' + (cx - 62) + '" y="' + signY + '" width="124" height="26" rx="6" fill="#1b1326" stroke="' + accent + '" stroke-width="2" opacity=".96"/>' +
      '<text x="' + cx + '" y="' + (signY + 18) + '" text-anchor="middle" font-size="16" font-weight="700" fill="' + accent + '" font-family="ui-monospace, \'Courier New\', monospace" letter-spacing="1">' + escape(bar.name) + '</text>' +
    '</g>';

    let extra = "";
    if (bar.id === "loopin") {
      extra += '<g filter="url(#isoGlow)">' +
        '<rect x="' + (cx + w / 2 - 7) + '" y="' + (cy - h * 0.74) + '" width="14" height="58" rx="4" fill="#1b1326" stroke="' + accent + '" stroke-width="2"/>' +
        '<rect x="' + (cx + w / 2 - 3) + '" y="' + (cy - h * 0.74 + 7) + '" width="6" height="44" rx="2" fill="' + accent + '" opacity=".78"/>' +
      '</g>';
    }
    const mid = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const eaveA = mid(bottomH, rightH, 0.5);
    const eaveB = mid(bottomH, leftH, 0.5);
    extra += '<circle cx="' + eaveA[0] + '" cy="' + eaveA[1] + '" r="2.6" fill="#ffd88a" filter="url(#isoGlow)"/>' +
      '<circle cx="' + eaveB[0] + '" cy="' + eaveB[1] + '" r="2.6" fill="#ffd88a" filter="url(#isoGlow)"/>' +
      '<circle cx="' + bottomH[0] + '" cy="' + bottomH[1] + '" r="2.2" fill="#ffd88a" opacity=".8" filter="url(#isoGlow)"/>';
    const doorBase = rw(0.8, 0);
    extra += '<ellipse cx="' + (doorBase[0] + 20) + '" cy="' + (doorBase[1] + 8) + '" rx="28" ry="9" fill="#ffd27a" opacity=".12" filter="url(#isoMist)"/>';

    return '<g class="iso-bar" data-bar="' + escape(bar.id) + '" role="button" tabindex="0" aria-label="' + escape(bar.name) + '">' +
      '<title>' + escape(bar.name) + ' · ' + escape(bar.subtitle) + '</title>' +
      '<ellipse cx="' + cx + '" cy="' + (cy + d / 2 + 10) + '" rx="' + (w * 0.55) + '" ry="' + (d * 0.35) + '" fill="#1b2430" opacity=".18" filter="url(#isoMist)"/>' +
      '<polygon points="' + pts([top, right, bottom, left]) + '" fill="#6d6254" opacity=".22" transform="translate(0 10)"/>' +
      '<polygon points="' + pts([left, bottom, bottomH, leftH]) + '" fill="' + opts.wallLeft + '"/>' +
      '<polygon points="' + pts([left, bottom, bottomH, leftH]) + '" fill="#0b0714" opacity=".1"/>' +
      '<polygon points="' + pts([bottom, right, rightH, bottomH]) + '" fill="' + opts.wallRight + '"/>' +
      '<polygon points="' + pts([bottom, right, rightH, bottomH]) + '" fill="#fff7e8" opacity=".04"/>' +
      '<polygon points="' + pts([topH, rightH, bottomH, leftH]) + '" fill="' + opts.roof + '" opacity=".96"/>' +
      windows.join("") + door + awning + roof + extra + sign +
      '<rect class="iso-hit" x="' + (cx - w / 2 - 8) + '" y="' + (signY - 8) + '" width="' + (w + 16) + '" height="' + (d + h + 74) + '" fill="#fff" opacity="0"/>' +
    '</g>';
  }

  function isoScene(bars) {
    const byId = {};
    bars.forEach(function (bar) { byId[bar.id] = bar; });
    const loopin = byId.loopin;
    const citrus = byId.citrus;
    const hijack = byId.hijack;
    const factory = byId.factory;

    return '<div class="iso-viewport" data-iso-viewport>' +
      '<div class="iso-map" data-iso-map>' +
      '<svg class="iso-svg" viewBox="100 0 700 1000" role="img" aria-label="时光街区：Loopin、Citrus、HiJack、工厂四家酒吧">' +
        isoDefs() + isoGround() +
        isoIsland(220, 320, 360, 210) +
        isoIsland(670, 250, 360, 210) +
        isoIsland(220, 850, 360, 210) +
        isoIsland(670, 760, 360, 210) +
        isoTree(80, 390, 1.1, "#5f7f4f", "#9fbd7d") +
        isoTree(370, 245, 0.9, "#6f8f58", "#b1cd8d") +
        isoTree(825, 320, 1, "#5f7f4f", "#a9c486") +
        isoTree(515, 205, 0.9, "#6f8f58", "#b1cd8d") +
        isoTree(80, 900, 1, "#5f7f4f", "#a9c486") +
        isoTree(370, 720, 0.9, "#6f8f58", "#b1cd8d") +
        isoTree(825, 835, 1, "#5f7f4f", "#a9c486") +
        isoTree(515, 655, 0.9, "#6f8f58", "#b1cd8d") +
        isoBush(145, 425, 0.8) + isoBush(320, 370, 0.75) +
        isoBush(590, 355, 0.8) + isoBush(790, 375, 0.75) +
        isoBush(150, 930, 0.8) + isoBush(320, 865, 0.75) +
        isoBush(590, 850, 0.8) + isoBush(790, 845, 0.75) +
        isoPlanter(310, 345, 0.8, "#f2c94c") +
        isoPlanter(760, 290, 0.8, "#f2994a") +
        isoPlanter(310, 880, 0.8, "#ff3cac") +
        isoPlanter(760, 805, 0.8, "#39c5cf") +
        isoLamp(115, 735, 1) + isoLamp(785, 340, 1) +
        isoLamp(410, 620, 0.9) + isoLamp(565, 400, 0.9) +
        isoSignBoard(340, 585, 0.9, "cross") +
        isoSignBoard(590, 465, 0.9, "arrow") +
        isoTable(610, 350, 0.9, "#f2c94c") +
        isoTable(780, 800, 0.9, "#ff3cac") +
        isoCat(355, 915, 0.9) +
        isoScooter(520, 805, 0.9) +
        (loopin ? isoBuilding(loopin, 220, 300, {
          w: 180, d: 100, h: 150,
          wallLeft: "#34204f", wallRight: "#4a2f6b",
          roof: "#e88a4a", roofLight: "#f2a35f", roofDark: "#c96b34",
          awning: false,
        }) : "") +
        (citrus ? isoBuilding(citrus, 670, 230, {
          w: 180, d: 100, h: 120,
          wallLeft: "#e8d3ae", wallRight: "#f3e2c0",
          roof: "#6fcf97", roofLight: "#8fe0b2", roofDark: "#4faf7a",
          roofH: 40, awning: true, awningA: "#f2c94c", awningB: "#f7f1e5",
        }) : "") +
        (hijack ? isoBuilding(hijack, 220, 830, {
          w: 190, d: 110, h: 130,
          wallLeft: "#a83a76", wallRight: "#c94a8a",
          roof: "#2a9fb0", roofLight: "#39c5cf", roofDark: "#1f7f8f",
          roof: "terrace", awning: true, awningA: "#ff3cac", awningB: "#f6e8c8",
        }) : "") +
        (factory ? isoBuilding(factory, 670, 740, {
          w: 200, d: 115, h: 120,
          wallLeft: "#4a4e55", wallRight: "#5a5f66",
          roof: "#8a5a2b", roofLight: "#b07d3c", roofDark: "#6a421f",
          roof: "industrial", awning: false,
        }) : "") +
        '<rect width="900" height="1000" fill="url(#isoVignette)" pointer-events="none"/>' +
      '</svg>' +
      '<div class="iso-rain" aria-hidden="true"></div>' +
      '<div class="iso-mist-layer" aria-hidden="true"></div>' +
      '</div>' +
      '<div class="iso-zoom-badge" data-iso-zoom-badge>×1.0</div>' +
      '<div class="iso-controls" data-iso-control>' +
        '<button type="button" class="iso-zoom-btn" data-iso-zoom="out" aria-label="缩小">−</button>' +
        '<button type="button" class="iso-zoom-btn" data-iso-reset aria-label="重置">1:1</button>' +
        '<button type="button" class="iso-zoom-btn" data-iso-zoom="in" aria-label="放大">+</button>' +
      '</div>' +
    '</div>';
  }

  function initMap(root) {
    const viewport = root.querySelector("[data-iso-viewport]");
    if (!viewport) return;
    const map = viewport.querySelector("[data-iso-map]");
    const badge = viewport.querySelector("[data-iso-zoom-badge]");
    const MIN = 1;
    const MAX = 3.5;
    let scale = 1;
    let tx = 0;
    let ty = 0;
    let pointers = new Map();
    let last = null;
    let pinch = null;
    let moved = false;
    let suppressClick = false;

    function apply() {
      map.style.transform = "translate(" + tx + "px, " + ty + "px) scale(" + scale + ")";
      if (badge) badge.textContent = "×" + scale.toFixed(1);
      viewport.classList.toggle("zoomed", scale > 1.01);
    }

    function clampPan() {
      const maxX = Math.max(0, ((scale - 1) * viewport.clientWidth) / 2);
      const maxY = Math.max(0, ((scale - 1) * viewport.clientHeight) / 2);
      tx = Math.max(-maxX, Math.min(maxX, tx));
      ty = Math.max(-maxY, Math.min(maxY, ty));
    }

    function reset() {
      scale = 1;
      tx = 0;
      ty = 0;
      apply();
    }

    function zoomAt(factor, clientX, clientY) {
      const old = scale;
      const next = Math.max(MIN, Math.min(MAX, scale * factor));
      if (next === old) return;
      const rect = viewport.getBoundingClientRect();
      const px = (clientX == null ? rect.width / 2 : clientX - rect.left) - rect.width / 2;
      const py = (clientY == null ? rect.height / 2 : clientY - rect.top) - rect.height / 2;
      const ratio = next / old;
      scale = next;
      tx = px - (px - tx) * ratio;
      ty = py - (py - ty) * ratio;
      clampPan();
      apply();
    }

    function pointerDown(event) {
      if (event.target.closest("[data-iso-control]")) {
        suppressClick = false;
        return;
      }
      if (event.pointerType === "mouse" && event.button !== 0) return;
      suppressClick = false;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      moved = false;
      if (pointers.size === 1) {
        last = { x: event.clientX, y: event.clientY, tx: tx, ty: ty };
        viewport.classList.add("dragging");
      } else if (pointers.size === 2) {
        const pair = Array.from(pointers.values());
        pinch = {
          dist: Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y),
          scale: scale,
        };
        last = null;
      }
    }

    function pointerMove(event) {
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size >= 2) {
        const pair = Array.from(pointers.values());
        if (pinch && pinch.dist > 0) {
          const dist = Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y);
          const next = Math.max(MIN, Math.min(MAX, pinch.scale * (dist / pinch.dist)));
          if (next !== scale) {
            scale = next;
            clampPan();
            apply();
            moved = true;
          }
        }
        return;
      }
      if (!last) return;
      const dx = event.clientX - last.x;
      const dy = event.clientY - last.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      tx = last.tx + dx;
      ty = last.ty + dy;
      clampPan();
      apply();
    }

    function pointerUp(event) {
      pointers.delete(event.pointerId);
      if (pointers.size === 0) {
        viewport.classList.remove("dragging");
        if (moved) suppressClick = true;
        last = null;
        pinch = null;
      } else if (pointers.size === 1) {
        const remaining = Array.from(pointers.values())[0];
        last = { x: remaining.x, y: remaining.y, tx: tx, ty: ty };
        pinch = null;
      }
    }

    function onWheel(event) {
      event.preventDefault();
      zoomAt(event.deltaY < 0 ? 1.12 : 0.89, event.clientX, event.clientY);
    }

    viewport.addEventListener("pointerdown", pointerDown);
    // Do not capture the pointer: a simple tap must keep the building as the
    // click target. Window listeners keep panning alive when the finger leaves
    // the map while dragging.
    window.addEventListener("pointermove", pointerMove);
    window.addEventListener("pointerup", pointerUp);
    window.addEventListener("pointercancel", pointerUp);
    viewport.addEventListener("wheel", onWheel, { passive: false });
    viewport.addEventListener("click", function (event) {
      if (!suppressClick) return;
      if (event.target.closest("[data-iso-control]")) {
        suppressClick = false;
        return;
      }
      event.stopPropagation();
      event.preventDefault();
      suppressClick = false;
    }, true);

    viewport.querySelectorAll("[data-iso-zoom]").forEach(function (button) {
      button.addEventListener("click", function (event) {
        event.stopPropagation();
        zoomAt(button.dataset.isoZoom === "in" ? 1.25 : 0.8);
      });
    });
    const resetButton = viewport.querySelector("[data-iso-reset]");
    if (resetButton) {
      resetButton.addEventListener("click", function (event) {
        event.stopPropagation();
        reset();
      });
    }

    apply();
  }

  window.BarStreetMap = { scene: isoScene, init: initMap };
})();
