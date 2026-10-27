import { useState, useEffect, useCallback } from 'react'
import {
  getPaymentConfig,
  savePaymentConfig,
  testPaymentConnection,
} from '../../lib/admin/adminService'
import styles from './PaymentSettingsManager.module.css'

export default function PaymentSettingsManager() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  // Configuration fields
  const [provider, setProvider] = useState('razorpay')
  const [environment, setEnvironment] = useState('test')
  const [keyId, setKeyId] = useState('')
  const [keySecret, setKeySecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)

  // Remote verification status
  const [isConfigured, setIsConfigured] = useState(false)
  const [hasSecret, setHasSecret] = useState(false)
  const [lastVerifiedAt, setLastVerifiedAt] = useState(null)
  const [lastTestStatus, setLastTestStatus] = useState(null)

  // User alerts
  const [alert, setAlert] = useState(null) // { type: 'success' | 'error', text: '' }

  const showAlert = useCallback((text, type = 'success') => {
    setAlert({ text, type })
    setTimeout(() => setAlert(null), 4500)
  }, [])

  // 1. Fetch current payment settings
  const loadConfig = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getPaymentConfig()
      if (data) {
        setProvider(data.provider || 'razorpay')
        setEnvironment(data.environment || 'test')
        setKeyId(data.key_id || '')
        setIsConfigured(Boolean(data.is_configured))
        setHasSecret(Boolean(data.has_secret))
        setLastVerifiedAt(data.last_verified_at)
        setLastTestStatus(data.last_test_status)
      }
    } catch (err) {
      console.error('Error loading payment config:', err)
      showAlert(err.message || 'Failed to retrieve payment configuration', 'error')
    } finally {
      setLoading(false)
    }
  }, [showAlert])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  // 2. Save credentials
  const handleSave = async (e) => {
    e.preventDefault()
    if (!keyId.trim()) {
      showAlert('Razorpay Key ID is required.', 'error')
      return
    }

    try {
      setSaving(true)
      await savePaymentConfig({
        keyId: keyId.trim(),
        keySecret: keySecret.trim() ? keySecret.trim() : null,
        environment,
      })

      showAlert('Payment credentials saved securely to Supabase Vault.')
      setKeySecret('') // Clear the typed plaintext secret immediately from component state
      await loadConfig()
    } catch (err) {
      console.error('Failed to save payment config:', err)
      showAlert(err.message || 'Error saving payment credentials', 'error')
    } finally {
      setSaving(false)
    }
  }

  // 3. Test Connection
  const handleTestConnection = async () => {
    try {
      setTesting(true)
      showAlert('Testing live connection to Razorpay API...', 'info')
      const result = await testPaymentConnection(environment)

      if (result?.status === 'SUCCESS') {
        setLastTestStatus('SUCCESS')
        setLastVerifiedAt(new Date().toISOString())
        showAlert(`Verification Succeeded: ${result.message || 'Razorpay API responded with HTTP 200.'}`, 'success')
      } else {
        setLastTestStatus('FAILED')
        setLastVerifiedAt(new Date().toISOString())
        showAlert(`Verification Failed: ${result?.message || 'Razorpay API returned an error.'}`, 'error')
      }
    } catch (err) {
      console.error('Connection test error:', err)
      setLastTestStatus('FAILED')
      showAlert(err.message || 'Test failed: Unable to connect to Razorpay API.', 'error')
    } finally {
      setTesting(false)
    }
  }

  const formatTimestamp = (ts) => {
    if (!ts) return 'Never'
    try {
      const d = new Date(ts)
      return d.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return ts
    }
  }

  return (
    <div className={styles.container}>
      {/* Header & Status Card */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Payment Gateway Configuration</h2>
          <p className={styles.subtitle}>
            Manage Razorpay API credentials and test live transaction connectivity.
          </p>
        </div>

        <div className={styles.statusCard}>
          <div className={styles.statusIndicator}>
            <span
              className={`${styles.statusDot} ${
                lastTestStatus === 'SUCCESS'
                  ? styles.statusDotSuccess
                  : lastTestStatus === 'FAILED'
                  ? styles.statusDotFailed
                  : styles.statusDotPending
              }`}
            />
            <div>
              <div className={styles.statusText}>
                {lastTestStatus === 'SUCCESS'
                  ? 'Connection Verified'
                  : lastTestStatus === 'FAILED'
                  ? 'Verification Failed'
                  : 'Pending Verification'}
              </div>
              <div className={styles.statusTime}>
                Last checked: {formatTimestamp(lastVerifiedAt)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert banner */}
      {alert && (
        <div
          className={`${styles.alert} ${
            alert.type === 'error' ? styles.alertError : styles.alertSuccess
          }`}
          role="status"
        >
          {alert.type === 'error' ? '⚠ ' : '✓ '} {alert.text}
        </div>
      )}

      {/* Configuration Form */}
      <form onSubmit={handleSave} className={styles.form}>
        {/* Environment Selection */}
        <div className={styles.formSection}>
          <h3 className={styles.sectionTitle}>
            <EnvironmentIcon /> Gateway Environment
          </h3>

          <div className={styles.environmentSelector}>
            <div
              className={`${styles.envOption} ${
                environment === 'test' ? styles.envOptionActive : ''
              }`}
              onClick={() => setEnvironment('test')}
              role="button"
              tabIndex={0}
            >
              <div className={styles.envTitle}>
                <span>Test Mode (Sandbox)</span>
                <span className={`${styles.badgePill} ${styles.badgeTest}`}>Sandbox</span>
              </div>
              <div className={styles.envDesc}>
                Simulate mock payments with test cards and virtual bank accounts.
              </div>
            </div>

            <div
              className={`${styles.envOption} ${
                environment === 'live' ? styles.envOptionActive : ''
              }`}
              onClick={() => setEnvironment('live')}
              role="button"
              tabIndex={0}
            >
              <div className={styles.envTitle}>
                <span>Live Mode (Production)</span>
                <span className={`${styles.badgePill} ${styles.badgeLive}`}>Production</span>
              </div>
              <div className={styles.envDesc}>
                Accept real customer payments via UPI, Credit/Debit Cards, and Net Banking.
              </div>
            </div>
          </div>
        </div>

        {/* Credentials Section */}
        <div className={styles.formSection}>
          <h3 className={styles.sectionTitle}>
            <LockIcon /> API Credentials
          </h3>

          {/* Provider */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Payment Provider</label>
            <select
              className={styles.select}
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              disabled
            >
              <option value="razorpay">Razorpay (Direct API & Standard Checkout)</option>
            </select>
          </div>

          {/* Razorpay Key ID */}
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="razorpay-key-id">
              <span>Razorpay Key ID</span>
              <span className={styles.hint}>Public identifier (used by Checkout)</span>
            </label>
            <input
              id="razorpay-key-id"
              type="text"
              className={styles.input}
              placeholder={environment === 'live' ? 'rzp_live_...' : 'rzp_test_...'}
              value={keyId}
              onChange={(e) => setKeyId(e.target.value)}
              required
              autoComplete="off"
            />
          </div>

          {/* Razorpay Key Secret */}
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="razorpay-key-secret">
              <span>Razorpay Key Secret</span>
              <span className={styles.hint}>
                {hasSecret ? 'Configured in Vault ✓' : 'Not configured'}
              </span>
            </label>

            <div className={styles.passwordWrapper}>
              <input
                id="razorpay-key-secret"
                type={showSecret ? 'text' : 'password'}
                className={styles.input}
                placeholder={
                  hasSecret
                    ? '•••••••••••••••• (Leave blank to keep existing encrypted secret)'
                    : 'Paste Razorpay Key Secret here...'
                }
                value={keySecret}
                onChange={(e) => setKeySecret(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                className={styles.visibilityToggle}
                onClick={() => setShowSecret(!showSecret)}
                aria-label={showSecret ? 'Hide key secret' : 'Show key secret'}
                title={showSecret ? 'Hide secret' : 'Show secret'}
              >
                {showSecret ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            <p className={styles.hint}>
              Stored encrypted via Supabase Vault. The plaintext secret is never returned in client
              queries or exposed to the browser.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={styles.actionsRow}>
          <button
            type="button"
            className={styles.testBtn}
            onClick={handleTestConnection}
            disabled={testing || saving || (!keyId && !isConfigured)}
          >
            {testing ? (
              <>
                <SpinnerIcon /> Testing Connection...
              </>
            ) : (
              <>
                <CheckCircleIcon /> Test Connection
              </>
            )}
          </button>

          <button type="submit" className={styles.saveBtn} disabled={saving || testing}>
            {saving ? (
              <>
                <SpinnerIcon /> Saving...
              </>
            ) : (
              'Save Credentials'
            )}
          </button>
        </div>
      </form>

      {/* Security Architecture Notice */}
      <div className={styles.securityNotice}>
        <div className={styles.securityIcon}>
          <ShieldIcon />
        </div>
        <div className={styles.securityText}>
          <div className={styles.securityTitle}>Production Vault & RLS Enforcement</div>
          Your Razorpay Secret Key is securely encrypted inside <code>supabase_vault</code> using
          PostgreSQL pgcrypto. Neither customer sessions nor client web bundles have access to the
          underlying secret table. Connection tests run exclusively server-side via authenticated
          PostgreSQL RPC routines.
        </div>
      </div>
    </div>
  )
}

/* ---------- SVGs ---------- */
function EnvironmentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" />
      <line x1="6" y1="18" x2="6.01" y2="18" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </svg>
  )
}
