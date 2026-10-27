import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getAdminProducts,
  saveProduct,
  deactivateProduct,
  uploadProductImage,
  addProductToBestSellers,
  removeProductFromBestSellers,
} from '../../lib/admin/adminService'
import ProductQuickViewModal from '../products/ProductQuickViewModal'
import styles from './ProductsManager.module.css'

const CATEGORIES = [
  'All',
  'Sarees',
  'Lehengas',
  'Silk',
  'Handloom',
  'Organza',
  'Banarasi',
  'Kanjeevaram',
  'Chiffon',
  'Bridal',
  'Heritage Bridal',
  'Imperial Bridal',
  'Royal Silk',
]

export default function ProductsManager() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(null)
  const alertTimerRef = useRef(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('all')

  // Modal State
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Preview Modal
  const [previewProduct, setPreviewProduct] = useState(null)

  // Form Fields
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    subtitle: '',
    category: 'Sarees',
    numeric_price: 28500,
    price: '₹28,500',
    original_price: '₹35,000',
    sku: '',
    stock: 15,
    low_stock_threshold: 5,
    description: '',
    badge: 'Artisanal Weave',
    status: 'active',
    images: [],
    image: '',
    specifications: [
      { key: 'Fabric', value: 'Pure Kanchipuram Silk' },
      { key: 'Color', value: 'Royal Jewel Tone' },
      { key: 'Origin', value: 'Varanasi, India' },
    ],
  })

  const showAlert = useCallback((text, type = 'success') => {
    setAlert({ text, type })
    if (alertTimerRef.current) {
      clearTimeout(alertTimerRef.current)
    }
    alertTimerRef.current = setTimeout(() => {
      setAlert(null)
    }, 3800)
  }, [])

  useEffect(() => {
    return () => {
      if (alertTimerRef.current) {
        clearTimeout(alertTimerRef.current)
      }
    }
  }, [])

  // 1. Fetch products manually (e.g. after add/edit/deactivate)
  const loadProducts = useCallback(async () => {
    try {
      const data = await getAdminProducts({
        searchTerm,
        categoryFilter: categoryFilter === 'All' ? 'all' : categoryFilter,
        statusFilter,
      })
      setProducts(data || [])
    } catch (err) {
      console.error('Error fetching products:', err)
      showAlert(err.message || 'Failed to load products', 'error')
    } finally {
      setLoading(false)
    }
  }, [searchTerm, categoryFilter, statusFilter, showAlert])

  // Synchronize products on filter changes without synchronous cascading setState
  useEffect(() => {
    let isMounted = true

    const fetchProducts = async () => {
      try {
        const data = await getAdminProducts({
          searchTerm,
          categoryFilter: categoryFilter === 'All' ? 'all' : categoryFilter,
          statusFilter,
        })
        if (isMounted) {
          setProducts(data || [])
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching products:', err)
          showAlert(err.message || 'Failed to load products', 'error')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchProducts()

    return () => {
      isMounted = false
    }
  }, [searchTerm, categoryFilter, statusFilter, showAlert])

  // 2. Open Add / Edit modal
  const handleOpenAdd = () => {
    setEditingProduct(null)
    setFormData({
      id: '',
      name: '',
      subtitle: '',
      category: 'Sarees',
      numeric_price: 25000,
      price: '₹25,000',
      original_price: '₹32,000',
      sku: `AURA-${Date.now().toString().slice(-5)}`,
      stock: 12,
      low_stock_threshold: 5,
      description: 'Handcrafted heirloom ensemble woven with traditional zari artistry.',
      badge: 'Artisanal Weave',
      status: 'active',
      images: [
        'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
      ],
      image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
      specifications: [
        { key: 'Fabric', value: 'Pure Mulberry Silk' },
        { key: 'Color', value: 'Imperial Blue' },
        { key: 'Weave Technique', value: 'Handloom Jacquard' },
      ],
    })
    setIsFormOpen(true)
  }

  const handleOpenEdit = (product) => {
    setEditingProduct(product)
    const productImages =
      Array.isArray(product.images) && product.images.length > 0
        ? product.images
        : product.image
        ? [product.image]
        : []

    const productSpecs =
      Array.isArray(product.specifications) && product.specifications.length > 0
        ? product.specifications
        : [
            { key: 'Fabric', value: product.fabric || 'Pure Silk' },
            { key: 'Color', value: product.color || 'Artisanal Palette' },
            { key: 'Origin', value: product.origin || 'Varanasi' },
          ]

    setFormData({
      id: product.id,
      name: product.name || '',
      subtitle: product.subtitle || '',
      category: product.category || 'Silk',
      numeric_price: Number(product.numeric_price) || 0,
      price: product.price || `₹${Number(product.numeric_price || 0).toLocaleString('en-IN')}`,
      original_price: product.original_price || '',
      sku: product.sku || product.id,
      stock: product.stock ?? 10,
      low_stock_threshold: product.low_stock_threshold ?? 5,
      description: product.description || '',
      badge: product.badge || '',
      status: product.status || (product.active ? 'active' : 'inactive'),
      images: productImages,
      image: product.image || productImages[0] || '',
      specifications: productSpecs,
    })
    setIsFormOpen(true)
  }

  // 3. Form Input Changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    if (name === 'numeric_price') {
      const num = Number(value) || 0
      setFormData((prev) => ({
        ...prev,
        numeric_price: num,
        price: `₹${num.toLocaleString('en-IN')}`,
      }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  // 4. Specifications management
  const handleSpecChange = (index, field, value) => {
    const newSpecs = [...formData.specifications]
    newSpecs[index] = { ...newSpecs[index], [field]: value }
    setFormData((prev) => ({ ...prev, specifications: newSpecs }))
  }

  const handleAddSpec = () => {
    setFormData((prev) => ({
      ...prev,
      specifications: [...prev.specifications, { key: '', value: '' }],
    }))
  }

  const handleRemoveSpec = (index) => {
    setFormData((prev) => ({
      ...prev,
      specifications: prev.specifications.filter((_, i) => i !== index),
    }))
  }

  // 5. Image upload to Supabase Storage
  const handleImageUpload = async (e) => {
    const inputElement = e.target
    const files = Array.from(inputElement.files || [])
    if (files.length === 0) return

    try {
      setUploadingImage(true)
      showAlert('Uploading image to Supabase Storage...', 'info')

      const uploadedUrls = []
      for (const file of files) {
        const publicUrl = await uploadProductImage(file)
        if (publicUrl) {
          uploadedUrls.push(publicUrl)
        }
      }

      if (uploadedUrls.length > 0) {
        setFormData((prev) => {
          const updatedImages = [...prev.images, ...uploadedUrls]
          return {
            ...prev,
            images: updatedImages,
            image: prev.image || updatedImages[0] || '',
          }
        })
        showAlert('Product image uploaded successfully.')
      }
    } catch (err) {
      console.error('Image upload failed:', err)
      showAlert(err.message || 'Image upload failed. Ensure bucket is public.', 'error')
    } finally {
      setUploadingImage(false)
      if (inputElement) {
        inputElement.value = ''
      }
    }
  }

  const handleRemoveImage = (index) => {
    setFormData((prev) => {
      const updatedImages = prev.images.filter((_, i) => i !== index)
      return {
        ...prev,
        images: updatedImages,
        image: updatedImages[0] || '',
      }
    })
  }

  const handleSetPrimaryImage = (index) => {
    setFormData((prev) => {
      const targetImg = prev.images[index]
      const remaining = prev.images.filter((_, i) => i !== index)
      return {
        ...prev,
        images: [targetImg, ...remaining],
        image: targetImg,
      }
    })
  }

  // 6. Submit product form
  const handleSaveProduct = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      showAlert('Product name is required.', 'error')
      return
    }

    try {
      setSaving(true)
      const numericPrice = Number(formData.numeric_price) || 0
      const payload = {
        ...formData,
        numeric_price: numericPrice,
        price: formData.price || `₹${numericPrice.toLocaleString('en-IN')}`,
        image: formData.images[0] || formData.image || '',
        active: formData.status === 'active',
      }
      await saveProduct(payload)
      showAlert(`Product "${formData.name}" saved successfully.`)
      setIsFormOpen(false)
      loadProducts()
    } catch (err) {
      console.error('Failed to save product:', err)
      showAlert(err.message || 'Error saving product.', 'error')
    } finally {
      setSaving(false)
    }
  }

  // 7. Toggle Best Seller on existing product
  const handleToggleBestSeller = async (product) => {
    try {
      if (product.isBestSeller) {
        await removeProductFromBestSellers(product.id)
        showAlert(`Removed "${product.name}" from Best Sellers.`)
      } else {
        await addProductToBestSellers(product.id)
        showAlert(`"${product.name}" marked as Best Seller (references existing product ID).`)
      }
      loadProducts()
    } catch (err) {
      showAlert(err.message || 'Could not update best seller status.', 'error')
    }
  }

  // 8. Deactivate product
  const handleDeactivate = async (product) => {
    const confirmDeact = window.confirm(
      `Deactivate "${product.name}"? It will become inactive and be removed from public storefront.`
    )
    if (!confirmDeact) return

    try {
      await deactivateProduct(product.id)
      showAlert(`"${product.name}" has been deactivated.`)
      loadProducts()
    } catch (err) {
      showAlert(err.message || 'Failed to deactivate product.', 'error')
    }
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Artisanal Catalog</h2>
          <p className={styles.subtitle}>
            Manage inventory, structured specifications, and high-definition imagery.
          </p>
        </div>

        <button type="button" className={styles.addBtn} onClick={handleOpenAdd}>
          + Add Product
        </button>
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

      {/* Search and Filters */}
      <div className={styles.filterBar}>
        <div className={styles.searchInputWrapper}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search weaves by name, SKU, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search weaves by name, SKU, or category"
          />
        </div>

        <select
          className={styles.filterSelect}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Filter by category"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              Category: {cat}
            </option>
          ))}
        </select>

        <select
          className={styles.filterSelect}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="all">Status: All</option>
          <option value="active">Active Only</option>
          <option value="draft">Drafts Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      {/* Products Table */}
      <div className={styles.tableContainer}>
        {loading ? (
          <div className={styles.emptyTable}>Loading catalog weaves from Supabase...</div>
        ) : products.length === 0 ? (
          <div className={styles.emptyTable}>
            No products match the selected criteria.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.productsTable}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Inventory</th>
                  <th>Status</th>
                  <th>Best Seller</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const isLow = p.stock <= (p.low_stock_threshold || 5)
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className={styles.productCell}>
                          <img
                            src={p.image || '/images/products/royal-maroon.jpg'}
                            alt={p.name}
                            className={styles.productThumb}
                            onError={(e) => {
                              e.currentTarget.onerror = null
                              e.currentTarget.src = '/images/products/royal-maroon.jpg'
                            }}
                          />
                          <div className={styles.productInfo}>
                            <span className={styles.productName}>{p.name}</span>
                            {p.subtitle && (
                              <span className={styles.productSubtitle}>
                                {p.subtitle}
                              </span>
                            )}
                            <span className={styles.productSku}>
                              SKU: {p.sku || p.id}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>{p.category}</td>
                      <td>
                        <span className={styles.priceText}>{p.price}</span>
                        {p.original_price && (
                          <span className={styles.originalPriceText}>
                            {p.original_price}
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`${styles.stockBadge} ${
                            isLow ? styles.stockLow : styles.stockNormal
                          }`}
                        >
                          {p.stock} units {isLow && '⚠ Low'}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`${styles.statusPill} ${
                            p.status === 'active' && p.active
                              ? styles.statusActive
                              : p.status === 'draft'
                              ? styles.statusDraft
                              : styles.statusInactive
                          }`}
                        >
                          {p.status || (p.active ? 'active' : 'inactive')}
                        </span>
                      </td>
                      <td>
                        {p.isBestSeller ? (
                          <span className={styles.bestSellerBadge}>
                            ★ Best Seller #{p.bestSellerOrder || '—'}
                          </span>
                        ) : (
                          <span style={{ color: '#c8c0b2', fontSize: '0.75rem' }}>—</span>
                        )}
                      </td>
                      <td>
                        <div className={styles.actionsCell}>
                          <button
                            type="button"
                            className={styles.tableActionBtn}
                            onClick={() => handleOpenEdit(p)}
                            title="Edit Product"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className={styles.tableActionBtn}
                            onClick={() => handleToggleBestSeller(p)}
                            title={
                              p.isBestSeller
                                ? 'Remove from Section 4 Best Sellers'
                                : 'Mark as Homepage Section 4 Best Seller'
                            }
                          >
                            {p.isBestSeller ? '★ Remove Best Seller' : '☆ Best Seller'}
                          </button>

                          <button
                            type="button"
                            className={styles.tableActionBtn}
                            onClick={() => setPreviewProduct(p)}
                            title="Quick View Preview"
                          >
                            Preview
                          </button>

                          {p.active && (
                            <button
                              type="button"
                              className={`${styles.tableActionBtn} ${styles.tableActionBtnDanger}`}
                              onClick={() => handleDeactivate(p)}
                              title="Deactivate Product"
                            >
                              Deactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {isFormOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsFormOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {editingProduct ? `Edit: ${editingProduct.name}` : 'Create Artisanal Weave'}
              </h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setIsFormOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Section 1: Basic Information */}
              <div className={styles.formSectionHeader}>1. Basic Information</div>
              <div className={styles.formGrid2}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Product Name *</label>
                  <input
                    type="text"
                    name="name"
                    className={styles.formInput}
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g. Royal Maroon Katan Silk Saree"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Subtitle / Craft Note</label>
                  <input
                    type="text"
                    name="subtitle"
                    className={styles.formInput}
                    value={formData.subtitle}
                    onChange={handleInputChange}
                    placeholder="e.g. Handwoven with Pure Gold Zari"
                  />
                </div>
              </div>

              <div className={styles.formGrid2}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Category</label>
                  <select
                    name="category"
                    className={styles.formSelect}
                    value={formData.category}
                    onChange={handleInputChange}
                  >
                    {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Status</label>
                  <select
                    name="status"
                    className={styles.formSelect}
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="active">Active (Visible in Storefront)</option>
                    <option value="draft">Draft (Private Admin Preview)</option>
                    <option value="inactive">Inactive (Disabled)</option>
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Description</label>
                <textarea
                  name="description"
                  className={styles.formTextarea}
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Detailed description of the weaving tradition and fabric touch..."
                />
              </div>

              {/* Section 2: Pricing & Inventory */}
              <div className={styles.formSectionHeader}>2. Pricing & Inventory</div>
              <div className={styles.formGrid2}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Selling Price (₹ Numeric) *</label>
                  <input
                    type="number"
                    name="numeric_price"
                    className={styles.formInput}
                    value={formData.numeric_price}
                    onChange={handleInputChange}
                    required
                    min="100"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Compare-At / Original Price</label>
                  <input
                    type="text"
                    name="original_price"
                    className={styles.formInput}
                    value={formData.original_price}
                    onChange={handleInputChange}
                    placeholder="e.g. ₹35,000"
                  />
                </div>
              </div>

              <div className={styles.formGrid2}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>SKU (Stock Keeping Unit)</label>
                  <input
                    type="text"
                    name="sku"
                    className={styles.formInput}
                    value={formData.sku}
                    onChange={handleInputChange}
                    placeholder="e.g. AURA-SLK-001"
                  />
                </div>

                <div className={styles.formGrid2}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Stock Quantity *</label>
                    <input
                      type="number"
                      name="stock"
                      className={styles.formInput}
                      value={formData.stock}
                      onChange={handleInputChange}
                      min="0"
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Low Stock Alert</label>
                    <input
                      type="number"
                      name="low_stock_threshold"
                      className={styles.formInput}
                      value={formData.low_stock_threshold}
                      onChange={handleInputChange}
                      min="1"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: High Definition Images (Supabase Storage) */}
              <div className={styles.formSectionHeader}>
                3. Gallery Images (Supabase Storage: 3–4 Views)
              </div>
              <div className={styles.imagesGrid}>
                {formData.images.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    className={`${styles.imageSlot} ${
                      idx === 0 ? styles.imageSlotPrimary : ''
                    }`}
                  >
                    <img
                      src={imgUrl || '/images/products/royal-maroon.jpg'}
                      alt={`Product view ${idx + 1}`}
                      className={styles.previewImg}
                      onError={(e) => {
                        e.currentTarget.onerror = null
                        e.currentTarget.src = '/images/products/royal-maroon.jpg'
                      }}
                    />
                    <span style={{ fontSize: '0.65rem', color: idx === 0 ? '#c6a15b' : '#c8c0b2', marginTop: '0.2rem' }}>
                      {idx === 0 ? 'Primary Image' : `View 0${idx + 1}`}
                    </span>
                    <div className={styles.imageSlotControls}>
                      {idx !== 0 && (
                        <button
                          type="button"
                          className={styles.slotBtn}
                          onClick={() => handleSetPrimaryImage(idx)}
                        >
                          Make Main
                        </button>
                      )}
                      <button
                        type="button"
                        className={styles.slotBtn}
                        onClick={() => handleRemoveImage(idx)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}

                {formData.images.length < 5 && (
                  <label className={styles.imageSlot} style={{ cursor: 'pointer' }}>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className={styles.uploadInputHidden}
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                    <div className={styles.uploadLabelBtn}>
                      <span>{uploadingImage ? 'Uploading…' : '＋ Upload File'}</span>
                      <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>Storage Bucket</span>
                    </div>
                  </label>
                )}
              </div>

              {/* Section 4: Structured Specifications */}
              <div className={styles.formSectionHeader}>4. Structured Specifications</div>
              <div className={styles.specsList}>
                {formData.specifications.map((spec, sIdx) => (
                  <div key={sIdx} className={styles.specRow}>
                    <input
                      type="text"
                      placeholder="Spec (e.g. Fabric, Color)"
                      className={styles.formInput}
                      style={{ flex: 1 }}
                      value={spec.key}
                      onChange={(e) => handleSpecChange(sIdx, 'key', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Value (e.g. Pure Kanchipuram Silk)"
                      className={styles.formInput}
                      style={{ flex: 2 }}
                      value={spec.value}
                      onChange={(e) => handleSpecChange(sIdx, 'value', e.target.value)}
                    />
                    <button
                      type="button"
                      className={styles.slotBtn}
                      onClick={() => handleRemoveSpec(sIdx)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className={styles.addSpecBtn}
                  onClick={handleAddSpec}
                >
                  + Add Specification
                </button>
              </div>

              {/* Modal Actions */}
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setIsFormOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.saveBtn} disabled={saving || uploadingImage}>
                  {saving ? 'Saving Weave...' : editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick View Modal */}
      {previewProduct && (
        <ProductQuickViewModal
          product={previewProduct}
          onClose={() => setPreviewProduct(null)}
        />
      )}
    </div>
  )
}
