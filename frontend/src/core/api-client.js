/* Backend client. Active only when the build supplies an API URL (see scripts/build-web.cjs).
   Without one the app stays the self-contained offline demo. */
const API_BASE = String((window.MARKET_CONFIG && window.MARKET_CONFIG.apiUrl) || '').replace(/\/+$/, '');
const SESSION_KEY = 'agromitra.market.session.v1';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const remote = { session: null, me: null, synced: false, busy: false, challenge: null, links: {}, quote: null, syncVersion:0, error:'', loading:false, media:new Map() };

try {
    const stored = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    if (stored && stored.token && UUID.test(stored.userId || '') && Date.parse(stored.expiresAt) > Date.now())
        remote.session = stored;
    else if (stored)
        localStorage.removeItem(SESSION_KEY);
}
catch (_) { /* Session storage can be unavailable; sign-in then lasts until the page closes. */ }

const apiEnabled = () => !!API_BASE && window.MARKET_CONFIG?.dataSource !== 'local';
const signedIn = () => !!remote.session;
const myId = () => remote.session ? remote.session.userId : '';

if (window.MARKET_CONFIG?.dataSource === 'local') {
    // An earlier API session may have saved empty arrays. Restore missing JSON
    // entries without resetting the profile, saved items or local edits.
    const defaults = initialState();
    for (const key of ['listings', 'requests']) {
        const existing = new Set(state[key].map(row => row.id));
        state[key].push(...defaults[key].filter(row => !existing.has(row.id)));
    }
}

function storeSession(session) {
    remote.session = session;
    try {
        if (session)
            localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        else
            localStorage.removeItem(SESSION_KEY);
    }
    catch (_) { /* Keep the in-memory session. */ }
}

function endSession() {
    storeSession(null);
    remote.me = null;
    remote.links = {};
    remote.quote = null;
    state.saved=[];
    state.chats=[];
    state.deals=[];
    state.profile.phone='';
    for (const [id,url] of objectURLs) if (UUID.test(id)) {URL.revokeObjectURL(url);objectURLs.delete(id);}
    remote.media.clear();
}

class ApiError extends Error {
    constructor(status, message) { super(message); this.status = status; }
}

async function api(method, path, body, options = {}) {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), options.timeout || 12000);
    const multipart = typeof FormData !== 'undefined' && body instanceof FormData;
    const session = remote.session;
    const authed = options.auth !== false && session;
    try {
        const response = await fetch(API_BASE + path, {
            method, signal: controller.signal,
            headers: { ...(body !== undefined && !multipart ? { 'Content-Type': 'application/json' } : {}), ...(authed ? { Authorization: 'Bearer ' + session.token } : {}) },
            ...(body !== undefined ? { body: multipart ? body : JSON.stringify(body) } : {}),
        });
        let data = null;
        try { data = await response.json(); } catch (_) { /* Empty or non-JSON body. */ }
        if (!response.ok) {
            if (response.status === 401 && authed && remote.session?.token === session.token)
                endSession();
            const message = data && data.message;
            throw new ApiError(response.status, Array.isArray(message) ? message.join('. ') : (message || 'The request was not accepted.'));
        }
        return data;
    }
    catch (e) {
        if (e instanceof ApiError)
            throw e;
        throw new ApiError(0, 'The server could not be reached. Check your connection and try again.');
    }
    finally {
        clearTimeout(timer);
    }
}

