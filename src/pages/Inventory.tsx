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

interface Item {
  id: string;
  name: string;
  code: string;
  description: string;
  available_quantity: number;
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

  const departmentName = searchParams.get("name") || "Semua Department";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [itemsRes, categoriesRes, departmentsRes] = await Promise.all([
      supabase.from("items").select("*, categories(name), departments(name)"),
      supabase.from("categories").select("*"),
      supabase.from("departments").select("*")
    ]);

    if (itemsRes.data) setItems(itemsRes.data);
    if (categoriesRes.data) setCategories(categoriesRes.data);
    if (departmentsRes.data) setDepartments(departmentsRes.data);
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category_id === selectedCategory;
    const matchesDepartment = selectedDepartment === "all" || item.department_id === selectedDepartment;
    
    return matchesSearch && matchesCategory && matchesDepartment && item.available_quantity > 0;
  });

  const getCartItem = (itemId: string) => {
    return isItemInCart(itemId) ? { id: itemId, quantity: getItemQuantity(itemId) } : null;
  };

  const handleAddToCart = (item: Item) => {
    addItem({
      id: item.id,
      name: item.name,
      department_id: item.department_id,
      department_name: item.departments?.name || "Unknown",
      available_quantity: item.available_quantity,
      image_url: item.image_url,
      location: item.location
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

  const getStatusBadge = (status: string, available: number) => {
    if (available === 0) return <Badge variant="destructive">Habis</Badge>;
    if (available < 3) return <Badge variant="outline">Terbatas</Badge>;
    return <Badge variant="default">Tersedia</Badge>;
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
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container-mobile py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/departments')}
                className="neu-flat"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">{departmentName}</h1>
                <p className="text-sm text-muted-foreground">
                  {filteredItems.length} alat tersedia
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="neu-flat"
            >
              <Filter className="h-5 w-5" />
            </Button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              placeholder="Search for tools..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 neu-sunken"
            />
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="neu-sunken">
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
                <SelectTrigger className="neu-sunken">
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

      {/* Items Grid */}
      <div className="container-mobile py-4">
        <div className="grid gap-4">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Package className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg">Tidak ada alat ditemukan</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const cartItem = getCartItem(item.id);
              return (
                <Card key={item.id} className="neu-raised p-4 hover:shadow-lg transition-all">
                  <div className="flex gap-4">
                    {/* Item Image */}
                    <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center overflow-hidden neu-sunken">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="h-10 w-10 text-muted-foreground" />
                      )}
                    </div>

                    {/* Item Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-lg">{item.name}</h3>
                          {item.code && (
                            <p className="text-xs text-muted-foreground">{item.code}</p>
                          )}
                        </div>
                        {getStatusBadge(item.status, item.available_quantity)}
                      </div>

                      <p className="text-sm text-muted-foreground mb-2">
                        Tersedia: {item.available_quantity}
                      </p>

                      <div className="flex items-center gap-2">
                        {cartItem ? (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateQuantity(item.id, cartItem.quantity - 1)}
                              className="neu-pressed w-8 h-8 p-0"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="font-semibold w-8 text-center">
                              {cartItem.quantity}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateQuantity(item.id, cartItem.quantity + 1)}
                              disabled={cartItem.quantity >= item.available_quantity}
                              className="neu-flat w-8 h-8 p-0"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleAddToCart(item)}
                            className="w-full"
                          >
                            Request to Borrow
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Sticky Bottom Cart Bar */}
      {getTotalItems() > 0 && (
        <div className="sticky-bottom-bar">
          <div className="container-mobile">
            <Button
              onClick={handleCheckout}
              size="lg"
              className="w-full relative"
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              Ajukan Peminjaman ({getTotalItems()})
            </Button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
