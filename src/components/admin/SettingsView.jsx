import { useState } from 'react'
import PaymentSettingsManager from './PaymentSettingsManager'
import StoreSettingsManager from './StoreSettingsManager'
import styles from './SettingsView.module.css'

export default function SettingsView() {
  const [activeSubTab, setActiveSubTab] = useState('payment') // 'payment' | 'store'

  return (
    <div className={styles.container}>
      <nav className={styles.subTabsNav} aria-label="Settings Categories">
        <button
          type="button"
          className={`${styles.subTabBtn} ${
            activeSubTab === 'payment' ? styles.subTabBtnActive : ''
          }`}
          onClick={() => setActiveSubTab('payment')}
        >
          💳 Razorpay Gateway
        </button>

        <button
          type="button"
          className={`${styles.subTabBtn} ${
            activeSubTab === 'store' ? styles.subTabBtnActive : ''
          }`}
          onClick={() => setActiveSubTab('store')}
        >
          🏛 Atelier & Store Policies
        </button>
      </nav>

      {activeSubTab === 'payment' && <PaymentSettingsManager />}
      {activeSubTab === 'store' && <StoreSettingsManager />}
    </div>
  )
}
