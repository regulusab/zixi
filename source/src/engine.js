// 子息論斷引擎：四柱來自 calendar.js（地方平時規則）；十神、五行分數、格局用神借用八字站 analysis.js 複本。
import { pillars as calcPillars, xunKong, gz, GAN, ZHI } from './calendar.js';
import { analyze } from './vendor/analysis.js';
import { shiShen, hide, ganWx, ganRel, zhiRel, sanHe, WX } from './vendor/bazi-core.js';
import { STAGES, POEM_LINES } from './texts.js';

const D = 864e5;
// 十二長生起點（陽干順行、陰干逆行），依《三命通會》卷二〈論天干陰陽生死〉
export const CS_START = { 甲: 11, 丙: 2, 戊: 2, 庚: 5, 壬: 8, 乙: 6, 丁: 9, 己: 9, 辛: 0, 癸: 3 };
export const isYang = g => GAN.indexOf(g) % 2 === 0;
/** 天干 g 在地支序 br 的十二運序（0 長生 … 11 養）。opt.tuShen：土以申起長生（徐樂吾「寄生於寅申」之申）。 */
export function stageOf(g, br, opt = {}) {
  let s = CS_START[g]; if (opt.tuShen && g === '戊') s = 8;
  return isYang(g) ? ((br - s) % 12 + 12) % 12 : ((s - br) % 12 + 12) % 12;
}
export const YANG_OF = { 木: '甲', 火: '丙', 土: '戊', 金: '庚', 水: '壬' };
export const YIN_OF = { 木: '乙', 火: '丁', 土: '己', 金: '辛', 水: '癸' };
const KE_ME = w => WX[(WX.indexOf(w) + 3) % 5];   // 剋我者
const I_GEN = w => WX[(WX.indexOf(w) + 1) % 5];   // 我生者
// 生旺／死絕分類（本站判準：生旺＝長生、臨官、帝旺；死絕＝死、絕）
export const SW = i => [0, 3, 4].includes(i) ? 'sw' : [7, 9].includes(i) ? 'sj' : 'mid';
export const SW_NAME = { sw: '生旺', sj: '死絕', mid: '非生旺亦非死絕' };
const SHENGCHENG = { 水: [1, 6], 火: [2, 7], 木: [3, 8], 金: [4, 9], 土: [5, 10] };
const NAYIN_NAME = ['海中金', '爐中火', '大林木', '路傍土', '劒鋒金', '山頭火', '澗下水', '城頭土', '白鑞金', '楊柳木', '井泉水', '屋上土', '霹靂火', '松柏木', '長流水', '砂中金', '山下火', '平地木', '壁上土', '金泊金', '覆燈火', '天河水', '大驛土', '釵釧金', '桑柘木', '大溪水', '砂中土', '天上火', '石榴木', '大海水']; // 《三命通會》卷一納音名
export const nayinName = i => NAYIN_NAME[Math.floor(i / 2)];
const POS = ['年', '月', '日', '時'];
const QI = ['本氣', '中氣', '餘氣'];
const idx60 = (s, b) => { for (let i = 0; i < 60; i++) if (i % 10 === s && i % 12 === b) return i; return 0; };
const wangXiangOf = (mBr, w) => { const SEASON = '水土木木土火火土金金土水'; const s = SEASON[mBr]; const d = (WX.indexOf(w) - WX.indexOf(s) + 5) % 5; return ['旺', '相', '死', '囚', '休'][d]; };

/** 建立命盤：wall 地方平時牆鐘毫秒，lon 經度，sex 'm'|'f' */
export function buildChart(wall, lon, sex) {
  const P = calcPillars(wall, lon);
  const g4 = [P.year, P.month, P.day, P.hour].map(p => ({ gan: GAN[p.stem], zhi: ZHI[p.br], stem: p.stem, br: p.br }));
  const dm = g4[2].gan, dw = ganWx(dm);
  const pil = g4.map((p, i) => ({ label: ['年柱', '月柱', '日柱', '時柱'][i], pos: POS[i], gan: p.gan, zhi: p.zhi, br: p.br, ss: i === 2 ? '日主' : shiShen(dm, p.gan), hide: hide(p.zhi).map(g => ({ g, ss: shiShen(dm, g) })) }));
  // 八字站 buildChart 的五行計分（天干各 1，藏干 .6/.3/.1，月支加倍）
  const score = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 }, W = [.6, .3, .1];
  pil.forEach((p, i) => { score[ganWx(p.gan)] += 1; const k = i === 1 ? 2 : 1; p.hide.forEach((x, j) => score[ganWx(x.g)] += (p.hide.length === 1 ? 1 : W[j]) * k * 1.0); });
  const yinW = WX[(WX.indexOf(dw) + 4) % 5], tot = Object.values(score).reduce((a, b) => a + b);
  const self = (score[dw] + score[yinW]) / tot;
  const A = analyze({ pillars: pil, dw, dm, score, self });
  const kong = xunKong(P.day.idx);
  return { P, pil, dm, dw, sex, score, tot, self, A, kong, lon, wall };
}

