import { Component } from 'react'

/**
 * ErrorBoundary — captura crashes de React y muestra un error amigable
 * en vez de una pantalla blanca.
 *
 * Uso: envolvé tus rutas con <ErrorBoundary> en App.jsx (ya está hecho).
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh', padding: '32px',
          background: 'var(--bg)', textAlign: 'center', gap: '12px',
        }}>
          <div style={{ fontSize: '40px' }}>⚠️</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
            Algo salió mal
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text2)', maxWidth: '260px', lineHeight: 1.5 }}>
            Ocurrió un error inesperado. Cerrá y volvé a abrir la app.
          </div>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{
              marginTop: '8px', padding: '10px 24px', borderRadius: '10px',
              background: 'var(--accent)', color: '#fff', border: 'none',
              fontWeight: 600, fontSize: '14px', cursor: 'pointer',
            }}
          >
            Reintentar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
