/* Fills the "Players" column from the Express server (/api/ranks/distribution).
   Confirmed against the API spec: each entry is { rank (tier 0-11), subrank, badge (tier*10+subrank), players }.
   If the server is offline the "--" placeholders stay. */
(async function () {
  try {
    const res = await fetch(`${API_BASE}/api/ranks/distribution`);
    if (!res.ok) throw new Error(res.status);
    const rows = await res.json();
    const totals = {};
    for (const r of Array.isArray(rows) ? rows : []) {
      const tier = Number(r.rank);
      const count = Number(r.players);
      if (!Number.isFinite(tier) || !Number.isFinite(count)) continue;
      totals[tier] = (totals[tier] || 0) + count;
    }
    const sum = Object.values(totals).reduce((a, b) => a + b, 0);
    if (!sum) return;
    document.querySelectorAll('tr[data-tier]').forEach(tr => {
      const n = totals[tr.dataset.tier] || 0;
      tr.querySelector('.players').innerHTML = `${n.toLocaleString()} <small>${(n / sum * 100).toFixed(1)}%</small>`;
    });
  } catch (err) { /* offline: keep placeholders */ }
})();
