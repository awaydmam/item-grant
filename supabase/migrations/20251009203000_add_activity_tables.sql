-- Create item_activities table for tracking item changes
CREATE TABLE IF NOT EXISTS public.item_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'loaned', 'returned', 'maintenance', 'damaged', etc.
    old_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    quantity_changed INTEGER NOT NULL, -- can be negative for reductions
    reason TEXT,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create public_activities table for public activity feed
CREATE TABLE IF NOT EXISTS public.public_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id UUID REFERENCES public.borrow_requests(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    action VARCHAR(50) NOT NULL, -- 'loan_started', 'loan_completed', etc.
    description TEXT NOT NULL,
    items_summary JSONB, -- summary of items involved
    metadata JSONB, -- additional context like location, purpose, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_item_activities_item_id ON public.item_activities(item_id);
CREATE INDEX IF NOT EXISTS idx_item_activities_created_at ON public.item_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_activities_created_at ON public.public_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_activities_user_id ON public.public_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_public_activities_request_id ON public.public_activities(request_id);

-- Enable Row Level Security
ALTER TABLE public.item_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for item_activities
CREATE POLICY "Users can view item activities" ON public.item_activities
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert item activities" ON public.item_activities
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for public_activities (readable by all authenticated users)
CREATE POLICY "Users can view public activities" ON public.public_activities
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert public activities" ON public.public_activities
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');