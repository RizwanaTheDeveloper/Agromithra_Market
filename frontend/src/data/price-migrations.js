// Shared application bindings are composed in manifest order by scripts/build-web.cjs.
function migrateSmart() { state.smartPrices = state.smartPrices || []; state.smartCosts = state.smartCosts || {}; state.smartSettings = state.smartSettings || { mode: 'demo' }; state.smartImport = state.smartImport || null; state.smartVersion = 1; }
