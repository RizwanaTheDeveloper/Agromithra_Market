// APK frontend: base layer. Shared runtime bindings are composed by build-web.cjs.
function initialState() { return { version: 1, profile: { name: 'Demo Buyer', role: 'buyer', business: 'Individual', city: 'Guntur', language: 'en', onboarded: false }, listings: clone(MD.listings).map((p, i) => ({ ...p, status: 'active', created: Date.now() - i * 600000, expires: future(['produce', 'dairy', 'aqua'].includes(p.cat) ? 7 : 30), own: false, identity: 'sample' })), requests: clone(MD.requests).map(r => ({ ...r, expires: future(r.days), own: false, status: 'open' })), saved: [], deals: [{ id: 'D301', listingId: 'L101', title: 'Sona Masoori paddy', cat: 'crops', image: 'paddy', quantity: 10, unit: 'quintal', price: 2600, buyer: 'Demo Buyer', seller: 'Ravi Farmer Collective', location: 'Guntur', stage: 'quote', created: Date.now(), payments: [], terms: null, inspection: null, delivery: null }, { id: 'D302', listingId: 'L110', title: 'Jersey cross dairy cow', cat: 'cattle', image: 'cow', quantity: 1, unit: 'animal', price: 68000, buyer: 'Demo Buyer', seller: 'Sree Dairy Farm', location: 'Mangalagiri', stage: 'inspection', created: Date.now(), payments: [], terms: null, inspection: null, delivery: null }], chats: [{ id: 'C301', listingId: 'L109', party: 'Sree Dairy Farm', messages: [{ mine: false, text: 'Welcome! You can arrange a farm visit and observe milking before deciding.', demo: true, time: Date.now() }] }], notifications: [{ id: 'N1', title: 'Sample buyer requirements are ready', te: 'నమూనా కొనుగోలుదారుల అవసరాలు సిద్ధంగా ఉన్నాయి', route: 'requests', read: false }, { id: 'N2', title: 'Try the dairy inspection flow', te: 'పశువుల తనిఖీ ప్రక్రియను ప్రయత్నించండి', route: 'deal', params: { id: 'D302' }, read: false }, { id: 'N3', title: 'Your data stays on this device', te: 'మీ డేటా ఈ పరికరంలోనే ఉంటుంది', route: 'help', read: false }], tickets: [], ratings: [], subscription: null, promotions: [] }; }

function save() { try {
    localStorage.setItem(STORAGE, JSON.stringify(state));
}
catch (e) {
    toast(L('Storage is full. Changes are available until the app closes.', 'నిల్వ నిండింది. యాప్ మూసే వరకు మార్పులు ఉంటాయి.'));
} }

function go(route, params = {}, replace = false) { closeModal(); if (!replace && ui.route !== route)
    ui.stack.push({ route: ui.route, params: ui.params });
else if (!replace && ui.route === route && JSON.stringify(params) !== JSON.stringify(ui.params))
    ui.stack.push({ route: ui.route, params: ui.params }); ui.route = route; ui.params = params; render(); window.scrollTo(0, 0); }

function tab(route) { ui.stack = []; go(route, {}, true); }

function back() { closeModal(); if (ui.stack.length) {
    const x = ui.stack.pop();
    ui.route = x.route;
    ui.params = x.params;
    render();
    window.scrollTo(0, 0);
}
else
    tab('home'); }

function render() { document.documentElement.lang = state.profile.language; let html = (ROUTES[ui.route] || home)(); if (window.MARKET_ART) html = html.replace(/src="\/market\/art\/([^"]+)\.svg"/g, (_, name) => 'src="' + (window.MARKET_ART[name] || '') + '"'); document.getElementById('app').innerHTML = html; }

