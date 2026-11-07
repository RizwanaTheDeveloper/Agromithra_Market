'use strict';

/* Two-in-one comfort layer. Real local media; clearly simulated buyer review.
 * A production contact endpoint must authorize every request on the server.
 */
const baseNewDraft = newDraft, baseCaptureDraft = captureDraft, baseHandleAction = handleAction, baseHandleForm = handleForm;

const baseProfile = profilePage, baseAccount = accountPage, baseSave = save;

const comfort = { gallery: 0, mediaBusy: false, mediaMessage: '', pendingContact: null, otp: null, verificationStep: 1 };

const objectURLs = new Map();

ICONS.video = '<rect x="3" y="5" width="13" height="14" rx="3"/><path d="m16 10 5-3v10l-5-3Z"/>';

ICONS.phone = '<path d="M5 3h4l2 5-3 2a14 14 0 0 0 6 6l2-3 5 2v4c-1 5-19-4-18-13Z"/>';

ICONS.whatsapp = '<path d="M21 11a9 9 0 0 1-14 8l-4 2 1-5A9 9 0 1 1 21 11Z"/><path d="M8 7c0 5 4 8 8 8l1-2-3-2-1 1-2-2 1-1-2-3Z"/>';

ICONS.lock = '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>';

ICONS.play = '<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4Z"/>';

migrateComfort();

available = function (p) { return !!(p && p.status === 'active' && p.expires >= today() && Number(p.quantity) > 0); };

save = function () { baseSave(); };

newDraft = function (category = 'crops') { return { ...baseNewDraft(category), media: [], contactPhone: state.profile.phone || '', allowWhatsApp: true, allowCall: true, shareContacts: true, contactTime: '9 am – 6 pm', negotiable: true, min: 1, specValues: ['', '', '', ''] }; };

captureDraft = function () {
    const f = document.querySelector('form[data-form="easy-listing"]');
    if (f)
        draftCapture(Object.fromEntries(new FormData(f)));
    else
        baseCaptureDraft();
    persistDraft();
};

nav = function (active) { return `<nav class="nav comfort-nav" aria-label="Main navigation">${[['home', 'home', L('Home', 'హోమ్')], ['browse', 'search', L('Buy', 'కొనండి')], ['seller-home', 'plus', L('Sell', 'అమ్మండి')], ['activity', 'deal', L('Activity', 'వ్యాపారం')], ['account', 'user', L('Profile', 'ప్రొఫైల్')]].map(([r, i, t]) => `<button data-action="comfort-nav" data-id="${r}" class="${active === r || (r === 'browse' && active === 'saved') || (r === 'seller-home' && ['sell', 'manage-listings'].includes(active)) || (r === 'activity' && ['deals', 'requests', 'inbox'].includes(active)) ? 'active' : ''}">${r === 'seller-home' ? `<span class="sell-icon">${icon(i)}</span>` : icon(i)}<span>${t}</span></button>`).join('')}</nav>`; };

home = function () {
    const buying = state.profile.role !== 'seller', mine = state.listings.filter(p => p.own && available(p)), recent = filtered().filter(p => !p.own).slice(0, 4);
    return shell('', `<div class="location-row"><button data-action="location">${icon('pin')}${esc(state.profile.city)} ${icon('down')}</button><button class="language-chip" data-action="language" data-id="${state.profile.language === 'te' ? 'en' : 'te'}">${state.profile.language === 'te' ? 'English' : 'తెలుగు'}</button></div>${modeSwitch()}
 <section class="comfort-hero"><div><span class="eyebrow">${L('YOUR FARM. YOUR MARKET.', 'మీ పొలం. మీ మార్కెట్.')}</span><h1>${buying ? L('Good produce.\nGood people.', 'మంచి సరుకు.\nమంచి మనుషులు.') : L('Sell it in\nthree easy steps.', 'మూడు సులభ దశల్లో\nఅమ్మండి.')}</h1><p>${buying ? L('Browse nearby. Verify once. Talk directly.', 'దగ్గర సరుకు చూడండి. ధృవీకరించండి. నేరుగా మాట్లాడండి.') : L('Add photos. Set a price. Meet verified buyers.', 'ఫోటోలు జోడించండి. ధర పెట్టండి. ధృవీకరించిన కొనుగోలుదారులను కలవండి.')}</p></div><img src="/market/art/${buying ? 'landscape' : 'paddy'}.svg" alt=""><div class="hero-cta">${btn(icon(buying ? 'search' : 'camera') + (buying ? L('Find what I need', 'నాకు కావాల్సినవి చూడండి') : L('Add my listing', 'నా లిస్టింగ్ జోడించండి')), buying ? 'browse' : 'start-sell')}${!buying && state.savedDraft ? btn(L('Continue draft', 'డ్రాఫ్ట్ కొనసాగించండి'), 'resume-draft', '', 'secondary') : ''}</div></section>
 ${buying ? `<form data-form="search" class="search">${icon('search')}<input name="query" placeholder="${L('What do you want to buy?', 'మీరు ఏమి కొనాలి?')}" aria-label="${L('Search listings', 'లిస్టింగ్‌లు వెతకండి')}"><button type="submit" aria-label="Search">${icon('chevron')}</button></form><button class="trust-strip" data-action="verification">${icon(buyerApproved() ? 'shield' : 'lock')}<span><strong>${verificationLabel()}</strong><small>${L('Verified buyers can view contact details.', 'ధృవీకరించిన కొనుగోలుదారులకు మాత్రమే సంప్రదింపు వివరాలు.')}</small></span>${icon('chevron')}</button>` : `<div class="quick-grid spaced">${quickTile('leaf', L('My listings', 'నా లిస్టింగ్‌లు'), mine.length + ' ' + L('active', 'లభ్యం'), 'manage-listings')}${quickTile('user', L('Buyer enquiries', 'కొనుగోలుదారు విచారణలు'), L('Review buyers', 'కొనుగోలుదారులను చూడండి'), 'seller-enquiries')}</div>`}
 <div class="section-head"><h2>${L('What are you looking for?', 'మీకు ఏది కావాలి?')}</h2></div><div class="categories comfort-categories">${MD.categories.map(c => `<button class="category" data-action="${buying ? 'category' : 'sell-category-home'}" data-id="${c.id}"><div class="category-art"><img src="/market/art/${c.image}.svg" alt=""></div><span>${L(c.name, c.te)}</span></button>`).join('')}</div>
 <div class="section-head"><h2>${buying ? L('Browse sample listings', 'నమూనా లిస్టింగ్‌లు చూడండి') : L('Your selling shortcuts', 'మీ అమ్మకం సులభ మార్గాలు')}</h2>${buying ? `<button class="link" data-action="browse">${L('See all', 'అన్నీ చూడండి')} →</button>` : ''}</div>${buying ? `<div class="grid">${recent.map(card).join('')}</div>` : `<div class="card">${menu('request', L('Buyers need your stock', 'మీ సరుకు కొనుగోలుదారులకు కావాలి'), L('Send a quote to buyer requirements', 'అవసరాలకు ధర ప్రతిపాదన ఇవ్వండి'), 'requests')}${menu('shield', L('Contact privacy', 'సంప్రదింపు గోప్యత'), L('Sharing, buyer blocks and history', 'సంప్రదింపు అనుమతి మరియు బ్లాక్ జాబితా'), 'contact-privacy')}</div>`}
 <button class="journey-banner" data-action="flow-guide">${icon('help')}<span><strong>${L('New here? See the complete flow', 'కొత్తగా వచ్చారా? పూర్తి ప్రక్రియ చూడండి')}</strong><small>${L('Buying and selling in one app', 'ఒకే యాప్‌లో కొనుగోలు మరియు అమ్మకం')}</small></span>${icon('chevron')}</button>`, 'home', true);
};

