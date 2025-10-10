import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BottomNav } from "@/components/layout/BottomNav";
import { useUserRole } from "@/hooks/useUserRole";
import { 
  User, 
  Phone, 
  Mail, 
  Building, 
  LogOut, 
  Settings, 
  Package, 
  FileText,
  Clock,
  CheckCircle,
  Inbox,
  Shield
} from "lucide-react";
import { toast } from "sonner";

export default function Profile() {
  const navigate = useNavigate();
  const { isAdmin, isOwner, isHeadmaster } = useUserRole();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userRoles, setUserRoles] = useState<{role: string, department: string}[]>([]);
  const [stats, setStats] = useState({
    totalRequests: 0,
    activeLoans: 0,
    completedLoans: 0,
    pendingApprovals: 0,
  });

  useEffect(() => {
    let isMounted = true;
    
    const loadAllData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isMounted) return;

        // Fetch user profile and roles
        const [profileResult, rolesResult] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", user.id).single(),
          supabase.from("user_roles").select("role, department").eq("user_id", user.id)
        ]);

        if (isMounted) {
          if (profileResult.data) {
            setUserProfile({
              ...profileResult.data,
              email: user.email,
            });
          }
          if (rolesResult.data) setUserRoles(rolesResult.data);
        }

        // Fetch stats
        // Hitung jumlah yang perlu direview khusus sesuai role & departemen (join manual)
        let pendingApprovalsCount = 0;
        if (rolesResult.data?.some(r => r.role === 'owner')) {
          const ownerDeptName = rolesResult.data.find(r => r.role === 'owner')?.department;
          if (ownerDeptName) {
            interface OwnerPendingItem { item?: { department?: { name?: string } } }
            interface OwnerPendingRequest { request_items?: OwnerPendingItem[] }
            const { data: ownerPendingData } = await supabase
              .from('borrow_requests')
              .select(`
                id,
                request_items(
                  item:items(
                    department:departments(name)
                  )
                )
              `)
              .eq('status', 'pending_owner');
            const ownerFiltered = (ownerPendingData as OwnerPendingRequest[] | null)?.filter(req =>
              req.request_items?.some((ri: OwnerPendingItem) => ri.item?.department?.name === ownerDeptName)
            ) || [];
            pendingApprovalsCount += ownerFiltered.length;
          }
        }
        if (rolesResult.data?.some(r => r.role === 'headmaster')) {
          const { count: headPending } = await supabase
            .from('borrow_requests')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending_headmaster');
          pendingApprovalsCount += headPending || 0;
        }

        const [requestsCount, activeCount, completedCount] = await Promise.all([
          supabase.from("borrow_requests").select("*", { count: "exact", head: true }).eq("borrower_id", user.id),
          supabase.from("borrow_requests").select("*", { count: "exact", head: true }).eq("borrower_id", user.id).eq("status", "active"),
          supabase.from("borrow_requests").select("*", { count: "exact", head: true }).eq("borrower_id", user.id).eq("status", "completed")
        ]);

        if (isMounted) {
          setStats({
            totalRequests: requestsCount.count || 0,
            activeLoans: activeCount.count || 0,
            completedLoans: completedCount.count || 0,
            pendingApprovals: pendingApprovalsCount,
          });
        }
      } catch (error) {
        console.error("Error loading profile data:", error);
      }
    };

    loadAllData();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Gagal logout");
    } else {
      toast.success("Berhasil logout");
      navigate("/auth");
    }
  };

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, { label: string; color: string; icon: typeof User }> = {
      borrower: { label: "Peminjam", color: "bg-blue-100 text-blue-700", icon: User },
      owner: { label: "Pemilik Alat", color: "bg-green-100 text-green-700", icon: Package },
      headmaster: { label: "Kepala Sekolah", color: "bg-purple-100 text-purple-700", icon: Shield },
      admin: { label: "Administrator", color: "bg-red-100 text-red-700", icon: Settings }
    };
    return roleMap[role] || { label: role, color: "bg-gray-100 text-gray-700", icon: User };
  };

  const hasRole = (role: string) => {
    return userRoles.some(r => r.role === role);
  };

  const getUserDepartment = () => {
    const ownerRole = userRoles.find(r => r.role === 'owner');
    return ownerRole?.department || userProfile?.unit;
  };

  const profileSections = [
    {
      title: "Statistik Peminjaman",
      items: [
        {
          label: "Total Pengajuan",
          value: stats.totalRequests,
          icon: FileText,
          color: "text-blue-600"
        },
        {
          label: "Sedang Dipinjam",
          value: stats.activeLoans,
          icon: Clock,
          color: "text-orange-600"
        },
        {
          label: "Selesai",
          value: stats.completedLoans,
          icon: CheckCircle,
          color: "text-green-600"
        }
      ]
    }
  ];

  if (hasRole('owner') || hasRole('headmaster') || hasRole('admin')) {
    profileSections.push({
      title: "Statistik Review",
      items: [
        {
          label: "Perlu Review",
          value: stats.pendingApprovals,
          icon: Inbox,
          color: "text-purple-600"
        }
      ]
    });
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/5 to-background">
        <div className="container-mobile pt-6 pb-6">
          <div className="text-center  pt-10       space-y-4  ">
            {/* Avatar */}
            <div className="neu-raised w-20          h-20 rounded-full flex items-center justify-center mx-auto bg-primary/10">
              <User className="h-10 w-10 text-primary" />
            </div>
            
            {/* User Info */}
            <div>
              <h1 className="text-2xl font-bold">
                {userProfile?.full_name || "User"}
              </h1>
              {userProfile?.unit && (
                <p className="text-muted-foreground">{userProfile.unit}</p>
              )}
            </div>

            {/* Roles */}
            {userRoles.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {userRoles.map((roleObj, index) => {
                  const roleInfo = getRoleLabel(roleObj.role);
                  return (
                    <Badge key={index} className={`border-0 rounded-full px-3 py-1 font-medium ${roleInfo.color}`}>
                      <roleInfo.icon className="h-3 w-3 mr-1" />
                      {roleInfo.label}
                      {roleObj.department && ` - ${roleObj.department}`}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        {/* Enhanced Profile Details */}
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <CardTitle className="text-lg text-gray-900">Informasi Profil</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">
                  {userProfile?.email || "Tidak tersedia"}
                </p>
              </div>
            </div>
            
            {userProfile?.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Telepon</p>
                  <p className="text-sm text-muted-foreground">{userProfile.phone}</p>
                </div>
              </div>
            )}
            
            {userProfile?.unit && (
              <div className="flex items-center gap-3">
                <Building className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Unit Kerja</p>
                  <p className="text-sm text-muted-foreground">{userProfile.unit}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistics */}
        {profileSections.map((section, idx) => (
          <Card key={idx} className="neu-flat">
            <CardHeader>
              <CardTitle className="text-lg">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {section.items.map((item, itemIdx) => (
                  <div key={itemIdx} className="text-center space-y-2">
                    <div className={`neu-raised w-12 h-12 rounded-xl flex items-center justify-center mx-auto ${item.color.replace('text-', 'bg-').replace('-600', '-100')}`}>
                      <item.icon className={`h-6 w-6 ${item.color}`} />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{item.value}</div>
                      <div className="text-xs text-muted-foreground">{item.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Quick Actions */}
        <Card className="neu-flat">
          <CardHeader>
            <CardTitle className="text-lg">Aksi Cepat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(isOwner() || isHeadmaster()) && (
              <Button
                variant="outline"
                className="w-full justify-start neu-flat"
                onClick={() => navigate(isHeadmaster() ? '/headmaster-inbox' : '/owner-inbox')}
              >
                <Inbox className="h-4 w-4 mr-2" />
                Kotak Masuk Review
                {stats.pendingApprovals > 0 && (
                  <Badge className="ml-auto">{stats.pendingApprovals}</Badge>
                )}
              </Button>
            )}

            <Button
              variant="outline"
              className="w-full justify-start neu-flat"
              onClick={() => navigate('/my-requests')}
            >
              <FileText className="h-4 w-4 mr-2" />
              Riwayat Surat Peminjaman
            </Button>

            {isAdmin() && (
              <>
                <Button
                  variant="outline"
                  className="w-full justify-start neu-flat"
                  onClick={() => navigate('/admin')}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Admin Panel
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start neu-flat"
                  onClick={() => navigate('/manage-inventory')}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Kelola Inventori
                </Button>
              </>
            )}

            {(isOwner() && !isAdmin()) && (
              <Button
                variant="outline"
                className="w-full justify-start neu-flat"
                onClick={() => navigate('/manage-inventory')}
              >
                <Package className="h-4 w-4 mr-2" />
                Kelola Inventori Department
              </Button>
            )}

            <Button
              variant="outline"
              className="w-full justify-start neu-flat"
              onClick={() => navigate('/realtime')}
            >
              <Package className="h-4 w-4 mr-2" />
              Lihat Aktivitas Real-time
            </Button>
          </CardContent>
        </Card>

        {/* Logout */}
        <Card className="neu-flat border-destructive/20">
          <CardContent className="p-4">
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
}