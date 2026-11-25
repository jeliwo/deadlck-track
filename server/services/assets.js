const API = () => process.env.DEADLOCK_API || 'https://api.deadlock-api.com';
const SIX_HOURS = 6 * 3600 * 1000;

let cache = { at: 0, items: null, comps: null };

/* Item list from /v1/assets/items (a mix of abilities, weapons and shop upgrades). Only upgrades are kept.
   Returns { items: [{ id, name, slot, tier, shop, img }], comps: Map(itemId -> Set(componentItemIds)) } */
async function getItemAssets() {
  if (cache.items && Date.now() - cache.at < SIX_HOURS) return cache;
  try {
    const r = await fetch(`${API()}/v1/assets/items`);
    if (!r.ok) throw new Error('assets ' + r.status);
    const raw = (await r.json()).filter(i => i && i.type === 'upgrade');
    const byClass = new Map(raw.map(i => [i.class_name, i.id]));
    const comps = new Map();
    for (const i of raw) {
      const ids = (i.component_items || []).map(c => (typeof c === 'number' ? c : byClass.get(c))).filter(Boolean);
      if (ids.length) comps.set(i.id, new Set(ids));
    }
    cache = {
      at: Date.now(), comps,
      items: raw.map(i => ({ id: i.id, name: i.name, slot: String(i.item_slot_type ?? '').toLowerCase(), tier: i.item_tier ?? 0, shop: i.shopable !== false && !i.disabled, img: i.shop_image_small_webp || i.image_webp || i.shop_image_webp || i.image || null }))
    };
  } catch (err) {
    if (!cache.items) throw err;      // nothing to fall back on
  }
  return cache;
}

module.exports = { getItemAssets };
