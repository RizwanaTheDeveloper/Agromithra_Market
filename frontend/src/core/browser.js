/* Browser navigation, accessibility and migration from the earlier partial frontend. */
const legacyPaths = {
  '/profile': 'account', '/buy': 'browse', '/sell': 'seller-home', '/market': 'smart-market',
  '/listings': 'browse', '/listings/create': 'sell', '/buyer-verification': 'verification',
  '/ai-insights': 'smart-center', '/ai-insights/report': 'smart-report',
  '/account/insights': 'smart-center', '/account/insight-analysis': 'smart-analysis',
  '/account/inbox': 'inbox', '/account/my-requests': 'requests', '/account/admin': 'admin',
  '/account/reset': 'account', '/login': 'login', '/register': 'onboard', '/verify-otp': 'verification',
};
let existingStore = false;
try { existingStore = !!localStorage.getItem(STORAGE); } catch (_) { /* Session-only browsing is still supported. */ }
if (!existingStore) {
  try {
    const old = JSON.parse(localStorage.getItem('agromitra.home-profile.v1') || 'null');
    if (old?.profile) {
      state.profile = { ...state.profile, ...old.profile, onboarded: true };
      state.saved = Array.isArray(old.saved) ? old.saved : [];
      if (Array.isArray(old.account?.ownListings)) {
        state.listings.unshift(...old.account.ownListings.map(p => ({ ...p, own: true, created: Date.now(), identity: 'sample', expires: p.expires || future(30) })));
      }
      ui.route = 'home';
      save();
    }
  } catch (_) { /* A malformed old store never prevents opening the marketplace. */ }
}

function browserLocation() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [route, query = ''] = raw.split('?');
  const pathRoute = legacyPaths[location.pathname] || (location.pathname.startsWith('/account/') ? location.pathname.split('/').pop() : null);
  return { route: route || pathRoute, params: Object.fromEntries(new URLSearchParams(query)) };
}
function routeHash() {
  const params = new URLSearchParams(Object.entries(ui.params).filter(([, value]) => value !== undefined && value !== null).map(([key, value]) => [key, String(value)]));
  return '#/' + ui.route + (params.size ? '?' + params : '');
}
let browserRestoring = false;
const renderAPK = render;
render = function () {
  renderAPK();
  const app = document.getElementById('app');
  app.dataset.route = ui.route;
  const main = app.querySelector('main');
  if (main) { main.id = 'main-content'; main.tabIndex = -1; }
  const heading = app.querySelector('.titlebar strong, h1');
  document.title = (heading?.textContent?.trim() || 'Farm to market') + ' · Agromitra Market';
  if (!browserRestoring && location.hash !== routeHash()) history.pushState({ market: true }, '', routeHash());
};
function restoreBrowserRoute() {
  const next = browserLocation();
  if (next.route && ROUTES[next.route]) {
    closeModal();
    if (ui.route === 'sell') captureDraft();
    ui.route = next.route;
    ui.params = next.params;
    // Analysis/report deep links need a concrete item or a restored local draft.
    if (['smart-analysis','smart-report','smart-document'].includes(ui.route) && !ui.params.id) {
      ui.params.id = ui.draft ? 'DRAFT' : state.listings[0]?.id;
    }
    if (ui.route === 'sell' && !ui.draft) ui.draft = newDraft();
  }
  browserRestoring = true;
  render();
  browserRestoring = false;
}
window.addEventListener('popstate', restoreBrowserRoute);
window.addEventListener('hashchange', () => { if (location.hash !== routeHash()) restoreBrowserRoute(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeModal();
  if (event.key === 'Tab') {
    const dialog = document.querySelector('#modal-root [role="dialog"]');
    if (dialog) {
      const controls = [...dialog.querySelectorAll('button, input:not([type="hidden"]), select, textarea, a[href]')].filter(el => !el.disabled && el.getClientRects().length);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }
  if (event.key === ' ' && event.target.matches('[role="button"][data-action]')) {
    event.preventDefault(); event.target.click();
  }
});
window.MarketApp = { ...window.MarketApp, get state() { return state; }, render, routes: Object.keys(ROUTES) };
restoreBrowserRoute();
history.replaceState({ market: true }, '', routeHash());
