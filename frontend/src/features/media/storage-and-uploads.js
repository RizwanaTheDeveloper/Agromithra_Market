// Shared application bindings are composed in manifest order by scripts/build-web.cjs.
function openMediaDB() {
    if (mediaDBPromise)
        return mediaDBPromise;
    mediaDBPromise = new Promise((resolve, reject) => { if (!window.indexedDB)
        return reject(new Error('Media storage unavailable')); const request = window.indexedDB.open('agromitra.media.v11', 1); request.onupgradeneeded = () => request.result.createObjectStore('media'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(new Error('Could not open media storage')); });
    return mediaDBPromise;
}

async function mediaStore(id, blob) { const db = await openMediaDB(); return new Promise((resolve, reject) => { const tx = db.transaction('media', 'readwrite'); tx.objectStore('media').put(blob, id); tx.oncomplete = () => resolve(); tx.onerror = () => reject(new Error('Could not save this media')); tx.onabort = () => reject(new Error('Media storage is full')); }); }

async function mediaLoad(id) { const db = await openMediaDB(); return new Promise((resolve, reject) => { const request = db.transaction('media').objectStore('media').get(id); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(new Error('Could not load media')); }); }

async function mediaDelete(id) { if (objectURLs.has(id)) {
    window.URL.revokeObjectURL(objectURLs.get(id));
    objectURLs.delete(id);
} try {
    const db = await openMediaDB();
    db.transaction('media', 'readwrite').objectStore('media').delete(id);
}
catch (e) { } }

async function compressPhoto(file) {
    const url = window.URL.createObjectURL(file);
    try {
        return await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => { const ratio = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight)), canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio)); canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio)); canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height); canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Cannot prepare photo')), 'image/jpeg', 0.82); }; img.onerror = () => reject(new Error('Use a JPG, PNG or WebP photo.')); img.src = url; });
    }
    finally {
        window.URL.revokeObjectURL(url);
    }
}

function validMedia(file, kind) {
    const name = String(file.name || '');
    const size = Number(file.size || 0);
    if (kind === 'photo' && (!/^image\/(jpeg|png|webp)$/.test(file.type)))
        throw new Error(L('Choose a JPG, PNG or WebP photo.', 'JPG, PNG లేదా WebP ఫోటో ఎంచుకోండి.'));
    if (kind === 'video' && (!/^video\/(mp4|webm|3gpp|quicktime)$/.test(file.type)))
        throw new Error(L('Choose an MP4, WebM, 3GP or MOV video.', 'MP4, WebM, 3GP లేదా MOV వీడియో ఎంచుకోండి.'));
    if (size <= 0 || size > (kind === 'photo' ? 15 : 30) * 1024 * 1024)
        throw new Error(kind === 'photo' ? L('Each photo must be under 15 MB.', 'ప్రతి ఫోటో 15 MB లోపు ఉండాలి.') : L('Choose a short video under 30 MB.', '30 MB లోపు చిన్న వీడియో ఎంచుకోండి.'));
    return true;
}

async function addMedia(files, kind) {
    if (!ui.draft || comfort.mediaBusy)
        return;
    captureDraft();
    const draft = ui.draft, selected = Array.from(files || []);
    if (!selected.length)
        return;
    comfort.mediaBusy = true;
    comfort.mediaMessage = L('Preparing your media…', 'మీ ఫోటోలు సిద్ధం చేస్తున్నాము…');
    render();
    let count = 0, errors = [];
    try {
        for (const file of selected) {
            if (ui.draft !== draft)
                break;
            const items = draft.media || [];
            if (items.filter(x => x.kind === kind).length >= (kind === 'photo' ? 6 : 1)) {
                errors.push(kind === 'photo' ? L('Maximum six photos.', 'గరిష్టంగా ఆరు ఫోటోలు.') : L('One video per listing. Remove it to replace.', 'ఒక లిస్టింగ్‌కు ఒక వీడియో. మార్చడానికి తొలగించండి.'));
                break;
            }
            try {
                validMedia(file, kind);
                const blob = kind === 'photo' ? await compressPhoto(file) : file;
                const id = uid('M');
                await mediaStore(id, blob);
                draft.media = [...items, { id, kind, name: String(file.name).slice(0, 120), size: blob.size, type: blob.type, local: true }];
                count++;
                persistDraft();
            }
            catch (e) {
                errors.push(e.message);
            }
        }
    }
    finally {
        comfort.mediaBusy = false;
        comfort.mediaMessage = errors.join(' ') || (count ? L('Media added and saved on this phone.', 'మీడియా జోడించి ఈ ఫోన్‌లో సేవ్ చేశాము.') : '');
        render();
        if (comfort.mediaMessage)
            toast(comfort.mediaMessage);
    }
}