function starsOf(C, kinds) {
  const out = [];
  C.pil.forEach((p, i) => {
    if (i !== 2 && kinds.includes(p.ss)) out.push({ where: p.pos + '干', g: p.gan, ss: p.ss, pi: i, gan: true, seat: p.zhi, stage: stageOf(p.gan, p.br) });
    p.hide.forEach((h, j) => { if (kinds.includes(h.ss)) out.push({ where: p.pos + '支' + p.zhi + '藏' + (p.hide.length === 1 ? '' : QI[j]), g: h.g, ss: h.ss, pi: i, gan: false, qi: j, seat: p.zhi, stage: stageOf(h.g, p.br) }); });
  });
  out.forEach(s => { s.male = isYang(s.g); s.wx = ganWx(s.g); s.ws = wangXiangOf(C.pil[1].br, s.wx); });
  return out;
}
const countIn = (C, kinds, mode) => { let n = 0; C.pil.forEach((p, i) => { if (i !== 2 && kinds.includes(p.ss)) n++; if (mode !== 'gan') p.hide.forEach((h, j) => { if ((mode === 'all' || j === 0) && kinds.includes(h.ss)) n++; }); }); return n; };
const anyIn = (C, kinds) => countIn(C, kinds, 'all') > 0;
const ROLE = { 用: '用神', 喜: '喜神', 輔: '輔神', 忌: '忌神', 閒: '閒神' };


// 月令旺衰 → 子緣厚薄（本站對應：旺相＝厚、休＝中、囚死＝薄；只說子緣，不改子數）
export const ZIYUAN = { 旺: '厚', 相: '厚', 休: '中', 囚: '薄', 死: '薄' };
const poemRes = st => { const L = POEM_LINES.zp[st]; return { stage: STAGES[st], line: L.l, n: L.n, extra: L.adopt ? '原句「除非養取他之子」：可收養他人之子。' : L.girl ? '原句只言頭胎為女，未給數目。' : L.masked ? '原句未給數目。' : L.note || '', cs: st === 0 ? '原句「長生四子中旬半」：子數取原數四；「中旬半」只錄原文，不減半。' : '' }; };
/** 老師確認三法：只用歌訣原數，不做旺相倍加、休囚減半、沖空折減；月令旺衰只論子緣厚薄 */
function teacherMethods(C, R, o) {
  const { P, pil, A } = C, male = R.male, mBr = pil[1].br, pct = w => C.score[w] / C.tot;
  const out = [];
  const mk = (id, title, w, g, why, extraNote) => {
    const st = stageOf(g, o.hourBr), r = poemRes(st), ws = wangXiangOf(mBr, w);
    const t = { id, title, w, g, why, st, ...r, ws, ziyuan: ZIYUAN[ws], son: YANG_OF[w], dau: YIN_OF[w], note: extraNote || '' };
    if (w === '土') { const s2 = stageOf('戊', o.hourBr, { tuShen: true }); t.tu = `土另說：徐樂吾評註「土居中央，寄生於寅申」，若以申起，時支${o.hourZ}為「${STAGES[s2]}」，歌句「${POEM_LINES.zp[s2].l}」。本站子數仍依寅起（火土同宮），此說只列文字。`; }
    out.push(t); return t;
  };
  // 第一法：男命官殺、女命食傷之五行
  mk('t1', male ? '第一法：官殺五行在時支' : '第一法：食傷五行在時支', o.starW, YANG_OF[o.starW],
    `${male ? '男命以官殺為子' : '女命以食傷為子'}：日主${C.dm}（${C.dw}）${male ? '剋我者' : '我生者'}為${o.starW}。取${o.starW}之陽干${YANG_OF[o.starW]}起長生（${ZHI[CS_START[YANG_OF[o.starW]]]}），順數至時支${o.hourZ}。`);
  // 第二法：時干本身
  { const g = o.hourG, w = ganWx(g), y = isYang(g), gUse = YANG_OF[w];
    const t = mk('t2', '第二法：時干在時支', w, gUse,
      `時干${g}（${w}，${y ? '陽' : '陰'}干）。${y ? `${g}為陽干，起長生於${ZHI[CS_START[g]]}順數至時支${o.hourZ}。` : `${g}為陰干，與第一法同例，取${w}之陽干${gUse}起長生（${ZHI[CS_START[gUse]]}），順數至時支${o.hourZ}（《子平真詮》「用陽而不用陰」）。`}`,
      y ? '' : `若改依陰干逆行（${g}起長生於${ZHI[CS_START[g]]}逆數），時支${o.hourZ}為「${STAGES[stageOf(g, o.hourBr)]}」；本站不採此讀，只列對照。`);
    t.hourG = g; t.hourYang = y; }
  // 第三法：最旺的用神（老師：由輸入者指定；本站不自動選取）
  if (o.yw && YANG_OF[o.yw]) {
    mk('t3', '第三法：最旺的用神在時支', o.yw, YANG_OF[o.yw],
      `最旺用神由輸入者指定為${o.yw}。取${o.yw}之陽干${YANG_OF[o.yw]}起長生（${ZHI[CS_START[YANG_OF[o.yw]]]}），順數至時支${o.hourZ}。`);
  } else out.push({ id: 't3', title: '第三法：最旺的用神在時支', unset: true, w: '', g: '', why: '最旺用神未指定（由輸入者指定）。本法不出子數，彙整只取第一、二法。', stage: '未指定', line: '—', n: null, ws: '', ziyuan: '', son: '', dau: '', note: '', extra: '', cs: '' });
  return out;
}

