// Shared application bindings are composed in manifest order by scripts/build-web.cjs.
/* Photo/video checks run on the phone, without sending media to any service. */
function samplePixels(image, width, height) { const scale = Math.min(1, 256 / Math.max(width, height)), canvas = document.createElement('canvas'); canvas.width = Math.max(3, Math.round(width * scale)); canvas.height = Math.max(3, Math.round(height * scale)); const context = canvas.getContext('2d', { willReadFrequently: true }); context.drawImage(image, 0, 0, canvas.width, canvas.height); return SE.pixelMetrics(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height); }

function timedMedia(target, event, trigger, ms = 15000) { return new Promise((resolve, reject) => { let timer; const done = () => { clearTimeout(timer); target.removeEventListener(event, ok); target.removeEventListener('error', bad); }; const ok = () => { done(); resolve(); }; const bad = () => { done(); reject(new Error('Media could not be decoded on this device')); }; target.addEventListener(event, ok, { once: true }); target.addEventListener('error', bad, { once: true }); timer = setTimeout(() => { done(); reject(new Error('Media decoding timed out. Use a shorter MP4 video.')); }, ms); trigger(); }); }

async function scanFile(m) {
    const blob = await mediaLoad(m.id);
    if (!blob)
        throw new Error('This media is unavailable on this phone.');
    const url = window.URL.createObjectURL(blob);
    try {
        if (m.kind === 'photo') {
            const img = new Image();
            await timedMedia(img, 'load', () => { img.src = url; });
            const metrics = samplePixels(img, img.naturalWidth, img.naturalHeight);
            return { id: m.id, kind: 'photo', name: m.name, width: img.naturalWidth, height: img.naturalHeight, metrics, readiness: SE.readiness(metrics, img.naturalWidth, img.naturalHeight), method: 'local-pixel-heuristics' };
        }
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.preload = 'auto';
        await timedMedia(video, 'loadedmetadata', () => { video.src = url; video.load(); });
        const duration = video.duration, width = video.videoWidth, height = video.videoHeight;
        if (!Number.isFinite(duration) || duration <= 0 || !video.videoWidth || !video.videoHeight)
            throw new Error('Video duration or dimensions unavailable. Try MP4.');
        const frames = [];
        for (const ratio of [.1, .5, .9]) {
            const t = Math.min(Math.max(.01, duration * ratio), Math.max(.01, duration - .01));
            await timedMedia(video, 'seeked', () => { video.currentTime = t; }, 8000);
            const metrics = samplePixels(video, video.videoWidth, video.videoHeight);
            frames.push({ second: Math.round(t * 10) / 10, metrics, readiness: SE.readiness(metrics, video.videoWidth, video.videoHeight) });
        }
        video.pause();
        video.removeAttribute('src');
        video.load();
        return { id: m.id, kind: 'video', name: m.name, width, height, duration: Math.round(duration * 10) / 10, frames, method: 'three-local-sampled-frames' };
    }
    finally {
        window.URL.revokeObjectURL(url);
    }
}

async function runMediaChecks(id) {
    const item = smartItem(id);
    if (!item || smart.busy)
        return;
    const files = clone(item.media || []), fingerprint = SE.fingerprint(item);
    if (!files.length)
        return toast(L('Add real photos or video first. Illustrations are not scanned.', 'ముందు నిజమైన ఫోటోలు లేదా వీడియో జోడించండి. నమూనా చిత్రాలను తనిఖీ చేయము.'));
    smart.busy = true;
    smart.progress = L('Checking your media locally…', 'మీ మీడియా ఈ ఫోన్‌లో తనిఖీ చేస్తున్నాము…');
    render();
    const results = [], failures = [];
    try {
        for (let i = 0; i < files.length; i++) {
            smart.progress = L('Checking media', 'మీడియా తనిఖీ') + ' ' + (i + 1) + ' / ' + files.length;
            const label = document.getElementById('smart-progress');
            if (label)
                label.textContent = smart.progress;
            try {
                results.push(await scanFile(files[i]));
            }
            catch (e) {
                failures.push({ id: files[i].id, kind: files[i].kind, message: e.message });
            }
        }
        if (smartItem(id) !== item || SE.fingerprint(item) !== fingerprint) {
            smart.progress = L('Media changed. Run the check again.', 'మీడియా మారింది. మళ్లీ తనిఖీ చేయండి.');
            return;
        }
        item.mediaReport = { id: uid('SCAN'), fingerprint, at: new Date().toISOString(), results, failures, modelConnected: false, productGrade: 'not-inferred', health: 'not-inferred', qualityVerified: false };
        if (item === ui.draft)
            persistDraft();
        else
            save();
        smart.reportTab = 'media';
        go('smart-report', { id }, true);
    }
    finally {
        smart.busy = false;
        smart.progress = '';
        render();
    }
}