function newUUID() {
    if (window.crypto && window.crypto.randomUUID)
        return window.crypto.randomUUID();
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/* ---------- Mapping between server records and the UI's records ---------- */

function registerSeller(user) {
    if (!user || !user.id)
        return;
    const name = user.displayName || 'Agromitra seller';
    const entry = { id: user.id, name, te: name, type: 'Marketplace seller', location: user.city || '', initials: name.slice(0, 2).toUpperCase() };
    const existing = MD.sellers.find(s => s.id === user.id);
    if (existing)
        Object.assign(existing, entry);
    else
        MD.sellers.push(entry);
}

const dayOf = iso => String(iso || '').slice(0, 10);
/** Expiry fields are plain dates in the UI; the server stores an instant (end of that day, India time). */
const endOfDayISO = date => new Date(date + 'T23:59:59+05:30').toISOString();

function uiListing(row) {
    const own = row.sellerId === myId();
    if (row.seller)
        registerSeller(row.seller);
    const details = Array.isArray(row.details) ? row.details : [];
    return {
        id: row.id, cat: row.category, title: row.title, te: '', price: Number(row.price), unit: row.unit,
        quantity: Number(row.quantity), min: Number(row.minimumOrder), image: cat(row.category).image,
        seller: own ? 'ME' : row.sellerId, location: row.city, state: row.state, distance: null, sub: row.product,
        specs: details.length ? details.map(d => [d.label, d.value]) : [['Variety', row.variety], ['Grade', row.grade]],
        quality: 'declared', description: row.description, status: row.status, created: Date.parse(row.createdAt),
        expires: dayOf(row.expiresAt), own, identity: 'none', media: (row.media || []).map(media => {
            remote.media.set(media.id, { ...media, own });
            return { ...media, remoteId:media.id };
        }), revision: row.revision,
        remote: { product: row.product, variety: row.variety, grade: row.grade, district: row.district, allowCall: !!row.allowCall, allowWhatsapp: !!row.allowWhatsapp },
    };
}

/** Request body for create/replace; `d` is a draft, `existing` an already-published UI listing. */
function apiListing(d, existing) {
    const specs = (DETAIL_FIELDS[d.cat] || []).map((field, i) => ({ label: field[0], value: String((d.specValues || [])[i] || 'Not provided').slice(0, 120) }));
    return {
        title: d.title.trim(), description: String(d.description || '').trim(), category: d.cat,
        product: (existing && existing.remote.product) || d.title.trim().slice(0, 100),
        variety: String((d.specValues || [])[0] || (existing && existing.remote.variety) || 'Unspecified').slice(0, 100),
        grade: (existing && existing.remote.grade) || 'Unspecified', details: specs, unit: d.unit,
        price: Number(d.price), quantity: Number(d.quantity), minimumOrder: Number(d.min),
        city: d.location.trim(), district: (existing && existing.remote.district) || d.location.trim(), state: d.state || 'Andhra Pradesh',
        expiresAt: endOfDayISO(d.expires),
    };
}

function uiRequest(row) {
    return {
        id: row.id, cat: row.category, title: row.title, te: '', quantity: Number(row.quantity), unit: row.unit,
        budget: row.budget == null ? 0 : Number(row.budget), location: row.city,
        buyer: (row.buyer && row.buyer.displayName) || 'Agromitra buyer', purpose: row.purpose || '', note: row.note || '',
        expires: dayOf(row.expiresAt), own: row.buyerId === myId(), status: row.closed ? 'closed' : 'open', buyerId: row.buyerId,
    };
}

// The server tracks five stages; payment and transport are arranged outside the app, so they have no stage here.
const UI_STAGE = { quote: 'quote', inspection: 'inspection', agreed: 'agreement', dispatched: 'delivery', completed: 'complete', cancelled: 'cancelled' };

function uiDeal(row) {
    const listing = row.listing || {};
    return {
        id: row.id, listingId: row.listingId, title: listing.title || 'Listing', cat: listing.category || 'crops', image: cat(listing.category || 'crops').image,
        quantity: Number(row.quantity), unit: row.unit, price: Number(row.unitPrice),
        buyer: (row.buyer && row.buyer.displayName) || 'Agromitra buyer', seller: (row.seller && row.seller.displayName) || 'Agromitra seller',
        location: listing.city || '', stage: UI_STAGE[row.stage] || 'quote', serverStage: row.stage, version: row.version,
        buyerId: row.buyerId, sellerId: row.sellerId, created: Date.parse(row.createdAt), payments: [], terms: null, inspection: null, delivery: null,
        events: (row.events || []).map(e => ({ stage: e.stage, actorId: e.actorId, time: Date.parse(e.createdAt) })),
    };
}

const UI_VERIFICATION = { approved: 'approved', pending: 'pending', rejected: 'changes' };

/* ---------- Loading the server's data into the UI state ---------- */

function renderIfIdle() {
    const active = document.activeElement;
    if ((active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)) || document.getElementById('modal-root').innerHTML)
        return;
    render();
}

