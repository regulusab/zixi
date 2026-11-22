# Word 檔開啟檢查：python-docx 讀取＋LibreOffice 轉 PDF
import sys, subprocess, docx, os, tempfile
f = sys.argv[1]; d = docx.Document(f)
txt = '\n'.join(p.text for p in d.paragraphs) + '\n' + '\n'.join(c.text for t in d.tables for r in t.rows for c in r.cells)
need = ['命盤', '子女數目', '第一法', '第二法', '第三法', '本站彙整', '大運'] ; ban = ['加一天', '前世', '風水', '夭', '送終', '損子', '傷損', '有剋', '殂', '喪', '入泉鄉', '出家', '官符', '疾病', '殘疾', 'undefined', 'NaN']
out = tempfile.mkdtemp(); r = subprocess.run(['soffice', '--headless', '--convert-to', 'pdf', '--outdir', out, f], capture_output=True, timeout=180)
pdf = os.path.join(out, os.path.basename(f).rsplit('.', 1)[0] + '.pdf'); pages = subprocess.run(['pdfinfo', pdf], capture_output=True, text=True).stdout if os.path.exists(pdf) else ''
pg = [l.split()[-1] for l in pages.splitlines() if l.startswith('Pages')]
print(f"Word 檢查 {os.path.basename(f)}：python-docx 讀出 {len(d.paragraphs)} 段、{len(d.tables)} 表；必要段落 {sum(k in txt for k in need)}/{len(need)}；遮蔽字命中 {[w for w in ban if w in txt] or '無'}；LibreOffice 轉 PDF {'成功 ' + pg[0] + ' 頁' if pg else '失敗'}")
