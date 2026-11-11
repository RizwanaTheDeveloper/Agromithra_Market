/* Routes the existing screens through the backend when an API URL is configured. */
const serverPrevAction = handleAction, serverPrevForm = handleForm, serverPrevOpenContact = openContact,
    serverPrevLaunchContact = launchContact, serverPrevDealPage = dealPage, serverPrevDealCard = dealCard,
    serverPrevVerificationPage = verificationPage, serverPrevAccount = accountPage, serverPrevLabel = verificationLabel,
    serverPrevApproved = buyerApproved, serverPrevAllowed = contactAllowed;

const serverFailure = e => { if (document.getElementById('form-error')) error(e.message); else toast(e.message); return false; };

/** Runs one server task at a time so a double tap cannot submit twice. */
async function serverTask(task) {
    if (remote.busy)
        return false;
    remote.busy = true;
    try {
        return await task();
    }
    catch (e) {
        return serverFailure(e);
    }
    finally {
        remote.busy = false;
    }
}

function needSignIn(route = ui.route, params = ui.params) {
    comfort.loginReturn = { route, params };
    toast(L('Sign in with your mobile number first.', 'ముందు మీ మొబైల్ నంబర్‌తో సైన్ ఇన్ చేయండి.'));
    go('verification');
    return false;
}

async function syncAndRender(then) {
    await refreshRemote();
    if (then)
        then();
    else
        renderIfIdle();
}

buyerApproved = function () {
    if (!apiEnabled())
        return serverPrevApproved();
    const v = state.buyerVerification;
    return signedIn() && !!v && v.status === 'approved' && v.demo === false;
};

verificationLabel = function () {
    if (!apiEnabled())
        return serverPrevLabel();
    const status = state.buyerVerification.status;
    return status === 'approved' ? L('Verified buyer', 'ధృవీకరించిన కొనుగోలుదారు') : status === 'pending' ? L('Review pending', 'సమీక్ష పెండింగ్') : status === 'changes' ? L('Changes needed', 'మార్పులు అవసరం') : signedIn() ? L('Buyer not verified', 'కొనుగోలుదారు ధృవీకరించబడలేదు') : L('Not signed in', 'సైన్ ఇన్ కాలేదు');
};

contactAllowed = function (p) {
    if (!apiEnabled())
        return serverPrevAllowed(p);
    return !!(p && available(p) && !p.own && buyerApproved());
};

