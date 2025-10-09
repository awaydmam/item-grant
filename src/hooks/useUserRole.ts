import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserRole {
  role: string;
  department: string;
}

interface Department {
  id: string;
  name: string;
}

export const useUserRole = () => {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserRoles();
    fetchDepartments();
  }, []);

  const fetchUserRoles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: userRoles, error } = await supabase
        .from('user_roles')
        .select('role, department')
        .eq('user_id', user.id);

      if (error) throw error;

      setRoles(userRoles || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data: departmentsData, error } = await supabase
        .from('departments')
        .select('id, name');

      if (error) throw error;

      setDepartments(departmentsData || []);
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  const hasRole = (role: string): boolean => {
    return roles.some(r => r.role === role);
  };

  const isOwner = (): boolean => hasRole('owner');
  const isAdmin = (): boolean => hasRole('admin');
  const isHeadmaster = (): boolean => hasRole('headmaster');
  const isBorrower = (): boolean => hasRole('borrower');

  const getUserDepartment = (): string | null => {
    const ownerRole = roles.find(r => r.role === 'owner');
    return ownerRole?.department || null;
  };

  const getUserDepartmentId = (): string | null => {
    const ownerRole = roles.find(r => r.role === 'owner');
    console.log('🔍 getUserDepartmentId - Owner role found:', ownerRole);
    
    if (!ownerRole?.department) {
      console.log('🔍 getUserDepartmentId - No owner role or department found');
      return null;
    }
    
    console.log('🔍 getUserDepartmentId - Looking for department name:', ownerRole.department);
    console.log('🔍 getUserDepartmentId - Available departments:', departments);
    
    // Cari department ID berdasarkan nama department
    const department = departments.find(d => d.name === ownerRole.department);
    console.log('🔍 getUserDepartmentId - Found department object:', department);
    
    const result = department?.id || null;
    console.log('🔍 getUserDepartmentId - Returning ID:', result);
    
    return result;
  };

  const canManageInventory = (): boolean => {
    return isAdmin() || isOwner();
  };

  const canApproveRequests = (): boolean => {
    return isAdmin() || isOwner() || isHeadmaster();
  };

  const getRoleLabels = (): string[] => {
    const roleMap: Record<string, string> = {
      borrower: 'Peminjam',
      owner: 'Pemilik Alat',
      headmaster: 'Kepala Sekolah',
      admin: 'Administrator'
    };

    return roles.map(r => roleMap[r.role] || r.role);
  };

  return {
    roles,
    departments,
    loading,
    error,
    hasRole,
    isOwner,
    isAdmin,
    isHeadmaster,
    isBorrower,
    getUserDepartment,
    getUserDepartmentId,
    canManageInventory,
    canApproveRequests,
    getRoleLabels,
    refetch: fetchUserRoles
  };
};