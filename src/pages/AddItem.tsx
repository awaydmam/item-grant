import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
import { getOptimizedCategories, getOptimizedDepartments, clearRequestCache } from "@/lib/request-optimizer";

interface Category {
  id: string;
  name: string;
  department?: string;
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
  const { hasRole, getUserDepartment, getUserDepartmentId, loading: roleLoading } = useUserRole();

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

  // Debug formData changes
  useEffect(() => {
    console.log('🔄 FormData changed:', formData);
    if (formData.department_id) {
      console.log('🔄 Department ID:', formData.department_id, 'Type:', typeof formData.department_id);
      // Check if department_id is a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      console.log('🔄 Is valid UUID:', uuidRegex.test(formData.department_id));
    }
  }, [formData]);

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
      
      // Get user's department for department-specific categories
      const userDepartment = getUserDepartment();
      
      // Periksa apakah kategori sudah ada di departemen yang sama
      let query = supabase
        .from("categories")
        .select("id")
        .eq("name", newCategory.trim());
      
      // If user is owner, check for department-specific categories
      if (hasRole('owner') && userDepartment) {
        query = query.or(`department.is.null,department.eq."${userDepartment}"`);
      }
      
      const { data: existingCategory, error: checkError } = await query.maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingCategory) {
        toast.error("Kategori sudah ada");
        return;
      }

      // Prepare category data
      const categoryData: { name: string; department?: string } = { name: newCategory.trim() };
      
      // If user is owner, add department to make it department-specific
      if (hasRole('owner') && userDepartment) {
        categoryData.department = userDepartment;
      }
      // If admin, create global category (no department)

      // Tambah kategori baru
      const { data: newCategoryData, error } = await supabase
        .from("categories")
        .insert([categoryData])
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

  const loadedRef = useRef(false);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Separate effect for role management to prevent infinite loops
  useEffect(() => {
    if (!roleLoading) {
      const ownerRole = hasRole('owner');
      const adminRole = hasRole('admin');
      setIsOwner(ownerRole);
      setIsAdmin(adminRole);
    }
  }, [hasRole, roleLoading]);

  // Memoize functions to prevent infinite loops
  const loadItemData = useCallback(async (itemId: string) => {
    console.log('Fetching item data for ID:', itemId);
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .eq("id", itemId)
      .single();
    
    if (error) {
      console.error('Error loading item:', error);
      if (error.code === 'PGRST116') {
        toast.error("Barang tidak ditemukan");
        navigate("/manage-inventory");
        return null;
      }
      throw error;
    }
    
    return data;
  }, [navigate]);

  const loadCommonData = useCallback(async () => {
    const [categoriesResult, departmentsResult] = await Promise.all([
      supabase.from("categories").select("*").order("name"),
      supabase.from("departments").select("*").order("name")
    ]);
    
    return {
      categories: categoriesResult.data || [],
      departments: departmentsResult.data || []
    };
  }, []);

  // Helper untuk memastikan department_id siap (owner)
  const ensureOwnerDepartment = useCallback((depts: Department[]) => {
    if (!isOwner || isAdmin) return;
    if (formData.department_id) return; // sudah diset
    const userDeptName = getUserDepartment();
    if (!userDeptName) return;
    const dept = depts.find(d => d.name === userDeptName);
    if (dept && dept.id) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(dept.id)) {
        console.log('⚙️ ensureOwnerDepartment: setting department_id early:', dept.id);
        setFormData(prev => ({ ...prev, department_id: dept.id }));
      } else {
        console.warn('⚙️ ensureOwnerDepartment: found dept but invalid UUID id:', dept.id);
      }
    } else {
      console.warn('⚙️ ensureOwnerDepartment: department not found for name:', userDeptName);
    }
  }, [isOwner, isAdmin, formData.department_id, getUserDepartment]);

  // Main data loading effect - simplified dependencies
  useEffect(() => {
    if (roleLoading || loadedRef.current) return;

    let isMounted = true;
    console.log('AddItem effect running for ID:', id, 'isEditMode:', isEditMode);
    loadedRef.current = true;

    const loadData = async () => {
      try {
        setLoading(true);
        console.log('Starting data load...');

        // Load common data dengan optimizer
        const [categoriesData, departmentsData] = await Promise.all([
          getOptimizedCategories(),
          getOptimizedDepartments()
        ]);
        
        console.log('📊 Loaded categories:', categoriesData);
        console.log('📊 Loaded departments:', departmentsData);
        
        if (!isMounted) return;
        
        setCategories(categoriesData as Category[]);
        setDepartments(departmentsData as Department[]);

        // Early ensure dept for owner (new item)
        if (!isEditMode) {
          ensureOwnerDepartment(departmentsData as Department[]);
        }

        // Handle edit mode
        if (isEditMode && id) {
          const itemData = await loadItemData(id);
          
          if (itemData && isMounted) {
            console.log('Setting form data with:', itemData);
            const itemFormData = {
              name: itemData.name || "",
              code: itemData.code || "",
              description: itemData.description || "",
              category_id: itemData.category_id || "",
              department_id: itemData.department_id || "",
              quantity: itemData.quantity || 1,
              location: itemData.location || "",
              image_url: itemData.image_url || "",
              status: itemData.status || "available"
            };
            setFormData(itemFormData);
            setOriginalItemData({...itemFormData, available_quantity: itemData.available_quantity || 1});
            setPreviewImage(itemData.image_url || "");
            console.log('Form data set successfully');
          }
        } 
        // Handle new item for owners - moved to separate effect
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Gagal memuat data.");
      } finally {
        if (isMounted) {
          setLoading(false);
          console.log('Data loading completed');
        }
      }
    };

    // Set timeout untuk mencegah loading terlalu lama
    loadTimeoutRef.current = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
        console.log('Loading timeout reached');
        toast.error("Loading timeout. Silakan refresh halaman.");
      }
    }, 15000); // 15 detik timeout

    loadData();

    return () => {
      isMounted = false;
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [id, isEditMode, roleLoading, loadItemData, loadCommonData, ensureOwnerDepartment]);

  // Separate effect for handling new item department assignment
  useEffect(() => {
    console.log('🏢 Department assignment effect running:', {
      roleLoading,
      isEditMode, 
      isOwner,
      isAdmin,
      departmentsLength: departments.length,
      currentDepartmentId: formData.department_id
    });
    
    if (!roleLoading && !isEditMode && isOwner && !isAdmin && departments.length > 0 && !formData.department_id) {
      const userDeptName = getUserDepartment();
      console.log('🏢 User department name from getUserDepartment():', userDeptName);
      
      if (userDeptName) {
        // Manual lookup menggunakan departments dari AddItem component
        console.log('🏢 Available departments from AddItem:', departments.map(d => ({
          id: d.id, 
          name: d.name,
          idType: typeof d.id,
          nameType: typeof d.name
        })));
        
        const dept = departments.find(d => d.name === userDeptName);
        console.log('🏢 Found department via AddItem departments:', dept);
        
        if (dept && dept.id) {
          // Validate UUID format
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (uuidRegex.test(dept.id)) {
            console.log('🏢 ✅ Valid UUID found, setting department_id:', dept.id);
            setFormData(prev => {
              const newData = { ...prev, department_id: dept.id };
              console.log('🏢 ✅ FormData after department auto-set:', newData);
              return newData;
            });
          } else {
            console.error('🏢 ❌ Found department but ID is not valid UUID:', dept.id);
          }
        } else {
          console.error('🏢 ❌ Department not found in AddItem departments array');
          console.error('🏢 ❌ Looking for name:', userDeptName);
          console.error('🏢 ❌ Available names:', departments.map(d => d.name));
        }
      } else {
        console.log('🏢 ❌ No user department name found from getUserDepartment()');
      }
    } else {
      if (formData.department_id) {
        console.log('🏢 ⏸️ Department already set, skipping auto-assignment');
      } else {
        console.log('🏢 ⏸️ Conditions not met for auto-assignment');
      }
    }
  }, [roleLoading, isEditMode, isOwner, isAdmin, departments, getUserDepartment, formData.department_id]);

  // Reset loaded ref when ID changes
  useEffect(() => {
    console.log('ID changed, resetting loadedRef');
    loadedRef.current = false;
  }, [id]);

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
    
    console.log('🚀 Submit started with formData:', formData);
    
    if (!validateForm()) {
      toast.error("Mohon lengkapi semua field yang diperlukan");
      return;
    }
    
    // Additional validation for department_id UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    console.log('🔧 Validating department_id:', formData.department_id);
    console.log('🔧 Department_id type:', typeof formData.department_id);
    console.log('🔧 UUID regex test result:', uuidRegex.test(formData.department_id));
    
    if (!uuidRegex.test(formData.department_id)) {
      console.error('🚨 Invalid department_id format:', formData.department_id);
      console.error('🚨 Type:', typeof formData.department_id);
      console.error('🚨 This is likely the source of the MEDIA error');
      
      // Try to fix it if user is owner
      if (isOwner && !isAdmin && departments.length > 0) {
        console.log('🔧 Attempting to fix invalid UUID...');
        const userDeptName = getUserDepartment();
        console.log('🔧 User department name:', userDeptName);
        
        // Manual lookup using AddItem departments
        const dept = departments.find(d => d.name === userDeptName);
        console.log('🔧 Found department via manual lookup:', dept);
        
        if (dept && dept.id && uuidRegex.test(dept.id)) {
          console.log('🔧 Attempting to fix department_id with manual lookup:', dept.id);
          setFormData(prev => ({ ...prev, department_id: dept.id }));
          toast.error('Format departemen diperbaiki, silakan coba lagi.');
          return;
        } else {
          console.error('🔧 ❌ Manual lookup failed or invalid UUID');
          // LAST RESORT: Query langsung ke Supabase untuk ambil ID departemen dari nama
          if (userDeptName) {
            try {
              console.log('🔧 🔎 Fallback querying departments table for name:', userDeptName);
              const { data: deptRow, error: deptErr } = await supabase
                .from('departments')
                .select('id, name')
                .eq('name', userDeptName)
                .maybeSingle();
              if (deptErr) {
                console.error('🔧 ❌ Fallback query error:', deptErr);
              } else if (deptRow && deptRow.id && uuidRegex.test(deptRow.id)) {
                console.log('🔧 ✅ Fallback query success, setting department_id:', deptRow.id);
                setFormData(prev => ({ ...prev, department_id: deptRow.id }));
                toast.error('Format departemen diperbaiki (fallback), silakan klik simpan lagi.');
                return;
              } else {
                console.error('🔧 ❌ Fallback query did not return valid UUID');
              }
            } catch(fallbackErr) {
              console.error('🔧 ❌ Exception during fallback department fetch:', fallbackErr);
            }
          }
        }
      }
      
      toast.error('Format departemen tidak valid. Silakan refresh halaman.');
      return;
    }
    
    try {
      setSaving(true);

      // Double safety: sebelum operasi DB pastikan department_id valid (owner case)
      if (isOwner && !isAdmin) {
        const uuidOk = uuidRegex.test(formData.department_id);
        if (!uuidOk) {
          console.log('🛑 Safety check failed: department_id masih invalid sebelum DB operation');
          toast.error('Departemen belum valid. Coba lagi.');
          setSaving(false);
          return;
        }
      }
      
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

        console.log('Inserting item data:', itemData);
        console.log('Department ID:', formData.department_id);
        console.log('All formData:', formData);
        console.log('Departments available:', departments);
        
        // Final validation before insert
        console.log('🔍 FINAL CHECK BEFORE INSERT:');
        console.log('🔍 itemData.department_id:', itemData.department_id);
        console.log('🔍 itemData.category_id:', itemData.category_id);
        console.log('🔍 department_id type:', typeof itemData.department_id);
        console.log('🔍 category_id type:', typeof itemData.category_id);
        
        // Check if department_id is valid UUID
        const finalUuidCheck = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const deptUuidValid = finalUuidCheck.test(itemData.department_id);
        const catUuidValid = finalUuidCheck.test(itemData.category_id);
        
        console.log('🔍 Department UUID validation:', deptUuidValid);
        console.log('🔍 Category UUID validation:', catUuidValid);
        
        if (!deptUuidValid) {
          console.error('🚨 CRITICAL: About to insert invalid department UUID!');
          console.error('🚨 Department ID:', itemData.department_id);
          console.error('🚨 Aborting insert to prevent error');
          toast.error('Error: Format departemen tidak valid');
          return;
        }
        
        if (!catUuidValid) {
          console.error('🚨 CRITICAL: About to insert invalid category UUID!');
          console.error('🚨 Category ID:', itemData.category_id);
          console.error('🚨 Aborting insert to prevent error');
          toast.error('Error: Format kategori tidak valid');
          return;
        }

        const { data: newItem, error } = await supabase
          .from("items")
          .insert([{
            ...itemData,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();
        
        if (error) {
          console.error("Database error details:", error);
          throw error;
        }

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
    console.log(`📝 Form field changed: ${field} = ${value}`);
    console.log(`📝 Type of value: ${typeof value}`);
    
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      console.log(`📝 Updated formData:`, newData);
      return newData;
    });
    
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

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-24 safe-area-pb flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 neu-raised bg-blue-100 rounded-2xl flex items-center justify-center mx-auto">
            <Package className="h-8 w-8 text-blue-600 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-800">Memuat Role...</h3>
          </div>
        </div>
      </div>
    );
  }

  // Show loading screen specifically for data loading in edit mode
  if (loading && isEditMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-24 safe-area-pb">
        {/* Header with loading indicator */}
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
                  <h1 className="text-lg font-bold text-gray-900">Edit Barang</h1>
                  <p className="text-xs text-gray-600 animate-pulse">Memuat data barang...</p>
                </div>
              </div>
              <div className="neu-icon p-2 rounded-xl bg-blue-100">
                <Package className="h-5 w-5 text-blue-600 animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Loading Content */}
        <div className="px-4 py-6 space-y-4">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 neu-raised bg-blue-100 rounded-2xl flex items-center justify-center mx-auto">
              <RefreshCw className="h-10 w-10 text-blue-600 animate-spin" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-gray-800">Memuat Data Barang</h3>
              <p className="text-gray-600">Mohon tunggu sebentar...</p>
            </div>
          </div>

          {/* Skeleton Form */}
          <div className="space-y-4 mt-8">
            <Card className="neu-raised border-0">
              <CardHeader className="pb-3 px-4 pt-4">
                <div className="w-32 h-5 neu-flat rounded animate-pulse"></div>
              </CardHeader>
              <CardContent className="space-y-4 px-4 pb-4">
                <div className="w-full h-11 neu-sunken rounded-xl animate-pulse"></div>
                <div className="w-full h-11 neu-sunken rounded-xl animate-pulse"></div>
                <div className="w-full h-24 neu-sunken rounded-xl animate-pulse"></div>
              </CardContent>
            </Card>
            
            <Card className="neu-raised border-0">
              <CardHeader className="pb-3 px-4 pt-4">
                <div className="w-24 h-5 neu-flat rounded animate-pulse"></div>
              </CardHeader>
              <CardContent className="space-y-4 px-4 pb-4">
                <div className="w-full h-11 neu-sunken rounded-xl animate-pulse"></div>
                <div className="w-full h-11 neu-sunken rounded-xl animate-pulse"></div>
              </CardContent>
            </Card>
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
                disabled={loading}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  {isEditMode ? "Edit Barang" : "Tambah Barang"}
                </h1>
                <p className="text-xs text-gray-600">
                  {loading 
                    ? "Memuat data..." 
                    : isEditMode 
                      ? "Perbarui informasi barang" 
                      : "Tambah barang ke inventaris"
                  }
                </p>
              </div>
            </div>
            <div className="neu-icon p-2 rounded-xl bg-blue-100">
              <Package className={`h-5 w-5 text-blue-600 ${loading ? 'animate-pulse' : ''}`} />
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
                  placeholder={loading ? "Memuat..." : "Masukkan nama barang"}
                  className={`neu-sunken border-0 bg-white/50 h-11 ${errors.name ? "ring-2 ring-red-500" : ""} ${loading ? "animate-pulse" : ""}`}
                  disabled={loading}
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
                    placeholder={loading ? "Memuat..." : "Kode unik barang"}
                    className={`neu-sunken border-0 bg-white/50 h-11 ${errors.code ? "ring-2 ring-red-500" : ""} ${loading ? "animate-pulse" : ""}`}
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleInputChange("code", generateCode())}
                    className="neu-button-raised hover:neu-button-pressed px-3 h-11 shrink-0 bg-blue-600 text-white hover:bg-blue-700 border-0"
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
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
                  placeholder={loading ? "Memuat..." : "Deskripsi detail barang (opsional)"}
                  rows={2}
                  className={`neu-sunken border-0 bg-white/50 resize-none ${loading ? "animate-pulse" : ""}`}
                  disabled={loading}
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
                            <div className="flex items-center gap-2">
                              <span>{category.name}</span>
                              {category.department && (
                                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                                  {category.department}
                                </Badge>
                              )}
                              {!category.department && (
                                <Badge variant="outline" className="text-xs bg-gray-50 text-gray-500 border-gray-200">
                                  Global
                                </Badge>
                              )}
                            </div>
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
                          <DialogDescription className="text-sm text-gray-600">
                            {hasRole('owner') && getUserDepartment() ? (
                              <>
                                Kategori akan dibuat khusus untuk departemen <strong>{getUserDepartment()}</strong>. 
                                Hanya anggota departemen ini yang dapat melihat dan menggunakan kategori ini.
                              </>
                            ) : (
                              <>
                                Sebagai admin, kategori akan dibuat sebagai kategori global yang dapat digunakan oleh semua departemen.
                              </>
                            )}
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
                    <div className="relative neu-sunken rounded-xl overflow-hidden w-24 h-24 mx-auto">
                      <img 
                        src={previewImage} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setPreviewImage("");
                          setFormData(prev => ({ ...prev, image_url: "" }));
                        }}
                        className="absolute -top-2 -right-2 p-1 bg-red-600 hover:bg-red-700 text-white neu-button-raised hover:neu-button-pressed border-0 h-6 w-6 rounded-full"
                      >
                        <X className="h-3 w-3" />
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