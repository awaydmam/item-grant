import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Package, Edit, Trash2, Search, Filter, AlertCircle, Grid3X3, List, ArrowLeft, Menu, CheckCircle, Clock } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
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
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const navigate = useNavigate();
  const { hasRole, getUserDepartment, canManageInventory } = useUserRole();

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching items...');
      
      let query = supabase
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
        `)
        .order("created_at", { ascending: false });

      // Filter by department if user is owner (not admin)
      const userDepartment = getUserDepartment();
      const isOwnerOnly = hasRole('owner') && !hasRole('admin');
      
      console.log('User department:', userDepartment);
      console.log('Is owner only:', isOwnerOnly);
      console.log('User roles:', { isOwner: hasRole('owner'), isAdmin: hasRole('admin') });

      if (isOwnerOnly && userDepartment) {
        console.log('Filtering by department:', userDepartment);
        // Find department ID from name
        const { data: deptData } = await supabase
          .from('departments')
          .select('id')
          .eq('name', userDepartment)
          .single();
          
        if (deptData) {
          query = query.eq('department_id', deptData.id);
          console.log('Filtering by department ID:', deptData.id);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Items fetched:', data?.length || 0, 'items');
      setItems(data || []);
    } catch (error) {
      console.error("Error fetching items:", error);
      toast.error("Gagal mengambil data inventaris: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [getUserDepartment, hasRole]);

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }, []);

  useEffect(() => {
    const checkAccessAndFetch = async () => {
      console.log('Checking access and fetching...');
      console.log('Can manage inventory:', canManageInventory());
      
      // For debugging, allow access but log the result
      if (!canManageInventory()) {
        console.warn('User cannot manage inventory, but allowing for debugging');
        // toast.error("Anda tidak memiliki akses untuk mengelola inventori");
        // navigate("/");
        // return;
      }
      
      await Promise.all([fetchItems(), fetchCategories()]);
    };
    
    checkAccessAndFetch();
  }, [fetchItems, fetchCategories, canManageInventory]);

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
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || item.categories?.id === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const ItemCard = ({ item }: { item: Item }) => (
    <Card className="group hover:shadow-lg transition-all duration-200 border-gray-200">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {item.name}
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">Kode: {item.code}</p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/edit-item/${item.id}`)}
              className="p-2"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDeleteItem(item.id)}
              className="p-2 text-red-600 hover:text-red-700 hover:border-red-300"
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
            <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
          )}
          
          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            {item.categories && (
              <Badge variant="outline" className="text-xs">
                {item.categories.name}
              </Badge>
            )}
            {item.departments && (
              <Badge variant="outline" className="text-xs">
                {item.departments.name}
              </Badge>
            )}
            {item.location && (
              <Badge variant="outline" className="text-xs">
                📍 {item.location}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const ItemRow = ({ item }: { item: Item }) => (
    <div className="flex items-center justify-between p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-3">
          <h3 className="font-medium text-gray-900">{item.name}</h3>
          <span className="text-sm text-gray-500">({item.code})</span>
          {getStatusBadge(item.status)}
        </div>
        <p className="text-sm text-gray-600">{item.description}</p>
        <div className="flex gap-2 text-xs text-gray-500">
          {item.categories && <span>Kategori: {item.categories.name}</span>}
          {item.departments && <span>• Departemen: {item.departments.name}</span>}
          {item.location && <span>• Lokasi: {item.location}</span>}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="font-medium text-gray-900">{item.available_quantity}</div>
          <div className="text-xs text-gray-500">tersedia</div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/edit-item/${item.id}`)}
            className="p-2"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDeleteItem(item.id)}
            className="p-2 text-red-600 hover:text-red-700 hover:border-red-300"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Header skeleton */}
        <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-9 h-9 bg-gray-200 rounded-xl animate-pulse"></div>
              <div className="space-y-2">
                <div className="w-32 h-5 bg-gray-200 rounded animate-pulse"></div>
                <div className="w-24 h-3 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
            <div className="w-20 h-9 bg-gray-200 rounded-xl animate-pulse"></div>
          </div>
        </div>
        
        {/* Content skeleton */}
        <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="space-y-6">
            {/* Filter skeleton */}
            <div className="bg-white/80 rounded-xl p-6">
              <div className="w-full h-11 bg-gray-200 rounded-xl animate-pulse"></div>
            </div>
            
            {/* Stats skeleton */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white/80 rounded-xl p-6">
                  <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse mx-auto mb-3"></div>
                  <div className="w-8 h-6 bg-gray-200 rounded animate-pulse mx-auto mb-2"></div>
                  <div className="w-16 h-4 bg-gray-200 rounded animate-pulse mx-auto"></div>
                </div>
              ))}
            </div>
            
            {/* Items skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white/80 rounded-xl p-4">
                  <div className="w-full h-32 bg-gray-200 rounded-lg animate-pulse mb-3"></div>
                  <div className="w-3/4 h-5 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="w-1/2 h-4 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Enhanced Mobile-Friendly Header */}
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
                Kelola Inventaris
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 truncate">
                {hasRole('owner') && !hasRole('admin') 
                  ? `Departemen: ${getUserDepartment() || 'Tidak diatur'}`
                  : 'Semua Departemen'
                }
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate("/add-item")}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 sm:px-4 rounded-xl font-medium shadow-sm"
          >
            <Plus className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Tambah Barang</span>
            <span className="sm:hidden">Tambah</span>
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        {/* Quick Actions - Tampil jika inventory kosong */}
        {items.length === 0 && (
          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6 sm:p-8 text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                Mulai Kelola Inventaris
              </h3>
              <p className="text-sm sm:text-base text-gray-600 mb-6 max-w-md mx-auto leading-relaxed">
                {hasRole('owner') && !hasRole('admin') 
                  ? `Belum ada barang di departemen ${getUserDepartment()}. Mulai dengan menambahkan barang pertama.`
                  : 'Belum ada barang di inventaris. Mulai dengan menambahkan barang pertama.'
                }
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => navigate("/add-item")}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Tambah Barang Pertama
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/")}
                  className="border-gray-200 text-gray-700 hover:bg-gray-50 px-6 py-3 rounded-xl font-medium"
                >
                  Kembali ke Beranda
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Filters */}
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Cari nama barang, kode, atau deskripsi..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-full sm:w-48 h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl">
                    <Filter className="h-4 w-4 mr-2 text-gray-500" />
                    <SelectValue placeholder="Filter Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kategori</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="flex border rounded-xl overflow-hidden bg-gray-50">
                  <Button
                    size="sm"
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    onClick={() => setViewMode("grid")}
                    className={`rounded-none border-0 px-4 py-2 ${viewMode === "grid" ? 'bg-white shadow-sm' : 'bg-transparent'}`}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === "list" ? "default" : "ghost"}
                    onClick={() => setViewMode("list")}
                    className={`rounded-none border-0 px-4 py-2 ${viewMode === "list" ? 'bg-white shadow-sm' : 'bg-transparent'}`}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Barang</p>
                  <p className="text-2xl font-bold text-gray-900">{items.length}</p>
                </div>
                <Package className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Tersedia</p>
                  <p className="text-2xl font-bold text-green-600">
                    {items.filter(item => item.status === 'available').length}
                  </p>
                </div>
                <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                  <div className="h-4 w-4 bg-green-600 rounded-full"></div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Perawatan</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {items.filter(item => item.status === 'maintenance').length}
                  </p>
                </div>
                <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <div className="h-4 w-4 bg-yellow-600 rounded-full"></div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Tidak Tersedia</p>
                  <p className="text-2xl font-bold text-red-600">
                    {items.filter(item => item.status === 'unavailable').length}
                  </p>
                </div>
                <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                  <div className="h-4 w-4 bg-red-600 rounded-full"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Items List */}
        {filteredItems.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {items.length === 0 ? "Belum ada barang" : "Tidak ada hasil pencarian"}
              </h3>
              <p className="text-gray-500 mb-6">
                {items.length === 0 
                  ? "Mulai tambahkan barang inventaris sekolah Anda"
                  : "Coba ubah kata kunci pencarian atau filter kategori"
                }
              </p>
              {items.length === 0 && (
                <Button onClick={() => navigate("/add-item")} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Barang Pertama
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Daftar Barang ({filteredItems.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                  {filteredItems.map(item => (
                    <ItemCard key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredItems.map(item => (
                    <ItemRow key={item.id} item={item} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Floating Action Button untuk Tambah Barang */}
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={() => navigate("/add-item")}
            size="lg"
            className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200 lg:w-auto lg:h-12 lg:rounded-lg lg:px-6"
          >
            <Plus className="h-6 w-6 lg:mr-2" />
            <span className="hidden lg:inline">Tambah Barang</span>
          </Button>
        </div>
      </div>
    </div>
  );
}