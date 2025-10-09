-- Add department column to categories table for department-specific categories
ALTER TABLE public.categories 
ADD COLUMN department TEXT REFERENCES public.departments(name);

-- Update existing categories to be global (no department restriction)
-- Existing categories will remain accessible to all departments

-- Drop existing admin-only policy
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;

-- Create new policies for department-specific category management
CREATE POLICY "Admins can manage all categories"
  ON public.categories FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can manage their department categories"
  ON public.categories FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'owner') AND 
    (
      department IS NULL OR -- Global categories accessible to all
      department IN (
        SELECT ur.department 
        FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() 
        AND ur.role = 'owner'
      )
    )
  );

-- Categories viewable by authenticated users (existing policy is fine)
-- Users can see global categories (department IS NULL) and their department categories
DROP POLICY IF EXISTS "Categories viewable by authenticated" ON public.categories;

CREATE POLICY "Categories viewable by authenticated"
  ON public.categories FOR SELECT
  TO authenticated
  USING (
    department IS NULL OR -- Global categories
    department IN (
      SELECT ur.department 
      FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('owner', 'admin')
    )
  );