'use strict';
/* All prices generated here are fictional fixtures, never live quotations. */
window.SMART_DATA={
 demoDate:'2026-10-02',
 sources:[
  {id:'agmarknet',name:'Agmarknet daily prices',url:'https://agmarknet.gov.in/daily-price-and-arrival-report',note:'Reported market prices and arrivals; verify commodity, variety, unit and reporting date.'},
  {id:'ogd',name:'OGD India mandi dataset',url:'https://www.data.gov.in/resource/current-daily-price-various-commodities-various-markets-mandi',note:'A backend connector must use authorized access, validate units and preserve each row\'s arrival date.'},
  {id:'enam',name:'e-NAM trade dashboard',url:'https://enam.gov.in/web/dashboard/trade-data',note:'Reference trade reporting for supported commodities/markets; coverage varies.'},
  {id:'quality',name:'e-NAM commodity quality',url:'https://enam.gov.in/commodity/commodity-quality',note:'Commodity-specific assaying parameters; ordinary photos cannot certify these measurements.'}
 ],
 facts:{
  crops:[['moisture','Moisture (%)','తేమ (%)','number',0,100],['foreign','Foreign matter (%)','ఇతర పదార్థాలు (%)','number',0,100],['damaged','Damaged / broken (%)','పాడైన / విరిగిన (%)','number',0,100],['weight','Measured lot weight (kg)','కొలిచిన బరువు (kg)','number',0,10000000],['testDate','Test date','పరీక్ష తేదీ','date']],
  produce:[['harvest','Harvest date','పంట కోసిన తేదీ','date'],['condition','Ripeness / condition','పక్వం / స్థితి','text'],['damage','Sorting / damage notes','లోపాలు / వర్గీకరణ','text'],['weight','Measured lot weight (kg)','కొలిచిన బరువు (kg)','number',0,10000000],['temperature','Storage temperature (°C)','నిల్వ ఉష్ణోగ్రత (°C)','number',-20,50]],
  cattle:[['age','Age (years, declared)','వయస్సు (ప్రకటన)','number',0,35],['weight','Measured animal weight (kg)','కొలిచిన పశువు బరువు (kg)','number',0,1500],['yield','Observed daily milk (litres)','కొలిచిన రోజు పాలు (లీటర్లు)','number',0,100],['lactation','Lactation / calving record','ఈత / పాల రికార్డు','text'],['vetDate','Veterinary assessment date','పశువైద్య తనిఖీ తేదీ','date']],
  smallstock:[['age','Age (months, declared)','వయస్సు (నెలలు)','number',0,240],['weight','Measured average weight (kg)','కొలిచిన సగటు బరువు (kg)','number',0,200],['count','Count physically checked','చూసిన సంఖ్య','number',0,100000],['records','Vaccine / ownership records','టీకా / యాజమాన్య రికార్డు','text'],['vetDate','Veterinary assessment date','పశువైద్య తనిఖీ తేదీ','date']],
  poultry:[['age','Age (days, declared)','వయస్సు (రోజులు)','number',0,3000],['weight','Measured average live weight (kg)','కొలిచిన సగటు బరువు (kg)','number',0,30],['count','Bird count physically checked','చూసిన కోళ్ల సంఖ్య','number',0,1000000],['records','Batch / vaccine record','బ్యాచ్ / టీకా రికార్డు','text'],['vetDate','Veterinary assessment date','పశువైద్య తనిఖీ తేదీ','date']],
  eggs:[['collection','Collection date','సేకరించిన తేదీ','date'],['weight','Average egg weight (g)','సగటు గుడ్డు బరువు (g)','number',0,150],['breakage','Declared breakage (%)','విరిగినవి (%)','number',0,100],['packing','Tray / packing condition','ట్రే / ప్యాకింగ్ స్థితి','text'],['batch','Batch / fertility records','బ్యాచ్ / పొదిగే రికార్డు','text']],
  aqua:[['harvest','Harvest / collection date','పంట / సేకరణ తేదీ','date'],['weight','Measured average size (g)','కొలిచిన సగటు పరిమాణం (g)','number',0,50000],['count','Count per kg, if applicable','kgకు సంఖ్య, వర్తిస్తే','number',0,100000],['temperature','Measured handling temperature (°C)','కొలిచిన ఉష్ణోగ్రత (°C)','number',-20,50],['testDate','Sample / health test date','నమూనా / ఆరోగ్య పరీక్ష తేదీ','date']],
  dairy:[['collection','Collection date','సేకరించిన తేదీ','date'],['fat','Measured fat (%)','కొలిచిన కొవ్వు (%)','number',0,30],['snf','Measured SNF (%)','కొలిచిన SNF (%)','number',0,30],['temperature','Measured temperature (°C)','కొలిచిన ఉష్ణోగ్రత (°C)','number',-20,50],['testDate','Milk quality test date','పాల నాణ్యత పరీక్ష తేదీ','date']]
 },
 checks:{
  crops:['Representative lot sampling','Moisture meter / assay','Foreign matter and damaged grain','Calibrated weighment and correct variety'],
  produce:['Fresh physical sample and sorting','Ripeness, bruising and mixed grades','Weighment, packing and collection time','Handling / transport temperature if needed'],
  cattle:['Independent veterinary assessment','Ownership and animal identification','Observe milking and check records if dairy','Age, pregnancy and weight need independent evidence'],
  smallstock:['Veterinary assessment and vaccination records','Weigh animals using a scale','Check count, age and ownership','Assess travel suitability separately'],
  poultry:['Flock records and independent assessment','Confirm count and measured live weight','Check age, batch and movement records','Video activity alone cannot prove flock health'],
  eggs:['Check sample breakage, size and packing','Confirm collection date and batch','Hatching fertility needs separate records/testing','Agree rejection and breakage terms'],
  aqua:['Confirm species, size grade and count/kg','Sample testing and measured weighment','Confirm temperature and handling route','Disease, residues and freshness need suitable checks'],
  dairy:['Test fat, SNF and relevant milk quality','Confirm collection time and temperature','Measure volume and agree acceptance tests','Adulteration and pathogens cannot be checked from media']
 },
 capture:{
  crops:'Show a spread-out sample, the full lot, bags and a scale; avoid filters.',
  produce:'Show close-ups, different sides, mixed crates and a short sorting video.',
  cattle:'Show both sides, identification and a clear walking clip; dairy listings can add an uncut milking record.',
  smallstock:'Show individual animals and the whole flock; include a scale and a short walking clip.',
  poultry:'Show the flock, batch identification, a sample scale reading and a short continuous clip.',
  eggs:'Show trays, a close-up, collection/batch label and packing; do not infer fertility from appearance.',
  aqua:'Show the lot, grading/count and a scale; record harvest/handling time separately.',
  dairy:'Show labelled containers and collection records; include measured test results separately.'
 }
};
window.SMART_DATA.products=window.MARKET_DATA.listings.map(p=>({id:'P'+p.id.slice(1),seedId:p.id,cat:p.cat,label:p.title,te:p.te,commodity:p.sub,unit:p.unit,variety:p.specs.find(x=>['Variety','Breed','Species','Type'].includes(x[0]))?.[1]||p.sub,grade:['crops','produce'].includes(p.cat)?'Unspecified':'Not applicable',demoBase:p.price}));
window.SMART_DATA.demoRecords=[];
for(const p of window.SMART_DATA.products){
 const areas=p.seedId==='L105'?['Khammam','Warangal','Hyderabad']:['Guntur','Tenali','Vijayawada'];
 for(let marketIndex=0;marketIndex<3;marketIndex++)for(let day=0;day<7;day++){
  const date=new Date(Date.UTC(2026,9,2-day)).toISOString().slice(0,10),modal=Math.round(p.demoBase*(1+[-.025,0,.035][marketIndex]-day*.003)*100)/100;
  window.SMART_DATA.demoRecords.push({id:'DEMO-'+p.id+'-'+marketIndex+'-'+date,productId:p.id,commodity:p.commodity,variety:p.variety,grade:p.grade,unit:p.unit,state:p.seedId==='L105'?'Telangana':'Andhra Pradesh',district:areas[marketIndex],market:areas[marketIndex]+' (demo market)',date,min:Math.round(modal*.92*100)/100,modal,max:Math.round(modal*1.08*100)/100,sourceKind:['crops','produce'].includes(p.cat)?'mandi':'asking',sourceName:['crops','produce'].includes(p.cat)?'Illustrative mandi fixture':'Illustrative regional asking prices',sourceURL:'',provenance:'demo',demo:true});
 }
}
