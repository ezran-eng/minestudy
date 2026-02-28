export function useTelegram() {
  const tg = window.Telegram?.WebApp;

  if (tg) {
    tg.ready();
  }

  console.log('Telegram WebApp:', window.Telegram?.WebApp);
  console.log('initDataUnsafe:', window.Telegram?.WebApp?.initDataUnsafe);
  console.log('user:', window.Telegram?.WebApp?.initDataUnsafe?.user);

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
