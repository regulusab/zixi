// 驗證：十二長生、納音、旬空、四柱、範例、引文逐字、模糊測試、遮蔽字
import { Solar } from 'lunar-javascript';
import fs from 'fs';
import { pillars, xunKong, gz, GAN, ZHI } from '../src/calendar.js';
const isYangG = g => '甲丙戊庚壬'.includes(g);
import { stageOf, nayinName, buildChart, analyzeZixi, allHours, STAGES } from '../src/engine.js';
import { Q, SRC, shown, POEM_LINES } from '../src/texts.js';
const out = []; const log = s => { out.push(s); console.log(s); }; let fails = 0; const bad = s => { fails++; if (fails < 30) log('  ✗ ' + s); };
const S2T = { '长生': '長生', '沐浴': '沐浴', '冠带': '冠帶', '临官': '臨官', '帝旺': '帝旺', '衰': '衰', '病': '病', '死': '死', '墓': '墓', '绝': '絕', '胎': '胎', '养': '養' };
const G2S = '甲乙丙丁戊己庚辛壬癸', Z = ZHI;
// 1. 十二長生 10×12 對 lunar-javascript（EightChar.getTimeDiShi：以日干看時支）
{ let ok = 0; for (let g = 0; g < 10; g++) { // 找日干為 g 的一天
    let s = Solar.fromYmd(2026, 1, 1); while (s.getLunar().getDayGanIndex() !== g) s = s.next(1);
    for (let z = 0; z < 12; z++) { const h = z === 0 ? 0 : 2 * z; const E = Solar.fromYmdHms(s.getYear(), s.getMonth(), s.getDay(), h, 30, 0).getLunar().getEightChar(); E.setSect(2);
      if (E.getTimeZhi() !== Z[z]) { bad('時支 ' + z); continue; }
      const lj = S2T[E.getTimeDiShi()], me = STAGES[stageOf(GAN[g], z)]; if (lj === me) ok++; else bad(`長生 ${GAN[g]}${Z[z]} lunar ${lj} 本站 ${me}`); } }
  log(`十二長生 10 干 × 12 支，對 lunar-javascript getTimeDiShi：${ok}/120 相符`); }
// 1b. 《三命通會》卷二〈論天干隂陽生死〉文字定點
{ const pts = { 甲: ['亥', '午'], 乙: ['午', '亥'], 丙: ['寅', '酉'], 丁: ['酉', '寅'], 戊: ['寅', '酉'], 己: ['酉', '寅'], 庚: ['巳', '子'], 辛: ['子', '巳'], 壬: ['申', '卯'], 癸: ['卯', '申'] }; let ok = 0;
  for (const g in pts) { if (STAGES[stageOf(g, Z.indexOf(pts[g][0]))] === '長生') ok++; else bad(g + '生'); if (STAGES[stageOf(g, Z.indexOf(pts[g][1]))] === '死') ok++; else bad(g + '死'); }
  log(`《三命通會》卷二 十干生死二十處定點：${ok}/20 相符`); }
// 2. 納音對 lunar-javascript
{ let ok = 0; const T = s => s.replace('剑', '劍').replace('炉', '爐').replace('涧', '澗').replace('头', '頭').replace('杨', '楊').replace('泉', '泉').replace('壁', '壁').replace('灯', '燈').replace('长', '長').replace('钗钏', '釵釧').replace('驿', '驛').replace('沙', '沙').replace('宝', '寶');
  const lj = []; let s = Solar.fromYmd(1984, 3, 1); for (let i = 0; i < 60; i++) { lj.push(s.getLunar().getYearNaYin()); s = Solar.fromYmd(1984 + i + 1, 3, 1); }
  const names = []; for (let i = 0; i < 60; i++) names.push(nayinName(i));
  for (let i = 0; i < 60; i++) { const a = lj[i], b = names[i]; if (a.slice(-1) === b.slice(-1) || T(a).slice(-1) === b.slice(-1)) ok++; else bad(`納音 ${gz(i)} ${a} ${b}`); }
  log(`納音五行（六十甲子）對 lunar-javascript getYearNaYin：${ok}/60 相符（名稱取《三命通會》卷一用字，lunar-javascript 為簡體或通行名，只比五行）`); }
// 3. 旬空對 lunar-javascript
{ let ok = 0; let s = Solar.fromYmd(2026, 1, 1); for (let i = 0; i < 60; i++, s = s.next(1)) { const L = s.getLunar(), di = (L.getDayGanIndex() * 36 + L.getDayZhiIndex() * 25) % 60; const k = xunKong(di).map(b => Z[b]).join(''); if (k === L.getDayXunKong()) ok++; else bad(`旬空 ${L.getDayInGanZhi()} ${k} ${L.getDayXunKong()}`); }
  log(`日柱旬空（六十日）對 lunar-javascript getDayXunKong：${ok}/60 相符`); }