manageListings = function () { const rows = state.listings.filter(p => p.own); return shell(L('My listings', 'నా లిస్టింగ్‌లు'), `<h1>${L('Keep your stock up to date.', 'మీ సరుకు వివరాలు తాజాగా ఉంచండి.')}</h1><p class="lead">${L('Edit a listing, pause enquiries or mark it sold.', 'లిస్టింగ్ మార్చండి, విచారణలు నిలిపివేయండి లేదా అమ్మినట్లు గుర్తించండి.')}</p>${btn(icon('plus') + L('Add a listing', 'లిస్టింగ్ జోడించండి'), 'start-sell')}<div class="spaced">${rows.length ? rows.map(p => `<div class="card"><div class="row"><div class="own-listing-cover">${listingCover(p)}</div><div style="flex:1"><h3>${esc(p.title)}</h3><p class="small muted">${money(p.price)} / ${unit(p.unit)} · ${p.quantity} ${unit(p.unit)}</p><span class="tag">${p.expires < today() ? L('Expired', 'గడువు ముగిసింది') : p.status === 'active' ? L('Available', 'లభ్యం') : p.status === 'sold' ? L('Sold', 'అమ్మబడింది') : L('Paused', 'నిలిపివేశారు')}</span></div></div><div class="inline-actions"><button data-action="edit-listing" data-id="${esc(p.id)}">${L('Edit', 'మార్చండి')}</button><button data-action="toggle-listing" data-id="${esc(p.id)}">${p.status === 'active' ? L('Pause', 'నిలిపివేయండి') : L('Activate', 'ప్రారంభించండి')}</button><button data-action="sold-listing" data-id="${esc(p.id)}">${L('Mark sold', 'అమ్మినట్లు గుర్తించండి')}</button><button data-action="renew-listing" data-id="${esc(p.id)}">${L('Renew', 'గడువు పెంచండి')}</button></div><button class="link" data-action="contact-settings" data-id="${esc(p.id)}">${icon('lock')}${L('Contact choices', 'సంప్రదింపు అనుమతి')}</button><button class="link" data-action="detail" data-id="${esc(p.id)}" style="float:right">${L('View listing', 'లిస్టింగ్ చూడండి')} →</button></div>`).join('') : empty(L('Your first listing starts here', 'మీ తొలి లిస్టింగ్ ఇక్కడ ప్రారంభం'), L('Add photos, your stock and your price.', 'ఫోటోలు, పరిమాణం మరియు ధర జోడించండి.'))}</div>`, 'manage-listings'); };

/* Media binaries are kept outside listing metadata in IndexedDB. */
let mediaDBPromise;

card = function (p) { const media = p.media || []; return `<article class="product"><button class="saved ${state.saved.includes(p.id) ? 'on' : ''}" data-action="save-listing" data-id="${esc(p.id)}" aria-label="${L('Save listing', 'లిస్టింగ్ సేవ్')}">${icon('heart')}</button><button class="product-media" data-action="detail" data-id="${esc(p.id)}" aria-label="${esc(title(p))}" style="width:100%;padding:0">${listingCover(p)}<span class="art-credit">${media.length ? media.length + ' ' + L('media', 'మీడియా') : L('Sample illustration', 'నమూనా చిత్రం')}</span>${media.some(m => m.kind === 'video') ? `<span class="video-badge">${icon('play')}</span>` : ''}</button><div class="product-body"><button data-action="detail" data-id="${esc(p.id)}" style="padding:0;text-align:left;width:100%"><h3>${esc(title(p))}</h3></button><div class="price">${money(p.price)} <small>/ ${unit(p.unit)}</small></div><p class="meta">${p.quantity.toLocaleString('en-IN')} ${unit(p.unit)} · ${esc(p.location)}</p><span class="tag">${icon('lock')}${L('Verified buyer contact', 'ధృవీకరించిన వారికి సంప్రదింపు')}</span></div></article>`; };

