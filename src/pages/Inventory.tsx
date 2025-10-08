import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Search, ShoppingCart, Filter, Package } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

interface CartItem extends Item {
  requestedQuantity: number;
}

export default function Inventory() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [categories, setCategories] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);

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

  const addToCart = (item: Item) => {
    const existingItem = cart.find(i => i.id === item.id);
    if (existingItem) {
      if (existingItem.requestedQuantity < item.available_quantity) {
        setCart(cart.map(i => 
          i.id === item.id 
            ? { ...i, requestedQuantity: i.requestedQuantity + 1 }
            : i
        ));
      }
    } else {
      setCart([...cart, { ...item, requestedQuantity: 1 }]);
    }
  };

  const removeFromCart = (itemId: string) => {
    const item = cart.find(i => i.id === itemId);
    if (item && item.requestedQuantity > 1) {
      setCart(cart.map(i => 
        i.id === itemId 
          ? { ...i, requestedQuantity: i.requestedQuantity - 1 }
          : i
      ));
    } else {
      setCart(cart.filter(i => i.id !== itemId));
    }
  };

  const isInCart = (itemId: string) => {
    return cart.find(i => i.id === itemId);
  };

  const getStatusBadge = (status: string, available: number) => {
    if (available === 0) return <Badge variant="destructive">Out of Stock</Badge>;
    if (available < 3) return <Badge variant="outline">Limited</Badge>;
    return <Badge variant="default">Available</Badge>;
  };

  const handleCheckout = () => {
    navigate("/new-request", { state: { cartItems: cart } });
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container-mobile py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Inventory</h1>
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
              <p className="text-lg">No items found</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const cartItem = isInCart(item.id);
              return (
                <Card key={item.id} className="neu-raised p-4 hover:shadow-lg transition-shadow">
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
                        Available: {item.available_quantity}
                      </p>

                      <div className="flex items-center gap-2">
                        {cartItem ? (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeFromCart(item.id)}
                              className="neu-pressed"
                            >
                              -
                            </Button>
                            <span className="font-semibold w-8 text-center">
                              {cartItem.requestedQuantity}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addToCart(item)}
                              disabled={cartItem.requestedQuantity >= item.available_quantity}
                              className="neu-flat"
                            >
                              +
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => addToCart(item)}
                            className="w-full"
                          >
                            Add to Request
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
      {cart.length > 0 && (
        <div className="sticky-bottom-bar">
          <div className="container-mobile">
            <Button
              onClick={handleCheckout}
              size="lg"
              className="w-full relative"
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              Request to Borrow ({cart.reduce((sum, item) => sum + item.requestedQuantity, 0)})
            </Button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
