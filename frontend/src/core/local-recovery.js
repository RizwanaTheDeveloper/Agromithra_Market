/* Read earlier device stores before API results replace the visible records. */
const DEVICE_BACKUP='agromitra.market.local-backup.v1';
function readDeviceStore(key) {
    try {return JSON.parse(localStorage.getItem(key) || 'null') || {};}
    catch (_) {return {};}
}
function recoverDeviceListings(extra=[]) {
    const backup=readDeviceStore(DEVICE_BACKUP), current=readDeviceStore(STORAGE), legacy=readDeviceStore('agromitra.home-profile.v1');
    const list=rows=>Array.isArray(rows)?rows:[];
    const owned=rows=>list(rows).filter(row=>row && (row.own || row.seller==='ME') && !row.remote);
    const candidates=[...list(backup.listings),...owned(current.listings),...owned(state.listings),
        ...list(legacy.account?.ownListings).map(row=>({...row,own:true})),...list(extra)];
    const draft=current.savedDraft;
    if (draft?.title && !draft.editId && !draft.remoteId) candidates.push({...draft,id:draft.deviceListingId || 'DEVICE-UNPUBLISHED-DRAFT',own:true,specs:(draft.specValues || []).map((value,i)=>['Detail '+(i+1),value])});
    const recovered=new Map();
    for (const row of candidates) if (row && row.id && row.title && !backup.synced?.[row.id] && !row.remote)
        recovered.set(String(row.id),{...row,id:String(row.id),own:true});
    backup.listings=[...recovered.values()];
    backup.contacts={...backup.contacts,...legacy.account?.contacts,...current.privateContacts,...state.privateContacts};
    try {localStorage.setItem(DEVICE_BACKUP,JSON.stringify(backup));} catch (_) { /* Keep data readable when browser storage is full. */ }
    return backup.listings;
}