sellPage = function () {
    const step = Math.min(3, Number(ui.params.step || 1));
    if (!ui.draft)
        ui.draft = newDraft();
    const d = ui.draft, c = cat(d.cat);
    let html = `<div class="simple-progress" aria-label="${L('Listing progress', 'లిస్టింగ్ ప్రక్రియ')}">${[L('Category', 'వర్గం'), L('Photos & price', 'ఫోటోలు & ధర'), L('Preview & post', 'చూసి పోస్ట్')].map((s, i) => `<div class="${i + 1 <= step ? 'on' : ''}"><span>${i + 1 < step ? '✓' : i + 1}</span><small>${s}</small></div>`).join('')}</div>`;
    if (step === 1)
        html += `<h1>${L('What do you want to sell?', 'మీరు ఏమి అమ్మాలి?')}</h1><p class="lead">${L('Pick a category to get started.', 'ప్రారంభించడానికి వర్గం ఎంచుకోండి.')}</p><div class="category-list">${MD.categories.map(c => `<button class="option" data-action="sell-category" data-id="${c.id}"><img src="/market/art/${c.image}.svg" alt=""><div><strong>${L(c.name, c.te)}</strong><p>${L(c.help, c.helpTe)}</p></div>${icon('chevron')}</button>`).join('')}</div><button class="link spaced" data-action="voice-listing">${L('Try sample voice details', 'నమూనా వాయిస్ వివరాలు ప్రయత్నించండి')}</button>`;
    if (step === 2)
        html += `<h1>${L('Let buyers see it.', 'కొనుగోలుదారులకు చూపండి.')}</h1><p class="lead">${L(c.name, c.te)} · ${L('Draft saves as you go.', 'మీ వివరాలు డ్రాఫ్ట్‌గా సేవ్ అవుతాయి.')}</p><form data-form="easy-listing">${mediaEditor(d)}<div class="card spaced"><h2>${L('Just the essentials', 'ముఖ్య వివరాలు మాత్రమే')}</h2>${field(L('What are you selling?', 'మీరు ఏమి అమ్ముతున్నారు?'), 'title', d.title, 'text', 'required minlength="3" maxlength="90"', L('Example: Paddy harvest or Murrah buffalo', 'ఉదా: వరి పంట లేదా ముర్రా గేదె'))}<div class="fields-2">${field(L('Quantity', 'పరిమాణం'), 'quantity', d.quantity, 'number', 'required min="0.01" max="10000000" step="0.01" inputmode="decimal"')}${select(L('Unit', 'యూనిట్'), 'unit', (c.id === 'crops' ? ['quintal', 'kg'] : c.id === 'poultry' ? ['bird', 'kg'] : c.id === 'aqua' ? ['kg', 'fish'] : [c.unit]).map(u => [u, unit(u)]), d.unit)}</div>${field('<span id="price-unit-label">' + L('Your price (₹) per', 'మీ యూనిట్ ధర (₹)') + ' ' + unit(d.unit) + '</span>', 'price', d.price, 'number', 'required min="0.01" max="100000000" step="0.01" inputmode="decimal"')}<label class="check"><input name="negotiable" type="checkbox" ${d.negotiable ? 'checked' : ''}><span>${L('Open to price discussion', 'ధర చర్చించవచ్చు')}</span></label>${field(L('Village / town', 'గ్రామం / పట్టణం'), 'location', d.location, 'text', 'required maxlength="70"')}${select(L('State', 'రాష్ట్రం'), 'state', ['Andhra Pradesh', 'Telangana', 'Other'], d.state)}<button class="link" type="button" data-action="fill-sell">${L('Fill sample details to try', 'నమూనా వివరాలు నింపండి')}</button></div>
 <div class="card"><h2>${icon('lock')}${L('Your contact, your choice', 'మీ సంప్రదింపు, మీ నిర్ణయం')}</h2>${field(L('Mobile number', 'మొబైల్ నంబర్'), 'contactPhone', d.contactPhone, 'tel', 'maxlength="20" inputmode="tel"', L('Required only when you enable contact sharing.', 'సంప్రదింపు అనుమతిస్తేనే నంబర్ అవసరం.'))}<label class="check"><input type="checkbox" name="shareContacts" ${d.shareContacts ? 'checked' : ''}><span>${L('Share my number with verified buyers only', 'ధృవీకరించిన కొనుగోలుదారులతో మాత్రమే నంబర్ పంచండి')}</span></label><div class="fields-2"><label class="check"><input type="checkbox" name="allowWhatsApp" ${d.allowWhatsApp ? 'checked' : ''}><span>WhatsApp</span></label><label class="check"><input type="checkbox" name="allowCall" ${d.allowCall ? 'checked' : ''}><span>${L('Phone call', 'ఫోన్ కాల్')}</span></label></div>${select(L('Best time to contact', 'సంప్రదించడానికి అనుకూల సమయం'), 'contactTime', ['9 am – 6 pm', '6 am – 10 am', '4 pm – 8 pm', 'Any time'], d.contactTime)}<p class="micro">${L('Your number is hidden in listing cards, searches and share summaries. Buyer review is simulated here.', 'లిస్టింగ్, శోధన మరియు షేర్ సారాంశంలో మీ నంబర్ కనిపించదు. ఇక్కడ ధృవీకరణ నమూనా మాత్రమే.')}</p></div>
 <details class="optional-details"><summary>${L('More details (optional)', 'మరిన్ని వివరాలు (ఐచ్ఛికం)')}</summary>${DETAIL_FIELDS[d.cat].map((k, i) => field(L(k[0], k[1]), 'spec' + i, d.specValues[i] || '', 'text', 'maxlength="100"')).join('')}${textarea(L('Tell buyers a little more', 'కొనుగోలుదారులకు మరిన్ని వివరాలు'), 'description', d.description, 'maxlength="1200"')}${field(L('Minimum order', 'కనీస ఆర్డర్'), 'min', d.min || 1, 'number', 'min="0.01" step="0.01"')}${field(L('Available until', 'లభ్యత గడువు'), 'expires', d.expires, 'date', `min="${today()}"`)}</details>${errorBox()}<button class="btn" type="submit" ${comfort.mediaBusy ? 'disabled' : ''}>${L('Preview my listing', 'నా లిస్టింగ్ చూసుకోండి')} ${icon('chevron')}</button><button class="btn secondary spaced" type="button" data-action="save-draft">${L('Save and finish later', 'సేవ్ చేసి తరువాత పూర్తి చేయండి')}</button></form>`;
    if (step === 3)
        html += `<h1>${L('Looks good? Post it.', 'సరేనా? పోస్ట్ చేయండి.')}</h1><p class="lead">${L('Check your photos, price and contact choices.', 'ఫోటోలు, ధర మరియు సంప్రదింపు అనుమతి చూసుకోండి.')}</p><div class="card listing-preview">${gallery({ ...d, te: '' })}<h2>${esc(d.title)}</h2><div class="detail-price">${money(d.price)} <small>/ ${unit(d.unit)}</small></div><p class="muted">${esc(d.quantity)} ${unit(d.unit)} · ${esc(d.location)}</p><span class="tag">${d.negotiable ? L('Price discussion welcome', 'ధర చర్చించవచ్చు') : L('Fixed price', 'స్థిర ధర')}</span><div class="privacy-preview">${icon('lock')}<span>${d.shareContacts ? L('Verified buyers only', 'ధృవీకరించిన వారికి మాత్రమే') : L('Contact sharing is off', 'సంప్రదింపు అనుమతి లేదు')}<small>${d.shareContacts ? [d.allowWhatsApp ? 'WhatsApp' : '', d.allowCall ? L('Call', 'కాల్') : ''].filter(Boolean).join(' · ') : L('Turn sharing on later in My listings.', 'తరువాత నా లిస్టింగ్‌లలో అనుమతి ఇవ్వవచ్చు.')}</small></span></div></div><form data-form="sell-publish"><label class="check"><input name="confirmed" type="checkbox" required><span>${L('I checked the details and my contact choices.', 'వివరాలు మరియు సంప్రదింపు అనుమతి చూసుకున్నాను.')}</span></label>${errorBox()}${submit(d.editId ? L('Save my changes', 'నా మార్పులు సేవ్ చేయండి') : L('Post my listing', 'నా లిస్టింగ్ పోస్ట్ చేయండి'))}</form>${btn(L('Go back and edit', 'వెనక్కి వెళ్లి మార్చండి'), 'sell-step', '2', 'secondary spaced')}`;
    return shell(L('Sell in 3 easy steps', '3 సులభ దశల్లో అమ్మండి'), html, 'sell');
};

