-- Insert dummy departments
INSERT INTO departments (id, name, description) VALUES 
  ('dept-1', 'Teknologi Informasi', 'Department IT'),
  ('dept-2', 'Marketing', 'Department Marketing'),
  ('dept-3', 'Akademik', 'Department Akademik')
ON CONFLICT (id) DO NOTHING;

-- Insert dummy categories
INSERT INTO categories (id, name, description) VALUES 
  ('cat-1', 'Komputer', 'Perangkat komputer dan laptop'),
  ('cat-2', 'Proyektor', 'Perangkat proyektor dan presentasi'),
  ('cat-3', 'Audio', 'Perangkat audio dan sound system')
ON CONFLICT (id) DO NOTHING;

-- Insert dummy items
INSERT INTO items (id, name, code, description, category_id, department_id, quantity, available_quantity, status, location) VALUES 
  ('item-1', 'Laptop Asus', 'IT-001', 'Laptop untuk presentasi', 'cat-1', 'dept-1', 5, 5, 'available', 'Lab IT'),
  ('item-2', 'Proyektor Epson', 'PRJ-001', 'Proyektor untuk ruang kelas', 'cat-2', 'dept-3', 3, 3, 'available', 'Ruang Audio Visual'),
  ('item-3', 'Speaker Bluetooth', 'AUD-001', 'Speaker portable untuk acara', 'cat-3', 'dept-2', 2, 2, 'available', 'Ruang Event')
ON CONFLICT (id) DO NOTHING;