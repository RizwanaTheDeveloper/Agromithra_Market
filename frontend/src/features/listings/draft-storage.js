// Shared application bindings are composed in manifest order by scripts/build-web.cjs.
function persistDraft() { if (ui.draft) {
    state.savedDraft = clone(ui.draft);
    save();
} }

function draftCapture(o) {
    if (!ui.draft)
        return;
    for (const k of ['title', 'price', 'quantity', 'min', 'unit', 'location', 'state', 'expires', 'description', 'contactPhone', 'contactTime'])
        if (o[k] != null)
            ui.draft[k] = o[k];
    for (let i = 0; i < 4; i++)
        if (o['spec' + i] != null)
            ui.draft.specValues[i] = o['spec' + i];
    if (Object.prototype.hasOwnProperty.call(o, 'contactPhone')) {
        for (const k of ['allowCall', 'allowWhatsApp', 'shareContacts', 'negotiable'])
            ui.draft[k] = !!o[k];
    }
}
