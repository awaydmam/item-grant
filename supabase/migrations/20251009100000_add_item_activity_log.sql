-- Create item activity log table untuk tracking semua perubahan
CREATE TABLE public.item_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID REFERENCES public.items(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  action_type TEXT NOT NULL, -- 'created', 'updated', 'borrowed', 'returned', 'status_changed'
  old_values JSONB,
  new_values JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index untuk performa
CREATE INDEX idx_item_activity_logs_item_id ON public.item_activity_logs(item_id);
CREATE INDEX idx_item_activity_logs_created_at ON public.item_activity_logs(created_at);

-- RLS policies
ALTER TABLE public.item_activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy untuk read - semua authenticated user bisa baca
CREATE POLICY "item_activity_logs_read" ON public.item_activity_logs
  FOR SELECT TO authenticated
  USING (true);

-- Policy untuk insert - hanya authenticated user yang bisa insert
CREATE POLICY "item_activity_logs_insert" ON public.item_activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);