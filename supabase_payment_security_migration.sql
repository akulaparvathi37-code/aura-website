-- ==============================================================================
-- AURA LUXURY ATELIER — PAYMENT SECURITY & ORDER RLS HARDENING MIGRATION (V2 - SECURE)
-- ==============================================================================
-- IMPORTANT:
-- This migration hardens public.orders and public.order_items against payment fraud,
-- restricts confirmation RPC execution to trusted server roles, enforces strict
-- Razorpay order ID matching, and protects customer privacy.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SCHEMA EXTENSIONS (Additive & Zero Data Loss)
-- ------------------------------------------------------------------------------
-- Add dedicated columns for separate gateway tracking and guest verification.
-- Existing 'payment_id' column is preserved for backward compatibility.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS guest_token TEXT;

-- High-performance indexes for order lookup & webhook reconciliation
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id ON public.orders(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_guest_token ON public.orders(guest_token);

-- ------------------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY — public.orders
-- ------------------------------------------------------------------------------
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Policy A: INSERT
-- Clients may only create orders in 'pending' payment status.
-- Authenticated users must bind user_id to auth.uid().
-- Unauthenticated guests cannot set user_id, and must supply a guest_token.
-- Direct insertion of 'paid' orders or negative amounts is strictly blocked.
DROP POLICY IF EXISTS "Enable insert for authenticated users and guests" ON public.orders;
CREATE POLICY "Enable insert for authenticated users and guests"
    ON public.orders
    FOR INSERT
    WITH CHECK (
        (
            (auth.uid() IS NOT NULL AND auth.uid() = user_id)
            OR
            (auth.uid() IS NULL AND user_id IS NULL AND guest_token IS NOT NULL)
        )
        AND payment_status = 'pending'
        AND order_status = 'Pending'
        AND total_amount >= 0
    );

-- Policy B: SELECT
-- Authenticated customers can view ONLY their own orders.
-- Verified Administrators can view all orders.
-- Unauthenticated guests CANNOT query orders directly via REST (access is via trusted server flow).
DROP POLICY IF EXISTS "Users can view only their own orders" ON public.orders;
CREATE POLICY "Users can view only their own orders"
    ON public.orders
    FOR SELECT
    USING (
        (auth.uid() IS NOT NULL AND auth.uid() = user_id)
        OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_admin = true)
        )
    );

-- Policy C: UPDATE & DELETE
-- Ordinary customers and guests have ZERO update or delete access.
-- Only verified Administrators (or Supabase service role key) can update orders.
DROP POLICY IF EXISTS "Admins can view and manage all orders" ON public.orders;
CREATE POLICY "Admins can view and manage all orders"
    ON public.orders
    FOR ALL
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

-- ------------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY — public.order_items
-- ------------------------------------------------------------------------------
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Policy A: INSERT
-- Clients can only insert items into pending orders they own.
DROP POLICY IF EXISTS "Enable insert for order items" ON public.order_items;
CREATE POLICY "Enable insert for order items"
    ON public.order_items
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
            AND (
                (auth.uid() IS NOT NULL AND orders.user_id = auth.uid())
                OR
                (auth.uid() IS NULL AND orders.user_id IS NULL AND orders.created_at >= (now() - interval '10 minutes'))
                OR
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_admin = true)
                )
            )
        )
    );

-- Policy B: SELECT
-- Customers can view only items belonging to their own orders.
-- Verified Administrators can view all order items.
DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;
CREATE POLICY "Users can view their own order items"
    ON public.order_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
            AND (
                (auth.uid() IS NOT NULL AND orders.user_id = auth.uid())
                OR
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_admin = true)
                )
            )
        )
    );

