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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Trash2, Plus, AlertCircle, ArrowLeft, Users, Building, UserPlus, User, RefreshCw, ChevronRight, X, MoreVertical, UserMinus, Search, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: string;
  full_name?: string;
  phone?: string;
  unit?: string;
  roles: { role: string; department?: string }[];
}

interface DepartmentMember {
  id: string;
  full_name?: string;
  unit?: string;
  role: string;
}

interface Department {
  id: string;
  name: string;
  description?: string;
  members: DepartmentMember[];
}

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const { loading, isAdmin } = useUserRole();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [newDepartment, setNewDepartment] = useState({ name: '', description: '' });
  const [searchUser, setSearchUser] = useState('');
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedDeptForMember, setSelectedDeptForMember] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*');

      if (usersError) throw usersError;

      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      const usersWithRoles = usersData.map(user => ({
        ...user,
        roles: rolesData.filter(role => role.user_id === user.id)
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Gagal memuat data pengguna');
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (deptError) throw deptError;

      // Get all members for each department
      const { data: membersRoleData, error: membersError } = await supabase
        .from('user_roles')
        .select('user_id, department, role')
        .in('role', ['owner', 'admin'])
        .not('department', 'is', null);

      if (membersError) throw membersError;

      // Get profile data for all members
      const memberUserIds = membersRoleData?.map(m => m.user_id) || [];
      const { data: profilesData, error: profilesError } = memberUserIds.length > 0 
        ? await supabase
            .from('profiles')
            .select('id, full_name, unit')
            .in('id', memberUserIds)
        : { data: [], error: null };

      if (profilesError) throw profilesError;

      // Combine department data with members info
      const departmentsWithMembers = deptData?.map(dept => {
        const deptMembers = membersRoleData
          ?.filter(member => member.department === dept.name)
          .map(memberRole => {
            const memberProfile = profilesData?.find(profile => profile.id === memberRole.user_id);
            return memberProfile ? {
              id: memberProfile.id,
              full_name: memberProfile.full_name,
              unit: memberProfile.unit,
              role: memberRole.role
            } : null;
          })
          .filter(Boolean) || [];

        return {
          ...dept,
          members: deptMembers
        };
      }) || [];

      setDepartments(departmentsWithMembers);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('Gagal memuat data departemen');
    }
  }, []);

  useEffect(() => {
    if (!loading && !isAdmin()) {
      navigate('/');
      return;
    }

    if (isAdmin()) {
      fetchUsers();
      fetchDepartments();
    }
  }, [loading, isAdmin, navigate, fetchUsers, fetchDepartments]);

  const assignUserRole = async () => {
    if (!selectedUser || !selectedRole) {
      toast.error('Pilih pengguna dan role terlebih dahulu');
      return;
    }

    if (selectedRole === 'owner' && !selectedDepartment) {
      toast.error('Pilih departemen untuk role owner');
      return;
    }

    try {
      const insertData: {user_id: string; role: 'admin' | 'owner' | 'headmaster' | 'borrower'; department?: string} = {
        user_id: selectedUser,
        role: selectedRole as 'admin' | 'owner' | 'headmaster' | 'borrower'
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

  const removeUserRole = async (userId: string, role: string, department?: string) => {
    try {
      let query = supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role as 'admin' | 'owner' | 'headmaster' | 'borrower');
      
      if (department) {
        query = query.eq('department', department);
      }
      
      const { error } = await query;
      
      if (error) throw error;
      
      toast.success('Role berhasil dihapus');
      fetchUsers();
    } catch (error) {
      console.error('Error removing role:', error);
      toast.error('Gagal menghapus role');
    }
  };

  const assignOwnerToDept = async (departmentName: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert([{
          user_id: userId,
          role: 'owner',
          department: departmentName
        }]);

      if (error) throw error;
      
      toast.success('Anggota departemen berhasil ditambahkan');
      fetchUsers();
      fetchDepartments();
      setIsAddMemberOpen(false);
      setSearchUser('');
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error('Gagal menambahkan anggota departemen');
    }
  };

  const removeMemberFromDept = async (departmentName: string, userId: string, role: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role as 'admin' | 'owner' | 'headmaster' | 'borrower')
        .eq('department', departmentName);

      if (error) throw error;
      
      toast.success('Anggota departemen berhasil dihapus');
      fetchUsers();
      fetchDepartments();
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Gagal menghapus anggota departemen');
    }
  };

  // Get users who are available to be added to a specific department
  const getAvailableUsersForDepartment = (departmentName: string) => {
    const currentMembers = departments
      .find(dept => dept.name === departmentName)?.members?.map(m => m.id) || [];
    
    return users.filter(user => !currentMembers.includes(user.id));
  };

  // Get filtered users based on search
  const getFilteredUsers = (departmentName: string) => {
    const availableUsers = getAvailableUsersForDepartment(departmentName);
    if (!searchUser.trim()) return availableUsers;
    
    return availableUsers.filter(user => 
      user.full_name?.toLowerCase().includes(searchUser.toLowerCase()) ||
      user.unit?.toLowerCase().includes(searchUser.toLowerCase())
    );
  };

  const createDepartment = async () => {
    if (!newDepartment.name.trim()) {
      toast.error('Nama departemen harus diisi');
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

  const createAdminRole = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert([{ user_id: userId, role: 'admin' }]);

      if (error) throw error;
      
      toast.success('Role admin berhasil dibuat');
      fetchUsers();
    } catch (error) {
      console.error('Error creating admin role:', error);
      toast.error('Gagal membuat role admin');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Akses Ditolak</h1>
          <p className="text-gray-600 mb-6">Anda tidak memiliki akses ke halaman ini.</p>
          <Button onClick={() => navigate('/')}>Kembali ke Beranda</Button>
        </div>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-24 safe-area-pb">
      {/* Enhanced Mobile Header dengan Neumorphism */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="px-4 py-5 safe-area-pt">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/')}
                className="neu-button-raised rounded-xl hover:neu-button-pressed transition-all bg-gray-100 text-gray-700 hover:bg-gray-200 w-10 h-10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  Panel Administrator
                </h1>
                <p className="text-sm text-gray-600">
                  Kelola sistem inventaris
                </p>
              </div>
            </div>
            <Badge 
              variant="secondary" 
              className="neu-raised bg-blue-100 text-blue-800 border-0 px-3 py-1 rounded-full font-medium text-xs"
            >
              Admin
            </Badge>
          </div>
        </div>
      </div>

      {/* Content dengan Better Mobile Spacing */}
      <div className="px-4 py-6 space-y-6 max-w-7xl mx-auto">
        {/* Welcome Card dengan Neumorphism */}
        <Card className="neu-raised border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="neu-sunken p-3 rounded-xl bg-blue-100 flex-shrink-0">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
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

        {/* Enhanced Tabs dengan Neumorphism */}
        <Tabs defaultValue="users" className="space-y-6">
          <div className="neu-raised border-0 bg-white rounded-xl p-2">
            <TabsList className="grid w-full grid-cols-2 bg-transparent p-0 h-auto">
              <TabsTrigger 
                value="users" 
                className="flex items-center gap-2 px-4 py-3 rounded-lg data-[state=active]:neu-sunken data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 transition-all font-medium text-sm"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Kelola Pengguna</span>
                <span className="sm:hidden">Pengguna</span>
              </TabsTrigger>
              <TabsTrigger 
                value="departments" 
                className="flex items-center gap-2 px-4 py-3 rounded-lg data-[state=active]:neu-sunken data-[state=active]:bg-green-50 data-[state=active]:text-green-700 transition-all font-medium text-sm"
              >
                <Building className="h-4 w-4" />
                <span className="hidden sm:inline">Kelola Departemen</span>
                <span className="sm:hidden">Departemen</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="users" className="space-y-6">
            {/* Enhanced Assign Role Section dengan Neumorphism */}
            <Card className="neu-raised border-0 bg-white">
              <CardHeader className="pb-4">
                <div className="flex items-start gap-4">
                  <div className="neu-sunken p-3 rounded-xl bg-blue-100 flex-shrink-0">
                    <UserPlus className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg text-gray-900 mb-1">Tetapkan Peran Pengguna</CardTitle>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Assign peran kepada pengguna untuk mengakses fitur-fitur sistem sesuai tanggung jawab mereka.
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Alert dengan Neumorphism */}
                <div className="neu-sunken rounded-xl p-4 bg-blue-50/50">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <strong className="font-medium">Panduan Peran:</strong> Admin dapat mengelola semua aspek sistem. 
                      Owner bertanggung jawab atas inventaris departemen mereka. Headmaster dapat approve permintaan penting.
                    </div>
                  </div>
                </div>

                {/* Form dengan Mobile-Optimized Layout */}
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label htmlFor="user" className="text-sm font-semibold text-gray-800">Pilih Pengguna</Label>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 neu-sunken bg-gray-50">
                        <SelectValue placeholder="Pilih pengguna yang akan diberi peran" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.id} className="py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                                <User className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">
                                  {user.full_name || `User ${user.id.substring(0, 8)}`}
                                </div>
                                <div className="text-xs text-gray-500">{user.unit || 'Unit tidak diatur'}</div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="role" className="text-sm font-semibold text-gray-800">Pilih Peran</Label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 neu-sunken bg-gray-50">
                        <SelectValue placeholder="Pilih peran yang akan diberikan" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(roleLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key} className="py-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded-full flex-shrink-0 ${
                                key === 'admin' ? 'bg-red-500' : 
                                key === 'owner' ? 'bg-green-500' : 
                                key === 'headmaster' ? 'bg-purple-500' : 'bg-blue-500'
                              }`}></div>
                              <div>
                                <div className="font-medium">{label}</div>
                                <div className="text-xs text-gray-500">
                                  {key === 'admin' && 'Akses penuh sistem'}
                                  {key === 'owner' && 'Kelola inventaris departemen'}
                                  {key === 'headmaster' && 'Approve permintaan penting'}
                                  {key === 'borrower' && 'Peminjam standar'}
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedRole === 'owner' && (
                    <div className="space-y-3 neu-sunken rounded-xl p-4 bg-green-50/30">
                      <Label htmlFor="department" className="text-sm font-semibold text-green-800 flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        Departemen yang Dikelola
                      </Label>
                      <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                        <SelectTrigger className="h-12 border-green-200 focus:border-green-500 focus:ring-green-500 bg-white">
                          <SelectValue placeholder="Pilih departemen yang akan dikelola" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map(dept => (
                            <SelectItem key={dept.id} value={dept.name} className="py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                <div>
                                  <div className="font-medium">{dept.name}</div>
                                  {dept.description && (
                                    <div className="text-xs text-gray-500">{dept.description}</div>
                                  )}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Button 
                    onClick={assignUserRole} 
                    className="w-full h-12 neu-button-raised bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                    disabled={!selectedUser || !selectedRole || (selectedRole === 'owner' && !selectedDepartment)}
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Tetapkan Peran
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Users List dengan Neumorphism */}
            <Card className="neu-raised border-0 bg-white">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-4">
                    <div className="neu-sunken p-3 rounded-xl bg-green-100 flex-shrink-0">
                      <Users className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-gray-900">Daftar Pengguna ({users.length})</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">Kelola peran dan hak akses pengguna sistem</p>
                    </div>
                  </div>
                  <Button 
                    onClick={fetchUsers} 
                    variant="outline" 
                    size="sm" 
                    className="neu-button-raised rounded-lg hover:neu-button-pressed transition-all"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {users.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="neu-sunken rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-gray-100">
                      <AlertCircle className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium">Belum ada pengguna terdaftar</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {users.map(user => (
                      <div key={user.id} className="neu-raised rounded-xl p-5 hover:neu-sunken transition-all duration-200">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 neu-sunken rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-blue-700">
                              {user.full_name ? user.full_name.charAt(0).toUpperCase() : '?'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold text-gray-900 text-base">
                                  {user.full_name || 'Nama belum diatur'}
                                </h4>
                                <div className="text-sm text-gray-500 space-y-1 mt-1">
                                  <div>ID: {user.id.substring(0, 8)}...</div>
                                  {user.unit && <div>Unit: {user.unit}</div>}
                                  {user.phone && <div>Telepon: {user.phone}</div>}
                                </div>
                              </div>
                            </div>
                            
                            {/* Role Badges */}
                            <div className="mt-4">
                              {user.roles.length === 0 ? (
                                <Badge variant="outline" className="neu-sunken text-gray-500 bg-gray-50 border-0 px-3 py-1">
                                  Belum ada peran
                                </Badge>
                              ) : (
                                <div className="space-y-2">
                                  {/* Group roles by type */}
                                  {['admin', 'headmaster', 'borrower'].map(roleType => {
                                    const roleOfType = user.roles.find(r => r.role === roleType);
                                    if (!roleOfType) return null;
                                    
                                    return (
                                      <div key={roleType} className="flex items-center gap-2">
                                        <Badge 
                                          className={`neu-raised border-0 px-3 py-1 font-medium text-xs ${
                                            roleOfType.role === 'admin' ? 'bg-red-100 text-red-700' :
                                            roleOfType.role === 'headmaster' ? 'bg-purple-100 text-purple-700' :
                                            'bg-blue-100 text-blue-700'
                                          }`}
                                        >
                                          <div className={`w-2 h-2 rounded-full mr-2 ${
                                            roleOfType.role === 'admin' ? 'bg-red-500' :
                                            roleOfType.role === 'headmaster' ? 'bg-purple-500' :
                                            'bg-blue-500'
                                          }`}></div>
                                          {roleLabels[roleOfType.role as keyof typeof roleLabels]}
                                        </Badge>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => removeUserRole(user.id, roleOfType.role, roleOfType.department)}
                                          className="h-6 w-6 p-0 neu-button-raised rounded-full hover:neu-button-pressed hover:bg-red-100"
                                        >
                                          <X className="h-3 w-3 text-red-600" />
                                        </Button>
                                      </div>
                                    );
                                  })}
                                  
                                  {/* Owner roles with departments */}
                                  {user.roles.filter(r => r.role === 'owner').length > 0 && (
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-medium text-green-700">Owner di:</span>
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {user.roles
                                          .filter(r => r.role === 'owner')
                                          .map((ownerRole, index) => (
                                            <div key={index} className="flex items-center gap-1">
                                              <Badge 
                                                variant="secondary"
                                                className="neu-raised bg-green-100 text-green-700 border-0 px-2 py-1 text-xs"
                                              >
                                                <Building className="h-3 w-3 mr-1" />
                                                {ownerRole.department || 'Departemen tidak diatur'}
                                              </Badge>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => removeUserRole(user.id, ownerRole.role, ownerRole.department)}
                                                className="h-5 w-5 p-0 neu-button-raised rounded-full hover:neu-button-pressed hover:bg-red-100"
                                              >
                                                <X className="h-2.5 w-2.5 text-red-600" />
                                              </Button>
                                            </div>
                                          ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
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
            {/* Info Alert tentang sistem multi-member */}
            <div className="neu-sunken rounded-xl p-4 bg-blue-50/50">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <strong className="font-medium">Sistem Multi-Member:</strong> Setiap departemen dapat memiliki beberapa anggota. 
                  Satu orang juga bisa menjadi anggota di beberapa departemen sekaligus. Klik tombol ➕ di setiap departemen untuk menambah anggota baru.
                </div>
              </div>
            </div>

            {/* Enhanced Create Department dengan Neumorphism */}
            <Card className="neu-raised border-0 bg-white">
              <CardHeader className="pb-4">
                <div className="flex items-start gap-4">
                  <div className="neu-sunken p-3 rounded-xl bg-purple-100 flex-shrink-0">
                    <Building className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg text-gray-900 mb-1">Buat Departemen Baru</CardTitle>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Tambahkan departemen baru untuk mengorganisir inventaris berdasarkan unit kerja.
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label htmlFor="name" className="text-sm font-semibold text-gray-800">Nama Departemen</Label>
                    <Input
                      id="name"
                      value={newDepartment.name}
                      onChange={(e) => setNewDepartment(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Contoh: Laboratorium IPA"
                      className="h-12 border-gray-200 focus:border-purple-500 focus:ring-purple-500 neu-sunken bg-gray-50"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="description" className="text-sm font-semibold text-gray-800">Deskripsi</Label>
                    <Input
                      id="description"
                      value={newDepartment.description}
                      onChange={(e) => setNewDepartment(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Deskripsi singkat departemen"
                      className="h-12 border-gray-200 focus:border-purple-500 focus:ring-purple-500 neu-sunken bg-gray-50"
                    />
                  </div>
                  <Button 
                    onClick={createDepartment} 
                    className="w-full h-12 neu-button-raised bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                    disabled={!newDepartment.name.trim()}
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Buat Departemen
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Expandable Departments List dengan Neumorphism */}
            <Card className="neu-raised border-0 bg-white">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-4">
                    <div className="neu-sunken p-3 rounded-xl bg-orange-100 flex-shrink-0">
                      <Building className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-gray-900">Daftar Departemen ({departments.length})</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">Kelola departemen dan assign owner untuk setiap unit</p>
                    </div>
                  </div>
                  <Button 
                    onClick={fetchDepartments} 
                    variant="outline" 
                    size="sm" 
                    className="neu-button-raised rounded-lg hover:neu-button-pressed transition-all"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {departments.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="neu-sunken rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-gray-100">
                      <Building className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium">Belum ada departemen</p>
                    <p className="text-sm text-gray-400 mt-1">Buat departemen baru untuk memulai</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {departments.map(dept => (
                      <div key={dept.id} className="neu-raised rounded-xl p-5 hover:neu-sunken transition-all duration-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 neu-sunken rounded-xl bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center flex-shrink-0">
                                  <Building className="h-5 w-5 text-orange-600" />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-gray-900 text-base">{dept.name}</h4>
                                  {dept.description && (
                                    <p className="text-sm text-gray-600 mt-1">{dept.description}</p>
                                  )}
                                </div>
                              </div>
                              
                              {/* Add Member Button */}
                              <Dialog open={isAddMemberOpen && selectedDeptForMember === dept.name} onOpenChange={(open) => {
                                setIsAddMemberOpen(open);
                                if (open) {
                                  setSelectedDeptForMember(dept.name);
                                } else {
                                  setSelectedDeptForMember('');
                                  setSearchUser('');
                                }
                              }}>
                                <DialogTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="neu-button-raised rounded-lg hover:neu-button-pressed text-green-600 border-green-200 hover:bg-green-50"
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Tambah Anggota
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                  <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                      <UserPlus className="h-5 w-5 text-green-600" />
                                      Tambah Anggota ke {dept.name}
                                    </DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    {/* Search Input */}
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium">Cari Pengguna</Label>
                                      <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                          value={searchUser}
                                          onChange={(e) => setSearchUser(e.target.value)}
                                          placeholder="Ketik nama atau unit..."
                                          className="pl-10 neu-sunken bg-gray-50"
                                        />
                                      </div>
                                    </div>
                                    
                                    {/* Available Users List */}
                                    <div className="max-h-60 overflow-y-auto space-y-2">
                                      {getFilteredUsers(dept.name).length === 0 ? (
                                        <div className="text-center py-6">
                                          <div className="neu-sunken rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center bg-gray-100">
                                            <Users className="h-6 w-6 text-gray-400" />
                                          </div>
                                          <p className="text-sm text-gray-500">
                                            {searchUser ? 'Tidak ada pengguna yang cocok' : 'Semua pengguna sudah menjadi anggota'}
                                          </p>
                                        </div>
                                      ) : (
                                        getFilteredUsers(dept.name).map(user => (
                                          <div 
                                            key={user.id}
                                            onClick={() => assignOwnerToDept(dept.name, user.id)}
                                            className="flex items-center justify-between p-3 neu-sunken rounded-lg bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                                          >
                                            <div className="flex items-center gap-3">
                                              <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center">
                                                <span className="text-sm font-bold text-green-700">
                                                  {user.full_name ? user.full_name.charAt(0).toUpperCase() : '?'}
                                                </span>
                                              </div>
                                              <div>
                                                <div className="font-medium text-gray-900 text-sm">
                                                  {user.full_name || `User ${user.id.substring(0, 8)}`}
                                                </div>
                                                <div className="text-xs text-gray-500">{user.unit || 'Unit tidak diatur'}</div>
                                              </div>
                                            </div>
                                            <UserPlus className="h-4 w-4 text-green-600" />
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                            
                            {/* Members Section */}
                            <div className="neu-sunken rounded-lg p-4 bg-gray-50/50">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-blue-600" />
                                  <span className="text-sm font-medium text-gray-700">
                                    Anggota Departemen ({dept.members.length})
                                  </span>
                                </div>
                              </div>
                              
                              {dept.members.length === 0 ? (
                                <div className="text-center py-6">
                                  <div className="neu-sunken rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center bg-gray-100">
                                    <Users className="h-6 w-6 text-gray-400" />
                                  </div>
                                  <p className="text-sm text-gray-500 font-medium">Belum ada anggota di departemen ini</p>
                                  <p className="text-xs text-gray-400 mt-1">Klik "Tambah Anggota" untuk mulai menambahkan</p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {dept.members.map(member => (
                                    <div key={`${member.id}-${member.role}`} className="flex items-center justify-between p-3 neu-raised rounded-lg bg-white">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                                          <span className="text-sm font-bold text-blue-700">
                                            {member.full_name ? member.full_name.charAt(0).toUpperCase() : '?'}
                                          </span>
                                        </div>
                                        <div className="flex-1">
                                          <div className="font-medium text-gray-900 text-sm">
                                            {member.full_name || 'Nama belum diatur'}
                                          </div>
                                          <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-gray-500">{member.unit || 'Unit tidak diatur'}</span>
                                            <Badge 
                                              variant="secondary" 
                                              className={`text-xs px-2 py-0.5 ${
                                                member.role === 'owner' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                              }`}
                                            >
                                              {member.role === 'owner' ? 'Owner' : 'Admin'}
                                            </Badge>
                                          </div>
                                        </div>
                                      </div>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            className="h-8 w-8 p-0 neu-button-raised rounded-lg hover:neu-button-pressed"
                                          >
                                            <MoreVertical className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                          <DropdownMenuItem 
                                            onClick={() => removeMemberFromDept(dept.name, member.id, member.role)}
                                            className="text-red-600 focus:text-red-700"
                                          >
                                            <UserMinus className="h-4 w-4 mr-2" />
                                            Hapus dari Departemen
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="neu-button-raised w-10 h-10 p-0 rounded-xl hover:neu-button-pressed transition-all ml-4"
                              >
                                <MoreVertical className="h-4 w-4 text-gray-600" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem 
                                onClick={() => deleteDepartment(dept.id)}
                                className="text-red-600 focus:text-red-700"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Hapus Departemen
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPanel;