from PIL import Image,ImageDraw
from pathlib import Path
import json,hashlib,base64,shutil
R=Path(__file__).resolve().parents[1];src=R/'r31_src';src.mkdir(exist_ok=True);out=R/'app/assets/forest';out.mkdir(parents=True,exist_ok=True)
rows=[
 ('owl','lie-lie','烈烈老師','烈烈老師森林學園角色設定.png',(226,212,508,506),(542,1147,971,1260)),
 ('fox','you-you','柚柚老師','柚柚老師的森林學園圖形課.png',(213,206,520,526),(539,1142,970,1260)),
 ('panda','tang-li','糖栗老師','糖栗老師的創意探索學園.png',(258,242,538,549),(531,1154,972,1265)),
 ('bee','bo-bo','波波','波波水獺數字學習角色誌.png',(219,318,522,617),(531,1136,973,1255)),
 ('star','ci-ci','刺刺','刺刺的森林學園學習指南.png',(203,294,523,614),(530,1128,971,1256)),
 ('rabbit','a-feng','阿峰','阿峰_山羊奧數同學角色設定.png',(219,266,535,582),(537,1166,967,1266)),
]
# Exact panel coordinates, independently adjusted to avoid gaps and printed labels.
faces={
 'owl':[(543,1147,624,1255),(631,1147,709,1255),(717,1147,798,1255),(804,1147,884,1255),(891,1147,971,1255)],
 'fox':[(539,1144,624,1256),(628,1144,710,1256),(717,1144,796,1256),(804,1144,884,1256),(891,1144,972,1256)],
 'panda':[(532,1154,615,1263),(620,1154,703,1263),(712,1154,796,1263),(804,1154,884,1263),(891,1154,973,1263)],
 'bee':[(531,1137,615,1250),(621,1137,705,1250),(711,1137,796,1250),(804,1137,886,1250),(894,1137,978,1250)],
 'star':[(531,1129,614,1248),(621,1129,705,1248),(711,1129,795,1248),(802,1129,885,1248),(893,1129,976,1248)],
 'rabbit':[(538,1165,622,1263),(627,1165,710,1263),(714,1165,796,1263),(802,1165,885,1263),(891,1165,972,1263)]
}
art={}; manifest={'version':'R3.1.0','provenance':'Six newly generated PNG posters in this conversation; NOT recovered V33 or Maths 0.1.3 originals.','processing':'Measured raster crops and WebP encoding; oval framing on six portrait avatars; no AI redraw, invented angles or full-body background-removal claims.','characters':[]}
contact=Image.new('RGB',(1200,6*205),'#f9f3e7');d=ImageDraw.Draw(contact)
for idx,(slot,cid,name,f,portrait,_) in enumerate(rows):
 target=out/cid;target.mkdir(exist_ok=True);source_path=target/'concept-original.png';im=Image.open(source_path)
 # Source PNGs are preserved unchanged in app/assets/forest/<id>/concept-original.png.
 entry={'slot':slot,'id':cid,'name':name,'source':f,'original_sha256':hashlib.sha256(im.fp.read()).hexdigest() if False else hashlib.sha256(source_path.read_bytes()).hexdigest(),'assets':[]}
 for pose,box in [('front',portrait)]+[(f'face{i}',box) for i,box in enumerate(faces[slot])]+[('sheet',(0,0,1122,1402))]:
  if pose.startswith('face'):
   x1,y1,x2,y2=box
   x2-=6
   if slot=='bee':y2-=14
   if slot=='rabbit':y2-=25
   box=(x1+1,y1,x2,y2)
  crop=im.crop(box)
  if pose=='front':
   # Intentional oval avatar frame, not an anatomical silhouette or a full-body cutout.
   from PIL import ImageFilter
   mask=Image.new('L',crop.size);ImageDraw.Draw(mask).ellipse((1,1,crop.width-2,crop.height-2),fill=255)
   crop=crop.convert('RGBA');crop.putalpha(mask.filter(ImageFilter.GaussianBlur(.55)))
  if pose=='front':crop.thumbnail((340,340),Image.Resampling.LANCZOS)
  elif pose=='sheet':crop.thumbnail((960,1200),Image.Resampling.LANCZOS)
  # Do not upscale small expression crops; native 80–85px images suit 44–72px UI.
  path=target/(pose+'.webp');crop.save(path,'WEBP',quality=92,method=6)
  art[slot+'-'+pose]='data:image/webp;base64,'+base64.b64encode(path.read_bytes()).decode()
  entry['assets'].append({'pose':pose,'crop':list(box),'width':crop.width,'height':crop.height,'path':str(path.relative_to(R/'app')),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
  if pose!='sheet':
   col=0 if pose=='front' else int(pose[-1])+1
   preview=crop.copy();preview.thumbnail((156,156)); x=col*200+(160-preview.width)//2;y=idx*205+27
   contact.paste(preview,(x,y),preview if preview.mode=='RGBA' else None);d.text((col*200+5,idx*205+7),cid+' '+pose,fill='#442e26')
 manifest['characters'].append(entry)
(src/'assets_data.js').write_text('/* R3.1: measured crops from newly generated posters, not recovered historical original art. */\nglobalThis.WQ32Art=Object.freeze('+json.dumps(art,separators=(',',':'))+');\n')
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
contact.save(R/'r31_crop_contact.jpg')
print('assets',len(art),'inline bytes',(src/'assets_data.js').stat().st_size)
