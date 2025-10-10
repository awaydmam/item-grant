import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/layout/BottomNav";
import { Building2, ChevronRight, Package, ShoppingCart } from "lucide-react";
import { useCart } from "@/hooks/useCart";

interface Department {
  id: string;
  name: string;
  description: string;
  item_count?: number;
  available_count?: number;
  borrowed_count?: number;
  jenis_count?: number; // jumlah distinct jenis item
}

export default function Departments() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [userDepartment, setUserDepartment] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { getTotalItems } = useCart();

  const fetchDepartments = useCallback(async () => {
    try {
      // Get departments
      const { data: deptData } = await supabase
        .from("departments")
        .select("id, name, description");

      // Get all items for each department  
      const { data: itemsData } = await supabase
        .from("items")
        .select("id, department_id, quantity");

      // Get active borrowed items
      const { data: activeRequests } = await supabase
        .from("borrow_requests")
        .select(`
          request_items (
            item_id,
            quantity
          )
        `)
        .in("status", ["approved", "active"]);

      // Calculate borrowed quantities per item
      const borrowedMap = new Map<string, number>();
      activeRequests?.forEach(request => {
        request.request_items?.forEach((item: { item_id: string; quantity: number }) => {
          const current = borrowedMap.get(item.item_id) || 0;
          borrowedMap.set(item.item_id, current + item.quantity);
        });
      });

      if (deptData && itemsData) {
        const departmentsWithCounts = deptData.map(dept => {
          const deptItems = itemsData.filter(item => item.department_id === dept.id);
          
          // totalJenis = jumlah distinct item (jenis barang)
          const totalJenis = deptItems.length;
          // totalUnit = jumlah seluruh unit (quantity) akumulatif
          const totalUnit = deptItems.reduce((sum, itm) => sum + (itm.quantity || 0), 0);
          
          let totalAvailableQuantity = 0; // total unit tersedia
            let totalBorrowedQuantity = 0; // total unit sedang dipinjam
          
          deptItems.forEach(item => {
            const borrowed = borrowedMap.get(item.id) || 0;
            const available = Math.max(0, item.quantity - borrowed);
            totalAvailableQuantity += available;
            totalBorrowedQuantity += borrowed;
          });

          return {
            ...dept,
            // Ubah: item_count sekarang mewakili total unit agar label "Total" & "Tersedia" konsisten basisnya
            item_count: totalUnit,
            // Simpan juga meta bila nanti ingin tampilkan jenis
            // properti tambahan untuk kebutuhan tampilan (jumlah jenis), tidak ditambahkan ke interface agar backward compatible
            jenis_count: totalJenis,
            available_count: totalAvailableQuantity,
            borrowed_count: totalBorrowedQuantity
          };
        });
        
        // Sort: user's department first, then alphabetically
        const sorted = departmentsWithCounts.sort((a, b) => {
          if (userDepartment) {
            if (a.name === userDepartment && b.name !== userDepartment) return -1;
            if (b.name === userDepartment && a.name !== userDepartment) return 1;
          }
          return a.name.localeCompare(b.name);
        });
        
        setDepartments(sorted);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
    } finally {
      setLoading(false);
    }
  }, [userDepartment]);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (userDepartment !== null) {
      fetchDepartments();
    }
  }, [userDepartment, fetchDepartments]);

  const fetchUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("unit")
        .eq("id", user.id)
        .single();
      
      if (profile) {
        setUserDepartment(profile.unit);
      }
    }
  };

  const handleDepartmentClick = (departmentId: string, departmentName: string) => {
    navigate(`/inventory?department=${departmentId}&name=${encodeURIComponent(departmentName)}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="container-mobile pt-8 px-6">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-3">
              <div className="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="text-muted-foreground">Memuat departemen...</p>
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header with better spacing */}
      <div className="bg-gradient-to-b from-primary/5 to-background">
        <div className="container-mobile pt-8 pb-6 px-6">
          <div className="text-center space-y-3">
            <h1 className="text-2xl font-bold text-gray-800 pt-10  ">Pilih Departemen</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Pilih departemen untuk melihat alat yang tersedia
            </p>
            {userDepartment && (
              <Badge variant="default" className="mt-3 px-3 py-1 rounded-full">
                Department Anda: {userDepartment}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="container-mobile py-6 px-5">
        {departments.length === 0 ? (
          <Card className="neu-flat mx-2">
            <CardContent className="py-16 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Belum ada departemen tersedia</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {departments.map((dept) => (
              <Card 
                key={dept.id} 
                className={`neu-flat hover:neu-raised transition-all duration-200 cursor-pointer mx-1 ${
                  dept.name === userDepartment ? 'ring-2 ring-primary/40 bg-primary/8' : ''
                }`}
                onClick={() => handleDepartmentClick(dept.id, dept.name)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left Content */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="neu-raised p-3 rounded-2xl flex-shrink-0">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg text-gray-800 mb-1 truncate">
                          {dept.name}
                        </h3>
                        {dept.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {dept.description}
                          </p>
                        )}
                        
                        {/* Stats dengan design yang lebih clean */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Package className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {dept.item_count || 0} total alat
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 bg-success rounded-full"></div>
                              <span className="text-sm font-medium text-success">
                                {dept.available_count || 0} tersedia
                              </span>
                            </div>
                            {dept.borrowed_count && dept.borrowed_count > 0 && (
                              <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 bg-warning rounded-full"></div>
                                <span className="text-sm font-medium text-warning">
                                  {dept.borrowed_count} dipinjam
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Right Content - Badges and Arrow */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {dept.name === userDepartment && (
                        <Badge variant="default" className="text-xs px-2 py-1 rounded-full">
                          Anda
                        </Badge>
                      )}
                      {dept.available_count !== undefined && dept.available_count > 0 ? (
                        <Badge className="bg-success/90 hover:bg-success text-white text-xs px-2 py-1 rounded-full">
                          {dept.available_count}
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs px-2 py-1 rounded-full">
                          Habis
                        </Badge>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Floating Cart Button with better positioning */}
      {getTotalItems() > 0 && (
        <div className="fixed bottom-24 right-6 z-50">
          <Button
            onClick={() => navigate('/cart')}
            className="h-12 w-12 rounded-full shadow-xl bg-primary hover:bg-primary/90 text-white neu-raised transition-all duration-200 hover:scale-105"
          >
            <div className="relative">
              <ShoppingCart className="h-5 w-5" />
              <Badge className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full p-0 flex items-center justify-center text-xs bg-red-500 text-white border-2 border-white">
                {getTotalItems()}
              </Badge>
            </div>
          </Button>
        </div>
      )}

      <BottomNav />
    </div>
  );
}