async function hydrateMedia() {
    const nodes = Array.from(document.querySelectorAll('[data-media-id]'));
    await Promise.allSettled(nodes.map(async (el) => { const id = el.dataset.mediaId; try {
        let url = objectURLs.get(id);
        const hosted = remote.media.get(id);
        if (!url && hosted) {
            // Server-hosted media: public listings stream directly; a seller's own media needs the session.
            if (hosted.own && remote.session) {
                const response = await fetch(`${API_BASE}/listings/${hosted.listingId}/media/${id}`, { headers: { Authorization: 'Bearer ' + remote.session.token } });
                if (!response.ok)
                    throw new Error('Missing media');
                url = window.URL.createObjectURL(await response.blob());
                objectURLs.set(id, url);
            }
            else
                url = `${API_BASE}/media/${id}`;
        }
        if (!url) {
            const blob = await mediaLoad(id);
            if (!blob)
                throw new Error('Missing media');
            url = window.URL.createObjectURL(blob);
            objectURLs.set(id, url);
        }
        if (el.isConnected !== false)
            el.src = url;
    }
    catch (e) {
        el.setAttribute('aria-label', L('Media unavailable on this device', 'ఈ పరికరంలో మీడియా లభ్యం కాదు'));
        if (el.parentElement)
            el.parentElement.classList.add('missing-media');
    } }));
}

function mediaTile(m, index, edit = false) { return `<div class="media-tile ${m.kind === 'video' ? 'video-tile' : ''}">${m.kind === 'photo' ? `<img data-media-id="${esc(m.id)}" alt="${L('Your photo', 'మీ ఫోటో')} ${index + 1}">` : `<video data-media-id="${esc(m.id)}" controls playsinline preload="metadata" aria-label="${L('Your listing video', 'మీ లిస్టింగ్ వీడియో')}"></video>`}<span class="media-label">${m.kind === 'video' ? L('Video', 'వీడియో') : index === 0 ? L('Cover photo', 'ముఖ్య ఫోటో') : L('Photo', 'ఫోటో') + ' ' + (index + 1)}</span>${edit ? `<div class="media-tools">${m.kind === 'photo' && index !== 0 ? `<button type="button" data-action="cover-media" data-id="${esc(m.id)}">${L('Make cover', 'ప్రధాన ఫోటో')}</button>` : ''}<button type="button" data-action="remove-media" data-id="${esc(m.id)}" aria-label="${L('Remove media', 'మీడియా తొలగించండి')}">${icon('close')}</button></div>` : ''}</div>`; }

function mediaEditor(d) { const items = d.media || []; return `<div class="media-editor"><div class="row"><h2>${L('Show what you sell', 'మీ సరుకు చూపండి')}</h2><span class="small muted">${items.filter(m => m.kind === 'photo').length}/6 ${L('photos', 'ఫోటోలు')}</span></div><p class="small muted">${L('Clear photos help buyers decide. Add one short video too.', 'స్పష్టమైన ఫోటోలు కొనుగోలుదారులకు సహాయపడతాయి. ఒక చిన్న వీడియో కూడా జోడించండి.')}</p><div class="media-upload-row"><label class="upload-button">${icon('camera')}<strong>${L('Add photos', 'ఫోటోలు జోడించండి')}</strong><small>${L('Choose from gallery', 'గ్యాలరీ నుంచి ఎంచుకోండి')}</small><input id="photo-upload" type="file" accept="image/*" multiple data-media-kind="photo" ${comfort.mediaBusy ? 'disabled' : ''}></label><label class="upload-button">${icon('video')}<strong>${L('Add video', 'వీడియో జోడించండి')}</strong><small>${L('Up to 30 MB', '30 MB వరకు')}</small><input id="video-upload" type="file" accept="video/*" data-media-kind="video" ${comfort.mediaBusy ? 'disabled' : ''}></label></div>${items.length ? `<div class="media-grid">${items.map((m, i) => mediaTile(m, i, true)).join('')}</div>` : `<div class="media-empty">${icon('camera')}<span>${L('Your photos and video will appear here.', 'మీ ఫోటోలు మరియు వీడియో ఇక్కడ కనిపిస్తాయి.')}</span></div>`}<p class="media-status" role="status">${esc(comfort.mediaMessage)}</p><button type="button" class="link small" data-action="photos">${L('Try a sample illustration instead', 'నమూనా చిత్రం ప్రయత్నించండి')}</button><p class="micro">${L('Media stays on this phone in this prototype. Photos are resized; video is kept as selected.', 'ఈ నమూనాలో మీడియా ఈ ఫోన్‌లోనే ఉంటుంది. ఫోటోలు పరిమాణం తగ్గించి సేవ్ చేస్తాము.')}</p></div>`; }
