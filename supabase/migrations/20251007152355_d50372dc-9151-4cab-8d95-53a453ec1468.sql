-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE public.app_role AS ENUM ('admin', 'owner', 'headmaster', 'borrower');
CREATE TYPE public.request_status AS ENUM ('draft', 'pending_owner', 'pending_headmaster', 'approved', 'active', 'completed', 'rejected', 'cancelled');
CREATE TYPE public.item_status AS ENUM ('available', 'reserved', 'borrowed', 'maintenance', 'damaged', 'lost');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  department TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  unit TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Departments/Owners table
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  contact_person TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Items/Assets table
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  category_id UUID REFERENCES public.categories(id),
  department_id UUID REFERENCES public.departments(id) NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  available_quantity INTEGER NOT NULL DEFAULT 1,
  status item_status NOT NULL DEFAULT 'available',
  location TEXT,
  image_url TEXT,
  accessories JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Borrow requests table
CREATE TABLE public.borrow_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  borrower_id UUID REFERENCES public.profiles(id) NOT NULL,
  status request_status NOT NULL DEFAULT 'draft',
  purpose TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  location_usage TEXT,
  pic_name TEXT NOT NULL,
  pic_contact TEXT NOT NULL,
  owner_notes TEXT,
  owner_reviewed_by UUID REFERENCES public.profiles(id),
  owner_reviewed_at TIMESTAMPTZ,
  headmaster_notes TEXT,
  headmaster_approved_by UUID REFERENCES public.profiles(id),
  headmaster_approved_at TIMESTAMPTZ,
  letter_number TEXT,
  letter_generated_at TIMESTAMPTZ,
  rejection_reason TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Request items (detail of what's borrowed)
CREATE TABLE public.request_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES public.borrow_requests(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES public.items(id) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  accessories_checklist JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  condition_on_borrow TEXT,
  condition_on_return TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrow_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS Policies

-- Profiles: Users can view all profiles, update their own
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- User roles: Viewable by authenticated users, manageable by admins
CREATE POLICY "User roles viewable by authenticated"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage user roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Categories: Public read, admin write
CREATE POLICY "Categories viewable by authenticated"
  ON public.categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Departments: Public read, admin write
CREATE POLICY "Departments viewable by authenticated"
  ON public.departments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage departments"
  ON public.departments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Items: Public read, owners and admins can manage
CREATE POLICY "Items viewable by authenticated"
  ON public.items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Owners can manage their department items"
  ON public.items FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    (public.has_role(auth.uid(), 'owner') AND 
     department_id IN (
       SELECT ur.department::uuid 
       FROM public.user_roles ur 
       WHERE ur.user_id = auth.uid() AND ur.role = 'owner'
     ))
  );

-- Borrow requests: Borrowers see their own, owners/headmaster see relevant ones
CREATE POLICY "Borrowers can view own requests"
  ON public.borrow_requests FOR SELECT
  TO authenticated
  USING (
    borrower_id = auth.uid() OR
    public.has_role(auth.uid(), 'owner') OR
    public.has_role(auth.uid(), 'headmaster') OR
    public.has_role(auth.uid(), 'admin') OR
    status IN ('active', 'completed')
  );

CREATE POLICY "Borrowers can create requests"
  ON public.borrow_requests FOR INSERT
  TO authenticated
  WITH CHECK (borrower_id = auth.uid());

CREATE POLICY "Borrowers can update own draft requests"
  ON public.borrow_requests FOR UPDATE
  TO authenticated
  USING (
    (borrower_id = auth.uid() AND status = 'draft') OR
    public.has_role(auth.uid(), 'owner') OR
    public.has_role(auth.uid(), 'headmaster') OR
    public.has_role(auth.uid(), 'admin')
  );

-- Request items: Follow request permissions
CREATE POLICY "Request items viewable with request"
  ON public.request_items FOR SELECT
  TO authenticated
  USING (
    request_id IN (
      SELECT id FROM public.borrow_requests
      WHERE borrower_id = auth.uid() OR
            public.has_role(auth.uid(), 'owner') OR
            public.has_role(auth.uid(), 'headmaster') OR
            public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Request items manageable by request owner"
  ON public.request_items FOR ALL
  TO authenticated
  USING (
    request_id IN (
      SELECT id FROM public.borrow_requests
      WHERE borrower_id = auth.uid() OR
            public.has_role(auth.uid(), 'owner') OR
            public.has_role(auth.uid(), 'headmaster') OR
            public.has_role(auth.uid(), 'admin')
    )
  );

-- Notifications: Users see their own
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_items
  BEFORE UPDATE ON public.items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_requests
  BEFORE UPDATE ON public.borrow_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, unit)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'unit', '')
  );
  
  -- Default role: borrower
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'borrower');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for public board
ALTER PUBLICATION supabase_realtime ADD TABLE public.borrow_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.request_items;