detail = function () {
    const p = getListing(ui.params.id);
    if (!p)
        return shell('Listing', empty('Listing unavailable', 'Return to the market.'));
    const s = seller(p.seller), allowed = contactAllowed(p), sharing = state.privateContacts[p.id]?.sharing !== false;
    return shell(L('Listing details', 'లిస్టింగ్ వివరాలు'), `${gallery(p)}<div class="row"><span class="tag">${L(cat(p.cat).name, cat(p.cat).te)}</span><button class="icon-button" data-action="save-listing" data-id="${esc(p.id)}" aria-label="Save listing">${icon('heart')}</button></div><h1 class="spaced">${esc(title(p))}</h1><div class="detail-price">${money(p.price)} <small>/ ${unit(p.unit)}</small></div><p class="meta">${esc(p.location)} · ${p.distance} ${L('km demo distance', 'కి.మీ నమూనా దూరం')}</p>${p.negotiable ? `<span class="tag gold">${L('Price discussion welcome', 'ధర చర్చించవచ్చు')}</span>` : ''}<div class="specs spaced"><div><small>${L('Available', 'లభ్యం')}</small><strong>${p.quantity.toLocaleString('en-IN')} ${unit(p.unit)}</strong></div><div><small>${L('Minimum order', 'కనీస ఆర్డర్')}</small><strong>${p.min} ${unit(p.unit)}</strong></div></div>
 <div class="contact-card spaced"><div class="person"><div class="avatar">${esc(s.initials)}</div><div class="info"><h3>${esc(L(s.name, s.te))}</h3><p>${esc(s.location)} · ${L('Seller', 'విక్రేత')}</p></div>${icon('shield')}</div><div class="contact-state">${icon(allowed ? 'shield' : 'lock')}<div><strong>${allowed ? L('Contact unlocked · demo', 'సంప్రదింపు అనుమతి · నమూనా') : sharing ? L('Seller contact is protected', 'విక్రేత సంప్రదింపు రక్షణ') : L('Seller paused contact sharing', 'విక్రేత సంప్రదింపు నిలిపారు')}</strong><p>${allowed ? L('Use WhatsApp or open your phone dialer.', 'వాట్సాప్ లేదా ఫోన్ డయలర్ తెరవండి.') : sharing ? L('Complete buyer verification to see the number.', 'నంబర్ చూడటానికి కొనుగోలుదారు ధృవీకరణ పూర్తి చేయండి.') : L('The seller can enable it again later.', 'విక్రేత తరువాత మళ్లీ అనుమతి ఇవ్వవచ్చు.')}</p></div></div>${allowed ? `<p class="contact-number">${state.privateContacts[p.id]?.phone ? esc('+91 ' + state.privateContacts[p.id].phone) : L('Sample seller · no live number', 'నమూనా విక్రేత · నిజమైన నంబర్ లేదు')}</p><p class="micro">${L('Preferred contact time', 'అనుకూల సమయం')}: ${esc(state.privateContacts[p.id]?.time || '9 am – 6 pm')}</p>` : ''}<div class="contact-buttons">${btn(icon('whatsapp') + 'WhatsApp', 'contact-whatsapp', p.id, 'whatsapp')}${btn(icon('phone') + L('Call', 'కాల్'), 'contact-call', p.id, 'secondary')}</div>${!allowed && sharing ? `<button class="link spaced" data-action="verify-contact" data-id="${esc(p.id)}">${L('Verify once to unlock contacts', 'సంప్రదింపుల కోసం ధృవీకరించండి')} →</button>` : ''}${p.own ? `<button class="link spaced" data-action="contact-settings" data-id="${esc(p.id)}">${L('Edit my contact choices', 'నా సంప్రదింపు అనుమతి మార్చండి')}</button>` : ''}</div>
 <div class="card"><h3>${L('Details from the seller', 'విక్రేత తెలిపిన వివరాలు')}</h3><div class="specs">${p.specs.map(([k, v]) => `<div><small>${esc(k)}</small><strong>${esc(v)}</strong></div>`).join('')}</div><p class="small muted spaced">${esc(publicDescription(p))}</p></div><details class="optional-details"><summary>${L('Checks & sample documents', 'తనిఖీలు & నమూనా పత్రాలు')}</summary><p class="small muted">${L('Seller identity, product quality and buyer verification are separate checks. All reports here are samples.', 'విక్రేత గుర్తింపు, సరుకు నాణ్యత మరియు కొనుగోలుదారు ధృవీకరణ వేర్వేరు తనిఖీలు. ఇక్కడ రిపోర్టులు నమూనాలు.')}</p>${['samplelab', 'samplevet'].includes(p.quality) ? btn(L('View sample report', 'నమూనా రిపోర్ట్ చూడండి'), 'listing-report', p.id, 'secondary spaced') : ''}</details>${btn(L('Record a demo offer (optional)', 'నమూనా ధర ప్రతిపాదన (ఐచ్ఛికం)'), 'offer', p.id, 'secondary spaced')}<div class="inline-actions"><button data-action="share-listing" data-id="${esc(p.id)}">${L('Share listing summary', 'లిస్టింగ్ సారాంశం పంచండి')}</button><button data-action="report-listing" data-id="${esc(p.id)}">${L('Report listing', 'లిస్టింగ్‌పై ఫిర్యాదు')}</button></div>`, '', false, '', `<div class="sticky-actions">${btn(icon('whatsapp') + 'WhatsApp', 'contact-whatsapp', p.id, 'whatsapp')}${btn(icon('phone') + L('Call seller', 'విక్రేతకు కాల్'), 'contact-call', p.id, 'secondary')}</div>`);
};

