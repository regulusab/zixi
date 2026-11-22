import { fmt, GAN, ZHI } from './calendar.js';
import { buildChart, analyzeZixi, allHours, stageOf, CS_START, STAGES, YANG_OF, YIN_OF, SW, nayinName } from './engine.js';
import { Q, SRC, shown, POEM_USER, POEM_LINES, POEM_VARIANTS } from './texts.js';
import { CITIES } from './cities.js';
import { SOURCES } from './sources.js';

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const p2 = n => String(n).padStart(2, '0');
const nTxt = n => !n ? '原文未給數目' : n[0] === n[1] ? `${n[0]} 子` : `${n[0]}～${n[1]} 子`;

// ---- 表單 ----
$('#city').innerHTML = CITIES.map(([g, cs]) => `<optgroup label="${esc(g)}">${cs.map(c => `<option value="${c[2]}" data-n="${esc(c[0])}">${esc(c[0])}（${c[2] >= 0 ? '東經' : '西經'} ${Math.abs(c[2]).toFixed(2)}°）</option>`).join('')}</optgroup>`).join('') + '<option value="custom" data-n="自訂經度">自訂經度</option>';
$('#city').value = '121.5654'; $('#lon').value = '121.5654';
$('#city').onchange = () => { if ($('#city').value !== 'custom') $('#lon').value = $('#city').value; };
$('#lon').oninput = () => { const o = [...$('#city').options].find(o => o.value === $('#lon').value); $('#city').value = o ? o.value : 'custom'; };
$('#unk').onchange = () => { $('#time').disabled = $('#unk').checked; };

$('#go').onclick = () => {
  const st = { d: ($('#date').value || '').replace(/\D/g, ''), t: ($('#time').value || '').replace(/\D/g, '').slice(0, 4), u: $('#unk').checked ? '1' : '0', g: ($$('input[name=g]').find(r => r.checked) || {}).value || 'm', lon: $('#lon').value, p: ($('#city').selectedOptions[0] || {}).dataset?.n || '' };
  history.replaceState(null, '', '?' + new URLSearchParams(st).toString());
  show(st);
};
function stateFromUrl() { const u = new URLSearchParams(location.search); if (!u.get('d')) return null; return { d: u.get('d'), t: u.get('t') || '', u: u.get('u') || '0', g: u.get('g') || 'm', lon: u.get('lon') || '121.5654', p: u.get('p') || '' }; }

export function readState(st) {
  const warn = [];
  let lon = parseFloat(st.lon); if (!isFinite(lon) || lon < -180 || lon > 180) { lon = 121.5654; warn.push('經度無效，改用台北（東經 121.5654°）'); }
  let m = /^(\d{4})(\d\d)(\d\d)$/.exec(st.d || ''), y, mo, da;
  if (m) { y = +m[1]; mo = +m[2]; da = +m[3]; const t = new Date(Date.UTC(y, mo - 1, da)); if (t.getUTCMonth() !== mo - 1 || y < 1800 || y > 2200) m = null; }
  if (!m) { y = 1990; mo = 1; da = 1; warn.push('出生日期不完整或超出 1800–2200 年，暫以 1990-01-01 排盤'); }
  let unk = st.u === '1', h = 12, mi = 0; const tm = /^(\d\d)(\d\d)$/.exec(st.t || '');
  if (tm && +tm[1] < 24 && +tm[2] < 60) { h = +tm[1]; mi = +tm[2]; } else if (!unk) { unk = true; warn.push('未填出生時間，改列每個時辰的結果'); }
  if (unk && !tm) { h = 12; mi = 0; }
  return { wall: Date.UTC(y, mo - 1, da, h, mi), lon, sex: st.g === 'f' ? 'f' : 'm', unk, warn, p: st.p };
}

function q(id) { const x = Q[id]; if (!x) return ''; const s = SRC[x.s]; return `<blockquote>${esc(shown(id))}${x.note ? `<span class="qn">（${esc(x.note)}）</span>` : ''}<cite>${esc(s.book)}${esc(x.ch)}（<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.site)}</a>）</cite></blockquote>`; }
const KN = { pos: '有利', neg: '不利', note: '參考', count: '數目', table: '對照' };

