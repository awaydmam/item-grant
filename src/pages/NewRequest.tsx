import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function NewRequest() {
  const navigate = useNavigate();
  const location = useLocation();
  const preselectedItemId = location.state?.itemId;

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<Array<{ item_id: string; quantity: number }>>([]);
  const [formData, setFormData] = useState({
    purpose: "",
    start_date: new Date(),
    end_date: new Date(),
    location_usage: "",
    pic_name: "",
    pic_contact: "",
  });

  useEffect(() => {
    fetchItems();
    if (preselectedItemId) {
      setSelectedItems([{ item_id: preselectedItemId, quantity: 1 }]);
    }
  }, [preselectedItemId]);

  const fetchItems = async () => {
    const { data } = await supabase
      .from("items")
      .select("id, name, available_quantity")
      .eq("status", "available")
      .order("name");
    
    if (data) setItems(data);
  };

  const addItem = () => {
    setSelectedItems([...selectedItems, { item_id: "", quantity: 1 }]);
  };

  const removeItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...selectedItems];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedItems.length === 0 || selectedItems.some(item => !item.item_id)) {
      toast.error("Pilih minimal satu alat");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      // Create request
      const { data: request, error: requestError } = await supabase
        .from("borrow_requests")
        .insert({
          borrower_id: user.id,
          status: "pending_owner",
          purpose: formData.purpose,
          start_date: format(formData.start_date, "yyyy-MM-dd"),
          end_date: format(formData.end_date, "yyyy-MM-dd"),
          location_usage: formData.location_usage,
          pic_name: formData.pic_name,
          pic_contact: formData.pic_contact,
        })
        .select()
        .single();

      if (requestError) throw requestError;

      // Create request items
      const requestItems = selectedItems.map((item) => ({
        request_id: request.id,
        item_id: item.item_id,
        quantity: item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("request_items")
        .insert(requestItems);

      if (itemsError) throw itemsError;

      // Update item availability to reserved
      for (const item of selectedItems) {
        const { data: currentItem } = await supabase
          .from("items")
          .select("available_quantity")
          .eq("id", item.item_id)
          .single();

        if (currentItem) {
          await supabase
            .from("items")
            .update({
              available_quantity: currentItem.available_quantity - item.quantity,
              status: currentItem.available_quantity - item.quantity === 0 ? "reserved" : "available"
            })
            .eq("id", item.item_id);
        }
      }

      toast.success("Permintaan terkirim. Menunggu verifikasi Pemilik Alat.");
      navigate("/my-requests");
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Gagal mengajukan permintaan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Ajukan Peminjaman</h1>
          <p className="text-muted-foreground">Isi form untuk mengajukan peminjaman alat</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="neu-flat">
            <CardHeader>
              <CardTitle>Detail Peminjaman</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Items Selection */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Alat yang Dipinjam</Label>
                  <Button type="button" size="sm" onClick={addItem} className="neu-raised">
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Alat
                  </Button>
                </div>

                {selectedItems.map((item, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label className="text-xs">Nama Alat</Label>
                      <select
                        value={item.item_id}
                        onChange={(e) => updateItem(index, "item_id", e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg neu-sunken"
                        required
                      >
                        <option value="">Pilih alat...</option>
                        {items.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name} (Tersedia: {i.available_quantity})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-24">
                      <Label className="text-xs">Jumlah</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value))}
                        className="neu-sunken"
                        required
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      className="neu-flat hover:neu-pressed"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Purpose */}
              <div className="space-y-2">
                <Label htmlFor="purpose">Keperluan</Label>
                <Textarea
                  id="purpose"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="Jelaskan keperluan peminjaman..."
                  required
                  className="neu-sunken"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tanggal Mulai Pakai</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal neu-sunken", 
                          !formData.start_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.start_date ? format(formData.start_date, "PPP", { locale: id }) : "Pilih tanggal"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.start_date}
                        onSelect={(date) => date && setFormData({ ...formData, start_date: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Tanggal Kembali</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal neu-sunken",
                          !formData.end_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.end_date ? format(formData.end_date, "PPP", { locale: id }) : "Pilih tanggal"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.end_date}
                        onSelect={(date) => date && setFormData({ ...formData, end_date: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location">Lokasi Penggunaan</Label>
                <Input
                  id="location"
                  value={formData.location_usage}
                  onChange={(e) => setFormData({ ...formData, location_usage: e.target.value })}
                  placeholder="Contoh: Aula lantai 2"
                  className="neu-sunken"
                />
              </div>

              {/* PIC Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pic_name">Nama Penanggung Jawab</Label>
                  <Input
                    id="pic_name"
                    value={formData.pic_name}
                    onChange={(e) => setFormData({ ...formData, pic_name: e.target.value })}
                    required
                    className="neu-sunken"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pic_contact">Kontak PJ (WA/Telp)</Label>
                  <Input
                    id="pic_contact"
                    value={formData.pic_contact}
                    onChange={(e) => setFormData({ ...formData, pic_contact: e.target.value })}
                    required
                    placeholder="08xx xxxx xxxx"
                    className="neu-sunken"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                  className="flex-1 neu-flat"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 neu-raised hover:neu-pressed"
                >
                  {loading ? "Mengirim..." : "Ajukan Permintaan"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </MainLayout>
  );
}