/** 完整論斷 */
export function analyzeZixi(C, opt = {}) {
  const { P, pil, dm, dw, sex, A } = C, male = sex !== 'f';
  const hourBr = P.hour.br, hourG = pil[3].gan, hourZ = pil[3].zhi;
  const starW = male ? KE_ME(dw) : I_GEN(dw);
  const starKinds = male ? ['七殺', '正官'] : ['食神', '傷官'];
  const stars = starsOf(C, starKinds);
  const R = { male, starW, starKinds, stars, methods: [], counts: [], refCounts: [], gender: [], timing: {} };
  const pct = w => C.score[w] / C.tot;
  R.strength = { pct: pct(starW), ws: wangXiangOf(pil[1].br, starW), tou: countIn(C, starKinds, 'gan'), ben: countIn(C, starKinds, 'ben') - countIn(C, starKinds, 'gan'), all: countIn(C, starKinds, 'all'), role: A.role(starW), lev: A.lev, yong: A.yong, xi: A.xi, ji: A.ji, geName: A.geName };
  const add = (m) => { R.methods.push(m); return m; };
  const addCount = (label, n, ref) => { if (n) R.refCounts.push({ label, lo: n[0], hi: n[1], ref }); };
  const yangG = YANG_OF[starW];
  const st = stageOf(yangG, hourBr);
  R.hourStage = st;
  // 交節後日數（「中旬半」參考）
  const jieMs = P.jie.lmt ? Date.UTC(+P.jie.lmt.slice(0, 4), +P.jie.lmt.slice(5, 7) - 1, +P.jie.lmt.slice(8, 10), +P.jie.lmt.slice(11, 13), +P.jie.lmt.slice(14, 16)) : null;
  const daysAfterJie = jieMs != null ? Math.floor((C.wall - jieMs) / D) + 1 : null;

  // ---- 一、老師確認三法（長生沐浴歌原數）----
  R.teacher = teacherMethods(C, R, { starW, hourBr, hourG, hourZ, daysAfterJie, yw: opt.yw });
  R.teacher.forEach(t => { if (t.n) R.counts.push({ label: t.title, lo: t.n[0], hi: t.n[1], ref: t.id }); });
  if (male) {
    // 淵海子平：七殺
    const qs = YANG_OF[starW] === undefined ? null : (isYang(dm) ? YANG_OF[starW] : YIN_OF[starW]);
    const s1 = stageOf(qs, hourBr), L1 = POEM_LINES.yh[s1];
    const yhm = add({ id: 'yh', title: '《淵海子平》論子息（取七殺）', kind: 'count', q: ['yh_qisha', 'yh_poem'],
      how: `《淵海子平》以七殺為子星。日主${dm}之七殺為${qs}。` + (isYang(dm) ? `${qs}為陽干，起長生於${ZHI[CS_START[qs]]}順數，時支${hourZ}為「${STAGES[s1]}」（原書例「甲子之日、甲子之時，庚死於子」同此數法）。` : `${qs}為陰干，原書例只舉陽干（甲日庚殺），陰干如何起長生未明言，下列兩讀並列：`),
      line: L1.l, n: L1.n, stage: STAGES[s1] });
    if (isYang(dm)) { if (L1.n) addCount('淵海子平・論子息', L1.n, 'yh'); if (L1.note) yhm.extra = L1.note; }
    else {
      const sy = stageOf(YANG_OF[starW], hourBr), Ly = POEM_LINES.yh[sy];
      yhm.reads = [
        { name: `甲讀：陰干逆行（${qs}起長生於${ZHI[CS_START[qs]]}逆數，即《子平真詮》所駁「乙用辛男而陰局」之法）`, stage: STAGES[s1], line: L1.l, n: L1.n },
        { name: `乙讀：依五行長生（取${YANG_OF[starW]}順數，與《子平真詮》同）`, stage: STAGES[sy], line: Ly.l, n: Ly.n },
      ];
      yhm.line = null; yhm.n = null;
      if (L1.n) addCount('淵海子平・陰干逆行讀', L1.n, 'yh'); if (Ly.n) addCount('淵海子平・五行長生讀', Ly.n, 'yh');
    }
  }
  if (!male) {
    const cls = SW(st);
    add({ id: 'smf', title: '《三命通會》女命子居生旺', kind: cls === 'sw' ? 'pos' : 'note', q: ['sm_fmany'],
      how: `時支${hourZ}對${yangG}為「${STAGES[st]}」，${SW_NAME[cls]}${cls === 'sw' ? '，合「子居生旺之地主多子」。' : '，此條不發動。'}`, cond: cls === 'sw' });
  }

  // ---- 二、生成之數（男命）----
  if (male) {
    const [a, b] = SHENGCHENG[starW], cls = SW(st);
    const f = cls === 'sw' ? 2 : cls === 'sj' ? 0.5 : 1;
    const v = [a * f, b * f];
    add({ id: 'sc', title: '《淵海子平》生成之數・《三命通會》四九之數', kind: 'count', q: ['yh_sc', 'sm_guan'],
      how: `【僅供參考：老師規定取數只用歌訣原數，不用「生旺倍加、死絕減半」，此條不入彙整】子星${starW}之生數 ${a}、成數 ${b}（《三命通會》「甲乙日用金為嗣金旺則四九之子合數」即金之生成數）。時支${hourZ}對${yangG}為「${STAGES[st]}」，屬${SW_NAME[cls]}${cls === 'sw' ? '，「生旺倍加」' : cls === 'sj' ? '，「死絕減半」' : '，不加不減'}：生數讀 ${fmtN(v[0])}，成數讀 ${fmtN(v[1])}。原文未言取生數或成數，兩者並列；生旺取長生、臨官、帝旺，死絕取死、絕，為本站判準。原文又云「太過不及，不以此斷」，官殺太過或不及之盤，此數僅供對照。`,
      n: [Math.floor(Math.min(...v)), Math.ceil(Math.max(...v))] });
    addCount('生成之數（生數讀）', [Math.floor(v[0]), Math.ceil(v[0])], 'sc');
    addCount('生成之數（成數讀）', [Math.floor(v[1]), Math.ceil(v[1])], 'sc');
    // 一殺一子
    const qs = isYang(dm) ? YANG_OF[starW] : YIN_OF[starW];
    const n1 = countIn(C, ['七殺'], 'gan'), n2 = countIn(C, ['七殺'], 'ben'), n3 = countIn(C, ['七殺'], 'all');
    add({ id: 'cnt', title: '《淵海子平》一殺一子', kind: 'count', q: ['yh_cnt'],
      how: `七殺（${qs}）：天干透 ${n1} 處；天干加地支本氣 ${n2} 處；天干加全部藏干 ${n3} 處。原文未言藏干算否，三讀並列。`, n: [Math.min(n1, n2, n3), Math.max(n1, n2, n3)] });
    addCount('一殺一子（天干）', [n1, n1], 'cnt'); addCount('一殺一子（天干＋本氣）', [n2, n2], 'cnt'); addCount('一殺一子（天干＋藏干）', [n3, n3], 'cnt');
  }

  // ---- 三、星學大成納音法 ----
  {
    const yi = idx60(P.year.stem, P.year.br), nyName = NAYIN_NAME[Math.floor(yi / 2)], nyW = nyName.slice(-1);
    const keW = KE_ME(nyW), shW = I_GEN(nyW);
    const row = w => { const g = YANG_OF[w]; const out = []; for (let b = 0; b < 12; b++) out.push(stageOf(g, b)); return out; };
    const tuRow = () => { const out = []; for (let b = 0; b < 12; b++) out.push(stageOf('戊', b, { tuShen: true })); return out; };
    const rows = [{ name: `剋我者${keW}（原注主法）`, w: keW, st: row(keW) }, { name: `我生者${shW}（原注「又云」）`, w: shW, st: row(shW) }];
    for (const r of [...rows]) if (r.w === '土') rows.push({ name: `${r.name.replace('（', '，土以申起長生（')}`, w: '土', st: tuRow(), tu: true });
    add({ id: 'xx', title: '《星學大成》論納音定子息歌', kind: 'table', q: ['xx_poem', 'xx_note', 'xx_note2'],
      how: `年柱${P.year.gz}，納音${nyName}，年命屬${nyW}。原注取「納音尅我者」為子孫，又云取「我生者」，由其長生順數至「男女宫」。男女宫為星命十二宮之一，本站未排七政星盤，故列十二地支各宮所值，供已知男女宫者對照（來源待核：男女宫所在本站未算）。${nyW === '金' || keW === '土' || shW === '土' ? '土之長生，原注未舉例，本站以寅起，另列申起。' : ''}`,
      rows: rows.map(r => ({ name: r.name, cells: r.st.map(s => ({ stage: STAGES[s], n: POEM_LINES.xx[s].n })) })), pending: true });
  }

  // ---- 四、子女性別 ----
  if (male) {
    R.gender.push({ t: '陽干為男、陰干為女', q: ['zp_yang', 'sm_gender', 'sm_yy'], d: `子星${starW}：${YANG_OF[starW]}為男、${YIN_OF[starW]}為女。《子平真詮》「總以庚為男辛為女」、《三命通會》「陽男隂女理之大順也」。` });
    R.gender.push({ t: '七殺為男、正官為女', q: ['yh_qisha', 'yh_lq'], d: `日主${dm}：七殺${isYang(dm) ? YANG_OF[starW] : YIN_OF[starW]}為男、正官${isYang(dm) ? YIN_OF[starW] : YANG_OF[starW]}為女。${isYang(dm) ? '陽日主與上說結果相同。' : '陰日主與上說男女相反。'}` });
    R.gender.push({ t: '官多正出、煞為偏子或為女', q: ['sm_hun'], d: '《三命通會》子息引例章以官星為子嗣、煞為偏子或為女，與上兩說又不同，並列備考。' });
  } else {
    R.gender.push({ t: '陽干為男、陰干為女（老師規則）', q: ['sm_f1'], d: `子星${starW}：${YANG_OF[starW]}為男、${YIN_OF[starW]}為女。《三命通會》「如甲乙干則以丙為男丁為女」同此。本站以此為準。` });
    R.gender.push({ t: '食神為男、傷官為女', q: ['yh_lqf', 'sm_f2'], d: `日主${dm}：食神${isYang(dm) ? YANG_OF[starW] : YIN_OF[starW]}為男、傷官${isYang(dm) ? YIN_OF[starW] : YANG_OF[starW]}為女（《淵海子平》六親總論、《三命通會》「或曰」）。` });
    R.gender.push({ t: '傷官為子、食神為女', q: ['yh_f'], d: `《淵海子平》論子息此說與同書六親總論相反，並列備考。` });
  }
  { // 陰陽日時
    const dy = isYang(dm), hy = isYang(hourG);
    const t = dy && hy ? '陽日陽時：男見重' : dy && !hy ? '陽日陰時：先男後女' : !dy && !hy ? '陰日陰時：女見重' : '陰日陽時：先女後男';
    R.gender.push({ t: '《淵海子平》陰陽日時', q: ['yh_yy'], d: `日干${dm}為${dy ? '陽' : '陰'}、時干${hourG}為${hy ? '陽' : '陰'}，${t}。`, fire: t });
  }
  // 子星本身性別統計
  R.starGender = { male: stars.filter(s => s.male).length, female: stars.filter(s => !s.male).length };

  // ---- 五、條件論斷 ----
  const has = k => anyIn(C, [k]);
  const touQ = countIn(C, ['七殺'], 'gan'), touG = countIn(C, ['正官'], 'gan');
  const hourBen = pil[3].hide[0].ss, hourKong = C.kong.includes(hourBr);
  if (male) {
    if (touQ && touG) add({ id: 'hun', title: '官煞相混', kind: 'note', q: ['sm_hun'], how: `天干七殺 ${touQ} 見、正官 ${touG} 見。` });
    else if (touQ) add({ id: 'touq', title: '透煞先招女', kind: 'note', q: ['sm_hun'], how: `天干透七殺 ${touQ} 見（正官未透）。此為《三命通會》之說。` });
    { const sq = C.pil.reduce((a, p, i) => a + (i !== 2 && p.ss === '七殺' ? 1 : 0) + p.hide.reduce((x, h, j) => x + (h.ss === '七殺' ? [.6, .3, .1][j] || 1 : 0), 0), 0), sg = C.pil.reduce((a, p, i) => a + (i !== 2 && p.ss === '正官' ? 1 : 0) + p.hide.reduce((x, h, j) => x + (h.ss === '正官' ? [.6, .3, .1][j] || 1 : 0), 0), 0);
      if (sq + sg > 0) add({ id: 'zhong', title: sq > sg ? '煞重女多' : sg > sq ? '官重多子' : '官煞分數相當', kind: 'note', q: ['sm_zhong'], how: `本站以天干 1、藏干 .6／.3／.1 計：七殺 ${sq.toFixed(1)}、正官 ${sg.toFixed(1)}。` });
      const gz2 = stars.some(s => s.gan) && stars.some(s => !s.gan);
      if (gz2) add({ id: 'dieJian', title: '干支叠見，子女俱多', kind: 'pos', q: ['sm_zhong'], how: '官殺天干、地支皆見。' }); }
    if (hourKong) {
      const isGS = ['七殺', '正官'].includes(hourBen);
      if (isGS) { add({ id: 'kongGS', title: '時落空亡，原是官煞', kind: 'count', q: ['sm_kong'], how: `時支${hourZ}在日柱旬空，本氣${pil[3].hide[0].g}為${hourBen}：「子女亦有二三」。`, n: [2, 3] }); addCount('時落空亡原是官煞', [2, 3], 'kongGS'); }
      else if (!has('七殺') && !has('正官') && !has('傷官')) { const t = ['偏印', '正印'].includes(hourBen) || ['偏印', '正印'].includes(pil[3].ss) ? '印則有女' : ['偏財', '正財'].includes(hourBen) || ['偏財', '正財'].includes(pil[3].ss) ? '財則有子' : null; add({ id: 'kongCY', title: '時落空亡，官煞傷官俱無', kind: 'note', q: ['sm_kong'], how: `時支${hourZ}在日柱旬空，原局官殺、傷官俱無，「帶財印别論」：${t || '時柱無財印，此條不定'}。` }); }
      else add({ id: 'kong', title: '時支空亡', kind: 'neg', q: ['yh_shishang'], how: `時支${hourZ}在日柱旬空（空${C.kong.map(b => ZHI[b]).join('、')}）。` });
    }
    if (pil[3].ss === '七殺' || hourBen === '七殺') add({ id: 'shisha', title: '時上七煞', kind: 'note', q: ['sm_shisha'], how: `時柱見七殺（${pil[3].ss === '七殺' ? '時干' + hourG : ''}${pil[3].ss === '七殺' && hourBen === '七殺' ? '、' : ''}${hourBen === '七殺' ? '時支本氣' + pil[3].hide[0].g : ''}）。「太旺」「制伏太過」須看全局，本站不代判；子星五行分數佔 ${(R.strength.pct * 100).toFixed(0)}%。` });
    if (has('七殺') && has('食神')) add({ id: 'shazhi', title: '七煞有制乃多兒', kind: 'pos', q: ['sm_fu3'], how: '原局七殺與食神並見。' });
    if (has('傷官') && (has('偏財') || has('正財'))) add({ id: 'shangcai', title: '傷官見財而有子', kind: 'pos', q: ['sm_fu3'], how: '原局傷官與財星並見。' });
    if (has('正官') && R.strength.ws === '旺') add({ id: 'wangguan', title: '男旺官子必多', kind: 'pos', q: ['sm_fu4', 'sm_fu2'], how: `原局見正官，${starW}當令（月支${pil[1].zhi}，旺）。` });
    if (countIn(C, ['七殺'], 'ben') >= 2) add({ id: 'pianguan', title: '偏官叠見', kind: 'note', q: ['sm_fu6'], how: `天干與地支本氣七殺共 ${countIn(C, ['七殺'], 'ben')} 見：「多生女子少生男」。` });
    if (has('七殺') && R.strength.ws === '旺') add({ id: 'shaqiang', title: '七煞强而女多男少', kind: 'note', q: ['sm_fu1'], how: `原局見七殺，${starW}當令（旺）。本站以「當令」讀「强」。` });
    const yinW = WX[(WX.indexOf(dw) + 4) % 5];
    if (wangXiangOf(pil[1].br, yinW) === '旺' && anyIn(C, ['正印', '偏印'])) add({ id: 'yinwang', title: '印綬旺而子少', kind: 'neg', q: ['sm_fu1'], how: `印星${yinW}當令（月支${pil[1].zhi}，旺）。本站以「當令」讀「旺」。` });
    const ssCnt = countIn(C, ['食神', '傷官'], 'ben');
    if (ssCnt >= 3) add({ id: 'sfm', title: '傷官食神多', kind: 'neg', q: ['sf_m', 'yh_lqss'], how: `天干與地支本氣食傷共 ${ssCnt} 見（本站以 3 見以上為「多」）。` });
    if (A.lev === '身弱' && pct(starW) >= Math.max(...WX.map(pct)) - 1e-9) add({ id: 'sfz', title: '官殺太重，剋制日主', kind: anyIn(C, ['食神', '傷官']) ? 'note' : 'neg', q: ['sf_m'], how: `八字站引擎判身弱，官殺${starW}為五行最多。原局${anyIn(C, ['食神', '傷官']) ? '有' : '無'}食傷制之：「必須食神傷官，制去官殺，方能生子也」。` });
    if (A.lev === '身強' || A.lev === '偏強' || A.lev === '偏弱' || A.lev === '身弱') { const role = A.role(starW); add({ id: 'dts', title: '《滴天髓》喜神看與殺相聯', kind: role === '用' || role === '喜' ? 'pos' : role === '忌' ? 'neg' : 'note', q: ['dts_m', 'dts_mz'], how: `八字站引擎：${A.method}，用神${A.yong}、喜神${A.xi}，忌${A.ji.join('、')}。官殺${starW}為${ROLE[role]}。${role === '用' || role === '喜' ? '「喜神即官星，其子賢俊」。' : role === '忌' ? '「否則無子，或不肖」。' : '非喜非忌，原注未明。'}${!anyIn(C, ['七殺', '正官']) ? '原局無官星，「無官星者以財取論」。' : ''}` }); }
    // 子平真詮 時干有用
    { const hw = ganWx(hourG), role = A.role(hw), useful = role === '用' || role === '喜', cls = SW(st);
      const out = useful ? (cls === 'sj' ? '「即使時逢死絕，亦主子貴，但不甚繁耳」' : cls === 'sw' ? '「若又逢生旺，則麟兒繞膝」' : '時干有用，時支非生旺亦非死絕，原文未逐一言') : role === '忌' ? (cls === 'sw' ? '「若時幹不好，子透破局，即逢生旺，難為子息」' : cls === 'sj' ? '「若又死絕，無所望矣」' : '時干為忌，時支非生旺亦非死絕，原文未逐一言') : '時干非喜非忌，原文未言';
      add({ id: 'shigan', title: '《子平真詮》時干有用', kind: useful ? 'pos' : role === '忌' ? 'neg' : 'note', q: ['zp_shigan', 'xu_shigan'], how: `時干${hourG}（${pil[3].ss}，${hw}）為八字站引擎所判之${ROLE[role]}；時支對子星為「${STAGES[st]}」（${SW_NAME[cls]}）。${out}。` }); }
  } else {
    if (anyIn(C, ['正印', '偏印'])) add({ id: 'fyin', title: '見印綬梟神', kind: 'neg', q: ['yh_f'], how: `原局見${['正印', '偏印'].filter(k => anyIn(C, [k])).join('、')}：「若見印綬、梟神，難得子也」。` });
    const ssCnt = countIn(C, ['食神', '傷官'], 'ben');
    if (ssCnt >= 3) add({ id: 'sff', title: '女命食神傷官多', kind: anyIn(C, ['正印', '偏印']) ? 'note' : 'neg', q: ['sf_f'], how: `天干與地支本氣食傷共 ${ssCnt} 見（本站以 3 見以上為「多」）。原局${anyIn(C, ['正印', '偏印']) ? '有' : '無'}印星：「又喜印星損其子，養其精，方能生子也」。` });
    else if (ssCnt <= 1 && anyIn(C, ['正印', '偏印'])) add({ id: 'sff2', title: '女命食傷少而兼印', kind: 'neg', q: ['sf_f'], how: `天干與地支本氣食傷 ${ssCnt} 見（本站以 1 見以下為「少」），原局有印星。` });
    if (pil[3].ss === '傷官' || hourBen === '傷官') add({ id: 'shishangf', title: '時上傷官', kind: 'note', q: ['yh_shishang'], how: '時柱見傷官。《淵海子平》此句在論子息總說，未分男女；女命以傷官為子星，此條如何用，來源待核。', pending: true });
    if (hourKong) add({ id: 'kongf', title: '時支空亡', kind: 'neg', q: ['yh_shishang'], how: `時支${hourZ}在日柱旬空。` });
    { const role = A.role(starW); const sh = anyIn(C, ['食神']) ? stars.filter(s => s.ss === '食神') : [];
      const sub = (R.strength.ws === '旺' && countIn(C, ['傷官'], 'ben') >= 2) ? '傷官太旺，「以印為子」' : !sh.length ? '食神不見，「食神無氣，以比肩為子」' : null;
      add({ id: 'dtsf', title: '《滴天髓》女命食神', kind: role === '用' || role === '喜' ? 'pos' : role === '忌' ? 'neg' : 'note', q: ['dts_f'], how: `食傷${starW}為八字站引擎所判之${ROLE[role]}。${sub ? '本盤' + sub + '（本站以當令且傷官兩見以上讀「太旺」，以原局不見食神讀「無氣」）。' : '原局見食神' + (sh.length ? '（' + sh.map(s => s.where).join('、') + '）' : '') + '。'}` }); }
  }
  // 男女共用
  { const zs = pil.map(p => p.zhi).join(''); const four = ['辰', '戌', '丑', '未'].filter(z => zs.includes(z));
    if (four.length === 4) add({ id: 'siyu', title: '辰戌丑未四字全', kind: 'neg', q: ['sf_4'], how: '四柱地支辰戌丑未俱全。' });
    else if (four.length >= 2) add({ id: 'siyu2', title: `四庫見 ${four.length} 字`, kind: 'note', q: ['sf_4'], how: `四柱地支見${four.join('、')}，「若止犯二字，亦不畏也」。` }); }
  if (st === 8) add({ id: 'mu', title: '子星入墓', kind: 'neg', q: ['sf_mu'], how: `時支${hourZ}為子星${yangG}之墓。` });
  if (SW(st) === 'sj' || ['傷官', '七殺'].includes(pil[3].ss)) add({ id: 'shao', title: '時臨死絕傷煞之鄉', kind: 'neg', q: ['sm2_shao', 'sm2_shi'], how: `${SW(st) === 'sj' ? `時支${hourZ}對子星為「${STAGES[st]}」` : ''}${SW(st) === 'sj' && ['傷官', '七殺'].includes(pil[3].ss) ? '；' : ''}${['傷官', '七殺'].includes(pil[3].ss) ? `時干${hourG}為${pil[3].ss}` : ''}：「言少子之斷」。` });
  if (male && (pil[3].ss === '傷官' || hourBen === '傷官')) add({ id: 'shishang', title: '時上傷官', kind: 'neg', q: ['yh_shishang'], how: '時柱見傷官。' });
  // ---- 六、大運、流年 ----
  R.timing = timing(C, R, st);
  // ---- 彙整 ----
  const nums = R.counts.filter(c => c.lo != null);
  R.range = nums.length ? { lo: Math.min(...nums.map(c => c.lo)), hi: Math.max(...nums.map(c => c.hi)) } : null;
  if (nums.length) { const all = []; nums.forEach(c => { for (let k = c.lo; k <= c.hi; k++) all.push(k); }); const freq = {}; all.forEach(k => freq[k] = (freq[k] || 0) + 1); R.freq = Object.entries(freq).map(([k, v]) => [+k, v]).sort((a, b) => a[0] - b[0]); }
  return R;
}
const fmtN = x => Number.isInteger(x) ? String(x) : x.toFixed(1);

