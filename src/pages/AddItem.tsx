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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ArrowLeft, 
  Package, 
  Save, 
  ImageIcon, 
  RefreshCw,
  Upload,
  Eye,
  AlertCircle,
  Camera,
  X
} from "lucide-react";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { MainLayout } from "@/components/layout/MainLayout";

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
  status: "available" | "unavailable" | "maintenance" | "reserved" | "borrowed" | "damaged" | "lost";
}

interface FormErrors {
  name?: string;
  code?: string;
  description?: string;
  category_id?: string;
  department_id?: string;
  quantity?: string;
  location?: string;
  image_url?: string;
  status?: string;
}

export default function AddItem() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const { isOwner, isAdmin, getUserDepartment, loading: roleLoading } = useUserRole();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [previewImage, setPreviewImage] = useState<string>("");
  
  const [formData, setFormData] = useState<FormData>({
    name: "",
    code: "",
    description: "",
    category_id: "",
    department_id: "",
    quantity: 1,
    location: "",
    image_url: "",
    status: "available" as const
  });

  const [errors, setErrors] = useState<FormErrors>({});

  // Generate automatic code
  const generateCode = useCallback(() => {
    const prefix = formData.category_id || "ITEM";
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
  }, [formData.category_id]);

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
      toast.error("Gagal mengambil data kategori");
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
      toast.error("Gagal mengambil data departemen");
    }
  }, []);

  const fetchItemData = useCallback(async () => {
    if (!isEditMode || !id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setFormData({
          name: data.name || "",
          code: data.code || "",
          description: data.description || "",
          category_id: data.category_id || "",
          department_id: data.department_id || "",
          quantity: data.quantity || 1,
          location: data.location || "",
          image_url: data.image_url || "",
          status: data.status || "available"
        });
        setPreviewImage(data.image_url || "");
      }
    } catch (error) {
      console.error("Error fetching item:", error);
      toast.error("Gagal mengambil data barang");
      navigate("/manage-inventory");
    } finally {
      setLoading(false);
    }
  }, [isEditMode, id, navigate]);

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchCategories(),
        fetchDepartments(),
        fetchItemData()
      ]);
      
      // Set default department for owner (using department name, not ID)
      if (!isEditMode && isOwner() && !isAdmin()) {
        const userDeptName = getUserDepartment();
        console.log('Setting default department for owner:', userDeptName);
        if (userDeptName) {
          // Find department ID from name
          const dept = departments.find(d => d.name === userDeptName);
          if (dept) {
            setFormData(prev => ({ ...prev, department_id: dept.id }));
            console.log('Default department set:', dept.id);
          }
        }
      }
    };
    
    if (!roleLoading) {
      loadData();
    }
  }, [roleLoading, fetchCategories, fetchDepartments, fetchItemData, isEditMode, isOwner, isAdmin, getUserDepartment, departments]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.name.trim()) newErrors.name = "Nama barang harus diisi";
    if (!formData.code.trim()) newErrors.code = "Kode barang harus diisi";
    if (!formData.category_id) newErrors.category_id = "Kategori harus dipilih";
    if (!formData.department_id) newErrors.department_id = "Departemen harus dipilih";
    if (formData.quantity < 1) newErrors.quantity = "Jumlah minimal 1";
    if (!formData.location.trim()) newErrors.location = "Lokasi harus diisi";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Mohon lengkapi semua field yang diperlukan");
      return;
    }
    
    try {
      setSaving(true);
      
      const itemData = {
        ...formData,
        available_quantity: formData.quantity,
        total_quantity: formData.quantity,
        updated_at: new Date().toISOString()
      };
      
      if (isEditMode && id) {
        const { error } = await supabase
          .from("items")
          .update(itemData)
          .eq("id", id);
        
        if (error) throw error;
        toast.success("Barang berhasil diperbarui");
      } else {
        const { error } = await supabase
          .from("items")
          .insert([{
            ...itemData,
            created_at: new Date().toISOString()
          }]);
        
        if (error) throw error;
        toast.success("Barang berhasil ditambahkan");
      }
      
      navigate("/manage-inventory");
    } catch (error) {
      console.error("Error saving item:", error);
      toast.error(isEditMode ? "Gagal memperbarui barang" : "Gagal menambahkan barang");
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setPreviewImage(result);
        setFormData(prev => ({ ...prev, image_url: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  if (roleLoading || loading) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <div className="flex justify-center items-center h-64">
            <div className="text-center space-y-4">
              <Package className="h-12 w-12 text-gray-400 mx-auto animate-pulse" />
              <p className="text-gray-500">
                {loading ? "Memuat data barang..." : "Memuat..."}
              </p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate("/manage-inventory")}
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEditMode ? "Edit Barang" : "Tambah Barang"}
            </h1>
            <p className="text-gray-600 mt-1">
              {isEditMode ? "Perbarui informasi barang inventaris" : "Tambahkan barang baru ke inventaris"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
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
                    <div>
                      <Label htmlFor="name">Nama Barang *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        placeholder="Masukkan nama barang"
                        className={errors.name ? "border-red-500" : ""}
                      />
                      {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
                    </div>
                    
                    <div>
                      <Label htmlFor="code">Kode Barang *</Label>
                      <div className="flex gap-2">
                        <Input
                          id="code"
                          value={formData.code}
                          onChange={(e) => handleInputChange("code", e.target.value)}
                          placeholder="Kode unik barang"
                          className={errors.code ? "border-red-500" : ""}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleInputChange("code", generateCode())}
                          className="px-3"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                      {errors.code && <p className="text-sm text-red-500 mt-1">{errors.code}</p>}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Deskripsi</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      placeholder="Deskripsi detail barang (opsional)"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Classification */}
              <Card>
                <CardHeader>
                  <CardTitle>Klasifikasi</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category">Kategori *</Label>
                      <Select
                        value={formData.category_id}
                        onValueChange={(value) => handleInputChange("category_id", value)}
                      >
                        <SelectTrigger className={errors.category_id ? "border-red-500" : ""}>
                          <SelectValue placeholder="Pilih kategori" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(category => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.category_id && <p className="text-sm text-red-500 mt-1">{errors.category_id}</p>}
                    </div>

                    <div>
                      <Label htmlFor="department">Departemen *</Label>
                      <Select
                        value={formData.department_id}
                        onValueChange={(value) => handleInputChange("department_id", value)}
                        disabled={isOwner() && !isAdmin()}
                      >
                        <SelectTrigger className={errors.department_id ? "border-red-500" : ""}>
                          <SelectValue placeholder="Pilih departemen" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map(dept => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.department_id && <p className="text-sm text-red-500 mt-1">{errors.department_id}</p>}
                      {isOwner() && !isAdmin() && (
                        <p className="text-sm text-gray-500 mt-1">
                          Departemen otomatis sesuai role Anda
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="quantity">Jumlah *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        value={formData.quantity}
                        onChange={(e) => handleInputChange("quantity", parseInt(e.target.value) || 1)}
                        className={errors.quantity ? "border-red-500" : ""}
                      />
                      {errors.quantity && <p className="text-sm text-red-500 mt-1">{errors.quantity}</p>}
                    </div>

                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => handleInputChange("status", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">Tersedia</SelectItem>
                          <SelectItem value="maintenance">Perawatan</SelectItem>
                          <SelectItem value="unavailable">Tidak Tersedia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="location">Lokasi *</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => handleInputChange("location", e.target.value)}
                        placeholder="Lokasi penyimpanan"
                        className={errors.location ? "border-red-500" : ""}
                      />
                      {errors.location && <p className="text-sm text-red-500 mt-1">{errors.location}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Image Upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Foto Barang
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {previewImage ? (
                    <div className="relative">
                      <img
                        src={previewImage}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setPreviewImage("");
                          setFormData(prev => ({ ...prev, image_url: "" }));
                        }}
                        className="absolute top-2 right-2 p-2"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-sm text-gray-500 mb-4">
                        Belum ada foto barang
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <Label htmlFor="image" className="cursor-pointer">
                      <div className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors">
                        <Upload className="h-4 w-4" />
                        <span className="text-sm">Upload Foto</span>
                      </div>
                    </Label>
                    <input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      aria-label="Upload foto barang"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="image_url">Atau URL Gambar</Label>
                    <Input
                      id="image_url"
                      value={formData.image_url}
                      onChange={(e) => {
                        handleInputChange("image_url", e.target.value);
                        setPreviewImage(e.target.value);
                      }}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {saving ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {saving 
                      ? (isEditMode ? "Menyimpan..." : "Menambahkan...") 
                      : (isEditMode ? "Simpan Perubahan" : "Tambah Barang")
                    }
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/manage-inventory")}
                    className="w-full"
                    disabled={saving}
                  >
                    Batal
                  </Button>
                </CardContent>
              </Card>

              {/* Help */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Tips:</strong> Pastikan semua informasi sudah benar sebelum menyimpan. 
                  Kode barang harus unik dan tidak boleh sama dengan barang lain.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}