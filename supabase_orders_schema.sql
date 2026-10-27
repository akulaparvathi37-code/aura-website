-- ==============================================================================
-- AURA LUXURY ATELIER — ORDERS & ORDER ITEMS SCHEMA AND RLS POLICIES
-- ==============================================================================
-- Run this script in the Supabase Dashboard SQL Editor (https://supabase.com/dashboard)
-- to ensure orders and order_items tables, indexes, and Row Level Security policies
-- are properly configured for authenticated users and guest checkouts.

-- 1. Create public.orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    shipping_address JSONB NOT NULL,
    subtotal NUMERIC NOT NULL,
    shipping_fee NUMERIC NOT NULL DEFAULT 0,
    total_amount NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('paid', 'pending', 'failed', 'refunded')),
    payment_id TEXT,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    guest_token TEXT,
    payment_method TEXT NOT NULL DEFAULT 'Razorpay',
    order_status TEXT NOT NULL DEFAULT 'Pending' CHECK (order_status IN ('Pending', 'Processing', 'Shipping', 'Delivered', 'Cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Create public.order_items table
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    product_type TEXT NOT NULL DEFAULT 'saree',
    name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    image TEXT,
    variant TEXT,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. High Performance Indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users or guests to insert new orders strictly in 'pending' status
DROP POLICY IF EXISTS "Enable insert for authenticated users and guests" ON public.orders;
CREATE POLICY "Enable insert for authenticated users and guests"
    ON public.orders
    FOR INSERT
    WITH CHECK (
        (auth.uid() = user_id OR user_id IS NULL)
        AND payment_status = 'pending'
        AND order_status = 'Pending'
        AND total_amount >= 0
    );

-- Allow authenticated users to view only their own orders (Admins can view all)
DROP POLICY IF EXISTS "Users can view only their own orders" ON public.orders;
CREATE POLICY "Users can view only their own orders"
    ON public.orders
    FOR SELECT
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_admin = true)
        )
    );

-- Allow admins full access to manage all orders (Update/Delete strictly restricted to admins)
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

-- Allow inserting order items only for orders owned by the caller
DROP POLICY IF EXISTS "Enable insert for order items" ON public.order_items;
CREATE POLICY "Enable insert for order items"
    ON public.order_items
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
            AND (orders.user_id = auth.uid() OR orders.user_id IS NULL)
        )
    );

-- Allow users to view order items for their own orders (Admins can view all)
DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;
CREATE POLICY "Users can view their own order items"
    ON public.order_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
            AND (
                orders.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_admin = true)
                )
            )
        )
    );

-- 5. Realtime publication for orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
