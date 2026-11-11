'use strict';

const MD = window.MARKET_DATA, STORAGE = 'agromitra.market.prototype.v1';

const ICONS = window.MARKET_ICONS;

const icon = (name) => {
    const markup = ICONS[name] || ICONS.leaf;
    return markup.trim().startsWith('<svg') ? markup : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + markup + '</svg>';
};

const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const clone = (x) => JSON.parse(JSON.stringify(x));

const today = () => new Date().toISOString().slice(0, 10);

const future = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

const uid = (p) => p + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();

let state;

try {
    const raw = JSON.parse(localStorage.getItem(STORAGE));
    const defaults = initialState();
    state = raw && raw.version === 1 && Array.isArray(raw.listings)
        ? { ...defaults, ...raw, profile: { ...defaults.profile, ...(raw.profile || {}) } }
        : defaults;
    for (const key of ['listings','requests','saved','deals','chats','notifications','tickets','ratings','promotions']) {
        if (!Array.isArray(state[key])) state[key] = defaults[key];
    }
}
catch (e) {
    state = initialState();
}

const L = (e, t) => state.profile.language === 'te' && t ? t : e;

const cat = (id) => MD.categories.find(c => c.id === id) || MD.categories[0];

const title = (p) => L(p.title, p.te);

const unit = (u) => L(({ quintal: 'quintal', kg: 'kg', animal: 'animal', bird: 'bird', egg: 'egg', litre: 'litre', fish: 'fish seed' })[u] || u, ({ quintal: 'క్వింటాల్', kg: 'కిలో', animal: 'జంతువు', bird: 'కోడి', egg: 'గుడ్డు', litre: 'లీటరు', fish: 'చేప పిల్ల' })[u]);

const seller = (id) => id === 'ME' ? { name: state.profile.name, te: state.profile.name, initials: state.profile.name.slice(0, 2).toUpperCase(), type: 'Your demo profile', location: state.profile.city } : MD.sellers.find(s => s.id === id) || MD.sellers[0];

const getListing = (id) => state.listings.find(p => p.id === id);

const getRequest = (id) => state.requests.find(r => r.id === id);

const getDeal = (id) => state.deals.find(d => d.id === id);

const dealTotal = (d) => Math.round(d.quantity * d.price * 100) / 100;

const paid = (d) => d.payments.reduce((a, p) => a + p.amount, 0);

const remaining = (d) => d.stage === 'cancelled' ? 0 : Math.max(0, dealTotal(d) - paid(d));

const ui = { route: state.profile.onboarded ? 'home' : 'welcome', params: {}, stack: [], filters: { cat: 'all', query: '', distance: 0, price: 0, quality: 'all', sort: 'recent', location: 'All' }, requestCat: 'all', requestTab: 'all', dealTab: 'active', draft: null, requestDraft: null };

let toastTimer;

window.handleAndroidBack = function () { if (document.getElementById('modal-root').innerHTML) {
    closeModal();
    return true;
} if (ui.route === 'sell' && Number(ui.params.step) > 1) {
    captureDraft();
    go('sell', { step: ui.params.step - 1 }, true);
    return true;
} if (ui.stack.length) {
    back();
    return true;
} if (!['home', 'welcome'].includes(ui.route)) {
    tab('home');
    return true;
} return false; };

const btn = (text, action, id = '', cls = '') => `<button class="btn ${cls}" data-action="${action}" ${id ? `data-id="${esc(id)}"` : ''}>${text}</button>`;

const note = (en, te, gold = false) => `<div class="notice ${gold ? 'gold' : ''}">${L(en, te)}</div>`;

const selectOptions = (arr, value) => arr.map(o => { const v = typeof o === 'string' ? o : o[0], text = typeof o === 'string' ? o : o[1]; return `<option value="${esc(v)}" ${v == value ? 'selected' : ''}>${esc(text)}</option>`; }).join('');

const errorBox = () => '<div class="form-error" id="form-error" role="alert"></div>';

const submit = (text) => `<button class="btn" type="submit">${text}</button>`;

