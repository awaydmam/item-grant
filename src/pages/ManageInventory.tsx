import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Package, Edit, Trash2, Search, Filter, AlertCircle, Grid3X3, List, ArrowLeft, Menu, CheckCircle, Clock, Upload } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BottomNav } from "@/components/layout/BottomNav";
import { getOptimizedItems, getOptimizedCategories, clearRequestCache, forceRefreshItems } from "@/lib/request-optimizer";

interface Item {
  id: string;
  name: string;
  code: string;
  description: string;
  quantity: number;
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
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const navigate = useNavigate();
  const { hasRole, getUserDepartment, canManageInventory } = useUserRole();

  // Simpan informasi user roles dan department sekali di awal
  const [isOwnerOnly, setIsOwnerOnly] = useState(false);
  const [userDepartment, setUserDepartment] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(true);

  // Refresh function dengan optimizer
  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Force refresh dengan optimizer
      const itemsData = await forceRefreshItems(
        isOwnerOnly && userDepartment ? 
          (await supabase.from('departments').select('id').eq('name', userDepartment).single()).data?.id 
          : undefined
      );

      if (itemsData) {
        setItems(itemsData as Item[]);
        toast.success("Data berhasil dimuat ulang");
      }
    } catch (error) {
      console.error("Error refreshing items:", error);
      toast.error("Gagal memuat ulang data");
    } finally {
      setLoading(false);
    }
  }, [isOwnerOnly, userDepartment]);

  // Effect untuk mengambil user role hanya sekali
  useEffect(() => {
    const checkUserAccess = () => {
      // Simpan role informasi
      const owner = hasRole('owner');
      const admin = hasRole('admin');
      const isOwnerOnlyValue = owner && !admin;
      setIsOwnerOnly(isOwnerOnlyValue);
      
      // Simpan departemen user
      const userDeptName = getUserDepartment();
      setUserDepartment(userDeptName);
      
      // Check akses manajemen
      const canManageValue = canManageInventory();
      setCanManage(canManageValue);
    };
    
    // Jalankan sekali dan tidak akan dijalankan lagi meskipun dependencies berubah
    // karena kita hanya perlu nilai awalnya
    if (!userDepartment && !isOwnerOnly) {
      checkUserAccess();
    }
  }, [hasRole, getUserDepartment, canManageInventory, userDepartment, isOwnerOnly]);

  // Effect untuk load data setelah role tersedia - dengan optimizer
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Gunakan optimizer untuk fetch data
        const [itemsData, categoriesData] = await Promise.all([
          getOptimizedItems(
            isOwnerOnly && userDepartment ? 
              (await supabase.from('departments').select('id').eq('name', userDepartment).single()).data?.id 
              : undefined
          ),
          getOptimizedCategories()
        ]);

        if (isMounted) {
          if (itemsData) {
            setItems(itemsData as Item[]);
          }
          if (categoriesData) {
            setCategories(categoriesData as Category[]);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        if (isMounted) {
          toast.error("Gagal memuat data");
          setLoading(false);
        }
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [isOwnerOnly, userDepartment]); // Hanya bergantung pada state lokal

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus barang ini?")) return;
    
    try {
      // Check if item is referenced in request_items
      const { count: requestItemsCount } = await supabase
        .from("request_items")
        .select("*", { count: "exact", head: true })
        .eq("item_id", itemId);

      if (requestItemsCount && requestItemsCount > 0) {
        toast.error(
          "Tidak dapat menghapus barang ini karena sedang digunakan dalam permintaan peminjaman. " +
          "Silakan batalkan atau selesaikan permintaan terlebih dahulu."
        );
        return;
      }

      // If no references, proceed with deletion
      const { error } = await supabase
        .from("items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
      
      toast.success("Barang berhasil dihapus");
      refreshData(); // Use refreshData instead of fetchItems
    } catch (error) {
      console.error("Error deleting item:", error);
      
      if (error.code === '23503') {
        toast.error(
          "Tidak dapat menghapus barang ini karena masih terkait dengan data lain. " +
          "Pastikan barang tidak sedang dipinjam atau dalam permintaan aktif."
        );
      } else {
        toast.error("Gagal menghapus barang");
      }
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
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || item.categories?.id === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const ItemCard = ({ item }: { item: Item }) => (
    <Card className="neu-raised border-0 group hover:neu-flat transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Mini square preview image */}
            <div className="w-12 h-12 neu-sunken rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
              {item.image_url ? (
                <img 
                  src={item.image_url} 
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-5 w-5 text-gray-400" />
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                {item.name}
              </CardTitle>
              <p className="text-xs text-gray-500 mt-1">Kode: {item.code}</p>
            </div>
          </div>
          <div className="flex gap-1 ml-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate(`/edit-item/${item.id}`)}
              className="p-2 neu-button-raised hover:neu-button-pressed bg-blue-100 text-blue-600 hover:bg-blue-200"
              title={`Edit ${item.name}`}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDeleteItem(item.id)}
              className="p-2 neu-button-raised hover:neu-button-pressed bg-red-100 text-red-600 hover:bg-red-200"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            {getStatusBadge(item.status)}
            <span className="text-sm font-medium text-gray-700">
              {item.available_quantity} tersedia
            </span>
          </div>
          
          {item.description && (
            <p className="text-xs text-gray-600 line-clamp-2">{item.description}</p>
          )}
          
          <div className="flex flex-wrap gap-1 text-xs">
            {item.categories && (
              <Badge variant="outline" className="text-xs px-2 py-0">
                {item.categories.name}
              </Badge>
            )}
            {item.departments && (
              <Badge variant="outline" className="text-xs px-2 py-0">
                {item.departments.name}
              </Badge>
            )}
            {item.location && (
              <Badge variant="outline" className="text-xs px-2 py-0">
                📍 {item.location}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const ItemRow = ({ item }: { item: Item }) => (
    <div className="flex items-center justify-between p-4 hover:bg-blue-50/50 transition-colors border-b border-gray-100 last:border-b-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Mini square preview image for list view */}
        <div className="w-10 h-10 neu-sunken rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
          {item.image_url ? (
            <img 
              src={item.image_url} 
              alt={item.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-4 w-4 text-gray-400" />
            </div>
          )}
        </div>
        
        <div className="flex-1 space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900 truncate">{item.name}</h3>
            <span className="text-xs text-gray-500">({item.code})</span>
            {getStatusBadge(item.status)}
          </div>
          <p className="text-sm text-gray-600 line-clamp-1">{item.description}</p>
          <div className="flex gap-2 text-xs text-gray-500">
            {item.categories && <span>{item.categories.name}</span>}
            {item.departments && <span>• {item.departments.name}</span>}
            {item.location && <span>• {item.location}</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 ml-4">
        <div className="text-right">
          <div className="font-medium text-gray-900">{item.available_quantity}</div>
          <div className="text-xs text-gray-500">tersedia</div>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate(`/edit-item/${item.id}`)}
            className="p-2 neu-button-raised hover:neu-button-pressed bg-blue-100 text-blue-600 hover:bg-blue-200"
            title={`Edit ${item.name}`}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDeleteItem(item.id)}
            className="p-2 neu-button-raised hover:neu-button-pressed bg-red-100 text-red-600 hover:bg-red-200"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-24 safe-area-pb">
        {/* Header skeleton */}
        <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200">
          <div className="px-4 py-5 safe-area-pt">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 neu-flat rounded-xl animate-pulse"></div>
              <div className="space-y-2">
                <div className="w-32 h-5 neu-flat rounded-xl animate-pulse"></div>
                <div className="w-24 h-3 neu-flat rounded-xl animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Content skeleton */}
        <div className="px-4 py-6 space-y-5">
          {/* Stats skeleton */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="neu-raised rounded-xl p-4">
                <div className="w-8 h-8 neu-flat rounded-xl animate-pulse mb-3"></div>
                <div className="w-8 h-6 neu-flat rounded animate-pulse mb-2"></div>
                <div className="w-16 h-4 neu-flat rounded animate-pulse"></div>
              </div>
            ))}
          </div>
          
          {/* Filter skeleton */}
          <div className="neu-raised rounded-xl p-4">
            <div className="w-full h-11 neu-sunken rounded-xl animate-pulse"></div>
          </div>
          
          {/* Items skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="neu-raised rounded-xl p-4">
                <div className="w-full h-24 neu-sunken rounded-lg animate-pulse mb-3"></div>
                <div className="w-3/4 h-5 neu-flat rounded animate-pulse mb-2"></div>
                <div className="w-1/2 h-4 neu-flat rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-24 safe-area-pb">
      {/* Enhanced Mobile-Friendly Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="px-4 py-5 safe-area-pt">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/')}
                className="neu-button-raised rounded-xl hover:neu-button-pressed transition-all bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  Kelola Inventaris
                </h1>
                <p className="text-sm text-gray-600">
                  {isOwnerOnly
                    ? `${userDepartment || 'Dept. Anda'}`
                    : 'Semua Dept.'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => navigate("/bulk-upload-items")}
                size="icon"
                title="Upload Excel"
                className="bg-green-600 hover:bg-green-700 text-white w-10 h-10 rounded-xl neu-button-raised hover:neu-button-pressed border-0"
              >
                <Upload className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => navigate("/add-item")}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl neu-button-raised hover:neu-button-pressed border-0"
              >
                <Plus className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Tambah</span>
                <span className="sm:hidden">+</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 space-y-5">
        {/* Quick Actions - Tampil jika inventory kosong */}
        {items.length === 0 && (
          <Card className="neu-raised border-0">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 neu-sunken bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Mulai Kelola Inventaris
              </h3>
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                {hasRole('owner') && !hasRole('admin') 
                  ? `Belum ada barang di ${getUserDepartment()}. Tambahkan barang pertama.`
                  : 'Belum ada barang. Tambahkan barang pertama.'
                }
              </p>
              <div className="space-y-3">
                <Button
                  onClick={() => navigate("/add-item")}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl neu-button-raised hover:neu-button-pressed border-0"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Barang Pertama
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/")}
                  className="w-full neu-button-raised hover:neu-button-pressed bg-gray-100 text-gray-700 hover:bg-gray-200 border-0"
                >
                  Kembali ke Beranda
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Compact Filters */}
        {items.length > 0 && (
          <Card className="neu-raised border-0">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Cari barang..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10 neu-sunken border-0 bg-white/50"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="flex-1 h-10 neu-sunken border-0 bg-white/50">
                      <Filter className="h-4 w-4 mr-2 text-gray-500" />
                      <SelectValue placeholder="Kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <div className="flex neu-sunken rounded-xl overflow-hidden bg-white/50">
                    <Button
                      size="sm"
                      variant={viewMode === "grid" ? "default" : "ghost"}
                      onClick={() => setViewMode("grid")}
                      className={`h-10 rounded-none border-0 px-3 ${viewMode === "grid" ? 'bg-blue-600 text-white' : 'bg-transparent hover:bg-blue-50'}`}
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={viewMode === "list" ? "default" : "ghost"}
                      onClick={() => setViewMode("list")}
                      className={`h-10 rounded-none border-0 px-3 ${viewMode === "list" ? 'bg-blue-600 text-white' : 'bg-transparent hover:bg-blue-50'}`}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Compact Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="neu-raised border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Total</p>
                  <p className="text-xl font-bold text-gray-900">{items.length}</p>
                </div>
                <div className="neu-sunken p-2 rounded-xl bg-blue-100">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="neu-raised border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Tersedia</p>
                  <p className="text-xl font-bold text-green-600">
                    {items.filter(item => item.status === 'available').length}
                  </p>
                </div>
                <div className="neu-sunken p-2 rounded-xl bg-green-100">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="neu-raised border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Perawatan</p>
                  <p className="text-xl font-bold text-yellow-600">
                    {items.filter(item => item.status === 'maintenance').length}
                  </p>
                </div>
                <div className="neu-sunken p-2 rounded-xl bg-yellow-100">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="neu-raised border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">N/A</p>
                  <p className="text-xl font-bold text-red-600">
                    {items.filter(item => item.status === 'unavailable').length}
                  </p>
                </div>
                <div className="neu-sunken p-2 rounded-xl bg-red-100">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Items List */}
        {filteredItems.length === 0 && items.length > 0 ? (
          <Card className="neu-raised border-0">
            <CardContent className="p-8 text-center">
              <div className="neu-sunken p-4 rounded-2xl bg-gray-100 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Package className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada hasil</h3>
              <p className="text-gray-500 mb-4">
                Coba ubah kata kunci pencarian atau filter kategori
              </p>
            </CardContent>
          </Card>
        ) : items.length > 0 && (
          <Card className="neu-raised border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                Daftar Barang ({filteredItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                  {filteredItems.map((item, index) => (
                    <div key={item.id} className={index > 0 ? 'mt-0' : ''}>
                      <ItemCard item={item} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="neu-sunken rounded-xl mx-4 mb-4 overflow-hidden">
                  {filteredItems.map(item => (
                    <ItemRow key={item.id} item={item} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Floating Action Button */}
        {items.length > 0 && (
          <div className="fixed bottom-20 right-4 z-40">
            <Button
              onClick={() => navigate("/add-item")}
              size="lg"
              className="h-12 w-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 neu-button-raised hover:neu-button-pressed border-0"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}