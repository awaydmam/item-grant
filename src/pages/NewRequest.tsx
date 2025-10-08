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

      toast.success("Permintaan berhasil diajukan!");
      clearCart(); // Clear cart after successful submission
      navigate("/my-requests");
    } catch (error: unknown) {
      console.error("Error:", error);
      const errorMessage = error instanceof Error ? error.message : "Gagal mengajukan permintaan";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container-mobile py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/inventory")}
              className="neu-flat"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Checkout Request</h1>
          </div>
        </div>
      </div>

      <div className="container-mobile py-4 space-y-6">
        {/* Alat yang Diminta */}
        <Card className="neu-raised">
          <CardHeader>
            <CardTitle className="text-lg">Alat yang Diminta ({cartItems.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="flex gap-3 p-3 border border-border rounded-lg"
              >
                <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center neu-sunken">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <Package className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">{item.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        Tersedia: {item.available_quantity}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateItemQuantity(item.id, Math.max(1, item.requestedQuantity - 1))}
                      className="h-8 w-8 p-0 neu-pressed"
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
                      className="h-8 w-8 p-0 neu-flat"
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Detail Permintaan */}
        <Card className="neu-raised">
          <CardHeader>
            <CardTitle className="text-lg">Detail Permintaan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="purpose">Keperluan / Alasan *</Label>
              <Textarea
                id="purpose"
                value={formData.purpose}
                onChange={(e) =>
                  setFormData({ ...formData, purpose: e.target.value })
                }
                placeholder="Jelaskan keperluan peminjaman alat..."
                className="min-h-24 neu-sunken"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Tanggal Mulai *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal neu-sunken"
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
                <Label>Tanggal Selesai *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal neu-sunken"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
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
              <Label htmlFor="location_usage">Location of Usage *</Label>
              <Input
                id="location_usage"
                value={formData.location_usage}
                onChange={(e) =>
                  setFormData({ ...formData, location_usage: e.target.value })
                }
                placeholder="Where will the items be used?"
                className="neu-sunken"
              />
            </div>

            <div>
              <Label htmlFor="pic_name">Person in Charge (PIC) *</Label>
              <Input
                id="pic_name"
                value={formData.pic_name}
                onChange={(e) =>
                  setFormData({ ...formData, pic_name: e.target.value })
                }
                placeholder="Name of responsible person"
                className="neu-sunken"
              />
            </div>

            <div>
              <Label htmlFor="pic_contact">Contact Number *</Label>
              <Input
                id="pic_contact"
                value={formData.pic_contact}
                onChange={(e) =>
                  setFormData({ ...formData, pic_contact: e.target.value })
                }
                placeholder="Phone number"
                className="neu-sunken"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="space-y-3 pb-4">
          <Button
            size="lg"
            className="w-full"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Submitting..." : "Submit Request"}
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => navigate("/inventory")}
          >
            Back to Inventory
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
