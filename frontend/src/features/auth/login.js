/* Sign-in screen and the administrator's buyer-approval screen. Both need the backend; offline demo builds show a notice. */
const loginPrevAction = handleAction, loginPrevForm = handleForm, loginPrevAccount = accountPage, loginPrevWelcome = welcome;

const isAdmin = () => !!(remote.me && remote.me.isAdmin);

function loginPage() {
    if (!apiEnabled())
        return shell(L('Sign in', 'సైన్ ఇన్'), note('This is the offline demo: there is nothing to sign in to. Build the app with an API address to use real accounts.', 'ఇది ఆఫ్‌లైన్ డెమో: సైన్ ఇన్ అవసరం లేదు. నిజమైన ఖాతాల కోసం API చిరునామాతో యాప్ నిర్మించండి.'), 'account');
    let html = `<div class="verification-heading"><span>${icon('user')}</span><h1>${L('Welcome back.', 'తిరిగి స్వాగతం.')}</h1><p class="lead">${L('Sign in with your mobile number. We will text you a one-time code.', 'మీ మొబైల్ నంబర్‌తో సైన్ ఇన్ అవ్వండి. మేము వన్-టైమ్ కోడ్ పంపుతాము.')}</p></div>`;
    if (signedIn()) {
        html += `<div class="card"><span class="tag">${L('Signed in', 'సైన్ ఇన్ అయ్యారు')}</span><h2 class="spaced">${esc(state.profile.name && state.profile.name !== 'Demo Buyer' ? state.profile.name : state.profile.phone)}</h2><p class="muted">${esc(state.profile.phone)}</p>${btn(L('Continue', 'కొనసాగండి'), 'browse', '', 'spaced')}${isAdmin() ? btn(L('Review buyers', 'కొనుగోలుదారుల సమీక్ష'), 'admin-verifications', '', 'secondary spaced') : ''}${btn(L('Sign out', 'సైన్ అవుట్'), 'logout', '', 'secondary spaced')}</div>`;
    }
    else {
        // After sign-in the shared handler returns here, so send people to the marketplace.
        if (!comfort.loginReturn)
            comfort.loginReturn = { route: 'home', params: {} };
        html += `<form data-form="buyer-phone">${field(L('Mobile number', 'మొబైల్ నంబర్'), 'phone', '', 'tel', 'required maxlength="20" inputmode="tel" autocomplete="tel-national"')}${errorBox()}${submit(L('Send code', 'కోడ్ పంపండి'))}</form>${note('New here? Signing in with a new number creates your account.', 'కొత్తవారా? కొత్త నంబర్‌తో సైన్ ఇన్ చేస్తే ఖాతా సృష్టించబడుతుంది.')}`;
    }
    return shell(L('Sign in', 'సైన్ ఇన్'), html, 'account');
}

function adminVerificationsPage() {
    if (!isAdmin())
        return shell(L('Review buyers', 'కొనుగోలుదారుల సమీక్ష'), empty(L('Administrators only', 'నిర్వాహకులకు మాత్రమే'), L('Your account cannot review buyer profiles.', 'మీ ఖాతా కొనుగోలుదారు ప్రొఫైల్‌లను సమీక్షించలేదు.')), 'account');
    const rows = remote.admin || [];
    const cards = rows.map(v => {
        const u = v.user || {};
        return `<article class="card spaced"><div class="row"><h3 style="flex:1">${esc(u.displayName || L('No name given', 'పేరు ఇవ్వలేదు'))}</h3><span class="tag gold">${L('Pending', 'పెండింగ్')}</span></div><p class="muted">${esc(u.phone || '')} · ${esc(u.city || '')}</p><p>${esc(v.business)}</p><p class="small muted">${esc(v.purpose)}</p><p class="small muted">${esc(new Date(v.submittedAt).toLocaleString())}</p>${btn(L('Approve', 'ఆమోదించండి'), 'admin-approve', v.userId, 'spaced')}${btn(L('Needs changes', 'మార్పులు అవసరం'), 'admin-reject', v.userId, 'secondary spaced')}</article>`;
    }).join('');
    return shell(L('Review buyers', 'కొనుగోలుదారుల సమీక్ష'), `<h1>${L('Buyer profiles to review', 'సమీక్షించాల్సిన కొనుగోలుదారు ప్రొఫైల్‌లు')}</h1><p class="lead">${L('Approved buyers can see sellers’ contact details.', 'ఆమోదించిన కొనుగోలుదారులు విక్రేతల సంప్రదింపు వివరాలు చూడగలరు.')}</p>${cards || empty(L('Nothing waiting', 'ఏదీ పెండింగ్‌లో లేదు'), L('Every buyer profile has been reviewed.', 'అన్ని కొనుగోలుదారు ప్రొఫైల్‌లు సమీక్షించబడ్డాయి.'))}${btn(L('Refresh', 'రిఫ్రెష్'), 'admin-verifications', '', 'secondary spaced')}`, 'account');
}

