-- Perbaikan policy items agar tidak melakukan cast TEXT -> UUID pada kolom user_roles.department
-- Error yang muncul sebelumnya: 22P02 invalid input syntax for type uuid: "MEDIA"
-- Penyebab: Policy lama melakukan department_id IN (SELECT ur.department::uuid FROM public.user_roles ur ...)
-- Sedangkan kolom public.user_roles.department bertipe TEXT yang menyimpan NAMA departemen, bukan UUID.

BEGIN;

-- Drop policy lama jika ada
DROP POLICY IF EXISTS "Owners can manage their department items" ON public.items;

-- Policy baru: join ke tabel departments berdasarkan NAME, ambil ID yang valid
CREATE POLICY "Owners can manage their department items"
  ON public.items FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(),'admin') OR
    (
      public.has_role(auth.uid(),'owner') AND
      department_id IN (
        SELECT d.id
        FROM public.user_roles ur
        JOIN public.departments d ON d.name = ur.department
        WHERE ur.user_id = auth.uid() AND ur.role = 'owner'
      )
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin') OR
    (
      public.has_role(auth.uid(),'owner') AND
      department_id IN (
        SELECT d.id
        FROM public.user_roles ur
        JOIN public.departments d ON d.name = ur.department
        WHERE ur.user_id = auth.uid() AND ur.role = 'owner'
      )
    )
  );

-- Catatan:
-- Jangka panjang sebaiknya normalisasi: tambahkan kolom department_id UUID pada user_roles yang mereferensi departments(id)
-- kemudian migrasi data dan hapus kolom TEXT lama. Untuk sekarang cukup policy fix agar insert tidak gagal.

COMMIT;
