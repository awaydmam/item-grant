import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Package, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Inventory() {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Fetch items
    const { data: itemsData } = await supabase
      .from("items")
      .select(`
        *,
        category:categories(name),
        department:departments(name)
      `)
      .eq("status", "available")
      .order("name");

    if (itemsData) setItems(itemsData);

    // Fetch categories
    const { data: categoriesData } = await supabase
      .from("categories")
      .select("*")
      .order("name");
    if (categoriesData) setCategories(categoriesData);

    // Fetch departments
    const { data: departmentsData } = await supabase
      .from("departments")
      .select("*")
      .order("name");
    if (departmentsData) setDepartments(departmentsData);
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category_id === selectedCategory;
    const matchesDepartment = selectedDepartment === "all" || item.department_id === selectedDepartment;
    
    return matchesSearch && matchesCategory && matchesDepartment;
  });

  const getStatusBadge = (availableQty: number, totalQty: number) => {
    if (availableQty === 0) return <Badge variant="destructive">Tidak Tersedia</Badge>;
    if (availableQty < totalQty / 2) return <Badge variant="secondary">Terbatas</Badge>;
    return <Badge className="bg-success text-success-foreground">Tersedia</Badge>;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Inventaris Alat</h1>
          <p className="text-muted-foreground">Cari dan ajukan peminjaman alat</p>
        </div>

        {/* Search and Filters */}
        <Card className="neu-flat">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama alat..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 neu-sunken"
                />
              </div>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="neu-sunken">
                  <SelectValue placeholder="Semua Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="neu-sunken">
                  <SelectValue placeholder="Semua Pemilik" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Pemilik</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <Card key={item.id} className="neu-flat hover:neu-raised transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="neu-raised p-3 rounded-xl">
                      <Package className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      {item.code && (
                        <p className="text-xs text-muted-foreground">Kode: {item.code}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <CardDescription className="line-clamp-2">
                  {item.description || "Tidak ada deskripsi"}
                </CardDescription>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pemilik:</span>
                    <span className="font-medium">{item.department?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kategori:</span>
                    <span className="font-medium">{item.category?.name || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ketersediaan:</span>
                    <span className="font-medium">
                      {item.available_quantity} / {item.quantity} unit
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    {getStatusBadge(item.available_quantity, item.quantity)}
                  </div>
                  {item.location && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lokasi:</span>
                      <span className="font-medium">{item.location}</span>
                    </div>
                  )}
                </div>

                <Button
                  className="w-full neu-raised hover:neu-pressed"
                  disabled={item.available_quantity === 0}
                  onClick={() => navigate("/new-request", { state: { itemId: item.id } })}
                >
                  Ajukan Pinjam
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <Card className="neu-flat">
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Tidak ada alat yang sesuai dengan pencarian</p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}