const demoBuyers = [{ id: 'B101', name: 'Sri Lakshmi Traders', business: 'Crop trader', city: 'Guntur', purpose: 'Resale', verified: true }, { id: 'B102', name: 'Local Dairy Buyer', business: 'Dairy farmer', city: 'Tenali', purpose: 'Dairy business', verified: true }, { id: 'B103', name: 'New buyer', business: 'Individual', city: 'Vijayawada', purpose: 'Farm use', verified: false }];

profilePage = function () { return baseProfile().replace('<div class="card spaced"><h3>', `<div class="card spaced"><h3>${L('Buyer verification', 'కొనుగోలుదారు ధృవీకరణ')}</h3><p class="small muted">${verificationLabel()}</p>${btn(L('Manage buyer verification', 'కొనుగోలుదారు ధృవీకరణ మార్చండి'), 'verification', '', 'secondary spaced')}</div><div class="card spaced"><h3>`); };

accountPage = function () { return baseAccount().replace('<div class="card">', `<div class="card spaced">${menu('shield', L('Buyer verification', 'కొనుగోలుదారు ధృవీకరణ'), verificationLabel(), 'verification')}${menu('lock', L('Contact privacy', 'సంప్రదింపు గోప్యత'), L('Sharing choices and blocked buyers', 'సంప్రదింపు అనుమతి మరియు బ్లాక్ జాబితా'), 'contact-privacy')}${menu('phone', L('Contact history', 'సంప్రదింపు చరిత్ర'), L('WhatsApp and call enquiries', 'వాట్సాప్ మరియు కాల్ విచారణలు'), 'contact-history')}${menu('help', L('Complete buying / selling flow', 'కొనుగోలు / అమ్మకం పూర్తి ప్రక్రియ'), L('Three-step listing and buyer verification', 'మూడు దశల లిస్టింగ్ మరియు ధృవీకరణ'), 'flow-guide')}</div><div class="card">`).replace('Offline prototype v1.0.', 'Offline prototype v1.1.'); };

photoModal = function () { modal(L('Try a sample illustration', 'నమూనా చిత్రం ప్రయత్నించండి'), `<p class="small muted">${L('For actual media, use Add photos or Add video on the listing form.', 'నిజమైన మీడియాకు లిస్టింగ్ ఫారంలో ఫోటోలు లేదా వీడియో జోడించండి.')}</p><div class="photo-grid spaced">${['paddy', 'maize', 'chilli', 'groundnut', 'cotton', 'tomato', 'banana', 'mango', 'buffalo', 'cow', 'bull', 'goat', 'sheep', 'chicken', 'layer', 'rooster', 'chicks', 'eggs', 'fish', 'prawn', 'fishseed', 'milk'].map(k => `<button class="photo-choice ${ui.draft.image === k ? 'selected' : ''}" data-action="photo-select" data-id="${k}"><img src="/market/art/${k}.svg" alt="${k}"><span>${k}</span></button>`).join('')}</div>`); };