// 4. 四柱對 lunar-javascript（東經 120°：地方平時＝東八區）
{ let okY = 0, okM = 0, okD = 0, okH = 0, nT = 0, nearJ = 0; let seed = 20261122; const R = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let i = 0; i < 3000; i++) {
    const y = 1901 + Math.floor(R() * 198), mo = Math.floor(R() * 12), d = 1 + Math.floor(R() * 28), h = Math.floor(R() * 24), mi = Math.floor(R() * 60);
    const wall = Date.UTC(y, mo, d, h, mi), P = pillars(wall, 120);
    const E = Solar.fromYmdHms(y, mo + 1, d, h, mi, 0).getLunar().getEightChar(); E.setSect(2); nT++;
    const near = [P.jie.lmt, P.jie.nextLmt].some(s => s && Math.abs(Date.parse(s.replace(' ', 'T') + 'Z') - wall) < 3 * 6e4) || (P.lichunLmt && Math.abs(Date.parse(P.lichunLmt.replace(' ', 'T') + 'Z') - wall) < 3 * 6e4);
    if (near) { nearJ++; continue; }
    if (E.getYear() === P.year.gz) okY++; else bad(`年柱 ${y}-${mo + 1}-${d} ${h}:${mi} ${E.getYear()} vs ${P.year.gz}`);
    if (E.getMonth() === P.month.gz) okM++; else bad(`月柱 ${y}-${mo + 1}-${d} ${h}:${mi} ${E.getMonth()} vs ${P.month.gz}`);
    if (E.getDay() === P.day.gz) okD++; else bad(`日柱 ${y}-${mo + 1}-${d} ${h}:${mi} ${E.getDay()} vs ${P.day.gz}`);
    if (E.getTime() === P.hour.gz) okH++; else bad(`時柱 ${y}-${mo + 1}-${d} ${h}:${mi} ${E.getTime()} vs ${P.hour.gz}`);
  }
  const nC = nT - nearJ; log(`四柱對 lunar-javascript（東經 120°，1901–2098 年隨機 ${nT} 個時刻，略過交節前後 3 分鐘 ${nearJ} 個）：年 ${okY}/${nC}、月 ${okM}/${nC}、日 ${okD}/${nC}、時 ${okH}/${nC}`); }
// 4b. 範例
{ const P = pillars(Date.UTC(2026, 9, 7, 22, 10), -122.68), s = [P.year.gz, P.month.gz, P.day.gz, P.hour.gz].join(' ');
  log(`西經 122.68° 2026-10-07 22:10：${s}（寒露 ${P.jie.nextLmt} 地方平時）`); if (s !== '丙午 丁酉 乙卯 丁亥') bad('122.68W');
  for (const [sx, yw] of [['m', ''], ['m', '水'], ['f', ''], ['f', '水']]) { const C = buildChart(Date.UTC(2026, 9, 7, 22, 10), -122.68, sx), R = analyzeZixi(C, { yw });
    log(`  ${sx === 'm' ? '男' : '女'}命、最旺用神${yw || '未指定'}：${R.teacher.map(t => `${t.title.split('：')[0]} ${t.unset ? '未指定（由輸入者指定），不出數' : `${t.w}（${t.g}）在亥「${t.stage}」→「${t.line}」${t.n ? t.n.join('～') : '未給'}，子緣${t.ziyuan}`}`).join('；')}；彙整 ${R.range ? R.range.lo + '～' + R.range.hi : '—'} 子`); } }
// 4e. 老師三法：子數只取歌訣原數（每個十二運對應固定數），彙整只取三法
{ const EXP = [[4, 4], [2, 2], [3, 3], [3, 3], [5, 5], [2, 2], [1, 1], [0, 0], null, [1, 1], null, [1, 3]]; let ok = 0, n = 0, seed = 31;
  const R0 = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let i = 0; i < 3000; i++) { const C = buildChart(Date.UTC(1900 + Math.floor(R0() * 200), Math.floor(R0() * 12), 1 + Math.floor(R0() * 28), Math.floor(R0() * 24), Math.floor(R0() * 60)), -180 + R0() * 360, R0() < .5 ? 'm' : 'f'), yw = ['', '金', '木', '水', '火', '土'][Math.floor(R0() * 6)], R = analyzeZixi(C, { yw });
    if (!!R.teacher[2].unset !== !yw || (!yw && R.teacher[2].n) || (yw && R.teacher[2].w !== yw)) bad('第三法指定'); for (const t of R.teacher.filter(t => !t.unset)) { n++; const st = stageOf(t.g, C.P.hour.br); if (JSON.stringify(t.n) === JSON.stringify(EXP[st]) && STAGES[st] === t.stage && isYangG(t.g)) ok++; else bad(`三法 ${t.id} ${t.g} ${t.stage}`); }
    const ns = R.teacher.filter(t => t.n && !t.unset); const lo = ns.length ? Math.min(...ns.map(t => t.n[0])) : null, hi = ns.length ? Math.max(...ns.map(t => t.n[1])) : null;
    if ((R.range ? R.range.lo : null) !== lo || (R.range ? R.range.hi : null) !== hi) bad('彙整非三法');
  }
  log(`老師三法（3000 盤，最旺用神隨機指定或留空）：已出數各法子數皆為歌訣原數、皆以陽干起長生 ${ok}/${n}；第三法留空時不出數、指定時用所指定五行；彙整只取已出數之法：${fails ? '見上' : '相符'}`); }
