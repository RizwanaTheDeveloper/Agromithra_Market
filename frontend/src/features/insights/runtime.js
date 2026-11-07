'use strict';

const SD = window.SMART_DATA, SE = window.SmartEngine;

const prevSmartAction = handleAction, prevSmartForm = handleForm, prevSmartNewDraft = newDraft, prevSmartDetail = detail, prevSmartSell = sellPage, prevSmartHome = home, prevSmartAccount = accountPage, prevSmartCard = card;

const smart = { busy: false, progress: '', importPreview: null, importError: '', profiles: {}, reportTab: 'price', selected: 'DRAFT' };

const prevSmartGuide = flowGuide;

migrateSmart();

newDraft = function (category = 'crops') { for (const key of Object.keys(state.smartCosts || {}))
    if (key.startsWith('DRAFT|'))
        delete state.smartCosts[key]; return { ...prevSmartNewDraft(category), analysisProfile: { productId: '', variety: '', grade: '', allowFallback: false, qualityFacts: {}, reportReference: '' }, mediaReport: null }; };

home = function () { return prevSmartHome().replace('</main>', smartEntry() + '</main>'); };

accountPage = function () { return prevSmartAccount().replace('</main>', smartEntry() + '</main>').replace('Offline prototype v1.1.', 'Offline prototype v1.2.'); };

card = function (p) { return prevSmartCard(p).replace('</article>', `<button class="card-report-link" data-action="smart-report" data-id="${esc(p.id)}">${icon('chart')}${L('Price & quality', 'ధర & నాణ్యత')} →</button></article>`); };

detail = function () { const p = getListing(ui.params.id); return p ? prevSmartDetail().replace('<div class="contact-card spaced">', smartMini(p) + '<div class="contact-card spaced">') : prevSmartDetail(); };

sellPage = function () { const html = prevSmartSell(), d = ui.draft; if (!d || Number(ui.params.step || 1) === 1)
    return html; const block = `<div class="smart-listing-help"><div class="row">${icon('shield')}<strong>${L('Get a price & media check', 'ధర & మీడియా అంచనా పొందండి')}</strong></div><p>${L('Compare matching area rates before setting your asking price.', 'మీ ధర పెట్టే ముందు ప్రాంతీయ ధరలతో పోల్చండి.')}</p>${btn(L('Check photos, video & price', 'ఫోటోలు, వీడియో & ధర తనిఖీ'), 'smart-analysis', 'DRAFT', 'secondary spaced')}</div>`; return Number(ui.params.step || 1) === 2 ? html.replace('<form data-form="easy-listing">', block + '<form data-form="easy-listing">') : html.replace('<form data-form="sell-publish">', smartMini(d) + '<form data-form="sell-publish">'); };

flowGuide = function () { const steps = journeySteps([[L('Seller: upload and check', 'విక్రేత: మీడియా తనిఖీ'), L('Add real media. Check capture clarity, then record measured or declared evidence. AI examples are simulated.', 'నిజమైన మీడియా జోడించి కాంతి తనిఖీ చేయండి. కొలిచిన వివరాలు నమోదు చేయండి. AI నమూనా మాత్రమే.')], [L('Seller: compare and set a price', 'విక్రేత: ధరలు పోల్చండి'), L('Match product, variety, grade and unit. Compare dated area references and enter lot transport costs. Choose your own asking price, then preview and post.', 'సరుకు, రకం, గ్రేడ్ మరియు యూనిట్ పోల్చండి. ప్రాంతీయ ధరలు, రవాణా ఖర్చులు చూసి మీ ధర పెట్టి పోస్ట్ చేయండి.')], [L('Buyer: review the report', 'కొనుగోలుదారు: రిపోర్ట్ చూడండి'), L('Read price source/date, media warnings and seller evidence. Arrange independent crop testing or veterinary inspection where needed.', 'ధర మూలం, తేదీ, మీడియా మరియు విక్రేత వివరాలు చూడండి. అవసరమైన పరీక్ష లేదా పశువైద్య తనిఖీ ఏర్పాటు చేయండి.')], [L('Buyer: verify and contact', 'కొనుగోలుదారు: ధృవీకరణ మరియు సంప్రదింపు'), L('Complete buyer approval to unlock permitted WhatsApp or call details. Agree the final price and pickup directly.', 'అంగీకారం తరువాత వాట్సాప్ లేదా కాల్ ద్వారా చివరి ధర మరియు పికప్ మాట్లాడండి.')]]); return prevSmartGuide().replace('</main>', `<div class="card spaced"><h2>${L('Price and quality flow', 'ధర మరియు నాణ్యత ప్రక్రియ')}</h2>${steps}${btn(L('Open insights', 'ధర వివరాలు చూడండి'), 'smart-center', '', 'secondary spaced')}</div></main>`); };

