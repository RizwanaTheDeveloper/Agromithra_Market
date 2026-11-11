/* Connected forms show success only after the API has accepted the write. */
const workspaceAction=handleAction, workspaceForm=handleForm, workspaceMediaLoad=mediaLoad,
    workspaceInbox=inboxPage, workspaceChat=chatPage, workspaceBrowse=browse, workspaceRequest=requestForm,
    workspaceMediaEditor=mediaEditor, workspaceWelcome=welcome, workspaceOnboard=onboard, workspaceManage=manageListings;

function deviceListings() {
    try {return recoverDeviceListings();}
    catch (_) {return [];}
}
function completeDeviceListing(localId,serverId) {
    if (!localId) return;
    const backup=JSON.parse(localStorage.getItem('agromitra.market.local-backup.v1') || '{}');
    backup.listings=(backup.listings || []).filter(row=>row.id!==localId);
    backup.synced={...backup.synced,[localId]:serverId};
    localStorage.setItem('agromitra.market.local-backup.v1',JSON.stringify(backup));
}
manageListings=function() {
    const html=workspaceManage();
    if (!apiEnabled()) return html;
    const rows=deviceListings();
    if (state.listings.some(row=>row.own) && !rows.length) return html;
    const saved=state.listings.some(row=>row.own)?`<p class="small muted">${L('These listings are saved to your account.','ఈ లిస్టింగ్‌లు మీ ఖాతాలో సేవ్ అయ్యాయి.')}</p>`:'';
    const recovery=rows.length?`<section class="spaced"><h2>${L('Listings saved on this device','ఈ పరికరంలో సేవ్ చేసిన లిస్టింగ్‌లు')}</h2><p class="small muted">${L('These were created before account sync was enabled. Sign in, review and publish to save them to your account.','ఖాతా అనుసంధానానికి ముందు ఇవి సృష్టించారు. ఖాతాలో సేవ్ చేయడానికి సైన్ ఇన్ చేసి సమీక్షించి ప్రచురించండి.')}</p>${rows.map(row=>`<article class="card spaced"><div class="row"><div class="own-listing-cover">${listingCover(row)}</div><div><h3>${esc(row.title)}</h3><p class="small">${money(row.price)} / ${unit(row.unit)}</p><span class="tag gold">${L('Saved on this device','ఈ పరికరంలో సేవ్ అయ్యింది')}</span></div></div>${btn(L('Sync to my account','నా ఖాతాకు అనుసంధానించండి'),'sync-device-listing',row.id,'spaced')}</article>`).join('')}</section>`:'';
    return html.replace('</main>',`${saved}${recovery}<section class="card spaced"><h2>${L('Missing older listings?','పాత లిస్టింగ్‌లు కనిపించడం లేదా?')}</h2><p class="small muted">${L('Check the older app storage in this browser. This does not delete data or publish anything.','ఈ బ్రౌజర్‌లో పాత యాప్ నిల్వను తనిఖీ చేయండి. డేటా తొలగించదు లేదా ప్రచురించదు.')}</p><button class="btn secondary spaced" data-action="scan-device-listings" ${deviceScan.running?'disabled':''}>${L('Check older app storage','పాత యాప్ నిల్వను తనిఖీ చేయండి')}</button><p class="small spaced" role="status">${esc(deviceScan.message)}</p></section></main>`);
};
const deviceScan={running:false,message:''};
async function scanDeviceListings() {
    if (deviceScan.running) return;
    deviceScan.running=true;deviceScan.message=L('Checking local app addresses…','స్థానిక యాప్ చిరునామాలు తనిఖీ చేస్తున్నాము…');render();
    const origins=/^https?:$/.test(location.protocol) && ['localhost','127.0.0.1'].includes(location.hostname)
        ? [...new Set([location.origin,'http://localhost:8081','http://localhost:4173'])] : [];
    await Promise.allSettled(origins.map(origin=>new Promise(resolve=>{
        const nonce=crypto.randomUUID(),frame=document.createElement('iframe');frame.hidden=true;
        const finish=()=>{clearTimeout(timer);window.removeEventListener('message',receive);frame.remove();resolve();};
        const receive=async event=>{
            if (event.source!==frame.contentWindow || event.origin!==origin || event.data?.type!=='market-device-recovery' || event.data.nonce!==nonce) return;
            if (Array.isArray(event.data.listings)) {
                const ids=new Set(event.data.listings.flatMap(row=>(Array.isArray(row.media)?row.media:[]).map(item=>item.id)));
                for (const item of (Array.isArray(event.data.media)?event.data.media:[]))
                    if (ids.has(item.id) && item.blob instanceof Blob && item.blob.size<=30*1024*1024)
                        try {await mediaStore(item.id,item.blob);} catch (_) { /* Original photo remains available at its source address. */ }
                recoverDeviceListings(event.data.listings);
            }
            finish();
        };
        const timer=setTimeout(finish,5000);
        window.addEventListener('message',receive);
        frame.src=origin+'/market/recover.html?nonce='+encodeURIComponent(nonce);
        document.body.appendChild(frame);
    })));
    const rows=deviceListings();
    deviceScan.running=false;
    deviceScan.message=rows.length?L('Found '+rows.length+' device listing(s). Review them above before syncing.','ఈ పరికరంలో '+rows.length+' లిస్టింగ్‌లు దొరికాయి. అనుసంధానించే ముందు పైన సమీక్షించండి.')
        :L('No recoverable listings were found in these app stores. The original browser/device may differ, or the earlier cache may have been overwritten.','ఈ యాప్ నిల్వల్లో తిరిగి పొందగల లిస్టింగ్‌లు కనిపించలేదు. అసలు బ్రౌజర్ లేదా పరికరం వేరై ఉండవచ్చు, లేదా పాత నిల్వ మారిపోయి ఉండవచ్చు.');
    render();
}

