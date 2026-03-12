export function useTelegram() {
  const tg = window.Telegram?.WebApp

  if (tg) {
    tg.ready()
    try { tg.setHeaderColor('#0e0e0e') }     catch(e) {}
    try { tg.setBackgroundColor('#0e0e0e') } catch(e) {}
    tg.expand()
    try { if (tg.requestFullscreen) tg.requestFullscreen() } catch(e) {}
  }

  const rawUser = tg?.initDataUnsafe?.user

  // Fallback para desarrollo local — reemplazá con tus propios datos
  const user = rawUser || {
    id:         123456789,
    first_name: 'Dev',
    last_name:  'User',
    username:   'devuser',
    photo_url:  '',
  }

  return { tg, user }
}
