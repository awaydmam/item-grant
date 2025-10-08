import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/layout/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/hooks/useCart";
import { ShoppingCart, Package, Plus, Minus, ArrowRight, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Cart() {
  const navigate = useNavigate();
  const { items: cartItems, updateQuantity, removeItem, clearCart, getTotalItems } = useCart();

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity === 0) {
      removeItem(itemId);
    } else {
      const item = cartItems.find(i => i.id === itemId);
      if (item && newQuantity <= item.available_quantity) {
        updateQuantity(itemId, newQuantity);
      } else {
        toast.error("Quantity melebihi stok tersedia");
      }
    }
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast.error("Keranjang kosong");
      return;
    }
    navigate("/checkout");
  };

  const handleContinueShopping = () => {
    navigate("/departments");
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/5 to-background">
        <div className="container-mobile pt-6 pb-4">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
              <ShoppingCart className="h-6 w-6" />
              Keranjang ({getTotalItems()})
            </h1>
            <p className="text-muted-foreground">
              Review alat yang akan dipinjam
            </p>
            
            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <span className="text-sm font-medium text-primary">Pilih Alat</span>
              </div>
              <div className="w-8 h-0.5 bg-primary"></div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <span className="text-sm font-medium text-primary">Review Keranjang</span>
              </div>
              <div className="w-8 h-0.5 bg-muted"></div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <span className="text-sm text-muted-foreground">Form Peminjaman</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container-mobile py-4">
        {cartItems.length === 0 ? (
          <div className="space-y-6">
            <Card className="neu-flat">
              <CardContent className="py-12 text-center">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Keranjang Kosong</h3>
                <p className="text-muted-foreground mb-4">
                  Belum ada alat yang dipilih untuk dipinjam
                </p>
                <Button onClick={handleContinueShopping} className="neu-flat">
                  <Package className="h-4 w-4 mr-2" />
                  Pilih Alat
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Cart Items */}
            <div className="space-y-3">
              {cartItems.map((item) => (
                <Card key={item.id} className="neu-flat">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Item Image */}
                      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center neu-sunken overflow-hidden">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>

                      {/* Item Info */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-base leading-tight">{item.name}</h4>
                            {item.category && (
                              <p className="text-xs text-muted-foreground">{item.category}</p>
                            )}
                            <p className="text-sm text-muted-foreground">
                              Tersedia: {item.available_quantity}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(item.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            className="neu-pressed w-8 h-8 p-0"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-lg w-8 text-center">
                              {item.quantity}
                            </span>
                            <span className="text-sm text-muted-foreground">unit</span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.available_quantity}
                            className="neu-flat w-8 h-8 p-0"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Summary */}
            <Card className="neu-raised border-primary/20">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Total Item:</span>
                    <Badge variant="default" className="text-base px-3 py-1">
                      {getTotalItems()} unit
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {cartItems.length} jenis alat dipilih
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button 
                size="lg" 
                className="w-full neu-flat" 
                onClick={handleCheckout}
              >
                <ArrowRight className="h-5 w-5 mr-2" />
                Lanjutkan ke Pengajuan
              </Button>
              
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  onClick={handleContinueShopping}
                  className="neu-flat"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Tambah Alat
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={clearCart}
                  className="neu-flat"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Kosongkan
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}