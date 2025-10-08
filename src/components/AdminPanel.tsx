import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, Plus, AlertCircle, ArrowLeft, Users, Building, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: string;
  email?: string;
  full_name?: string;
  phone?: string;
  unit?: string;
  roles: { role: string; department?: string }[];
}

interface Department {
  id: string;
  name: string;
  description?: string;
}

const AdminPanel = () => {
  const { roles, loading, isAdmin } = useUserRole();
  const navigate = useNavigate();
  const [accessDenied, setAccessDenied] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [newDepartment, setNewDepartment] = useState({ name: '', description: '' });
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<{id: string; email?: string} | null>(null);
  const [selectedDeptForOwner, setSelectedDeptForOwner] = useState<string>('');
  const [selectedUserForDept, setSelectedUserForDept] = useState<string>('');

  const fetchCurrentUser = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user);
      setCurrentUser(user);
      
      if (user) {
        const { data: userRoles, error } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', user.id);
          
        console.log('User roles from database:', userRoles);
        console.log('Query error:', error);
        
        // If no admin role exists, create one for current user
        if (userRoles && userRoles.length === 0) {
          console.log('No roles found for user, creating admin role...');
          await createAdminRole(user.id);
        }
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  }, []);

  useEffect(() => {
    console.log('AdminPanel useEffect started');
    console.log('Current roles:', roles);
    console.log('Loading state:', loading);
    console.log('Is admin result:', isAdmin());
    
    fetchCurrentUser();
    
    // Temporarily disable access control for debugging
    setAccessDenied(false); // Force allow access for debugging
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createAdminRole = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert([
          { user_id: userId, role: 'admin' }
        ]);
      
      if (error) throw error;
      console.log('Admin role created successfully');
      toast.success('Role admin berhasil dibuat');
      
      // Refresh user roles
      window.location.reload();
    } catch (error) {
      console.error('Error creating admin role:', error);
      toast.error('Gagal membuat role admin');
    }
  };

  useEffect(() => {
    if (!accessDenied) {
      fetchUsers();
      fetchDepartments();
    }
  }, [accessDenied]);

  const fetchUsers = async () => {
    try {
      console.log('Fetching users...');
      
      // Get user profiles first (this contains all registered users)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, phone, unit, created_at');
      
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      console.log('Profiles fetched:', profiles);

      // Get user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role, department');
      
      if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
        throw rolesError;
      }

      console.log('User roles fetched:', userRoles);

      // Combine data
      const usersWithRoles = (profiles || []).map(profile => {
        const userRolesData = userRoles?.filter(role => role.user_id === profile.id) || [];
        
        return {
          id: profile.id,
          email: '', // We'll get this from auth if needed
          full_name: profile.full_name,
          phone: profile.phone,
          unit: profile.unit,
          roles: userRolesData.map(r => ({ role: r.role, department: r.department }))
        };
      });

      console.log('Users with roles:', usersWithRoles);
      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Gagal mengambil data pengguna');
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('Gagal mengambil data departemen');
    }
  };

  const createDepartment = async () => {
    if (!newDepartment.name.trim()) {
      toast.error('Nama departemen tidak boleh kosong');
      return;
    }

    try {
      const { error } = await supabase
        .from('departments')
        .insert([newDepartment]);
      
      if (error) throw error;
      
      toast.success('Departemen berhasil dibuat');
      setNewDepartment({ name: '', description: '' });
      fetchDepartments();
    } catch (error) {
      console.error('Error creating department:', error);
      toast.error('Gagal membuat departemen');
    }
  };

  const deleteDepartment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('Departemen berhasil dihapus');
      fetchDepartments();
    } catch (error) {
      console.error('Error deleting department:', error);
      toast.error('Gagal menghapus departemen');
    }
  };

  const assignUserRole = async () => {
    if (!selectedUser || !selectedRole) {
      toast.error('Pilih pengguna dan role');
      return;
    }

    try {
      const insertData: {user_id: string; role: string; department?: string} = {
        user_id: selectedUser,
        role: selectedRole
      };

      if (selectedRole === 'owner' && selectedDepartment) {
        insertData.department = selectedDepartment;
      }

      const { error } = await supabase
        .from('user_roles')
        .insert([insertData]);
      
      if (error) throw error;
      
      toast.success('Role berhasil ditetapkan');
      setSelectedUser('');
      setSelectedRole('');
      setSelectedDepartment('');
      fetchUsers();
    } catch (error) {
      console.error('Error assigning role:', error);
      toast.error('Gagal menetapkan role');
    }
  };

  const assignOwnerToDepartment = async () => {
    if (!selectedUserForDept || !selectedDeptForOwner) {
      toast.error('Pilih pengguna dan departemen');
      return;
    }

    try {
      // First, remove any existing owner role for this department
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', selectedUserForDept)
        .eq('role', 'owner');

      // Then assign new owner role with department
      const { error } = await supabase
        .from('user_roles')
        .insert([{
          user_id: selectedUserForDept,
          role: 'owner',
          department: selectedDeptForOwner
        }]);
      
      if (error) throw error;
      
      toast.success('Owner departemen berhasil ditetapkan');
      setSelectedUserForDept('');
      setSelectedDeptForOwner('');
      fetchUsers();
    } catch (error) {
      console.error('Error assigning department owner:', error);
      toast.error('Gagal menetapkan owner departemen');
    }
  };

  const removeUserRole = async (userId: string, role: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);
      
      if (error) throw error;
      
      toast.success('Role berhasil dihapus');
      fetchUsers();
    } catch (error) {
      console.error('Error removing role:', error);
      toast.error('Gagal menghapus role');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Memuat...</div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertCircle className="h-16 w-16 text-red-500" />
        <h2 className="text-xl font-semibold">Akses Ditolak</h2>
        <p className="text-gray-600">Anda tidak memiliki izin untuk mengakses panel admin.</p>
        <div className="text-sm text-gray-500 space-y-1">
          <div>Current user: {currentUser?.email}</div>
          <div>Current roles: {JSON.stringify(roles)}</div>
          <div>Is admin: {isAdmin().toString()}</div>
        </div>
        {currentUser && (
          <Button onClick={() => createAdminRole(currentUser.id)} variant="outline">
            Buat Role Admin
          </Button>
        )}
      </div>
    );
  }

  const roleLabels = {
    admin: 'Administrator',
    owner: 'Pemilik Alat',
    headmaster: 'Kepala Sekolah',
    borrower: 'Peminjam'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Modern Header */}
      <div className="bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-200 sticky top-0 z-20">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                Panel Administrator
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 truncate">
                Kelola pengguna dan departemen sistem
              </p>
            </div>
          </div>
          <Badge 
            variant="secondary" 
            className="bg-blue-100 text-blue-800 border-blue-200 px-3 py-1 rounded-full font-medium text-xs"
          >
            Admin
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="space-y-6">
          {/* Welcome Card */}
          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">
                    Selamat Datang di Panel Admin
                  </h2>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Kelola pengguna, tetapkan peran, dan atur departemen untuk sistem manajemen inventaris sekolah.
                    Pastikan setiap departemen memiliki pemilik yang bertanggung jawab.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Tabs */}
          <Tabs defaultValue="users" className="space-y-6">
            <div className="border-b border-gray-200 bg-white rounded-t-xl">
              <TabsList className="grid w-full grid-cols-2 bg-transparent p-2">
                <TabsTrigger 
                  value="users" 
                  className="flex items-center gap-2 px-4 py-3 rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all"
                >
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline font-medium">Kelola Pengguna</span>
                  <span className="sm:hidden font-medium">Pengguna</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="departments" 
                  className="flex items-center gap-2 px-4 py-3 rounded-lg data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:shadow-sm transition-all"
                >
                  <Building className="h-4 w-4" />
                  <span className="hidden sm:inline font-medium">Kelola Departemen</span>
                  <span className="sm:hidden font-medium">Departemen</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="users" className="space-y-6">
              {/* Enhanced Assign Role Section */}
              <Card className="border-0 shadow-sm bg-white">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <UserPlus className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-gray-900">Tetapkan Role Pengguna</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">Berikan peran kepada pengguna sesuai tanggung jawab mereka</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="user" className="text-sm font-medium text-gray-700">Pilih Pengguna</Label>
                      <Select value={selectedUser} onValueChange={setSelectedUser}>
                        <SelectTrigger className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                          <SelectValue placeholder="Pilih pengguna" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map(user => (
                            <SelectItem key={user.id} value={user.id} className="py-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                  <span className="text-xs font-medium text-gray-600">
                                    {user.full_name ? user.full_name.charAt(0).toUpperCase() : '?'}
                                  </span>
                                </div>
                                <span>{user.full_name || `User ${user.id.substring(0, 8)}`}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role" className="text-sm font-medium text-gray-700">Pilih Role</Label>
                      <Select value={selectedRole} onValueChange={setSelectedRole}>
                        <SelectTrigger className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                          <SelectValue placeholder="Pilih role" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(roleLabels).map(([key, label]) => (
                            <SelectItem key={key} value={key} className="py-2">
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${
                                  key === 'admin' ? 'bg-red-500' : 
                                  key === 'owner' ? 'bg-green-500' : 
                                  key === 'headmaster' ? 'bg-purple-500' : 'bg-blue-500'
                                }`}></div>
                                {label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedRole === 'owner' && (
                      <div className="space-y-2">
                        <Label htmlFor="department" className="text-sm font-medium text-gray-700">Departemen</Label>
                        <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                          <SelectTrigger className="h-11 border-gray-200 focus:border-green-500 focus:ring-green-500">
                            <SelectValue placeholder="Pilih departemen" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map(dept => (
                              <SelectItem key={dept.id} value={dept.name}>
                                {dept.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="flex items-end">
                      <Button 
                        onClick={assignUserRole} 
                        className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Tetapkan Role
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Enhanced Users List */}
              <Card className="border-0 shadow-sm bg-white">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Users className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg text-gray-900">Daftar Pengguna ({users.length})</CardTitle>
                        <p className="text-sm text-gray-500 mt-1">Kelola peran dan hak akses pengguna</p>
                      </div>
                    </div>
                    <Button onClick={fetchUsers} variant="outline" size="sm" className="rounded-lg">
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {users.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Belum ada pengguna terdaftar</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {users.map(user => (
                        <div key={user.id} className="flex justify-between items-start p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl flex items-center justify-center">
                                <span className="text-sm font-semibold text-blue-700">
                                  {user.full_name ? user.full_name.charAt(0).toUpperCase() : '?'}
                                </span>
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">
                                  {user.full_name || 'Nama belum diatur'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  ID: {user.id.substring(0, 8)}...
                                </div>
                                {user.unit && (
                                  <div className="text-sm text-gray-500">
                                    Unit: {user.unit}
                                  </div>
                                )}
                                {user.phone && (
                                  <div className="text-sm text-gray-500">
                                    Phone: {user.phone}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="mt-3">
                              {user.roles.length === 0 ? (
                                <Badge variant="outline" className="text-gray-500 bg-gray-50 border-gray-200">
                                  Belum ada role
                                </Badge>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {user.roles.map((roleData, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                      <Badge 
                                        variant="outline" 
                                        className={`text-sm font-medium ${
                                          roleData.role === 'admin' ? 'bg-red-50 text-red-700 border-red-200' :
                                          roleData.role === 'owner' ? 'bg-green-50 text-green-700 border-green-200' :
                                          roleData.role === 'headmaster' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                          'bg-blue-50 text-blue-700 border-blue-200'
                                        }`}
                                      >
                                        <div className={`w-2 h-2 rounded-full mr-2 ${
                                          roleData.role === 'admin' ? 'bg-red-500' :
                                          roleData.role === 'owner' ? 'bg-green-500' :
                                          roleData.role === 'headmaster' ? 'bg-purple-500' :
                                          'bg-blue-500'
                                        }`}></div>
                                        {roleLabels[roleData.role as keyof typeof roleLabels]}
                                        {roleData.department && ` - ${roleData.department}`}
                                      </Badge>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => removeUserRole(user.id, roleData.role)}
                                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="departments" className="space-y-6">
              {/* Assign Owner to Department */}
              <Card className="border-0 shadow-sm bg-white">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <UserPlus className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-gray-900">Tetapkan Owner Departemen</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">Assign pengguna sebagai pemilik departemen untuk mengelola inventaris</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Alert className="border-green-200 bg-green-50">
                    <AlertCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Owner departemen dapat mengelola inventaris dan menerima notifikasi peminjaman untuk departemen mereka.
                    </AlertDescription>
                  </Alert>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="userForDept" className="text-sm font-medium text-gray-700">Pilih Pengguna</Label>
                      <Select value={selectedUserForDept} onValueChange={setSelectedUserForDept}>
                        <SelectTrigger className="h-11 border-gray-200 focus:border-green-500 focus:ring-green-500">
                          <SelectValue placeholder="Pilih pengguna" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map(user => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.full_name || `User ${user.id.substring(0, 8)}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="deptForOwner" className="text-sm font-medium text-gray-700">Pilih Departemen</Label>
                      <Select value={selectedDeptForOwner} onValueChange={setSelectedDeptForOwner}>
                        <SelectTrigger className="h-11 border-gray-200 focus:border-green-500 focus:ring-green-500">
                          <SelectValue placeholder="Pilih departemen" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map(dept => (
                            <SelectItem key={dept.id} value={dept.name}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-end">
                      <Button 
                        onClick={assignOwnerToDepartment} 
                        className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Tetapkan Owner
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Create Department */}
              <Card className="border-0 shadow-sm bg-white">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Building className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-gray-900">Buat Departemen Baru</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">Tambahkan departemen baru untuk organisasi inventaris</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium text-gray-700">Nama Departemen</Label>
                      <Input
                        id="name"
                        value={newDepartment.name}
                        onChange={(e) => setNewDepartment(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Contoh: Laboratorium IPA"
                        className="h-11 border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-sm font-medium text-gray-700">Deskripsi</Label>
                      <Input
                        id="description"
                        value={newDepartment.description}
                        onChange={(e) => setNewDepartment(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Deskripsi departemen"
                        className="h-11 border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button 
                        onClick={createDepartment} 
                        className="w-full h-11 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Buat Departemen
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Departments List */}
              <Card className="border-0 shadow-sm bg-white">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Building className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-gray-900">Daftar Departemen ({departments.length})</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">Kelola departemen yang ada dalam sistem</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {departments.map(dept => (
                      <div key={dept.id} className="flex justify-between items-center p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                        <div>
                          <div className="font-semibold text-gray-900">{dept.name}</div>
                          {dept.description && (
                            <div className="text-sm text-gray-500 mt-1">{dept.description}</div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteDepartment(dept.id)}
                          className="rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;