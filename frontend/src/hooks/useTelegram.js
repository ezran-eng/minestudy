export function useTelegram() {
  const tg = window.Telegram?.WebApp;

  if (tg) {
    tg.ready();
    try { tg.setHeaderColor('#000000'); } catch(e) {}
    try { tg.setBackgroundColor('#000000'); } catch(e) {}
    tg.expand();
    try {
      if (tg.requestFullscreen) {
        tg.requestFullscreen();
      }
    } catch(e) {}

    // Force dark theme variables — overrides Telegram SDK injections on iOS
    // Inline styles on documentElement have highest CSS priority
    const root = document.documentElement;
    root.style.setProperty('--tg-theme-bg-color', 'transparent');
    root.style.setProperty('--tg-theme-secondary-bg-color', 'transparent');
    root.style.setProperty('--tg-theme-text-color', '#FFFFF0');
    root.style.setProperty('--tg-theme-hint-color', '#6b6b6b');
    root.style.setProperty('--tg-theme-section-bg-color', 'transparent');
    root.style.setProperty('--tg-theme-section-header-text-color', '#6b6b6b');
    root.style.setProperty('--tg-theme-subtitle-text-color', '#6b6b6b');
  }

  const rawUser = tg?.initDataUnsafe?.user;

  const user = rawUser || {
    id: 123456789,
    first_name: "Jose",
    last_name: "Ezran",
    username: "ezran_eng",
    photo_url: ""
  };

  return {
    tg,
    user
  };
}
