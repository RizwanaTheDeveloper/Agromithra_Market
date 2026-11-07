import { useEffect, useState } from 'react';

/** The complete APK frontend owns its DOM below #app; Expo supplies the web host. */
export default function WebLayout() {
  const [error, setError] = useState('');
  useEffect(() => {
    const restore = () => {
      const app = (window as Window & { MarketApp?: { render: () => void } }).MarketApp;
      app?.render();
    };
    if (document.getElementById('market-script')) {
      restore();
      document.getElementById('market-script')?.addEventListener('load', restore, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.id = 'market-script';
    script.src = '/market/app.js';
    script.async = false;
    script.onload = restore;
    script.onerror = () => setError('The marketplace assets could not load. Restart with npm run web.');
    document.body.appendChild(script);
    // This is the application root. It lives for the entire browser session.
  }, []);
  return <>
    <link rel="stylesheet" href="/market/app.css" />
    <a className="skip-link" href="#main-content">Skip to content</a>
    <div id="app" />
    <div id="modal-root" />
    <div id="toast" role="status" aria-live="polite" />
    {error && <p role="alert">{error}</p>}
  </>;
}
