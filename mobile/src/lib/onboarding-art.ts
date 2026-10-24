// Animated line illustrations for the welcome screens: SVG with SMIL animation as data URIs.
// Browsers animate SMIL inside <img>; a nonce makes each mount a fresh image so the animation restarts.

const W = '#FFFFFF';
const F = 'font-family="Manrope, Inter, Helvetica, Arial, sans-serif"';

const wrap = (body: string, nonce: number) =>
  'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 360"><!--${nonce}--><defs>
<pattern id="g" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="${W}" fill-opacity=".09"/></pattern>
<linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${W}" stop-opacity="0"/><stop offset=".85" stop-color="${W}" stop-opacity=".22"/><stop offset="1" stop-color="${W}" stop-opacity=".9"/></linearGradient>
<linearGradient id="grade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#E8B500"/><stop offset=".55" stop-color="#8DB82B"/><stop offset="1" stop-color="#16A34A"/></linearGradient>
<radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${W}" stop-opacity=".16"/><stop offset="1" stop-color="${W}" stop-opacity="0"/></radialGradient>
</defs><rect width="360" height="360" fill="url(#g)"/>${body}</svg>`);

function point(x: number, y: number, lx: number, label: string, delay: number) {
  const anchor = lx < x ? 'end' : 'start';
  return `<g opacity="0"><animate attributeName="opacity" from="0" to="1" begin="${delay}s" dur=".4s" fill="freeze"/>
<circle cx="${x}" cy="${y}" r="4" fill="${W}"/><circle cx="${x}" cy="${y}" r="4" fill="none" stroke="${W}"><animate attributeName="r" values="4;14" dur="1.6s" begin="${delay}s" repeatCount="indefinite"/><animate attributeName="stroke-opacity" values=".8;0" dur="1.6s" begin="${delay}s" repeatCount="indefinite"/></circle>
<line x1="${x}" y1="${y}" x2="${lx}" y2="${y}" stroke="${W}" stroke-opacity=".5" stroke-dasharray="2 3"/>
<text x="${lx + (anchor === 'end' ? -6 : 6)}" y="${y + 4}" text-anchor="${anchor}" ${F} font-size="12" font-weight="700" fill="${W}">${label}</text></g>`;
}

/** 1 — a car seen from above, scanned by a beam, check points light up. */
export function artInspect(nonce: number) {
  const car = `<g fill="none" stroke="${W}" stroke-width="1.6" stroke-linejoin="round">
<path d="M150 62 C150 50 210 50 210 62 L222 112 C226 130 226 250 222 272 C220 292 214 306 180 306 C146 306 140 292 138 272 C134 250 134 130 138 112 Z" fill="${W}" fill-opacity=".04"/>
<path d="M146 136 C160 124 200 124 214 136 L208 166 C192 160 168 160 152 166 Z" fill="${W}" fill-opacity=".14"/>
<path d="M152 166 C168 160 192 160 208 166 L208 238 C192 242 168 242 152 238 Z" stroke-opacity=".6"/>
<path d="M152 238 C168 242 192 242 208 238 L212 262 C196 270 164 270 148 262 Z" fill="${W}" fill-opacity=".14"/>
<path d="M139 128 L128 124 L130 136 M221 128 L232 124 L230 136" />
<path d="M156 70 L166 66 M204 70 L194 66" stroke-width="3" stroke-linecap="round"/>
<rect x="128" y="96" width="8" height="30" rx="3" fill="${W}" fill-opacity=".85"/><rect x="224" y="96" width="8" height="30" rx="3" fill="${W}" fill-opacity=".85"/>
<rect x="128" y="236" width="8" height="30" rx="3" fill="${W}" fill-opacity=".85"/><rect x="224" y="236" width="8" height="30" rx="3" fill="${W}" fill-opacity=".85"/></g>`;
  const beam = `<g><rect x="96" y="40" width="168" height="44" fill="url(#beam)"><animate attributeName="y" values="16;276;16" dur="3.6s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/></rect>
<line x1="96" x2="264" y1="84" y2="84" stroke="${W}" stroke-width="1.5"><animate attributeName="y1" values="60;320;60" dur="3.6s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/><animate attributeName="y2" values="60;320;60" dur="3.6s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/></line></g>`;
  const frame = `<g stroke="${W}" stroke-width="2" fill="none" stroke-opacity=".7"><path d="M84 40 L84 24 L100 24"/><path d="M260 24 L276 24 L276 40"/><path d="M84 320 L84 336 L100 336"/><path d="M260 336 L276 336 L276 320"/></g>`;
  return wrap(`<circle cx="180" cy="180" r="170" fill="url(#glow)"/>${frame}${car}${beam}