async function loadRemote() {
    const jobs = [api('GET', '/listings?limit=100', undefined, { auth: false }), api('GET', '/requests?limit=100', undefined, { auth: false })];
    if (remote.session)
        jobs.push(api('GET', '/listings/mine?limit=100'), api('GET', '/deals?limit=100'), api('GET', '/users/me'), api('GET','/saved'), api('GET','/conversations'));
    return Promise.all(jobs);
}

async function refreshRemote() {
    const version=++remote.syncVersion;
    let results;
    try {
        results = await loadRemote();
    }
    catch (e) {
        if (e.status !== 401)
            throw e;
        results = await loadRemote(); // The stored session was rejected and cleared; continue as a visitor.
    }
    if (version !== remote.syncVersion) return;
    const [publicListings, requests, mine, deals, me, saved, conversations] = results;
    const byId = new Map();
    for (const row of publicListings.items)
        byId.set(row.id, row);
    for (const row of (mine ? mine.items : []))
        byId.set(row.id, { ...row, seller: byId.get(row.id) && byId.get(row.id).seller });
    state.listings = [...byId.values()].map(uiListing).sort((a, b) => b.created - a.created);
    state.requests = requests.items.map(uiRequest);
    state.deals = deals ? deals.items.map(uiDeal) : [];
    state.saved = saved ? saved.items.map(row => row.listingId) : [];
    state.chats = conversations ? conversations.items.map(row => ({id:row.id,listingId:row.listingId,
        party:(row.buyerId===myId()?row.seller:row.buyer)?.displayName || 'Marketplace member',
        messages:row.messages.slice().reverse().map(message => ({id:message.id,mine:message.senderId===myId(),text:message.text,time:Date.parse(message.createdAt)}))})) : [];
    state.privateContacts = {};
    for (const p of state.listings.filter(p => p.own))
        state.privateContacts[p.id] = { phone: '', sharing: p.remote.allowCall || p.remote.allowWhatsapp, call: p.remote.allowCall, whatsapp: p.remote.allowWhatsapp, time: '9 am – 6 pm' };
    remote.me = me || null;
    if (me) {
        state.profile.phone = me.phone;
        state.profile.name = me.displayName || 'Marketplace member';
        state.profile.city = me.city || '';
        state.profile.accountId=me.id;
        state.profile.language = me.language;
        state.profile.business = me.business;
        state.profile.role = me.role;
        const v = me.verification;
        state.buyerVerification = v
            ? { status: UI_VERIFICATION[v.status] || 'unverified', phone: me.phone, name: me.displayName || '', business: v.business, city: me.city || '', purpose: v.purpose, reviewNote: v.reviewNote || '', demo: false, submittedAt: Date.parse(v.submittedAt) }
            : { status: 'unverified', phone: me.phone, demo: false };
    }
    else {
        state.profile.phone = '';
        state.buyerVerification = { status: 'unverified', demo: false };
    }
    remote.synced = true;
    remote.error = '';
    save();
}

/** Real listings have no computed distance; only the offline demo data carries one. */
function distanceText(p, long) {
    if (p.distance == null)
        return '';
    return `${p.distance} ${long ? L('km demo distance', 'కి.మీ నమూనా దూరం') : L('km demo', 'కి.మీ నమూనా')}`;
}
