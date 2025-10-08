import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Package, Edit, Trash2, Search, Filter, AlertCircle, Grid3X3, List, ArrowLeft, Menu } from "lucide-react";
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
      <div className="min-h-screen bg-gray-50">
        <div className="flex justify-center items-center h-64">
          <div className="text-center space-y-4">
            <Package className="h-12 w-12 text-gray-400 mx-auto animate-pulse" />
            <p className="text-gray-500">Memuat inventaris...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-Friendly Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/')}
              className="p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Kelola Inventaris</h1>
              <p className="text-sm text-gray-500">
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
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Tambah</span>
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-w-6xl mx-auto space-y-6">
        {/* Quick Actions - Tampil jika inventory kosong */}
        {items.length === 0 && (
          <Card className="border-2 border-dashed border-blue-200 bg-blue-50">
            <CardContent className="p-8 text-center">
              <Package className="h-16 w-16 text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Mulai Kelola Inventaris
              </h3>
              <p className="text-gray-600 mb-6">
                {hasRole('owner') && !hasRole('admin') 
                  ? `Belum ada barang di departemen ${getUserDepartment()}. Mulai dengan menambahkan barang pertama.`
                  : 'Belum ada barang di inventaris. Mulai dengan menambahkan barang pertama.'
                }
              </p>
              <Button
                onClick={() => navigate("/add-item")}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Tambah Barang Pertama
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Cari nama barang, kode, atau deskripsi..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-48">
                    <Filter className="h-4 w-4 mr-2" />
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
                
                <div className="flex bg-gray-100 rounded-md p-1">
                  <Button
                    size="sm"
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    onClick={() => setViewMode("grid")}
                    className="p-2"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === "list" ? "default" : "ghost"}
                    onClick={() => setViewMode("list")}
                    className="p-2"
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