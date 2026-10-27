import { useState, useEffect, useCallback } from 'react'
import {
  getAdminBestSellers,
  getAvailableProductsForBestSeller,
  addProductToBestSellers,
  removeProductFromBestSellers,
  reorderBestSellers,
} from '../../lib/admin/adminService'
import ProductQuickViewModal from '../products/ProductQuickViewModal'
import styles from './BestSellersManager.module.css'

export default function BestSellersManager() {
  const [bestSellers, setBestSellers] = useState([])
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(null) // { type: 'success' | 'error', text: '' }

  // Modal for adding product
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [availableProducts, setAvailableProducts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [modalLoading, setModalLoading] = useState(false)

  // Preview modal
  const [previewProduct, setPreviewProduct] = useState(null)

  const showAlert = useCallback((text, type = 'success') => {
    setAlert({ text, type })
    setTimeout(() => setAlert(null), 3600)
  }, [])

  // 1. Fetch current best sellers
  const loadBestSellers = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getAdminBestSellers()
      setBestSellers(data)
    } catch (err) {
      console.error('Error fetching best sellers:', err)
      showAlert(err.message || 'Failed to load best sellers', 'error')
    } finally {
      setLoading(false)
    }
  }, [showAlert])

  useEffect(() => {
    loadBestSellers()
  }, [loadBestSellers])

  // 2. Fetch available products when modal opens or search changes
  const loadAvailableProducts = useCallback(async () => {
    try {
      setModalLoading(true)
      const products = await getAvailableProductsForBestSeller(searchQuery)
      setAvailableProducts(products)
    } catch (err) {
      console.error('Error loading available products:', err)
    } finally {
      setModalLoading(false)
    }
  }, [searchQuery])

  useEffect(() => {
    if (isAddModalOpen) {
      loadAvailableProducts()
    }
  }, [isAddModalOpen, loadAvailableProducts])

  // 3. Add existing product as Best Seller
  const handleAddProduct = async (product) => {
    try {
      await addProductToBestSellers(product.id)
      showAlert(`"${product.name}" added to Best Sellers.`)
      setIsAddModalOpen(false)
      loadBestSellers()
    } catch (err) {
      showAlert(err.message || 'Could not add product to best sellers', 'error')
    }
  }

  // 4. Remove product from Best Sellers (only removes relationship)
  const handleRemove = async (item) => {
    const confirmRemove = window.confirm(
      `Remove "${item.product?.name || item.productId}" from Homepage Best Sellers?\n\n(Note: The product will NOT be deleted from the catalog/store).`
    )
    if (!confirmRemove) return

    try {
      await removeProductFromBestSellers(item.productId)
      showAlert(`Removed "${item.product?.name || item.productId}" from Best Sellers.`)
      loadBestSellers()
    } catch (err) {
      showAlert(err.message || 'Failed to remove best seller', 'error')
    }
  }

  // 5. Move order up or down
  const handleMove = async (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= bestSellers.length) return

    const newOrder = [...bestSellers]
    const temp = newOrder[index]
    newOrder[index] = newOrder[targetIndex]
    newOrder[targetIndex] = temp

    // Recompute display orders
    const payload = newOrder.map((item, idx) => ({
      product_id: item.productId,
      display_order: idx + 1,
    }))

    // Optimistically update UI
    setBestSellers(
      newOrder.map((item, idx) => ({
        ...item,
        displayOrder: idx + 1,
      }))
    )

    try {
      await reorderBestSellers(payload)
      showAlert('Best Sellers reordered successfully.')
    } catch (err) {
      showAlert(err.message || 'Failed to update order', 'error')
      loadBestSellers()
    }
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <span className={styles.eyebrow}>HOMEPAGE SECTION 4</span>
          <h2 className={styles.heading}>Best Sellers Management</h2>
          <p className={styles.subtext}>
            Control which catalog products appear in the Homepage carousel and arrange their exact display order.
          </p>
        </div>

        <button
          type="button"
          className={styles.addBtn}
          onClick={() => setIsAddModalOpen(true)}
          aria-label="Add product to Best Sellers"
        >
          <span>+ Add Best Seller</span>
        </button>
      </div>

      {/* Alert Banner */}
      {alert && (
        <div className={`${styles.alert} ${alert.type === 'error' ? styles.alertError : styles.alertSuccess}`}>
          <span>{alert.text}</span>
          <button type="button" onClick={() => setAlert(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
            ✕
          </button>
        </div>
      )}

      {/* Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table} aria-label="Best Sellers Products">
          <thead>
            <tr>
              <th>Position</th>
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                  Loading Best Sellers...
                </td>
              </tr>
            ) : bestSellers.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className={styles.emptyState}>
                    <span className={styles.emptyIcon}>✦</span>
                    <h3 style={{ margin: 0, color: '#F8F5EE' }}>No Best Sellers Configured</h3>
                    <p style={{ margin: 0, color: 'rgba(245,237,214,0.6)', fontSize: '13px' }}>
                      Click &ldquo;+ Add Best Seller&rdquo; to select an existing product from the catalog.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              bestSellers.map((item, idx) => {
                const p = item.product || {}
                return (
                  <tr key={item.id}>
                    {/* Position & Reorder Controls */}
                    <td>
                      <div className={styles.positionCell}>
                        <span className={styles.orderNum}>#{item.displayOrder}</span>
                        <div className={styles.orderControls}>
                          <button
                            type="button"
                            className={styles.arrowBtn}
                            onClick={() => handleMove(idx, 'up')}
                            disabled={idx === 0}
                            title="Move Up"
                            aria-label={`Move ${p.name || item.productId} up`}
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            className={styles.arrowBtn}
                            onClick={() => handleMove(idx, 'down')}
                            disabled={idx === bestSellers.length - 1}
                            title="Move Down"
                            aria-label={`Move ${p.name || item.productId} down`}
                          >
                            ▼
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Product Info */}
                    <td>
                      <div className={styles.productCell}>
                        {p.image && (
                          <img src={p.image} alt={p.name || 'Product'} className={styles.productThumb} />
                        )}
                        <div className={styles.productText}>
                          <span className={styles.productName}>{p.name || item.productId}</span>
                          <span className={styles.productSku}>{p.sku || `ID: ${item.productId}`}</span>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td>
                      <span className={styles.categoryTag}>{p.category || 'General'}</span>
                    </td>

                    {/* Price */}
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--gold-light)' }}>{p.price || '—'}</span>
                    </td>

                    {/* Stock */}
                    <td>
                      <span style={{ color: (p.stock || 0) < 5 ? '#EF9A9A' : 'rgba(245,237,214,0.8)' }}>
                        {p.stock !== undefined ? `${p.stock} units` : 'In Stock'}
                      </span>
                    </td>

                    {/* Status */}
                    <td>
                      <span className={styles.statusBadge}>Active in Section 4</span>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className={styles.actionBtns}>
                        <button
                          type="button"
                          className={styles.viewBtn}
                          onClick={() => setPreviewProduct(p)}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className={styles.removeBtn}
                          onClick={() => handleRemove(item)}
                          title="Remove from Section 4"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Best Seller Modal */}
      {isAddModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsAddModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Select Product for Best Sellers</h3>
              <button
                type="button"
                className={styles.closeModalBtn}
                onClick={() => setIsAddModalOpen(false)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className={styles.searchWrap}>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search by product name, SKU, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            <div className={styles.modalList}>
              {modalLoading ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--gold-light)' }}>
                  Searching catalog...
                </div>
              ) : availableProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'rgba(245,237,214,0.6)' }}>
                  {searchQuery ? 'No matching products found.' : 'All catalog products are already in Best Sellers!'}
                </div>
              ) : (
                availableProducts.map((prod) => (
                  <div key={prod.id} className={styles.modalItem}>
                    <div className={styles.productCell}>
                      {prod.image && (
                        <img src={prod.image} alt={prod.name} className={styles.productThumb} />
                      )}
                      <div className={styles.productText}>
                        <span className={styles.productName}>{prod.name}</span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span className={styles.productSku}>{prod.sku || prod.id}</span>
                          <span style={{ fontSize: '11px', color: 'var(--gold)' }}>• {prod.category}</span>
                          <span style={{ fontSize: '11px', color: 'var(--gold-light)', fontWeight: 600 }}>
                            • {prod.price}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={styles.addItemBtn}
                      onClick={() => handleAddProduct(prod)}
                    >
                      + Add
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick View Preview Modal */}
      {previewProduct && (
        <ProductQuickViewModal
          product={previewProduct}
          isWishlisted={false}
          onToggleWishlist={() => {}}
          onAddToCart={() => {}}
          onClose={() => setPreviewProduct(null)}
        />
      )}
    </div>
  )
}
