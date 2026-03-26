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
