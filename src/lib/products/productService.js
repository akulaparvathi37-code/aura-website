import { supabase } from '../supabase/client.js'
import { SAREES_COLLECTION } from '../../data/sareesCollection.js'
import { LEHENGAS_COLLECTION } from '../../data/lehengasCollection.js'

/**
 * Predicate to identify if a product belongs to the Sarees collection.
 */
export function isSareeProduct(product) {
  if (!product) return false
  const category = (product.category || '').toLowerCase().trim()
  const name = (product.name || '').toLowerCase().trim()
  const sku = (product.sku || '').toUpperCase().trim()

  // Explicit Lehenga exclusion
  if (
    category === 'lehengas' ||
    category.includes('lehenga') ||
    name.includes('lehenga') ||
    sku.startsWith('SKU-LHG')
  ) {
    return false
  }

  // Explicit Saree match
  if (
    category === 'sarees' ||
    category.includes('saree') ||
    name.includes('saree') ||
    sku.startsWith('SKU-SAR')
  ) {
    return true
  }

  // Known traditional saree categories & fabrics
  const sareeCategories = [
    'silk',
    'handloom',
    'organza',
    'banarasi',
    'kanjeevaram',
    'chiffon',
    'royal silk',
    'tussar',
    'banarasi silk',
    'kanchipuram silk',
    'tissue silk',
    'banarasi brocade',
    'katan silk handloom',
    'paithani silk',
    'chanderi silk',
    'banarasi jangla',
    'katan silk',
    'pure silk',
    'georgette',
    'festive silk',
    'bridal banarasi',
    'handloom silk',
  ]

  return sareeCategories.some((sc) => category === sc || category.includes(sc))
}

/**
 * Predicate to identify if a product belongs to the Lehengas collection.
 */
export function isLehengaProduct(product) {
  if (!product) return false
  const category = (product.category || '').toLowerCase().trim()
  const name = (product.name || '').toLowerCase().trim()
  const sku = (product.sku || '').toUpperCase().trim()

  // Explicit Saree exclusion
  if (
    category === 'sarees' ||
    category.includes('saree') ||
    name.includes('saree') ||
    sku.startsWith('SKU-SAR')
  ) {
    return false
  }

  // Explicit Lehenga match
  if (
    category === 'lehengas' ||
    category.includes('lehenga') ||
    name.includes('lehenga') ||
    sku.startsWith('SKU-LHG')
  ) {
    return true
  }

  // Known bridal & lehenga couture categories
  const lehengaCategories = [
    'bridal couture',
    'heritage bridal',
    'designer festive',
    'contemporary couture',
    'imperial bridal',
    'bridal',
  ]

  return lehengaCategories.some((lc) => category === lc || category.includes(lc))
}

/**
 * Formats a Supabase product row into a normalized Saree item.
 */
function formatSaree(p) {
  const specs = Array.isArray(p.specifications) ? p.specifications : []
  const fabricSpec = specs.find((s) => s.key?.toLowerCase() === 'fabric')?.value
  const colorSpec = specs.find((s) => s.key?.toLowerCase() === 'color')?.value
  const primaryImg =
    p.image ||
    (Array.isArray(p.images) && p.images[0]) ||
    '/images/products/royal-maroon.jpg'

  return {
    id: p.id,
    name: p.name || 'AURA Handcrafted Saree',
    category: p.category || 'Sarees',
    fabric: p.fabric || fabricSpec || 'Pure Artisanal Silk',
    color: p.color || colorSpec || 'Artisanal Palette',
    price:
      p.price ||
      `₹${(Number(p.numeric_price) || 0).toLocaleString('en-IN')}`,
    originalPrice: p.original_price || '',
    numericPrice: Number(p.numeric_price) || 0,
    image: primaryImg,
    images: Array.isArray(p.images) && p.images.length > 0 ? p.images : [primaryImg],
    description: p.description || '',
    imagePrompt: p.description || '',
    stock: p.stock ?? 10,
    rating: p.rating || 5,
    reviewsCount: p.reviews_count || 100,
    origin: p.origin || 'Varanasi Atelier',
    craftTime: p.craft_time || '35 Days of Pit-Loom Weaving',
    created_at: p.created_at || '',
  }
}

/**
 * Formats a Supabase product row into a normalized Lehenga item.
 */
function formatLehenga(p) {
  const specs = Array.isArray(p.specifications) ? p.specifications : []
  const fabricSpec = specs.find((s) => s.key?.toLowerCase() === 'fabric')?.value
  const colorSpec = specs.find((s) => s.key?.toLowerCase() === 'color')?.value

  let frontImg = p.image || '/images/six-moods/lehengas.jpg'
  let rightImg = frontImg
  let leftImg = frontImg

  if (p.images && typeof p.images === 'object' && !Array.isArray(p.images)) {
    frontImg = p.images.front || frontImg
    rightImg = p.images.rightAngle || frontImg
    leftImg = p.images.leftAngle || frontImg
  } else if (Array.isArray(p.images) && p.images.length > 0) {
    frontImg = p.images[0] || frontImg
    rightImg = p.images[1] || frontImg
    leftImg = p.images[2] || frontImg
  }

  return {
    id: p.id,
    name: p.name || 'AURA Couture Lehenga',
    category: p.category || 'Lehengas',
    fabric: p.fabric || fabricSpec || 'Pure Silk Velvet & Heavy Raw Silk',
    color: p.color || colorSpec || 'Jewel Tone Palette',
    price:
      p.price ||
      `₹${(Number(p.numeric_price) || 0).toLocaleString('en-IN')}`,
    originalPrice: p.original_price || '',
    numericPrice: Number(p.numeric_price) || 0,
    image: frontImg,
    images: {
      front: frontImg,
      rightAngle: rightImg,
      leftAngle: leftImg,
    },
    imagePrompts: p.imagePrompts || {
      front: p.description || '',
      rightAngle: p.description || '',
      leftAngle: p.description || '',
    },
    description: p.description || '',
    stock: p.stock ?? 5,
    rating: p.rating || 5,
    reviewsCount: p.reviews_count || 50,
    origin: p.origin || 'Jaipur Atelier',
    craftTime: p.craft_time || '60 Days of Couture Embroidery',
    created_at: p.created_at || '',
  }
}

/**
 * Fetches active Sarees from Supabase, seamlessly merging with base catalog.
 */
export async function getStorefrontSarees() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('Supabase query error for Sarees, using catalog:', error.message)
      return SAREES_COLLECTION
    }

    if (!data || data.length === 0) {
      return SAREES_COLLECTION
    }

    // Filter active products that match Sarees
    const supabaseSarees = data
      .filter((p) => p.status !== 'inactive' && p.status !== 'draft')
      .filter(isSareeProduct)
      .map(formatSaree)

    // Build merged map to preserve curated base sarees while prepending new Admin arrivals
    const EXCLUDED_SEEDED_SAREE_IDS = new Set([
      '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
      'royal-maroon', 'peacock-blue', 'blush-organza', 'ivory-handloom', 'emerald-katan', 'dusty-rose',
    ])

    const baseMap = new Map()
    SAREES_COLLECTION.forEach((s) => baseMap.set(s.id, s))

    const newArrivals = []
    supabaseSarees.forEach((sbProduct) => {
      if (baseMap.has(sbProduct.id)) {
        // Update curated item if updated in Supabase
        baseMap.set(sbProduct.id, {
          ...baseMap.get(sbProduct.id),
          ...sbProduct,
        })
      } else if (!EXCLUDED_SEEDED_SAREE_IDS.has(sbProduct.id)) {
        newArrivals.push(sbProduct)
      }
    })

    return [...newArrivals, ...Array.from(baseMap.values())]
  } catch (err) {
    console.warn('Exception in getStorefrontSarees:', err)
    return SAREES_COLLECTION
  }
}

/**
 * Fetches active Lehengas from Supabase, seamlessly merging with base catalog.
 */
export async function getStorefrontLehengas() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('Supabase query error for Lehengas, using catalog:', error.message)
      return LEHENGAS_COLLECTION
    }

    if (!data || data.length === 0) {
      return LEHENGAS_COLLECTION
    }

    // Filter active products that match Lehengas
    const supabaseLehengas = data
      .filter((p) => p.status !== 'inactive' && p.status !== 'draft')
      .filter(isLehengaProduct)
      .map(formatLehenga)

    // Build merged map to preserve curated base lehengas while prepending new Admin arrivals
    const baseMap = new Map()
    LEHENGAS_COLLECTION.forEach((l) => baseMap.set(l.id, l))

    const newArrivals = []
    supabaseLehengas.forEach((sbProduct) => {
      if (baseMap.has(sbProduct.id)) {
        baseMap.set(sbProduct.id, {
          ...baseMap.get(sbProduct.id),
          ...sbProduct,
        })
      } else {
        newArrivals.push(sbProduct)
      }
    })

    return [...newArrivals, ...Array.from(baseMap.values())]
  } catch (err) {
    console.warn('Exception in getStorefrontLehengas:', err)
    return LEHENGAS_COLLECTION
  }
}

/**
 * Subscribes to realtime changes on public.products table.
 */
export function subscribeToStorefrontProducts(callback) {
  try {
    const channel = supabase
      .channel('public:storefront_products_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          callback?.()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  } catch (err) {
    console.warn('Realtime subscription not established for products:', err)
    return () => {}
  }
}
