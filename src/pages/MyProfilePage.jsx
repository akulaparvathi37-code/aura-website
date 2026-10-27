import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import styles from './MyProfilePage.module.css'

export default function MyProfilePage({ onBack, onNavigate, onOpenAuth }) {
  const { user, profile, isAuthenticated, isAdmin, loading, updateProfile } = useAuth()
  
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (profile) {
      setAge(profile.age !== null && profile.age !== undefined ? String(profile.age) : '')
      setGender(profile.gender || '')
      setName(profile.name || user?.user_metadata?.full_name || '')
    } else if (user) {
      setName(user.user_metadata?.full_name || user.email?.split('@')[0] || '')
    }
  }, [profile, user])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErrorMsg('')
    setSaveSuccess(false)

    try {
      const { error } = await updateProfile({ age, gender, name })
      if (error) {
        setErrorMsg(error.message || 'Failed to update profile preferences in Supabase.')
      } else {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      }
    } catch (err) {
      setErrorMsg(err.message || 'An unexpected error occurred while saving profile.')
    } finally {
      setSaving(false)
    }
  }

  const displayName = profile?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'AURA Client'
  const displayEmail = user?.email || profile?.email || ''
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url

  return (
    <div className={styles.page} id="my-profile-page">
      <div className={styles.container}>
        {/* Header Block */}
        <div className={styles.headerBlock}>
          <button
            type="button"
            className={styles.breadcrumb}
            onClick={onBack}
            aria-label="Return to AURA Home"
          >
            ← Back to Home
          </button>

          <span className={styles.eyebrow}>— CLIENT PRIVILEGE</span>
          <h1 className={styles.heading}>YOUR PROFILE</h1>
          <p className={styles.subtext}>
            Manage your personal couture preferences, private atelier styling details, and Google authenticated credentials.
          </p>
        </div>

        {!isAuthenticated && !loading ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🔒</span>
            <h2 className={styles.emptyTitle}>Sign In Required</h2>
            <p className={styles.emptySubtext}>
              Please sign in with your Google account to view and customize your AURA client profile.
            </p>
            <button
              type="button"
              className={styles.exploreBtn}
              onClick={onOpenAuth}
            >
              Sign In with Google →
            </button>
          </div>
        ) : (
          <>
            {/* Profile Overview Card */}
            <div className={styles.profileCard}>
              <div className={styles.avatarWrap}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className={styles.avatarImg} />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className={styles.profileInfo}>
                <h2 className={styles.profileName}>{displayName}</h2>
                <div className={styles.profileEmail}>{displayEmail}</div>
                <div className={styles.badgeRow}>
                  <span className={styles.authBadge}>✓ Google Verified Session</span>
                  {isAdmin && (
                    <span className={styles.adminBadge}>✦ Atelier Administrator</span>
                  )}
                </div>
              </div>
            </div>

            {/* Editable Profile Preferences Form */}
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>Personal Atelier Preferences</h3>
              <p className={styles.sectionSubtext}>
                These details assist our master drapers and stylists in curating bespoke weaves and occasion edits tailored to your personal aesthetic.
              </p>

              <form onSubmit={handleSave}>
                <div className={styles.formGrid}>
                  <div className={styles.inputGroup}>
                    <label htmlFor="profile-name" className={styles.label}>
                      Full Name
                    </label>
                    <input
                      id="profile-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Priyadarshini Rao"
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label htmlFor="profile-age" className={styles.label}>
                      Age (Optional)
                    </label>
                    <input
                      id="profile-age"
                      type="number"
                      min="16"
                      max="110"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="e.g. 28"
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label htmlFor="profile-gender" className={styles.label}>
                      Gender Identity (Optional)
                    </label>
                    <select
                      id="profile-gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className={styles.select}
                    >
                      <option value="">Select (Optional)</option>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Non-Binary">Non-Binary</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                </div>

                {errorMsg && (
                  <p style={{ color: '#F87171', fontSize: '0.85rem', marginBottom: '16px' }}>
                    ⚠ {errorMsg}
                  </p>
                )}

                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <button
                    type="submit"
                    className={styles.saveBtn}
                    disabled={saving}
                  >
                    {saving ? 'Saving to Database…' : 'Save Profile Preferences'}
                  </button>

                  {saveSuccess && (
                    <span className={styles.successNotice}>
                      ✓ Saved to Supabase Atelier Profile
                    </span>
                  )}
                </div>
              </form>
            </div>

            {/* Quick Navigation to Orders */}
            <div className={styles.quickNavCard}>
              <div>
                <h4 style={{ margin: '0 0 4px', color: '#FFFFFF', fontWeight: '400' }}>
                  Looking for your past purchases?
                </h4>
                <span className={styles.quickNavText}>
                  Track dispatched weaves, delivery timelines, and view atelier invoices.
                </span>
              </div>
              <button
                type="button"
                className={styles.ordersLinkBtn}
                onClick={() => onNavigate?.('orders')}
              >
                View My Orders →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
