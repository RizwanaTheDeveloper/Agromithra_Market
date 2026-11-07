'use strict';
(function(){
 const D=window.SMART_DATA;
 const norm=v=>String(v||'').normalize('NFKC').toLowerCase().replace(/[^a-z0-9\u0c00-\u0c7f]+/g,' ').trim().replace(/\s+/g,' ');
 const day=()=>new Date(Date.now()+19800000).toISOString().slice(0,10);
 function date(value){let s=String(value||'').trim();let m=s.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);if(m)s=m[3]+'-'+m[2]+'-'+m[1];if(!/^\d{4}-\d{2}-\d{2}$/.test(s))throw new Error('Missing or invalid reporting date');const d=new Date(s+'T00:00:00Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==s)throw new Error('Invalid reporting date');return s;}
 const age=(reported,asOf=day())=>Math.round((Date.parse(asOf+'T00:00:00Z')-Date.parse(reported+'T00:00:00Z'))/86400000);
 function number(v){if(v===null||v===undefined||String(v).trim()==='')return NaN;return Number(String(v).replace(/[₹,]/g,'').trim());}
 const median=values=>{const a=values.filter(Number.isFinite).sort((a,b)=>a-b);return a.length?(a[Math.floor(a.length/2)]+a[Math.ceil(a.length/2)-1])/2:null;};
 const factors={kg:['weight',1],quintal:['weight',100],tonne:['weight',1000],egg:['egg',1],tray30:['egg',30],animal:['animal',1],bird:['bird',1],litre:['litre',1],fish:['fish',1]};
 function unit(v){const s=String(v||'').toLowerCase().trim();return ({qtl:'quintal',quintals:'quintal',kilogram:'kg',kilograms:'kg',tonnes:'tonne',liter:'litre',litres:'litre',liters:'litre',eggs:'egg',birds:'bird',animals:'animal','30-egg tray':'tray30','30 egg tray':'tray30','fish seed':'fish'})[s]||s;}
 function convert(price,from,to){from=unit(from);to=unit(to);if(!factors[from]||!factors[to]||factors[from][0]!==factors[to][0])return null;return price/factors[from][1]*factors[to][1];}
 function inferProduct(item){if(item.analysisProfile?.productId)return D.products.find(p=>p.id===item.analysisProfile.productId&&p.cat===item.cat);return D.products.find(p=>p.seedId===item.id)||D.products.find(p=>p.cat===item.cat&&norm(p.label)===norm(item.title));}
 const areaKey=r=>[r.state,r.district,r.market].map(norm).join('|');
 function csv(text){
  const rows=[];let row=[],cell='',quoted=false;
  const s=String(text).replace(/^\uFEFF/,'');
  for(let i=0;i<s.length;i++){const c=s[i];if(c==='"'){if(quoted&&s[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&s[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';}else cell+=c;}
  if(quoted)throw new Error('Unclosed CSV quotation');row.push(cell);if(row.some(x=>x.trim()))rows.push(row);if(rows.length<2)throw new Error('CSV needs a header and at least one record');
  const heads=rows.shift().map(h=>h.trim());if(new Set(heads.map(norm)).size!==heads.length)throw new Error('Duplicate CSV headers');return rows.map(r=>{if(r.length!==heads.length)throw new Error('CSV column count does not match header');return Object.fromEntries(heads.map((h,i)=>[h,r[i]]));});
 }
 function fieldMap(raw){const o={};for(const [k,v]of Object.entries(raw)){const key=String(k).toLowerCase().replace(/_x0020_/g,'_').replace(/[\s_-]+/g,'');o[key]=v;}return o;}
 function aliases(p){const base=[p.label,p.te,p.commodity];const extra={P101:['Paddy','Paddy(Dhan)(Common)'],P102:['Maize'],P103:['Dry Chillies','Chilli','Red Chilli'],P104:['Groundnut','Groundnut with pods'],P105:['Cotton'],P106:['Tomato'],P107:['Banana'],P108:['Mango']};return [...base,...(extra[p.id]||[])].map(norm);}
 function normalizeFeed(input,options={}){
  let raw=typeof input==='string'?(input.trim().startsWith('{')||input.trim().startsWith('[')?JSON.parse(input):csv(input)):input;
  const rows=Array.isArray(raw)?raw:raw?.records;if(!Array.isArray(rows)||!rows.length)throw new Error('No records found');if(rows.length>1500)throw new Error('Use at most 1,500 records per import');
  const records=[],errors=[],asOf=options.asOf||day();
  for(let i=0;i<rows.length;i++)try{
   const o=fieldMap(rows[i]);let p=D.products.find(p=>p.id===String(o.productid||''));const commodity=String(o.commodity||'').trim();
   if(!p&&commodity){const matches=D.products.filter(p=>aliases(p).includes(norm(commodity)));if(matches.length===1)p=matches[0];else if(options.productId)p=matches.find(p=>p.id===options.productId);}
   if(!p&&options.productId&&!commodity)p=D.products.find(p=>p.id===options.productId);
   if(!p)throw new Error('Commodity not uniquely mapped to a supported product');
   const sourceKind=String(o.sourcekind||options.sourceKind||'mandi');if(!['mandi','asking','completed','processor'].includes(sourceKind))throw new Error('Unknown price source basis');
   if(sourceKind==='mandi'&&!['crops','produce'].includes(p.cat))throw new Error('Use a regional asking, completed trade or processor source for this segment');
   const priceUnit=unit(o.unit||options.unit);if(!factors[priceUnit])throw new Error('Confirm the price unit; no unit is assumed');
   if(convert(1,priceUnit,p.unit)===null)throw new Error('Price unit is incompatible with this product');
   const reported=date(o.date||o.arrivaldate);if(age(reported,asOf)<0)throw new Error('Future reporting dates are not accepted');
   const min=number(o.min??o.minprice),modal=number(o.modal??o.modalprice??o.price),max=number(o.max??o.maxprice);
   if(![min,modal,max].every(n=>Number.isFinite(n)&&n>0&&n<=1e9)||min>modal||modal>max)throw new Error('Check minimum ≤ modal ≤ maximum and positive prices');
   const state=String(o.state||'').trim().slice(0,70),district=String(o.district||'').trim().slice(0,70),market=String(o.market||'').trim().slice(0,100);if(!state||!district||!market)throw new Error('State, district and market are required');
   records.push({id:'IMPORT-'+Date.now().toString(36)+'-'+i,productId:p.id,commodity:commodity||p.commodity,variety:String(o.variety||'Unspecified').trim().slice(0,100),grade:String(o.grade||'Unspecified').trim().slice(0,100),unit:priceUnit,state,district,market,date:reported,min,modal,max,sourceKind,sourceName:String(o.sourcename||options.sourceName||'User-imported price record').slice(0,100),sourceURL:'',provenance:'user-imported-unverified',demo:false,importedAt:new Date().toISOString()});
  }catch(e){errors.push({row:i+1,message:e.message});}
  return {records,errors,total:rows.length};
 }
 function estimate(item,records,profile={},costs={},options={}){
  const p=profile.productId?D.products.find(x=>x.id===profile.productId&&x.cat===item.cat):inferProduct(item),asOf=options.asOf||day();
  const out={available:false,product:p||null,asOf,areas:[],range:null,reason:'Choose the matching product / type first.',fallback:false,sourceKind:null,count:0,marketCount:0,staleCount:0,excludedUnits:0,trend:null};if(!p)return out;
  const matches=records.filter(r=>r.productId===p.id&&(!profile.state||r.state===profile.state)&&(!profile.district||r.district===profile.district)&&(!profile.market||r.market===profile.market));
  let typed=matches.filter(r=>convert(r.modal,r.unit,item.unit)!==null);out.excludedUnits=matches.length-typed.length;
  const wanted=norm(profile.variety||p.variety),exact=typed.filter(r=>norm(r.variety)===wanted);
  if(exact.length)typed=exact;else if(profile.allowFallback&&['crops','produce'].includes(item.cat)){out.fallback=true;}else typed=[];
  if(profile.grade)typed=typed.filter(r=>norm(r.grade)===norm(profile.grade));
  if(profile.sourceKind)typed=typed.filter(r=>r.sourceKind===profile.sourceKind);
  const sources=new Set(typed.map(r=>r.sourceKind));if(sources.size>1){out.reason='Choose one price source basis. Asking and completed trade prices are not mixed.';return out;}out.sourceKind=[...sources][0]||null;
  const recent=typed.filter(r=>age(r.date,asOf)>=0&&age(r.date,asOf)<=2);out.staleCount=typed.length-recent.length;
  if(!recent.length){out.reason=typed.length?'Matched records are older than two days. Import newer reporting dates.':matches.length?'No exact variety / grade and compatible-unit reference. Adjust matching settings.':'No matching market records. Import a feed or choose demo replay.';return out;}
  const groups=new Map();for(const r of recent){const key=areaKey(r);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
  const q=Number(item.quantity);out.quantity=Number.isFinite(q)&&q>0?q:null;
  for(const [key,rows]of groups){const latest=rows.map(r=>r.date).sort().pop(),latestRows=rows.filter(r=>r.date===latest),values=['min','modal','max'].map(f=>median(latestRows.map(r=>convert(r[f],r.unit,item.unit))));
   const r=latestRows[0],cost=costs[key],entered=!!(cost&&out.quantity&&Number(cost.quantity)===out.quantity&&cost.unit===item.unit&&cost.productId===p.id),totalCost=entered?Number(cost.transport||0)+Number(cost.handling||0):null,fee=entered?Number(cost.fee||0)/100:0;
   const net=entered?values.map(v=>v*(1-fee)-totalCost/q):null;
   const historyRows=typed.filter(x=>areaKey(x)===key&&age(x.date,asOf)>=0&&age(x.date,asOf)<=6),dates=[...new Set(historyRows.map(x=>x.date))].sort();
   const history=dates.map(d=>({date:d,price:median(historyRows.filter(x=>x.date===d).map(x=>convert(x.modal,x.unit,item.unit)))}));
   const trend=history.length>=2&&history[0].price>0?(history[history.length-1].price/history[0].price-1)*100:null;
   out.areas.push({key,state:r.state,district:r.district,market:r.market,date:latest,ageDays:age(latest,asOf),min:values[0],modal:values[1],max:values[2],net,costEntered:entered,cost,history,trend,records:latestRows.length,sourceNames:[...new Set(latestRows.map(x=>x.sourceName))],varieties:[...new Set(latestRows.map(x=>x.variety))],grades:[...new Set(latestRows.map(x=>x.grade))],demo:latestRows.every(x=>x.demo),unverified:latestRows.some(x=>x.provenance==='user-imported-unverified')});
  }
  out.areas.sort((a,b)=>a.market.localeCompare(b.market));out.range=['min','modal','max'].map(f=>median(out.areas.map(a=>a[f])));out.marketCount=out.areas.length;out.count=recent.length;out.available=true;out.reason='';
  out.allCostsEntered=out.areas.every(a=>a.costEntered);out.netRange=out.allCostsEntered?[0,1,2].map(i=>median(out.areas.map(a=>a.net[i]))):null;
  out.bestNetArea=out.allCostsEntered?[...out.areas].sort((a,b)=>b.net[1]-a.net[1])[0]:null;
  out.askDifference=Number(item.price)>0?(Number(item.price)/out.range[1]-1)*100:null;
  out.coverage=out.marketCount>=3?'Three or more area references':out.marketCount>=2?'Two area references':'One area reference; thin coverage';
  return out;
 }
 function pixelMetrics(data,width,height){
  if(!data||data.length!==width*height*4||width<3||height<3)throw new Error('Invalid image pixel sample');const lum=new Float32Array(width*height);let total=0,dark=0,bright=0;
  for(let i=0;i<lum.length;i++){const x=.2126*data[i*4]+.7152*data[i*4+1]+.0722*data[i*4+2];lum[i]=x;total+=x;if(x<35)dark++;if(x>225)bright++;}
  let sum=0,sq=0,n=0;for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){const i=y*width+x,v=lum[i-1]+lum[i+1]+lum[i-width]+lum[i+width]-4*lum[i];sum+=v;sq+=v*v;n++;}
  return {brightness:Math.round(total/lum.length),darkPercent:Math.round(dark/lum.length*100),brightPercent:Math.round(bright/lum.length*100),edgeVariance:Math.round((sq/n-(sum/n)**2)*10)/10};
 }
 function readiness(metrics,width,height){const issues=[];if(Math.min(width,height)<480)issues.push('Small image dimensions');if(metrics.brightness<50||metrics.darkPercent>65)issues.push('Dark capture');if(metrics.brightness>205||metrics.brightPercent>65)issues.push('Bright / clipped capture');if(metrics.edgeVariance<40)issues.push('Low edge detail; inspect focus and subject');return {status:issues.length?'Retake may help':'No simple capture warning',issues,heuristic:true};}
 function fingerprint(item){return JSON.stringify((item.media||[]).map(m=>[m.id,m.kind,m.size,m.type]));}
 window.SmartEngine={norm,day,date,age,number,median,unit,convert,areaKey,csv,normalizeFeed,inferProduct,estimate,pixelMetrics,readiness,fingerprint};
})();
