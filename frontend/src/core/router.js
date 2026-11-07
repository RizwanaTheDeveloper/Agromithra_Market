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