${point(180, 92, 266, 'Кузов', 0.5)}${point(150, 150, 98, 'VIN', 1.1)}${point(214, 200, 266, 'Пробег', 1.7)}${point(146, 252, 98, 'Подвеска', 2.3)}${point(220, 286, 266, 'Двигатель', 2.9)}`, nonce);
}

/** 2 — a grade gauge filling up to 91, with category bars. */
export function artGrade(nonce: number) {
  const r = 104, c = 2 * Math.PI * r, arc = c * 0.75;
  const ticks = Array.from({ length: 31 }, (_, i) => {
    const a = ((135 + i * 9) * Math.PI) / 180;
    const r1 = 122, r2 = i % 5 ? 127 : 132;
    return `<line x1="${(180 + Math.cos(a) * r1).toFixed(1)}" y1="${(150 + Math.sin(a) * r1).toFixed(1)}" x2="${(180 + Math.cos(a) * r2).toFixed(1)}" y2="${(150 + Math.sin(a) * r2).toFixed(1)}" stroke="${W}" stroke-opacity="${i % 5 ? 0.3 : 0.7}" stroke-width="1.5"/>`;
  }).join('');
  const bars = [['Кузов', 94], ['Двигатель', 90], ['Ходовая', 88], ['Электрика', 92]].map(([n, v], i) => {
    const y = 272 + i * 20, w = (Number(v) / 100) * 150;
    return `<text x="70" y="${y + 4}" ${F} font-size="11.5" fill="${W}" fill-opacity=".7">${n}</text>
<rect x="150" y="${y - 3}" width="150" height="6" rx="3" fill="${W}" fill-opacity=".12"/>
<rect x="150" y="${y - 3}" width="0" height="6" rx="3" fill="url(#grade)"><animate attributeName="width" from="0" to="${w}" begin="${0.8 + i * 0.15}s" dur=".9s" fill="freeze" calcMode="spline" keySplines=".2 .8 .2 1"/></rect>
<text x="310" y="${y + 4}" ${F} font-size="11.5" font-weight="700" fill="${W}">${v}</text>`;
  }).join('');
  return wrap(`<circle cx="180" cy="150" r="150" fill="url(#glow)"/>${ticks}
<circle cx="180" cy="150" r="${r}" fill="none" stroke="${W}" stroke-opacity=".12" stroke-width="12" stroke-linecap="round" stroke-dasharray="${arc} ${c}" transform="rotate(135 180 150)"/>
<circle cx="180" cy="150" r="${r}" fill="none" stroke="url(#grade)" stroke-width="12" stroke-linecap="round" stroke-dasharray="${arc} ${c}" stroke-dashoffset="${arc}" transform="rotate(135 180 150)">
<animate attributeName="stroke-dashoffset" from="${arc}" to="${(arc * 0.09).toFixed(1)}" dur="1.8s" fill="freeze" calcMode="spline" keySplines=".2 .8 .2 1"/></circle>
<text x="180" y="166" text-anchor="middle" ${F} font-size="64" font-weight="800" fill="${W}" opacity="0">91<animate attributeName="opacity" from="0" to="1" begin=".6s" dur=".8s" fill="freeze"/></text>
<text x="180" y="196" text-anchor="middle" ${F} font-size="13" font-weight="700" fill="#7BD88F" letter-spacing="2" opacity="0">ОТЛИЧНОЕ<animate attributeName="opacity" from="0" to="1" begin="1.4s" dur=".6s" fill="freeze"/></text>
<text x="96" y="232" text-anchor="middle" ${F} font-size="11" fill="${W}" fill-opacity=".5">60</text><text x="264" y="232" text-anchor="middle" ${F} font-size="11" fill="${W}" fill-opacity=".5">100</text>
${bars}`, nonce);
}

/** 3 — a shield with a drawn check; real people orbit it, a duplicate account is crossed out. */
export function artPeople(nonce: number) {
  const person = (x: number, y: number, dur: number) => `<g transform="translate(${x} ${y})"><g><animateTransform attributeName="transform" type="rotate" from="360" to="0" dur="${dur}s" repeatCount="indefinite"/><circle r="17" fill="#0B0B0C" stroke="${W}" stroke-width="1.5"/><circle cy="-4" r="5" fill="${W}"/><path d="M-9 9 C-7 2 7 2 9 9" fill="${W}"/></g></g>`;
  const orbit = (r: number, dur: number, rev: boolean, kids: string) => `<g><animateTransform attributeName="transform" type="rotate" from="${rev ? 360 : 0} 180 170" to="${rev ? 0 : 360} 180 170" dur="${dur}s" repeatCount="indefinite"/>
