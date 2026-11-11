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
