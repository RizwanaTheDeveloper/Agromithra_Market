import { useEffect, useState } from 'react';
import { marketplaceBuild } from '@/generated/build-info';

/** The complete APK frontend owns its DOM below #app; Expo supplies the web host. */
export default function WebLayout() {
  const [error, setError] = useState('');
  useEffect(() => {
    const restore = () => {
      const app = (window as Window & { MarketApp?: { render: () => void } }).MarketApp;
      app?.render();
    };
    if (document.getElementById('market-script')) {
      const previous = document.getElementById('market-script');
      if (previous?.dataset.build !== marketplaceBuild) {
        window.location.reload();
        return;
      }
      restore();
      document.getElementById('market-script')?.addEventListener('load', restore, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.id = 'market-script';
    script.dataset.build = marketplaceBuild;
    script.src = '/market/app.js?v=' + marketplaceBuild;
    script.async = false;
    script.onload = restore;
    script.onerror = () => setError('The marketplace assets could not load. Restart with npm run web.');
    document.body.appendChild(script);
    // This is the application root. It lives for the entire browser session.
  }, [marketplaceBuild]);
  return <>
    <link rel="stylesheet" href={'/market/app.css?v=' + marketplaceBuild} />
    <a className="skip-link" href="#main-content">Skip to content</a>
    <div id="app" />
    <div id="modal-root" />
    <div id="toast" role="status" aria-live="polite" />
    {error && <p role="alert">{error}</p>}
  </>;
}