handleAction = function (a, id) {
    const p = getListing(id);
    switch (a) {
        case 'comfort-nav':
            if (ui.route === 'sell')
                captureDraft();
            if (id === 'seller-home')
                state.profile.role = 'seller';
            if (id === 'browse')
                state.profile.role = 'buyer';
            save();
            ui.stack = [];
            go(id, {}, true);
            break;
        case 'buy-mode':
            if (ui.route === 'sell')
                captureDraft();
            state.profile.role = 'buyer';
            save();
            ui.stack = [];
            go('home', {}, true);
            break;
        case 'sell-mode':
            if (ui.route === 'sell')
                captureDraft();
            state.profile.role = 'seller';
            save();
            ui.stack = [];
            go('seller-home', {}, true);
            break;
        case 'switch-role': return handleAction(state.profile.role === 'buyer' ? 'sell-mode' : 'buy-mode');
        case 'seller-home':
        case 'activity':
        case 'verification':
        case 'buyer-review':
        case 'seller-enquiries':
        case 'contact-privacy':
        case 'contact-history':
        case 'flow-guide':
            go(a);
            break;
        case 'sell-category-home':
            ui.draft = newDraft(id);
            state.profile.role = 'seller';
            persistDraft();
            go('sell', { step: 2 });
            break;
        case 'start-sell':
            if (state.savedDraft) {
                modal(L('Continue your draft?', 'మీ డ్రాఫ్ట్ కొనసాగించాలా?'), `<p>${esc(state.savedDraft.title || L('Your unfinished listing', 'మీ అసంపూర్తి లిస్టింగ్'))}</p><div class="btn-row spaced">${btn(L('Continue draft', 'డ్రాఫ్ట్ కొనసాగించండి'), 'resume-draft')}${btn(L('Start another listing', 'మరో లిస్టింగ్ ప్రారంభించండి'), 'new-comfort-draft', '', 'secondary')}</div>`);
            }
            else
                return handleAction('new-comfort-draft');
            break;
        case 'new-comfort-draft':
            ui.draft = newDraft();
            state.profile.role = 'seller';
            persistDraft();
            go('sell', { step: 1 });
            break;
        case 'resume-draft':
            ui.draft = clone(state.savedDraft || newDraft());
            state.profile.role = 'seller';
            save();
            go('sell', { step: ui.draft.title ? 2 : 1 });
            break;
        case 'save-draft':
            captureDraft();
            toast(L('Draft saved. Come back any time.', 'డ్రాఫ్ట్ సేవ్ అయింది. ఎప్పుడైనా కొనసాగించండి.'));
            go('seller-home');
            break;
        case 'sell-category':
            ui.draft = newDraft(id);
            persistDraft();
            go('sell', { step: 2 }, true);
            break;
        case 'fill-sell': {
            const phone = ui.draft?.contactPhone;
            const media = ui.draft?.media || [];
            baseHandleAction(a, id);
            ui.draft.contactPhone = phone || '';
            if (!phone)
                ui.draft.shareContacts = false;
            ui.draft.media = media;
            persistDraft();
            render();
            break;
        }
        case 'edit-listing': {
            if (!p || !p.own)
                break;
            const c = state.privateContacts[id] || {};
            ui.draft = { ...newDraft(p.cat), ...clone(p), specValues: p.specs.map(s => s[1] === 'Not provided' ? '' : s[1]), editId: id, contactPhone: c.phone || '', shareContacts: c.sharing !== false, allowWhatsApp: c.whatsapp !== false, allowCall: c.call !== false, contactTime: c.time || '9 am – 6 pm' };
            persistDraft();
            go('sell', { step: 2 });
            break;
        }
        case 'remove-media':
            captureDraft();
            if (ui.draft) {
                ui.draft.media = (ui.draft.media || []).filter(m => m.id !== id);
                persistDraft();
                comfort.mediaMessage = '';
                render();
            }
            break;
        case 'cover-media':
            captureDraft();
            if (ui.draft) {
                const item = ui.draft.media.find(m => m.id === id);
                if (item?.kind === 'photo')
                    ui.draft.media = [item, ...ui.draft.media.filter(m => m.id !== id)];
                persistDraft();
                render();
            }
            break;
        case 'gallery-select':
            comfort.gallery = Number(id) || 0;
            render();
            break;
        case 'verify-contact':
            comfort.pendingContact = { id, channel: 'whatsapp' };
            go('verification');
            break;
        case 'contact-whatsapp': return openContact(id, 'whatsapp');
        case 'contact-call':
        case 'call-demo': return openContact(id, 'call');
        case 'launch-whatsapp': return launchContact(id, 'whatsapp');
        case 'launch-call': return launchContact(id, 'call');
        case 'continue-contact': {
            const next = comfort.pendingContact;
            comfort.pendingContact = null;
            if (next) {
                go('detail', { id: next.id }, true);
                openContact(next.id, next.channel);
            }
            else
                go('browse');
            break;
        }
        case 'approve-buyer':
            if (state.buyerVerification.status === 'pending') {
                state.buyerVerification.status = 'approved';
                state.buyerVerification.approvedAt = Date.now();
                save();
                notify('Demo buyer approved; contact flow unlocked', 'నమూనా కొనుగోలుదారు అంగీకారం; సంప్రదింపు అనుమతి', 'verification');
                save();
                go('verification', {}, true);
            }
            break;
        case 'reject-buyer':
            state.buyerVerification.status = 'changes';
            comfort.verificationStep = 2;
            save();
            go('verification', {}, true);
            break;
        case 'edit-verification':
            comfort.verificationStep = 2;
            comfort.otp = { phone: state.profile.phone, confirmed: true };
            state.buyerVerification.status = 'unverified';
            save();
            go('verification', {}, true);
            break;
        case 'reset-verification':
            state.buyerVerification = { status: 'unverified', demo: true };
            comfort.otp = null;
            comfort.verificationStep = 1;
            save();
            render();
            break;
        case 'contact-settings':
            contactSettings(id);
            break;
        case 'block-buyer':
            if (!state.blockedBuyers.includes(id))
                state.blockedBuyers.push(id);
            save();
            render();
            toast(L('Buyer blocked in demo', 'నమూనాలో కొనుగోలుదారు బ్లాక్ చేశారు'));
            break;
        case 'unblock-buyer':
            state.blockedBuyers = state.blockedBuyers.filter(x => x !== id);
            save();
            render();
            break;
        case 'chat-listing':
            if (!contactAllowed(p)) {
                comfort.pendingContact = { id, channel: 'whatsapp' };
                go('verification');
            }
            else
                baseHandleAction(a, id);
            break;
        case 'detail':
            comfort.gallery = 0;
            baseHandleAction(a, id);
            break;
        case 'confirm-reset': {
            for (const url of objectURLs.values())
                window.URL.revokeObjectURL(url);
            objectURLs.clear();
            if (window.indexedDB) {
                const oldDB = mediaDBPromise;
                mediaDBPromise = null;
                if (oldDB)
                    oldDB.then(db => { db.close(); window.indexedDB.deleteDatabase('agromitra.media.v11'); }).catch(() => { });
                else
                    window.indexedDB.deleteDatabase('agromitra.media.v11');
            }
            baseHandleAction(a, id);
            migrateComfort();
            save();
            render();
            break;
        }
        default:
            baseHandleAction(a, id);
            if (['photo-select', 'sell-step', 'voice-listing'].includes(a))
                persistDraft();
    }
};

