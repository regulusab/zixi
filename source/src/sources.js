import { SRC } from './texts.js';
const a = (u, t) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`;
const L = k => { const s = SRC[k]; return `${s.book}（${s.by}）：${a(s.url, s.site)}${s.alt ? '；另見' + a(s.alt, '維基文庫') : ''}`; };
export const SOURCES = `
<h3>時間規則</h3>
<ul class="src">
<li>命理時間一律用地方平時（Local Mean Time）。輸入的日期時間即地方平時，照輸入使用，不換算、不扣夏令。</li>
<li>年柱、月柱：交節氣（立春、驚蟄…小寒）的瞬間以天文曆（astronomy-engine）求出，換成出生地經度的地方平時（世界時＋經度×4 分）後比較。</li>
<li>日柱 0:00 換日。東經 70° 以西，日柱干支進一位（日期不動），時柱依新日干以五鼠遁重排。23 時起為子時，時干依次日日干（晚子時），日柱不換。</li>
<li>大運：《三命通會》卷二〈論大運〉，陽男陰女順、陰男陽女逆，數至節氣，三日折一年。</li>
</ul>
<h3>古籍出處</h3>
<ul class="src">
<li>${L('zpzq')}〈論妻子〉。長生沐浴歌即引自此篇；評註為徐樂吾所作。另見${a('https://tianjihq.com/zh-CN/learn/books/ziping-zhenquan-pingzhu/35', '天機（簡體）')}、${a('http://www.xiangkun.org/shushuzipingzhenquanpingzhu4.htm', '祥坤（簡體）')}。</li>
<li>${L('yh')}卷三〈論子息〉；${L('yhlq')}卷三〈六親總論〉。</li>
<li>${L('sm7')}〈論六親〉〈子息引例章〉；${L('sm2')}〈論五行旺相休囚死並寄生十二宫〉〈論天干隂陽生死〉〈論遁月時〉〈論年月日時〉〈論大運〉。</li>
<li>${L('xx2')}〈論納音定子息歌〉。</li>
<li>${L('dts')}〈六親論〉（維基文庫本為劉基注本，任鐵樵《滴天髓徵義》未引）。</li>
<li>${L('qt')}〈六月甲木〉「女命以妻作夫，用作子。十干皆同」。</li>
<li>${L('sf')}卷一〈六親說〉。另見${a('https://www.keepds.com/book/read?bo=shenfengtongkao', 'keepds（簡體）')}。</li>
</ul>
<h3>本站判準（不是古籍原文）</h3>
<ul class="src">
<li>「生旺」取長生、臨官、帝旺；「死絕」取死、絕。</li>
<li>「多」：天干與地支本氣合計 3 見以上；「少」：1 見以下。「旺」「强」：該五行當令（月令旺）。</li>
<li>喜用神、身強弱、格局：借用八字站引擎（regulusab/bazi-site 的 analysis.js，原樣複本）判定。</li>
<li>本站彙整的子數範圍，只是把各法數目並列統計，不代表任何一家之說。</li>
</ul>
<h3>遮蔽規定</h3>
<ul class="src">
<li>歌訣全文照錄於「長生沐浴歌」一節；命盤結果中，「入墓之時命夭亡」只寫「入墓之時……（依遮蔽規定不寫）」，不給數目。</li>
<li>「養中三子只留一（二）」在命盤結果中只列數目範圍，不寫去留。</li>
<li>引文中依遮蔽規定不寫的片段，以「……（依遮蔽規定不寫）」代替；不涉及健康、法律、宗教方面。</li>
</ul>
<h3>程式</h3>
<ul class="src"><li>四柱與節氣：本站 calendar.js（與六爻站同一模組），以 lunar-javascript 對照 3000 組隨機時刻驗證。節氣：astronomy-engine。</li></ul>
`;
