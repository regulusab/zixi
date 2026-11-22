// 八字站（regulusab/bazi-site @3a55c89）src/bazi.js 第 11–30 行原樣複本，只取純函式，未修改。
export const GAN='甲乙丙丁戊己庚辛壬癸', ZHI='子丑寅卯辰巳午未申酉戌亥';
export const WX=['木','火','土','金','水'], WXCLS={木:'wood',火:'fire',土:'earth',金:'metal',水:'water'};
export const ganWx=g=>WX[Math.floor(GAN.indexOf(g)/2)];
const ZWX='水土木木土火火土金金土水';export const zhiWx=z=>ZWX[ZHI.indexOf(z)];
const HIDE={子:'癸',丑:'己癸辛',寅:'甲丙戊',卯:'乙',辰:'戊乙癸',巳:'丙庚戊',午:'丁己',未:'己丁乙',申:'庚壬戊',酉:'辛',戌:'戊辛丁',亥:'壬甲'};
export const hide=z=>[...HIDE[z]];
const gen=(a,b)=>(WX.indexOf(a)+1)%5===WX.indexOf(b), ctl=(a,b)=>(WX.indexOf(a)+2)%5===WX.indexOf(b);
export function shiShen(dm,g){const a=ganWx(dm),b=ganWx(g),same=GAN.indexOf(dm)%2===GAN.indexOf(g)%2;
 if(a===b)return same?'比肩':'劫財';if(gen(a,b))return same?'食神':'傷官';if(ctl(a,b))return same?'偏財':'正財';
 if(ctl(b,a))return same?'七殺':'正官';return same?'偏印':'正印';}
// relations
const CHONG=['子午','丑未','寅申','卯酉','辰戌','巳亥'],LIUHE={子丑:'土',寅亥:'木',卯戌:'火',辰酉:'金',巳申:'水',午未:'土'};
const HAI=['子未','丑午','寅巳','卯辰','申亥','酉戌'],XING=['子卯','寅巳','巳申','寅申','丑戌','戌未','丑未'],ZIXING='辰午酉亥';
const GANHE={甲己:'土',乙庚:'金',丙辛:'水',丁壬:'木',戊癸:'火'},GANCHONG=['甲庚','乙辛','丙壬','丁癸'];
const has=(arr,a,b)=>arr.includes(a+b)||arr.includes(b+a);
export function zhiRel(a,b){const r=[];if(has(CHONG,a,b))r.push('沖');const h=LIUHE[a+b]||LIUHE[b+a];if(h)r.push('六合('+h+')');
 if(has(XING,a,b)||(a===b&&ZIXING.includes(a)))r.push(a===b?'自刑':'刑');if(has(HAI,a,b))r.push('害');return r;}
export function ganRel(a,b){const r=[];const h=GANHE[a+b]||GANHE[b+a];if(h)r.push('合('+h+')');if(has(GANCHONG,a,b))r.push('沖');return r;}
const SANHE=[['申子辰','水'],['亥卯未','木'],['寅午戌','火'],['巳酉丑','金']];
export function sanHe(zs){return SANHE.filter(([s])=>[...s].every(c=>zs.includes(c))).map(([s,w])=>s+'三合'+w+'局');}