handleForm = function (type, o, meta = {}) {
    switch (type) {
        case 'easy-listing': {
            if (comfort.mediaBusy)
                return error(L('Wait until the media finishes saving.', 'మీడియా సేవ్ అయ్యే వరకు వేచి ఉండండి.'));
            draftCapture(o);
            const d = ui.draft, c = cat(d.cat), q = Number(o.quantity), pr = Number(o.price), minimum = Number(o.min || Math.min(1, q));
            if (!o.title?.trim() || o.title.trim().length < 3 || !validNumber(q) || !validNumber(pr) || !validNumber(minimum))
                return error(L('Enter a name, quantity and price.', 'పేరు, పరిమాణం మరియు ధర నమోదు చేయండి.'));
            if (q > 10000000 || pr > 100000000 || minimum > q || !discreteQuantity(q, o.unit) || !discreteQuantity(minimum, o.unit))
                return error(L('Check the quantity, unit, minimum order and price.', 'పరిమాణం, యూనిట్, కనీస ఆర్డర్ మరియు ధర చూసుకోండి.'));
            const allowedUnits = c.id === 'crops' ? ['quintal', 'kg'] : c.id === 'poultry' ? ['bird', 'kg'] : c.id === 'aqua' ? ['kg', 'fish'] : [c.unit];
            if (!allowedUnits.includes(o.unit))
                return error(L('Choose the correct unit for this category.', 'ఈ వర్గానికి సరైన యూనిట్ ఎంచుకోండి.'));
            if (!o.location?.trim() || (o.expires && o.expires < today()))
                return error(L('Enter your village and a valid availability date.', 'మీ గ్రామం మరియు సరైన లభ్యత గడువు నమోదు చేయండి.'));
            if (o.shareContacts && (!validPhone(o.contactPhone) || (!o.allowCall && !o.allowWhatsApp)))
                return error(L('Add a valid Indian mobile number and choose WhatsApp or calls, or turn sharing off.', 'సరైన మొబైల్ నంబర్ మరియు వాట్సాప్ లేదా కాల్ ఎంచుకోండి. లేకపోతే సంప్రదింపు అనుమతి నిలిపివేయండి.'));
            const leaked = [o.title, o.description, o.location, ...d.specValues].filter(Boolean).some(x => /(?:\+?91[\s-]?)?[6-9](?:[\s-]?\d){9}/.test(x));
            if (leaked)
                return error(L('Keep phone numbers in the contact field only. Remove them from the public listing details.', 'ఫోన్ నంబర్ సంప్రదింపు ఫీల్డ్‌లో మాత్రమే పెట్టండి. లిస్టింగ్ వివరాల నుంచి తొలగించండి.'));
            Object.assign(d, { title: o.title.trim(), quantity: q, price: pr, min: minimum, unit: o.unit, location: o.location.trim(), state: o.state || 'Andhra Pradesh', expires: o.expires || future(14), specValues: d.specValues.map(x => String(x || '').trim()), description: String(o.description || '').trim() || L('Contact the seller to discuss availability and arrange a visit.', 'లభ్యత మరియు సందర్శన కోసం విక్రేతను సంప్రదించండి.'), contactPhone: cleanPhone(o.contactPhone), shareContacts: !!o.shareContacts, allowWhatsApp: !!o.allowWhatsApp, allowCall: !!o.allowCall, negotiable: !!o.negotiable });
            persistDraft();
            comfort.gallery = 0;
            go('sell', { step: 3 }, true);
            return true;
        }
        case 'sell-publish': {
            if (!ui.draft)
                return error(L('Create a listing first.', 'ముందు లిస్టింగ్ సృష్టించండి.'));
            if (!o.confirmed)
                return error(L('Check the details before posting.', 'పోస్ట్ చేయడానికి ముందు వివరాలు చూసుకోండి.'));
            const draft = clone(ui.draft);
            draft.specValues = draft.specValues.map(x => x || 'Not provided');
            ui.draft.specValues = draft.specValues;
            const ok = baseHandleForm(type, o, meta);
            if (!ok)
                return ok;
            const id = ui.params.listingId, p = getListing(id);
            p.media = draft.media || [];
            p.negotiable = !!draft.negotiable;
            state.privateContacts[id] = { phone: cleanPhone(draft.contactPhone), sharing: !!draft.shareContacts, whatsapp: !!draft.allowWhatsApp, call: !!draft.allowCall, time: draft.contactTime || '9 am – 6 pm', consentedAt: Date.now() };
            delete state.savedDraft;
            save();
            render();
            return true;
        }
        case 'buyer-phone': {
            if (!validPhone(o.phone))
                return error(L('Enter a valid 10-digit Indian test mobile number.', 'సరైన 10 అంకెల నమూనా మొబైల్ నంబర్ నమోదు చేయండి.'));
            comfort.otp = { phone: cleanPhone(o.phone), confirmed: false, expires: Date.now() + 5 * 60000, attempts: 0 };
            modal(L('Enter demo OTP', 'నమూనా OTP నమోదు చేయండి'), `<form data-form="buyer-otp"><p class="small muted">${L('No SMS is sent. The prototype code is', 'SMS పంపబడదు. నమూనా కోడ్')} <strong>123456</strong>.</p>${field(L('6-digit demo code', '6 అంకెల నమూనా కోడ్'), 'code', '', 'text', 'required maxlength="6" pattern="[0-9]{6}" inputmode="numeric" autocomplete="one-time-code"')}${errorBox()}${submit(L('Continue', 'కొనసాగండి'))}</form>`);
            return true;
        }
        case 'buyer-otp': {
            const token = comfort.otp;
            if (!token || token.expires < Date.now() || token.attempts >= 5) {
                comfort.otp = null;
                return error(L('Request a new demo OTP.', 'కొత్త నమూనా OTP పొందండి.'));
            }
            token.attempts++;
            if (String(o.code) !== '123456')
                return error(L('Use the displayed demo code 123456.', 'నమూనా కోడ్ 123456 వాడండి.'));
            token.confirmed = true;
            state.profile.phone = token.phone;
            state.buyerVerification = { status: 'unverified', phone: token.phone, demo: true };
            comfort.verificationStep = 2;
            save();
            closeModal();
            go('verification', {}, true);
            return true;
        }
        case 'buyer-details': {
            if (!comfort.otp?.confirmed || comfort.otp.phone !== state.profile.phone)
                return error(L('Complete the demo phone step first.', 'ముందు నమూనా ఫోన్ దశ పూర్తి చేయండి.'));
            if (!o.name?.trim() || o.name.trim().length < 2 || !o.city?.trim() || !o.business || !o.purpose || !o.consent)
                return error(L('Complete the buyer profile and consent.', 'కొనుగోలుదారు వివరాలు మరియు అనుమతి పూర్తి చేయండి.'));
            state.buyerVerification = { status: 'pending', phone: state.profile.phone, name: o.name.trim().slice(0, 60), business: o.business, city: o.city.trim().slice(0, 70), purpose: o.purpose, consent: true, demo: true, submittedAt: Date.now() };
            save();
            render();
            return true;
        }
        case 'contact-settings': {
            const p = getListing(meta.id);
            if (!p?.own)
                return false;
            if (o.sharing && (!validPhone(o.phone) || (!o.call && !o.whatsapp)))
                return error(L('Use a valid phone number and allow at least one contact method.', 'సరైన నంబర్ మరియు ఒక సంప్రదింపు విధానం ఎంచుకోండి.'));
            state.privateContacts[p.id] = { phone: cleanPhone(o.phone), sharing: !!o.sharing, whatsapp: !!o.whatsapp, call: !!o.call, time: o.time || '9 am – 6 pm', consentedAt: Date.now() };
            save();
            closeModal();
            render();
            return true;
        }
        case 'profile': {
            const name = state.profile.name, result = baseHandleForm(type, o, meta);
            if (result && o.name.trim() !== name) {
                state.buyerVerification = { status: 'unverified', demo: true };
                comfort.otp = null;
                comfort.verificationStep = 1;
                save();
                render();
            }
            return result;
        }
        default: return baseHandleForm(type, o, meta);
    }
};

