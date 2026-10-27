import { useEffect, useState } from 'react'
import { useCart, formatPrice } from '../../context/CartContext'
import styles from './CartDrawer.module.css'

export default function CartDrawer({
  isOpen,
  onClose,
  onNavigateToShop,
  onProceedToCheckout,
}) {
  const {
    cart,
    totalCount,
    subtotal,
    formattedSubtotal,
    updateQuantity,
    removeFromCart,
  } = useCart()

  // Handle ESC key and lock body scroll
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }

    window.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleCheckoutClick = () => {
    onProceedToCheckout?.()
  }

  const handleContinueShopping = () => {
    onClose?.()
    if (onNavigateToShop) {
      onNavigateToShop()
    }
  }

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Bag"
    >
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.eyebrow}>AURA Atelier</span>
            <div className={styles.titleRow}>
              <h2 className={styles.title}>Shopping Bag</h2>
              <span className={styles.itemCountBadge}>
                {totalCount} {totalCount === 1 ? 'item' : 'items'}
              </span>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close shopping bag"
          >
            ✕
          </button>
        </header>

        {/* Drawer Body */}
        {cart.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIconWrap}>
              <BagEmptyIcon />
            </div>
            <h3 className={styles.emptyTitle}>Your Bag Is Empty</h3>
            <p className={styles.emptyText}>
              Discover our handcrafted pure silk sarees and bespoke bridal lehengas woven with generational Indian artistry.
            </p>
            <button
              type="button"
              className={styles.shopBtn}
              onClick={handleContinueShopping}
            >
              <span>Explore Collection</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        ) : (
          <>
            <div className={styles.itemsList}>
              {cart.map((item) => {
                const itemLineTotal = (item.price || 0) * (item.quantity || 1)
                const isDecreasable = item.quantity > 1

                return (
                  <article key={item.id} className={styles.cartItem}>
                    {/* Thumbnail Image */}
                    <div className={styles.imageWrap}>
                      <img
                        src={item.image || '/images/products/royal-maroon.jpg'}
                        alt={item.name}
                        className={styles.image}
                        loading="lazy"
                        draggable={false}
                        onError={(e) => {
                          e.currentTarget.onerror = null
                          e.currentTarget.src = '/images/products/royal-maroon.jpg'
                        }}
                      />
                    </div>

                    {/* Details Column */}
                    <div className={styles.itemInfo}>
                      <div className={styles.itemTop}>
                        <div>
                          <h4 className={styles.itemName}>{item.name}</h4>
                          <p className={styles.itemMeta}>
                            {item.fabric} {item.color ? `• ${item.color}` : ''}
                          </p>
                          {item.variant && (
                            <span className={styles.itemVariant}>{item.variant}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          className={styles.removeBtn}
                          onClick={() => removeFromCart(item.id)}
                          aria-label={`Remove ${item.name} from bag`}
                          title="Remove item"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Bottom row: Quantity buttons and Line Subtotal */}
                      <div className={styles.itemBottom}>
                        <div className={styles.quantityControl}>
                          <button
                            type="button"
                            className={styles.qtyBtn}
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={!isDecreasable}
                            aria-label={`Decrease quantity of ${item.name}`}
                          >
                            −
                          </button>
                          <span className={styles.qtyDisplay}>{item.quantity}</span>
                          <button
                            type="button"
                            className={styles.qtyBtn}
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            aria-label={`Increase quantity of ${item.name}`}
                          >
                            +
                          </button>
                        </div>

                        <div className={styles.itemPriceBox}>
                          <span className={styles.itemLineTotal}>
                            {formatPrice(itemLineTotal)}
                          </span>
                          {item.quantity > 1 && (
                            <span className={styles.itemUnitPrice}>
                              {formatPrice(item.price)} each
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>

            {/* Drawer Footer & Checkout CTA */}
            <footer className={styles.footer}>
              <div className={styles.summaryRow}>
                <span>Order Subtotal</span>
                <span>{formattedSubtotal}</span>
              </div>

              <div className={styles.summaryRow}>
                <span>Insured Express Shipping</span>
                <span className={styles.freeShippingTag}>✦ Complimentary</span>
              </div>

              <div className={styles.summaryRow}>
                <span>Luxury Taxes &amp; GST</span>
                <span>Included</span>
              </div>

              <div className={styles.totalRow}>
                <span className={styles.totalLabel}>Estimated Total</span>
                <span className={styles.totalAmount}>{formattedSubtotal}</span>
              </div>

              <button
                type="button"
                className={styles.checkoutBtn}
                onClick={handleCheckoutClick}
              >
                <span>Proceed to Checkout</span>
                <span aria-hidden="true">→</span>
              </button>

              <div className={styles.secureNotice}>
                <span>🔒 256-Bit SSL Encrypted • Insured Global Transit • Direct Atelier Authenticity</span>
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  )
}

function BagEmptyIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3 3 7v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-3-4z" />
      <line x1="3" y1="7" x2="21" y2="7" />
      <path d="M16 11a4 4 0 0 1-8 0" />
    </svg>
  )
}
