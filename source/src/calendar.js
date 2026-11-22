/* 占卜時間的四柱與出生地農曆（地方平時）。依老師裁定：
   1. 輸入的日期時間即地方平時（LMT），照輸入使用，不換算、不扣夏令。
   2. 交節氣換成所在地經度的地方平時（世界時＋經度×4 分）後比較，定年柱（立春）與月建。
   3. 日柱 0:00 換日；東經 70° 以西，日柱干支進一位（日期不動），時柱依新日干以五鼠遁重排。
   4. 23 時起為子時，時干依次日日干（晚子時，與八字論命站同），日柱不換。
   5. 時間起卦用的農曆：初一取所在地經度地方平時的合朔日，月序、閏月依中國農曆。 */
import * as Astro from 'astronomy-engine';
import { Solar } from 'lunar-javascript';
import { NM } from './nm-table.js';

export const GAN = '甲乙丙丁戊己庚辛壬癸', ZHI = '子丑寅卯辰巳午未申酉戌亥';
const D = 864e5, p2 = n => String(n).padStart(2, '0');
export const LINE70 = 70;
export const gz = i => GAN[((i % 10) + 10) % 10] + ZHI[((i % 12) + 12) % 12];
// 日干支序（0=甲子）：JDN+49 mod 60，以地方平時「牆鐘毫秒」的日期部分計
export const dayIdx = wall => { const jdn = Math.floor(wall / D) + 2440588; return ((jdn + 49) % 60 + 60) % 60; };
export const fmt = (ms, sec) => { const d = new Date(ms); return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}${sec ? ':' + p2(d.getUTCSeconds()) : ''}`; };
const JIE = ['立春', '驚蟄', '清明', '立夏', '芒種', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒'];
const sunLon = ut => Astro.SunPosition(new Date(ut)).elon;
function searchLon(target, fromUt, days) { const r = Astro.SearchSunLongitude(target, new Date(fromUt), days); return r ? r.date.getTime() : null; }

/** wall：地方平時牆鐘（Date.UTC 形式毫秒）；lon：經度（東正西負）。回傳四柱與節氣資訊。 */
export function pillars(wall, lon) {
  lon = +lon; const off = lon * 4 * 6e4, ut = wall - off;
  const el = sunLon(ut), k = Math.floor((((el - 315) % 360) + 360) % 360 / 30);   // 0=寅月
  let prevJie = searchLon((315 + 30 * k) % 360, ut - 33 * D, 34), nextJie = searchLon((315 + 30 * (k + 1)) % 360, ut, 34);
  // 年：以立春（地方平時）為界
  const Y = new Date(wall).getUTCFullYear();
  const lichun = searchLon(315, Date.UTC(Y, 0, 15), 40);
  const sy = ut < lichun ? Y - 1 : Y;
  const yi = ((sy - 4) % 60 + 60) % 60;
  const ys = yi % 10, mStem = ((ys % 5) * 2 + 2 + k) % 10, mBr = (k + 2) % 12;
  const shift = lon < LINE70 ? 1 : 0;
  const dt = new Date(wall), h = dt.getUTCHours() + dt.getUTCMinutes() / 60;
  const di = (dayIdx(wall) + shift) % 60, zi = Math.floor((h + 1) / 2) % 12;
  const hsDay = h >= 23 ? (di + 1) % 60 : di;
  const hStem = ((hsDay % 5) * 2 + zi) % 10;
  return {
    wall, lon, ut, shift: !!shift, lateZi: h >= 23,
    year: { gz: gz(yi), stem: ys, br: yi % 12 },
    month: { gz: GAN[mStem] + ZHI[mBr], stem: mStem, br: mBr, k },
    day: { gz: gz(di), idx: di, stem: di % 10, br: di % 12, rawGz: gz(dayIdx(wall)) },
    hour: { gz: GAN[hStem] + ZHI[zi], stem: hStem, br: zi },
    jie: { name: JIE[k], lmt: prevJie != null ? fmt(prevJie + off) : null, ut: prevJie != null ? fmt(prevJie) : null,
      next: JIE[(k + 1) % 12], nextLmt: nextJie != null ? fmt(nextJie + off) : null },
    lichunLmt: fmt(lichun + off), solarYear: sy,
  };
}
// 旬空：日柱序 → 兩個空亡地支序
export function xunKong(di) { const s = ((di - di % 10) % 12 + 12) % 12; return [(s + 10) % 12, (s + 11) % 12]; }
export function xunName(di) { return '甲' + ZHI[((di - di % 10) % 12 + 12) % 12]; }

// ---- 所在地農曆（時間起卦用）----
function newMoonsAround(t) {
  const lo = t - 40 * D, hi = t + 40 * D, out = [];
  const T_LO = NM[0] * 1000 + 40 * D, T_HI = NM[NM.length - 1] * 1000 - 40 * D;
  if (t >= T_LO && t <= T_HI) { for (const s of NM) { const ms = s * 1000; if (ms > hi) break; if (ms >= lo) out.push(ms); } return out; }
  let x = lo; for (let i = 0; i < 4; i++) { const r = Astro.SearchMoonPhase(0, new Date(x), 40); if (!r) break; const ms = r.date.getTime(); if (ms > hi) break; out.push(ms); x = ms + 5 * D; }
  return out;
}
function chinaMonthOfNewMoon(ms) {
  const mid = new Date(ms + 8 * 36e5 + 14 * D), L = Solar.fromYmd(mid.getUTCFullYear(), mid.getUTCMonth() + 1, mid.getUTCDate()).getLunar();
  return { year: L.getYear(), month: Math.abs(L.getMonth()), leap: L.getMonth() < 0 };
}
const CN_M = ['', '正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '臘'];
const DAY_TXT = d => d <= 10 ? '初' + '一二三四五六七八九十'[d - 1] : d < 20 ? '十' + '一二三四五六七八九'[d - 11] : d === 20 ? '二十' : d < 30 ? '廿' + '一二三四五六七八九'[d - 21] : '三十';
/** 地方平時日期（0:00 換日）的所在地農曆 */
export function localLunar(wall, lon) {
  const off = +lon * 4 * 6e4, dn = Math.floor(wall / D);
  const nms = newMoonsAround(wall - off).map(ms => ({ ms, day: Math.floor((ms + off) / D) }));
  let i = -1; nms.forEach((x, j) => { if (x.day <= dn) i = j; });
  if (i < 0) { // 退回中國曆
    const d = new Date(wall), L = Solar.fromYmd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()).getLunar();
    const r = { year: L.getYear(), month: Math.abs(L.getMonth()), leap: L.getMonth() < 0, day: L.getDay(), fallback: true };
    r.text = txt(r); return r;
  }
  const m = nms[i], cm = chinaMonthOfNewMoon(m.ms);
  const r = { year: cm.year, month: cm.month, leap: cm.leap, day: dn - m.day + 1, newMoonLmt: fmt(m.ms + off) };
  r.yearBr = ((r.year - 4) % 12 + 12) % 12; r.text = txt(r); return r;
}
function txt(r) { r.yearBr = ((r.year - 4) % 12 + 12) % 12; return `${gz((r.year - 4) % 60 + 60)}年${r.leap ? '閏' : ''}${CN_M[r.month]}月${DAY_TXT(r.day)}`; }
