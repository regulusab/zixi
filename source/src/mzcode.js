// 命造代碼：年月日-時分-性別-判法-姓名（例 19850315-1430-男-甲-王小明）。總入口存於 localStorage「rg.mingzao」（同網域各站共用）。
export const MZ_KEY = 'rg.mingzao';
const SEX = { 男: 'm', 乾: 'm', m: 'm', M: 'm', '1': 'm', 女: 'f', 坤: 'f', f: 'f', F: 'f', '0': 'f', '2': 'f' };
/** 解析命造代碼，回傳本站網址參數 st 與說明 notes；任何輸入都回傳結果，不阻擋 */
export function parseCode(raw) {
  const notes = [], code = String(raw ?? '').trim().normalize('NFKC');
  const f = code.split(/[-－—–]/).map(s => s.trim());
  const st = { d: '', t: '', u: '0', g: 'm', lon: '121.5654', p: '台北', y: '', n: '' };
  const dd = (f[0] || '').replace(/\D/g, '');
  if (/^\d{8}$/.test(dd)) st.d = dd; else notes.push(`命造代碼的年月日「${f[0] || ''}」無法辨識`);
  const tt = (f[1] || '').replace(/\D/g, '');
  if (/^\d{3,4}$/.test(tt) && !/[?？x]/i.test(f[1])) st.t = tt.padStart(4, '0'); else { st.u = '1'; if (f[1]) notes.push(`時分「${f[1]}」無法辨識，改列每個時辰`); }
  if (f[2] && SEX[f[2]]) st.g = SEX[f[2]]; else notes.push(`性別「${f[2] || ''}」無法辨識，暫以男命排`);
  st.pf = f[3] || '';
  st.n = f.slice(4).join('-');
  notes.push('命造代碼未含出生地，暫以台北（東經 121.5654°）排盤，可於上方改經度');
  return { st, notes, code };
}
