-- ==============================================================================
-- AURA LUXURY ATELIER — REVIEWS TABLE & HARDENED RLS POLICIES MIGRATION
-- ==============================================================================
-- File: supabase_reviews_schema.sql
-- 
-- This migration creates the public.reviews table, high-performance indexes,
-- and strict Row Level Security (RLS) policies protecting review moderation,
-- preventing user impersonation, and isolating administrative operations.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLE DEFINITION
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    avatar_url TEXT,
    product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL DEFAULT 'AURA Couture Ensemble',
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL CHECK (length(trim(comment)) >= 5),
    is_verified_purchase BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    is_featured BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 2. PERFORMANCE & FILTERING INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_reviews_status_featured ON public.reviews(status, is_featured);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews(user_id);

-- ------------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) ACTIVATION
-- ------------------------------------------------------------------------------
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 4. RESTRICTIVE ROW LEVEL SECURITY POLICIES
-- ------------------------------------------------------------------------------

-- Policy A: SELECT
-- 1. Public visitors and customers can ONLY view approved reviews.
-- 2. Authenticated authors can view their own reviews (even if pending/rejected).
-- 3. Verified Administrators can view ALL reviews for editorial moderation.
DROP POLICY IF EXISTS "Public can view approved reviews" ON public.reviews;
CREATE POLICY "Public can view approved reviews"
    ON public.reviews
    FOR SELECT
    USING (
        status = 'approved'
        OR
        (auth.uid() IS NOT NULL AND auth.uid() = user_id)
        OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_admin = true)
        )
    );

-- Policy B: INSERT
-- 1. Authenticated customers can submit reviews for themselves (auth.uid() = user_id).
-- 2. Guest patrons can submit reviews with user_id = NULL.
-- 3. Anti-impersonation: Customers cannot submit reviews on behalf of other user IDs.
-- 4. Anti-tampering: Patrons cannot self-approve (status strictly 'pending'), self-feature,
--    or mark as verified purchase.
-- 5. Validation: Enforces rating 1-5 and minimum comment length.
DROP POLICY IF EXISTS "Patrons can submit pending reviews" ON public.reviews;
CREATE POLICY "Patrons can submit pending reviews"
    ON public.reviews
    FOR INSERT
    WITH CHECK (
        (
            (auth.uid() IS NOT NULL AND auth.uid() = user_id)
            OR
            (auth.uid() IS NULL AND user_id IS NULL)
        )
        AND status = 'pending'
        AND is_featured = false
        AND is_verified_purchase = false
        AND rating >= 1 AND rating <= 5
        AND length(trim(comment)) >= 5
    );

-- Policy C: UPDATE
-- Customers and visitors have ZERO update permissions.
-- Only verified Administrators (or Supabase service role key) can update reviews
-- (e.g., status changes, featuring in Section 6, or editorial notes).
DROP POLICY IF EXISTS "Admins can update reviews" ON public.reviews;
CREATE POLICY "Admins can update reviews"
    ON public.reviews
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_admin = true)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_admin = true)
        )
    );

-- Policy D: DELETE
-- Customers and visitors have ZERO delete permissions.
-- Only verified Administrators (or Supabase service role key) can permanently delete reviews.
DROP POLICY IF EXISTS "Admins can delete reviews" ON public.reviews;
CREATE POLICY "Admins can delete reviews"
    ON public.reviews
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_admin = true)
        )
    );

-- ------------------------------------------------------------------------------
-- 5. AUTOMATIC TIMESTAMP TRIGGER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_reviews_updated_at ON public.reviews;
CREATE TRIGGER trigger_reviews_updated_at
    BEFORE UPDATE ON public.reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_reviews_updated_at();

-- ------------------------------------------------------------------------------
-- 6. REALTIME SUBSCRIPTION REGISTRATION
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'reviews'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
    END IF;
END $$;