function show(st) {
  const S = readState(st);
  const C = buildChart(S.wall, S.lon, S.sex), R = analyzeZixi(C);
  $('#result').innerHTML = renderResult(S, C, R);
  $('#result').hidden = false;
  $('#result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  $('#copyLink').onclick = copyLink; $('#printBtn').onclick = () => window.print(); $('#pdfBtn').onclick = downloadPdf;
  $('#again').onclick = () => { history.replaceState(null, '', location.pathname); $('#result').hidden = true; $('#form').scrollIntoView({ behavior: 'smooth' }); };
}

export function renderResult(S, C, R) {
  const P = C.P, male = R.male, lon = S.lon;
  let h = `<div class="card" id="sheet">`;
  if (S.warn.length) h += `<p class="hint">說明：${S.warn.map(esc).join('；')}</p>`;
  h += `<h2>命盤</h2><dl class="meta"><dt>性別</dt><dd>${male ? '男命' : '女命'}</dd>`;
  h += `<dt>出生</dt><dd>${S.unk ? fmt(P.wall).slice(0, 10) + '（時辰不確定，詳表暫以午時排）' : fmt(P.wall) + '（地方平時）'}</dd><dt>地點</dt><dd>${esc(S.p || '')} ${lon >= 0 ? '東經' : '西經'} ${Math.abs(lon)}°</dd>`;
  h += `<dt>節氣</dt><dd>${P.jie.name} ${P.jie.lmt || ''}（出生地地方平時）</dd>`;
  h += `<dt>日柱</dt><dd>${P.day.gz}${P.shift ? `（東經 70° 以西日柱干支進一位，日期不動；當地曆日干支為${P.day.rawGz}）` : ''}</dd>`;
  h += `<dt>旬空</dt><dd>空${C.kong.map(b => ZHI[b]).join('、')}${C.kong.includes(P.hour.br) ? '（時支落空）' : ''}</dd></dl>`;
  h += `<table class="bz"><thead><tr><th></th><th>年柱</th><th>月柱</th><th>日柱</th><th>時柱</th></tr></thead><tbody>`;
  h += `<tr><th>十神</th>${C.pil.map(p => `<td>${p.ss}</td>`).join('')}</tr>`;
  h += `<tr><th>天干</th>${C.pil.map(p => `<td class="g">${p.gan}</td>`).join('')}</tr><tr><th>地支</th>${C.pil.map(p => `<td class="g">${p.zhi}</td>`).join('')}</tr>`;
  h += `<tr><th>藏干</th>${C.pil.map(p => `<td class="hd">${p.hide.map(x => `${x.g}<small>${x.ss}</small>`).join('<br>')}</td>`).join('')}</tr></tbody></table>`;
  if (P.lateZi) h += `<p class="small">23 時起為子時，時干依次日日干（晚子時），日柱不換。</p>`;
  // 子女星
  const SR = R.strength;
  h += `<h2>子女星</h2><p>${male ? `男命以剋我者（官殺）為子：日主${C.dm}（${C.dw}）之子星為<b>${R.starW}</b>（${YANG_OF[R.starW]}、${YIN_OF[R.starW]}）。` : `女命以我生者（食傷）為子：日主${C.dm}（${C.dw}）之子星為<b>${R.starW}</b>（${YANG_OF[R.starW]}、${YIN_OF[R.starW]}）。`}時柱為子息宮。</p>`;
  h += q(male ? 'xu_star' : 'sm_f1') + q('sm_shi');
  if (R.stars.length) h += `<table class="st"><thead><tr><th>位置</th><th>干</th><th>十神</th><th>男女</th><th>坐支十二運</th><th>月令</th></tr></thead><tbody>${R.stars.map(s => `<tr><td>${s.where}</td><td>${s.g}</td><td>${s.ss}</td><td>${s.male ? '男' : '女'}</td><td>${s.seat}・${STAGES[s.stage]}</td><td>${s.ws}</td></tr>`).join('')}</tbody></table>`;
  else h += `<p>原局天干、藏干皆不見${male ? '官殺' : '食傷'}。</p>`;
  h += `<p class="small">男女依陽干為男、陰干為女${male ? '（老師確認，《子平真詮》《三命通會》同）' : '（老師確認，《三命通會》同）'}；十二運以該干本身陰陽起（陽順陰逆），月令旺相休囚死依《三命通會》卷二。強弱參考：子星${R.starW}五行分數佔全盤 ${(SR.pct * 100).toFixed(0)}%（八字站計分法），月令${SR.ws}；天干透 ${SR.tou} 處、地支本氣 ${SR.ben} 處；八字站引擎判日主${SR.lev}、格局${SR.geName}、用神${SR.yong}、喜神${SR.xi}。</p>`;
  // 數目：老師確認三法
  const TM = R.teacher;
  h += `<h2>子女數目<span class="ok">老師確認</span></h2><p class="small">老師規則：以十二長生取子數歌訣斷之，三法並列。取數只用歌訣原數，不做「旺相倍加、休囚減半」與沖空折減；月令旺衰只論子緣厚薄。歌訣用老師所給文字（同《子平真詮》〈論妻子〉）。</p>`;
  h += `<div class="scroll"><table class="tm"><thead><tr><th></th>${TM.map(t => `<th>${esc(t.title.split('：')[0])}</th>`).join('')}</tr></thead><tbody>`;
  h += `<tr><th>取用</th>${TM.map(t => `<td>${esc(t.title.split('：')[1])}</td>`).join('')}</tr>`;
  h += `<tr><th>五行／起長生之干</th>${TM.map(t => `<td>${t.w}／<b>${t.g}</b>${t.id === 't2' ? `<small>（時干${t.hourG}）</small>` : ''}</td>`).join('')}</tr>`;
  h += `<tr><th>時支${C.pil[3].zhi}十二運</th>${TM.map(t => `<td class="g2">${t.stage}</td>`).join('')}</tr>`;
  h += `<tr><th>歌句</th>${TM.map(t => `<td>${esc(t.line)}</td>`).join('')}</tr>`;
  h += `<tr class="hl"><th>原數</th>${TM.map(t => `<td><b>${nTxt(t.n)}</b></td>`).join('')}</tr>`;
  h += `<tr><th>男女</th>${TM.map(t => `<td>${t.son}陽為子、${t.dau}陰為女</td>`).join('')}</tr>`;
  h += `<tr><th>月令${C.pil[1].zhi}／子緣</th>${TM.map(t => `<td>${t.ws}・子緣<b>${t.ziyuan}</b></td>`).join('')}</tr></tbody></table></div>`;
  h += `<ol class="ms">${TM.map(t => `<li class="m"><div class="mt">${esc(t.title)}<span class="ok">老師確認</span></div><div class="d">${esc(t.why)}</div><div class="fire">「${esc(t.stage)}」：歌句「${esc(t.line)}」→ <b>${nTxt(t.n)}</b></div>${t.extra ? `<div class="small">${esc(t.extra)}</div>` : ''}${t.cs ? `<div class="small">${esc(t.cs)}</div>` : ''}${t.note ? `<div class="small">${esc(t.note)}</div>` : ''}${t.tu ? `<div class="small">${esc(t.tu)}</div>` : ''}<div class="small">月令${C.pil[1].zhi}，${t.w}為「${t.ws}」，子緣${t.ziyuan}（只論緣分厚薄，不改子數）。</div>${t.id === 't1' ? q('zp_intro') + q('zp_shizhi') : t.id === 't2' ? q('zp_shigan') + q('zp_yang') : q('qt_yong')}</li>`).join('')}</ol>`;
  h += `<p class="small">子緣厚薄為本站對應：月令旺、相為厚，休為中，囚、死為薄（旺相休囚死依《三命通會》卷二）。</p>`;
  // 彙整
  h += `<div class="sum"><div class="h">本站彙整（三法）：${R.range ? (R.range.lo === R.range.hi ? R.range.lo : R.range.lo + '～' + R.range.hi) + ' 子' : '三法皆未給數目'}</div>`;
  h += `<div class="small">把老師確認三法的原數並列，取最少至最多；這是本站的統計，不是古籍原文。</div>`;
  h += `<table class="cnt"><tbody>${TM.map(t => `<tr><td>${esc(t.title)}（${t.stage}）</td><td>${t.n ? (t.n[0] === t.n[1] ? t.n[0] : t.n[0] + '～' + t.n[1]) : '原句未給數目'}</td></tr>`).join('')}</tbody></table></div>`;
  // 子女男女（老師規則一）
  h += `<h2>子女男女<span class="ok">老師確認</span></h2><p>陽為男，陰為女：${male ? '官殺' : '食傷'}之甲丙戊庚壬為陽為子，乙丁己辛癸為陰為女。本盤子星${R.starW}：<b>${YANG_OF[R.starW]}為子、${YIN_OF[R.starW]}為女</b>。原局${male ? '官殺' : '食傷'}：陽干（子）${R.starGender.male} 見、陰干（女）${R.starGender.female} 見${R.stars.length ? '（' + R.stars.map(s => `${s.where}${s.g}${s.male ? '子' : '女'}`).join('、') + '）' : ''}。</p>${q(male ? 'zp_yang' : 'sm_f1')}`;
  // 參考
  const counts = R.methods.filter(m => m.kind === 'count');
  h += `<h2 class="ref">參考：其他古籍數法（不入彙整）</h2><p class="small">以下各法立論與老師三法不同，只錄原文與算法供對照，數目不計入上方彙整。</p>`;
  h += `<ol class="ms ref">${counts.map(m => renderMethod(m)).join('')}</ol>`;
  // 男女
  h += `<h3>參考：其他男女之說</h3><ul class="rules">${R.gender.map(g => `<li class="note"><div><span class="t">${esc(g.t)}</span></div><div class="d">${esc(g.d)}</div>${g.q.map(q).join('')}</li>`).join('')}</ul>`;
  h += `<p class="small">原局子星：男 ${R.starGender.male} 見、女 ${R.starGender.female} 見（陽干男、陰干女）。</p>`;
  // 條件
  const conds = R.methods.filter(m => !['count', 'table'].includes(m.kind));
  h += `<h2 class="ref">參考：其他論斷條件</h2><ul class="rules">${conds.map(m => `<li class="${m.kind}"><div><span class="k ${m.kind}">${KN[m.kind]}</span><span class="t">${esc(m.title)}</span>${m.pending ? '<span class="pd">來源待核</span>' : ''}</div><div class="d">${esc(m.how)}</div>${m.q.map(q).join('')}</li>`).join('')}</ul>`;
  // 星學大成
  const xx = R.methods.find(m => m.id === 'xx');
  h += `<h2 class="ref">參考：《星學大成》納音法</h2><p class="d">${esc(xx.how)}</p><div class="scroll"><table class="xx"><thead><tr><th>男女宫在</th>${ZHI.split('').map(z => `<th>${z}</th>`).join('')}</tr></thead><tbody>${xx.rows.map(r => `<tr><th>${esc(r.name)}</th>${r.cells.map(c => `<td>${c.stage}<br><small>${c.n ? (c.n[0] === c.n[1] ? c.n[0] : c.n[0] + '～' + c.n[1]) : '—'}</small></td>`).join('')}</tr>`).join('')}</tbody></table></div>${xx.q.map(q).join('')}`;
  // 時機
  const T = R.timing;
  h += `<h2>大運、流年提示</h2><p>大運${T.fwd ? '順' : '逆'}行（${male ? '男' : '女'}命、年干${GAN[P.year.stem]}${P.year.stem % 2 === 0 ? '陽' : '陰'}），約 ${T.startY.toFixed(1)} 歲起運（三日折一年）。</p>${q('sm2_yun')}${q('sm2_3r')}`;
  h += `<div class="scroll"><table class="yun"><thead><tr><th>大運</th><th>約起歲／年</th><th>天干十神</th><th>地支本氣</th><th>子星${YANG_OF[R.starW]}十二運</th></tr></thead><tbody>${T.yun.map(y => `<tr class="${y.wang ? 'hl' : ''}"><td>${y.gz}</td><td>${y.age}／${y.year}</td><td>${y.ss}</td><td>${y.zss}</td><td>${y.stage}${y.wang ? (male ? '・官殺旺鄉' : '・食傷旺鄉') : ''}</td></tr>`).join('')}</tbody></table></div>`;
  h += `<p class="small">${esc(T.yunNote)}</p>${q('yh_yun1')}${male ? q('yh_yun2') : ''}`;
  if (T.liunian.length) { h += `<h3>${male ? '《三命通會》生子歲運（20～50 歲流年）' : '《三命通會》女命傷官梟印行財官（20～50 歲流年）'}</h3><p class="small">官煞輕重原文未給量法，本站不代判（子星五行分數佔 ${(SR.pct * 100).toFixed(0)}%、月令${SR.ws}，供讀者自定）；四種情形並列。天地合、六合以日柱論，三合以流年支補成原局三合論，為本站讀法。</p><ul class="ln">${T.liunian.map(x => `<li><b>${esc(x.c)}</b>：${x.ys.length ? x.ys.join('、') : '（此範圍內無）'}</li>`).join('')}</ul>${q(male ? 'sm_year' : 'sm_fu5')}`; }
  else if (!male) h += `<p class="small">女命流年：原局未同見傷官與梟印，《三命通會》「女命傷官梟印行財官亦堪决其有子」不發動；其他流年規則未見古籍明文，不列。</p>`;
  // 不確定時辰
  if (S.unk) {
    const H = allHours(C.wall, lon, C.sex);
    h += `<h2>時辰不確定：各時辰對照</h2><p class="small">每個時段依老師三法重算（第一法子星五行不變；第二法時干、第三法用神隨時柱而變）。</p><div class="scroll"><table class="hrs"><thead><tr><th>時辰</th><th>時柱</th><th>第一法</th><th>第二法</th><th>第三法</th><th>三法彙整</th></tr></thead><tbody>${H.map(x => `<tr><td>${x.label}</td><td>${x.hour}</td>${x.t.map(t => `<td>${t.g}・${t.stage}<br><small>${esc(t.line)}</small><br><b>${nTxt(t.n)}</b></td>`).join('')}<td>${x.range ? (x.range.lo === x.range.hi ? x.range.lo : x.range.lo + '～' + x.range.hi) + ' 子' : '—'}</td></tr>`).join('')}</tbody></table></div><p class="small">晚子時時干依次日日干，日柱不換。</p>`;
  }
  h += `<p class="small">內容僅供參考。歌訣與引文中依遮蔽規定不寫的句子，以「……」標示。</p></div>`;
  h += `<div class="actions"><button type="button" id="copyLink">複製分享連結</button><button type="button" id="pdfBtn">下載 PDF</button><button type="button" id="printBtn">列印</button><button type="button" id="again" class="pri">重新輸入</button></div>`;
  return h;
}
function renderMethod(m) {
  let h = `<li class="m"><div class="mt">${esc(m.title)}${m.pending ? '<span class="pd">來源待核</span>' : ''}</div><div class="d">${esc(m.how)}</div>`;
  if (m.reads) h += `<ul class="reads">${m.reads.map(r => `<li>${esc(r.name)}：「${esc(r.stage)}」，歌句「${esc(r.line)}」，<b>${nTxt(r.n)}</b></li>`).join('')}</ul>`;
  else if (m.line) h += `<div class="fire">「${esc(m.stage)}」：歌句「${esc(m.line)}」→ <b>${nTxt(m.n)}</b></div>`;
  else if (m.n) h += `<div class="fire">→ <b>${nTxt(m.n)}</b></div>`;
  if (m.extra) h += `<div class="small">${esc(m.extra)}</div>`;
  if (m.alt) h += `<div class="small">${esc(m.alt)}</div>`;
  if (m.tu) h += `<div class="small">${esc(m.tu)}</div>`;
  return h + m.q.map(q).join('') + `</li>`;
}

// ---- 歌訣區（靜態）----
function renderPoem() {
  let h = `<h3>老師所給版本</h3><p class="poem">${esc(POEM_USER)}</p>`;
  h += `<p class="small">出處：清・沈孝瞻《子平真詮》〈論妻子〉所引「長生沐浴之歌」，老師所給文字與該篇所引相同（網頁本「郞」作「郎」、「爲」作「為」）。同一歌訣又見《淵海子平》卷三〈論子息〉（宋・徐升編）及明・萬民英《星學大成》卷二〈論納音定子息歌〉，三本文字不同，取用之星亦不同。網路常說出自《三命通會》，但維基文庫四庫全書本《三命通會》卷七〈子息引例章〉未見此歌，只有「假甲乙日用金為嗣金旺則四九之子合數」；萬民英另著《星學大成》則有之。</p>`;
  h += q('zp_intro');
  h += `<h3>各本異文</h3><div class="scroll"><table class="var"><thead><tr><th>十二運</th><th>《子平真詮》（老師版本）</th><th>《淵海子平》論子息</th><th>《星學大成》論納音定子息歌</th></tr></thead><tbody>${POEM_VARIANTS.map(r => `<tr><th>${r[0]}</th><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td>${esc(r[3])}</td></tr>`).join('')}</tbody></table></div>`;
  h += `<p class="small">另有網路錄本作「除非養取他人子」「胎中頭產有姑娘」「男女宮中仔細詳」（東里書齋《子平真詮》繁體本，搜尋摘錄所見，原網頁未能開啟核對，來源待核）。</p>`;
  h += `<h3>各本取星與數法</h3><ul class="src"><li><b>《子平真詮》</b>：男命以官煞為子星，時支為子息宮；「長生論法，用陽而不用陰」，甲乙日一律用庚金之長生（巳）順數，不用辛金逆數；看時支落在庚金何宮，定子數多寡，再以時干配之。</li><li><b>《淵海子平》</b>：「七殺者，子也」，舉「甲子之日、甲子之時，庚死於子」為例；陽日之七殺為陽干，數法與上同；陰日（如乙）之七殺為陰干（辛），原書未明言如何起長生，本站並列「陰干逆行」與「五行長生」兩讀。</li><li><b>《星學大成》</b>：取年命納音「尅我者」（又云「我生者」）為子孫，自其長生順數至星命十二宮之「男女宫」。</li><li><b>女命</b>：古籍未見以此歌論女命之明例；老師確認女命以食傷五行在時支的十二長生論子數，本站以食傷五行之陽干起長生，數至時支。</li><li><b>老師確認三法</b>：一、男命官殺／女命食傷五行；二、時干；三、最旺的用神，各在時支的十二長生，取歌訣原數，三法並列，不做倍加、減半、沖空折減。</li></ul>`;
  h += q('zp_yang') + q('xu_yang') + q('yh_poem') + q('xx_note');
  h += `<h3>十二運與子數對照</h3><p class="small">老師確認三法用「子平真詮（老師版本）」一欄的原數。</p><div class="scroll"><table class="map"><thead><tr><th>十二運</th><th>子平真詮</th><th>淵海子平</th><th>星學大成</th></tr></thead><tbody>${STAGES.map((s, i) => `<tr><th>${s}</th>${['zp', 'yh', 'xx'].map(k => { const L = POEM_LINES[k][i]; return `<td>${esc(L.l)}<br><b>${nTxt(L.n)}</b>${L.alt ? '<br><small>「中旬半」只錄原文，不減半</small>' : ''}${L.girl ? '<br><small>頭胎為女</small>' : ''}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`;
  h += `<p class="small">遮蔽：墓位一句在命盤結果中不寫；「養中三子只留一（二）」本站只列數目 1～3（2～3），不寫去留。徐樂吾評註以「中旬半」為「司令之權已退」而減其半；老師規定取數只用原數，長生取四子，評註只錄文字。</p>${q('xu_poem')}${q('xu_shuo')}`;
  // 十干十二長生表
  h += `<h3>十干十二長生表</h3><div class="scroll"><table class="cs"><thead><tr><th></th>${ZHI.split('').map(z => `<th>${z}</th>`).join('')}</tr></thead><tbody>${GAN.split('').map(g => `<tr><th>${g}</th>${ZHI.split('').map((z, b) => { const s = stageOf(g, b); return `<td class="${s === 0 ? 'cs0' : s === 7 ? 'cs7' : ''}">${STAGES[s]}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div><p class="small">陽干順行、陰干逆行。依《三命通會》卷二〈論天干隂陽生死〉：甲長生於亥、死於午；乙生於午、死於亥；丙戊生於寅、死於酉；丁己生於酉、死於寅；庚生於巳、死於子；辛生於子、死於巳；壬生於申、死於卯；癸生於卯、死於申。《子平真詮》論子息只用陽干一行（五行長生）。</p>${q('sm2_12')}${q('sm2_cs5')}${q('sm2_cs6')}`;
  return h;
}
$('#poem').innerHTML = renderPoem();

function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2200); }
async function copyLink() { const u = location.href; try { await navigator.clipboard.writeText(u); toast('已複製分享連結'); } catch (e) { prompt('請複製這個連結', u); } }
// ---- PDF：html2canvas 逐頁轉圖，組成 A4 PDF ----
async function downloadPdf() {
  const b = $('#pdfBtn'), lab = b.textContent; b.disabled = true; b.textContent = '產生 PDF 中…';
  try {
    if (!window.html2canvas) await new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'html2canvas.min.js'; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
    const el = $('#sheet'), scale = Math.min(2, 1600 / el.offsetWidth);
    const cv = await window.html2canvas(el, { scale, backgroundColor: '#ffffff', useCORS: true });
    const pw = 595.28, ph = 841.89, m = 28, iw = pw - 2 * m, pxPerPt = cv.width / iw, pageH = Math.floor((ph - 2 * m) * pxPerPt);
    const pages = [];
    for (let y = 0; y < cv.height; y += pageH) {
      const h = Math.min(pageH, cv.height - y), c = document.createElement('canvas'); c.width = cv.width; c.height = h;
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, h); g.drawImage(cv, 0, y, cv.width, h, 0, 0, cv.width, h);
      const bin = atob(c.toDataURL('image/jpeg', 0.88).split(',')[1]), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      pages.push({ jpg: u8, w: c.width, h, ptH: h / pxPerPt });
    }
    const blob = makePdf(pages, pw, ph, m, iw);
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `子息-${new URLSearchParams(location.search).get("d") || "chart"}.pdf`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 30000);
  } catch (e) { toast('PDF 產生失敗，請改用「列印」另存 PDF'); }
  b.disabled = false; b.textContent = lab;
}
function makePdf(pages, pw, ph, m, iw) {
  const enc = new TextEncoder(), parts = [], offs = []; let len = 0;
  const push = x => { const u = typeof x === 'string' ? enc.encode(x) : x; parts.push(u); len += u.length; };
  const obj = (n, body) => { offs[n] = len; push(`${n} 0 obj\n`); body(); push('\nendobj\n'); };
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  const n = pages.length, kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ');
  obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2, () => push(`<< /Type /Pages /Kids [${kids}] /Count ${n} >>`));
  pages.forEach((p, i) => {
    const po = 3 + i * 3, io = po + 1, co = po + 2, y = ph - m - p.ptH;
    obj(po, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im${i} ${io} 0 R >> >> /Contents ${co} 0 R >>`));
    obj(io, () => { push(`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpg.length} >>\nstream\n`); push(p.jpg); push('\nendstream'); });
    const cs = `q ${iw.toFixed(2)} 0 0 ${p.ptH.toFixed(2)} ${m} ${y.toFixed(2)} cm /Im${i} Do Q`;
    obj(co, () => push(`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`));
  });
  const xref = len, total = 3 + n * 3;
  push(`xref\n0 ${total}\n0000000000 65535 f \n` + Array.from({ length: total - 1 }, (_, i) => String(offs[i + 1]).padStart(10, '0') + ' 00000 n \n').join(''));
  push(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts, { type: 'application/pdf' });
}

// ---- 資料來源 ----
$('#sources').innerHTML = SOURCES;
// ---- 由網址還原 ----
const s0 = stateFromUrl();
if (s0) {
  const S = readState(s0);
  $('#date').value = fmt(S.wall).slice(0, 10); if (s0.t && /^\d{4}$/.test(s0.t)) $('#time').value = s0.t.slice(0, 2) + ':' + s0.t.slice(2); $('#unk').checked = S.unk; $('#time').disabled = S.unk;
  $$('input[name=g]').forEach(r => r.checked = r.value === S.sex); $('#lon').value = String(S.lon); $('#lon').oninput();
  show(s0);
}
window.__zixi = { buildChart, analyzeZixi, readState, renderResult };
