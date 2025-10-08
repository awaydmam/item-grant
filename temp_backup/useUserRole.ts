import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface UserRole {
  id: string;
  user_id: string;
  role: "admin" | "owner" | "headmaster" | "borrower";
  department_id?: string;
  created_at: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

export const useUserRole = () => {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [userDepartment, setUserDepartment] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserRoles();
  }, []);

  const fetchUserRoles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUser(null);
        setRoles([]);
        setUserDepartment(null);
        setLoading(false);
        return;
      }

      setUser(user);

      // Fetch user roles with department info
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id);

      if (rolesError) throw rolesError;

      setRoles(userRoles || []);

      // Fetch user department if they have owner role
      const ownerRole = userRoles?.find(r => r.role === "owner");
      if (ownerRole?.department_id) {
        const { data: dept, error: deptError } = await supabase
          .from("departments")
          .select("*")
          .eq("id", ownerRole.department_id)
          .single();

        if (!deptError && dept) {
          setUserDepartment(dept);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching user roles:', err);
    } finally {
      setLoading(false);
    }
  };

  // Role checking functions
  const hasRole = (role: string): boolean => {
    return roles.some(r => r.role === role);
  };

  const isBorrower = (): boolean => hasRole("borrower");
  const isOwner = (): boolean => hasRole("owner");
  const isHeadmaster = (): boolean => hasRole("headmaster");
  const isAdmin = (): boolean => hasRole("admin");

  // Permission functions based on workflow spec
  const canViewInventory = (): boolean => {
    return true; // All roles can view inventory
  };

  const canAddToCart = (): boolean => {
    return isBorrower() || isOwner() || isAdmin();
  };

  const canCreateRequest = (): boolean => {
    return isBorrower() || isOwner() || isAdmin();
  };

  const canManageItems = (): boolean => {
    return isOwner() || isAdmin();
  };

  const canApproveRequests = (): boolean => {
    return isOwner() || isHeadmaster() || isAdmin();
  };

  const canManageUsers = (): boolean => {
    return isAdmin();
  };

  const canCreateDepartments = (): boolean => {
    return isAdmin();
  };

  const canAssignRoles = (): boolean => {
    return isAdmin();
  };

  const canViewPublicBoard = (): boolean => {
    return true; // All roles can view public board
  };

  const canStartEndLoan = (): boolean => {
    return isBorrower() || isOwner() || isAdmin();
  };

  const canPrintLetter = (): boolean => {
    // Borrower can print after approval, others can print anytime
    return true;
  };

  const canUploadExcel = (): boolean => {
    return isOwner() || isAdmin();
  };

  // Department-specific permissions
  const canManageItemsInDepartment = (departmentId: string): boolean => {
    if (isAdmin()) return true;
    if (isOwner() && userDepartment?.id === departmentId) return true;
    return false;
  };

  const canApproveRequestsInDepartment = (departmentId: string): boolean => {
    if (isAdmin() || isHeadmaster()) return true;
    if (isOwner() && userDepartment?.id === departmentId) return true;
    return false;
  };

  // Legacy compatibility
  const canManageInventory = (): boolean => canManageItems();

  // Get user's department (for owners)
  const getUserDepartment = (): Department | null => {
    return userDepartment;
  };

  // Get user's role display names
  const getRoleLabels = (): string[] => {
    const roleNames: Record<string, string> = {
      admin: "Administrator",
      owner: "Pemilik Departemen",
      headmaster: "Kepala Sekolah", 
      borrower: "Peminjam"
    };

    return roles.map(r => roleNames[r.role] || r.role);
  };

  // Get highest role (for UI display)
  const getPrimaryRole = (): string => {
    if (isAdmin()) return "admin";
    if (isHeadmaster()) return "headmaster";
    if (isOwner()) return "owner";
    if (isBorrower()) return "borrower";
    return "guest";
  };

  // Navigation permissions (for bottom nav)
  const canAccessInventory = (): boolean => canViewInventory();
  const canAccessRequests = (): boolean => canCreateRequest();
  const canAccessPublicBoard = (): boolean => canViewPublicBoard();
  const canAccessInbox = (): boolean => canApproveRequests();
  const canAccessProfile = (): boolean => true;

  return {
    user,
    roles,
    userDepartment,
    loading,
    error,
    
    // Role checks
    hasRole,
    isBorrower,
    isOwner, 
    isHeadmaster,
    isAdmin,

    // Permissions
    canViewInventory,
    canAddToCart,
    canCreateRequest,
    canManageItems,
    canApproveRequests,
    canManageUsers,
    canCreateDepartments,
    canAssignRoles,
    canViewPublicBoard,
    canStartEndLoan,
    canPrintLetter,
    canUploadExcel,

    // Department-specific
    canManageItemsInDepartment,
    canApproveRequestsInDepartment,
    
    // Legacy compatibility
    canManageInventory,
    
    // Utility
    getUserDepartment,
    getRoleLabels,
    getPrimaryRole,

    // Navigation
    canAccessInventory,
    canAccessRequests,
    canAccessPublicBoard,
    canAccessInbox,
    canAccessProfile,

    // Refresh function
    refetch: fetchUserRoles
  };
};