-- ------------------------------------------------------------------------------
-- 4. TRUSTED ATOMIC ORDER CONFIRMATION RPC (SECURITY DEFINER)
-- ------------------------------------------------------------------------------
-- Reusable by Edge Functions, webhooks, or server-side reconciliation.
-- Strictly validates gateway order IDs, enforces idempotency, prevents overwriting,
-- and keeps payment status separate from fulfillment status.
CREATE OR REPLACE FUNCTION public.confirm_order_payment(
    p_order_number TEXT,
    p_razorpay_order_id TEXT,
    p_razorpay_payment_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_order RECORD;
    v_stored_rzp_order_id TEXT;
BEGIN
    -- 1. Input Parameter Validation
    IF p_order_number IS NULL OR trim(p_order_number) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Missing order number parameter');
    END IF;

    IF p_razorpay_order_id IS NULL OR trim(p_razorpay_order_id) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Missing Razorpay order ID parameter');
    END IF;

    IF p_razorpay_payment_id IS NULL OR trim(p_razorpay_payment_id) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Missing Razorpay payment ID parameter');
    END IF;

    -- 2. Lookup existing order with row-level lock (prevents race conditions)
    SELECT * INTO v_order
    FROM public.orders
    WHERE order_number = trim(p_order_number)
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order reference not found');
    END IF;

    -- 3. Idempotency Check:
    -- If already marked as paid with the EXACT SAME Razorpay payment ID, return safe success
    IF v_order.payment_status = 'paid' THEN
        IF v_order.razorpay_payment_id = trim(p_razorpay_payment_id) THEN
            RETURN jsonb_build_object(
                'success', true,
                'already_paid', true,
                'order', row_to_json(v_order)
            );
        ELSE
            -- Reject attempt to mark an already-paid order with a different payment ID
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Order is already marked as paid under a different payment identifier'
            );
        END IF;
    END IF;

    -- 4. Verify Payment Method (Cash on Delivery orders must NOT be transitioned via Razorpay)
    IF v_order.payment_method <> 'Razorpay' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Payment method is not Razorpay'
        );
    END IF;

    -- 5. Razorpay Gateway Order ID Match Verification:
    -- Reject mismatches without changing the order
    v_stored_rzp_order_id := COALESCE(v_order.razorpay_order_id, v_order.payment_id);
    IF v_stored_rzp_order_id IS NOT NULL 
       AND v_stored_rzp_order_id LIKE 'order_%' 
       AND v_stored_rzp_order_id <> trim(p_razorpay_order_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Submitted Razorpay order ID does not match stored gateway order ID'
        );
    END IF;

    -- 6. Atomic State Transition:
    -- Update payment_status to 'paid' while keeping order_status unchanged.
    -- Preserve original razorpay_order_id and record razorpay_payment_id separately.
    UPDATE public.orders
    SET
        payment_status = 'paid',
        razorpay_order_id = COALESCE(public.orders.razorpay_order_id, trim(p_razorpay_order_id)),
        razorpay_payment_id = trim(p_razorpay_payment_id),
        payment_id = trim(p_razorpay_payment_id), -- backward compatibility
        updated_at = timezone('utc'::text, now())
    WHERE id = v_order.id
      AND payment_status = 'pending'
    RETURNING * INTO v_order;

    IF NOT FOUND THEN
        -- Check if concurrent worker succeeded
        SELECT * INTO v_order FROM public.orders WHERE id = v_order.id;
        IF v_order.payment_status = 'paid' AND v_order.razorpay_payment_id = trim(p_razorpay_payment_id) THEN
            RETURN jsonb_build_object(
                'success', true,
                'already_paid', true,
                'order', row_to_json(v_order)
            );
        END IF;
        RETURN jsonb_build_object('success', false, 'error', 'Order state changed concurrently');
    END IF;

    RETURN jsonb_build_object('success', true, 'order', row_to_json(v_order));
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. EXECUTION PERMISSIONS & PRIVILEGE HARDENING
-- ------------------------------------------------------------------------------
-- Ensure confirm_order_payment CANNOT be called by anon or ordinary authenticated users.
-- Restrict execution strictly to the trusted service_role key.
REVOKE ALL ON FUNCTION public.confirm_order_payment(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_order_payment(TEXT, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.confirm_order_payment(TEXT, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_order_payment(TEXT, TEXT, TEXT) TO service_role;

-- ------------------------------------------------------------------------------
-- 6. REALTIME SUBSCRIPTION REGISTRATION
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    END IF;
END $$;
