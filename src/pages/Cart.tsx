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
    <div className="min-h-screen bg-background pb-20">
      {/* Header dengan Safe Area Support */}
      <div className="bg-gradient-to-b from-primary/5 to-background safe-area-top">
        <div className="container-mobile pt-8 pb-6">
          <div className="text-center space-y-6 mt-2">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold flex items-center justify-center pt-10       gap-3">
                <div className="neu-raised             p-2 rounded-xl bg-blue-100">
                  <ShoppingCart className="h-6 w-6 text-blue-600" />
                </div>
                Keranjang ({getTotalItems()})
              </h1>
              <p className="text-muted-foreground text-base">
                Review alat yang akan dipinjam
              </p>
            </div>
            
            {/* Progress Steps dirapikan: alignment presisi & konsistensi spacing */}
            <div className="mt-6 px-2">
              <div className="flex items-center justify-center max-w-md mx-auto">
                {[
                  { id: 1, label: 'Pilih Alat', state: 'done' },
                  { id: 2, label: 'Review Keranjang', state: 'current' },
                  { id: 3, label: 'Form Peminjaman', state: 'upcoming' }
                ].map((step, index, arr) => {
                  const isLast = index === arr.length - 1;
                  const baseCircle = 'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200';
                  const stateStyles = {
                    done: 'bg-blue-600 text-white shadow-md',
                    current: 'bg-blue-600 text-white shadow-md border-2 border-blue-700',
                    upcoming: 'bg-gray-300 text-gray-600 neu-sunken'
                  } as const;
                  const labelStyles = {
                    done: 'text-blue-600 font-medium',
                    current: 'text-blue-700 font-semibold',
                    upcoming: 'text-gray-600'
                  } as const;
                  const connectorColor = step.state === 'upcoming' ? 'bg-gray-300' : 'bg-blue-600';
                  return (
                    <div key={step.id} className="flex items-center">
                      <div className="flex flex-col items-center">
                        <div className={baseCircle + ' ' + stateStyles[step.state]}>{step.id}</div>
                        <span className={`mt-2 text-[11px] sm:text-xs text-center whitespace-nowrap ${labelStyles[step.state]}`}>{step.label}</span>
                      </div>
                      {!isLast && (
                        <div className={`w-10 sm:w-14 h-0.5 mx-2 sm:mx-3 rounded-full ${connectorColor} relative`}>
                          {/* kecilkan dot dekoratif di tengah (opsional) */}
                          <div className="absolute left-1/2 -translate-x-1/2 -top-[3px] w-1.5 h-1.5 rounded-full bg-white/60 border border-white/40 backdrop-blur-sm" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container-mobile py-12">
        {cartItems.length === 0 ? (
          <div className="space-y-6">
            <Card className="neu-flat overflow-hidden">
              <CardContent className="py-16 text-center">
                <div className="neu-sunken w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <ShoppingCart className="h-10 w-10 text-muted-foreground opacity-50" />
                </div>
                <h3 className="font-semibold text-lg mb-3">Keranjang Kosong</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Belum ada alat yang dipilih untuk dipinjam
                </p>
                <Button onClick={handleContinueShopping} className="rounded-md px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white border-0 neu-button-raised hover:neu-button-pressed">
                  <Package className="h-4 w-4 mr-2" />
                  Pilih Alat
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Cart Items dengan spacing yang diperbaiki */}
            <div className="space-y-4">
              {cartItems.map((item) => (
                <Card key={item.id} className="neu-flat overflow-hidden cart-item-card cart-layout-stable">
                  <CardContent className="p-5">
                    <div className="card-content">
                      {/* Item Image dengan enhancement */}
                      <div className="cart-image flex-shrink-0 rounded-xl bg-muted flex items-center justify-center neu-sunken overflow-hidden">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>

                      {/* Item Info dengan layout yang diperbaiki */}
                      <div className="cart-info">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-base leading-tight text-gray-900 line-clamp-2">{item.name}</h4>
                            {item.category && (
                              <p className="text-xs text-muted-foreground mt-1">{item.category}</p>
                            )}
                            <p className="text-sm text-muted-foreground mt-1">
                              Tersedia: <span className="font-medium">{item.available_quantity}</span>
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(item.id)}
                            className="h-9 w-9 text-destructive hover:text-white hover:bg-red-500 flex-shrink-0 neu-button-raised hover:neu-button-pressed border-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Quantity Controls dengan spacing yang diperbaiki */}
                        <div className="flex items-center gap-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            className="w-9 h-9 p-0 flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white border-0 neu-button-raised hover:neu-button-pressed"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <div className="flex items-center gap-2 px-2">
                            <span className="font-semibold text-lg min-w-[2rem] text-center">
                              {item.quantity}
                            </span>
                            <span className="text-sm text-muted-foreground">unit</span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.available_quantity}
                            className="w-9 h-9 p-0 flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white border-0 neu-button-raised hover:neu-button-pressed disabled:bg-gray-400 disabled:hover:bg-gray-400"
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

            {/* Summary dengan enhancement */}
            <Card className="neu-raised border-primary/20 overflow-hidden">
              <CardContent className="p-5">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-lg text-gray-900">Total Item:</span>
                    <Badge variant="default" className="text-base px-4 py-2 ">
                      {getTotalItems()} unit
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                    <span className="font-medium">{cartItems.length}</span> jenis alat dipilih untuk peminjaman
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons dengan spacing yang diperbaiki */}
            <div className="space-y-4 pb-4">
              <Button 
                size="lg" 
                className="w-full h-12 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white border-0 neu-button-raised hover:neu-button-pressed" 
                onClick={handleCheckout}
              >
                <ArrowRight className="h-5 w-5 mr-3" />
                Lanjutkan ke Pengajuan
              </Button>
              
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  onClick={handleContinueShopping}
                  className="h-11 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300 neu-button-raised hover:neu-button-pressed border-0"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Tambah Alat
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={clearCart}
                  className="h-11 bg-red-500 hover:bg-red-600 text-white border-0 neu-button-raised hover:neu-button-pressed"
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