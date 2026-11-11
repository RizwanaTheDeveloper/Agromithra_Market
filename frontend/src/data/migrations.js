// Shared application bindings are composed in manifest order by scripts/build-web.cjs.
function migrateComfort() {
    state.profile.phone = state.profile.phone || '';
    state.buyerVerification = state.buyerVerification || { status: 'unverified', phone: '', name: '', business: '', city: '', purpose: '', demo: true };
    state.privateContacts = state.privateContacts || {};
    state.contactHistory = state.contactHistory || [];
    state.blockedBuyers = state.blockedBuyers || [];
    state.sellerEnquiries = state.sellerEnquiries || [];
    state.comfortVersion = 2;
    if (state.savedDraft && !ui.draft)
        ui.draft = clone(state.savedDraft);
}
