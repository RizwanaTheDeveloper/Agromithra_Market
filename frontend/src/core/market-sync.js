/* Market records are loaded independently: a listing or sign-in failure must
   not prevent public prices from being displayed. */
const localDataPage = dataPage, localMarketPage = marketPage,
    localSmartData = smartData, localSmartSourceNote = smartSourceNote,
    marketPrevAction = handleAction, marketPrevForm = handleForm;

remote.market = { items: [], loading: false, loaded: false, error: '', fetchedAt: '', filters: {}, products: [] };

async function refreshMarket() {
    const market = remote.market;
    if (market.loading) return;
    market.loading = true;
    market.error = '';
    renderIfIdle();
    try {
        const query = new URLSearchParams(market.filters).toString();
        const result = await api('GET', '/market/observations' + (query ? '?' + query : ''), undefined, { auth: false });
        if (!result || !Array.isArray(result.items)) throw new Error(L('The market response was invalid. Please try again.', 'మార్కెట్ సమాచారం సరిగా రాలేదు. మళ్లీ ప్రయత్నించండి.'));
        market.items = result.items;
        market.products = [...new Set([...market.products, ...result.items.map(row => row.product)])].sort();
        market.loaded = true;
        market.fetchedAt = new Date().toISOString();
    } catch (error) {
        market.error = error.message;
    } finally {
        market.loading = false;
        renderIfIdle();
    }
}

// Feed known products into existing listing comparisons without inventing
// matches for unfamiliar commodities or mixing incompatible sale units.
smartData = function () {
    if (!apiEnabled() || state.smartSettings.mode === 'imported') return localSmartData();
    return remote.market.items.flatMap(row => {
        const name = SE.norm(row.product);
        let matches = SD.products.filter(product =>
            [product.id, product.label, product.commodity].some(value => SE.norm(value) === name) &&
            SE.convert(1, row.unit, product.unit) !== null);
        if (matches.length > 1) matches = matches.filter(product => SE.norm(product.variety) === SE.norm(row.variety));
        if (matches.length !== 1) return [];
        return [{ id: row.id, productId: matches[0].id, commodity: row.product, variety: row.variety,
            grade: row.grade, unit: row.unit, state: row.state, district: row.district, market: row.market,
            date: dayOf(row.reportedAt), min: Number(row.minimum), modal: Number(row.modal), max: Number(row.maximum),
            sourceKind: row.basis, sourceName: row.sourceName, sourceURL: row.sourceUrl,
            provenance: row.provenance, demo: false }];
    });
};

smartSourceNote = function () {
    return apiEnabled() && state.smartSettings.mode !== 'imported' ? L('Server market records · original reporting dates', 'సర్వర్ మార్కెట్ రికార్డులు · అసలు నివేదిక తేదీలు') : localSmartSourceNote();
};