welcome=function() {
    return apiEnabled()?workspaceWelcome().replace(L('Start prototype','నమూనా ప్రారంభించండి'),L('Get started','ప్రారంభించండి')):workspaceWelcome();
};
onboard=function() {
    return apiEnabled()?workspaceOnboard().replace(L('Set up demo profile','నమూనా ప్రొఫైల్'),L('Set up your profile','మీ ప్రొఫైల్ నమోదు చేయండి')):workspaceOnboard();
};

mediaLoad=async function(id) {
    const item=apiEnabled() && remote.media.get(id);
    if (!item) return workspaceMediaLoad(id);
    const path=item.own?`/listings/${item.listingId}/media/${id}`:`/media/${id}`;
    const response=await fetch(API_BASE+path,{headers:item.own&&remote.session?{Authorization:'Bearer '+remote.session.token}:{}});
    if (!response.ok) throw new Error('This media could not be loaded.');
    return response.blob();
};


requestForm=function() {
    const html=workspaceRequest();
    return apiEnabled()?html.replace(L('Publish demo requirement','నమూనా అవసరం ప్రచురించండి'),L('Publish requirement','అవసరం ప్రచురించండి')):html;
};
mediaEditor=function(draft) {
    const html=workspaceMediaEditor(draft);
    return apiEnabled()?html.replace(/<p class="micro">[^]*?<\/p>(?=<\/div>$)/,
        `<p class="micro">${L('Photos and video upload when you publish. Draft media stays on this device until then.','ప్రచురించినప్పుడు ఫోటోలు మరియు వీడియో అప్‌లోడ్ అవుతాయి. అప్పటివరకు డ్రాఫ్ట్ మీడియా ఈ పరికరంలో ఉంటుంది.')}</p>`):html;
};