const DETAIL_FIELDS = { crops: [['Variety', 'రకం'], ['Harvest / availability', 'పంట / లభ్యత'], ['Moisture / grade (declared)', 'తేమ / గ్రేడ్ (విక్రేత ప్రకటన)'], ['Packing', 'ప్యాకింగ్']], produce: [['Variety', 'రకం'], ['Harvest / ripeness', 'కోత / పక్వత'], ['Sorting grade (declared)', 'నాణ్యత గ్రేడ్ (విక్రేత ప్రకటన)'], ['Packing / pickup window', 'ప్యాకింగ్ / పికప్ సమయం']], cattle: [['Breed', 'జాతి'], ['Age / lactation (declared)', 'వయసు / ఈత (విక్రేత ప్రకటన)'], ['Milk yield / purpose (declared)', 'పాల దిగుబడి / ప్రయోజనం'], ['Health / vaccination records', 'ఆరోగ్య / టీకా పత్రాలు']], smallstock: [['Breed', 'జాతి'], ['Age range (declared)', 'వయసు (విక్రేత ప్రకటన)'], ['Average weight (declared)', 'సగటు బరువు (విక్రేత ప్రకటన)'], ['Health / vaccination records', 'ఆరోగ్య / టీకా పత్రాలు']], poultry: [['Broiler / layer / desi / chicks', 'బ్రాయిలర్ / లేయర్ / దేశీ / పిల్లలు'], ['Age and bird count', 'వయసు మరియు కోళ్ల సంఖ్య'], ['Average weight (declared)', 'సగటు బరువు (విక్రేత ప్రకటన)'], ['Flock records / pickup', 'బ్యాచ్ పత్రాలు / పికప్']], eggs: [['Table / hatching eggs', 'తినే / పొదిగే గుడ్లు'], ['Collection date', 'సేకరణ తేదీ'], ['Grade (declared)', 'గ్రేడ్ (విక్రేత ప్రకటన)'], ['Tray packing / breakage terms', 'ట్రే ప్యాకింగ్ / పగుళ్ల నిబంధనలు']], aqua: [['Species / seed type', 'జాతి / పిల్లల రకం'], ['Size / count (declared)', 'పరిమాణం / కౌంట్'], ['Harvest / availability', 'కోత / లభ్యత'], ['Handling / temperature needs', 'రవాణా / ఉష్ణోగ్రత అవసరాలు']], dairy: [['Milk type / product', 'పాల రకం / ఉత్పత్తి'], ['Collection timing', 'సేకరణ సమయం'], ['Fat / SNF (declared)', 'ఫ్యాట్ / ఎస్ఎన్ఎఫ్'], ['Handling / temperature needs', 'నిల్వ / ఉష్ణోగ్రత అవసరాలు']] };

const STAGES = ['quote', 'inspection', 'agreement', 'payment', 'transport', 'delivery', 'complete'];

const stageLabel = (s) => L(({ quote: 'Quote / negotiation', inspection: 'Inspection / visit', agreement: 'Agree trade terms', payment: 'Payment arrangement', transport: 'Book transport', delivery: 'Pickup and delivery', complete: 'Completed', cancelled: 'Cancelled / refunded' })[s], ({ quote: 'ధర చర్చ', inspection: 'తనిఖీ / సందర్శన', agreement: 'వ్యాపార నిబంధనలు', payment: 'చెల్లింపు ఏర్పాటు', transport: 'రవాణా బుకింగ్', delivery: 'పికప్ మరియు డెలివరీ', complete: 'పూర్తయింది', cancelled: 'రద్దు / తిరిగి చెల్లింపు' })[s]);

const menu = (i, t, sub, action) => `<button class="menu-row" data-action="${action}"><span class="menu-icon">${icon(i)}</span><span class="info"><strong>${t}</strong><small>${sub}</small></span>${icon('chevron')}</button>`;

const ROUTES = { home, browse, detail, welcome, onboard, saved: savedPage, requests: requestsPage, 'request-detail': requestDetail, 'request-form': requestForm, offer: offerForm, sell: sellPage, 'manage-listings': manageListings, deals: dealsPage, deal: dealPage, inspection: inspectionForm, 'inspection-results': inspectionResults, agreement: agreementForm, payment: paymentForm, transport: transportForm, receipt: receiptForm, inbox: inboxPage, chat: chatPage, notifications: notificationsPage, account: accountPage, profile: profilePage, services: servicesPage, plans: plansPage, payments: paymentsPage, document: documentPage, support: supportPage, ticket: ticketForm, help: helpPage, admin: adminPage, moderation: moderationPage, success: successPage };

document.addEventListener('click', e => { const el = e.target.closest('[data-action]'); if (!el)
    return; e.preventDefault(); handleAction(el.dataset.action, el.dataset.id || '', el); });

document.addEventListener('submit', e => { const f = e.target.closest('form[data-form]'); if (!f)
    return; e.preventDefault(); handleForm(f.dataset.form, Object.fromEntries(new FormData(f)), f.dataset); });

document.addEventListener('input', e => { if (e.target.id === 'browse-search') {
    ui.filters.query = e.target.value;
    const rows = filtered();
    document.getElementById('result-count').textContent = rows.length + ' ' + L('available demo listings', 'లభ్యమైన నమూనా లిస్టింగ్‌లు');
    document.getElementById('browse-results').innerHTML = rows.length ? `<div class="grid">${rows.map(card).join('')}</div>` : empty(L('No matches', 'సరిపోలేవి లేవు'), L('Try another title or location.', 'మరో పేరు లేదా ప్రాంతం ప్రయత్నించండి.'));
} if (e.target.closest('form[data-form="offer"]')) {
    const f = e.target.closest('form'), v = Object.fromEntries(new FormData(f));
    document.getElementById('offer-total').textContent = L('Indicative lot value', 'అంచనా సరుకు విలువ') + ': ' + money(Number(v.quantity) * Number(v.price));
} });

document.addEventListener('change', e => { if (e.target.name === 'category' && e.target.closest('form[data-form="voice"]'))
    voiceModal(e.target.value); if (e.target.name === 'cat' && e.target.closest('form[data-form="request"]')) {
    const f = e.target.closest('form');
    f.elements.unit.value = cat(e.target.value).unit;
} });

document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.getAttribute('role') === 'button' && e.target.dataset.action) {
    e.preventDefault();
    handleAction(e.target.dataset.action, e.target.dataset.id);
} });

window.MarketApp = { get state() { return state; }, ui, render, go, handleAction, handleForm, filtered, initialState, save, STAGES };