function handleAction(a, id = '', element = null) {
    const d = getDeal(id), p = getListing(id);
    switch (a) {
        case 'nav':
            if (id === 'sell') {
                ui.draft = newDraft();
                tab('sell');
                ui.params = { step: 1 };
                render();
            }
            else
                tab(id);
            break;
        case 'home':
            tab('home');
            break;
        case 'back':
            window.handleAndroidBack();
            break;
        case 'close-modal':
            closeModal();
            break;
        case 'browse':
            go('browse');
            break;
        case 'category':
            ui.filters = { ...ui.filters, cat: id, query: '' };
            go('browse');
            break;
        case 'browse-cat':
            ui.filters.cat = id;
            render();
            break;
        case 'filters':
            filterModal();
            break;
        case 'clear-filters':
            ui.filters = { cat: 'all', query: '', distance: 0, price: 0, quantity: 0, unit: 'all', quality: 'all', sort: 'recent', location: 'All' };
            render();
            break;
        case 'detail':
            go('detail', { id });
            break;
        case 'save-listing':
            state.saved = state.saved.includes(id) ? state.saved.filter(x => x !== id) : [...state.saved, id];
            save();
            render();
            toast(state.saved.includes(id) ? L('Listing saved', 'లిస్టింగ్ సేవ్ అయింది') : L('Removed from saved', 'సేవ్ జాబితా నుంచి తొలగించబడింది'));
            break;
        case 'language':
            state.profile.language = id;
            save();
            render();
            break;
        case 'onboard':
            go('onboard');
            break;
        case 'switch-role':
            state.profile.role = state.profile.role === 'buyer' ? 'seller' : 'buyer';
            save();
            render();
            toast(state.profile.role === 'seller' ? L('Selling mode enabled', 'అమ్మకం మోడ్ ప్రారంభమైంది') : L('Buying mode enabled', 'కొనుగోలు మోడ్ ప్రారంభమైంది'));
            break;
        case 'location':
            modal(L('Choose demo area', 'నమూనా ప్రాంతం ఎంచుకోండి'), `<form data-form="location">${select(L('Location', 'ప్రాంతం'), 'city', ['Guntur', 'Mangalagiri', 'Vijayawada', 'Tenali', 'Ongole', 'Nellore', 'Nuzvid', 'Bhimavaram', 'Khammam'], state.profile.city)}${note('Distances and nearby listings in this prototype are fictional.', 'ఈ నమూనాలో దూరాలు మరియు దగ్గర లిస్టింగ్‌లు కల్పితమైనవి.')}${submit(L('Set location', 'ప్రాంతం ఎంచుకోండి'))}</form>`);
            break;
        case 'requests':
            go('requests');
            break;
        case 'my-requests':
            ui.requestTab = 'mine';
            go('requests');
            break;
        case 'request-cat':
            ui.requestCat = id;
            render();
            break;
        case 'request-tab':
            ui.requestTab = id;
            render();
            break;
        case 'request-detail':
            go('request-detail', { id });
            break;
        case 'new-request':
            ui.requestDraft = null;
            go('request-form');
            break;
        case 'fill-request': {
            const r = clone(MD.requests[0]);
            ui.requestDraft = { ...r, expires: future(7), location: state.profile.city };
            render();
            break;
        }
        case 'close-request': {
            const r = getRequest(id);
            r.status = 'closed';
            save();
            toast(L('Requirement closed', 'అవసరం మూసివేయబడింది'));
            go('requests', {}, true);
            break;
        }
        case 'rfq-quote':
            go('offer', { requestId: id });
            break;
        case 'sample-rfq-quote': {
            const r = getRequest(id), l = state.listings.find(l => l.cat === r.cat && l.unit === r.unit && available(l)), qty = Math.min(r.quantity, l?.quantity || r.quantity);
            const q = makeDeal(l || { title: r.title, cat: r.cat, image: cat(r.cat).image, unit: r.unit, price: r.budget, location: r.location, seller: 'S1' }, qty, Math.min(l?.price || r.budget, r.budget), r.location);
            q.requestId = r.id;
            q.buyer = state.profile.name;
            state.deals.unshift(q);
            save();
            go('deal', { id: q.id });
            break;
        }
        case 'offer':
            if (p && !available(p)) {
                toast(L('This listing is not currently available.', 'ఈ లిస్టింగ్ ప్రస్తుతం లభ్యం కాదు.'));
                break;
            }
            go('offer', { id });
            break;
        case 'start-sell':
            ui.draft = newDraft();
            state.profile.role = 'seller';
            save();
            go('sell', { step: 1 });
            break;
        case 'sell-category':
            ui.draft = newDraft(id);
            go('sell', { step: 2 }, true);
            break;
        case 'sell-step':
            captureDraft();
            go('sell', { step: Number(id) }, true);
            break;
        case 'fill-sell': {
            const s = clone(MD.listings.find(p => p.cat === ui.draft.cat));
            Object.assign(ui.draft, { title: s.title, price: s.price, quantity: s.quantity, min: s.min, unit: s.unit, image: s.image, location: s.location, state: s.state, description: s.description, specValues: s.specs.map(v => v[1]), expires: future(14) });
            render();
            break;
        }
        case 'photos':
            captureDraft();
            photoModal();
            break;
        case 'photo-select':
            ui.draft.image = id;
            closeModal();
            render();
            break;
        case 'voice-listing':
            voiceModal();
            break;
        case 'manage-listings':
            go('manage-listings');
            break;
        case 'edit-listing':
            ui.draft = { ...clone(p), specValues: p.specs.map(v => v[1]), editId: p.id };
            go('sell', { step: 2 });
            break;
        case 'toggle-listing':
            p.status = p.status === 'active' ? 'paused' : 'active';
            save();
            render();
            toast(L('Listing visibility updated', 'లిస్టింగ్ లభ్యత మార్చబడింది'));
            break;
        case 'sold-listing':
            p.status = 'sold';
            save();
            render();
            toast(L('Marked sold and removed from active marketplace', 'అమ్మినట్లు గుర్తించి మార్కెట్ నుంచి తొలగించబడింది'));
            break;
        case 'renew-listing':
            p.expires = future(14);
            p.status = 'active';
            save();
            render();
            toast(L('Listing renewed for 14 days', 'లిస్టింగ్ 14 రోజులు పొడిగించబడింది'));
            break;
        case 'expire-listing':
            p.expires = future(-1);
            save();
            render();
            break;
        case 'sample-verify':
            p.identity = p.identity === 'sample' ? 'none' : 'sample';
            save();
            render();
            toast(L('Sample identity badge changed', 'నమూనా గుర్తింపు బ్యాడ్జ్ మార్చబడింది'));
            break;
        case 'deals':
            go('deals');
            break;
        case 'deal-tab':
            ui.dealTab = id;
            render();
            break;
        case 'deal':
            go('deal', { id });
            break;
        case 'accept-quote':
            if (d.stage !== 'quote')
                break;
            d.stage = 'inspection';
            notify('Demo offer accepted', 'నమూనా ప్రతిపాదన అంగీకరించబడింది', 'deal', { id });
            save();
            render();
            toast(L('Sample acceptance recorded', 'నమూనా అంగీకారం నమోదైంది'));
            break;
        case 'counteroffer':
            modal(L('Sample counteroffer', 'నమూనా మారుప్రతిపాదన'), `<form data-form="counteroffer" data-id="${id}">${field(L('Counter price per unit (₹)', 'మారుప్రతిపాదన యూనిట్ ధర (₹)'), 'price', Math.round(d.price * 1.04 * 100) / 100, 'number', 'required min="0.01" step="0.01"')}${note('This demonstrates a seller response without contacting a real seller.', 'ఇది నిజమైన విక్రేతను సంప్రదించకుండా విక్రేత స్పందన చూపిస్తుంది.')}${errorBox()}${submit(L('Record demo counteroffer', 'నమూనా మారుప్రతిపాదన నమోదు'))}</form>`);
            break;
        case 'book-inspection':
            go('inspection', { id });
            break;
        case 'inspection-results':
            go('inspection-results', { id });
            break;
        case 'skip-inspection':
            d.inspectionSkipped = true;
            d.stage = 'agreement';
            save();
            render();
            break;
        case 'agreement':
            go('agreement', { id });
            break;
        case 'payment':
            go('payment', { id });
            break;
        case 'pickup-payment':
            d.paymentTerms = 'Payment on pickup';
            d.stage = 'transport';
            save();
            render();
            toast(L('Payment on pickup recorded in demo', 'పికప్ చెల్లింపు నమూనా నమోదైంది'));
            break;
        case 'transport':
            go('transport', { id });
            break;
        case 'pickup':
            if (d.disputed) {
                toast(L('Resolve the open dispute first.', 'ముందు వివాదం పరిష్కరించండి.'));
                break;
            }
            d.delivery.phase = 'In transit';
            d.delivery.pickedAt = Date.now();
            save();
            render();
            toast(L('Demo pickup recorded', 'నమూనా పికప్ నమోదైంది'));
            break;
        case 'receipt':
            if (d.disputed) {
                toast(L('Resolve the dispute in Support before completing.', 'పూర్తి చేసే ముందు సపోర్ట్‌లో వివాదం పరిష్కరించండి.'));
                break;
            }
            go('receipt', { id });
            break;
        case 'rating':
            modal(L('Rate the demo trade', 'నమూనా వ్యాపారానికి రేటింగ్'), `<form data-form="rating" data-id="${id}"><div class="rating-stars">${[1, 2, 3, 4, 5].map(n => `<button type="button" class="on" data-action="rating-star" data-id="${n}" aria-label="${n} stars">★</button>`).join('')}</div><input type="hidden" name="rating" id="rating-input" value="5">${textarea(L('Your sample review', 'మీ నమూనా సమీక్ష'), 'review', '', 'required maxlength="600"')}${errorBox()}${submit(L('Save demo review', 'నమూనా సమీక్ష సేవ్ చేయండి'))}</form>`);
            break;
        case 'rating-star':
            document.getElementById('rating-input').value = id;
            document.querySelectorAll('[data-action="rating-star"]').forEach(el => el.classList.toggle('on', Number(el.dataset.id) <= Number(id)));
            break;
        case 'chat-listing':
            openChat(id, seller(p.seller).name);
            break;
        case 'chat-deal':
            openChat(d.listingId || 'RFQ-' + d.requestId, state.profile.name === d.seller ? d.buyer : d.seller);
            break;
        case 'inbox':
            go('inbox');
            break;
        case 'open-chat':
            go('chat', { id });
            break;
        case 'quick-chat': {
            const c = state.chats.find(c => c.id === ui.params.id);
            sendMessage(c, id);
            break;
        }
        case 'call-demo':
            modal(L('Call preview', 'కాల్ నమూనా'), `<div class="success"><div class="seal">${icon('user')}</div><h2>${esc(seller(p.seller).name)}</h2><p>${L('Demo seller contact preview. No phone call is placed. A production app can use consent-based contact sharing or masked calling.', 'నమూనా విక్రేత సంప్రదింపు ప్రివ్యూ. నిజమైన ఫోన్ కాల్ జరగదు.')}</p>${btn(L('Continue in demo chat', 'నమూనా చాట్‌లో కొనసాగండి'), 'chat-listing', id)}</div>`);
            break;
        case 'share-listing': {
            const text = `Agromitra Market — DEMO listing\n${p.title}\n${money(p.price)} / ${p.unit}\nAvailable: ${p.quantity} ${p.unit}\nLocation: ${p.location}\nThis is an offline prototype. No public listing URL exists.`;
            modal(L('Share listing preview', 'లిస్టింగ్ షేర్ నమూనా'), `<p>${L('Copy the listing summary. Public listing links require a live marketplace.', 'లిస్టింగ్ సారాంశం కాపీ చేయండి. పబ్లిక్ లింకులకు లైవ్ మార్కెట్ అవసరం.')}</p><textarea id="share-text" style="width:100%;height:190px;padding:13px;border:1px solid var(--line);border-radius:13px;margin:15px 0" readonly>${esc(text)}</textarea>${btn(L('Copy listing summary', 'లిస్టింగ్ సారాంశం కాపీ'), 'copy-summary')}`);
            break;
        }
        case 'copy-summary': {
            const el = document.getElementById('share-text');
            el.select();
            const ok = document.execCommand && document.execCommand('copy');
            toast(ok ? L('Summary copied', 'సారాంశం కాపీ అయింది') : L('Select the summary text and copy it.', 'సారాంశం ఎంపిక చేసి కాపీ చేయండి.'));
            break;
        }
        case 'listing-report':
            go('document', { id, kind: 'listing' });
            break;
        case 'deal-document':
            go('document', { id, kind: 'deal' });
            break;
        case 'inspection-document':
            go('document', { id, kind: 'inspection' });
            break;
        case 'print-document':
            if (window.ExportBridge && typeof window.ExportBridge.printPdf === 'function')
                window.ExportBridge.printPdf('Agromitra_Market_SAMPLE_' + ui.params.id);
            else if (typeof window.print === 'function')
                window.print();
            break;
        case 'report-listing':
            go('ticket', { listingId: id });
            break;
        case 'dispute':
            go('ticket', { dealId: id });
            break;
        case 'new-ticket':
            go('ticket');
            break;
        case 'resolve-ticket': {
            const t = state.tickets.find(t => t.id === id);
            modal(L('Resolve demo ticket', 'నమూనా టికెట్ పరిష్కారం'), `<form data-form="resolution" data-id="${id}">${select(L('Sample resolution', 'నమూనా పరిష్కారం'), 'resolution', t.dealId ? ['Resume trade', 'Refund demo payments and cancel trade'] : ['Review completed in demo'], t.dealId ? 'Resume trade' : 'Review completed in demo')}${textarea(L('Resolution notes', 'పరిష్కారం వివరాలు'), 'notes', 'Resolved for prototype demonstration.', 'required maxlength="600"')}${errorBox()}${submit(L('Record resolution', 'పరిష్కారం నమోదు'))}</form>`);
            break;
        }
        case 'support':
        case 'help':
        case 'services':
        case 'plans':
        case 'payments':
        case 'admin':
        case 'moderation':
        case 'account':
        case 'profile':
        case 'saved':
        case 'notifications':
            go(a);
            break;
        case 'open-notification': {
            const n = state.notifications.find(n => n.id === id);
            n.read = true;
            save();
            go(n.route, n.params || {});
            break;
        }
        case 'read-all':
            state.notifications.forEach(n => n.read = true);
            save();
            render();
            break;
        case 'activate-plan':
            modal(L('Sample plan activation', 'నమూనా ప్లాన్ ప్రారంభం'), `${note('₹499/month is an illustrative price. No payment or automatic renewal occurs.', '₹499/నెల నమూనా ధర. చెల్లింపు లేదా ఆటో రెన్యూవల్ జరగదు.', true)}${btn(L('Activate demo Buyer Pro', 'నమూనా బయ్యర్ ప్రో ప్రారంభం'), 'confirm-plan')}`);
            break;
        case 'confirm-plan':
            state.subscription = { name: 'Buyer Pro demo', date: today(), price: 499 };
            save();
            closeModal();
            render();
            toast(L('Demo plan activated', 'నమూనా ప్లాన్ ప్రారంభమైంది'));
            break;
        case 'reset-confirm':
            modal(L('Reset demo data?', 'నమూనా డేటా రీసెట్?'), `<p>${L('This removes your locally created demo listings, chats, deals and settings, then restores the sample data.', 'మీ స్థానిక నమూనా లిస్టింగ్‌లు, చాట్‌లు, ఒప్పందాలు మరియు సెట్టింగ్‌లు తొలగించి తొలి డేటా ఇస్తుంది.')}</p><div class="btn-row">${btn(L('Keep my data', 'నా డేటా ఉంచండి'), 'close-modal', '', 'secondary')}${btn(L('Reset demo', 'నమూనా రీసెట్'), 'confirm-reset', '', 'danger')}</div>`);
            break;
        case 'confirm-reset':
            state = initialState();
            save();
            ui.stack = [];
            ui.draft = null;
            ui.filters = { cat: 'all', query: '', distance: 0, price: 0, quality: 'all', sort: 'recent', location: 'All' };
            go('welcome', {}, true);
            break;
        default: toast(L('This action is unavailable.', 'ఈ చర్య లభ్యం లేదు.'));
    }
}

