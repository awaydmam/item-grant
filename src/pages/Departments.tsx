import { useEffect, useState } from "react";
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
}

export default function Departments() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [userDepartment, setUserDepartment] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { getTotalItems } = useCart();

  useEffect(() => {
    fetchUserProfile();
    fetchDepartments();
  }, [userDepartment]);

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

  const fetchDepartments = async () => {
    try {
      // Get departments with item counts
      const { data } = await supabase
        .from("departments")
        .select(`
          id,
          name,
          description,
          items!items_department_id_fkey(id)
        `);

      if (data) {
        const departmentsWithCounts = data.map(dept => ({
          ...dept,
          item_count: dept.items?.length || 0
        }));
        
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
  };

  const handleDepartmentClick = (departmentId: string, departmentName: string) => {
    navigate(`/inventory?department=${departmentId}&name=${encodeURIComponent(departmentName)}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-16">
        <div className="container-mobile pt-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <p className="text-muted-foreground">Memuat departemen...</p>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/5 to-background">
        <div className="container-mobile pt-6 pb-4">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Pilih Departemen</h1>
            <p className="text-muted-foreground">
              Pilih departemen untuk melihat alat yang tersedia
            </p>
            {userDepartment && (
              <Badge variant="default" className="mt-2">
                Department Anda: {userDepartment}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="container-mobile py-4">
        {departments.length === 0 ? (
          <Card className="neu-flat">
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Belum ada departemen tersedia</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {departments.map((dept) => (
              <Card 
                key={dept.id} 
                className={`neu-flat hover:neu-raised transition-all cursor-pointer ${
                  dept.name === userDepartment ? 'ring-2 ring-primary bg-primary/5' : ''
                }`}
                onClick={() => handleDepartmentClick(dept.id, dept.name)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="neu-raised p-3 rounded-xl">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-base">{dept.name}</h3>
                        {dept.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {dept.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {dept.item_count} alat tersedia
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {dept.name === userDepartment && (
                        <Badge variant="default" className="text-xs">
                          Department Anda
                        </Badge>
                      )}
                      {dept.item_count && dept.item_count > 0 && (
                        <Badge variant="secondary">{dept.item_count}</Badge>
                      )}
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Floating Cart Button */}
      {getTotalItems() > 0 && (
        <div className="fixed bottom-20 right-4 z-50">
          <Button
            onClick={() => navigate('/cart')}
            className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-white"
          >
            <div className="relative">
              <ShoppingCart className="h-6 w-6" />
              <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-red-500 text-white">
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