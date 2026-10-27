import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { PRODUCTS } from '../../data/products'
import { submitCustomerReview } from '../../lib/reviews/reviewService'
import styles from './ReviewModal.module.css'

export default function ReviewModal({
  isOpen,
  onClose,
  preselectedProduct = null,
  isVerified = false,
  onReviewSubmitted,
}) {
  const { user, profile } = useAuth()

  const [productId, setProductId] = useState('')
  const [productName, setProductName] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Sync user and preselected product
  useEffect(() => {
    if (!isOpen) {
      setIsSuccess(false)
      setErrorMessage('')
      return
    }

    // Set user info
    const initialName =
      profile?.name ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      ''
    const initialEmail = user?.email || ''
    setCustomerName(initialName)
    setCustomerEmail(initialEmail)

    // Set product info
    if (preselectedProduct) {
      setProductId(preselectedProduct.id || '')
      setProductName(preselectedProduct.name || '')
    } else if (PRODUCTS.length > 0) {
      setProductId(PRODUCTS[0].id)
      setProductName(PRODUCTS[0].name)
    }
    setRating(5)
    setComment('')
  }, [isOpen, preselectedProduct, user, profile])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleProductSelect = (e) => {
    const pId = e.target.value
    setProductId(pId)
    const found = PRODUCTS.find((p) => p.id === pId)
    setProductName(found ? found.name : 'AURA Couture Ensemble')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')

    if (!customerName.trim()) {
      setErrorMessage('Please provide your name.')
      return
    }
    if (!comment.trim() || comment.trim().length < 10) {
      setErrorMessage('Please share a few words about your experience (at least 10 characters).')
      return
    }

    setIsSubmitting(true)

    try {
      const res = await submitCustomerReview({
        userId: user?.id || null,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        avatarUrl: profile?.avatar_url || user?.user_metadata?.avatar_url || '',
        productId: productId || 'general',
        productName: productName || 'AURA Couture Ensemble',
        rating,
        comment: comment.trim(),
        isVerifiedPurchase: Boolean(isVerified || user?.id),
      })

      if (res.success) {
        setIsSuccess(true)
        onReviewSubmitted?.(res.data)
      } else {
        setErrorMessage('Unable to submit your review. Please try again.')
      }
    } catch (err) {
      console.error('Error submitting review:', err)
      setErrorMessage('A momentary connection issue occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
    >
      <div className={styles.modal}>
        {/* Close Button */}
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close review dialog"
        >
          ✕
        </button>

        {isSuccess ? (
          <div className={styles.successState}>
            <div className={styles.successGlow}>✦</div>
            <h3 className={styles.successTitle}>Review Received with Gratitude</h3>
            <p className={styles.successDesc}>
              Thank you, <strong>{customerName}</strong>. Your thoughtful reflection honours our master weavers and the AURA atelier.
            </p>
            <p className={styles.successNotice}>
              Your review has been submitted for editorial curation and will appear on the boutique showcase shortly.
            </p>
            <button
              type="button"
              className={styles.doneBtn}
              onClick={onClose}
            >
              Return to Boutique
            </button>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.header}>
              <span className={styles.kicker}>PATRON TESTIMONIAL</span>
              <h2 id="review-modal-title" className={styles.title}>
                Share Your AURA Experience
              </h2>
              <p className={styles.subtitle}>
                Reflect on the silhouette, the drape, and the weave of your ensemble.
              </p>
            </div>

            {errorMessage && (
              <div className={styles.errorAlert} role="alert">
                {errorMessage}
              </div>
            )}

            {/* Star Rating Selection */}
            <div className={styles.ratingGroup}>
              <label className={styles.label}>Your Rating</label>
              <div
                className={styles.starRow}
                onMouseLeave={() => setHoverRating(0)}
              >
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = (hoverRating || rating) >= star
                  return (
                    <button
                      type="button"
                      key={star}
                      className={`${styles.starBtn} ${isFilled ? styles.starFilled : ''}`}
                      onMouseEnter={() => setHoverRating(star)}
                      onClick={() => setRating(star)}
                      aria-label={`${star} star${star > 1 ? 's' : ''}`}
                    >
                      ★
                    </button>
                  )
                })}
                <span className={styles.ratingLabel}>
                  {rating === 5
                    ? 'Exceptional Heirloom (5 / 5)'
                    : rating === 4
                    ? 'Remarkable Drape (4 / 5)'
                    : rating === 3
                    ? 'Good Quality (3 / 5)'
                    : rating === 2
                    ? 'Fair (2 / 5)'
                    : 'Needs Improvement (1 / 5)'}
                </span>
              </div>
            </div>

            {/* Product Selection */}
            <div className={styles.fieldGroup}>
              <label htmlFor="review-product" className={styles.label}>
                Ensemble / Product
              </label>
              {preselectedProduct ? (
                <div className={styles.lockedProduct}>
                  <span>{productName}</span>
                  <span className={styles.verifiedTag}>Verified Piece</span>
                </div>
              ) : (
                <select
                  id="review-product"
                  className={styles.select}
                  value={productId}
                  onChange={handleProductSelect}
                >
                  {PRODUCTS.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.name} ({prod.category})
                    </option>
                  ))}
                  <option value="general">General Atelier Experience</option>
                </select>
              )}
            </div>

            {/* Review Comment */}
            <div className={styles.fieldGroup}>
              <div className={styles.labelRow}>
                <label htmlFor="review-comment" className={styles.label}>
                  Your Experience & Drape Reflections
                </label>
                <span className={styles.charHint}>{comment.length} characters</span>
              </div>
              <textarea
                id="review-comment"
                className={styles.textarea}
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Describe how the fabric drapes, the texture of the zari, the richness under ambient light, and how it made you feel..."
                required
              />
            </div>

            {/* Patron Name & Email */}
            <div className={styles.row}>
              <div className={styles.fieldGroup}>
                <label htmlFor="review-name" className={styles.label}>
                  Your Name
                </label>
                <input
                  id="review-name"
                  type="text"
                  className={styles.input}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Radhika Sharma"
                  required
                />
              </div>

              <div className={styles.fieldGroup}>
                <label htmlFor="review-email" className={styles.label}>
                  Email (optional, confidential)
                </label>
                <input
                  id="review-email"
                  type="email"
                  className={styles.input}
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="name@domain.com"
                />
              </div>
            </div>

            {/* Submit Action */}
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting Reflections...' : 'Submit Review ✦'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
