import { useState, useEffect, useCallback } from 'react'
import { getStoreSettings, saveStoreSettings } from '../../lib/admin/adminService'
import styles from './StoreSettingsManager.module.css'

export default function StoreSettingsManager() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState(null)

  const [form, setForm] = useState({
    store_name: 'AURA Luxury Fashion',
    currency: 'INR',
    currency_symbol: '₹',
    contact_email: 'concierge@aura-luxury.com',
    contact_phone: '+91 800-AURA-LUX',
    atelier_address: 'AURA Heritage Atelier, 12 Zari Enclave, Varanasi, India',
    free_shipping_threshold: 2000,
    order_email_notifications: true,
    sms_dispatch_alerts: true,
  })

  const showAlert = useCallback((text, type = 'success') => {
    setAlert({ text, type })
    setTimeout(() => setAlert(null), 3800)
  }, [])

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getStoreSettings()
      if (data) {
        setForm({
          store_name: data.store_name || 'AURA Luxury Fashion',
          currency: data.currency || 'INR',
          currency_symbol: data.currency_symbol || '₹',
          contact_email: data.contact_email || 'concierge@aura-luxury.com',
          contact_phone: data.contact_phone || '+91 800-AURA-LUX',
          atelier_address: data.atelier_address || '',
          free_shipping_threshold: data.free_shipping_threshold ?? 2000,
          order_email_notifications: data.order_email_notifications ?? true,
          sms_dispatch_alerts: data.sms_dispatch_alerts ?? true,
        })
      }
    } catch (err) {
      console.error('Failed to load store settings:', err)
      showAlert(err.message || 'Error loading store configuration', 'error')
    } finally {
      setLoading(false)
    }
  }, [showAlert])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleToggle = (key) => {
    setForm((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      await saveStoreSettings(form)
      showAlert('Store configuration successfully updated.')
    } catch (err) {
      console.error('Failed to save store settings:', err)
      showAlert(err.message || 'Error saving store configuration', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Atelier & Store Configuration</h2>
          <p className={styles.subtitle}>
            Manage brand identity, concierge contact points, and customer checkout policies.
          </p>
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

      {/* Settings Form */}
      <form onSubmit={handleSave} className={styles.form}>
        {/* Brand & Identity */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <BrandIcon /> Brand Identity & Currency
          </h3>

          <div className={styles.grid2}>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="store_name">
                Store / Brand Name
              </label>
              <input
                id="store_name"
                name="store_name"
                type="text"
                className={styles.input}
                value={form.store_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.grid2}>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="currency">
                  Currency Code
                </label>
                <input
                  id="currency"
                  name="currency"
                  type="text"
                  className={styles.input}
                  value={form.currency}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="currency_symbol">
                  Symbol
                </label>
                <input
                  id="currency_symbol"
                  name="currency_symbol"
                  type="text"
                  className={styles.input}
                  value={form.currency_symbol}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Concierge & Contact */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <ContactIcon /> Concierge & Atelier Details
          </h3>

          <div className={styles.grid2}>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="contact_email">
                Concierge Email
              </label>
              <input
                id="contact_email"
                name="contact_email"
                type="email"
                className={styles.input}
                value={form.contact_email}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="contact_phone">
                Concierge Phone / WhatsApp
              </label>
              <input
                id="contact_phone"
                name="contact_phone"
                type="text"
                className={styles.input}
                value={form.contact_phone}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="atelier_address">
              Heritage Atelier Address
            </label>
            <textarea
              id="atelier_address"
              name="atelier_address"
              className={styles.textarea}
              value={form.atelier_address}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Shipping & Thresholds */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <ShippingIcon /> Shipping & Checkout Policies
          </h3>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="free_shipping_threshold">
              Complimentary Shipping Threshold ({form.currency_symbol})
            </label>
            <input
              id="free_shipping_threshold"
              name="free_shipping_threshold"
              type="number"
              className={styles.input}
              value={form.free_shipping_threshold}
              onChange={handleChange}
              min="0"
            />
            <span className={styles.hint}>
              Orders equal to or exceeding this total qualify for complimentary insured delivery.
            </span>
          </div>
        </div>

        {/* Dispatch & Automated Notifications */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <BellIcon /> Automated Notifications
          </h3>

          <div
            className={styles.toggleRow}
            onClick={() => handleToggle('order_email_notifications')}
          >
            <div className={styles.toggleInfo}>
              <span className={styles.toggleTitle}>Order Confirmation Emails</span>
              <span className={styles.toggleDesc}>
                Dispatch royal parchment receipts to patrons upon successful Razorpay capture.
              </span>
            </div>
            <div
              className={`${styles.toggleSwitch} ${
                form.order_email_notifications ? styles.toggleSwitchActive : ''
              }`}
            >
              <div className={styles.toggleSlider} />
            </div>
          </div>

          <div
            className={styles.toggleRow}
            onClick={() => handleToggle('sms_dispatch_alerts')}
          >
            <div className={styles.toggleInfo}>
              <span className={styles.toggleTitle}>SMS & Courier Tracking Alerts</span>
              <span className={styles.toggleDesc}>
                Notify customers when artisanal packaging and courier handoff occurs.
              </span>
            </div>
            <div
              className={`${styles.toggleSwitch} ${
                form.sms_dispatch_alerts ? styles.toggleSwitchActive : ''
              }`}
            >
              <div className={styles.toggleSlider} />
            </div>
          </div>
        </div>

        {/* Actions Row */}
        <div className={styles.actionsRow}>
          <button type="submit" className={styles.saveBtn} disabled={saving || loading}>
            {saving ? 'Saving...' : 'Save Store Configuration'}
          </button>
        </div>
      </form>
    </div>
  )
}

/* ---------- SVGs ---------- */
function BrandIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}

function ContactIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function ShippingIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}
