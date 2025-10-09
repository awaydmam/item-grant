import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Search, Package, Plus, Minus, ArrowLeft, Filter, ShoppingCart } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";

interface Item {
  id: string;
  name: string;
  code: string;
  description: string;
  quantity: number;
  available_quantity: number;
  borrowed_quantity?: number;
  status: string;
  image_url: string;
  category_id: string;
  department_id: string;
  categories: { name: string } | null;
  departments: { name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
}

export default function Inventory() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { 
    items: cartItems, 
    addItem, 
    removeItem, 
    updateQuantity,
    getTotalItems, 
    isItemInCart,
    getItemQuantity
  } = useCart();
  const [items, setItems] = useState<Item[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>(
    searchParams.get("department") || "all"
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const departmentName = searchParams.get("name") || "Semua Department";
  const { isOwner, getUserDepartment } = useUserRole();
  const ownerDepartmentName = getUserDepartment();

  useEffect(() => {
    fetchData();
    
    // Setup auto-refresh every 30 seconds for real-time updates
    const interval = setInterval(fetchData, 30000);
    
    // Setup real-time subscription for borrow_requests changes
    const channel = supabase
      .channel('inventory-updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'borrow_requests' },
        () => {
          // Refresh data when borrow_requests change
          fetchData();
        }
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'request_items' },
        () => {
          // Refresh data when request_items change
          fetchData();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Get all items with their base quantities
      const [itemsRes, categoriesRes, departmentsRes] = await Promise.all([
        supabase.from("items").select("*, categories(name), departments(name)").order("name"),
        supabase.from("categories").select("*"),
        supabase.from("departments").select("*")
      ]);

      // Get active/approved requests to calculate borrowed items
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

      // Update items with real available quantity (base - borrowed)
      const itemsWithRealAvailability = itemsRes.data?.map(item => {
        const borrowed = borrowedMap.get(item.id) || 0;
        const reallyAvailable = Math.max(0, item.quantity - borrowed);
        
        return {
          ...item,
          available_quantity: reallyAvailable,
          borrowed_quantity: borrowed,
          status: reallyAvailable === 0 ? 'unavailable' : 
                  reallyAvailable < 3 ? 'limited' : 'available'
        };
      }) || [];

      setItems(itemsWithRealAvailability);
      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (departmentsRes.data) setDepartments(departmentsRes.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error loading inventory:", error);
      toast.error("Gagal memuat data inventory");
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category_id === selectedCategory;
    const matchesDepartment = selectedDepartment === "all" || item.department_id === selectedDepartment;
    
    // Show all items that match filters, regardless of availability
    return matchesSearch && matchesCategory && matchesDepartment;
  });

  const getCartItem = (itemId: string) => {
    return isItemInCart(itemId) ? { id: itemId, quantity: getItemQuantity(itemId) } : null;
  };

  const handleAddToCart = (item: Item) => {
    // Jika user owner dan item milik departemen owner sendiri => blok
    if (isOwner() && ownerDepartmentName && item.departments?.name === ownerDepartmentName) {
      toast.error("Owner tidak bisa meminjam alat milik departemen sendiri");
      return;
    }
    addItem({
      id: item.id,
      name: item.name,
      department_id: item.department_id,
      department_name: item.departments?.name || "Unknown",
      available_quantity: item.available_quantity,
      image_url: item.image_url
    });
    toast.success(`${item.name} ditambahkan ke keranjang`);
  };

  const handleRemoveFromCart = (itemId: string) => {
    removeItem(itemId);
    toast.success("Item dihapus dari keranjang");
  };

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    updateQuantity(itemId, newQuantity);
  };

  const getStatusBadge = (status: string, available: number, borrowed?: number) => {
    if (available === 0) {
      return <Badge variant="destructive">Tidak Tersedia {borrowed ? `(${borrowed} dipinjam)` : ''}</Badge>;
    }
    if (available < 3) {
      return <Badge variant="outline">Terbatas ({available} tersisa)</Badge>;
    }
    return <Badge variant="default">Tersedia ({available})</Badge>;
  };

  const handleCheckout = () => {
    if (getTotalItems() === 0) {
      toast.error("Keranjang kosong");
      return;
    }
    navigate("/cart");
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header dengan Safe Area Support */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border safe-area-top">
        <div className="container-mobile pt-6 pb-4">
          <div className="flex items-center justify-between mb-6 mt-2">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/departments')}
                className="w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white border-0 neu-button-raised hover:neu-button-pressed"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-gray-900 leading-tight">{departmentName}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm text-muted-foreground">
                    {filteredItems.length} alat • {filteredItems.filter(i => i.available_quantity > 0).length} tersedia
                  </p>
                  <span className="text-xs text-muted-foreground">
                    • Update: {lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white border-0 neu-button-raised hover:neu-button-pressed"
            >
              <Filter className="h-5 w-5" />
            </Button>
          </div>

          {/* Search Bar dengan margin yang lebih baik */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              placeholder="Cari Alat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 neu-sunken h-12 text-base"
            />
          </div>

          {/* Filters dengan spacing yang diperbaiki */}
          {showFilters && (
            <div className="grid grid-cols-2 gap-4 mt-4 mb-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="neu-sunken h-12">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="neu-sunken h-12">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Items Grid dengan spacing yang lebih baik */}
      <div className="container-mobile py-6">
        <div className="space-y-4">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <div className="neu-sunken w-20 h-20 rounded-2xl flex items-center justify-center mb-6">
                <Package className="h-10 w-10 opacity-50" />
              </div>
              <p className="text-lg font-medium">Tidak ada alat ditemukan</p>
              <p className="text-sm text-center mt-2 opacity-70">Coba ubah filter atau kata kunci pencarian</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const cartItem = getCartItem(item.id);
              return (
                <Card key={item.id} className="neu-raised hover:shadow-lg transition-all duration-300 overflow-hidden inventory-card prevent-overlap">
                  <div className="p-4 sm:p-5">
                    <div className="inventory-card-content">
                      {/* Item Image dengan enhancement */}
                      <div className="inventory-image flex-shrink-0 rounded-xl bg-muted flex items-center justify-center overflow-hidden neu-sunken">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
                        )}
                      </div>

                      {/* Item Info dengan spacing yang lebih baik */}
                      <div className="inventory-info">
                        {/* Title and Badge Section */}
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-base sm:text-lg text-gray-900 leading-tight line-clamp-2">{item.name}</h3>
                              {item.code && (
                                <p className="text-xs text-muted-foreground mt-1">{item.code}</p>
                              )}
                            </div>
                            <div className="flex-shrink-0 ml-2">
                              {getStatusBadge(item.status, item.available_quantity, item.borrowed_quantity)}
                            </div>
                          </div>

                          {/* Info Section */}
                          <div className="space-y-1">
                            {(() => {
                              // Normalisasi & sanity check
                              const rawQuantity = typeof item.quantity === 'number' ? item.quantity : Number(item.quantity) || 0;
                              const borrowed = typeof item.borrowed_quantity === 'number'
                                ? item.borrowed_quantity
                                : Math.max(0, rawQuantity - (item.available_quantity ?? 0));
                              const available = Math.max(0, rawQuantity - borrowed);

                              // Deteksi anomali (misal faktor 10)
                              if (rawQuantity > 0 && available > rawQuantity) {
                                console.warn('[Inventory Sanity Warning]', {
                                  id: item.id,
                                  name: item.name,
                                  rawQuantity,
                                  availableClient: item.available_quantity,
                                  recomputedAvailable: available,
                                  borrowed
                                });
                              }

                              return (
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  <span className="font-medium">Total:</span> {rawQuantity}
                                  {' • '}<span className="font-medium">Tersedia:</span> {available}
                                  {borrowed > 0 && (
                                    <span>{' • '}<span className="font-medium">Dipinjam:</span> {borrowed}</span>
                                  )}
                                </p>
                              );
                            })()}
                            {item.departments?.name && (
                              <p className="text-xs text-muted-foreground">
                                Pemilik: {item.departments.name}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action Section */}
                        <div className="mt-3 pt-1">
                          {item.available_quantity === 0 ? (
                            <Button
                              size="sm"
                              disabled
                              className="w-full bg-gray-200 text-gray-500 h-9 text-sm"
                            >
                              Tidak Tersedia
                            </Button>
                          ) : (isOwner() && ownerDepartmentName && item.departments?.name === ownerDepartmentName) ? (
                            <Button
                              size="sm"
                              disabled
                              className="w-full h-9 text-sm font-medium bg-gray-200 text-gray-500 cursor-not-allowed"
                              title="Owner tidak boleh meminjam alat departemen sendiri"
                            >
                              Tidak Dapat Dipinjam
                            </Button>
                          ) : cartItem ? (
                            <div className="flex items-center justify-center gap-3">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateQuantity(item.id, cartItem.quantity - 1)}
                                className="w-9 h-9 p-0 flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white border-0 neu-button-raised hover:neu-button-pressed"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="font-semibold text-lg min-w-[2rem] text-center">
                                {cartItem.quantity}
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateQuantity(item.id, cartItem.quantity + 1)}
                                disabled={cartItem.quantity >= item.available_quantity}
                                className="w-9 h-9 p-0 flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white border-0 neu-button-raised hover:neu-button-pressed disabled:bg-gray-400 disabled:hover:bg-gray-400"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleAddToCart(item)}
                              className="w-full h-9 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white border-0 neu-button-raised hover:neu-button-pressed"
                            >
                              Request to Borrow
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Sticky Bottom Cart Bar dengan enhancement */}
      {getTotalItems() > 0 && (
        <div className="sticky-bottom-bar">
          <div className="container-mobile">
            <Button
              onClick={handleCheckout}
              size="lg"
              className="w-full relative h-14 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white border-0 neu-button-raised hover:neu-button-pressed"
            >
              <ShoppingCart className="mr-3 h-6 w-6" />
              Lanjut ke Keranjang ({getTotalItems()})
            </Button>
          </div>
        </div>
      )}

      {/* Floating Cart Button dengan enhancement */}
      {getTotalItems() > 0 && (
        <div className="fixed bottom-24 right-6 z-50 md:block hidden">
          <Button
            onClick={handleCheckout}
            size="lg"
            className="rounded-full w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white border-0 neu-button-raised hover:neu-button-pressed transition-all duration-300 hover:scale-110"
          >
            <div className="relative">
              <ShoppingCart className="h-6 w-6" />
              <Badge className="absolute -top-2 -right-2 min-w-[20px] h-5 text-xs bg-destructive hover:bg-destructive border-0">
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
