import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useCart, formatPrice } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import {
  validateAndCalculateCartTotal,
  launchRazorpayModal,
  createRazorpayServerOrder,
  verifyRazorpayPaymentOnServer,
  createCashOnDeliveryServerOrder,
} from '../../lib/razorpay/checkout'
import styles from './CheckoutModal.module.css'

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Delhi (NCR)',
  'Gujarat',
  'Karnataka',
  'Kerala',
  'Maharashtra',
  'Rajasthan',
  'Tamil Nadu',
  'Telangana',
  'Uttar Pradesh',
  'West Bengal',
  'Punjab',
  'Madhya Pradesh',
  'Bihar',
  'Haryana',
  'Goa',
  'Assam',
  'Odisha',
  'Other State / UT',
]

export default function CheckoutModal({
  isOpen,
  onClose,
  onNavigateToHome,
  onNavigateToOrders,
  onOpenReview,
}) {
  const { cart, subtotal, clearCart } = useCart()
  const { user, profile } = useAuth()

  // Stepped Checkout: 1 = Details & Address, 2 = Review & Payment, 3 = Confirmation
  const [step, setStep] = useState(1)
  const [paymentMethodChoice, setPaymentMethodChoice] = useState('online') // 'online' | 'cod'
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [completedOrder, setCompletedOrder] = useState(null)

  // Voucher / Coupon state
  const [couponCode, setCouponCode] = useState('')
  const [appliedDiscountRate, setAppliedDiscountRate] = useState(0) // e.g. 0.10 for 10%
  const [couponMessage, setCouponMessage] = useState(null)
  const activeGuestTokenRef = useRef(null)

  // Customer & Shipping Form State
  const [formData, setFormData] = useState(() => ({
    name: profile?.name || user?.user_metadata?.full_name || '',
    email: profile?.email || user?.email || '',
    phone: profile?.phone || user?.user_metadata?.phone || '',
    address: profile?.shipping_address?.address || profile?.address || '',
    apartment: profile?.shipping_address?.apartment || '',
    city: profile?.shipping_address?.city || '',
    state: profile?.shipping_address?.state || 'Maharashtra',
    pinCode: profile?.shipping_address?.pinCode || '',
  }))

  // Validation Errors map
  const [errors, setErrors] = useState({})
  const lastProfileRef = useRef(null)

  // Prefill user details if authenticated
  useEffect(() => {
    const currentId = profile?.id || user?.id
    if ((user || profile) && currentId && lastProfileRef.current !== currentId) {
      lastProfileRef.current = currentId
      const timer = setTimeout(() => {
        setFormData((prev) => ({
          ...prev,
          name: prev.name || profile?.name || user?.user_metadata?.full_name || '',
          email: prev.email || profile?.email || user?.email || '',
          phone: prev.phone || profile?.phone || user?.user_metadata?.phone || '',
          address: prev.address || profile?.shipping_address?.address || profile?.address || '',
          city: prev.city || profile?.shipping_address?.city || '',
          state: prev.state || profile?.shipping_address?.state || 'Maharashtra',
          pinCode: prev.pinCode || profile?.shipping_address?.pinCode || '',
        }))
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [user, profile])

  const handleModalClose = useCallback(() => {
    setStep(1)
    setErrorMessage('')
    setIsProcessing(false)
    setErrors({})
    onClose?.()
  }, [onClose])

  // ESC key and modal scroll lock
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && step !== 3) {
        handleModalClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, step, handleModalClose])

  // Discount calculation
  const discountAmount = useMemo(() => {
    if (appliedDiscountRate <= 0) return 0
    return Math.round(subtotal * appliedDiscountRate)
  }, [subtotal, appliedDiscountRate])

  const payableTotal = useMemo(() => {
    return Math.max(0, subtotal - discountAmount)
  }, [subtotal, discountAmount])

  if (!isOpen) return null

  // Handle Input Changes with immediate field error clearing
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }))
    }
    if (errorMessage) {
      setErrorMessage('')
    }
  }

  // Voucher coupon application
  const handleApplyCoupon = (e) => {
    e.preventDefault()
    setCouponMessage(null)
    const code = couponCode.trim().toUpperCase()

    if (!code) return

    if (code === 'AURA10') {
      setAppliedDiscountRate(0.1)
      setCouponMessage({ type: 'success', text: '10% Artisanal Privilege Discount applied!' })
    } else if (code === 'HEIRLOOM') {
      setAppliedDiscountRate(0.15)
      setCouponMessage({ type: 'success', text: '15% Royal Heirloom Privilege applied!' })
    } else {
      setCouponMessage({ type: 'error', text: 'Invalid coupon code. Try AURA10.' })
    }
  }

  const handleRemoveCoupon = () => {
    setAppliedDiscountRate(0)
    setCouponCode('')
    setCouponMessage(null)
  }

  // Strict Field Validation
  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      newErrors.name = 'Please provide your full legal name.'
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formData.email.trim() || !emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please provide a valid email address.'
    }

    const phoneClean = formData.phone.replace(/[^0-9]/g, '')
    if (phoneClean.length < 10) {
      newErrors.phone = 'Please provide a valid 10-digit mobile contact number.'
    }

    if (!formData.address.trim() || formData.address.trim().length < 5) {
      newErrors.address = 'Please specify your street address or building details.'
    }

    if (!formData.city.trim() || formData.city.trim().length < 2) {
      newErrors.city = 'Please specify your delivery city.'
    }

    if (!formData.state.trim()) {
      newErrors.state = 'Please select a delivery state.'
    }

    const pinClean = formData.pinCode.replace(/[^0-9]/g, '')
    if (pinClean.length < 6) {
      newErrors.pinCode = 'Please enter a valid 6-digit postal PIN code.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Proceed from Step 1 to Step 2 with validation & live stock/pricing check
  const handleProceedToReview = async (e) => {
    e.preventDefault()
    setErrorMessage('')

    if (!validateForm()) {
      setErrorMessage('Please complete all required delivery fields highlighted in red.')
      return
    }

    if (!cart || cart.length === 0) {
      setErrorMessage('Your shopping bag is empty. Please add an ensemble before checking out.')
      return
    }

    // Verify products and prices against database
    setIsProcessing(true)
    try {
      const check = await validateAndCalculateCartTotal(cart)
      if (!check.isValid && check.errors.length > 0) {
        setErrorMessage(check.errors.join(' '))
        setIsProcessing(false)
        return
      }
      setStep(2)
    } catch (err) {
      console.warn('Cart verification exception:', err)
      setStep(2)
    } finally {
      setIsProcessing(false)
    }
  }

  // Build structured shipping address object
  const getShippingPayload = () => ({
    address: formData.address.trim(),
    apartment: formData.apartment.trim() || null,
    city: formData.city.trim(),
    state: formData.state.trim(),
    pinCode: formData.pinCode.trim(),
    country: 'India',
  })

  // Format full address for presentation
  const formattedAddressString = `${formData.address}${
    formData.apartment ? `, ${formData.apartment}` : ''
  }, ${formData.city}, ${formData.state} — ${formData.pinCode}`

  // Payment Success Handler: Server-side cryptographic signature verification
  const handlePaymentSuccess = async (paymentResult) => {
    setIsProcessing(true)
    setErrorMessage('')

    try {
      // Phase 3: Cryptographic verification on server
      const verificationResult = await verifyRazorpayPaymentOnServer({
        razorpay_order_id: paymentResult.razorpay_order_id,
        razorpay_payment_id: paymentResult.razorpay_payment_id,
        razorpay_signature: paymentResult.razorpay_signature,
        order_number: paymentResult.order_number,
        guestToken: activeGuestTokenRef.current || null,
      })

      if (!verificationResult?.success || !verificationResult.order) {
        throw new Error(verificationResult?.error || 'Payment signature verification failed.')
      }

      setCompletedOrder({
        ...verificationResult.order,
        items: [...cart],
        shippingAddress: getShippingPayload(),
        discountAmount,
      })

      // Empty shopping bag upon confirmed order
      clearCart()
      setStep(3)
    } catch (err) {
      console.error('Order verification error:', err)
      setErrorMessage(
        err.message || 'Payment was authorized, but cryptographic verification failed. Our concierge will contact you.'
      )
    } finally {
      setIsProcessing(false)
    }
  }

  // Launch official Razorpay standard payment with server-side order registration
  const handlePayWithRazorpay = async () => {
    setIsProcessing(true)
    setErrorMessage('')

    try {
      // Phase 2: Create authoritative Razorpay order on server
      const serverOrder = await createRazorpayServerOrder({
        cartItems: cart,
        customer: {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
        },
        shippingAddress: getShippingPayload(),
        couponCode,
        userId: user?.id || null,
      })

      if (!serverOrder?.success || !serverOrder.razorpayOrderId) {
        throw new Error(serverOrder?.error || 'Failed to initialize secure checkout order.')
      }

      activeGuestTokenRef.current = serverOrder.guestToken || null

      await launchRazorpayModal({
        amount: serverOrder.amount,
        orderNumber: serverOrder.orderNumber,
        razorpayOrderId: serverOrder.razorpayOrderId,
        keyId: serverOrder.keyId,
        customer: {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
        },
        onSuccess: (paymentResult) => {
          handlePaymentSuccess(paymentResult)
        },
        onFailure: (error) => {
          setIsProcessing(false)
          setErrorMessage(
            error?.description || 'Payment was declined or cancelled. You may retry or select Cash on Delivery.'
          )
        },
        onDismiss: () => {
          setIsProcessing(false)
        },
      })
    } catch (err) {
      console.error('Server order initiation error:', err)
      setIsProcessing(false)
      setErrorMessage(err.message || 'Unable to start checkout. Please try again or choose Cash on Delivery.')
    }
  }

  // Handle Cash on Delivery placement (Phase 5: server-validated, without calling Razorpay)
  const handleCashOnDelivery = async () => {
    setIsProcessing(true)
    setErrorMessage('')

    try {
      const codResult = await createCashOnDeliveryServerOrder({
        cartItems: cart,
        customer: {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
        },
        shippingAddress: getShippingPayload(),
        couponCode,
        userId: user?.id || null,
      })

      if (!codResult?.success || !codResult.order) {
        throw new Error(codResult?.error || 'Could not record Cash on Delivery order.')
      }

      setCompletedOrder({
        ...codResult.order,
        items: [...cart],
        shippingAddress: getShippingPayload(),
        discountAmount,
      })

      clearCart()
      setStep(3)
    } catch (err) {
      console.error('COD Order placement exception:', err)
      setErrorMessage(err.message || 'Could not record Cash on Delivery order. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePrintReceipt = () => {
    window.print()
  }

  const handleFinish = () => {
    onClose?.()
    if (onNavigateToHome) onNavigateToHome()
  }

  const handleViewOrders = () => {
    onClose?.()
    if (onNavigateToOrders) {
      onNavigateToOrders()
    } else if (typeof window !== 'undefined') {
      window.location.hash = 'orders'
    }
  }

  return (
    <div
      className={styles.overlay}
      onClick={step === 3 ? undefined : handleModalClose}
      role="dialog"
      aria-modal="true"
      aria-label="AURA Luxury Checkout"
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.eyebrow}>AURA ATELIER • BESPOKE TRANSACTIONS</span>
            <h2 className={styles.title}>
              {step === 3 ? 'Order Confirmed' : step === 2 ? 'Review & Payment' : 'Bespoke Checkout'}
            </h2>
          </div>
          {step !== 3 && (
            <button
              type="button"
              className={styles.closeBtn}
              onClick={handleModalClose}
              aria-label="Close checkout modal"
            >
              ✕
            </button>
          )}
        </header>

        {/* Steps Progress Indicator (Checklist Design Principle) */}
        <nav className={styles.stepsBar} aria-label="Checkout Progress">
          <div
            className={`${styles.stepIndicator} ${
              step === 1 ? styles.stepIndicatorActive : step > 1 ? styles.stepIndicatorCompleted : ''
            }`}
          >
            <span className={styles.stepCircle}>{step > 1 ? '✓' : '1'}</span>
            <span>1. Details &amp; Shipping</span>
          </div>

          <div
            className={`${styles.stepIndicator} ${
              step === 2 ? styles.stepIndicatorActive : step > 2 ? styles.stepIndicatorCompleted : ''
            }`}
          >
            <span className={styles.stepCircle}>{step > 2 ? '✓' : '2'}</span>
            <span>2. Payment Selection</span>
          </div>

          <div
            className={`${styles.stepIndicator} ${
              step === 3 ? styles.stepIndicatorActive : ''
            }`}
          >
            <span className={styles.stepCircle}>3</span>
            <span>3. Order Confirmation</span>
          </div>
        </nav>

        {/* Modal Body */}
        <div className={styles.body}>
          {errorMessage && (
            <div
              style={{
                background: 'rgba(229, 115, 115, 0.16)',
                border: '1px solid #E57373',
                color: '#FFCDD2',
                padding: '12px 18px',
                borderRadius: '6px',
                marginBottom: '20px',
                fontSize: '12.5px',
                lineHeight: 1.5,
              }}
              role="alert"
            >
              ⚠ {errorMessage}
            </div>
          )}

          {/* STEP 1: Customer Information & Delivery Address Form */}
          {step === 1 && (
            <div className={styles.checkoutGrid}>
              <form className={styles.formSection} onSubmit={handleProceedToReview} noValidate>
                <h3 className={styles.sectionHeading}>Client &amp; Delivery Destination</h3>

                {/* Recipient Name */}
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="checkout-name">
                    <span>Full Legal Name *</span>
                  </label>
                  <input
                    id="checkout-name"
                    type="text"
                    name="name"
                    autoComplete="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g. Radhika Verma"
                    className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                    required
                  />
                  {errors.name && <span className={styles.fieldError}>{errors.name}</span>}
                </div>

                {/* Email and Phone */}
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="checkout-email">
                      <span>Email Address *</span>
                    </label>
                    <input
                      id="checkout-email"
                      type="email"
                      name="email"
                      autoComplete="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="client@aura.com"
                      className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                      required
                    />
                    {errors.email && <span className={styles.fieldError}>{errors.email}</span>}
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="checkout-phone">
                      <span>Mobile Number *</span>
                    </label>
                    <input
                      id="checkout-phone"
                      type="tel"
                      name="phone"
                      autoComplete="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="9876543210"
                      className={`${styles.input} ${errors.phone ? styles.inputError : ''}`}
                      required
                    />
                    {errors.phone && <span className={styles.fieldError}>{errors.phone}</span>}
                  </div>
                </div>

                {/* Street Address */}
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="checkout-address">
                    <span>Street Address *</span>
                  </label>
                  <input
                    id="checkout-address"
                    type="text"
                    name="address"
                    autoComplete="street-address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="House / Building No., Street, Colony"
                    className={`${styles.input} ${errors.address ? styles.inputError : ''}`}
                    required
                  />
                  {errors.address && <span className={styles.fieldError}>{errors.address}</span>}
                </div>

                {/* Apartment / Landmark (Optional) */}
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="checkout-apartment">
                    <span>Apartment, Suite, Floor or Landmark (Optional)</span>
                  </label>
                  <input
                    id="checkout-apartment"
                    type="text"
                    name="apartment"
                    value={formData.apartment}
                    onChange={handleInputChange}
                    placeholder="e.g. Tower 4, Apt 12B, Near Heritage Palace"
                    className={styles.input}
                  />
                </div>

                {/* City and State */}
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="checkout-city">
                      <span>City *</span>
                    </label>
                    <input
                      id="checkout-city"
                      type="text"
                      name="city"
                      autoComplete="address-level2"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="Mumbai / Bengaluru / Varanasi"
                      className={`${styles.input} ${errors.city ? styles.inputError : ''}`}
                      required
                    />
                    {errors.city && <span className={styles.fieldError}>{errors.city}</span>}
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="checkout-state">
                      <span>State *</span>
                    </label>
                    <select
                      id="checkout-state"
                      name="state"
                      autoComplete="address-level1"
                      value={formData.state}
                      onChange={handleInputChange}
                      className={styles.select}
                    >
                      {INDIAN_STATES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Postal PIN Code */}
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="checkout-pincode">
                    <span>Postal PIN Code *</span>
                  </label>
                  <input
                    id="checkout-pincode"
                    type="text"
                    name="pinCode"
                    autoComplete="postal-code"
                    value={formData.pinCode}
                    onChange={handleInputChange}
                    placeholder="400001"
                    maxLength={6}
                    className={`${styles.input} ${errors.pinCode ? styles.inputError : ''}`}
                    required
                  />
                  {errors.pinCode && <span className={styles.fieldError}>{errors.pinCode}</span>}
                </div>

                {/* Transit Note */}
                <div className={styles.deliveryNote}>
                  <span style={{ color: 'var(--gold)' }}>✦</span>
                  <span>
                    <strong>Complimentary Insured Courier:</strong> Ensembles are packed in silk-protective boxes with tamper-evident seal and live tracking.
                  </span>
                </div>

                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={isProcessing}
                >
                  <span>{isProcessing ? 'Verifying Ensembles...' : 'Continue to Payment Review'}</span>
                  <span aria-hidden="true">→</span>
                </button>
              </form>

              {/* Order Sidebar Summary */}
              <aside className={styles.sidebarSummary}>
                <h4 className={styles.summaryTitle}>Shopping Bag ({cart.length})</h4>
                <div className={styles.itemsMiniList}>
                  {cart.map((item) => (
                    <div key={item.id} className={styles.miniItem}>
                      <img
                        src={item.image || '/images/products/royal-maroon.jpg'}
                        alt={item.name}
                        className={styles.miniThumb}
                        onError={(e) => {
                          e.currentTarget.onerror = null
                          e.currentTarget.src = '/images/products/royal-maroon.jpg'
                        }}
                      />
                      <div className={styles.miniDetails}>
                        <h5 className={styles.miniName}>{item.name}</h5>
                        <span className={styles.miniMeta}>
                          Qty: {item.quantity} • {item.variant || 'Standard'}
                        </span>
                        {item.fabric && (
                          <span className={styles.miniMeta} style={{ opacity: 0.7 }}>
                            {item.fabric}
                          </span>
                        )}
                      </div>
                      <span className={styles.miniPrice}>
                        {formatPrice((item.price || 0) * (item.quantity || 1))}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Promotional Coupon Input */}
                <div className={styles.promoBlock}>
                  {appliedDiscountRate > 0 ? (
                    <div className={styles.promoAppliedTag}>
                      <span>✓ {couponCode} (Applied)</span>
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', fontSize: '11px' }}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        placeholder="VOUCHER (AURA10)"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className={styles.promoInput}
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        className={styles.promoBtn}
                      >
                        Apply
                      </button>
                    </>
                  )}
                </div>
                {couponMessage && (
                  <span
                    style={{
                      fontSize: '11px',
                      color: couponMessage.type === 'success' ? '#A5D6A7' : '#FFCDD2',
                    }}
                  >
                    {couponMessage.text}
                  </span>
                )}

                {/* Calculation Table */}
                <div className={styles.summaryCalc}>
                  <div className={styles.calcRow}>
                    <span>Items Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className={styles.calcRow} style={{ color: '#81C784' }}>
                      <span>Artisanal Privilege ({appliedDiscountRate * 100}%)</span>
                      <span>-{formatPrice(discountAmount)}</span>
                    </div>
                  )}
                  <div className={styles.calcRow}>
                    <span>Insured Transit</span>
                    <span style={{ color: 'var(--gold-light)' }}>FREE</span>
                  </div>
                  <div className={styles.calcRow}>
                    <span>GST &amp; Heritage Duty</span>
                    <span>Included</span>
                  </div>
                  <div className={styles.calcTotalRow}>
                    <span>Payable Total</span>
                    <span className={styles.calcTotalAmount}>{formatPrice(payableTotal)}</span>
                  </div>
                </div>
              </aside>
            </div>
          )}

          {/* STEP 2: Order Review & Payment Selection */}
          {step === 2 && (
            <div className={styles.checkoutGrid}>
              <div className={styles.formSection}>
                {/* Shipping Review Card */}
                <div className={styles.reviewAddressCard}>
                  <div>
                    <span className={styles.label}>Shipping Destination</span>
                    <p className={styles.addressText}>
                      <strong>{formData.name}</strong> • {formData.phone}
                      <br />
                      {formattedAddressString}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.editAddressBtn}
                    onClick={() => setStep(1)}
                  >
                    Edit Details
                  </button>
                </div>

                {/* Payment Option Selector */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setPaymentMethodChoice('online')}
                    style={{
                      padding: '14px 16px',
                      background:
                        paymentMethodChoice === 'online'
                          ? 'rgba(201, 168, 76, 0.16)'
                          : 'rgba(10, 46, 42, 0.35)',
                      border:
                        paymentMethodChoice === 'online'
                          ? '1px solid #C9A84C'
                          : '1px solid rgba(201, 168, 76, 0.2)',
                      borderRadius: '8px',
                      color: paymentMethodChoice === 'online' ? '#C9A84C' : '#c8c0b2',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ fontSize: '13.5px', fontWeight: 600 }}>💳 Online Payment</div>
                    <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '3px' }}>
                      UPI, Cards, NetBanking, EMI
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethodChoice('cod')}
                    style={{
                      padding: '14px 16px',
                      background:
                        paymentMethodChoice === 'cod'
                          ? 'rgba(201, 168, 76, 0.16)'
                          : 'rgba(10, 46, 42, 0.35)',
                      border:
                        paymentMethodChoice === 'cod'
                          ? '1px solid #C9A84C'
                          : '1px solid rgba(201, 168, 76, 0.2)',
                      borderRadius: '8px',
                      color: paymentMethodChoice === 'cod' ? '#C9A84C' : '#c8c0b2',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ fontSize: '13.5px', fontWeight: 600 }}>💵 Cash on Delivery</div>
                    <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '3px' }}>
                      Doorstep cash settlement
                    </div>
                  </button>
                </div>

                {/* Option Content: Online / Razorpay */}
                {paymentMethodChoice === 'online' ? (
                  <div className={styles.paymentBox}>
                    <div className={styles.paymentHeader}>
                      <div className={styles.razorpayBrand}>
                        <span>Razorpay Gateway</span>
                      </div>
                      <span className={styles.gatewayBadge}>256-BIT ENCRYPTED</span>
                    </div>

                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                      Encrypted checkout via UPI (Google Pay, PhonePe, Paytm), Credit &amp; Debit Cards (Visa, MasterCard, RuPay), NetBanking (50+ banks), or EMI.
                    </p>

                    <div className={styles.paymentMethodsSupported}>
                      <span className={styles.methodBadge}>UPI Apps</span>
                      <span className={styles.methodBadge}>All Major Cards</span>
                      <span className={styles.methodBadge}>NetBanking</span>
                      <span className={styles.methodBadge}>No Cost EMI</span>
                    </div>

                    <button
                      type="button"
                      className={styles.submitBtn}
                      onClick={handlePayWithRazorpay}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <span>Initiating Secure Gateway...</span>
                      ) : (
                        <>
                          <span>Authorize {formatPrice(payableTotal)}</span>
                          <span aria-hidden="true">→</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      className={styles.backBtn}
                      onClick={() => setStep(1)}
                      disabled={isProcessing}
                    >
                      ← Back to Delivery Details
                    </button>
                  </div>
                ) : (
                  <div className={styles.paymentBox}>
                    <div className={styles.paymentHeader}>
                      <div className={styles.razorpayBrand}>
                        <span>Cash on Delivery (Doorstep Settlement)</span>
                      </div>
                      <span className={styles.gatewayBadge} style={{ borderColor: '#f59e0b', color: '#f59e0b' }}>
                        PAY ON ARRIVAL
                      </span>
                    </div>

                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                      Settle payment with our courier executive upon inspection and receipt of your insured heirloom package.
                    </p>

                    <div
                      style={{
                        fontSize: '11.5px',
                        color: '#c8c0b2',
                        background: 'rgba(201, 168, 76, 0.08)',
                        padding: '12px 14px',
                        borderRadius: '6px',
                        border: '1px solid rgba(201, 168, 76, 0.2)',
                      }}
                    >
                      ✦ Payment status will be officially logged as <strong>Pending</strong> in Supabase until confirmed upon delivery.
                    </div>

                    <button
                      type="button"
                      className={styles.submitBtn}
                      onClick={handleCashOnDelivery}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <span>Confirming Order...</span>
                      ) : (
                        <>
                          <span>Confirm Order ({formatPrice(payableTotal)} COD)</span>
                          <span aria-hidden="true">→</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      className={styles.backBtn}
                      onClick={() => setStep(1)}
                      disabled={isProcessing}
                    >
                      ← Back to Delivery Details
                    </button>
                  </div>
                )}
              </div>

              {/* Order Sidebar */}
              <aside className={styles.sidebarSummary}>
                <h4 className={styles.summaryTitle}>Final Order Review</h4>
                <div className={styles.itemsMiniList}>
                  {cart.map((item) => (
                    <div key={item.id} className={styles.miniItem}>
                      <img
                        src={item.image || '/images/products/royal-maroon.jpg'}
                        alt={item.name}
                        className={styles.miniThumb}
                        onError={(e) => {
                          e.currentTarget.onerror = null
                          e.currentTarget.src = '/images/products/royal-maroon.jpg'
                        }}
                      />
                      <div className={styles.miniDetails}>
                        <h5 className={styles.miniName}>{item.name}</h5>
                        <span className={styles.miniMeta}>
                          Qty: {item.quantity} • {item.variant}
                        </span>
                      </div>
                      <span className={styles.miniPrice}>
                        {formatPrice((item.price || 0) * (item.quantity || 1))}
                      </span>
                    </div>
                  ))}
                </div>

                <div className={styles.summaryCalc}>
                  <div className={styles.calcRow}>
                    <span>Items Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className={styles.calcRow} style={{ color: '#81C784' }}>
                      <span>Privilege Discount</span>
                      <span>-{formatPrice(discountAmount)}</span>
                    </div>
                  )}
                  <div className={styles.calcRow}>
                    <span>Insured Transit</span>
                    <span style={{ color: 'var(--gold-light)' }}>FREE</span>
                  </div>
                  <div className={styles.calcTotalRow}>
                    <span>Grand Total</span>
                    <span className={styles.calcTotalAmount}>{formatPrice(payableTotal)}</span>
                  </div>
                </div>
              </aside>
            </div>
          )}

          {/* STEP 3: Order Confirmation & Receipt */}
          {step === 3 && completedOrder && (
            <div className={styles.confirmationContainer}>
              <div className={styles.checkGlow}>✓</div>
              <h3 className={styles.confirmTitle}>Heirloom Order Confirmed</h3>
              <p className={styles.confirmSubtitle}>
                Your handcrafted ensembles have been reserved. Confirmation dispatched to{' '}
                <strong>{completedOrder.customer_email}</strong>.
              </p>

              <div className={styles.receiptCard}>
                <div className={styles.receiptRow}>
                  <span>Order Reference</span>
                  <span className={styles.receiptHighlight}>{completedOrder.order_number}</span>
                </div>

                <div className={styles.receiptRow}>
                  <span>Transaction Reference</span>
                  <span style={{ fontFamily: 'monospace', color: '#F8F5EE' }}>
                    {completedOrder.payment_id}
                  </span>
                </div>

                <div className={styles.receiptRow}>
                  <span>Payment Method</span>
                  <span>{completedOrder.payment_method || 'Razorpay'}</span>
                </div>

                <div className={styles.receiptRow}>
                  <span>Payment Status</span>
                  <span
                    style={{
                      color: completedOrder.payment_status === 'paid' ? '#81C784' : '#f59e0b',
                      fontWeight: 600,
                    }}
                  >
                    {completedOrder.payment_status === 'paid'
                      ? 'Payment Received (Paid ✓)'
                      : 'Pending (Cash on Delivery)'}
                  </span>
                </div>

                <div className={styles.receiptRow}>
                  <span>Order Status</span>
                  <span style={{ color: 'var(--gold-light)', fontWeight: 600 }}>
                    {completedOrder.order_status || 'Pending'}
                  </span>
                </div>

                <div className={styles.receiptRow}>
                  <span>Recipient</span>
                  <span>
                    {completedOrder.customer_name} ({completedOrder.customer_phone})
                  </span>
                </div>

                <div className={styles.receiptRow}>
                  <span>Delivery Address</span>
                  <span style={{ textAlign: 'right', maxWidth: '320px' }}>
                    {completedOrder.shippingAddress?.address}
                    {completedOrder.shippingAddress?.apartment ? `, ${completedOrder.shippingAddress.apartment}` : ''}
                    , {completedOrder.shippingAddress?.city}, {completedOrder.shippingAddress?.state} —{' '}
                    {completedOrder.shippingAddress?.pinCode}
                  </span>
                </div>

                <div style={{ borderTop: '1px solid rgba(201, 168, 76, 0.2)', paddingTop: '14px' }}>
                  <span className={styles.label}>Purchased Ensembles:</span>
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {completedOrder.items?.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '13px',
                        }}
                      >
                        <span style={{ color: '#F8F5EE' }}>
                          {item.name} × {item.quantity}
                          {item.variant && (
                            <span style={{ fontSize: '11px', opacity: 0.7, marginLeft: '6px' }}>
                              ({item.variant})
                            </span>
                          )}
                        </span>
                        <span style={{ color: 'var(--gold-light)', fontWeight: 600 }}>
                          {formatPrice((item.price || 0) * (item.quantity || 1))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  className={styles.receiptRow}
                  style={{ borderTop: '1px solid rgba(201, 168, 76, 0.3)', paddingTop: '14px' }}
                >
                  <span style={{ fontSize: '15px', color: '#F8F5EE', fontWeight: 600 }}>
                    {completedOrder.payment_status === 'paid' ? 'Total Paid' : 'Total Payable on Arrival'}
                  </span>
                  <span className={styles.calcTotalAmount}>{formatPrice(completedOrder.total_amount)}</span>
                </div>
              </div>

              <div className={styles.confirmActions}>
                {user && (
                  <button
                    type="button"
                    className={styles.ordersBtn}
                    onClick={handleViewOrders}
                  >
                    View in My Orders →
                  </button>
                )}
                {onOpenReview && (
                  <button
                    type="button"
                    className={styles.reviewBtn}
                    onClick={() => {
                      onOpenReview(completedOrder.items?.[0] || null)
                    }}
                  >
                    ★ Share Your Experience
                  </button>
                )}
                <button
                  type="button"
                  className={styles.printBtn}
                  onClick={handlePrintReceipt}
                >
                  Print / Save Receipt
                </button>
                <button
                  type="button"
                  className={styles.continueBtn}
                  onClick={handleFinish}
                >
                  Continue Shopping →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
