import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { CalendarIcon, ArrowLeft, Package, CheckCircle, MapPin, User, Phone } from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "@/components/layout/BottomNav";
import { useCart } from "@/hooks/useCart";
import { Badge } from "@/components/ui/badge";

export default function Checkout() {
  const navigate = useNavigate();
  const { items: cartItems, clearCart, getTotalItems } = useCart();
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    full_name: string;
    phone: string;
    email: string;
  } | null>(null);
  const [useOwnContact, setUseOwnContact] = useState(false);

  const [formData, setFormData] = useState({
    purpose: "",
    location_usage: "",
    pic_name: "",
    pic_contact: "",
  });

  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  useEffect(() => {
    if (cartItems.length === 0) {
      navigate("/cart");
    }
    fetchUserProfile();
  }, [cartItems, navigate]);

  const fetchUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUserProfile({
          ...profile,
          email: user.email || "",
        });
      }
    }
  };

  // Update form when using own contact
  useEffect(() => {
    if (useOwnContact && userProfile) {
      setFormData(prev => ({
        ...prev,
        pic_name: userProfile.full_name || "",
        pic_contact: userProfile.phone || "",
      }));
    } else if (!useOwnContact) {
      setFormData(prev => ({
        ...prev,
        pic_name: "",
        pic_contact: "",
      }));
    }
  }, [useOwnContact, userProfile]);

  const handleSubmit = async () => {
    if (!formData.purpose || !startDate || !endDate || !formData.pic_name || !formData.pic_contact || !formData.location_usage) {
      toast.error("Mohon lengkapi semua field yang wajib diisi");
      return;
    }

    if (endDate < startDate) {
      toast.error("Tanggal selesai harus setelah tanggal mulai");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Create request
      const { data: request, error: requestError } = await supabase
        .from("borrow_requests")
        .insert({
          borrower_id: user.id,
          status: "pending_owner",
          purpose: formData.purpose,
          start_date: format(startDate, "yyyy-MM-dd"),
          end_date: format(endDate, "yyyy-MM-dd"),
          location_usage: formData.location_usage,
          pic_name: formData.pic_name,
          pic_contact: formData.pic_contact,
        })
        .select()
        .single();

      if (requestError) throw requestError;

      // Create request items
      const requestItems = cartItems.map((item) => ({
        request_id: request.id,
        item_id: item.id,
        quantity: item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("request_items")
        .insert(requestItems);

      if (itemsError) throw itemsError;

      toast.success("Pengajuan berhasil dikirim!");
      clearCart();
      navigate("/orders");
    } catch (error: unknown) {
      console.error("Error:", error);
      const errorMessage = error instanceof Error ? error.message : "Gagal mengajukan permintaan";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalDays = () => {
    if (startDate && endDate) {
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }
    return 0;
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container-mobile py-4">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/cart")}
              className="neu-flat"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Checkout</h1>
              <p className="text-sm text-muted-foreground">Lengkapi detail pengajuan peminjaman</p>
            </div>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                ✓
              </div>
              <span className="text-sm text-primary">Pilih Alat</span>
            </div>
            <div className="w-8 h-0.5 bg-primary"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                ✓
              </div>
              <span className="text-sm text-primary">Review Keranjang</span>
            </div>
            <div className="w-8 h-0.5 bg-primary"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                3
              </div>
              <span className="text-sm font-medium text-primary">Form Peminjaman</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container-mobile py-4 space-y-6">
        {/* Cart Summary */}
        <Card className="neu-raised border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Ringkasan Peminjaman ({getTotalItems()} unit)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cartItems.slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Badge variant="outline" className="font-mono">
                  {item.requestedQuantity}x
                </Badge>
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{item.name}</h4>
                  {item.code && (
                    <p className="text-xs text-muted-foreground">{item.code}</p>
                  )}
                </div>
              </div>
            ))}
            {cartItems.length > 3 && (
              <div className="text-center text-sm text-muted-foreground">
                +{cartItems.length - 3} alat lainnya
              </div>
            )}
          </CardContent>
        </Card>

        {/* Date Selection */}
        <Card className="neu-flat">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Periode Peminjaman
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Tanggal Mulai *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal neu-sunken mt-2"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? (
                        format(startDate, "dd MMMM yyyy", { locale: id })
                      ) : (
                        <span>Pilih tanggal mulai</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Tanggal Selesai *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal neu-sunken mt-2"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? (
                        format(endDate, "dd MMMM yyyy", { locale: id })
                      ) : (
                        <span>Pilih tanggal selesai</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      disabled={(date) =>
                        startDate ? date < startDate : date < new Date()
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {startDate && endDate && (
              <div className="text-center p-3 bg-primary/10 rounded-lg">
                <p className="text-sm font-medium text-primary">
                  Durasi: {calculateTotalDays()} hari
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details Form */}
        <Card className="neu-flat">
          <CardHeader>
            <CardTitle className="text-lg">Detail Penggunaan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="purpose" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Keperluan / Tujuan Peminjaman *
              </Label>
              <Textarea
                id="purpose"
                value={formData.purpose}
                onChange={(e) =>
                  setFormData({ ...formData, purpose: e.target.value })
                }
                placeholder="Jelaskan untuk apa alat ini akan digunakan..."
                className="min-h-20 neu-sunken mt-2"
              />
            </div>

            <div>
              <Label htmlFor="location_usage" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Lokasi Penggunaan *
              </Label>
              <Input
                id="location_usage"
                value={formData.location_usage}
                onChange={(e) =>
                  setFormData({ ...formData, location_usage: e.target.value })
                }
                placeholder="Dimana alat akan digunakan?"
                className="neu-sunken mt-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Person in Charge */}
        <Card className="neu-flat">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Penanggung Jawab
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Use own contact checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="useOwnContact"
                checked={useOwnContact}
                onCheckedChange={(checked) => setUseOwnContact(checked as boolean)}
              />
              <Label htmlFor="useOwnContact" className="text-sm font-normal">
                Gunakan nomor dan nama saya sendiri
              </Label>
            </div>

            <div>
              <Label htmlFor="pic_name">Nama Penanggung Jawab *</Label>
              <Input
                id="pic_name"
                value={formData.pic_name}
                onChange={(e) =>
                  setFormData({ ...formData, pic_name: e.target.value })
                }
                placeholder="Nama lengkap PIC"
                className="neu-sunken mt-2"
                disabled={useOwnContact}
              />
            </div>

            <div>
              <Label htmlFor="pic_contact" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Nomor Kontak PIC *
              </Label>
              <Input
                id="pic_contact"
                value={formData.pic_contact}
                onChange={(e) =>
                  setFormData({ ...formData, pic_contact: e.target.value })
                }
                placeholder="08xxxxxxxxxx"
                type="tel"
                className="neu-sunken mt-2"
                disabled={useOwnContact}
              />
              {useOwnContact && (
                <p className="text-xs text-muted-foreground mt-1">
                  Menggunakan data profil Anda: {userProfile?.full_name} - {userProfile?.phone}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="space-y-3 pb-4">
          <Button
            size="lg"
            className="w-full neu-raised"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <Package className="h-5 w-5 mr-2 animate-spin" />
                Mengirim Pengajuan...
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                Kirim Pengajuan Peminjaman
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            className="w-full neu-flat"
            onClick={() => navigate("/cart")}
            disabled={loading}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali ke Keranjang
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}