handleAction = function (a, id) {
    const p = smartItem();
    switch (a) {
        case 'smart-center':
        case 'smart-data':
            go(a);
            break;
        case 'smart-market':
            go('smart-market', { productId: id || SD.products[0].id });
            break;
        case 'smart-analysis':
            if (ui.route === 'sell')
                captureDraft();
            smart.selected = id || 'DRAFT';
            go('smart-analysis', { id: smart.selected });
            break;
        case 'smart-report':
            smart.selected = id || 'DRAFT';
            smart.reportTab = 'price';
            go('smart-report', { id: smart.selected });
            break;
        case 'smart-document':
            go('smart-document', { id });
            break;
        case 'smart-tab':
            smart.reportTab = id;
            render();
            break;
        case 'smart-scan':
            runMediaChecks(id);
            break;
        case 'smart-ai-demo': {
            const item = smartItem(id);
            if (item)
                demoAI(item);
            break;
        }
        case 'smart-return-draft':
            go('sell', { step: 2 }, true);
            break;
        case 'smart-cost':
            if (ui.route === 'smart-market')
                go('smart-center');
            else
                costModal(id);
            break;
        case 'smart-use-price': {
            const item = smartItem(id), e = item && smartEstimate(item);
            if (item !== ui.draft || !e?.available)
                return;
            ui.draft.price = Math.round(e.range[1] * 100) / 100;
            ui.draft.priceReference = { productId: e.product.id, asOf: e.asOf, mode: state.smartSettings.mode, sourceKind: e.sourceKind, areas: e.marketCount, notGuaranteed: true };
            persistDraft();
            go('sell', { step: 2 });
            toast(L('Reference copied. You choose the final asking price.', 'సూచన ధర నింపాం. చివరి ధర మీరు నిర్ణయించండి.'));
            break;
        }
        case 'smart-mode':
            if (!['demo', 'imported'].includes(id))
                break;
            state.smartSettings.mode = id;
            save();
            render();
            break;
        case 'smart-refresh':
            save();
            render();
            toast(L('Dates rechecked. No new market data was downloaded.', 'తేదీలు తనిఖీ చేశాము. కొత్త మార్కెట్ డేటా దిగుమతి కాలేదు.'));
            break;
        case 'smart-source': {
            const source = SD.sources.find(s => s.id === id);
            if (source)
                window.location.href = source.url;
            break;
        }
        case 'smart-demo-import': {
            const p = SD.products[0];
            smart.importPreview = { name: 'DEMO_NOT_LIVE.csv', demo: true, text: 'productId,state,district,market,variety,grade,unit,date,min_price,modal_price,max_price\n' + [p.id, 'Andhra Pradesh', 'Guntur', 'Guntur DEMO', p.variety, p.grade, p.unit, SD.demoDate, 2400, 2600, 2800].join(','), validated: null };
            smart.importError = '';
            render();
            break;
        }
        case 'smart-commit-import': {
            const v = smart.importPreview;
            if (!v?.validated?.records.length)
                return;
            state.smartPrices = v.validated.records.map(r => ({ ...r, demo: !!v.demo, provenance: v.demo ? 'demo' : 'user-imported-unverified', sourceName: v.demo ? 'DEMO imported fixture' : r.sourceName }));
            state.smartImport = { at: new Date().toISOString(), name: v.name, demo: !!v.demo, rejected: v.validated.errors.length };
            state.smartSettings.mode = 'imported';
            save();
            smart.importPreview = null;
            render();
            toast(L('Validated rows saved. Source remains labelled.', 'సరైన రికార్డులు సేవ్ చేశాము. మూలం లేబుల్ ఉంటుంది.'));
            break;
        }
        case 'smart-print':
            if (window.ExportBridge?.printPdf)
                window.ExportBridge.printPdf('Agromitra_Price_Quality_PROTOTYPE');
            else if (window.print)
                window.print();
            break;
        case 'confirm-reset':
            prevSmartAction(a, id);
            migrateSmart();
            smart.profiles = {};
            smart.importPreview = null;
            save();
            render();
            break;
        default:
            prevSmartAction(a, id);
            if (a === 'edit-listing' && ui.draft?.editId === id) {
                for (const [key, value] of Object.entries(state.smartCosts))
                    if (key.startsWith(id + '|'))
                        state.smartCosts['DRAFT|' + key.slice(id.length + 1)] = clone(value);
                persistDraft();
            }
    }
};