function serverMarketPanel() {
    const market = remote.market;
    let status = '';
    if (market.loading) status = `<p role="status">${L('Loading market prices…', 'మార్కెట్ ధరలు లోడ్ అవుతున్నాయి…')}</p>`;
    else if (market.error) status = `<p class="form-error" role="alert">${esc(market.error)}</p>${market.loaded ? `<p class="small muted">${L('Showing the last successfully fetched records.', 'చివరిసారి పొందిన రికార్డులు చూపిస్తున్నాము.')}</p>` : ''}`;
    else if (!market.items.length) status = `<p role="status">${Object.keys(market.filters).length
        ? L('No prices match these filters. Clear the filters to see other markets.', 'ఈ ఫిల్టర్లకు ధరలు లేవు. ఇతర మార్కెట్ల కోసం ఫిల్టర్లు తొలగించండి.')
        : L('No market prices have been published yet. Check again after market records are added.', 'మార్కెట్ ధరలు ఇంకా జోడించలేదు. రికార్డులు జోడించిన తరువాత మళ్లీ చూడండి.')}</p>`;
    const headers = [L('Product', 'సరుకు'), L('Market / area', 'మార్కెట్ / ప్రాంతం'), L('Reporting date', 'నివేదిక తేదీ'),
        L('Minimum', 'కనీసం'), L('Modal', 'మోడల్'), L('Maximum', 'గరిష్టం'), L('Source / basis', 'మూలం / ఆధారం')];
    const table = market.items.length ? `<div class="smart-price-table"><table><caption class="small muted">${L('Latest matching records (up to 100). Prices are per stated unit.', 'తాజా సరిపోలే రికార్డులు (100 వరకు). ధరలు చూపిన యూనిట్‌కు వర్తిస్తాయి.')}</caption><thead><tr>${headers.map(label => `<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>${market.items.map(row => {
        const source = /^https:\/\//i.test(row.sourceUrl || '')
            ? `<a href="${esc(row.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(row.sourceName)}</a>` : esc(row.sourceName);
        const cells = [`<strong>${esc(row.product)}</strong><small>${esc(row.variety)} · ${esc(row.grade)} · ${esc(unit(row.unit))}</small>`,
            `${esc(row.market)}<small>${esc(row.district)}, ${esc(row.state)}</small>`, esc(dayOf(row.reportedAt)),
            money(Number(row.minimum)), money(Number(row.modal)), money(Number(row.maximum)),
            `${source}<small>${rateKind(row.basis)}</small>`];
        return `<tr>${cells.map((cell, i) => `<td data-label="${esc(headers[i])}">${cell}</td>`).join('')}</tr>`;
    }).join('')}</tbody></table></div>` : '';
    return `<section aria-busy="${market.loading}"><div class="smart-status">${status}<p class="small muted">${market.fetchedAt ? L('Fetched at', 'పొందిన సమయం') + ': ' + esc(new Date(market.fetchedAt).toLocaleString()) : ''}</p><button class="btn secondary spaced" data-action="refresh-market" ${market.loading ? 'disabled' : ''}>${L('Refresh market data', 'మార్కెట్ డేటా నవీకరించండి')}</button></div>${table}</section>`;
}

dataPage = function () {
    if (!apiEnabled()) return localDataPage();
    return shell(L('Market data & freshness', 'మార్కెట్ డేటా & తేదీలు'), `<h1>${L('Market prices', 'మార్కెట్ ధరలు')}</h1><p class="lead">${L('Compare prices with their market, reporting date, source and sale unit.', 'మార్కెట్, తేదీ, మూలం మరియు యూనిట్‌తో ధరలు పోల్చండి.')}</p>${serverMarketPanel()}${btn(L('Filter area prices', 'ప్రాంతీయ ధరలు ఫిల్టర్ చేయండి'), 'smart-market', '', 'secondary spaced')}${marketImportCard()}<p class="small muted">${L('Records imported on this device', 'ఈ పరికరంలో దిగుమతి చేసిన రికార్డులు')}: ${state.smartPrices.length}</p><div class="btn-row spaced">${btn(L('Use server prices for comparisons', 'పోలికలకు సర్వర్ ధరలు వాడండి'), 'use-server-prices', '', 'secondary')}${state.smartPrices.length ? btn(L('Use imported prices for comparisons', 'పోలికలకు దిగుమతి ధరలు వాడండి'), 'use-imported-prices', '', 'secondary') : ''}</div>`, 'home');
};

marketPage = function () {
    if (!apiEnabled()) return localMarketPage();
    const market = remote.market, filters = market.filters;
    return shell(L('Area price board', 'ప్రాంతీయ ధరల పట్టిక'), `<h1>${L('Compare like with like.', 'సరిపోలే ధరలు చూడండి.')}</h1><form data-form="server-market-filter"><div class="fields-2">${select(L('Product', 'సరుకు'), 'product', [['', L('All products', 'అన్ని సరుకులు')], ...market.products.map(product => [product, product])], filters.product || '')}${select(L('Price basis', 'ధర ఆధారం'), 'basis', [['', L('All bases (shown separately)', 'అన్ని ఆధారాలు (విడిగా చూపబడతాయి)')], ...['mandi','asking','completed','processor'].map(basis => [basis, rateKind(basis)])], filters.basis || '')}${field(L('State', 'రాష్ట్రం'), 'state', filters.state || '', 'text', 'minlength="2" maxlength="100"')}${field(L('District', 'జిల్లా'), 'district', filters.district || '', 'text', 'minlength="2" maxlength="100"')}</div>${submit(L('View area prices', 'ప్రాంతీయ ధరలు చూడండి'))}</form>${btn(L('Clear filters', 'ఫిల్టర్లు తొలగించండి'), 'clear-market-filters', '', 'secondary spaced')}${serverMarketPanel()}`, 'home');
};

handleAction = function (action, id, element) {
    if (apiEnabled()) {
        if (action === 'use-server-prices' || action === 'use-imported-prices') {
            state.smartSettings.mode = action === 'use-server-prices' ? 'server' : 'imported';
            save();
            return render();
        }
        if (action === 'refresh-market' || action === 'smart-refresh') return refreshMarket();
        if (action === 'clear-market-filters') {
            if (remote.market.loading) return;
            remote.market.filters = {};
            render();
            return refreshMarket();
        }
    }
    return marketPrevAction(action, id, element);
};

handleForm = function (type, values, meta = {}) {
    if (apiEnabled() && type === 'server-market-filter') {
        if (remote.market.loading) return false;
        remote.market.filters = Object.fromEntries(['product','basis','state','district'].map(key => [key,String(values[key] || '').trim()]).filter(([,value]) => value));
        return refreshMarket();
    }
    return marketPrevForm(type, values, meta);
};

Object.assign(ROUTES, { 'smart-data': dataPage, 'smart-market': marketPage });
window.MarketApp = { ...window.MarketApp, handleAction, handleForm };
if (apiEnabled()) {
    state.smartSettings.mode = 'server';
    refreshMarket();
} else if (state.smartSettings.mode === 'server') state.smartSettings.mode = 'demo';
