import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Package, Edit, Trash2, Search, Filter, AlertCircle } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { MainLayout } from "@/components/layout/MainLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Item {
  id: string;
  name: string;
  code: string;
  description: string;
  quantity: number;
  total_quantity?: number;
  available_quantity: number;
  status: string;
  image_url: string;
  category_id: string;
  department_id: string;
  location: string;
  created_at: string;
  updated_at: string;
  accessories?: unknown;
  categories: { id: string; name: string } | null;
  departments: { id: string; name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

export default function ManageInventory() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const navigate = useNavigate();
  const { hasRole, getUserDepartment, canManageInventory } = useUserRole();
  
  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const query = supabase
        .from("items")
        .select(`
          *,
          categories (
            id,
            name
          ),
          departments (
            id,
            name
          )
        `);

      // Temporary: Load all items for testing
      // if (hasRole("owner") && !hasRole("admin")) {
      //   const userDept = await getUserDepartment();
      //   if (userDept) {
      //     query = query.eq("department_id", userDept);
      //   }
      // }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      
      console.log("Items fetched:", data);
      
      // Add dummy data for testing if empty
      if (!data || data.length === 0) {
        console.log("No items found, showing empty state");
      }
      
      setItems(data || []);
    } catch (error) {
      console.error("Error fetching items:", error);
      toast.error("Gagal memuat data barang");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const checkAccessAndFetch = async () => {
      // Temporary: Allow access for debugging
      console.log("canManageInventory:", canManageInventory());
      
      // if (!canManageInventory()) {
      //   toast.error("Anda tidak memiliki akses untuk mengelola inventori");
      //   navigate("/");
      //   return;
      // }
      await fetchItems();
    };
    
    checkAccessAndFetch();
  }, [fetchItems]);

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus barang ini?")) return;
    
    try {
      const { error } = await supabase
        .from("items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
      
      toast.success("Barang berhasil dihapus");
      fetchItems();
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("Gagal menghapus barang");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      available: "default",
      unavailable: "destructive",
      maintenance: "secondary"
    } as const;
    
    const labels = {
      available: "Tersedia",
      unavailable: "Tidak Tersedia", 
      maintenance: "Perawatan"
    };
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || "default"}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || item.categories?.id === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="page-container">
        <div className="p-4 space-y-4">
          <div className="h-8 bg-muted rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <ItemSkeleton key={i} />
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
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Kelola Inventori</h1>
          </div>
          <Button 
            onClick={() => navigate("/add-item")}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Tambah Barang
          </Button>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari barang..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {/* Items Grid */}
        {filteredItems.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Belum ada barang</h3>
              <p className="text-muted-foreground mb-4">
                Mulai tambahkan barang untuk mengelola inventori Anda
              </p>
              <Button onClick={() => navigate("/add-item")}>
                <Plus className="h-4 w-4 mr-2" />
                Tambah Barang Pertama
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => (
              <Card key={item.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/edit-item/${item.id}`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Kode:</span>
                      <span className="font-mono text-sm">{item.code}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      {getStatusBadge(item.status)}
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Stok:</span>
                      <span className="font-semibold">{item.total_quantity || item.quantity}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Tersedia:</span>
                      <span className="font-semibold text-green-600">{item.available_quantity}</span>
                    </div>
                    
                    {item.categories && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Kategori:</span>
                        <Badge variant="outline">{item.categories.name}</Badge>
                      </div>
                    )}
                    
                    {item.departments && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Dept:</span>
                        <Badge variant="secondary">{item.departments.name}</Badge>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Lokasi:</span>
                      <span className="text-sm">{item.location}</span>
                    </div>
                  </div>
                  
                  {item.description && (
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      <BottomNav />
    </div>
  );
}