handleForm = function (type, o, meta = {}) {
    const p = smartItem(type === 'smart-cost' ? ui.params.id : meta.id || ui.params.id);
    const fail = message => { const id = ['smart-profile', 'smart-facts'].includes(type) ? type + '-error' : 'form-error', node = document.getElementById(id); if (node)
        node.textContent = message;
    else
        toast(message); return false; };
    switch (type) {
        case 'smart-profile': {
            if (!p)
                return false;
            const product = SD.products.find(x => x.id === o.productId && x.cat === p.cat);
            if (!product)
                return fail(L('Choose the matching product.', 'సరిపోలే సరుకు ఎంచుకోండి.'));
            if (SE.convert(1, product.unit, p.unit) === null)
                return fail(L('Sale units do not match. Use an appropriate product or change the listing unit.', 'అమ్మకం యూనిట్ సరిపోలడం లేదు. సరైన సరుకు లేదా యూనిట్ ఎంచుకోండి.'));
            if ([o.variety, o.grade].filter(Boolean).some(x => /(?:\+?91[\s-]?)?[6-9](?:[\s-]?\d){9}/.test(x)))
                return fail(L('Keep phone numbers in contact settings only.', 'ఫోన్ నంబర్ సంప్రదింపు సెట్టింగ్‌లలో మాత్రమే పెట్టండి.'));
            const next = { ...smartProfile(p), productId: product.id, variety: String(o.variety || product.variety).trim().slice(0, 100), grade: String(o.grade || '').trim().slice(0, 80), allowFallback: !!o.allowFallback, district: o.district || '', sourceKind: o.sourceKind || '' };
            if (smartCanEdit(p)) {
                p.analysisProfile = next;
                if (p === ui.draft)
                    persistDraft();
                else
                    save();
            }
            else
                smart.profiles[p.id] = next;
            render();
            toast(L('Comparison updated', 'పోలిక నవీకరించాం'));
            return true;
        }
        case 'smart-facts': {
            if (!smartCanEdit(p))
                return false;
            const facts = {};
            for (const [key, en, te, type, min, max] of SD.facts[p.cat]) {
                const value = String(o[key] ?? '').trim();
                if (!value)
                    continue;
                if (type === 'number') {
                    const n = SE.number(value);
                    if (!Number.isFinite(n) || n < min || n > max)
                        return fail(L('Check', 'తనిఖీ చేయండి') + ' ' + L(en, te));
                    facts[key] = n;
                }
                else if (type === 'date') {
                    try {
                        facts[key] = SE.date(value);
                        if (SE.age(facts[key]) < 0)
                            return fail(L('Evidence dates cannot be in the future.', 'భవిష్యత్తు తేదీలు నమోదు చేయవద్దు.'));
                    }
                    catch (e) {
                        return fail(e.message);
                    }
                }
                else {
                    if (/(?:\+?91[\s-]?)?[6-9](?:[\s-]?\d){9}/.test(value))
                        return fail(L('Keep phone numbers in contact settings only.', 'ఫోన్ నంబర్ సంప్రదింపు సెట్టింగ్‌లలో మాత్రమే పెట్టండి.'));
                    facts[key] = value.slice(0, 160);
                }
            }
            if (/(?:\+?91[\s-]?)?[6-9](?:[\s-]?\d){9}/.test(String(o.reportReference || '')))
                return fail(L('Keep phone numbers out of report references.', 'రిపోర్ట్ సూచనలో ఫోన్ నంబర్ పెట్టవద్దు.'));
            p.analysisProfile = { ...smartProfile(p), qualityFacts: facts, reportReference: String(o.reportReference || '').trim().slice(0, 120), evidenceStatus: 'seller-declared-unverified' };
            if (p === ui.draft)
                persistDraft();
            else
                save();
            render();
            toast(L('Seller evidence details saved', 'విక్రేత వివరాలు సేవ్ చేశాం'));
            return true;
        }
        case 'smart-cost': {
            if (!p || !Number.isFinite(Number(p.quantity)) || Number(p.quantity) <= 0)
                return fail(L('Enter the listing quantity first.', 'ముందు లిస్టింగ్ పరిమాణం నమోదు చేయండి.'));
            const e = smartEstimate(p);
            if (!e.areas.some(a => a.key === meta.id))
                return false;
            const transport = SE.number(o.transport), handling = SE.number(o.handling), fee = SE.number(o.fee);
            if (![transport, handling, fee].every(n => Number.isFinite(n) && n >= 0) || fee > 100 || transport > 1e8 || handling > 1e8)
                return fail(L('Use valid nonnegative costs and a fee from 0 to 100%.', 'సరైన ఖర్చులు మరియు 0 నుంచి 100% ఫీజు వాడండి.'));
            state.smartCosts[smartKey(p) + '|' + meta.id] = { transport, handling, fee, quantity: Number(p.quantity), unit: p.unit, productId: e.product.id, at: new Date().toISOString() };
            save();
            closeModal();
            render();
            return true;
        }
        case 'smart-board':
            go('smart-market', { productId: o.productId }, true);
            return true;
        case 'smart-import': {
            if (!smart.importPreview || !o.confirmed)
                return fail(L('Confirm the source and unit.', 'మూలం మరియు యూనిట్ నిర్ధారించండి.'));
            try {
                smart.importPreview.validated = SE.normalizeFeed(smart.importPreview.text, { unit: o.unit, sourceKind: o.sourceKind, sourceName: o.sourceName, asOf: smart.importPreview.demo ? SD.demoDate : SE.day() });
                render();
                return true;
            }
            catch (e) {
                return fail(e.message);
            }
        }
        case 'sell-publish': {
            const draft = ui.draft, profile = clone(draft?.analysisProfile || {}), report = draft?.mediaReport ? clone(draft.mediaReport) : null, ref = draft?.priceReference ? clone(draft.priceReference) : null, result = prevSmartForm(type, o, meta);
            if (result) {
                const published = getListing(ui.params.listingId);
                published.analysisProfile = profile;
                published.mediaReport = report;
                published.priceReference = ref;
                for (const [key, value] of Object.entries(state.smartCosts))
                    if (key.startsWith('DRAFT|'))
                        state.smartCosts[published.id + '|' + key.slice(6)] = clone(value);
                save();
                render();
            }
            return result;
        }
        default: return prevSmartForm(type, o, meta);
    }
};

Object.assign(ROUTES, { home, detail, sell: sellPage, account: accountPage, 'flow-guide': flowGuide, 'smart-center': smartCenter, 'smart-analysis': smartAnalysis, 'smart-report': fullReport, 'smart-data': dataPage, 'smart-market': marketPage, 'smart-document': reportDocument });

document.addEventListener('change', e => { if (e.target.dataset?.smartImport)
    importFile(e.target.files?.[0]); if (e.target.name === 'productId' && e.target.closest('form[data-form="smart-profile"]')) {
    const product = SD.products.find(p => p.id === e.target.value), f = e.target.closest('form');
    if (product && f.elements.variety)
        f.elements.variety.value = product.variety;
} });

window.MarketApp = { ...window.MarketApp, get state() { return state; }, handleAction, handleForm, render, smart, smartEstimate, smartProfile, runMediaChecks, reportCurrent, engine: SE };