/** 大運與流年 */
export function timing(C, R, st) {
  const { P, pil, dm, dw, sex } = C, male = sex !== 'f';
  const yearYang = P.year.stem % 2 === 0, fwd = (yearYang && male) || (!yearYang && !male);
  const toMs = s => s ? Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10), +s.slice(11, 13), +s.slice(14, 16)) : null;
  const prev = toMs(P.jie.lmt), next = toMs(P.jie.nextLmt);
  const diffDays = fwd ? (next != null ? (next - C.wall) / D : 15) : (prev != null ? (C.wall - prev) / D : 15);
  const startY = Math.max(0, diffDays / 3), by = new Date(C.wall).getUTCFullYear();
  const mi = idx60(P.month.stem, P.month.br);
  const starW = R.starW, yg = YANG_OF[starW];
  const noStar = !anyIn(C, R.starKinds), hourSW = SW(st) === 'sw';
  const yun = [];
  for (let i = 1; i <= 8; i++) {
    const k = ((mi + (fwd ? i : -i)) % 60 + 60) % 60, g = GAN[k % 10], z = ZHI[k % 12];
    const s = stageOf(yg, k % 12);
    const age = startY + (i - 1) * 10;
    yun.push({ gz: g + z, ss: shiShen(dm, g), zss: shiShen(dm, hide(z)[0]), stage: STAGES[s], wang: [3, 4].includes(s), age: Math.floor(age), year: by + Math.floor(age) });
  }
  const yunNote = male ? (noStar && !hourSW ? '本盤原局無官殺，時支對子星亦非生旺，合「八字中若無子星，時上又不生旺」，大運走官殺臨官、帝旺之鄉者標「官殺旺鄉」。' : `本盤${noStar ? '原局無官殺' : '原局有官殺'}、時支對子星${hourSW ? '生旺' : '非生旺'}，不合此條前提；「官殺旺鄉」標記僅供對照。`) : '女命大運：以下標出食傷（子星）臨官、帝旺之運，原文此條就男命官殺而言，女命套用來源待核。';
  // 流年（20～50 歲）
  const years = [];
  for (let Y = by + 19; Y <= by + 49; Y++) {
    const yi = ((Y - 4) % 60 + 60) % 60, g = GAN[yi % 10], z = ZHI[yi % 12], ss = shiShen(dm, g);
    const he = ganRel(g, dm).some(r => r.startsWith('合')) && zhiRel(z, pil[2].zhi).some(r => r.startsWith('六合'));
    const liuhe = zhiRel(z, pil[2].zhi).some(r => r.startsWith('六合'));
    const sh = sanHe(pil.map(p => p.zhi).concat(z)).filter(x => !sanHe(pil.map(p => p.zhi)).includes(x));
    years.push({ Y, gz: g + z, ss, he, liuhe, sanhe: sh.length > 0 });
  }
  const pick = f => years.filter(f).map(y => `${y.Y}${y.gz}`);
  const grp = s => ({ 食神: '食傷', 傷官: '食傷', 正財: '財', 偏財: '財', 七殺: '官殺', 正官: '官殺', 正印: '印', 偏印: '印', 比肩: '比劫', 劫財: '比劫' }[s]);
  let liunian;
  if (male) liunian = [
    { c: '官煞重：傷官食神年', ys: pick(y => grp(y.ss) === '食傷') },
    { c: '官煞輕：財年或官煞年', ys: pick(y => grp(y.ss) === '財' || grp(y.ss) === '官殺') },
    { c: '官煞輕、食傷重：偏印正印年', ys: pick(y => grp(y.ss) === '印') },
    { c: '官煞重而財又多：比刼羊刃或天地合、三合、六合年', ys: pick(y => grp(y.ss) === '比劫' || y.he || y.liuhe || y.sanhe) },
  ];
  else liunian = anyIn(C, ['傷官']) && anyIn(C, ['偏印']) ? [{ c: '女命傷官梟印：行財官（財年、官殺年）', ys: pick(y => grp(y.ss) === '財' || grp(y.ss) === '官殺') }] : [];
  return { fwd, startY, yun, yunNote, years, liunian, male, noStar, hourSW };
}

/** 時辰不確定：十三個時段（早子、丑…亥、晚子）的時柱與歌訣結果 */
export function allHours(wall0, lon, sex, yw) {
  const d = new Date(wall0), base = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const hrs = [0, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23].map(h => h === 0 ? 30 : h * 60 + 30);
  return hrs.map((min, i) => {
    const C = buildChart(base + min * 6e4, lon, sex), R = analyzeZixi(C, { yw });
    const T = R.teacher;
    return { t: T.map(t => ({ w: t.w, g: t.g, stage: t.stage, line: t.line, n: t.n, unset: !!t.unset })), label: i === 0 ? '早子時（0–1 時）' : i === 12 ? '晚子時（23–24 時）' : ZHI[(i) % 12] + '時（' + (2 * i - 1) + '–' + (2 * i + 1) + ' 時）', hour: C.P.hour.gz, yy: R.gender.find(g => g.fire)?.fire, range: R.range, kong: C.kong.includes(C.P.hour.br) };
  });
}
export { gz, GAN, ZHI, STAGES };
