import { chromium, devices } from 'playwright';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); await p.goto('https://regulusab.github.io/', { waitUntil: 'networkidle' });
await p.fill('#mzIn', '20261007-2210-男-波特蘭-測試者'); await p.screenshot({ path: 'shots/live-phone-portal-code.png' });
const z = await p.$eval('a.card[href*="zixi"]', a => a.href); console.log('portal→zixi', z); await p.click('#mzClr'); await b.close();
