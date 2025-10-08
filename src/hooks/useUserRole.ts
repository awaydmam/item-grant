import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserRole {
  role: string;
  department: string;
}

export const useUserRole = () => {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserRoles();
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
    loading,
    error,
    hasRole,
    isOwner,
    isAdmin,
    isHeadmaster,
    isBorrower,
    getUserDepartment,
    canManageInventory,
    canApproveRequests,
    getRoleLabels,
    refetch: fetchUserRoles
  };
};