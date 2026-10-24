// Drawn car "photos" for the prototype: an SVG scene (backdrop + car) as a data URI.
// Real listings will use photos from the seller's listing or the inspection protocol.

export type Body = 'sedan' | 'suv' | 'hatch';

function shade(hex: string, p: number) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const t = p < 0 ? 0 : 255, a = Math.abs(p);
  r = Math.round((t - r) * a + r); g = Math.round((t - g) * a + g); b = Math.round((t - b) * a + b);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

type Shape = { b: string; w: string[]; sh: string; dr: string; wh: [number, number][]; hl: [number, number]; tl: [number, number] };
const BODY: Record<Body, Shape> = {
  sedan: { b: 'M22 132 C22 118 30 110 46 107 L98 100 C116 80 142 66 174 64 L214 64 C238 66 256 80 272 98 L292 104 C302 107 306 116 306 126 L306 136 C306 142 302 146 296 146 L274 146 A28 28 0 0 0 218 146 L114 146 A28 28 0 0 0 58 146 L30 146 C25 146 22 142 22 132 Z',
    w: ['M110 100 C124 84 144 74 170 73 L186 73 L186 100 Z', 'M194 73 L212 73 C232 74 248 86 260 100 L194 100 Z'], sh: 'M48 110 L100 103 L270 103 L296 110', dr: 'M190 104 L190 140 M122 104 C119 120 119 132 123 140', wh: [[86, 22], [246, 22]], hl: [26, 113], tl: [296, 111] },
  suv: { b: 'M20 130 C20 114 26 104 42 100 L82 94 C96 70 118 54 150 52 L228 52 C248 53 264 66 278 90 L294 96 C304 100 308 110 308 122 L308 136 C308 142 304 146 298 146 L278 146 A31 31 0 0 0 216 146 L117 146 A31 31 0 0 0 55 146 L28 146 C23 146 20 142 20 130 Z',
    w: ['M94 94 C106 74 122 62 148 61 L178 61 L178 94 Z', 'M186 61 L226 61 C242 62 256 74 266 94 L186 94 Z'], sh: 'M44 104 L84 98 L276 98 L298 104', dr: 'M182 98 L182 140 M112 98 C109 118 109 132 113 140', wh: [[86, 25], [247, 25]], hl: [24, 109], tl: [298, 102] },
  hatch: { b: 'M22 132 C22 118 30 110 46 107 L96 100 C114 78 138 64 170 62 L236 62 C252 63 264 74 274 94 L284 108 C290 114 292 122 292 130 L292 138 C292 143 288 146 283 146 L264 146 A28 28 0 0 0 208 146 L114 146 A28 28 0 0 0 58 146 L30 146 C25 146 22 142 22 132 Z',
    w: ['M108 100 C122 82 142 72 168 71 L186 71 L186 100 Z', 'M194 71 L232 71 C246 72 256 82 264 100 L194 100 Z'], sh: 'M48 110 L98 103 L276 103 L288 112', dr: 'M190 104 L190 140 M122 104 C119 120 119 132 123 140', wh: [[86, 22], [236, 22]], hl: [26, 113], tl: [282, 107] },
};

function wheel(x: number, y: number, r: number) {
  let s = `<circle cx="${x}" cy="${y}" r="${r}" fill="#17181c"/><circle cx="${x}" cy="${y}" r="${(r * 0.66).toFixed(1)}" fill="#cfd4db"/><circle cx="${x}" cy="${y}" r="${(r * 0.58).toFixed(1)}" fill="#8b919a"/>`;
  for (let i = 0; i < 5; i++) {
    const a = ((i * 72 - 90) * Math.PI) / 180;
    s += `<line x1="${x}" y1="${y}" x2="${(x + Math.cos(a) * r * 0.57).toFixed(1)}" y2="${(y + Math.sin(a) * r * 0.57).toFixed(1)}" stroke="#e1e4e8" stroke-width="${(r * 0.2).toFixed(1)}" stroke-linecap="round"/>`;
  }
  return s + `<circle cx="${x}" cy="${y}" r="${(r * 0.15).toFixed(1)}" fill="#5c626b"/>`;
}

const BACKDROPS = [
  ['#FFFFFF', '#E9ECF0', '#DCE1E7'],
  ['#F7EFE6', '#EEE1D2', '#DCCBB6'],
  ['#EAF1F8', '#DAE5EF', '#C6D2DE'],
  ['#EAF2E6', '#DCE8D6', '#C7D4BF'],
];

/** Scene 400×300 with backdrop, floor and the car. */
export function carScene(color: string, body: Body, variant = 0) {
  const B = BODY[body] ?? BODY.sedan;
  const [top, mid, floor] = BACKDROPS[variant % BACKDROPS.length];
  const id = 'c' + variant + body;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs>
<linearGradient id="${id}bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset=".64" stop-color="${mid}"/><stop offset=".641" stop-color="${floor}"/><stop offset="1" stop-color="${shade(floor, -0.06)}"/></linearGradient>
<linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(color, 0.22)}"/><stop offset=".5" stop-color="${color}"/><stop offset="1" stop-color="${shade(color, -0.38)}"/></linearGradient>
<linearGradient id="${id}w" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a5564"/><stop offset="1" stop-color="#141a22"/></linearGradient>
<radialGradient id="${id}s" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".38"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>
<rect width="400" height="300" fill="url(#${id}bg)"/>
<g transform="translate(36 78) scale(1.03)">
<ellipse cx="164" cy="171" rx="150" ry="8" fill="url(#${id}s)"/>${B.wh.map(([x, r]) => `<circle cx="${x}" cy="148" r="${r + 5}" fill="#0e0f12"/>`).join('')}
<path d="${B.b}" fill="url(#${id}b)"/><path d="${B.sh}" fill="none" stroke="#fff" stroke-opacity=".38" stroke-width="2"/>${B.w.map((d) => `<path d="${d}" fill="url(#${id}w)"/>`).join('')}
<path d="${B.dr}" stroke="${shade(color, -0.5)}" stroke-opacity=".55" stroke-width="1.2" fill="none"/>
<rect x="${B.hl[0]}" y="${B.hl[1]}" width="16" height="6" rx="3" fill="#fff" opacity=".92"/><rect x="${B.tl[0] - 6}" y="${B.tl[1]}" width="10" height="6" rx="2" fill="#d6363a"/>${B.wh.map(([x, r]) => wheel(x, 148, r)).join('')}
</g></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
