/** Convert hex color to [H, S, L] (H: 0-360, S: 0-100, L: 0-100) */
function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s * 100, l * 100];
}

/** Convert HSL to RGB integer triple */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round((l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255);
  };
  return [f(0), f(8), f(4)];
}

const SHADE_LIGHTNESS: [number, number][] = [
  [50, 97], [100, 93], [200, 85], [300, 75], [400, 62],
  [500, 50], [600, 40], [700, 33], [800, 26], [900, 16],
];

/** Generate CSS custom property declarations for brand palette from a hex primary color */
export function generateBrandVars(primaryHex: string): string {
  const [h, s] = hexToHsl(primaryHex);
  return SHADE_LIGHTNESS.map(([shade, l]) => {
    const [r, g, b] = hslToRgb(h, Math.min(s, 85), l);
    return `--brand-${shade}: ${r} ${g} ${b};`;
  }).join(' ');
}

/** Inject (or update) a <style> tag with the hotel's brand palette */
export function applyHotelTheme(primaryColor: string | null | undefined) {
  let el = document.getElementById('hotel-theme') as HTMLStyleElement | null;
  if (!primaryColor) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('style');
    el.id = 'hotel-theme';
    document.head.appendChild(el);
  }
  el.textContent = `:root { ${generateBrandVars(primaryColor)} }`;
}
