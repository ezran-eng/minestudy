export function useTelegram() {
  const tg = window.Telegram?.WebApp;

  if (tg) {
    tg.ready();
    tg.setHeaderColor('#0e0e0e');
    tg.setBackgroundColor('#0e0e0e');
    tg.expand();
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
