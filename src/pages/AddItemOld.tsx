import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Package, 
  Save, 
  ImageIcon, 
  RefreshCw,
  Upload,
  Eye,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";

interface Category {
  id: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
}

interface FormData {
  name: string;
  code: string;
  description: string;
  category_id: string;
  department_id: string;
  quantity: number;
  location: string;
  image_url: string;
}

export default function AddItem() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const { isOwner, isAdmin, getUserDepartment, loading: roleLoading } = useUserRole();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  
  const [formData, setFormData] = useState<FormData>({
    name: "",
    code: "",
    description: "",
    category_id: "",
    department_id: "",
    quantity: 1,
    location: "",
    image_url: "",
  });

  useEffect(() => {
    const init = async () => {
      // Check permissions
      if (!roleLoading && !isOwner() && !isAdmin()) {
        toast.error("Anda tidak memiliki akses untuk mengelola alat");
        navigate("/");
        return;
      }

      await fetchCategories();
      await fetchDepartments();
      
      // Load item for edit mode
      if (isEditMode) {
        await fetchItemForEdit();
      } else {
        // Auto-set department if owner in add mode
        const userDept = getUserDepartment();
        if (userDept) {
          setFormData(prev => ({ ...prev, department_id: userDept.id }));
        }
      }
    };

    init();
  }, [isEditMode, id, roleLoading, fetchCategories, fetchDepartments, fetchItemForEdit, getUserDepartment, isAdmin, isOwner, navigate]);

  const fetchItemForEdit = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      
      setFormData({
        name: data.name,
        code: data.code,
        description: data.description || "",
        category_id: data.category_id || "",
        department_id: data.department_id || "",
        quantity: data.quantity || data.total_quantity || 1,
        location: data.location || "",
        image_url: data.image_url || "",
      });
    } catch (error) {
      console.error("Error fetching item:", error);
      toast.error("Gagal memuat data alat");
      navigate("/manage-inventory");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .order("name");

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  }, []);

  const generateCode = () => {
    const prefix = formData.category_id ? 
      categories.find(c => c.id === formData.category_id)?.name.substring(0, 3).toUpperCase() : 
      "ITM";
    const timestamp = Date.now().toString().slice(-6);
    setFormData(prev => ({ ...prev, code: `${prefix}-${timestamp}` }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.category_id || !formData.department_id) {
      toast.error("Mohon lengkapi semua field yang wajib");
      return;
    }

    setLoading(true);

    try {
      const itemData = {
        ...formData,
        total_quantity: formData.quantity,
        available_quantity: formData.quantity,
        status: "available" as const,
      };

      let error;
      if (isEditMode) {
        ({ error } = await supabase
          .from("items")
          .update(itemData)
          .eq("id", id));
      } else {
        ({ error } = await supabase
          .from("items")
          .insert([itemData]));
      }

      if (error) throw error;

      toast.success(isEditMode ? "Alat berhasil diperbarui" : "Alat berhasil ditambahkan");
      navigate("/manage-inventory");
    } catch (error) {
      console.error("Error saving item:", error);
      toast.error(isEditMode ? "Gagal memperbarui alat" : "Gagal menambah alat");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof FormData) => (value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const filteredDepartments = isOwner() && !isAdmin() ? 
    departments.filter(dept => {
      const userDept = getUserDepartment();
      return userDept && dept.id === userDept.id;
    }) : 
    departments;

  if (roleLoading) {
    return (
      <div className="page-container">
        <div className="p-4 space-y-4">
          <div className="h-8 bg-muted rounded animate-pulse" />
          <div className="h-96 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/manage-inventory")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6" />
            <h1 className="text-2xl font-bold">
              {isEditMode ? "Edit Alat" : "Tambah Alat Baru"}
            </h1>
          </div>
        </div>

        {/* Access Info */}
        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {isAdmin() ? 
              "Sebagai Admin, Anda dapat menambah alat ke semua departemen" : 
              "Sebagai Owner, Anda hanya dapat menambah alat ke departemen Anda"
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Informasi Dasar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Alat *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange("name")(e.target.value)}
                    placeholder="Contoh: Proyektor Epson"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="code">Kode Alat</Label>
                  <div className="flex gap-2">
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => handleChange("code")(e.target.value)}
                      placeholder="Akan dibuat otomatis"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={generateCode}
                      className="shrink-0"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange("description")(e.target.value)}
                  placeholder="Deskripsi detail tentang alat ini..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Category & Department */}
          <Card>
            <CardHeader>
              <CardTitle>Kategori & Lokasi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Kategori *</Label>
                  <Select 
                    value={formData.category_id} 
                    onValueChange={handleChange("category_id")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Departemen *</Label>
                  <Select 
                    value={formData.department_id} 
                    onValueChange={handleChange("department_id")}
                    disabled={isOwner() && !isAdmin()}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih departemen" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredDepartments.map((department) => (
                        <SelectItem key={department.id} value={department.id}>
                          {department.name}
                          {isOwner() && !isAdmin() && (
                            <Badge variant="outline" className="ml-2">
                              Departemen Anda
                            </Badge>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Jumlah *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => handleChange("quantity")(parseInt(e.target.value) || 1)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Lokasi</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleChange("location")(e.target.value)}
                    placeholder="Contoh: Ruang Audio Visual"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Image */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Gambar Alat
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="image">URL Gambar</Label>
                <div className="flex gap-2">
                  <Input
                    id="image"
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => handleChange("image_url")(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(formData.image_url, '_blank')}
                    disabled={!formData.image_url}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {formData.image_url && (
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                  <img
                    src={formData.image_url}
                    alt="Preview"
                    className="w-full max-w-xs h-32 object-cover rounded-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/manage-inventory")}
                  className="flex-1"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      {isEditMode ? "Memperbarui..." : "Menyimpan..."}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {isEditMode ? "Perbarui Alat" : "Simpan Alat"}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}