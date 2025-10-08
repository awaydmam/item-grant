-- Insert dummy categories
INSERT INTO public.categories (id, name, description) VALUES
  ('00000000-0000-4000-8000-000000000001', 'Electronics', 'Electronic devices and equipment'),
  ('00000000-0000-4000-8000-000000000002', 'Audio/Video', 'Audio and video equipment'),
  ('00000000-0000-4000-8000-000000000003', 'Sports', 'Sports and recreation equipment'),
  ('00000000-0000-4000-8000-000000000004', 'Office', 'Office supplies and equipment'),
  ('00000000-0000-4000-8000-000000000005', 'Laboratory', 'Laboratory equipment and tools');

-- Insert dummy departments
INSERT INTO public.departments (id, name, description, contact_person) VALUES
  ('00000000-0000-4000-8000-000000000011', 'Media Center', 'Pusat Media dan Komunikasi', 'Ahmad Rifai'),
  ('00000000-0000-4000-8000-000000000012', 'IT Department', 'Teknologi Informasi', 'Siti Nurhaliza'),
  ('00000000-0000-4000-8000-000000000013', 'Sports Department', 'Bidang Olahraga', 'Budi Santoso'),
  ('00000000-0000-4000-8000-000000000014', 'Academic Office', 'Tata Usaha Akademik', 'Dewi Kartika'),
  ('00000000-0000-4000-8000-000000000015', 'Laboratory', 'Laboratorium Sains', 'Dr. Hendra');

-- Insert dummy items
INSERT INTO public.items (id, name, code, description, quantity, available_quantity, status, location, category_id, department_id, image_url) VALUES
  (
    '00000000-0000-4000-8000-000000000021',
    'Canon EOS 90D Camera',
    'CAM-001',
    'Professional DSLR camera with 32.5MP sensor',
    2,
    2,
    'available',
    'Media Storage Room A1',
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000011',
    'https://images.unsplash.com/photo-1606983340431-be5d06b7e4a9?w=400'
  ),
  (
    '00000000-0000-4000-8000-000000000022',
    'Manfrotto Tripod MK055',
    'TRI-001',
    'Professional carbon fiber tripod with fluid head',
    3,
    3,
    'available',
    'Media Storage Room A1',
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000011',
    'https://images.unsplash.com/photo-1481395399277-7de56b5a355e?w=400'
  ),
  (
    '00000000-0000-4000-8000-000000000023',
    'Rode VideoMic Pro+',
    'MIC-001',
    'Professional on-camera microphone with advanced features',
    4,
    4,
    'available',
    'Media Storage Room A1',
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000011',
    'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=400'
  ),
  (
    '00000000-0000-4000-8000-000000000024',
    'MacBook Pro 16inch',
    'LAP-001',
    'Apple MacBook Pro with M2 chip for video editing',
    2,
    1,
    'available',
    'IT Room B2',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000012',
    'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400'
  ),
  (
    '00000000-0000-4000-8000-000000000025',
    'Sony A7R V',
    'CAM-002',
    'Full-frame mirrorless camera with 61MP resolution',
    1,
    1,
    'available',
    'Media Storage Room A1',
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000011',
    'https://images.unsplash.com/photo-1606983340126-1caaf24d7ba6?w=400'
  ),
  (
    '00000000-0000-4000-8000-000000000026',
    'DJI Mini 3 Pro',
    'DRO-001',
    'Lightweight drone with 4K camera and obstacle avoidance',
    1,
    0,
    'borrowed',
    'Media Storage Room A1',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000011',
    'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=400'
  ),
  (
    '00000000-0000-4000-8000-000000000027',
    'Godox SL-60W LED Light',
    'LIG-001',
    'Professional LED video light with bowens mount',
    6,
    5,
    'available',
    'Media Storage Room A1',
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000011',
    'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400'
  ),
  (
    '00000000-0000-4000-8000-000000000028',
    'Basketball',
    'SPO-001',
    'Official size basketball for sports activities',
    10,
    8,
    'available',
    'Sports Equipment Room',
    '00000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000013',
    'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400'
  ),
  (
    '00000000-0000-4000-8000-000000000029',
    'Projector Epson EB-X41',
    'PRO-001',
    'XGA 3LCD projector for presentations',
    3,
    2,
    'available',
    'Equipment Room C1',
    '00000000-0000-4000-8000-000000000004',
    '00000000-0000-4000-8000-000000000014',
    'https://images.unsplash.com/photo-1560472354-34b54c8c9e4b?w=400'
  ),
  (
    '00000000-0000-4000-8000-000000000030',
    'Microscope Olympus CX23',
    'MIC-002',
    'Biological microscope for laboratory use',
    5,
    5,
    'available',
    'Science Lab Room D1',
    '00000000-0000-4000-8000-000000000005',
    '00000000-0000-4000-8000-000000000015',
    'https://images.unsplash.com/photo-1582719471044-9b9c4af2b5ab?w=400'
  );

-- You can run this to add sample data if needed in development
-- Note: Make sure user_roles are set up for testing users