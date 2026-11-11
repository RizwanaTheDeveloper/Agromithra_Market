function validNumber(n) { return Number.isFinite(Number(n)) && Number(n) > 0; }

function discreteQuantity(q, u) { return !['animal', 'bird', 'egg', 'fish'].includes(u) || Number.isInteger(Number(q)); }
