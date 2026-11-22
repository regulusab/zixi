// 命造代碼：年月日-時分-性別-出生地-姓名（例 19850315-1430-男-台北-王小明）。總入口存於 localStorage「rg.mingzao」（同網域各站共用）。
import { PLACES, T2S } from './places.js';
export const MZ_KEY = 'rg.mingzao';
const SEX = { 男: 'm', 乾: 'm', m: 'm', M: 'm', '1': 'm', 女: 'f', 坤: 'f', f: 'f', F: 'f', '0': 'f', '2': 'f' };
const TS = {}; for (let i = 0; i < T2S.length; i += 2) TS[T2S[i]] = T2S[i + 1];
const simp = s => [...s].map(c => TS[c] || c).join('');
const nrm = s => simp(String(s).normalize('NFKC').replace(/[\s　・·.,，、]/g, '')).toLowerCase();
const INDEX = []; PLACES.forEach(([names, lon]) => names.forEach(n => INDEX.push([nrm(n), lon, names[0]])));
const PRE = /^(中華民國|台湾|中国|中华人民共和国|香港特别行政区|澳门特别行政区|美国|加拿大|日本|韩国|英国|澳洲|澳大利亚|新西兰|纽西兰|德国|法国)/;
const SUF = /(特别行政区|自治区|省|市|县|区|乡|镇|州)$/;
/** 出生地 → { lon, name, how }；認不出回傳 null */
export function resolvePlace(raw) {
  const s0 = String(raw ?? '').normalize('NFKC').trim(); if (!s0) return null;
  // 經度：121.5E、122.68W、東經121.5、西經122.68、E121.5、-122.68、121.5
  const m = /^(東經|东经|西經|西经|[EW])?\s*([+-]?\d{1,3}(?:\.\d+)?)\s*°?\s*([EW]|東|东|西)?$/i.exec(s0.replace(/度/, '°'));
  if (m) { let v = parseFloat(m[2]); const d = (m[1] || m[3] || '').toUpperCase();
    if (/^(西|W)/.test(d) || d === '西經' || d === '西经') v = -Math.abs(v); else if (d) v = Math.abs(v);
    if (Math.abs(v) <= 180) return { lon: v, name: `${v >= 0 ? '東經' : '西經'} ${Math.abs(v)}°`, how: '經度' };
    return null; }
  const k = nrm(s0); const tries = [k, k.replace(PRE, ''), k.replace(PRE, '').replace(SUF, '')];
  for (const t of tries) { if (!t) continue; const hit = INDEX.find(x => x[0] === t); if (hit) return { lon: hit[1], name: hit[2], how: '地名' }; }
  // 部分比對：輸入含已知地名（取最長者）
  const t = tries[1] || k; let best = null;
  for (const x of INDEX) if (x[0].length >= 2 && t.includes(x[0]) && (!best || x[0].length > best[0].length)) best = x;
  if (best) return { lon: best[1], name: best[2], how: '地名（部分比對）' };
  return null;
}
/** 解析命造代碼，回傳本站網址參數 st 與說明 notes；任何輸入都回傳結果，不阻擋 */
export function parseCode(raw) {
  const notes = [], code = String(raw ?? '').trim().normalize('NFKC');
  // 以「-」分欄；出生地為經度負號時（如 -122.68）先保護
  const f = code.replace(/--(\d)/g, '-\u0001$1').split(/[-－—–]/).map(s => s.replace('\u0001', '-').trim());
  const st = { d: '', t: '', u: '0', g: 'm', lon: '121.5654', p: '台北', y: '', n: '' };
  const dd = (f[0] || '').replace(/\D/g, '');
  if (/^\d{8}$/.test(dd)) st.d = dd; else notes.push(`命造代碼的年月日「${f[0] || ''}」無法辨識`);
  const tt = (f[1] || '').replace(/\D/g, '');
  if (/^\d{3,4}$/.test(tt) && !/[?？x]/i.test(f[1])) st.t = tt.padStart(4, '0'); else { st.u = '1'; if (f[1]) notes.push(`時分「${f[1]}」無法辨識，改列每個時辰`); }
  if (f[2] && SEX[f[2]]) st.g = SEX[f[2]]; else notes.push(`性別「${f[2] || ''}」無法辨識，暫以男命排`);
  const pl = resolvePlace(f[3]);
  if (pl) { st.lon = String(pl.lon); st.p = pl.how === '經度' ? '自訂經度' : pl.name; if (pl.how !== '經度' && nrm(pl.name) !== nrm(f[3])) notes.push(`出生地「${f[3]}」以${pl.name}（${pl.lon >= 0 ? '東經' : '西經'} ${Math.abs(pl.lon)}°）排盤`); }
  else notes.push(f[3] ? `出生地「${f[3]}」無法辨識，暫以台北（東經 121.5654°）排盤，可於上方改經度` : '命造代碼未填出生地，暫以台北（東經 121.5654°）排盤，可於上方改經度');
  st.n = f.slice(4).join('-');
  return { st, notes, code, place: pl };
}
