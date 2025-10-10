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
import { format } from "date-fns";
import { CalendarIcon, X, ArrowLeft, Package, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "@/components/layout/BottomNav";
import { useCart } from "@/hooks/use-cart";

interface RequestItem {
  item_id: string;
  quantity: number;
  name: string;
  available_quantity: number;
}

export default function NewRequest() {
  const navigate = useNavigate();
  const { items: cartItems, updateQuantity, removeItem: removeFromCart, clearCart } = useCart();
  const [loading, setLoading] = useState(false);

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
      navigate("/inventory");
    }
  }, [cartItems, navigate]);

  const removeItem = (itemId: string) => {
    removeFromCart(itemId);
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    if (quantity > 0) {
      updateQuantity(itemId, quantity);
    }
  };

  const handleSubmit = async () => {
    if (!formData.purpose || !startDate || !endDate || !formData.pic_name || !formData.pic_contact) {
      toast.error("Mohon lengkapi semua field yang wajib diisi");
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
        quantity: item.requestedQuantity,
      }));

      const { error: itemsError } = await supabase
        .from("request_items")
        .insert(requestItems);

      if (itemsError) throw itemsError;

  toast.success("Permintaan berhasil diajukan! Mengarahkan ke daftar proses...");
  clearCart(); // kosongkan keranjang setelah submit berhasil
  // Redirect ke halaman Orders (tab Proses default = pending) sesuai requirement baru
  navigate("/orders", { state: { justSubmitted: true, requestId: request.id } });
    } catch (error: unknown) {
      console.error("Error:", error);
      const errorMessage = error instanceof Error ? error.message : "Gagal mengajukan permintaan";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-32 safe-area-pb">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="px-4 py-5 safe-area-pt">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/inventory")}
              className="neu-flat rounded-xl hover:neu-pressed transition-all"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold">Checkout Request</h1>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Alat yang Diminta */}
        <Card className="neu-raised border-0">
          <CardHeader>
            <CardTitle className="text-lg">Alat yang Diminta ({cartItems.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cartItems.map((item, index) => (
              <div
                key={item.id}
                className={`flex gap-4 p-4 neu-sunken rounded-xl ${index > 0 ? 'mt-4' : ''}`}
              >
                <div className="w-16 h-16 rounded-xl neu-flat bg-white flex items-center justify-center flex-shrink-0">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <Package className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold mb-1">{item.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        Tersedia: {item.available_quantity}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                      className="h-8 w-8 neu-flat hover:neu-pressed"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateItemQuantity(item.id, Math.max(1, item.requestedQuantity - 1))}
                      className="h-8 w-8 p-0 neu-pressed border-0"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="font-semibold w-8 text-center">
                      {item.requestedQuantity}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateItemQuantity(item.id, Math.min(item.available_quantity, item.requestedQuantity + 1))}
                      disabled={item.requestedQuantity >= item.available_quantity}
                      className="h-8 w-8 p-0 neu-flat border-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Detail Permintaan */}
        <Card className="neu-raised border-0">
          <CardHeader>
            <CardTitle className="text-lg">Detail Permintaan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label htmlFor="purpose" className="text-sm font-medium mb-2 block">Keperluan / Alasan *</Label>
              <Textarea
                id="purpose"
                value={formData.purpose}
                onChange={(e) =>
                  setFormData({ ...formData, purpose: e.target.value })
                }
                placeholder="Jelaskan keperluan peminjaman alat..."
                className="min-h-24 neu-sunken border-0 bg-white/50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <Label className="text-sm font-medium mb-2 block">Tanggal Mulai *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal neu-sunken border-0 bg-white/50"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? (
                        format(startDate, "PPP")
                      ) : (
                        <span>Pilih tanggal</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Tanggal Selesai *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal neu-sunken border-0 bg-white/50"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : <span>Pilih tanggal</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      disabled={(date) =>
                        startDate ? date < startDate : false
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div>
              <Label htmlFor="location_usage" className="text-sm font-medium mb-2 block">Lokasi Penggunaan *</Label>
              <Input
                id="location_usage"
                value={formData.location_usage}
                onChange={(e) =>
                  setFormData({ ...formData, location_usage: e.target.value })
                }
                placeholder="Dimana alat akan digunakan?"
                className="neu-sunken border-0 bg-white/50"
              />
            </div>

            <div>
              <Label htmlFor="pic_name" className="text-sm font-medium mb-2 block">Penanggung Jawab (PIC) *</Label>
              <Input
                id="pic_name"
                value={formData.pic_name}
                onChange={(e) =>
                  setFormData({ ...formData, pic_name: e.target.value })
                }
                placeholder="Nama penanggung jawab"
                className="neu-sunken border-0 bg-white/50"
              />
            </div>

            <div>
              <Label htmlFor="pic_contact" className="text-sm font-medium mb-2 block">Nomor Kontak *</Label>
              <Input
                id="pic_contact"
                value={formData.pic_contact}
                onChange={(e) =>
                  setFormData({ ...formData, pic_contact: e.target.value })
                }
                placeholder="Nomor telepon"
                className="neu-sunken border-0 bg-white/50"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="space-y-4 pb-4">
          <Button
            size="lg"
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl neu-raised border-0"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Mengirim..." : "Kirim Permintaan"}
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full h-12 rounded-xl neu-flat border-gray-300 hover:neu-pressed"
            onClick={() => navigate("/inventory")}
          >
            Kembali ke Inventaris
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