function signedOutMessages() {return shell(L('Messages','సందేశాలు'),`${empty(L('Sign in to view your messages','మీ సందేశాల కోసం సైన్ ఇన్ చేయండి'),'')}${btn(L('Sign in','సైన్ ఇన్'), 'signin-inbox')}`,'home');}
inboxPage=function() {
    if (!apiEnabled()) return workspaceInbox();
    if (!signedIn()) return signedOutMessages();
    return shell(L('Messages','సందేశాలు'),`<h1>${L('Your conversations','మీ సంభాషణలు')}</h1>${btn(L('Refresh messages','సందేశాలు నవీకరించండి'),'refresh-remote','','secondary spaced')}<div class="spaced">${state.chats.map(chat=>`<button class="chat-list" data-action="open-chat" data-id="${esc(chat.id)}"><div class="avatar">${esc(chat.party.slice(0,2))}</div><div class="info"><strong>${esc(chat.party)}</strong><p>${esc(chat.messages.at(-1)?.text || L('Start an enquiry','విచారణ ప్రారంభించండి'))}</p></div>${icon('chevron')}</button>`).join('') || empty(L('No conversations yet','ఇంకా సంభాషణలు లేవు'),L('Open a listing and tap Enquire.','లిస్టింగ్ తెరిచి విచారించండి నొక్కండి.'))}</div>`,'home');
};
chatPage=function() {
    if (!apiEnabled()) return workspaceChat();
    if (!signedIn()) return signedOutMessages();
    const chat=state.chats.find(row=>row.id===ui.params.id);
    if (!chat) return inboxPage();
    return shell(esc(chat.party),`${btn(L('Refresh conversation','సంభాషణ నవీకరించండి'),'refresh-remote','','secondary')}<div id="chat-messages" class="spaced">${chat.messages.map(message=>`<div class="bubble ${message.mine?'mine':''}">${esc(message.text)}<small>${message.mine?L('You','మీరు'):esc(chat.party)} · ${new Date(message.time).toLocaleString()}</small></div>`).join('')}</div>`,'',false,'',`<form class="chat-compose" data-form="chat" data-id="${esc(chat.id)}"><input name="message" maxlength="600" required placeholder="${L('Write a message…','సందేశం రాయండి…')}" aria-label="Message"><button type="submit" aria-label="Send message">${icon('send')}</button></form>`);
};

browse=function() {
    let html=workspaceBrowse();
    if (!apiEnabled()) return html;
    html=html.replace(L('available demo listings','లభ్యమైన నమూనా లిస్టింగ్‌లు'),L('available listings','లభ్యమైన లిస్టింగ్‌లు'));
    if (remote.error) return html.replace('<main',`<div class="notice" role="alert">${esc(remote.error)}${btn(L('Try again','మళ్లీ ప్రయత్నించండి'),'refresh-remote','','secondary spaced')}</div><main`);
    if (!remote.synced) return html.replace('<div id="browse-results">',`<p role="status">${L('Loading listings…','లిస్టింగ్‌లు లోడ్ అవుతున్నాయి…')}</p><div id="browse-results">`);
    return html.replace('</main>',`${btn(L('Create from catalogue template','కేటలాగ్ నమూనా నుండి సృష్టించండి'),'catalogue-templates','','secondary spaced')}</main>`);
};

function catalogueTemplates() {
    return shell(L('Listing templates','లిస్టింగ్ నమూనాలు'),`<h1>${L('Start with your product','మీ సరుకుతో ప్రారంభించండి')}</h1><p class="lead">${L('Catalogue examples are templates, not live seller listings. Enter your own stock, price and photos before publishing.','కేటలాగ్ ఉదాహరణలు నమూనాలు మాత్రమే. ప్రచురించే ముందు మీ సరుకు, ధర మరియు ఫోటోలు నమోదు చేయండి.')}</p><div class="grid spaced">${MD.listings.map(item=>`<article class="product"><div class="product-media"><img src="/market/art/${esc(item.image)}.svg" alt=""></div><div class="product-body"><h3>${esc(title(item))}</h3>${btn(L('Use template','నమూనా వాడండి'),'catalogue-template',item.id,'secondary spaced')}</div></article>`).join('')}</div>`,'home');
}

