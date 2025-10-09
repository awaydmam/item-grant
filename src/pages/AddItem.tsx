import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Package, 
  Save, 
  RefreshCw,
  AlertCircle,
  Camera,
  X,
  Plus,
  Folder
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
  status: "available" | "maintenance" | "reserved" | "borrowed" | "damaged" | "lost";
  available_quantity?: number; // Tambahkan untuk tracking
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
  const { hasRole, getUserDepartment, loading: roleLoading } = useUserRole();

  const [isOwner, setIsOwner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [loading, setLoading] = useState(true); // Start with loading true
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
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [originalItemData, setOriginalItemData] = useState<FormData | null>(null);

  // Fungsi untuk mencatat aktivitas perubahan item (disabled sementara)
  const logItemActivity = async (itemId: string, actionType: string, oldValues: Record<string, unknown>, newValues: Record<string, unknown>, notes?: string) => {
    try {
      // TODO: Implement activity logging when table is created
      console.log('Activity log:', { itemId, actionType, oldValues, newValues, notes });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  // Fungsi untuk menambah kategori baru
  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      toast.error("Nama kategori harus diisi");
      return;
    }

    try {
      setAddingCategory(true);
      
      // Periksa apakah kategori sudah ada
      const { data: existingCategory } = await supabase
        .from("categories")
        .select("id")
        .eq("name", newCategory.trim())
        .single();

      if (existingCategory) {
        toast.error("Kategori sudah ada");
        return;
      }

      // Tambah kategori baru
      const { data: newCategoryData, error } = await supabase
        .from("categories")
        .insert([{ name: newCategory.trim() }])
        .select()
        .single();

      if (error) throw error;

      // Update list kategori
      setCategories(prev => [...prev, newCategoryData]);
      
      // Set kategori yang baru dibuat sebagai kategori yang dipilih
      setFormData(prev => ({ ...prev, category_id: newCategoryData.id }));
      
      // Reset form dan tutup dialog
      setNewCategory("");
      setIsAddCategoryOpen(false);
      toast.success("Kategori berhasil ditambahkan");
    } catch (error) {
      console.error("Error adding category:", error);
      toast.error("Gagal menambahkan kategori");
    } finally {
      setAddingCategory(false);
    }
  };

  // Generate automatic code
  const generateCode = useCallback(() => {
    const prefix = formData.category_id 
      ? categories.find(c => c.id === formData.category_id)?.name.toUpperCase().substring(0, 4) || 'ITEM' 
      : 'ITEM';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
  }, [formData.category_id, categories]);

  useEffect(() => {
    // Only run logic when role information is available
    if (!roleLoading) {
      const owner = hasRole('owner');
      const admin = hasRole('admin');
      setIsOwner(owner);
      setIsAdmin(admin);

      let isMounted = true;

      const loadData = async () => {
        try {
          // Fetch common data
          const [categoriesResult, departmentsResult] = await Promise.all([
            supabase.from("categories").select("*").order("name"),
            supabase.from("departments").select("*").order("name")
          ]);

          if (!isMounted) return;

          if (categoriesResult.data) setCategories(categoriesResult.data);
          if (departmentsResult.data) setDepartments(departmentsResult.data);

          // Handle edit mode
          if (isEditMode && id) {
            const { data, error } = await supabase
              .from("items")
              .select("*")
              .eq("id", id)
              .single();
            
            if (error) throw error;
            
            if (data && isMounted) {
              const itemFormData = {
                name: data.name || "",
                code: data.code || "",
                description: data.description || "",
                category_id: data.category_id || "",
                department_id: data.department_id || "",
                quantity: data.quantity || 1,
                location: data.location || "",
                image_url: data.image_url || "",
                status: data.status || "available"
              };
              setFormData(itemFormData);
              setOriginalItemData({...itemFormData, available_quantity: data.available_quantity || 1}); // Simpan data original termasuk available_quantity
              setPreviewImage(data.image_url || "");
            }
          } 
          // Handle new item mode for owners
          else if (!isEditMode && owner && !admin && departmentsResult.data) {
            const userDeptName = getUserDepartment();
            if (userDeptName) {
              const dept = departmentsResult.data.find(d => d.name === userDeptName);
              if (dept && isMounted) {
                setFormData(prev => ({ ...prev, department_id: dept.id }));
              }
            }
          }
        } catch (error) {
          console.error("Error loading data:", error);
          toast.error("Gagal memuat data.");
          if (isEditMode) navigate("/manage-inventory");
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      };

      loadData();

      return () => {
        isMounted = false;
      };
    }
  }, [roleLoading, isEditMode, id, navigate, hasRole, getUserDepartment]);

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
      
      if (isEditMode && id) {
        // Mode Edit - ambil data lama untuk perbandingan
        const { data: oldItem, error: fetchError } = await supabase
          .from("items")
          .select("*")
          .eq("id", id)
          .single();

        if (fetchError) throw fetchError;

        // Hitung perubahan quantity
        const quantityDifference = formData.quantity - (oldItem?.quantity || 0);
        const newAvailableQuantity = Math.max(0, (oldItem?.available_quantity || 0) + quantityDifference);

        const itemData = {
          ...formData,
          available_quantity: newAvailableQuantity,
          updated_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from("items")
          .update(itemData)
          .eq("id", id);
        
        if (error) throw error;

        // Log perubahan
        await logItemActivity(
          id,
          'updated',
          oldItem,
          itemData,
          `Item diperbarui. Quantity berubah dari ${oldItem?.quantity} menjadi ${formData.quantity}. Available quantity: ${newAvailableQuantity}`
        );

        toast.success("Barang berhasil diperbarui");
      } else {
        // Mode Tambah Baru
        const itemData = {
          ...formData,
          available_quantity: formData.quantity, // Available quantity sama dengan total quantity untuk item baru
          updated_at: new Date().toISOString()
        };

        const { data: newItem, error } = await supabase
          .from("items")
          .insert([{
            ...itemData,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();
        
        if (error) throw error;

        // Log pembuatan item baru
        await logItemActivity(
          newItem.id,
          'created',
          {},
          itemData,
          `Item baru ditambahkan dengan quantity ${formData.quantity}`
        );

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-24 safe-area-pb flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 neu-raised bg-blue-700 rounded-2xl flex items-center justify-center mx-auto">
            <Package className="h-8 w-8 text-blue-600 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-800">
              {loading ? "Memuat Data Barang..." : "Memuat..."}
            </h3>
            <p className="text-gray-600">Silakan tunggu sebentar</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-32 safe-area-pb">
      {/* Enhanced Mobile Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="px-4 py-4 safe-area-pt">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate("/manage-inventory")}
                className="neu-button-raised rounded-xl hover:neu-button-pressed transition-all bg-gray-100 text-gray-700 hover:bg-gray-200 w-10 h-10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  {isEditMode ? "Edit Barang" : "Tambah Barang"}
                </h1>
                <p className="text-xs text-gray-600">
                  {isEditMode ? "Perbarui informasi barang" : "Tambah barang ke inventaris"}
                </p>
              </div>
            </div>
            <div className="neu-icon p-2 rounded-xl bg-blue-100">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Improved Form Container */}
      <div className="px-4 py-5 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information Card - More compact */}
          <Card className="neu-raised border-0">
            <CardHeader className="pb-3 px-4 pt-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <div className="neu-icon p-1 rounded-lg bg-blue-100">
                  <Package className="h-4 w-4 text-blue-600" />
                </div>
                Informasi Dasar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-4 pb-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-gray-700 mb-2 block">Nama Barang *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Masukkan nama barang"
                  className={`neu-sunken border-0 bg-white/50 h-11 ${errors.name ? "ring-2 ring-red-500" : ""}`}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>
              
              <div>
                <Label htmlFor="code" className="text-sm font-medium text-gray-700 mb-2 block">Kode Barang *</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => handleInputChange("code", e.target.value)}
                    placeholder="Kode unik barang"
                    className={`neu-sunken border-0 bg-white/50 h-11 ${errors.code ? "ring-2 ring-red-500" : ""}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleInputChange("code", generateCode())}
                    className="neu-button-raised hover:neu-button-pressed px-3 h-11 shrink-0 bg-blue-600 text-white hover:bg-blue-700 border-0"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code}</p>}
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-medium text-gray-700 mb-2 block">Deskripsi</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Deskripsi detail barang (opsional)"
                  rows={2}
                  className="neu-sunken border-0 bg-white/50 resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Classification Card - More compact */}
          <Card className="neu-raised border-0">
            <CardHeader className="pb-3 px-4 pt-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <div className="neu-icon p-1 rounded-lg bg-purple-100">
                  <Folder className="h-4 w-4 text-purple-600" />
                </div>
                Klasifikasi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-4 pb-4">
              <div>
                <Label htmlFor="category" className="text-sm font-medium text-gray-700 mb-2 block">Kategori *</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select
                      value={formData.category_id}
                      onValueChange={(value) => handleInputChange("category_id", value)}
                    >
                      <SelectTrigger className={`neu-sunken border-0 bg-white/50 h-11 ${errors.category_id ? "ring-2 ring-red-500" : ""}`}>
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
                  </div>
                  
                  {/* Tombol Tambah Kategori - Compact */}
                  {(isOwner || isAdmin) && (
                    <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          className="neu-button-raised hover:neu-button-pressed px-3 h-11 shrink-0 bg-blue-600 text-white hover:bg-blue-700 border-0"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="neu-raised border-0 mx-4 max-w-md">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2 text-lg">
                            <div className="neu-icon p-1 rounded-lg bg-blue-100">
                              <Folder className="h-4 w-4 text-blue-600" />
                            </div>
                            Tambah Kategori Baru
                          </DialogTitle>
                          <DialogDescription className="text-sm">
                            Tambahkan kategori baru untuk mengelompokkan barang inventaris.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="newCategory" className="text-sm font-medium">Nama Kategori</Label>
                            <Input
                              id="newCategory"
                              placeholder="Masukkan nama kategori"
                              value={newCategory}
                              onChange={(e) => setNewCategory(e.target.value)}
                              className="neu-sunken border-0 bg-white/50 h-11"
                            />
                          </div>
                        </div>
                        <DialogFooter className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setIsAddCategoryOpen(false)}
                            disabled={addingCategory}
                            className="neu-button-raised hover:neu-button-pressed bg-gray-100 text-gray-700 hover:bg-gray-200 border-0 flex-1"
                          >
                            Batal
                          </Button>
                          <Button
                            onClick={handleAddCategory}
                            disabled={addingCategory}
                            className="bg-blue-600 hover:bg-blue-700 text-white neu-button-raised hover:neu-button-pressed border-0 flex-1"
                          >
                            {addingCategory ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Menyimpan...
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4 mr-2" />
                                Tambah
                              </>
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
                {errors.category_id && <p className="text-xs text-red-500 mt-1">{errors.category_id}</p>}
              </div>

              <div>
                <Label htmlFor="department" className="text-sm font-medium text-gray-700 mb-2 block">
                  Departemen *
                  {isOwner && !isAdmin && (
                    <span className="ml-2 text-xs text-blue-600">(Otomatis)</span>
                  )}
                </Label>
                <Select
                  value={formData.department_id}
                  onValueChange={(value) => handleInputChange("department_id", value)}
                  disabled={isOwner && !isAdmin}
                >
                  <SelectTrigger className={`neu-sunken border-0 bg-white/50 h-11 ${errors.department_id ? "ring-2 ring-red-500" : ""} ${isOwner && !isAdmin ? "opacity-75" : ""}`}>
                    <SelectValue placeholder="Pilih departemen" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(department => (
                      <SelectItem key={department.id} value={department.id}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.department_id && <p className="text-xs text-red-500 mt-1">{errors.department_id}</p>}
                {isOwner && !isAdmin && (
                  <p className="text-xs text-gray-500 mt-1">Departemen otomatis sesuai role Anda</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Details Card - More compact */}
          <Card className="neu-raised border-0">
            <CardHeader className="pb-3 px-4 pt-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <div className="neu-icon p-1 rounded-lg bg-green-100">
                  <AlertCircle className="h-4 w-4 text-green-600" />
                </div>
                Detail Barang
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-4 pb-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="quantity" className="text-sm font-medium text-gray-700 mb-2 block">
                    Jumlah Total *
                    {isEditMode && originalItemData && (
                      <span className="block text-xs text-blue-600 font-normal">
                        Tersedia: {originalItemData.available_quantity}
                      </span>
                    )}
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => handleInputChange("quantity", parseInt(e.target.value) || 1)}
                    className={`neu-sunken border-0 bg-white/50 h-11 ${errors.quantity ? "ring-2 ring-red-500" : ""}`}
                  />
                  {errors.quantity && <p className="text-xs text-red-500 mt-1">{errors.quantity}</p>}
                  {isEditMode && originalItemData && (
                    <p className="text-xs text-gray-600 mt-1">
                      {formData.quantity > (originalItemData.quantity || 0) 
                        ? `+${formData.quantity - (originalItemData.quantity || 0)} unit` 
                        : formData.quantity < (originalItemData.quantity || 0)
                        ? `-${(originalItemData.quantity || 0) - formData.quantity} unit`
                        : "Tidak berubah"
                      }
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="status" className="text-sm font-medium text-gray-700 mb-2 block">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleInputChange("status", value)}
                  >
                    <SelectTrigger className="neu-sunken border-0 bg-white/50 h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Tersedia</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="reserved">Reserved</SelectItem>
                      <SelectItem value="damaged">Rusak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="location" className="text-sm font-medium text-gray-700 mb-2 block">Lokasi *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  placeholder="Contoh: Ruang Lab IPA, Lantai 2"
                  className={`neu-sunken border-0 bg-white/50 h-11 ${errors.location ? "ring-2 ring-red-500" : ""}`}
                />
                {errors.location && <p className="text-xs text-red-500 mt-1">{errors.location}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Image Upload Card - More compact */}
          <Card className="neu-raised border-0">
            <CardHeader className="pb-3 px-4 pt-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <div className="neu-icon p-1 rounded-lg bg-orange-100">
                  <Camera className="h-4 w-4 text-orange-600" />
                </div>
                Foto Barang
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-4 pb-4">
              <div>
                <Label htmlFor="image" className="text-sm font-medium text-gray-700 mb-2 block">Upload Gambar</Label>
                <div className="mt-2">
                  {previewImage ? (
                    <div className="relative neu-sunken rounded-xl overflow-hidden">
                      <img 
                        src={previewImage} 
                        alt="Preview" 
                        className="w-full h-28 object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setPreviewImage("");
                          setFormData(prev => ({ ...prev, image_url: "" }));
                        }}
                        className="absolute top-2 right-2 p-1 bg-red-600 hover:bg-red-700 text-white neu-button-raised hover:neu-button-pressed border-0 h-8 w-8"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="neu-sunken rounded-xl p-4 text-center bg-gray-50">
                      <div className="neu-flat p-2 rounded-xl bg-orange-100 w-10 h-10 mx-auto mb-3 flex items-center justify-center">
                        <Camera className="h-5 w-5 text-orange-600" />
                      </div>
                      <p className="text-sm text-gray-600 mb-3">Upload foto barang</p>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                      />
                      <Label 
                        htmlFor="image-upload" 
                        className="cursor-pointer bg-blue-600 text-white px-3 py-2 rounded-xl text-sm hover:bg-blue-700 transition-colors neu-button-raised hover:neu-button-pressed border-0 inline-block font-medium"
                      >
                        Pilih Gambar
                      </Label>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">Format: JPG, PNG (Max 5MB)</p>
              </div>
            </CardContent>
          </Card>

          {/* Helper Alert - More compact */}
          <Alert className="neu-sunken bg-blue-50/50 border-0 p-3">
            <div className="flex items-start gap-3">
              <div className="neu-icon p-1 rounded-lg bg-blue-100 flex-shrink-0">
                <AlertCircle className="h-4 w-4 text-blue-600" />
              </div>
              <AlertDescription className="text-blue-800 text-sm leading-relaxed">
                <strong>Info Quantity:</strong>{" "}
                {isEditMode ? (
                  "Perubahan quantity akan mengatur jumlah tersedia. Pastikan tidak mengurangi di bawah jumlah yang sedang dipinjam."
                ) : (
                  "Quantity total barang. Saat peminjaman, jumlah tersedia berkurang otomatis dan kembali normal saat dikembalikan."
                )}
              </AlertDescription>
            </div>
          </Alert>
        </form>
      </div>

      {/* Enhanced Sticky Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 z-40 safe-area-pb">
        <div className="px-4 py-3">
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/manage-inventory")}
              disabled={saving}
              className="flex-1 h-11 neu-button-raised hover:neu-button-pressed bg-gray-100 text-gray-700 hover:bg-gray-200 border-0 font-medium"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white neu-button-raised hover:neu-button-pressed border-0 font-medium"
              onClick={handleSubmit}
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {isEditMode ? "Memperbarui..." : "Menyimpan..."}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditMode ? "Perbarui Barang" : "Simpan Barang"}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}