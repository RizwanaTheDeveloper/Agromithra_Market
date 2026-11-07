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
