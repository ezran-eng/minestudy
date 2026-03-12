import { useTelegram } from '../hooks/useTelegram'

/**
 * Pantalla principal — reemplazá este contenido con tu app real.
 * Podés importar componentes de @telegram-apps/telegram-ui para tener
 * la estética nativa de Telegram.
 */
export default function Home() {
  const { user } = useTelegram()

  return (
    <div className="screen">
      <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
          Hola, {user.first_name} 👋
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>
          Esta es la pantalla principal del boilerplate. Modificala a tu gusto.
        </p>
        <div style={{
          marginTop: '8px', padding: '16px', borderRadius: 'var(--r)',
          background: 'var(--surface)', border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '8px' }}>
            Tu ID de Telegram:
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent)' }}>
            {user.id}
          </div>
        </div>
      </div>
    </div>
  )
}