Object.assign(ROUTES, { home, detail, sell: sellPage, 'manage-listings': manageListings, account: accountPage, profile: profilePage, 'seller-home': sellerHome, activity: activityPage, verification: verificationPage, 'buyer-review': buyerReview, 'contact-history': historyPage, 'contact-privacy': privacyPage, 'seller-enquiries': sellerEnquiries, 'flow-guide': flowGuide });

const baseRender = render;

render = function () { baseRender(); hydrateMedia(); };

document.addEventListener('change', event => { const input = event.target; if (input.dataset?.mediaKind)
    addMedia(input.files, input.dataset.mediaKind);
else if (ui.route === 'sell' && input.name) {
    captureDraft();
    if (input.name === 'unit') {
        const label = document.getElementById('price-unit-label');
        if (label)
            label.textContent = L('Your price (₹) per', 'మీ యూనిట్ ధర (₹)') + ' ' + unit(input.value);
    }
} });

document.addEventListener('input', event => { if (ui.route === 'sell' && !event.target.dataset?.mediaKind) {
    const input = event.target;
    if (input.name === 'quantity' && Number(input.value) > 0) {
        const f = input.closest('form'), minimum = f?.elements?.min;
        if (minimum && Number(minimum.value) > Number(input.value))
            minimum.value = String(Math.min(1, Number(input.value)));
    }
    captureDraft();
} if (event.target.id === 'browse-search')
    hydrateMedia(); });

window.addEventListener('pagehide', () => { if (ui.route === 'sell')
    captureDraft(); });

window.MarketApp = { get state() { return state; }, ui, comfort, render, go, handleAction, handleForm, filtered, initialState, save, STAGES, buyerApproved, contactAllowed, validMedia, addMedia, mediaStore, mediaLoad, publicDescription, launchContact };
