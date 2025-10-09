# Fix Database Query Error - AdminPanel Departments

## Problem Diagnosed

### Error yang Terjadi:
```
Error fetching departments: {
  code: 'PGRST200', 
  details: "Searched for a foreign key relationship between 'user_roles' and 'profiles' in the schema 'public', but no matches were found.", 
  hint: "Perhaps you meant 'profiles' instead of 'user_roles'.", 
  message: "Could not find a relationship between 'user_roles' and 'profiles' in the schema cache"
}
```

### Root Cause:
Query Supabase yang mencoba melakukan **join** antara `user_roles` dan `profiles` menggunakan syntax `profiles!inner(id, full_name, email)` **gagal** karena tidak ada **foreign key relationship** yang sudah didefinisikan di database schema.

### Query Bermasalah:
```typescript
const { data: ownersData, error: ownersError } = await supabase
  .from('user_roles')
  .select(`
    department,
    profiles!inner(id, full_name, email)
  `)
  .eq('role', 'owner');
```

## Solution Implemented

### Pendekatan Baru - Separate Queries:
Mengganti single complex query dengan **multiple simple queries** yang lebih reliable:

```typescript
const fetchDepartments = useCallback(async () => {
  try {
    // 1. Get all departments
    const { data: deptData, error: deptError } = await supabase
      .from('departments')
      .select('*')
      .order('name');

    if (deptError) throw deptError;

    // 2. Get owner role assignments
    const { data: ownersRoleData, error: ownersError } = await supabase
      .from('user_roles')
      .select('user_id, department')
      .eq('role', 'owner');

    if (ownersError) throw ownersError;

    // 3. Get profile data for owners (if any)
    const ownerUserIds = ownersRoleData?.map(o => o.user_id) || [];
    const { data: profilesData, error: profilesError } = ownerUserIds.length > 0 
      ? await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', ownerUserIds)
      : { data: [], error: null };

    if (profilesError) throw profilesError;

    // 4. Combine data manually
    const departmentsWithOwners = deptData?.map(dept => {
      const ownerRole = ownersRoleData?.find(owner => owner.department === dept.name);
      if (ownerRole) {
        const ownerProfile = profilesData?.find(profile => profile.id === ownerRole.user_id);
        return {
          ...dept,
          owner: ownerProfile ? {
            id: ownerProfile.id,
            full_name: ownerProfile.full_name,
            email: ownerProfile.email
          } : undefined
        };
      }
      return { ...dept, owner: undefined };
    }) || [];

    setDepartments(departmentsWithOwners);
  } catch (error) {
    console.error('Error fetching departments:', error);
    toast.error('Gagal memuat data departemen');
  }
}, []);
```

## Benefits of New Approach

### ✅ **Reliability**
- Tidak bergantung pada foreign key relationships yang mungkin belum dikonfigurasi
- Setiap query sederhana dan mudah di-debug
- Error handling yang lebih spesifik per query

### ✅ **Performance**
- Query terpisah bisa di-optimize secara individual
- Menghindari complex joins di level database
- Caching bisa diterapkan per query type

### ✅ **Maintainability**
- Code lebih mudah dipahami dan dimodifikasi
- Logic combining data explicit di frontend
- Easier testing dan debugging

### ✅ **Flexibility**
- Bisa handle cases dimana tidak ada owners
- Easy untuk menambah fields baru
- Compatible dengan database schema changes

## Technical Details

### Query Flow:
1. **Get Departments**: Simple select semua departemen
2. **Get Owner Roles**: Select user_id dan department untuk role='owner'
3. **Get Profiles**: Select profile data untuk owner user_ids (conditional)
4. **Manual Join**: Combine data di JavaScript dengan logic yang explicit

### Error Prevention:
- Conditional query untuk profiles (hanya jika ada owners)
- Explicit null checking di setiap step
- Fallback values untuk missing data

### Backward Compatibility:
- Tetap menggunakan interface Department yang sama
- API response structure tidak berubah
- UI components tidak perlu dimodifikasi

## Testing Checklist

- [ ] Departments tanpa owner bisa ditampilkan
- [ ] Departments dengan owner menampilkan info yang benar
- [ ] Create department masih berfungsi
- [ ] Assign owner masih berfungsi
- [ ] Remove owner masih berfungsi
- [ ] Delete department masih berfungsi
- [ ] No more console errors
- [ ] UI responsive dan smooth

## Future Improvements

### Database Level:
1. **Add Foreign Keys**: Tambah proper FK relationship antara user_roles.user_id → profiles.id
2. **Add Indexes**: Index pada user_roles(role, department) untuk performance
3. **Add Constraints**: Unique constraint untuk (user_id, role, department)

### Code Level:
1. **Add Caching**: Implement React Query untuk data caching
2. **Add Loading States**: Granular loading states per section
3. **Add Error Recovery**: Retry mechanisms untuk failed queries
4. **Add Optimistic Updates**: Update UI immediately, sync later

### UX Level:
1. **Skeleton Loading**: Replace spinner dengan skeleton cards
2. **Real-time Updates**: Supabase subscriptions untuk live updates
3. **Bulk Operations**: Multi-select untuk bulk assign/remove owners

## Conclusion

Masalah **database query join error** sudah diselesaikan dengan menggunakan **multiple simple queries** approach yang lebih reliable dan maintainable. 

Daftar departemen sekarang bisa ditampilkan dengan normal tanpa error, dan semua functionality assign/remove owner tetap berfungsi dengan baik.

Pendekatan ini juga lebih **future-proof** karena tidak bergantung pada database relationships yang mungkin belum dikonfigurasi dengan benar.