openContact = function (id, channel) {
    if (!apiEnabled())
        return serverPrevOpenContact(id, channel);
    const p = getListing(id);
    if (!p)
        return;
    if (!available(p))
        return toast(L('This listing is no longer available.', 'ఈ లిస్టింగ్ ఇప్పుడు లభ్యం కాదు.'));
    if (p.own)
        return toast(L('This is your own listing.', 'ఇది మీ స్వంత లిస్టింగ్.'));
    if (!signedIn() || !buyerApproved()) {
        comfort.pendingContact = { id, channel };
        comfort.loginReturn = null;
        return go('verification');
    }
    serverTask(async () => {
        const result = await api('POST', `/listings/${id}/contact`, { channel });
        const whats = channel === 'whatsapp';
        const url = whats ? result.url + '?text=' + encodeURIComponent(contactMessage(p)) : result.url;
        remote.links[id + ':' + channel] = url;
        const number = result.url.replace(/^tel:/, '').replace(/^https:\/\/wa\.me\//, '+');
        modal(whats ? 'WhatsApp' : L('Call seller', 'విక్రేతకు కాల్'), `<div class="contact-modal"><span class="big-icon">${icon(whats ? 'whatsapp' : 'phone')}</span><h2>${esc(title(p))}</h2><p>${esc(seller(p.seller).name)}</p><span class="tag">${verificationLabel()}</span><p class="contact-number">${esc(number)}</p><p class="small muted">${L('Shared because this seller allows contact from verified buyers. Continuing opens another app; nothing is sent automatically.', 'ధృవీకరించిన కొనుగోలుదారులకు విక్రేత అనుమతి ఇచ్చినందున ఈ నంబర్ చూపబడింది. కొనసాగిస్తే మరో యాప్ తెరుస్తుంది.')}</p>${btn(icon(whats ? 'whatsapp' : 'phone') + (whats ? L('Open WhatsApp', 'వాట్సాప్ తెరవండి') : L('Open phone dialer', 'ఫోన్ డయలర్ తెరవండి')), whats ? 'launch-whatsapp' : 'launch-call', id, 'spaced')}${btn(L('Close', 'మూసివేయండి'), 'close-modal', '', 'secondary spaced')}</div>`);
    });
};

launchContact = function (id, channel) {
    if (!apiEnabled())
        return serverPrevLaunchContact(id, channel);
    const url = remote.links[id + ':' + channel];
    if (!url)
        return toast(L('Contact access is unavailable.', 'సంప్రదింపు అనుమతి లేదు.'));
    delete remote.links[id + ':' + channel];
    closeModal();
    window.location.href = url;
};

/* ---------- Pages ---------- */

verificationPage = function () {
    if (!apiEnabled())
        return serverPrevVerificationPage();
    const v = state.buyerVerification;
    let html = `<div class="verification-heading"><span>${icon('shield')}</span><h1>${L('Know who is buying.', 'కొనుగోలుదారు ఎవరో తెలుసుకోండి.')}</h1><p class="lead">${L('One profile works for every category.', 'ఒక ప్రొఫైల్ అన్ని వర్గాలకు సరిపోతుంది.')}</p></div>`;
    if (!signedIn())
        html += `${note('We send a one-time code to your mobile number. Sellers share contact details only with buyers whose profile an administrator has approved.', 'మీ మొబైల్ నంబర్‌కు వన్-టైమ్ కోడ్ పంపుతాము. నిర్వాహకుడు ఆమోదించిన కొనుగోలుదారులకే విక్రేతలు సంప్రదింపు వివరాలు ఇస్తారు.')}<form data-form="buyer-phone">${field(L('Mobile number', 'మొబైల్ నంబర్'), 'phone', '', 'tel', 'required maxlength="20" inputmode="tel" autocomplete="tel-national"')}${errorBox()}${submit(L('Send code', 'కోడ్ పంపండి'))}</form>`;
    else if (v.status === 'approved')
        html += `<div class="card approved"><div class="seal">${icon('check')}</div><h2>${L('Verified buyer', 'ధృవీకరించిన కొనుగోలుదారు')}</h2><p>${esc(v.name)} · ${esc(v.business)}</p><p class="small muted">${esc(v.city)} · ${esc(v.purpose)}</p>${btn(L('Continue', 'కొనసాగండి'), comfort.pendingContact ? 'continue-contact' : 'browse', '', 'spaced')}</div>`;
    else if (v.status === 'pending')
        html += `<div class="card"><span class="tag gold">${L('Review pending', 'సమీక్ష పెండింగ్')}</span><h2 class="spaced">${L('Your buyer profile is with our reviewers.', 'మీ కొనుగోలుదారు ప్రొఫైల్ సమీక్షలో ఉంది.')}</h2><p class="muted spaced">${esc(v.business)} · ${esc(v.city)}</p><p class="small spaced">${L('Contact details stay hidden until it is approved.', 'ఆమోదించే వరకు సంప్రదింపు వివరాలు కనిపించవు.')}</p>${btn(L('Check status', 'స్థితి చూడండి'), 'refresh-remote', '', 'spaced')}</div>`;
    else
        html += `${v.status === 'changes' ? note(v.reviewNote ? 'Reviewer note: ' + v.reviewNote : 'Your last application needs changes.', 'మీ దరఖాస్తుకు మార్పులు అవసరం.', true) : ''}<form data-form="buyer-details">${field(L('Buyer / business name', 'కొనుగోలుదారు / వ్యాపార పేరు'), 'name', state.profile.name === 'Demo Buyer' ? '' : state.profile.name, 'text', 'required minlength="2" maxlength="60"')}${select(L('Buyer type', 'కొనుగోలుదారు రకం'), 'business', ['Individual', 'Farmer', 'Trader', 'Retailer', 'Miller', 'Processor', 'Dairy farmer', 'Poultry farmer', 'Aqua farmer', 'FPO'], v.business || state.profile.business)}${field(L('Town / city', 'పట్టణం / నగరం'), 'city', state.profile.city, 'text', 'required maxlength="70"')}${select(L('What do you buy for?', 'కొనుగోలు ఉద్దేశ్యం'), 'purpose', ['Farm use', 'Resale', 'Processing', 'Dairy business', 'Poultry business', 'Aqua business', 'Household use'], 'Farm use')}<label class="check"><input type="checkbox" name="consent" required><span>${L('Sellers may see my buyer name, type, purpose and verification status when I ask for their contact.', 'సంప్రదింపు అడిగినప్పుడు విక్రేతలు నా పేరు, రకం, ఉద్దేశ్యం మరియు ధృవీకరణ స్థితి చూడవచ్చు.')}</span></label>${errorBox()}${submit(L('Submit for review', 'సమీక్షకు పంపండి'))}</form>`;
    if (signedIn())
        html += btn(L('Sign out', 'సైన్ అవుట్'), 'logout', '', 'secondary spaced');
    return shell(L('Buyer verification', 'కొనుగోలుదారు ధృవీకరణ'), html, 'account');
};

const serverStageLabel = s => L(({ quote: 'Quote requested', inspection: 'Inspection / visit', agreed: 'Agreed · stock reserved', dispatched: 'Dispatched', completed: 'Completed', cancelled: 'Cancelled' })[s] || s);

dealCard = function (d) {
    if (!apiEnabled() || !d.serverStage)
        return serverPrevDealCard(d);
    return `<article class="deal-card"><div class="row"><img class="thumb" src="/market/art/${d.image}.svg" alt=""><div style="flex:1"><h3>${esc(d.title)}</h3><p>${d.quantity} ${unit(d.unit)} · ${money(dealTotal(d))}</p><p>${money(d.price)} / ${unit(d.unit)}</p><p>${esc(d.seller)} → ${esc(d.buyer)}</p></div></div><span class="tag ${d.stage === 'complete' ? 'gold' : ''}">${serverStageLabel(d.serverStage)}</span>${btn(L('Open deal', 'ఒప్పందం చూడండి'), 'deal', d.id, 'secondary')}</article>`;
};

dealPage = function () {
    const d = getDeal(ui.params.id);
    if (!apiEnabled() || !d || !d.serverStage)
        return serverPrevDealPage();
    const seller = d.sellerId === myId(), id = d.id;
    const step = (label, stage, cls = '') => btn(label, 'server-deal', id + ':' + stage, cls);
    let action = '';
    if (seller && d.serverStage === 'quote')
        action = step(L('Accept and reserve stock', 'అంగీకరించి నిల్వ రిజర్వ్ చేయండి'), 'agreed') + step(L('Arrange an inspection first', 'ముందు తనిఖీ ఏర్పాటు'), 'inspection', 'secondary spaced');
    else if (seller && d.serverStage === 'inspection')
        action = step(L('Accept and reserve stock', 'అంగీకరించి నిల్వ రిజర్వ్ చేయండి'), 'agreed');
    else if (seller && d.serverStage === 'agreed')
        action = step(L('Mark as dispatched', 'పంపినట్లు గుర్తించండి'), 'dispatched');
    else if (!seller && d.serverStage === 'dispatched')
        action = step(L('Confirm goods received', 'సరుకు అందినట్లు నిర్ధారించండి'), 'completed');
    else if (!['completed', 'cancelled', 'dispatched'].includes(d.serverStage))
        action = `<p class="muted">${L('Waiting for the seller to respond.', 'విక్రేత స్పందన కోసం వేచి ఉంది.')}</p>`;
    if (['quote', 'inspection', 'agreed'].includes(d.serverStage))
        action += step(L('Cancel this deal', 'ఈ ఒప్పందం రద్దు చేయండి'), 'cancelled', 'secondary spaced');
    const history = d.events.map(e => `<div class="invoice-row"><span>${new Date(e.time).toLocaleString()}</span><strong>${serverStageLabel(e.stage)}</strong></div>`).join('');
    return shell(L('Deal details', 'ఒప్పంద వివరాలు'), `<span class="tag">${serverStageLabel(d.serverStage)}</span><h1 class="spaced">${esc(d.title)}</h1><p class="lead">${d.quantity} ${unit(d.unit)} · ${esc(d.location)}</p><div class="card"><div class="invoice-row"><span>${L('Quoted price', 'ప్రతిపాదిత ధర')}</span><strong>${money(d.price)} / ${unit(d.unit)}</strong></div><div class="invoice-row"><span>${L('Goods value', 'సరుకు విలువ')}</span><strong>${money(dealTotal(d))}</strong></div><div class="invoice-row"><span>${L('Buyer', 'కొనుగోలుదారు')}</span><strong>${esc(d.buyer)}</strong></div><div class="invoice-row"><span>${L('Seller', 'విక్రేత')}</span><strong>${esc(d.seller)}</strong></div></div>${note('Payment, inspection visits and transport are arranged directly between buyer and seller. This record tracks agreement, stock reservation and delivery only.', 'చెల్లింపు, తనిఖీ మరియు రవాణా కొనుగోలుదారు, విక్రేత నేరుగా ఏర్పాటు చేసుకోవాలి. ఈ రికార్డు అంగీకారం, నిల్వ మరియు డెలివరీని మాత్రమే నమోదు చేస్తుంది.')}<div class="spaced">${action}</div><h3 class="spaced">${L('History', 'చరిత్ర')}</h3><div class="card">${history}</div>`);
};

accountPage = function () {
    const page = serverPrevAccount();
    if (!apiEnabled())
        return page;
    return page.replace('<div class="card">', `<div class="card spaced">${menu('user', signedIn() ? L('Signed in', 'సైన్ ఇన్ అయ్యారు') : L('Sign in', 'సైన్ ఇన్'), signedIn() ? state.profile.phone : L('Use your mobile number', 'మీ మొబైల్ నంబర్ వాడండి'), signedIn() ? 'logout' : 'login')}</div><div class="card">`);
};

Object.assign(ROUTES, { verification: verificationPage, deal: dealPage, account: accountPage });

/* ---------- Form submissions ---------- */

async function applySignIn(code) {
    const challenge = remote.challenge;
    const result = await api('POST', '/auth/otp/verify', { challengeId: challenge.id, code }, { auth: false });
    storeSession({ token: result.accessToken, userId: result.userId, expiresAt: result.expiresAt });
    remote.challenge = null;
    // A profile created offline (name and city) becomes the public account name on first sign-in.
    const me = await api('GET', '/users/me');
    if (comfort.pendingProfile || (!me.displayName && !state.profile.accountId && state.profile.onboarded && state.profile.name && state.profile.name !== 'Demo Buyer')) {
        const profile=comfort.pendingProfile || state.profile;
        await api('PATCH', '/users/me', { displayName: String(profile.name).trim(), city: String(profile.city || 'Not set').trim(), language:profile.language==='te'?'te':'en', business:profile.business || 'Individual', role:profile.role || state.profile.role });
        comfort.pendingProfile=null;
    }
    await refreshRemote();
    closeModal();
    const back = comfort.loginReturn;
    comfort.loginReturn = null;
    comfort.otp = { phone: state.profile.phone, confirmed: true };
    comfort.verificationStep = 2;
    if (back && !comfort.pendingContact)
        go(back.route, back.params, true);
    else
        go('verification', {}, true);
    toast(L('Signed in.', 'సైన్ ఇన్ అయ్యారు.'));
    if (comfort.pendingDeviceListing) {
        const id=comfort.pendingDeviceListing;comfort.pendingDeviceListing=null;
        handleAction('sync-device-listing',id);
    }
    return true;
}

/** Uploads new local photos/video, then saves the final order. Items already on the server keep their ids. */
async function syncListingMedia(listingId, draft) {
    const items = draft.media || [], ids = [];
    for (const item of items) {
        if (item.remoteId || UUID.test(item.id)) {
            ids.push(item.remoteId || item.id);
            continue;
        }
        const blob = await mediaLoad(item.id);
        if (!blob)
            throw new Error(L('A selected photo or video is no longer on this device. Remove it and add it again.', 'ఎంచుకున్న ఫోటో లేదా వీడియో ఈ పరికరంలో లేదు. తొలగించి మళ్లీ జోడించండి.'));
        const form = new FormData();
        form.append('file', blob, item.name || (item.kind === 'video' ? 'video' : 'photo'));
        const saved = await api('POST', `/listings/${listingId}/media?clientKey=${encodeURIComponent(item.id)}`, form, { timeout: 120000 });
        item.remoteId = saved.id;
        ids.push(saved.id);
        state.savedDraft=clone(draft);save();
    }
    // Always send the order: it also removes server media the seller deleted while editing.
    if (items.length || draft.editId)
        await api('PATCH', `/listings/${listingId}/media`, { ids });
}

function listingFromDraft(draft) {
    return apiListing({ ...draft, description: draft.description || 'Contact the seller for details.' }, draft.editId ? getListing(draft.editId) : null);
}

handleForm = function (type, o, meta = {}) {
    if (!apiEnabled())
        return serverPrevForm(type, o, meta);
    switch (type) {
        case 'buyer-phone': {
            if (!validPhone(o.phone))
                return error(L('Enter a valid 10-digit Indian mobile number.', 'సరైన 10 అంకెల మొబైల్ నంబర్ నమోదు చేయండి.'));
            return serverTask(async () => {
                const phone = '+91' + cleanPhone(o.phone);
                const challenge = await api('POST', '/auth/otp/request', { phone }, { auth: false });
                remote.challenge = { id: challenge.challengeId, phone };
                const hint = challenge.developmentCode ? `<p class="small muted">${L('Development server code:', 'డెవలప్‌మెంట్ సర్వర్ కోడ్:')} <strong>${esc(challenge.developmentCode)}</strong></p>` : '';
                modal(L('Enter the code', 'కోడ్ నమోదు చేయండి'), `<form data-form="buyer-otp"><p class="small muted">${L('We sent a 6-digit code to', '6 అంకెల కోడ్ పంపాము:')} ${esc(phone)}</p>${hint}${field(L('6-digit code', '6 అంకెల కోడ్'), 'code', '', 'text', 'required inputmode="numeric" maxlength="6" pattern="[0-9]{6}" autocomplete="one-time-code"')}${errorBox()}${submit(L('Verify', 'నిర్ధారించండి'))}</form>`);
                return true;
            });
        }
        case 'buyer-otp':
            if (!remote.challenge)
                return error(L('Request a new code.', 'కొత్త కోడ్ పొందండి.'));
            if (!/^\d{6}$/.test(String(o.code || '')))
                return error(L('Enter the 6-digit code.', '6 అంకెల కోడ్ నమోదు చేయండి.'));
            return serverTask(() => applySignIn(String(o.code)));
        case 'buyer-details':
            if (!signedIn())
                return needSignIn();
            if (!o.name?.trim() || o.name.trim().length < 2 || !o.city?.trim() || !o.business || !o.purpose || !o.consent)
                return error(L('Complete the buyer profile and consent.', 'కొనుగోలుదారు వివరాలు మరియు అనుమతి పూర్తి చేయండి.'));
            return serverTask(async () => {
                await api('PATCH', '/users/me', { displayName: o.name.trim().slice(0, 60), city: o.city.trim().slice(0, 70), language: state.profile.language });
                await api('POST', '/users/me/verification', { business: o.business, purpose: `${o.purpose} · ${o.business} · ${o.city.trim()}`.slice(0, 500) });
                await refreshRemote();
                go('verification', {}, true);
                return true;
            });
        case 'profile':
            if (!o.name?.trim() || o.name.trim().length < 2)
                return error('Enter your name.');
            if (!signedIn()) {
                comfort.pendingProfile=o;
                return needSignIn('profile');
            }
            return serverTask(async () => {
                await api('PATCH', '/users/me', { displayName:o.name.trim(), city: String(o.city || '').trim() || 'Not set', language: o.language === 'te' ? 'te' : 'en', business:o.business || 'Individual',role:state.profile.role });
                await refreshRemote();
                go('account', {}, true);
                toast(L('Profile saved', 'ప్రొఫైల్ సేవ్ అయింది'));
                return true;
            });
        case 'easy-listing':
            // The seller's account phone is the contact number; the form's own phone field is not sent anywhere.
            return serverPrevForm(type, o.shareContacts ? { ...o, contactPhone: state.profile.phone || o.contactPhone } : o, meta);
        case 'sell-publish': {
            if (!ui.draft)
                return error(L('Create a listing first.', 'ముందు లిస్టింగ్ సృష్టించండి.'));
            if (!o.confirmed)
                return error(L('Check the details before posting.', 'పోస్ట్ చేయడానికి ముందు వివరాలు చూసుకోండి.'));
            if (!signedIn())
                return needSignIn('sell', { step: 4 });
            const draft = clone(ui.draft);
            return serverTask(async () => {
                const body = listingFromDraft(draft);
                let id = draft.editId || draft.remoteId;
                if (id) {
                    await api('PATCH', '/listings/' + id, body);
                }
                else {
                    id = (await api('POST', '/listings', body)).id;
                    ui.draft.remoteId=id;
                    state.savedDraft=clone(ui.draft);
                    save();
                }
                await syncListingMedia(id, ui.draft);
                const wantsContact = !!draft.shareContacts;
                await api('PATCH', `/listings/${id}/contact-settings`, { allowCall: wantsContact && !!draft.allowCall, allowWhatsapp: wantsContact && !!draft.allowWhatsApp });
                if (!draft.editId)
                    await api('PATCH', `/listings/${id}/status`, { status: 'active' });
                await refreshRemote();
                completeDeviceListing(draft.deviceListingId,id);
                delete state.savedDraft;
                ui.draft = null;
                ui.stack = [];
                save();
                go('success', { listingId: id, title: L('Your listing is ready.', 'మీ లిస్టింగ్ సిద్ధంగా ఉంది.') }, true);
                return true;
            });
        }
        case 'contact-settings': {
            const p = getListing(meta.id);
            if (!p?.own)
                return false;
            return serverTask(async () => {
                const share = !!o.sharing;
                await api('PATCH', `/listings/${p.id}/contact-settings`, { allowCall: share && !!o.call, allowWhatsapp: share && !!o.whatsapp });
                await refreshRemote();
                closeModal();
                render();
                return true;
            });
        }
        case 'request': {
            ui.requestDraft={...o};
            if (!o.title?.trim() || !validNumber(o.quantity) || !validNumber(o.budget) || !o.location?.trim() || !o.note?.trim() || o.expires < today())
                return error(L('Enter all required details and positive quantity / budget.', 'అవసరమైన వివరాలు, సరైన పరిమాణం మరియు బడ్జెట్ నమోదు చేయండి.'));
            if (!discreteQuantity(o.quantity, o.unit))
                return error(L('Use a whole-number quantity for this unit.', 'ఈ యూనిట్‌కు పూర్ణ సంఖ్య నమోదు చేయండి.'));
            if (!signedIn()) {
                ui.requestDraft={...o};
                return needSignIn('request-form', {});
            }
            return serverTask(async () => {
                const created = await api('POST', '/requests', { title: o.title.trim(), category: o.cat, quantity: Number(o.quantity), unit: o.unit, city: o.location.trim(), budget: Number(o.budget), purpose: String(o.purpose || '').slice(0, 80), note: o.note.trim(), expiresAt: endOfDayISO(o.expires) });
                await refreshRemote();
                ui.requestDraft = null;
                ui.stack = [];
                go('request-detail', { id: created.id }, true);
                return true;
            });
        }
        case 'offer': {
            const p = getListing(meta.id), q = Number(o.quantity);
            if (!p)
                return error(L('Buyers start quotes from a listing. Publish a listing so buyers can quote you.', 'కొనుగోలుదారులు లిస్టింగ్ నుంచి ధర అడుగుతారు. మీ లిస్టింగ్ ప్రచురించండి.'));
            if (!validNumber(q) || !available(p) || q < p.min || q > p.quantity)
                return error(L('Quantity must be within the available lot and minimum order.', 'పరిమాణం కనీస ఆర్డర్ మరియు లభ్య పరిమాణం మధ్య ఉండాలి.'));
            if (!discreteQuantity(q, p.unit))
                return error(L('Use a whole-number quantity for this unit.', 'ఈ యూనిట్‌కు పూర్ణ సంఖ్య నమోదు చేయండి.'));
            if (!signedIn())
                return needSignIn('offer', { id: p.id });
            if (!buyerApproved()) {
                comfort.loginReturn = null;
                toast(L('Quotes need an approved buyer profile.', 'ధర అడగడానికి ఆమోదించిన కొనుగోలుదారు ప్రొఫైల్ అవసరం.'));
                return go('verification');
            }
            return serverTask(async () => {
                // Keep one key per listing and quantity so a retried request cannot create a second deal.
                if (!remote.quote || remote.quote.listingId !== p.id || remote.quote.quantity !== q)
                    remote.quote = { listingId: p.id, quantity: q, key: newUUID() };
                let deal;
                try {
                    deal = await api('POST', '/deals', { listingId: p.id, quantity: q, idempotencyKey: remote.quote.key });
                }
                catch (e) {
                    if (e.status === 403)
                        throw new ApiError(403, L('You cannot quote this listing. It may be your own, the seller may have blocked you, or your buyer profile is not approved.', 'మీరు ఈ లిస్టింగ్‌కు ధర అడగలేరు. ఇది మీదే కావచ్చు లేదా మీ ప్రొఫైల్ ఆమోదం పొందలేదు.'));
                    throw e;
                }
                remote.quote = null;
                await refreshRemote();
                go('deal', { id: deal.id }, true);
                return true;
            });
        }
        default: return serverPrevForm(type, o, meta);
    }
};

/* ---------- Button actions ---------- */

async function setListingStatus(p, status, message) {
    await api('PATCH', `/listings/${p.id}/status`, { status });
    await refreshRemote();
    render();
    toast(message);
}

handleAction = function (a, id = '', element = null) {
    if (!apiEnabled())
        return serverPrevAction(a, id, element);
    const p = getListing(id);
    switch (a) {
        case 'logout':
            serverTask(async () => {
                try { await api('DELETE', '/auth/session'); } catch (_) { /* The local session ends either way. */ }
                endSession();
                await refreshRemote();
                ui.stack = [];
                go('home', {}, true);
                toast(L('Signed out.', 'సైన్ అవుట్ అయ్యారు.'));
            });
            break;
        case 'refresh-remote':
            serverTask(async () => { await refreshRemote(); render(); });
            break;
        case 'toggle-listing':
            if (!p?.own)
                break;
            if (!signedIn())
                return needSignIn();
            serverTask(() => setListingStatus(p, p.status === 'active' ? 'paused' : 'active', L('Listing visibility updated', 'లిస్టింగ్ లభ్యత మార్చబడింది')));
            break;
        case 'sold-listing':
            if (!p?.own)
                break;
            serverTask(() => setListingStatus(p, 'sold', L('Marked sold and removed from the marketplace', 'అమ్మినట్లు గుర్తించి మార్కెట్ నుంచి తొలగించబడింది')));
            break;
        case 'renew-listing':
            if (!p?.own)
                break;
            serverTask(async () => {
                const body = apiListing({ ...p, cat: p.cat, specValues: p.specs.map(s => s[1]), expires: future(14), min: p.min, location: p.location }, p);
                await api('PATCH', '/listings/' + p.id, body);
                if (p.status !== 'active')
                    await api('PATCH', `/listings/${p.id}/status`, { status: 'active' });
                await refreshRemote();
                render();
                toast(L('Listing renewed for 14 days', 'లిస్టింగ్ 14 రోజులు పొడిగించబడింది'));
            });
            break;
        case 'close-request': {
            const r = getRequest(id);
            if (!r?.own)
                break;
            serverTask(async () => {
                await api('POST', `/requests/${id}/close`, {});
                await refreshRemote();
                toast(L('Requirement closed', 'అవసరం మూసివేయబడింది'));
                go('requests', {}, true);
            });
            break;
        }
        case 'server-deal': {
            const [dealId, stage] = id.split(':'), d = getDeal(dealId);
            if (!d)
                break;
            serverTask(async () => {
                try {
                    await api('PATCH', `/deals/${dealId}/stage`, { stage, version: d.version });
                }
                catch (e) {
                    if (e.status === 409) {
                        await refreshRemote();
                        render();
                        throw new ApiError(409, L('This deal changed. The latest details are shown; please try again.', 'ఈ ఒప్పందం మారింది. తాజా వివరాలు చూపబడ్డాయి; మళ్లీ ప్రయత్నించండి.'));
                    }
                    throw e;
                }
                await refreshRemote();
                render();
            });
            break;
        }
        case 'rfq-quote':
        case 'sample-rfq-quote':
            toast(L('Buyers start quotes from a listing. Publish a listing so buyers can find you.', 'కొనుగోలుదారులు లిస్టింగ్ నుంచి ధర అడుగుతారు. మీ లిస్టింగ్ ప్రచురించండి.'));
            break;
        case 'approve-buyer':
        case 'reject-buyer':
        case 'reset-verification':
        case 'expire-listing':
        case 'sample-verify':
        case 'confirm-plan':
            toast(L('This is handled by the server in connected mode.', 'కనెక్ట్ అయిన మోడ్‌లో ఇది సర్వర్ చూసుకుంటుంది.'));
            break;
        case 'edit-verification':
            state.buyerVerification.status = 'changes';
            render();
            break;
        default:
            serverPrevAction(a, id, element);
    }
};

if (apiEnabled()) {
    recoverDeviceListings();
    // Retain device-only submissions for recovery when switching to API mode.
    // They are not silently assigned to whichever account next signs in.
    try {
        const backup=JSON.parse(localStorage.getItem('agromitra.market.local-backup.v1') || '{}');
        backup.contacts={...backup.contacts,...state.privateContacts};
        for (const key of ['listings','requests','chats']) {
            const rows=state[key].filter(row=>!UUID.test(row.id) && (row.own || (key==='chats' && row.messages?.some(message=>message.mine))));
            backup[key]=[...new Map([...(backup[key] || []),...rows].map(row=>[row.id,row])).values()];
        }
        localStorage.setItem('agromitra.market.local-backup.v1',JSON.stringify(backup));
    } catch (_) { /* Restricted browser storage does not prevent API use. */ }
    // Sample records are fictional and have no server identity; the server's data replaces them.
    state.listings = state.listings.filter(p => UUID.test(p.id));
    state.requests = state.requests.filter(r => UUID.test(r.id));
    state.deals = state.deals.filter(d => UUID.test(d.id));
    state.saved=[];
    state.chats=[];
    state.notifications=[];
    refreshRemote().then(() => renderIfIdle()).catch(e => { remote.error=e.message;renderIfIdle(); });
    window.addEventListener('online', () => refreshRemote().then(renderIfIdle).catch(() => { }));
}

Object.assign(ROUTES, { verification: verificationPage, deal: dealPage, account: accountPage });
window.MarketApp = { ...window.MarketApp, buyerApproved, contactAllowed, launchContact, handleAction, handleForm, remote };