// 4c. 70°E 以西進一位、晚子時
{ const a = pillars(Date.UTC(2026, 0, 10, 12, 0), 120), b = pillars(Date.UTC(2026, 0, 10, 12, 0), -80); if ((a.day.idx + 1) % 60 !== b.day.idx) bad('70E shift'); else log(`東經 70° 以西日柱干支進一位（日期不動）：東經 120° ${a.day.gz} → 西經 80° ${b.day.gz}`);
  const c = pillars(Date.UTC(2026, 0, 10, 23, 30), 120), e = pillars(Date.UTC(2026, 0, 10, 22, 30), 120); if (c.day.gz !== e.day.gz) bad('晚子日柱'); log(`晚子時：2026-01-10 23:30 東經 120° 日柱 ${c.day.gz}（不換）、時柱 ${c.hour.gz}`); }
// 5. 引文逐字
const norm = f => { let t = fs.readFileSync('src-texts/' + f, 'utf8'); if (f.endsWith('.html')) { t = t.replace(/<[^>]+>/g, ''); t = t.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&'); }
  t = t.replace(/\{\{SK notes\|([^}]*)\}\}/g, '$1').replace(/\{\{SK anchor\|([^}]*)\}\}/g, '$1'); return t.replace(/\s+/g, ''); };
{ const cache = {}; let ok = 0, n = 0; for (const id in Q) { const x = Q[id], f = SRC[x.s].file; cache[f] ??= norm(f); n++; const k = x.t.replace(/\s+/g, '');
    if (cache[f].includes(k)) ok++; else bad(`引文 ${id} 不在 ${f}：${x.t.slice(0, 30)}`);
    for (const m of x.m || []) if (!x.t.includes(m)) bad(`遮蔽片段 ${id} 不在原文`); }
  log(`引文逐字核對（對下載的原網頁／維基文庫原始碼）：${ok}/${n} 字字相符`); }
// 6. 模糊測試 20,000 盤＋遮蔽字
const BAN = ['加一天', '前世', '風水', '夭', '送終', '損子', '傷損', '有剋', '殂', '喪', '入泉鄉', '出家', '官符', '疾病', '殘疾', 'undefined', 'NaN', '[object'];
{ let seed = 777; const R = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648; let crash = 0, hits = 0, noRange = 0; const lineHit = {};
  for (let i = 0; i < 20000; i++) {
    const wall = Date.UTC(1800 + Math.floor(R() * 400), Math.floor(R() * 12), 1 + Math.floor(R() * 28), Math.floor(R() * 24), Math.floor(R() * 60)), lon = -180 + R() * 360, sex = R() < .5 ? 'm' : 'f', yw = ['', '金', '木', '水', '火', '土'][Math.floor(R() * 6)];
    try { const C = buildChart(wall, lon, sex), A = analyzeZixi(C, { yw });
      const txt = JSON.stringify(A, (k, v) => k === 'q' ? v.map(id => { if (!Q[id]) throw new Error('無此引文 ' + id); return shown(id); }) : v);
      for (const w of BAN) if (txt.includes(w)) { hits++; if (hits < 5) bad(`遮蔽字「${w}」出現於 ${new Date(wall).toISOString()} ${lon.toFixed(2)} ${sex}`); }
      if (!A.range) noRange++; const m = A.teacher[0]; lineHit[m.stage] = (lineHit[m.stage] || 0) + 1;
      if (i % 50 === 0) { const H = allHours(wall, lon, sex, yw); if (H.some(h => !!h.t[2].unset !== !yw)) bad('時辰表第三法'); if (H.length !== 13) bad('時辰表'); if (JSON.stringify(H).match(/undefined|NaN/)) bad('時辰表 undefined'); }
    } catch (e) { crash++; if (crash < 5) bad(`當機 ${new Date(wall).toISOString()} ${lon} ${sex}: ${e.stack.split('\n').slice(0, 2).join(' ')}`); } }
  log(`模糊測試：20,000 盤（1800–2199 年、經度 −180～180、男女各半、最旺用神隨機指定或留空；每 50 盤另跑 13 時段表）：當機 ${crash}，遮蔽字／undefined／NaN 命中 ${hits}；三法皆落墓／胎而無原數者 ${noRange} 盤（頁面顯示「三法皆未給數目」，照常出結果）`);
  log(`  時支落於十二運的分布：${STAGES.map(s => s + ' ' + (lineHit[s] || 0)).join('、')}`); }
