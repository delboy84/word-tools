/**
 * Colour Engine — Core colour manipulation library
 * Pure JS, no DOM dependency
 * 
 * Provides: HSL↔RGB↔HEX conversions, palette generation, WCAG contrast
 */

// ─── HSL → RGB ───────────────────────────────────────────────────────────────

function hslToRgb(h, s, l) {
  // h: 0-360, s: 0-100, l: 0-100
  // Returns { r: 0-255, g: 0-255, b: 0-255 }
  const S = s / 100;
  const L = l / 100;
  const C = (1 - Math.abs(2 * L - 1)) * S;
  const X = C * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = L - C / 2;

  let r, g, b;
  if (h < 60)       { r = C; g = X; b = 0; }
  else if (h < 120)  { r = X; g = C; b = 0; }
  else if (h < 180)  { r = 0; g = C; b = X; }
  else if (h < 240)  { r = 0; g = X; b = C; }
  else if (h < 300)  { r = X; g = 0; b = C; }
  else               { r = C; g = 0; b = X; }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
}

// ─── RGB → HSL ───────────────────────────────────────────────────────────────

function rgbToHsl(r, g, b) {
  // r, g, b: 0-255
  // Returns { h: 0-360, s: 0-100, l: 0-100 }
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const d = max - min;

  let h, s;
  const l = (max + min) / 2;

  if (d === 0) {
    h = 0;
    s = 0;
  } else {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case R: h = ((G - B) / d + (G < B ? 6 : 0)) / 6; break;
      case G: h = ((B - R) / d + 2) / 6; break;
      case B: h = ((R - G) / d + 4) / 6; break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

// ─── HEX ↔ RGB ───────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  // Accepts "#RRGGBB" or "RRGGBB"
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16)
  };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

// ─── Convenience: HEX ↔ HSL ──────────────────────────────────────────────────

function hexToHsl(hex) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsl(r, g, b);
}

function hslToHex(h, s, l) {
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

// ─── Palette Generation ──────────────────────────────────────────────────────

function generatePalettes(h, s, l) {
  return {
    complementary: [
      { h, s, l },
      { h: (h + 180) % 360, s, l }
    ],
    splitComplementary: [
      { h, s, l },
      { h: (h + 150) % 360, s, l },
      { h: (h + 210) % 360, s, l }
    ],
    triadic: [
      { h, s, l },
      { h: (h + 120) % 360, s, l },
      { h: (h + 240) % 360, s, l }
    ],
    tetradic: [
      { h, s, l },
      { h: (h + 90) % 360, s, l },
      { h: (h + 180) % 360, s, l },
      { h: (h + 270) % 360, s, l }
    ],
    analogous: [
      { h: (h - 60 + 360) % 360, s, l },
      { h: (h - 30 + 360) % 360, s, l },
      { h, s, l },
      { h: (h + 30) % 360, s, l },
      { h: (h + 60) % 360, s, l }
    ],
    monochromatic: [
      { h, s, l: Math.max(l - 30, 10) },
      { h, s, l: Math.max(l - 15, 15) },
      { h, s, l },
      { h, s, l: Math.min(l + 15, 90) },
      { h, s, l: Math.min(l + 30, 95) }
    ]
  };
}

// ─── WCAG Contrast Ratio ─────────────────────────────────────────────────────

function linearise(channel8bit) {
  const sRGB = channel8bit / 255;
  return sRGB <= 0.04045
    ? sRGB / 12.92
    : Math.pow((sRGB + 0.055) / 1.055, 2.4);
}

function relativeLuminance(r, g, b) {
  return 0.2126 * linearise(r)
       + 0.7152 * linearise(g)
       + 0.0722 * linearise(b);
}

function contrastRatio(rgb1, rgb2) {
  const L1 = relativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const L2 = relativeLuminance(rgb2.r, rgb2.g, rgb2.b);
  const lighter = Math.max(L1, L2);
  const darker  = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

function meetsWCAG(fgHex, bgHex) {
  const fg = hexToRgb(fgHex);
  const bg = hexToRgb(bgHex);
  const ratio = contrastRatio(fg, bg);
  return {
    ratio: ratio.toFixed(2),
    passesAA: ratio >= 4.5,
    passesAAA: ratio >= 7.0,
    passesAALarge: ratio >= 3.0,
    passesAAALarge: ratio >= 4.5
  };
}

// ─── Auto Text Colour ────────────────────────────────────────────────────────

function bestTextColor(bgHex) {
  const { r, g, b } = hexToRgb(bgHex);
  const L = relativeLuminance(r, g, b);
  return L > 0.179 ? '#000000' : '#FFFFFF';
}

// ─── Edge Case Handling ──────────────────────────────────────────────────────

function adjustForEdgeCases(h, s, l) {
  // If very desaturated, palette types that rotate hue are meaningless
  if (s < 10) {
    return {
      warning: 'Low saturation — hue relationships are invisible. Consider monochromatic.',
      adjustedHSL: { h, s, l }
    };
  }

  // Clamp lightness for better palette visibility
  const clampedL = Math.max(15, Math.min(85, l));
  if (clampedL !== l) {
    return {
      adjustedHSL: { h, s, l: clampedL },
      note: `Lightness adjusted from ${l}% to ${clampedL}% for better palette visibility`
    };
  }

  return { adjustedHSL: { h, s, l } };
}

// ─── Module Exports (for Node.js testing) ─────────────────────────────────────

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    hslToRgb, rgbToHsl, hexToRgb, rgbToHex,
    hexToHsl, hslToHex,
    generatePalettes,
    linearise, relativeLuminance, contrastRatio,
    meetsWCAG, bestTextColor, adjustForEdgeCases
  };
}