/* Shared browser/WebView viewport handling, including mobile keyboards and rotation. */
(() => {
  const root = document.documentElement;
  let nativeKeyboard = false;
  let pending = 0;
  function update() {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(() => {
      const viewport = window.visualViewport;
      const editable = document.activeElement?.matches('input:not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea, [contenteditable="true"]');
      const inset = viewport && viewport.scale === 1 ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0;
      const keyboard = nativeKeyboard || (!!editable && inset > 140);
      root.dataset.keyboardOpen = String(keyboard);
      root.style.setProperty('--viewport-height', `${viewport?.height || window.innerHeight}px`);
      root.style.setProperty('--keyboard-bottom', keyboard && !root.dataset.native ? `${inset}px` : '0px');
      if (keyboard && editable && !document.activeElement.closest('.chat-compose')) {
        const bounds = document.activeElement.getBoundingClientRect();
        const bottom = (viewport?.height || window.innerHeight) + (viewport?.offsetTop || 0);
        if (bounds.bottom > bottom - 24 || bounds.top < 0) document.activeElement.scrollIntoView({ block:'center', behavior:'smooth' });
      }
    });
  }
  window.visualViewport?.addEventListener('resize', update);
  window.visualViewport?.addEventListener('scroll', update);
  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', update);
  window.addEventListener('market-native-keyboard', event => { nativeKeyboard = !!event.detail; update(); });
  document.addEventListener('focusin', update);
  document.addEventListener('focusout', update);
  update();
})();
