import { chromium, devices } from 'playwright'; import fs from 'fs';
import { buildChart, analyzeZixi } from '../src/engine.js';
const base = process.env.BASE || 'http://127.0.0.1:18941/', tag = process.env.TAG || 'local';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const errs = [], log = [];
const ex = 'd=20261007&t=2210&u=0&g=m&lon=-122.68&p=' + encodeURIComponent('自訂經度');
const BAN = ['加一天', '前世', '風水', '夭', '送終', '損子', '傷損', '有剋', '殂', '喪', '入泉鄉', '出家', '官符', '疾病', '殘疾', 'undefined', 'NaN', '[object'];
for (const [name, opt] of [['desktop', { viewport: { width: 1280, height: 900 }, acceptDownloads: true }], ['phone', { ...devices['iPhone 13'], acceptDownloads: true }]]) {
  const ctx = await b.newContext(opt); const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(name + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(name + ' console: ' + m.text()); });
  // 表單流程
  await p.goto(base, { waitUntil: 'networkidle' });
  await p.screenshot({ path: `shots/${tag}-${name}-form.png` });
  await p.fill('#date', '2026-10-07'); await p.fill('#time', '22:10'); await p.selectOption('#city', 'custom'); await p.fill('#lon', '-122.68'); await p.dispatchEvent('#lon', 'input');
  await p.selectOption('#yw', '水'); await p.screenshot({ path: `shots/${tag}-${name}-form-filled.png`, fullPage: true }); await p.click('#go'); await p.waitForSelector('#sheet'); await p.waitForTimeout(800);
  const url = p.url(); log.push(`${name} 表單送出後網址：${url.replace(base, '')}`);
  const pil = await p.$$eval('table.bz td.g', t => t.map(x => x.textContent.trim()).join(''));
  log.push(`${name} 四柱：${pil}`);
  await p.screenshot({ path: `shots/${tag}-${name}-result.png` });
  await p.screenshot({ path: `shots/${tag}-${name}-full.png`, fullPage: true });
  log.push(`${name} 網址含最旺用神：${url.includes('y=%E6%B0%B4')}；第三法：${(await p.$eval('table.tm', e => e.innerText)).includes('水／壬')}`);
  // 重新載入網址還原
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForSelector('#sheet'); log.push(`${name} 重新載入還原（含最旺用神 ${await p.$eval('#yw', e => e.value)}）：${(await p.$$eval('table.bz td.g', t => t.map(x => x.textContent.trim()).join(''))) === pil}`);
  // 遮蔽字（#sheet）
  const sheet = await p.$eval('#sheet', e => e.innerText); const hit = BAN.filter(w => sheet.includes(w)); log.push(`${name} #sheet 遮蔽字命中：${hit.length ? hit.join('、') : '無'}`);
  const poem = await p.$eval('#poemCard', e => e.textContent); log.push(`${name} 歌訣區含全文「入墓之時命夭亡」：${poem.includes('入墓之時命夭亡')}`);
  // 新按鈕截圖
  await p.$eval('.actions', e => e.scrollIntoView({ block: 'center' })); await p.waitForTimeout(300);
  await p.screenshot({ path: `shots/${tag}-${name}-buttons.png` });
  { const bt = await p.$$eval('.actions button', b => b.map(x => x.textContent)); log.push(`${name} 按鈕：${bt.join('、')}`); }
  // LINE：攔截 window.open
  await p.evaluate(() => { window.__opened = []; window.open = u => { window.__opened.push(u); return {}; }; });
  await p.click('#lineSum'); await p.click('#lineLink');
  { const op = await p.evaluate(() => window.__opened); const t1 = decodeURIComponent(op[0].split('text=')[1]), t2 = decodeURIComponent(op[1].split('text=')[1]);
    log.push(`${name} LINE 傳摘要：${op[0].startsWith('https://line.me/R/share?text=')}；內容「${t1.replace(/\n/g, '｜')}」`);
    log.push(`${name} LINE 傳連結：${t2}`); }
  if (name === 'desktop') {
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), p.click('#pdfBtn')]);
    await dl.saveAs(`shots/${tag}-example.pdf`); log.push(`PDF 下載：${dl.suggestedFilename()} ${fs.statSync(`shots/${tag}-example.pdf`).size} bytes`);
    // Word
    { const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), p.click('#docxBtn')]);
      await dl.saveAs(`shots/${tag}-example.docx`); log.push(`Word 下載：${dl.suggestedFilename()} ${fs.statSync(`shots/${tag}-example.docx`).size} bytes`); }
    // 命造代碼：總入口 localStorage → 無參數開本站自動排盤
    { const root = tag === 'live' ? 'https://regulusab.github.io/' : base;
      await p.goto(root, { waitUntil: 'networkidle' });
      if (tag === 'live') { await p.fill('#mzIn', '20261007-2210-男-波特蘭-測試者'); await p.waitForTimeout(200); await p.screenshot({ path: `shots/${tag}-portal-code.png` }); }
      else await p.evaluate(() => localStorage.setItem('rg.mingzao', '20261007-2210-男-波特蘭-測試者'));
      await p.goto(base, { waitUntil: 'networkidle' }); await p.waitForSelector('#sheet');
      const pil2 = await p.$$eval('table.bz td.g', t => t.map(x => x.textContent.trim()).join(''));
      const hint = await p.$eval('#sheet .hint', e => e.textContent);
      log.push(`命造代碼自動排盤（${tag === 'live' ? '在總入口輸入框填入' : 'localStorage 寫入'}「20261007-2210-男-波特蘭-測試者」，開本站不帶參數）：四柱 ${pil2}，網址 ${p.url().replace(base, '')}，姓名顯示 ${(await p.$eval('#sheet', e => e.innerText)).includes('測試者')}；說明「${hint.slice(0, 70)}」`);
      await p.screenshot({ path: `shots/${tag}-code-auto.png` });
      await p.evaluate(() => { window.__opened = []; window.open = u => { window.__opened.push(u); return {}; }; }); await p.click('#lineSum'); await p.click('#lineLink');
      const op = await p.evaluate(() => window.__opened.map(decodeURIComponent)); log.push(`LINE 摘要／連結含姓名：${op.some(u => u.includes('測試者'))}`);
      await p.goto(base + '?d=19850315&t=0930&u=0&g=f&lon=121.5654', { waitUntil: 'networkidle' }); await p.waitForSelector('#sheet');
      log.push(`網址參數優先於命造代碼：四柱 ${await p.$$eval('table.bz td.g', t => t.map(x => x.textContent.trim()).join(''))}（1985-03-15 09:30 女）`);
      await p.goto(root, { waitUntil: 'networkidle' }); if (tag === 'live') await p.click('#mzClr'); else await p.evaluate(() => localStorage.removeItem('rg.mingzao'));
      await p.goto(base + '?mz=' + encodeURIComponent('亂碼-xx-?'), { waitUntil: 'networkidle' }); await p.waitForSelector('#sheet');
      log.push(`壞命造代碼不阻擋：${(await p.$eval('#sheet .hint', e => e.textContent)).slice(0, 90)}`); }
    // 最旺用神留空
    await p.goto(base + '?d=20261007&t=2210&u=0&g=m&lon=-122.68', { waitUntil: 'networkidle' }); await p.waitForSelector('#sheet');
    { const tx = await p.$eval('#sheet', e => e.innerText); log.push(`最旺用神留空：顯示「未指定（由輸入者指定）」${tx.includes('未指定（由輸入者指定）')}；彙整「${(await p.$eval('.sum .h', e => e.textContent))}」`); }
    await p.screenshot({ path: `shots/${tag}-desktop-blank-yw.png`, fullPage: false });
    // 女命、時辰不確定
    await p.goto(base + '?d=19850315&t=&u=1&g=f&lon=121.5654&y=%E7%81%AB&p=' + encodeURIComponent('台北'), { waitUntil: 'networkidle' }); await p.waitForSelector('#sheet');
    const nh = await p.$$eval('table.hrs tbody tr', r => r.length), nh3 = await p.$$eval('table.hrs tbody tr', r => r.filter(x => x.children[4].textContent.startsWith('丙')).length); log.push(`女命、時辰不確定、最旺用神火：時段表 ${nh} 列，第三法 ${nh3}/13 列用丙起長生`);
    await p.screenshot({ path: `shots/${tag}-female-unknown.png`, fullPage: true });
    // 壞輸入不阻擋
    await p.goto(base + '?d=abc&t=99&u=0&g=x&lon=999', { waitUntil: 'networkidle' }); await p.waitForSelector('#sheet');
    log.push(`壞輸入：${(await p.$eval('#sheet .hint', e => e.textContent)).slice(0, 80)}`);
    // 瀏覽器 vs node：300 盤
    let seed = 4242; const R = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648; const cases = [];
    for (let i = 0; i < 300; i++) cases.push([['', '金', '木', '水', '火', '土'][Math.floor(R() * 6)], Date.UTC(1900 + Math.floor(R() * 200), Math.floor(R() * 12), 1 + Math.floor(R() * 28), Math.floor(R() * 24), Math.floor(R() * 60)), -180 + R() * 360, R() < .5 ? 'm' : 'f']);
    const br = await p.evaluate((cases) => cases.map(([y, w, l, s]) => { const Z = window.__zixi, C = Z.buildChart(w, l, s), A = Z.analyzeZixi(C, { yw: y }); return JSON.stringify({ p: [C.P.year.gz, C.P.month.gz, C.P.day.gz, C.P.hour.gz], c: A.counts, t: A.teacher, r: A.range, m: A.methods.map(m => [m.id, m.how]) }); }), cases);
    let same = 0; cases.forEach(([y, w, l, s], i) => { const C = buildChart(w, l, s), A = analyzeZixi(C, { yw: y }); if (JSON.stringify({ p: [C.P.year.gz, C.P.month.gz, C.P.day.gz, C.P.hour.gz], c: A.counts, t: A.teacher, r: A.range, m: A.methods.map(m => [m.id, m.how]) }) === br[i]) same++; });
    log.push(`瀏覽器 vs node：300 盤四柱、老師三法、彙整、參考各法說明全同 ${same}/300`);
    // 瀏覽器內渲染 1000 盤 #sheet 遮蔽字
    const r2 = await p.evaluate(({ BAN }) => { const Z = window.__zixi; let seed = 99, hits = [], crash = 0; const R = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648; const d = document.createElement('div'); document.body.appendChild(d);
      for (let i = 0; i < 1000; i++) { const st = { d: String(1800 + Math.floor(R() * 400)) + String(1 + Math.floor(R() * 12)).padStart(2, '0') + String(1 + Math.floor(R() * 28)).padStart(2, '0'), t: R() < .2 ? '' : String(Math.floor(R() * 24)).padStart(2, '0') + String(Math.floor(R() * 60)).padStart(2, '0'), u: R() < .1 ? '1' : '0', g: R() < .5 ? 'm' : 'f', y: ['', '金', '木', '水', '火', '土', 'x'][Math.floor(R() * 7)], lon: String(-180 + R() * 360), p: '' };
        try { const S = Z.readState(st), C = Z.buildChart(S.wall, S.lon, S.sex), A = Z.analyzeZixi(C, { yw: S.yw }); d.innerHTML = Z.renderResult(S, C, A); const tx = d.innerText; for (const w of BAN) if (tx.includes(w)) hits.push(w + ' ' + JSON.stringify(st)); } catch (e) { crash++; hits.push('crash ' + e.message); } }
      d.remove(); return { hits: hits.slice(0, 5), n: hits.length, crash }; }, { BAN });
    log.push(`瀏覽器內渲染 1000 盤（含時辰不確定）：當機 ${r2.crash}，#sheet 遮蔽字／undefined／NaN 命中 ${r2.n} ${r2.hits.join(' | ')}`);
  }
  await ctx.close();
}
await b.close(); log.push('頁面錯誤：' + (errs.length ? errs.join(' | ') : '無'));
console.log(log.join('\n')); fs.writeFileSync(`tests/browser-${tag}.txt`, log.join('\n') + '\n');
