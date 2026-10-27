import { useState, useEffect, useCallback } from 'react'
import {
  fetchAdminReviews,
  updateReviewStatus,
  toggleReviewFeatured,
  deleteReview,
  submitCustomerReview,
} from '../../lib/reviews/reviewService'
import styles from './ReviewsManager.module.css'

export default function ReviewsManager() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all') // 'all' | 'pending' | 'approved' | 'rejected' | 'featured'
  const [alert, setAlert] = useState(null)
  const [actionInProgress, setActionInProgress] = useState(null)

  const showAlert = useCallback((text, type = 'success') => {
    setAlert({ text, type })
    setTimeout(() => setAlert(null), 3500)
  }, [])

  const loadReviews = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchAdminReviews()
      setReviews(data || [])
    } catch (err) {
      console.error('Error loading admin reviews:', err)
      showAlert('Failed to load reviews.', 'error')
    } finally {
      setLoading(false)
    }
  }, [showAlert])

  useEffect(() => {
    loadReviews()
  }, [loadReviews])

  // Status update handler
  const handleStatusChange = async (id, newStatus) => {
    try {
      setActionInProgress(id)
      await updateReviewStatus(id, newStatus)
      showAlert(`Review updated to "${newStatus}".`)
      await loadReviews()
    } catch (err) {
      console.error('Error changing review status:', err)
      showAlert('Failed to update review status.', 'error')
    } finally {
      setActionInProgress(null)
    }
  }

  // Toggle featured handler
  const handleToggleFeatured = async (id, currentFeatured) => {
    try {
      setActionInProgress(id)
      await toggleReviewFeatured(id, !currentFeatured)
      showAlert(
        !currentFeatured
          ? 'Review is now Featured in Section 6!'
          : 'Review removed from Section 6 showcase.'
      )
      await loadReviews()
    } catch (err) {
      console.error('Error toggling featured review:', err)
      showAlert('Failed to toggle featured status.', 'error')
    } finally {
      setActionInProgress(null)
    }
  }

  // Delete review handler
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this review?')) {
      return
    }

    try {
      setActionInProgress(id)
      await deleteReview(id)
      showAlert('Review deleted successfully.')
      await loadReviews()
    } catch (err) {
      console.error('Error deleting review:', err)
      showAlert('Failed to delete review.', 'error')
    } finally {
      setActionInProgress(null)
    }
  }

  // Seed sample reviews for testing
  const handleSeedSamples = async () => {
    setLoading(true)
    const sampleSeeds = [
      {
        customerName: 'Meera Deshmukh',
        productName: 'Royal Maroon Silk Saree',
        rating: 5,
        comment:
          'The zari work on the pallu possesses a mesmerizing antique sheen. Draped it for my sister’s Sangeet in Udaipur, and the compliments haven’t stopped since.',
        isVerifiedPurchase: true,
      },
      {
        customerName: 'Ananya Singhania',
        productName: 'Peacock Blue Saree',
        rating: 5,
        comment:
          'Light as a breeze yet carries an unmistakable royal heft. The pit-loom craftsmanship is evident in every thread. Truly an heirloom investment.',
        isVerifiedPurchase: true,
      },
      {
        customerName: 'Kavita Chawla',
        productName: 'Blush Organza Saree',
        rating: 5,
        comment:
          'The hand mukaish detailing catches evening candlelight like scattered stardust. Soft, opulent, and draped with unmatched poise.',
        isVerifiedPurchase: true,
      },
      {
        customerName: 'Dr. Shalini Varma',
        productName: 'Emerald Green Katan Silk',
        rating: 5,
        comment:
          'From the packaging to the silk seal, AURA delivers unmatched luxury couture. The drape fell effortlessly into royal pleats.',
        isVerifiedPurchase: true,
      },
    ]

    try {
      for (const sample of sampleSeeds) {
        const res = await submitCustomerReview({
          ...sample,
          productId: 'seed',
        })
        if (res.data?.id) {
          // Auto approve and feature sample reviews
          await updateReviewStatus(res.data.id, 'approved')
          await toggleReviewFeatured(res.data.id, true)
        }
      }
      showAlert('Sample patron reviews curated and featured!')
      await loadReviews()
    } catch (err) {
      console.error('Error seeding reviews:', err)
      showAlert('Failed to seed sample reviews.', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Filter reviews
  const filteredReviews = reviews.filter((r) => {
    if (filterStatus === 'all') return true
    if (filterStatus === 'featured') return r.is_featured === true
    return r.status === filterStatus
  })

  // Quick stats counts
  const totalCount = reviews.length
  const pendingCount = reviews.filter((r) => r.status === 'pending').length
  const approvedCount = reviews.filter((r) => r.status === 'approved').length
  const featuredCount = reviews.filter((r) => r.is_featured === true).length

  return (
    <div className={styles.manager}>
      {/* Alert toast */}
      {alert && (
        <div
          className={`${styles.alert} ${
            alert.type === 'error' ? styles.alertError : styles.alertSuccess
          }`}
        >
          <span>✦</span>
          <span>{alert.text}</span>
        </div>
      )}

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Patron Reviews & Curation</h2>
          <p className={styles.subtitle}>
            Moderate customer reflections and select featured reviews for Section 6.
          </p>
        </div>

        <div className={styles.headerActions}>
          {reviews.length === 0 && (
            <button
              type="button"
              className={styles.seedBtn}
              onClick={handleSeedSamples}
              disabled={loading}
            >
              Seed Sample Reviews ✦
            </button>
          )}
          <button
            type="button"
            className={styles.refreshBtn}
            onClick={loadReviews}
            disabled={loading}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Quick Metrics */}
      <div className={styles.metricsRow}>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Total Submissions</span>
          <span className={styles.metricValue}>{totalCount}</span>
        </div>
        <div className={`${styles.metricCard} ${pendingCount > 0 ? styles.metricAlert : ''}`}>
          <span className={styles.metricLabel}>Pending Curation</span>
          <span className={styles.metricValue}>{pendingCount}</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Approved</span>
          <span className={styles.metricValue}>{approvedCount}</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Featured in Section 6</span>
          <span className={styles.metricValue}>{featuredCount}</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className={styles.tabsRow}>
        {[
          { id: 'all', label: `All (${totalCount})` },
          { id: 'pending', label: `Pending (${pendingCount})` },
          { id: 'approved', label: `Approved (${approvedCount})` },
          { id: 'featured', label: `Featured in S6 (${featuredCount})` },
          {
            id: 'rejected',
            label: `Rejected (${reviews.filter((r) => r.status === 'rejected').length})`,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`${styles.tabBtn} ${filterStatus === tab.id ? styles.tabActive : ''}`}
            onClick={() => setFilterStatus(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className={styles.loadingBox}>
          <div className={styles.spinner} />
          <span>Loading patron testimonials...</span>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className={styles.emptyBox}>
          <p>No reviews found matching current filter.</p>
        </div>
      ) : (
        <div className={styles.reviewsGrid}>
          {filteredReviews.map((rev) => {
            const isBusy = actionInProgress === rev.id
            return (
              <div
                key={rev.id}
                className={`${styles.reviewCard} ${
                  rev.is_featured ? styles.featuredCard : ''
                }`}
              >
                {/* Header: Patron info & Status */}
                <div className={styles.cardTop}>
                  <div className={styles.patronInfo}>
                    <h3 className={styles.patronName}>{rev.customer_name}</h3>
                    {rev.customer_email && (
                      <span className={styles.patronEmail}>{rev.customer_email}</span>
                    )}
                  </div>

                  <div className={styles.badges}>
                    <span
                      className={`${styles.statusBadge} ${
                        styles[`status_${rev.status}`]
                      }`}
                    >
                      {rev.status.toUpperCase()}
                    </span>
                    {rev.is_featured && (
                      <span className={styles.featuredBadge}>FEATURED S6 ★</span>
                    )}
                  </div>
                </div>

                {/* Rating & Product */}
                <div className={styles.productRow}>
                  <span className={styles.stars}>
                    {'★'.repeat(rev.rating)}
                    {'☆'.repeat(5 - rev.rating)}
                  </span>
                  <span className={styles.productName}>
                    {rev.product_name}
                    {rev.is_verified_purchase && (
                      <span className={styles.verifiedTag}>Verified</span>
                    )}
                  </span>
                </div>

                {/* Comment */}
                <p className={styles.commentText}>"{rev.comment}"</p>

                {/* Date */}
                <div className={styles.dateRow}>
                  <span>
                    Submitted:{' '}
                    {new Date(rev.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                {/* Action Bar */}
                <div className={styles.actionsBar}>
                  {rev.status !== 'approved' && (
                    <button
                      type="button"
                      className={styles.approveBtn}
                      onClick={() => handleStatusChange(rev.id, 'approved')}
                      disabled={isBusy}
                    >
                      Approve ✓
                    </button>
                  )}

                  {rev.status !== 'rejected' && (
                    <button
                      type="button"
                      className={styles.rejectBtn}
                      onClick={() => handleStatusChange(rev.id, 'rejected')}
                      disabled={isBusy}
                    >
                      Reject ✕
                    </button>
                  )}

                  {rev.status === 'approved' && (
                    <button
                      type="button"
                      className={`${styles.featureBtn} ${
                        rev.is_featured ? styles.featureBtnActive : ''
                      }`}
                      onClick={() => handleToggleFeatured(rev.id, rev.is_featured)}
                      disabled={isBusy}
                    >
                      {rev.is_featured ? 'Unfeature from S6' : 'Feature in S6 ★'}
                    </button>
                  )}

                  <button
                    type="button"
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(rev.id)}
                    disabled={isBusy}
                    title="Delete review"
                  >
                    🗑
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