// 7. 命造代碼（年月日-時分-性別-出生地-姓名）
{ const { parseCode, resolvePlace } = await import('../src/mzcode.js');
  const day = code => { const st = parseCode(code).st; const P = pillars(Date.UTC(+st.d.slice(0, 4), +st.d.slice(4, 6) - 1, +st.d.slice(6, 8), +st.t.slice(0, 2), +st.t.slice(2)), +st.lon); return [P.year.gz, P.month.gz, P.day.gz, P.hour.gz].join(' '); };
  const cases = [
    ['20261007-2210-男-波特蘭-測試', { d: '20261007', t: '2210', g: 'm', lon: '-122.68', n: '測試' }, '丙午 丁酉 乙卯 丁亥'],
    ['20261007-2210-男-122.68W-測試', { lon: '-122.68' }, '丙午 丁酉 乙卯 丁亥'],
    ['20261007-2210-男-西經122.68-測試', { lon: '-122.68' }, '丙午 丁酉 乙卯 丁亥'],
    ['20261007-2210-男--122.68-測試', { lon: '-122.68' }, '丙午 丁酉 乙卯 丁亥'],
    ['20261007-2210-男-波特兰-测试', { lon: '-122.68' }, '丙午 丁酉 乙卯 丁亥'],
    ['20261007-2210-男-台北-王小明', { lon: '121.5654', n: '王小明' }, '丙午 丁酉 甲寅 乙亥'],
    ['20261007-2210-男-臺北市-王小明', { lon: '121.5654' }, null],
    ['19850315-1430-女-121.5E-陳-大文', { lon: '121.5', g: 'f', n: '陳-大文' }, null],
    ['19850315-1430-女-東經121.5', { lon: '121.5' }, null],
    ['19850315-1430-女-香港', { lon: '114.1694' }, null],
    ['19850315-1430-女-广州市', { lon: '113.2644' }, null],
    ['19850315-1430-女-纽约', { lon: '-74.006' }, null],
    ['19850315-1430-女-台灣高雄市', { lon: '120.3014' }, null],
    ['19850315-1430-女-哈尔滨', { lon: '126.5349' }, null],
    ['19850315-1430-女-火星', { lon: '121.5654', p: '台北' }, null],
    ['19850315-1430-女--', { lon: '121.5654' }, null],
    ['19900101-??-坤', { d: '19900101', u: '1', g: 'f', lon: '121.5654' }, null],
    ['１９８５０３１５－０９０５－乾－台中', { d: '19850315', t: '0905', g: 'm', lon: '120.6736' }, null],
    ['abc', { d: '', u: '1' }, null]];
  let ok = 0; for (const [c, e, pz] of cases) { const r = parseCode(c).st; let good = Object.entries(e).every(([k, v]) => r[k] === v); if (good && pz) good = day(c) === pz; if (good) ok++; else bad(`命造代碼 ${c} → ${JSON.stringify(r)}${pz ? ' ' + day(c) : ''}`); }
  log(`命造代碼解析（地名繁簡、經度 E/W／東經西經／負號、未知或空白→台北）：${ok}/${cases.length} 例相符；20261007-2210-男-波特蘭／122.68W／西經122.68／-122.68／波特兰 → ${day('20261007-2210-男-波特蘭')}`);
  let seed = 5, crash = 0; const R = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648; const CH = '0123456789-男女乾坤?:xaEW.東經西 王台北香港纽约';
  for (let i = 0; i < 5000; i++) { let c = ''; const L = Math.floor(R() * 34); for (let j = 0; j < L; j++) c += CH[Math.floor(R() * CH.length)]; try { const st = parseCode(c).st; const lon = +st.lon; if (!isFinite(lon) || Math.abs(lon) > 180) throw new Error('lon ' + st.lon); const C = buildChart(Date.UTC(1990, 0, 1, 12), lon, st.g); analyzeZixi(C, {}); } catch (e) { crash++; if (crash < 3) bad('代碼當機 ' + c + ' ' + e.message); } }
  log(`隨機 5000 個亂碼命造代碼：當機 ${crash}`); }
log(fails ? `\n共 ${fails} 項不符` : '\n全部通過');
fs.writeFileSync('tests/verify-result.txt', out.join('\n') + '\n');
