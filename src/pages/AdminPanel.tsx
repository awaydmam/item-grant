import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Users, 
  Building2, 
  Plus, 
  Settings,
  ArrowLeft,
  Trash2,
  Edit,
  UserPlus,
  Shield
} from "lucide-react";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";

interface User {
  id: string;
  email?: string;
  full_name: string;
  unit_kerja?: string;
  user_roles: Array<{
    role: string;
    department_id?: string;
    departments?: {
      name: string;
    };
  }>;
}

interface Department {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  
  // Form states
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptDesc, setNewDeptDesc] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userDepartment, setUserDepartment] = useState("");

  useEffect(() => {
    console.log("AdminPanel - isAdmin():", isAdmin());
    console.log("AdminPanel - checking admin access...");
    
    // Temporary bypass for debugging
    // if (!isAdmin()) {
    //   toast.error("Akses ditolak. Hanya admin yang dapat mengakses halaman ini.");
    //   navigate("/");
    //   return;
    // }
    
    fetchUsers();
    fetchDepartments();
  }, [isAdmin, navigate]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          user_roles (
            role,
            department_id,
            departments (
              name
            )
          )
        `);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Gagal memuat data user");
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .order("name");

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error("Error fetching departments:", error);
      toast.error("Gagal memuat data department");
    }
  };

  const createDepartment = async () => {
    if (!newDeptName.trim()) {
      toast.error("Nama department harus diisi");
      return;
    }

    try {
      const { error } = await supabase
        .from("departments")
        .insert([{
          name: newDeptName.trim(),
          description: newDeptDesc.trim() || null
        }]);

      if (error) throw error;
      
      toast.success("Department berhasil dibuat");
      setNewDeptName("");
      setNewDeptDesc("");
      setDeptDialogOpen(false);
      fetchDepartments();
    } catch (error) {
      console.error("Error creating department:", error);
      toast.error("Gagal membuat department");
    }
  };

  const assignUserRole = async () => {
    if (!selectedUser || !userRole) {
      toast.error("Mohon pilih user dan role");
      return;
    }

    try {
      // Delete existing roles for this user
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", selectedUser.id);

      // Insert new role
      let roleData;
      if (userRole === "owner" && userDepartment) {
        roleData = {
          user_id: selectedUser.id,
          role: userRole as "admin" | "owner" | "headmaster" | "borrower",
          department_id: userDepartment
        };
      } else {
        roleData = {
          user_id: selectedUser.id,
          role: userRole as "admin" | "owner" | "headmaster" | "borrower"
        };
      }

      const { error } = await supabase
        .from("user_roles")
        .insert([roleData]);

      if (error) throw error;
      
      toast.success("Role user berhasil diupdate");
      setUserDialogOpen(false);
      setSelectedUser(null);
      setUserRole("");
      setUserDepartment("");
      fetchUsers();
    } catch (error) {
      console.error("Error assigning user role:", error);
      toast.error("Gagal mengupdate role user");
    }
  };

  const deleteDepartment = async (deptId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus department ini?")) return;

    try {
      const { error } = await supabase
        .from("departments")
        .delete()
        .eq("id", deptId);

      if (error) throw error;
      
      toast.success("Department berhasil dihapus");
      fetchDepartments();
    } catch (error) {
      console.error("Error deleting department:", error);
      toast.error("Gagal menghapus department");
    }
  };

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      admin: "bg-red-100 text-red-800",
      owner: "bg-blue-100 text-blue-800", 
      headmaster: "bg-purple-100 text-purple-800",
      borrower: "bg-gray-100 text-gray-800"
    };
    return colors[role as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="p-4 space-y-4">
          <div className="h-8 bg-muted rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Admin Panel</h1>
          </div>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Kelola User
            </TabsTrigger>
            <TabsTrigger value="departments" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Kelola Department
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Daftar User Terdaftar</h2>
              <p className="text-sm text-muted-foreground">
                Total: {users.length} user
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {users.map((user) => (
                <Card key={user.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold">{user.full_name || "Nama tidak diset"}</h4>
                        <p className="text-sm text-muted-foreground">{user.id}</p>
                        
                        <div className="flex flex-wrap gap-1 mt-2">
                          {user.user_roles?.map((roleData, idx) => (
                            <Badge 
                              key={idx} 
                              className={getRoleBadgeColor(roleData.role)}
                            >
                              {roleData.role}
                              {roleData.departments && ` - ${roleData.departments.name}`}
                            </Badge>
                          )) || (
                            <Badge variant="outline">No Role</Badge>
                          )}
                        </div>
                      </div>
                      
                      <Dialog open={userDialogOpen && selectedUser?.id === user.id} onOpenChange={setUserDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedUser(user)}
                          >
                            <Shield className="h-4 w-4 mr-1" />
                            Set Role
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Set Role untuk {user.full_name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="role">Role</Label>
                              <Select value={userRole} onValueChange={setUserRole}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Pilih role" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="owner">Owner (Pengelola Department)</SelectItem>
                                  <SelectItem value="headmaster">Headmaster (Kepala Sekolah)</SelectItem>
                                  <SelectItem value="borrower">Borrower (Peminjam)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {userRole === "owner" && (
                              <div>
                                <Label htmlFor="department">Department</Label>
                                <Select value={userDepartment} onValueChange={setUserDepartment}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Pilih department" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {departments.map((dept) => (
                                      <SelectItem key={dept.id} value={dept.id}>
                                        {dept.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setUserDialogOpen(false);
                                  setSelectedUser(null);
                                  setUserRole("");
                                  setUserDepartment("");
                                }}
                                className="flex-1"
                              >
                                Batal
                              </Button>
                              <Button onClick={assignUserRole} className="flex-1">
                                Simpan Role
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Departments Tab */}
          <TabsContent value="departments" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Daftar Department</h2>
              <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Department
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Buat Department Baru</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Nama Department</Label>
                      <Input
                        id="name"
                        value={newDeptName}
                        onChange={(e) => setNewDeptName(e.target.value)}
                        placeholder="Contoh: Teknologi Informasi"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Deskripsi (opsional)</Label>
                      <Input
                        id="description"
                        value={newDeptDesc}
                        onChange={(e) => setNewDeptDesc(e.target.value)}
                        placeholder="Deskripsi department..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setDeptDialogOpen(false);
                          setNewDeptName("");
                          setNewDeptDesc("");
                        }}
                        className="flex-1"
                      >
                        Batal
                      </Button>
                      <Button onClick={createDepartment} className="flex-1">
                        Buat Department
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {departments.map((dept) => (
                <Card key={dept.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{dept.name}</h4>
                        {dept.description && (
                          <p className="text-sm text-muted-foreground">{dept.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Dibuat: {new Date(dept.created_at).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteDepartment(dept.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