function validNumber(n) { return Number.isFinite(Number(n)) && Number(n) > 0; }

function discreteQuantity(q, u) { return !['animal', 'bird', 'egg', 'fish'].includes(u) || Number.isInteger(Number(q)); }

function handleForm(type, o, meta = {}) {
    let d = getDeal(meta.id), p = getListing(meta.id);
    switch (type) {
        case 'onboard':
            if (!o.name?.trim() || !o.agree)
                return error(L('Enter a name and confirm the prototype notice.', 'పేరు నమోదు చేసి నమూనా నోటీసు అంగీకరించండి.'));
            Object.assign(state.profile, { name: o.name.trim(), role: o.role, business: o.business, city: o.city, onboarded: true });
            save();
            ui.stack = [];
            go('home', {}, true);
            break;
        case 'profile':
            if (!o.name?.trim())
                return error('Enter your name.');
            Object.assign(state.profile, { name: o.name.trim(), business: o.business, city: o.city, language: o.language });
            save();
            go('account', {}, true);
            toast(L('Profile saved', 'ప్రొఫైల్ సేవ్ అయింది'));
            break;
        case 'location':
            state.profile.city = o.city;
            save();
            closeModal();
            render();
            break;
        case 'search':
            ui.filters.query = o.query?.trim() || '';
            ui.filters.cat = 'all';
            go('browse');
            break;
        case 'filters':
            ui.filters = { ...ui.filters, location: o.location, distance: Number(o.distance) || 0, price: Number(o.price) || 0, quantity: Number(o.quantity) || 0, unit: o.unit, quality: o.quality, sort: o.sort };
            closeModal();
            render();
            break;
        case 'sell-basic':
            if (!o.title?.trim() || o.title.trim().length < 3 || !validNumber(o.price) || !validNumber(o.quantity) || !validNumber(o.min))
                return error(L('Enter a title, positive price, quantity and minimum order.', 'పేరు, సరైన ధర, పరిమాణం మరియు కనీస ఆర్డర్ నమోదు చేయండి.'));
            if (Number(o.min) > Number(o.quantity))
                return error(L('Minimum order cannot exceed available quantity.', 'కనీస ఆర్డర్ లభ్య పరిమాణం కంటే ఎక్కువ ఉండకూడదు.'));
            if (!discreteQuantity(o.quantity, o.unit) || !discreteQuantity(o.min, o.unit))
                return error(L('Animals, birds, eggs and fish seed use whole-number quantities.', 'జంతువులు, కోళ్లు, గుడ్లు మరియు చేప పిల్లలకు పూర్ణ సంఖ్య నమోదు చేయండి.'));
            if (!o.location?.trim() || o.expires < today())
                return error(L('Enter a location and a current or future expiry date.', 'ప్రాంతం మరియు సరైన గడువు నమోదు చేయండి.'));
            Object.assign(ui.draft, { title: o.title.trim(), quantity: Number(o.quantity), price: Number(o.price), min: Number(o.min), unit: o.unit, location: o.location.trim(), state: o.state, expires: o.expires });
            go('sell', { step: 3 }, true);
            break;
        case 'sell-details':
            if ([0, 1, 2, 3].some(i => !o['spec' + i]?.trim()) || !o.description?.trim() || o.description.trim().length < 10)
                return error(L('Complete the four details and a clear description.', 'నాలుగు వివరాలు మరియు స్పష్టమైన వివరణ నమోదు చేయండి.'));
            ui.draft.specValues = [0, 1, 2, 3].map(i => o['spec' + i].trim());
            ui.draft.description = o.description.trim();
            go('sell', { step: 4 }, true);
            break;
        case 'sell-publish': {
            if (!o.confirmed)
                return error(L('Confirm the listing details first.', 'ముందు లిస్టింగ్ వివరాలు నిర్ధారించండి.'));
            const dr = ui.draft, id = dr.editId || uid('L'), old = dr.editId ? getListing(id) : null;
            const item = { ...(old || {}), id, cat: dr.cat, title: dr.title, te: '', price: Number(dr.price), quantity: Number(dr.quantity), min: Number(dr.min), unit: dr.unit, image: dr.image, seller: 'ME', location: dr.location, state: dr.state, distance: 12, sub: cat(dr.cat).name, specs: DETAIL_FIELDS[dr.cat].map((k, i) => [k[0], dr.specValues[i]]), description: dr.description, quality: 'declared', identity: old?.identity || 'none', status: 'active', created: old?.created || Date.now(), expires: dr.expires, own: true };
            if (old)
                state.listings[state.listings.indexOf(old)] = item;
            else
                state.listings.unshift(item);
            notify('Your demo listing is available', 'మీ నమూనా లిస్టింగ్ లభిస్తుంది', 'detail', { id });
            save();
            ui.draft = null;
            ui.stack = [];
            go('success', { listingId: id, title: L('Your listing is ready.', 'మీ లిస్టింగ్ సిద్ధంగా ఉంది.') }, true);
            break;
        }
        case 'voice': {
            const p = MD.listings.find(p => p.cat === o.category), numbers = (o.transcript || '').replace(/,/g, '').match(/\d+(?:\.\d+)?/g) || [];
            if (numbers.length < 2)
                return error(L('Use a quantity and price in the sample transcript.', 'నమూనా వాక్యంలో పరిమాణం మరియు ధర నమోదు చేయండి.'));
            ui.draft = newDraft(o.category);
            Object.assign(ui.draft, { title: p.title, quantity: Number(numbers[0]), price: Number(((o.transcript || '').match(/₹\s*([\d,]+(?:\.\d+)?)/) || [])[1]?.replace(/,/g, '') || numbers[1]), min: Math.min(p.min, Number(numbers[0])), unit: p.unit, image: p.image, location: p.location, state: p.state, specValues: p.specs.map(v => v[1]), description: 'Sample voice transcript: ' + o.transcript });
            closeModal();
            go('sell', { step: 2 }, true);
            toast(L('Sample fields prepared. Review and edit before publishing.', 'నమూనా వివరాలు సిద్ధం. ప్రచురించే ముందు మార్చండి.'));
            break;
        }
        case 'request':
            if (!o.title?.trim() || !validNumber(o.quantity) || !validNumber(o.budget) || !o.location?.trim() || !o.note?.trim() || o.expires < today())
                return error(L('Enter all required details and positive quantity / budget.', 'అవసరమైన వివరాలు, సరైన పరిమాణం మరియు బడ్జెట్ నమోదు చేయండి.'));
            if (!discreteQuantity(o.quantity, o.unit))
                return error(L('Use a whole-number quantity for this unit.', 'ఈ యూనిట్‌కు పూర్ణ సంఖ్య నమోదు చేయండి.'));
            {
                const r = { id: uid('R'), cat: o.cat, title: o.title.trim(), te: '', quantity: Number(o.quantity), unit: o.unit, budget: Number(o.budget), location: o.location.trim(), buyer: state.profile.name, purpose: o.purpose, note: o.note.trim(), expires: o.expires, own: true, status: 'open' };
                state.requests.unshift(r);
                save();
                ui.requestDraft = null;
                ui.stack = [];
                go('request-detail', { id: r.id }, true);
            }
            break;
        case 'offer': {
            const r = getRequest(meta.requestId), q = Number(o.quantity), pr = Number(o.price);
            if (!validNumber(q) || !validNumber(pr) || !o.location?.trim() || o.date < today())
                return error(L('Enter a valid quantity, price, location and date.', 'సరైన పరిమాణం, ధర, ప్రాంతం మరియు తేదీ నమోదు చేయండి.'));
            if (p && (!available(p) || q < p.min || q > p.quantity))
                return error(L('Offer quantity must be within the available lot and minimum order.', 'ప్రతిపాదన పరిమాణం కనీస ఆర్డర్ మరియు లభ్య పరిమాణం మధ్య ఉండాలి.'));
            const item = p || { title: r.title, cat: r.cat, image: cat(r.cat).image, unit: r.unit, price: r.budget, location: r.location, seller: 'ME' };
            if (!discreteQuantity(q, item.unit))
                return error(L('Use a whole-number quantity for this unit.', 'ఈ యూనిట్‌కు పూర్ణ సంఖ్య నమోదు చేయండి.'));
            const dd = makeDeal(item, q, pr, o.location.trim());
            dd.preferredDate = o.date;
            dd.message = o.message;
            if (r) {
                dd.requestId = r.id;
                dd.buyer = r.buyer;
                dd.seller = state.profile.name;
            }
            state.deals.unshift(dd);
            notify('New local demo quote created', 'కొత్త స్థానిక నమూనా ప్రతిపాదన', 'deal', { id: dd.id });
            save();
            go('deal', { id: dd.id }, true);
            break;
        }
        case 'counteroffer':
            if (d.stage !== 'quote' || !validNumber(o.price))
                return error('Enter a valid counter price.');
            d.price = Number(o.price);
            d.counteroffer = true;
            save();
            closeModal();
            render();
            toast(L('Sample counteroffer recorded. Accept to continue.', 'నమూనా మారుప్రతిపాదన నమోదైంది. కొనసాగడానికి అంగీకరించండి.'));
            break;
        case 'inspection':
            if (d.stage !== 'inspection')
                return error('This deal is not at the inspection step.');
            if (!o.address?.trim() || o.date < today())
                return error('Enter the address and future date.');
            d.inspection = { type: o.type, provider: o.provider, date: o.date, slot: o.slot, address: o.address, notes: o.notes, status: 'Scheduled', fee: ['cattle', 'smallstock', 'poultry'].includes(d.cat) ? 499 : 299 };
            notify('Sample inspection booked', 'నమూనా తనిఖీ బుక్ అయింది', 'deal', { id: d.id });
            save();
            go('deal', { id: d.id }, true);
            break;
        case 'inspection-results':
            if (!o.ack || !o.findings?.trim())
                return error('Enter findings and acknowledge the sample notice.');
            d.inspection.status = 'Completed';
            d.inspection.outcome = o.outcome;
            d.inspection.findings = o.findings;
            d.inspection.completedAt = Date.now();
            if (o.outcome === 'Acceptable in sample')
                d.stage = 'agreement';
            else
                d.inspection.status = 'Further checks needed';
            save();
            go('deal', { id: d.id }, true);
            toast(o.outcome === 'Acceptable in sample' ? L('Sample report saved', 'నమూనా రిపోర్ట్ సేవ్ అయింది') : L('Further assessment needed; arrange another sample visit.', 'మరింత తనిఖీ అవసరం. మరో నమూనా సందర్శన ఏర్పాటు చేయండి.'));
            break;
        case 'agreement':
            if (d.stage !== 'agreement' || !o.buyerAgree || !o.sellerAgree || !o.quality?.trim() || !o.cancellation?.trim())
                return error('Confirm both sample acceptances and the conditions.');
            d.terms = { transport: o.transport, weighment: o.weighment, quality: o.quality, cancellation: o.cancellation, agreedAt: Date.now() };
            d.stage = 'payment';
            save();
            go('deal', { id: d.id }, true);
            break;
        case 'payment':
            if (d.stage !== 'payment' || !o.ack)
                return error('Confirm the sample payment notice.');
            d.payments.push({ id: uid('PAY'), amount: Math.round(dealTotal(d) * .1 * 100) / 100, method: o.method, kind: 'Demo advance', date: today() });
            d.paymentTerms = '10% demo advance; balance on receipt';
            d.stage = 'transport';
            save();
            go('deal', { id: d.id }, true);
            toast(L('Fictional advance recorded. No money was charged.', 'కల్పిత అడ్వాన్స్ నమోదైంది. డబ్బు వసూలు చేయలేదు.'));
            break;
        case 'transport':
            if (d.stage !== 'transport' || !o.check0 || !o.check1 || !o.check2 || !o.pickup?.trim() || !o.drop?.trim() || o.date < today())
                return error(L('Complete pickup details and all readiness checks.', 'పికప్ వివరాలు మరియు తనిఖీలు పూర్తి చేయండి.'));
            d.delivery = { partner: o.partner, pickup: o.pickup, drop: o.drop, date: o.date, slot: o.slot, phase: 'Booked', fee: ['cattle', 'smallstock', 'poultry'].includes(d.cat) ? 2500 : ['aqua', 'dairy', 'produce'].includes(d.cat) ? 1900 : 1500 };
            d.stage = 'delivery';
            save();
            go('deal', { id: d.id }, true);
            break;
        case 'receipt': {
            if (d.stage !== 'delivery' || d.delivery?.phase !== 'In transit' || d.disputed)
                return error(L('Receipt requires pickup and no open dispute.', 'స్వీకరణకు పికప్ మరియు వివాదం లేకపోవాలి.'));
            if (!o.accepted || !o.settled || !validNumber(o.quantity) || !discreteQuantity(o.quantity, d.unit))
                return error('Confirm acceptance, settlement and a valid quantity.');
            if (Number(o.quantity) !== d.quantity)
                return error(L('Quantity differs from the agreement. Raise a dispute or amend the trade before completing.', 'పరిమాణం ఒప్పందంతో వేరుగా ఉంది. పూర్తి చేసే ముందు వివాదం నమోదు చేయండి.'));
            const balance = remaining(d);
            if (balance > 0)
                d.payments.push({ id: uid('PAY'), amount: balance, method: 'Fictional receipt settlement', kind: 'Demo balance', date: today() });
            d.receipt = { quantity: Number(o.quantity), notes: o.notes, date: today() };
            d.inventoryCommitted = true;
            d.delivery.phase = 'Delivered';
            d.stage = 'complete';
            const li = getListing(d.listingId);
            if (li && available(li)) {
                li.quantity = Math.max(0, li.quantity - d.quantity);
                if (li.quantity === 0)
                    li.status = 'sold';
                else
                    li.min = Math.min(li.min, li.quantity);
            }
            notify('Demo trade completed', 'నమూనా వ్యాపారం పూర్తయింది', 'deal', { id: d.id });
            save();
            go('deal', { id: d.id }, true);
            break;
        }
        case 'rating':
            if (!o.review?.trim())
                return error('Enter a review.');
            state.ratings = state.ratings.filter(r => r.dealId !== d.id);
            state.ratings.push({ dealId: d.id, stars: Number(o.rating), review: o.review, date: today() });
            save();
            closeModal();
            toast(L('Sample review saved', 'నమూనా సమీక్ష సేవ్ అయింది'));
            break;
        case 'chat': {
            const c = state.chats.find(c => c.id === meta.id);
            sendMessage(c, o.message || '');
            break;
        }
        case 'ticket':
            if (!o.subject?.trim() || !o.description?.trim() || o.description.trim().length < 10)
                return error(L('Enter a subject and at least 10 characters describing the issue.', 'విషయం మరియు కనీసం 10 అక్షరాల వివరాలు నమోదు చేయండి.'));
            {
                const t = { id: uid('T'), subject: o.subject.trim(), reason: o.reason, description: o.description.trim(), dealId: meta.dealId || null, listingId: meta.listingId || null, status: 'Open', date: today() };
                state.tickets.unshift(t);
                if (t.dealId)
                    getDeal(t.dealId).disputed = true;
                save();
                go('support', {}, true);
            }
            break;
        case 'resolution': {
            const t = state.tickets.find(t => t.id === meta.id);
            if (!o.notes?.trim())
                return error('Enter resolution notes.');
            t.status = 'Resolved';
            t.resolution = o.resolution + ': ' + o.notes;
            if (t.dealId) {
                const dd = getDeal(t.dealId);
                dd.disputed = state.tickets.some(x => x.dealId === dd.id && x.status === 'Open');
                if (o.resolution === 'Refund demo payments and cancel trade') {
                    const amount = paid(dd);
                    if (amount > 0)
                        dd.payments.push({ id: uid('REF'), amount: -amount, method: 'Fictional refund', kind: 'Demo refund', date: today() });
                    if (dd.inventoryCommitted) {
                        const stock = getListing(dd.listingId);
                        if (stock) {
                            stock.quantity += dd.quantity;
                            if (stock.status === 'sold')
                                stock.status = 'active';
                        }
                        dd.inventoryCommitted = false;
                    }
                    dd.stage = 'cancelled';
                    dd.cancelledAt = Date.now();
                    if (dd.delivery)
                        dd.delivery.phase = 'Cancelled';
                }
            }
            save();
            closeModal();
            render();
            break;
        }
        case 'promotion': {
            const li = getListing(o.listingId);
            if (!li || !li.own || !available(li))
                return error('Choose your active listing.');
            li.promoted = true;
            state.promotions.push({ listingId: li.id, price: 149, until: future(7), demo: true });
            save();
            toast(L('Sample promotion recorded', 'నమూనా ప్రచారం నమోదైంది'));
            break;
        }
        default: return error('Unknown form.');
    }
    return true;
}