handleAction=function(action,id='',element=null) {
    if (!apiEnabled()) return workspaceAction(action,id,element);
    if (action==='scan-device-listings') return scanDeviceListings();
    if (action==='sync-device-listing') {
        const row=deviceListings().find(item=>item.id===id);
        if (!row) return;
        if (!signedIn()) {comfort.pendingDeviceListing=id;return needSignIn('manage-listings');}
        const draft=newDraft(row.cat);
        let contacts={};
        try {contacts=JSON.parse(localStorage.getItem('agromitra.market.local-backup.v1') || '{}').contacts?.[id] || {};} catch (_) {}
        Object.assign(draft,{title:row.title,price:row.price,quantity:row.quantity,min:row.min || 1,unit:row.unit,
            location:row.location,state:row.state || 'Andhra Pradesh',description:row.description || 'Contact the seller to discuss this listing.',
            media:clone(row.media || []),specValues:(row.specs || []).map(pair=>pair[1]),
            expires:row.expires>=today() && row.expires<=future(30)?row.expires:future(14),deviceListingId:id,
            shareContacts:!!(row.shareContacts || contacts.sharing),allowCall:!!(row.allowCall || contacts.call),
            allowWhatsApp:!!(row.allowWhatsApp || contacts.whatsapp),contactPhone:state.profile.phone});
        ui.draft=draft;state.savedDraft=clone(draft);save();
        return go('sell',{step:4});
    }
    if (action==='catalogue-templates') return go('catalogue-templates');
    if (action==='catalogue-template') {
        const item=MD.listings.find(row=>row.id===id);if(!item)return;
        ui.draft=newDraft(item.cat);
        Object.assign(ui.draft,{title:item.title,unit:item.unit,specValues:item.specs.map(pair=>pair[1])});
        state.savedDraft=clone(ui.draft);save();
        return go('sell',{step:2});
    }
    if (action==='signin-inbox') return needSignIn('inbox');
    if (action==='save-listing') {
        if (!signedIn()) return needSignIn();
        return serverTask(async()=>{await api(state.saved.includes(id)?'DELETE':'POST','/saved/'+id);await refreshRemote();render();});
    }
    if (action==='chat-listing' || action==='chat-deal') {
        if (!signedIn()) return needSignIn();
        const listingId=action==='chat-deal'?getDeal(id)?.listingId:id;
        if (!listingId) return;
        return serverTask(async()=>{const conversation=await api('POST','/conversations',{listingId});await refreshRemote();go('chat',{id:conversation.id});});
    }
    if (action==='switch-role') {
        if (!signedIn()) return workspaceAction(action,id,element);
        return serverTask(async()=>{await api('PATCH','/users/me',{displayName:state.profile.name,city:state.profile.city,language:state.profile.language,business:state.profile.business,role:state.profile.role==='seller'?'buyer':'seller'});await refreshRemote();render();});
    }
    return workspaceAction(action,id,element);
};
handleForm=function(type,values,meta={}) {
    if (apiEnabled() && type==='onboard') {
        if (!values.name?.trim() || !values.agree) return workspaceForm(type,values,meta);
        if (!signedIn()) {
            comfort.pendingProfile={...values,language:state.profile.language};
            Object.assign(state.profile,{...values,onboarded:true});save();
            return needSignIn('home');
        }
        return serverTask(async()=>{await api('PATCH','/users/me',{displayName:values.name.trim(),city:values.city,language:state.profile.language,business:values.business,role:values.role});await refreshRemote();go('home');});
    }
    if (apiEnabled() && type==='chat') {
        if (!signedIn()) return needSignIn('inbox');
        return serverTask(async()=>{await api('POST',`/conversations/${meta.id}/messages`,{text:String(values.message || '').trim()});await refreshRemote();render();});
    }
    if (apiEnabled() && ['counteroffer','agreement','payment','inspection','inspection-results','transport','receipt','rating','ticket','resolution','promotion'].includes(type))
        return serverFailure(new Error(L('This service is not connected yet. No booking, payment or record has been submitted.','ఈ సేవ ఇంకా అనుసంధానం కాలేదు. బుకింగ్, చెల్లింపు లేదా రికార్డు సమర్పించలేదు.')));
    return workspaceForm(type,values,meta);
};
Object.assign(ROUTES,{welcome,onboard,'request-form':requestForm,'manage-listings':manageListings,browse,inbox:inboxPage,chat:chatPage,'catalogue-templates':catalogueTemplates});
window.MarketApp={...window.MarketApp,handleAction,handleForm};