<circle cx="180" cy="170" r="${r}" fill="none" stroke="${W}" stroke-opacity=".16" stroke-dasharray="3 6"/>${kids}</g>`;
  const fake = `<g transform="translate(180 316)"><circle r="17" fill="#0B0B0C" stroke="${W}" stroke-opacity=".4" stroke-dasharray="3 3"/><circle cy="-4" r="5" fill="${W}" fill-opacity=".35"/><path d="M-9 9 C-7 2 7 2 9 9" fill="${W}" fill-opacity=".35"/>
<path d="M-24 -24 L24 24" stroke="${W}" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="68" stroke-dashoffset="68"><animate attributeName="stroke-dashoffset" from="68" to="0" begin="1.6s" dur=".5s" fill="freeze"/></path></g>
<text x="180" y="352" text-anchor="middle" ${F} font-size="11" fill="${W}" fill-opacity=".55" opacity="0">второй аккаунт — нельзя<animate attributeName="opacity" from="0" to="1" begin="1.9s" dur=".5s" fill="freeze"/></text>`;
  return wrap(`<circle cx="180" cy="170" r="160" fill="url(#glow)"/>
${orbit(128, 40, false, person(180, 42, 40) + person(291, 234, 40) + person(69, 234, 40))}
${orbit(84, 26, true, '')}
<path d="M180 104 L232 124 L232 168 C232 204 208 228 180 240 C152 228 128 204 128 168 L128 124 Z" fill="${W}" fill-opacity=".06" stroke="${W}" stroke-width="2"/>
<path d="M156 170 L174 188 L206 152" fill="none" stroke="${W}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="80" stroke-dashoffset="80"><animate attributeName="stroke-dashoffset" from="80" to="0" begin=".4s" dur=".7s" fill="freeze" calcMode="spline" keySplines=".3 0 .2 1"/></path>
<rect x="132" y="252" width="96" height="24" rx="12" fill="${W}" opacity="0"><animate attributeName="opacity" from="0" to="1" begin="1s" dur=".5s" fill="freeze"/></rect>
<text x="180" y="268" text-anchor="middle" ${F} font-size="11.5" font-weight="800" fill="#0B0B0C" opacity="0">ГОСУСЛУГИ ✓<animate attributeName="opacity" from="0" to="1" begin="1.1s" dur=".5s" fill="freeze"/></text>
${fake}`, nonce);
}

/** 4 — buyer and seller cards joined by a moving deal line. */
export function artDeal(nonce: number) {
  const card = (x: number, title: string, big: string, sub: [string, string], d: number) => `<g opacity="0" transform="translate(${x} 96)"><animate attributeName="opacity" from="0" to="1" begin="${d}s" dur=".5s" fill="freeze"/>
<animateTransform attributeName="transform" type="translate" from="${x} 116" to="${x} 96" begin="${d}s" dur=".6s" fill="freeze" calcMode="spline" keySplines=".2 .8 .2 1"/>
<rect width="128" height="150" rx="18" fill="${W}" fill-opacity=".07" stroke="${W}" stroke-opacity=".5"/>
<text x="16" y="30" ${F} font-size="11" fill="${W}" fill-opacity=".6" letter-spacing="1.5">${title}</text>
<text x="16" y="74" ${F} font-size="26" font-weight="800" fill="${W}">${big}</text>
<text x="16" y="98" ${F} font-size="11.5" fill="${W}" fill-opacity=".75">${sub[0]}</text><text x="16" y="114" ${F} font-size="11.5" fill="${W}" fill-opacity=".75">${sub[1]}</text>
<rect x="16" y="126" width="40" height="4" rx="2" fill="${W}"/></g>`;
  return wrap(`<circle cx="180" cy="170" r="160" fill="url(#glow)"/>
${card(30, 'ПОКУПАТЕЛЬ', '990 ₽', ['доступ на 30 дней', 'без доплат'], 0.2)}
${card(202, 'ПРОДАВЕЦ', '1%', ['только если продал', 'через приложение'], 0.5)}
<path d="M94 246 C94 300 266 300 266 246" fill="none" stroke="${W}" stroke-opacity=".35" stroke-width="1.5" stroke-dasharray="4 5"/>
<circle r="5" fill="${W}"><animateMotion dur="2.4s" repeatCount="indefinite" path="M94 246 C94 300 266 300 266 246" keyPoints="0;1;0" keyTimes="0;.5;1" calcMode="linear"/></circle>
<g opacity="0"><animate attributeName="opacity" from="0" to="1" begin="1s" dur=".5s" fill="freeze"/><circle cx="180" cy="286" r="22" fill="${W}"/><path d="M170 286 L177 293 L191 279" fill="none" stroke="#0B0B0C" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></g>
<text x="180" y="334" text-anchor="middle" ${F} font-size="12" fill="${W}" fill-opacity=".7">передумал — платит тот, кто передумал</text>`, nonce);
}
