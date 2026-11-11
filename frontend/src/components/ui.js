// Shared application bindings are composed in manifest order by scripts/build-web.cjs.
function toast(s) { const el = document.getElementById('toast'); el.textContent = s; el.style.display = 'block'; clearTimeout(toastTimer); toastTimer = setTimeout(() => el.style.display = 'none', 3100); }

let modalTrigger = null;
function closeModal() {
  document.getElementById('modal-root').innerHTML = '';
  document.getElementById('app').inert = false;
  document.body.style.overflow = '';
  if (modalTrigger?.isConnected) modalTrigger.focus();
  modalTrigger = null;
}

function modal(heading, html) { if (!document.getElementById('modal-root').innerHTML) modalTrigger = document.activeElement; document.getElementById('app').inert = true; document.body.style.overflow = 'hidden'; document.getElementById('modal-root').innerHTML = `<div class="modal-overlay"><section class="modal" role="dialog" aria-modal="true" aria-label="${esc(heading)}"><div class="row"><h2>${esc(heading)}</h2><button class="icon-button" data-action="close-modal" aria-label="${L('Close', 'మూసివేయండి')}">${icon('close')}</button></div>${html}</section></div>`; requestAnimationFrame(() => document.querySelector('#modal-root .icon-button')?.focus()); }

function field(label, name, value = '', type = 'text', extra = '', hint = '') { return `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${esc(value)}" ${extra}>${hint ? `<small>${hint}</small>` : ''}</label>`; }

function select(label, name, options, value) { return `<label class="field"><span>${label}</span><select name="${name}">${selectOptions(options, value)}</select></label>`; }

function textarea(label, name, value = '', extra = '') { return `<label class="field"><span>${label}</span><textarea name="${name}" ${extra}>${esc(value)}</textarea></label>`; }

function error(text) { const el = document.querySelector('#modal-root #form-error') || document.getElementById('form-error'); if (el)
    el.textContent = text;
else
    toast(text); return false; }

function header(text, sub = '', home = false) { return `<header class="topbar">${home ? `<div class="brand"><div class="brandmark">${icon('leaf')}</div><div class="brandname">Agromitra<span>MARKET</span></div></div>` : `<button class="icon-button" data-action="back" aria-label="${L('Back', 'వెనక్కి')}">${icon('back')}</button><div class="titlebar"><strong>${text}</strong>${sub ? `<small>${sub}</small>` : ''}</div>`}${home ? `<button class="icon-button" data-action="inbox" aria-label="${L('Messages', 'సందేశాలు')}">${icon('chat')}</button><button class="icon-button" data-action="notifications" aria-label="${L('Notifications', 'నోటిఫికేషన్లు')}">${icon('bell')}${state.notifications.some(n => !n.read) ? '<i class="dot"></i>' : ''}</button>` : ''}</header>`; }

function nav(active) { return `<nav class="nav" aria-label="Main navigation">${[['home', 'home', L('Explore', 'మార్కెట్')], ['requests', 'request', L('Requests', 'అవసరాలు')], ['sell', 'plus', L('Sell', 'అమ్మండి')], ['deals', 'deal', L('Deals', 'ఒప్పందాలు')], ['account', 'user', L('Account', 'ఖాతా')]].map(([r, i, t]) => `<button data-action="nav" data-id="${r}" class="${r === active ? 'active' : ''}">${r === 'sell' ? `<span class="sell-icon">${icon(i)}</span>` : icon(i)}<span>${t}</span></button>`).join('')}</nav>`; }

function shell(text, html, active = '', home = false, sub = '', footer = '') { return header(text, sub, home) + `<main>${html}</main>` + (footer || (active ? nav(active) : '')); }

function empty(h, p, button = '') { return `<div class="empty"><div class="empty-icon">${icon('leaf')}</div><h3>${h}</h3><p>${p}</p>${button}</div>`; }

function filterModal() { const f = ui.filters; modal(L('Find the right listing', 'సరైన లిస్టింగ్ చూడండి'), `<form data-form="filters">${select(L('Location', 'ప్రాంతం'), 'location', ['All', ...new Set(state.listings.map(p => p.location))], f.location)}${select(L('Demo distance', 'నమూనా దూరం'), 'distance', [['0', L('Any distance', 'ఏ దూరమైనా')], ['25', '25 km'], ['50', '50 km'], ['100', '100 km'], ['200', '200 km']], String(f.distance))}${field(L('Maximum price per listing unit (₹)', 'లిస్టింగ్ యూనిట్‌కు గరిష్ఠ ధర (₹)'), 'price', f.price || '', 'number', 'min="0" step="0.01"', L('Prices use different units across segments.', 'వర్గాల్లో ధర యూనిట్‌లు వేరుగా ఉంటాయి.'))}${field(L('Minimum available quantity', 'కనీస లభ్య పరిమాణం'), 'quantity', f.quantity || '', 'number', 'min="0" step="0.01"')}${select(L('Quantity unit', 'పరిమాణ యూనిట్'), 'unit', [['all', L('Any unit', 'ఏ యూనిట్ అయినా')], ...['quintal', 'kg', 'animal', 'bird', 'egg', 'litre', 'fish'].map(u => [u, unit(u)])], f.unit || 'all')}${select(L('Report availability', 'రిపోర్ట్ లభ్యత'), 'quality', [['all', L('Any listing', 'ఏ లిస్టింగ్ అయినా')], ['reports', L('Has sample inspection report', 'నమూనా తనిఖీ రిపోర్ట్ ఉంది')]], f.quality)}${select(L('Sort', 'క్రమం'), 'sort', [['recent', L('Recently listed', 'కొత్త లిస్టింగ్‌లు')], ['near', L('Nearest demo distance', 'దగ్గర నమూనా దూరం')], ['low', L('Price per unit: low to high', 'యూనిట్ ధర: తక్కువ నుంచి ఎక్కువ')], ['high', L('Price per unit: high to low', 'యూనిట్ ధర: ఎక్కువ నుంచి తక్కువ')]], f.sort)}${submit(L('Apply filters', 'ఫిల్టర్లు అమలు'))}</form>`); }