accountPage = function () {
    const page = loginPrevAccount();
    if (!apiEnabled() || !isAdmin())
        return page;
    return page.replace('<div class="card spaced">', `<div class="card spaced">${menu('shield', L('Review buyers', 'కొనుగోలుదారుల సమీక్ష'), L('Approve or reject buyer profiles', 'కొనుగోలుదారు ప్రొఫైల్‌లను ఆమోదించండి లేదా తిరస్కరించండి'), 'admin-verifications')}</div><div class="card spaced">`);
};

welcome = function () {
    const page = loginPrevWelcome();
    if (!apiEnabled())
        return page;
    return page
        .replace('No real login, payment or booking. Your changes are saved on this device.', 'Browse without an account. Sign in with your mobile number to sell, ask for quotes and message sellers.')
        .replace('నిజమైన లాగిన్, చెల్లింపు లేదా బుకింగ్ లేదు. మార్పులు ఈ పరికరంలో సేవ్ అవుతాయి.', 'ఖాతా లేకుండా చూడవచ్చు. అమ్మడానికి, ధరలు అడగడానికి, విక్రేతలతో మాట్లాడటానికి మొబైల్ నంబర్‌తో సైన్ ఇన్ చేయండి.')
        .replace('Start prototype', 'Get started').replace('నమూనా ప్రారంభించండి', 'ప్రారంభించండి')
        .replace('</main>', btn(signedIn() ? L('Your account', 'మీ ఖాతా') : L('Sign in', 'సైన్ ఇన్'), 'login', '', 'secondary spaced') + '</main>');
};

handleAction = function (a, id = '', element = null) {
    if (!apiEnabled())
        return loginPrevAction(a, id, element);
    switch (a) {
        case 'login':
            if (!signedIn())
                comfort.loginReturn = { route: 'home', params: {} };
            return go('login');
        case 'admin-verifications':
            if (!signedIn())
                return needSignIn('login', {});
            return serverTask(async () => {
                remote.admin = await api('GET', '/admin/verifications');
                go('admin-verifications', {}, ui.route === 'admin-verifications');
                return true;
            });
        case 'admin-approve':
            return serverTask(async () => {
                await api('PATCH', '/admin/verifications/' + id, { status: 'approved', note: 'Approved' });
                remote.admin = await api('GET', '/admin/verifications');
                render();
                toast(L('Buyer approved', 'కొనుగోలుదారు ఆమోదించబడ్డారు'));
                return true;
            });
        case 'admin-reject':
            remote.reviewTarget = id;
            return modal(L('What needs to change?', 'ఏమి మార్చాలి?'), `<form data-form="admin-reject"><label class="field"><span>${L('Note for the buyer', 'కొనుగోలుదారుకు సూచన')}</span><textarea name="note" required maxlength="500" rows="4"></textarea></label>${errorBox()}${submit(L('Send', 'పంపండి'))}</form>`);
        default:
            return loginPrevAction(a, id, element);
    }
};

handleForm = function (type, o, meta = {}) {
    if (apiEnabled() && type === 'admin-reject') {
        const note = String(o.note || '').trim();
        if (!note || !remote.reviewTarget)
            return error(L('Write a short note explaining what to fix.', 'ఏమి సరిచేయాలో చిన్న సూచన రాయండి.'));
        return serverTask(async () => {
            await api('PATCH', '/admin/verifications/' + remote.reviewTarget, { status: 'rejected', note });
            remote.reviewTarget = null;
            remote.admin = await api('GET', '/admin/verifications');
            closeModal();
            render();
            toast(L('Sent back to the buyer', 'కొనుగోలుదారుకు తిరిగి పంపబడింది'));
            return true;
        });
    }
    return loginPrevForm(type, o, meta);
};

Object.assign(ROUTES, { login: loginPage, 'admin-verifications': adminVerificationsPage, account: accountPage, welcome });
