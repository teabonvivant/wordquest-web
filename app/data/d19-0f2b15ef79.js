
/* HK-M2: exact, code-drawn teaching pictures. Examples are instructional, never student data. */
(function(root){'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const P={ink:'#293458',purple:'#7560d1',gold:'#f6c85f',blue:'#62b8d2',mint:'#79cdb1',red:'#ec907f',pale:'#eee9ff'};
const text=(x,y,t,size=24,fill=P.ink,extra='')=>`<text x="${x}" y="${y}" font-size="${size}" font-weight="750" text-anchor="middle" fill="${fill}" ${extra}>${esc(t)}</text>`;
const rect=(x,y,w,h,fill=P.pale,rx=12)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/>`;
const dot=(x,y,r=12,color=P.purple)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>`;
const line=(x,y,X,Y,color=P.ink,width=4,extra='')=>`<line x1="${x}" y1="${y}" x2="${X}" y2="${Y}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" ${extra}/>`;
const dots=(n,x,y,color=P.purple,cols=5,gap=32)=>Array.from({length:n},(_,i)=>dot(x+(i%cols)*gap,y+Math.floor(i/cols)*gap,11,color)).join('');
const grid=(cols,rows,x,y,cell=35,filled=cols*rows)=>Array.from({length:cols*rows},(_,i)=>rect(x+i%cols*cell,y+Math.floor(i/cols)*cell,cell-3,cell-3,i<filled?P.purple:'#e9e7ee',4)).join('');
const equation=(items,y=138)=>{const gap=Math.min(150,510/items.length),x=300-(items.length-1)*gap/2;return items.map((v,i)=>text(x+i*gap,y,v,/^[+−×÷=→]$/.test(v)?30:38)).join('');};
const spec=(kind,caption,words,steps,params={})=>({kind,caption,words:words.split('｜'),steps:steps.split('｜'),params});
const M={
'1N1':spec('count','一個一個數，最後有幾個？','逐個數｜不重複｜總數','手指跟着圓點，一個一個數。｜上面5個，下面3個，一共有8個。｜最後數到8，總數就是8。'),
'1N2':spec('add','合起來，就用加法','合起來｜加法｜拿走','左邊有3個，右邊有2個。｜把兩組合起來，再數一次。｜3＋2＝5；拿走2個，就剩3個。'),
'1N3':spec('place','23裏面藏着甚麼？','十位｜個位｜等值','2個十，放在十位。｜3個一，放在個位。｜20＋3＝23，換個分法，總數不變。',{digits:[2,3],labels:['十','個']}),
'1N4':spec('calculation','對齊數位，再加減','個位｜十位｜檢查','先看個位：3＋4＝7。｜再看十位：2個十＋1個十＝3個十。｜23＋14＝37；37−14＝23。',{rows:['23 ＋ 14','20＋10　和　3＋4','30 ＋ 7 ＝ 37']}),
'1M1':spec('length','同一個起點，才比得準','對齊｜不留空｜不重疊','兩條積木列，左邊先對齊。｜用同樣大小的積木，首尾接好。｜上面5塊，下面3塊，上面較長。'),
'1M2':spec('money','看面額，再算總值','面額｜總值｜元','這裏有兩枚1元和一枚5元。｜1＋1＋5，總值是7元。｜硬幣有幾枚，不等於有幾元。',{values:[1,1,5]}),
'1M3':spec('ruler','小尺從0開始讀','起點｜終點｜厘米','把物件一端對準0。｜另一端對着4。｜由0到4，長度是4厘米。'),
'1M4':spec('clock','先看長針，再看短針','分針｜時針｜整點','長針指12，表示整點。｜短針指3，表示3時。｜兩枝針一起看：現在是3時。',{hour:3,minute:0}),
'1S1':spec('solid','從實物找立體朋友','平面｜曲面｜外形','看看左邊的正方體和右邊的球。｜正方體有平平的面，球的表面是彎曲的。｜轉一轉，立體的種類不會改變。'),
'1S2':spec('shapes','數直邊，認圖形','三邊｜四邊｜圖形','三角形有3條直邊。｜正方形有4條直邊。｜旋轉或放大，邊數仍然一樣。'),
'1S3':spec('position','先決定：從哪裏看？','左邊｜右邊｜中間','用你現在看圖的方向。｜圓形在左邊，三角形在右邊。｜正方形在它們中間。'),
'2N1':spec('place','百、十、個，各有位置','百位｜十位｜個位','3在百位，代表300。｜4在十位，5在個位。｜300＋40＋5＝345。',{digits:[3,4,5],labels:['百','十','個']}),
'2N2':spec('calculation','滿十，換到左一位','進位｜十個一｜一個十','先算個位：8＋7＝15。｜15個一，換成1個十和5個一。｜28＋17＝45，總值沒有改變。',{rows:['28 ＋ 17','8＋7＝15 → 1個十＋5個一','20＋10＋10＋5＝45']}),
'2N3':spec('groups','每組一樣多，可以用乘法','每組｜組數｜總數','每個圈裏都有4個圓點。｜共有3組，不用每次由1數起。｜4＋4＋4＝12，也可寫成4×3＝12。',{groups:3,each:4}),
'2N4':spec('place','0也有工作','千位｜0佔位｜個位','1在千位，代表1000。｜百位和十位沒有數量，用0佔位。｜1002是1個千和2個一。',{digits:[1,0,0,2],labels:['千','百','十','個']}),
'2M3':spec('money','紙幣要看面額','10元｜20元｜總值','左邊是10元，右邊是20元。｜10＋20＝30元。｜張數相同，也可能有不同總值。',{values:[10,20],notes:true}),
'2N5':spec('calculation','付出減價錢，就是找贖','付出｜價錢｜找贖','付出50元，物品要28元。｜用50−28，找出剩下的錢。｜找回22元；28＋22＝50，可以檢查。',{rows:['付出 50元','價錢 28元 ＋ 找贖 22元','28 ＋ 22 ＝ 50']}),
'2N6':spec('share','每組要分得一樣多','平均分｜每組｜餘數','有13個圓點，平均分成3組。｜每組分4個，還剩1個。｜13÷3＝4…1；餘下1個不夠再分一圈。',{groups:3,each:4,remainder:1}),
'2M1':spec('unit','先換成同一單位','米｜厘米｜換算','1米和100厘米一樣長。｜1米20厘米，就是100厘米再加20厘米。｜100＋20＝120厘米。',{a:'1 米',b:'100 厘米',result:'1米20厘米＝120厘米'}),
'2M2':spec('clock','一個大格，5分鐘','小格｜大格｜分鐘','分針由12走到1，走了5分鐘。｜走到3，走了3個大格。｜3×5＝15，所以圖中是3時15分。',{hour:3,minute:15}),
'2S1':spec('prism','找兩端相同的底面','底面｜三角形｜角柱','找出立體兩端相同的圖形。｜圖中的兩端都是三角形。｜按底面命名：這是三角柱。'),
'2S2':spec('angle','看張開多少，不看邊長','頂點｜邊｜張開','兩條邊由同一個頂點出發。｜圖中兩個角張開的程度相同。｜即使邊長不同，角也可以一樣大。',{degrees:60,compare:true}),
'2S3':spec('compass','四個方向找一找','東西｜南北｜相對','先找到上方的北。｜北和南相對，東和西相對。｜由北轉半圈，就面向南。',{eight:false}),
'2S4':spec('rectangle','先看角，再看邊','四個直角｜對邊相等｜正方形','長方形有4個直角。｜相對的兩條邊一樣長。｜4條邊都一樣長時，也是正方形。'),
'2D1':spec('pictograph','一個圖案代表多少？','標題｜圖例｜數量','這張圖記錄每組借出的書。｜圖例：一個圓點代表1本。｜甲組3本，乙組5本，乙組較多。'),
'3N1':spec('place','同一數字，不同數值','萬位｜千位｜數值','左邊的2在萬位，代表20000。｜中間的2在百位，代表200。｜數字的位置，決定它代表多少。',{digits:[2,0,2,0,0],labels:['萬','千','百','十','個']}),
'3N2':spec('multiply','拆開算，再合起來','拆數｜分別乘｜合計','23可拆成20和3。｜20×4＝80，3×4＝12。｜80＋12＝92，所以23×4＝92。',{rows:['23 × 4','20 × 4 ＝ 80','3 × 4 ＝ 12','80 ＋ 12 ＝ 92']}),
'3N3':spec('calculation','除完，用乘法檢查','商｜餘數｜驗算','125平均分成4組。｜每組31，餘下1。｜31×4＋1＝125，而且1小於4。',{rows:['125 ÷ 4 ＝ 31…1','31 × 4 ＝ 124','124 ＋ 1 ＝ 125']}),
'3N4':spec('order','先乘，後加減','乘法｜加減｜次序','題目是3＋4×2。｜先把4×2算成8。｜再算3＋8＝11。',{rows:['3 ＋ 4 × 2','3 ＋ 8','11']}),
'3N5':spec('fraction','平均分，才是分數','平均分｜分母｜分子','整條平均分成4份。｜塗色的是其中3份。｜分母寫4，分子寫3，就是3/4。',{den:4,num:3}),
'3M1':spec('unit','一小格，是1毫米','厘米｜毫米｜10','1厘米可以分成10毫米。｜3厘米就是3組10毫米。｜3×10＝30毫米。',{a:'1 厘米',b:'10 毫米',result:'3厘米＝30毫米'}),
'3M2':spec('timeline','從起點開始數經過時間','開始｜經過｜結束','由10:50開始，先到11:00。｜這一段經過10分鐘，再走15分鐘。｜10＋15＝25分鐘，來到11:15。'),
'3M3':spec('capacity','先看刻度和單位','升｜毫升｜容量','這個量杯用毫升記錄。｜水面對着500毫升。｜1000毫升＝1升，500毫升就是半升。'),
'3M4':spec('unit','下午時間換個寫法','上午｜下午｜24小時','下午2時，不是凌晨2時。｜下午1至11時，時數加12。｜2＋12＝14，下午2時寫作14:00。',{a:'下午 2 時',b:'14:00',result:'中午12時仍是12:00'}),
'3M5':spec('unit','公斤和克，先統一','公斤｜克｜1000','1公斤和1000克一樣重。｜2公斤300克，就是2000克加300克。｜2000＋300＝2300克。',{a:'1 公斤',b:'1000 克',result:'2公斤300克＝2300克'}),
'3S1':spec('parallel','延長下去，也不相交','平行｜方向｜直線','找出朝相同方向的兩條直線。｜一直延長，它們都不相交。｜這兩條直線互相平行。'),
'3S2':spec('triangle','按邊的長度，認三角形','等腰｜等邊｜包含','左邊有兩條邊一樣長，是等腰三角形。｜右邊三條邊一樣長，是等邊三角形。｜等邊三角形，也符合等腰三角形的特徵。'),
'3D1':spec('bar','先讀每格，再看棒頂','刻度｜每格｜數值','縱軸每格代表5本書。｜甲組的棒有3格高。｜3×5＝15，甲組有15本。',{values:[15,25,20],scale:5}),
'4N1':spec('multiply','十位那個1，其實是10','十位｜分拆｜合計','12可以拆成10和2。｜23×10＝230，23×2＝46。｜230＋46＝276，所以23×12＝276。',{rows:['23 × 12','23 × 10 ＝ 230','23 × 2 ＝ 46','230 ＋ 46 ＝ 276']}),
'4N2':spec('calculation','用倍數試商','倍數｜商｜檢查','想一想，12乘幾會得到144？｜12×10＝120，還差24。｜再多2組12，所以144÷12＝12。',{rows:['144 ÷ 12','12 × 10 ＋ 12 × 2','12 × 12 ＝ 144']}),
'4N3':spec('factors','一排排砌，找因數','整除｜因數｜倍數','12個方格，排成3行，每行4個。｜3和4都能整除12，都是12的因數。｜12是3的倍數，也是4的倍數。'),
'4N4':spec('common','找兩列都有的數','倍數｜共同｜最小','上面列出4的倍數。｜下面列出6的倍數。｜兩列最先遇到12，最小公倍數是12。'),
'4N5':spec('order','括號裏面，先算好','括號｜乘除｜加減','題目是(3＋4)×2。｜先算括號：3＋4＝7。｜再算7×2＝14。',{rows:['(3 ＋ 4) × 2','7 × 2','14']}),
'4N6':spec('fraction','分數可以超過1','一個整體｜假分數｜帶分數','4個四分之一，可以拼成1。｜再多1個四分之一，共有5份。｜5/4＝1又1/4。',{den:4,num:5}),
'4N7':spec('decimal','每一小格，都是百分之一','十分位｜百分位｜等值','一整塊有100格，代表1。｜塗50格，就是50/100。｜0.50＝0.5，小數末端加0，數值不變。'),
'4N8':spec('decimaladd','小數點對齊','個位｜十分位｜百分位','把1.20和0.35的小數點對齊。｜相同數位，才可以相加。｜1.20＋0.35＝1.55。',{rows:['1.20','＋ 0.35','＝ 1.55']}),
'4M1':spec('perimeter','沿着外邊，走一圈','外邊｜四條邊｜周界','長方形長6厘米，闊4厘米。｜沿外邊走過6、4、6、4厘米。｜6＋4＋6＋4＝20厘米。'),
'4M2':spec('area','數裏面的格，不數外邊','一平方厘米｜行數｜面積','每小格代表1平方厘米。｜一行4格，一共有3行。｜4×3＝12，面積是12平方厘米。'),
'4S1':spec('quadrilateral','一個圖形，可以有多個名字','四邊相等｜四個直角｜正方形','正方形有4條一樣長的邊。｜它也有4個直角。｜所以它同時是菱形、長方形和平行四邊形。'),
'4S2':spec('cut','剪開再拼，面積不變','分割｜不重疊｜合併','把長方形沿中間剪開。｜兩片都保留，不重疊也不漏掉。｜拼法變了，總面積沒有變。'),
'4S3':spec('compass','兩個方向之間，還有朋友','東北｜東南｜西南西北','先找到北，再找到東。｜兩者之間，就是東北。｜其餘三個斜方向，也可這樣找。',{eight:true}),
'4D1':spec('bar','一格，可以代表50','刻度｜棒高｜數量','縱軸每格代表50本書。｜丙組的棒有4格高。｜4×50＝200，丙組有200本。',{values:[150,250,200],scale:50}),
'5N1':spec('round','看右邊一位，決定進捨','保留位｜右邊一位｜四捨五入','把24600四捨五入至千位。｜看百位的6：5或以上，要進1。｜約數是25000。'),
'5N2':spec('fractionadd','先把每份，變成一樣大','通分｜同分母｜合計','1/2可改寫成2/4，大小不變。｜2/4加上1/4，共有3/4。｜相加前，每一份要一樣大。'),
'5N3':spec('fractionmul','一半裏面的三分之一','一部分｜再分｜相乘','先取整個長方形的一半。｜再取這一半的三分之一。｜得到整體的1/6，所以1/2×1/3＝1/6。'),
'5N4':spec('calculation','小數的單位，要跟到底','十分之一｜乘法｜數值','2.4是24個十分之一。｜乘3，得到72個十分之一。｜72個十分之一是7.2。',{rows:['2.4 × 3','24 × 3 ＝ 72','72個十分之一 ＝ 7.2']}),
'5N5':spec('fractiondiv','兩個整體，有幾個半？','每份一半｜份數｜除法','每條長條，平均分成兩半。｜兩條長條，共有4個半。｜2÷1/2＝4。'),
'5A1':spec('algebra','先說清楚x代表甚麼','未知數｜每組｜代數式','每個盒子裏，都有x粒積木。｜4盒的數量，就是x＋x＋x＋x。｜可以簡寫成4x。'),
'5A2':spec('balance','等號兩邊，一樣多','等號｜同時減｜代回檢查','x＋3＝8，左右一樣多。｜兩邊都減3，仍然相等。｜x＝5；5＋3的確是8。'),
'5M1':spec('trianglearea','兩個三角形，拼成一個','底｜垂直高度｜一半','兩個一樣的三角形，可拼成平行四邊形。｜平行四邊形的面積是底×高。｜一個三角形的面積，就是底×高÷2。'),
'5M2':spec('cubes','先數一層，再數幾層','一層｜層數｜體積','每層排3×2，共6粒小正方體。｜一共有3層，隱藏的積木也要算。｜6×3＝18，體積是18立方厘米。'),
'5S1':spec('circle','穿過圓心，連接兩端','圓心｜半徑｜直徑','圓心到圓上的距離，是半徑。｜穿過圓心連到另一端，是直徑。｜直徑等於半徑的2倍。'),
'5S2':spec('cubeparts','轉一轉，找面、稜、頂','面｜稜｜頂','正方體有6個面。｜兩個面相接的直線部分是稜，共12條。｜稜相遇的角位是頂，共8個。'),
'5D1':spec('doublebar','同一天，兩組一起看','圖例｜日期｜比較','紫色代表甲館，金色代表乙館。｜先選同一天，再讀各棒的數值。｜第一天：甲館10本，乙館15本，相差5本。'),
'6N1':spec('calculation','兩個數，一起乘10','同乘｜整數｜商不變','題目是4.8÷0.6。｜兩個數都乘10，變成48÷6。｜48÷6＝8，原來的商也是8。',{rows:['4.8 ÷ 0.6','↓ ×10　　　　↓ ×10','48 ÷ 6 ＝ 8']}),
'6N2':spec('fraction','同一數值，兩種寫法','分數｜除法｜小數','長條的3份塗色，共有4等份。｜分數3/4，也表示3÷4。｜3÷4＝0.75，所以3/4＝0.75。',{den:4,num:3,label:'3/4 ＝ 0.75'}),
'6N3':spec('percent','整塊100格，代表100%','百分數｜100等份｜全部','一整塊平均分成100格。｜塗25格，就是25%。｜25%＝25/100＝1/4＝0.25。'),
'6N4':spec('calculation','先找清楚：哪個是全部？','全部｜百分率｜增加量','原有200本書，增加10%。｜增加量：200×10%＝20本。｜新數量：200＋20＝220本。',{rows:['全部 200本','10% → 20本','200 ＋ 20 ＝ 220本']}),
'6A1':spec('calculation','每一步，兩邊做同一操作','消去加減｜消去乘除｜檢查','0.5x＋2＝5，兩邊先減2。｜得到0.5x＝3，兩邊再除以0.5。｜x＝6；代回原式，0.5×6＋2＝5。',{rows:['0.5x ＋ 2 ＝ 5','0.5x ＝ 3','x ＝ 6']}),
'6M1':spec('angle','由起邊的0，讀到另一邊','頂點｜起邊｜度','先把量角器中心對準頂點。｜起邊要對準0刻度。｜圖中的角是60°；看張開程度，不看邊長。',{degrees:60}),
'6M2':spec('unit','同一空間，不同單位','立方厘米｜毫升｜內部尺寸','1立方厘米和1毫升表示相同大小的容積。｜容量要用容器內部尺寸。｜內部體積1000立方厘米，可容納1升。',{a:'1 立方厘米',b:'1 毫升',result:'1000毫升＝1升'}),
'6M3':spec('circle','沿圓邊，繞一圈','半徑｜直徑｜圓周','先找穿過圓心的直徑。｜圓周＝π×直徑。｜如果只知道半徑，先乘2變成直徑。',{label:'圓周 ＝ π × 直徑'}),
'6M4':spec('speed','每一小時，走了多遠？','路程｜時間｜速率','3小時走了180公里。｜平均每小時，走180÷3公里。｜速率是60公里／小時。'),
'6M5':spec('circle','算圓裏面，要用半徑','半徑｜平方｜圓面積','先找到圓心到圓邊的半徑。｜圓面積＝π×半徑×半徑。｜這是裏面的面積，不是外邊的長度。',{label:'圓面積 ＝ π × 半徑 × 半徑',area:true}),
'6S1':spec('symmetry','像照鏡子，兩邊相對','對稱軸｜同一行｜相同距離','中間虛線是對稱軸。｜同一行的兩格，離虛線一樣遠。｜沿虛線對摺，兩邊完全重疊。'),
'6D1':spec('average','總數不變，平均分開','總和｜項目數｜平均數','三組分別有2、4、6個圓點。｜合起來12個，平均分成3組。｜12÷3＝4，平均數是4。'),
'6D2':spec('line','沿時間，看看數據變化','先後次序｜數值｜增加量','按橫軸次序，讀出三天的數值。｜第一天10，第二天20，第三天15。｜第一到第二天增加10，第二到第三天減少5。'),
'6D3':spec('pie','一個圓，代表全部','全部｜各部分｜100%','整個圓代表全部，也就是100%。｜紫色部分佔一半，是50%。｜其餘兩部分各25%，合起來仍是100%。'),
'6D4':spec('chartcheck','看清刻度，才比較','標題｜單位｜起點刻度','先看看標題和單位。｜兩棒分別是90本和100本，只相差10本。｜如果縱軸不是由0開始，差距可能看起來特別大。')
};
function get(u){return M[u.code]||spec('explore','試一個例子，再換一個','動手試｜換方法｜說發現','先用實物或紙筆試一個例子。｜換另一種方法，看看有甚麼改變。｜把你的發現畫下來，或寫成短句。');}
function picture(u,stage=0,compact=false){const d=get(u),p=d.params;let h='',kind=d.kind;
if(kind==='count')h=rect(158,44,284,130)+dots(8,190,82,P.purple,5,54)+text(300,228,stage?'5 ＋ 3 ＝ 8':'一共有幾個？',32);
else if(kind==='add')h=rect(72,57,184,111)+dots(3,116,110,P.purple,3,48)+text(300,121,'＋',42)+rect(345,57,184,111,'#fff0ca')+dots(2,404,110,'#b8790d',2,54)+text(300,228,stage?'3 ＋ 2 ＝ 5':'3個　和　2個',32);
else if(kind==='place'){const w=Math.min(115,520/p.digits.length),x=300-p.digits.length*w/2;h=p.digits.map((n,i)=>rect(x+i*w+3,45,w-6,158,i%2?'#fff1c9':P.pale)+text(x+(i+.5)*w,89,p.labels[i]+'位',20)+text(x+(i+.5)*w,161,n,52)).join('')+text(300,249,p.digits.join(''),30);}
else if(kind==='money'){const w=500/p.values.length;h=p.values.map((v,i)=>{const x=50+w*(i+.5);return (p.notes?rect(x-77,65,154,100,i%2?'#ffe4da':'#dff5eb'):dot(x,119,52,i%2?P.gold:'#fae9be'))+text(x,129,v+'元',30)}).join('')+text(300,245,stage?p.values.join(' ＋ ')+' ＝ '+p.values.reduce((a,b)=>a+b,0)+'元':'先看面額',28);}
else if(kind==='length')h=line(105,38,105,216,P.red,3,'stroke-dasharray="6 6"')+grid(5,1,110,58,70)+grid(3,1,110,156,70)+text(480,107,'5塊')+text(340,204,'3塊');
else if(kind==='ruler')h=rect(90,75,280,35,P.purple,6)+rect(70,143,465,66,'#fff0cb',8)+Array.from({length:7},(_,i)=>line(90+i*70,143,90+i*70,166)+text(90+i*70,195,i,18)).join('')+text(300,249,'0 → 4　長4厘米',26);
else if(kind==='clock'){const cx=300,cy=132,r=102,ma=p.minute*Math.PI/30-Math.PI/2,ha=(p.hour%12+p.minute/60)*Math.PI/6-Math.PI/2;h=dot(cx,cy,r+9,'#dcd2fa')+dot(cx,cy,r,'#fff');for(let n=1;n<=12;n++){const a=n*Math.PI/6-Math.PI/2;h+=text(cx+83*Math.cos(a),cy+83*Math.sin(a)+6,n,19);}h+=line(cx,cy,cx+72*Math.cos(ma),cy+72*Math.sin(ma),P.purple,6)+line(cx,cy,cx+48*Math.cos(ha),cy+48*Math.sin(ha),'#bd660d',9)+dot(cx,cy,8,P.ink)+text(300,268,p.hour+'時'+(p.minute?p.minute+'分':''),23);}
else if(kind==='solid'||kind==='cubes'){const cube=(x,y,s)=>`<path d="M${x} ${y}l${s} -${s*.45} ${s} ${s*.45}v${s}l-${s} ${s*.45}-${s}-${s*.45}Z" fill="#dfd7fa" stroke="${P.purple}" stroke-width="3"/><path d="M${x} ${y}l${s} ${s*.45} ${s}-${s*.45}M${x+s} ${y+s*.45}v${s}" fill="none" stroke="${P.purple}" stroke-width="3"/>`;if(kind==='solid')h=cube(103,88,65)+dot(415,127,68,P.blue)+`<path d="M385 90q20-28 48-3" fill="none" stroke="#e9faff" stroke-width="12" stroke-linecap="round"/>`+text(166,247,'正方體')+text(415,247,'球');else h=[0,1,2].map((v)=>grid(3,2,52+v*185,62,48)+text(122+v*185,204,`第${v+1}層：6粒`,20)).join('')+text(300,262,'3 × 2 × 3 ＝ 18 立方厘米',26)+text(300,30,'逐層從上面看',18);}
else if(kind==='shapes'||kind==='position'){h=dot(125,117,49,P.blue)+rect(245,65,107,107,P.purple,3)+`<path d="M420 172L477 64l56 108Z" fill="${P.gold}"/>`;h+=text(125,229,kind==='position'?'左邊':'圓形')+text(298,229,kind==='position'?'中間':'正方形')+text(477,229,kind==='position'?'右邊':'三角形');}
else if(kind==='groups'||kind==='share'){h=Array.from({length:p.groups},(_,i)=>rect(37+i*186,42,160,140,i%2?'#fff0ca':P.pale)+dots(p.each,74+i*186,80,P.purple,2,47)+text(117+i*186,218,'4個',23)).join('');if(kind==='share')h+=dot(286,255,11,P.red)+text(355,262,'剩1個',19);else h+=text(300,265,'4 × 3 ＝ 12',28);}
else if(kind==='unit')h=rect(28,60,233,125,P.pale)+text(145,132,p.a,29)+text(300,132,'＝',40)+rect(338,60,233,125,'#fff0ca')+text(455,132,p.b,29)+text(300,244,p.result,25);
else if(kind==='prism')h=`<path d="M145 185L335 205L405 85L215 65Z" fill="#ffecc6" stroke="${P.purple}" stroke-width="3"/><path d="M215 65L405 85L475 205L285 185Z" fill="#d6c7f5" stroke="${P.purple}" stroke-width="3"/><path d="M145 185L215 65L285 185Z" fill="#eee4ff" stroke="${P.purple}" stroke-width="4"/><path d="M335 205L405 85L475 205Z" fill="none" stroke="${P.purple}" stroke-width="3" stroke-dasharray="7 5"/><path d="M285 185L475 205" stroke="${P.purple}" stroke-width="3"/>`+text(300,265,'兩端都是相同的三角形',25);
else if(kind==='angle'){const angle=(x,y,size)=>{const a=p.degrees*Math.PI/180;return line(x,y,x+size,y)+line(x,y,x+size*Math.cos(a),y-size*Math.sin(a))+`<path d="M${x+40} ${y} A40 40 0 0 0 ${x+40*Math.cos(a)} ${y-40*Math.sin(a)}" fill="none" stroke="${P.red}" stroke-width="5"/>`+dot(x,y,6,P.purple)};h=p.compare?angle(80,195,150)+angle(370,195,85)+text(300,260,'邊長不同，張開程度相同',26):angle(215,205,180)+text(365,169,'60°',32)+text(300,267,'起邊的0 → 另一邊',24);}
else if(kind==='compass'){h=dot(300,140,78,'#f0ebfe')+line(300,55,300,221,P.purple)+line(210,140,390,140,P.purple)+text(300,32,'北')+text(300,267,'南')+text(420,149,'東')+text(179,149,'西');if(p.eight){h+=line(245,85,355,195,P.blue)+line(245,195,355,85,P.blue);[[404,67,'東北'],[404,239,'東南'],[190,239,'西南'],[190,67,'西北']].forEach(t=>h+=text(...t,19));}}
else if(kind==='rectangle'||kind==='quadrilateral'){h=rect(95,66,172,117,P.purple,2)+rect(362,57,135,135,P.blue,2)+text(181,236,'長方形')+text(430,236,'正方形');if(kind==='quadrilateral')h+=text(300,274,'正方形也有四條相等的邊',20);}
else if(kind==='pictograph')h=text(95,82,'甲組')+dots(3,205,74,P.purple,5,55)+text(95,157,'乙組')+dots(5,205,149,P.blue,5,55)+dot(197,225,11,P.purple)+text(325,233,'1個圓點＝1本書',22);
else if(kind==='calculation'||kind==='multiply'||kind==='order'){h=p.rows.map((v,i)=>{const y=28+i*(220/p.rows.length);return rect(45,y,510,220/p.rows.length-7,i===stage?'#fff0c7':i%2?'#f3f1fa':'#eae3fd')+text(300,y+220/p.rows.length*.64,v,v.length>24?19:v.length>16?22:29)}).join('');}
else if(kind==='decimaladd')h=rect(145,24,310,219,'#f1eafb')+text(310,82,'1.20',39)+text(310,143,'0.35',39)+text(207,143,'＋',29)+line(212,163,400,163,P.purple,3)+text(310,216,'1.55',39);
else if(kind==='cubeparts')h=`<path d="M210 90L260 45H390L340 90Z" fill="#e7dcff"/><path d="M340 90L390 45V175L340 220Z" fill="#c2ddea"/><path d="M210 90H340V220H210Z" fill="#e6d6f6"/><path d="M210 90H340V220H210ZM210 90L260 45H390V175L340 220M340 90L390 45" fill="none" stroke="${P.purple}" stroke-width="4"/><path d="M260 45V175H390M260 175L210 220" fill="none" stroke="${P.purple}" stroke-width="2" stroke-dasharray="5 5"/>`+[[210,90],[340,90],[340,220],[210,220],[260,45],[390,45],[390,175],[260,175]].map(([x,y])=>dot(x,y,5,P.ink)).join('')+text(270,137,'面',23)+text(430,128,'稜',23)+line(412,133,391,140,P.ink,2)+text(161,222,'頂',23)+line(179,216,208,220,P.ink,2)+text(300,269,'6個面 · 12條稜 · 8個頂',25);
else if(kind==='fraction'){const den=p.den,num=p.num,rows=Math.ceil(num/den),w=400/den;h=Array.from({length:rows},(_,r)=>Array.from({length:den},(_,i)=>rect(100+i*w,45+r*70,w-4,56,r*den+i<num?P.purple:'#e7e3ef',5)).join('')).join('')+text(300,244,p.label||(num>den?'5/4 ＝ 1又1/4':num+'/'+den),36);}
else if(kind==='timeline')h=line(75,145,515,145,P.purple,5)+[75,250,515].map(x=>line(x,132,x,158)).join('')+text(75,199,'10:50',23)+text(250,199,'11:00',23)+text(515,199,'11:15',23)+text(160,115,'10分鐘',24)+text(385,115,'15分鐘',24)+text(300,260,'10 ＋ 15 ＝ 25 分鐘',27);
else if(kind==='capacity')h=rect(200,35,180,195,'#e3f1f8',8)+rect(204,133,172,93,P.blue,2)+Array.from({length:5},(_,i)=>line(350,228-i*47,375,228-i*47)+text(438,235-i*47,i*250+' mL',17)).join('')+text(285,263,'500毫升',25);
else if(kind==='parallel')h=line(105,93,505,93,P.purple,7)+line(105,169,505,169,P.blue,7)+text(300,248,'一直延長，也不相交',27);
else if(kind==='triangle'){h=`<path d="M70 197L165 49l95 148Z" fill="#e5dcfc" stroke="${P.purple}" stroke-width="4"/><path d="M353 197L436 53l83 144Z" fill="#fff1c9" stroke="#bb831b" stroke-width="4"/>`+text(165,241,'等腰三角形',22)+text(436,241,'等邊三角形',22);}
else if(kind==='bar'||kind==='doublebar'||kind==='line'||kind==='chartcheck'){const vals=kind==='doublebar'?[10,15,20,10]:kind==='line'?[10,20,15]:kind==='chartcheck'?[90,100]:p.values,scale=p.scale||(kind==='chartcheck'?20:5),max=kind==='chartcheck'?5:Math.ceil(Math.max(...vals)/scale),base=218,height=160,maxVal=max*scale;
for(let n=0;n<=max;n++){const y=base-height*n/max;h+=line(89,y,548,y,'#dce2ed',1)+text(64,y+5,n*scale,16);}h+=text(98,25,kind==='line'?'分鐘':'本數',17);
if(kind==='line'){const points=vals.map((v,i)=>[155+i*153,base-v/maxVal*height]);h+=`<polyline points="${points.map(t=>t.join(',')).join(' ')}" fill="none" stroke="${P.purple}" stroke-width="5"/>`;points.forEach(([x,y],i)=>h+=dot(x,y,7,P.purple)+text(x,y-13,vals[i],20)+text(x,251,'第'+(i+1)+'天',19));}
else vals.forEach((v,i)=>{const w=kind==='doublebar'?73:115,x=kind==='doublebar'?137+i*87+Math.floor(i/2)*26:138+i*145;h+=rect(x,base-v/maxVal*height,w,v/maxVal*height,kind==='doublebar'&&i%2?P.gold:P.purple,4)+text(x+w/2,base-v/maxVal*height-10,v,20);if(kind!=='doublebar')h+=text(x+w/2,251,['甲','乙','丙'][i],19);});
if(kind==='doublebar')h+=text(211,256,'第一天',20)+text(411,256,'第二天',20)+text(380,26,'紫：甲館　金：乙館',18);}
else if(kind==='factors')h=grid(4,3,196,36,49)+text(300,246,'3行 × 每行4個 ＝ 12',28);
else if(kind==='common'){h=text(75,95,'4的倍數',18)+text(75,178,'6的倍數',18);[[4,8,12,16,20],[6,12,18,24,30]].forEach((arr,r)=>arr.forEach((v,i)=>{h+=rect(147+i*83,53+r*84,73,60,v===12?'#f8d67d':P.pale)+text(183+i*83,92+r*84,v,26)}));h+=text(300,262,'最小的共同倍數：12',26);}
else if(kind==='decimal'||kind==='percent')h=grid(10,10,57,22,23,kind==='decimal'?50:25)+text(437,101,kind==='decimal'?'0.50':'25%',47)+text(437,159,kind==='decimal'?'＝ 0.5':'＝ 1/4',29)+text(437,205,'整塊＝1',23);
else if(kind==='perimeter')h=rect(147,58,302,147,'#f1ebfb',0)+`<rect x="147" y="58" width="302" height="147" fill="none" stroke="${P.purple}" stroke-width="7" stroke-dasharray="13 7"/>`+text(300,38,'6厘米',24)+text(503,140,'4厘米',22)+text(300,259,'6 ＋ 4 ＋ 6 ＋ 4 ＝ 20厘米',25);
else if(kind==='area')h=grid(4,3,192,30,54)+text(425,123,'3行',22)+text(300,228,'每行4格',24)+text(300,269,'12 平方厘米',26);
else if(kind==='cut')h=rect(70,65,190,110,P.purple,0)+line(165,65,165,175,'#fff',3,'stroke-dasharray="6 5"')+text(304,133,'→',42)+rect(365,50,95,110,P.purple,0)+rect(465,114,95,110,P.gold,0)+text(300,265,'同樣的兩片，沒有重疊',25);
else if(kind==='round')h=text(300,85,'24 600',55)+text(300,133,'看百位的6',26)+text(300,177,'↓  千位進1',26)+rect(151,199,298,63,'#fff0c7')+text(300,243,'25 000',39);
else if(kind==='fractionadd'){h=rect(65,48,230,47,P.purple,4)+rect(299,48,230,47,'#e5e1ee',4)+text(561,82,'1/2',21);h+=Array.from({length:4},(_,i)=>rect(65+i*117,124,112,48,i<3?i<2?P.purple:P.gold:'#e5e1ee',4)).join('')+text(300,247,'2/4 ＋ 1/4 ＝ 3/4',31);}
else if(kind==='fractionmul')h=Array.from({length:6},(_,i)=>rect(169+i%3*87,44+Math.floor(i/3)*76,83,72,i===0?P.purple:i<3?'#cac0ee':'#edeaf4',4)).join('')+text(300,250,'1/2 × 1/3 ＝ 1/6',32);
else if(kind==='fractiondiv')h=[0,1,2,3].map((n)=>rect(68+n*117,63,109,113,n%2?P.gold:P.purple,6)+text(123+n*117,132,'1/2',27,n%2?P.ink:'#fff')).join('')+text(300,252,'2 ÷ 1/2 ＝ 4',32);
else if(kind==='algebra')h=Array.from({length:4},(_,i)=>rect(63+i*121,54,108,115,i%2?'#fff0c7':P.pale)+text(117+i*121,125,'x',48)).join('')+text(300,244,'x ＋ x ＋ x ＋ x ＝ 4x',28);
else if(kind==='balance')h=line(88,152,512,152,P.ink,6)+`<path d="M300 153L260 223h80Z" fill="${P.gold}"/>`+rect(94,61,176,70,P.pale)+text(182,108,'x ＋ 3',34)+rect(338,61,176,70,'#def3eb')+text(426,108,'8',38)+text(300,265,'兩邊都減3 → x ＝ 5',28);
else if(kind==='trianglearea')h=`<path d="M130 192L221 57l244 135Z" fill="${P.purple}"/><path d="M221 57l244 135 91-135Z" fill="${P.gold}"/>`+line(221,57,221,192,P.ink,3,'stroke-dasharray="6 5"')+text(201,139,'高',20)+text(296,218,'底',21)+text(300,270,'三角形面積 ＝ 底 × 高 ÷ 2',25);
else if(kind==='circle')h=dot(300,125,93,p.area?'#dcd3f7':'#f7f3ff')+`<circle cx="300" cy="125" r="93" fill="none" stroke="${P.purple}" stroke-width="5"/>`+line(207,125,393,125,P.blue,5)+line(300,125,346.5,44.5,'#c77c18',5)+dot(300,125,6,P.ink)+text(282,154,'圓心',18)+text(331,74,'半徑',18)+text(251,115,'直徑',18)+text(300,261,p.label||'直徑 ＝ 2 × 半徑',p.area?23:27);
else if(kind==='speed')h=line(68,105,535,105,P.purple,6)+[0,1,2,3].map((v)=>dot(70+v*153,105,10,v===3?P.red:P.purple)+text(70+v*153,150,v+'小時',20)+text(70+v*153,72,v*60+'km',20)).join('')+text(300,241,'180 ÷ 3 ＝ 60 公里／小時',28);
else if(kind==='symmetry'){for(let i=0;i<48;i++){const x=i%8,r=Math.floor(i/8),on=[[2,1],[3,2],[2,3],[1,4]].some(t=>t[1]===r&&(x===t[0]||x===7-t[0]));h+=rect(144+x*39,23+r*36,36,33,on?P.purple:'#edeaf4',3);}h+=line(298,13,298,247,P.red,3,'stroke-dasharray="5 5"')+text(300,273,'對稱軸',21);}
else if(kind==='average'){h=[2,4,6].map((n,i)=>dots(stage===2?4:n,132+i*161,65,P.purple,2,34)+text(149+i*161,203,stage===2?'4個':n+'個',22)).join('')+text(300,260,'(2 ＋ 4 ＋ 6) ÷ 3 ＝ 4',29);}
else if(kind==='pie')h=dot(300,126,100,P.purple)+`<path d="M300 126V26a100 100 0 0 1 0 200Z" fill="${P.gold}"/><path d="M300 126h100a100 100 0 0 1-100 100Z" fill="${P.blue}"/>`+text(255,133,'50%',26,'#fff')+text(345,89,'25%',22)+text(345,184,'25%',22)+text(300,269,'50% ＋ 25% ＋ 25% ＝ 100%',24);
else h=rect(125,30,228,193,'#fff',13)+rect(125,30,25,193,P.purple,7)+[75,115,155,195].map(y=>line(174,y,320,y,'#d9d0ea',3)).join('')+`<path d="M338 177L426 56l22 16-88 121-31 13Z" fill="${P.gold}" stroke="#b77f18" stroke-width="3"/>`+text(477,161,'?',63)+text(300,268,'試一試　換一換　說一說',26);
return `<svg class="math-picture" viewBox="0 0 600 290" ${compact?'aria-hidden="true"':'role="img" aria-label="'+esc(d.caption)+'"'} xmlns="http://www.w3.org/2000/svg"><title>${esc(d.caption)}</title>${h}</svg>`;
}
function chunks(value){return String(value||'').split(/(?<=[。！？；])/u).map(s=>s.trim()).filter(Boolean);}
function deck(u,part){const d=get(u),l=u.lessons[part-1];let cards=d.steps.map((body,i)=>({title:['先看看','一起做','記住這招'][i],body,artStage:i}));if(part===2){cards=[{title:'用圖溫習',body:d.steps[0],artStage:0},{title:'說說你的方法',body:d.steps[1],artStage:1},{title:'想多一步',body:u.reasonPrompt||u.reason||d.steps[2],artStage:2,showPicture:false}];const source=chunks(l.intro||'').concat((l.steps||[]).flatMap(chunks));if(source.length)cards.push(...source.map(body=>({title:'本課小重點',body,artStage:2,showPicture:false})));else cards.push({title:'檢查方法',body:u.reason||d.steps[2],artStage:2,showPicture:false});}return cards;}
root.WQCourseVisuals=Object.freeze({get,picture,deck,chunks,codes:Object.keys(M),version:'HK-M2.0'});
})(globalThis);

