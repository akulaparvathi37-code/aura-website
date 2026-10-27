import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class RootErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[AURA] Uncaught application error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            backgroundColor: '#061F1C',
            color: '#F5EDD6',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            textAlign: 'center',
            fontFamily: "'Jost', 'Helvetica Neue', sans-serif",
          }}
        >
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '36px',
              color: '#C9A84C',
              marginBottom: '16px',
              letterSpacing: '0.04em',
            }}
          >
            AURA LUXURY ATELIER
          </h1>
          <p
            style={{
              color: '#C4B896',
              maxWidth: '480px',
              marginBottom: '24px',
              lineHeight: 1.6,
              fontSize: '15px',
            }}
          >
            We encountered an unexpected presentation error while rendering this page.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 28px',
              border: '1px solid #C9A84C',
              background: 'linear-gradient(135deg, #C9A84C 0%, #B8923C 100%)',
              color: '#061F1C',
              fontWeight: 600,
              fontSize: '11px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              borderRadius: '2px',
            }}
          >
            Reload Page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
)
