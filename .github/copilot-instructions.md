# Copilot Instructions for Item Grant System
harus dijawab dengan bahsa indonesia selalu dan juga progres memkai bahasa indoensia

## Arsitektur Aplikasi

Aplikasi ini adalah sistem manajemen peminjaman barang sekolah dengan UI/UX marketplace-style:
- **Frontend**: React + TypeScript + Vite dengan Shadcn/UI
- **Backend**: Supabase (Database PostgreSQL + Auth)
- **State Management**: TanStack Query untuk server state
- **UI/UX**: Mobile-first dengan shopping cart experience (mirip Shopee/Tokopedia)
- **Styling**: Tailwind CSS dengan Neumorphism design

## Struktur Database & Workflow Utama

### Entitas Kunci
- `profiles` - Data pengguna (nama lengkap, unit kerja, kontak)
- `user_roles` - Role sistem: admin, owner, headmaster, borrower
- `items` - Inventaris barang dengan status availability
- `borrow_requests` - Request peminjaman dengan state machine workflow
- `request_items` - Detail barang yang dipinjam per request

### Shopping Cart Flow (UX Utama)
1. **Browse** → Card alat dengan tombol "Request to Borrow"
2. **Add to Cart** → Multiple selection dengan sticky bottom bar
3. **Checkout** → Form peminjaman (seperti form delivery e-commerce)
4. **Review** → Pemilik bisa langsung cetak ATAU kirim ke Kepsek
5. **Letter Options**: (A) Surat Internal Langsung (B) Surat Resmi via Kepsek
6. **Track** → Status tracking seperti order tracking online

### Status Flow Peminjaman
**Opsi A (Tanpa Kepsek)**: `draft` → `pending_owner` → `approved` → `active` → `completed`
**Opsi B (Via Kepsek)**: `draft` → `pending_owner` → `pending_headmaster` → `approved` → `active` → `completed`

## Mobile Navigation Structure (Bottom Nav)
**5 Tab Navigation**:
1. 🧰 **Inventory** - Browse alat dengan cart functionality
2. 📋 **Requests** - Track status peminjaman (seperti "Pesanan Saya")
3. 👥 **Public Board** - Realtime dashboard siapa sedang meminjam
4. 📬 **Inbox** - Notifikasi untuk Owner & Headmaster
5. ⚙️ **Profile** - Akun, riwayat, settings

## Shopping Cart UX Pattern

### Inventory Page (Halaman Utama)
```tsx
// Pattern untuk card alat dengan shopping experience
<Card className="product-card">
  <Image src={item.image_url} />
  <CardContent>
    <h3>{item.name}</h3>
    <Badge variant={item.status}>{item.available_quantity} tersedia</Badge>
    <Button onClick={addToCart} className="add-to-cart">
      Request to Borrow
    </Button>
  </CardContent>
</Card>

// Sticky bottom cart indicator
<div className="sticky bottom-0 cart-summary">
  <span>{cartItems.length} alat dipilih</span>
  <Button onClick={goToCheckout}>Ajukan ({cartItems.length})</Button>
</div>
```

### Checkout Flow Pattern
```tsx
// Form peminjaman seperti delivery form e-commerce
<CheckoutForm>
  <CartSummary items={selectedItems} />
  <DatePicker label="Tanggal Pakai" />
  <DatePicker label="Tanggal Kembali" />
  <Input label="Unit Peminjam" />
  <Input label="Lokasi Pemakaian" />
  <Input label="Penanggung Jawab" />
  <Textarea label="Keperluan/Alasan" />
  <Button type="submit">Kirim Permintaan</Button>
</CheckoutForm>
```

## Dual Letter System (Owner Decision)

### Pattern untuk Owner Review
```tsx
// Owner bisa pilih 2 opsi setelah approve
<div className="approval-options">
  <Button onClick={directLetter} variant="default">
    Terima & Cetak Surat Langsung
  </Button>
  <Button onClick={sendToHeadmaster} variant="outline">
    Kirim ke Kepala Sekolah
  </Button>
</div>
```

### Letter Generation Pattern
```tsx
// Opsi A: Surat Internal Langsung (untuk alat ringan)
const generateDirectLetter = async (requestId: string) => {
  const letterData = {
    type: 'internal',
    signatories: ['owner', 'borrower'],
    auto_number: false
  };
  // Generate PDF langsung tanpa approval Kepsek
};

// Opsi B: Surat Resmi via Kepsek (untuk alat penting)
const generateOfficialLetter = async (requestId: string) => {
  const letterData = {
    type: 'official',
    signatories: ['headmaster', 'owner', 'borrower'],
    auto_number: true,
    requires_headmaster_approval: true
  };
};
```

### Authentication Pattern
```tsx
// Selalu gunakan ProtectedRoute untuk halaman terautentikasi
<Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

// Check role di komponen dengan pattern ini:
const { data: { user } } = await supabase.auth.getUser();
const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
```

### Supabase Query Pattern
```tsx
// Standard pattern untuk data fetching dengan error handling
const { count } = await supabase
  .from("table_name")
  .select("*", { count: "exact", head: true })
  .eq("column", value);
```

## Pola & Konvensi Kode

### Neumorphism Design System
```css
/* Base neumorphism style */
.card-neumorphism {
  background: #F3F4F6;
  border-radius: 16px;
  box-shadow: 8px 8px 16px #d1d9e6, -8px -8px 16px #ffffff;
}

.button-neumorphism {
  background: linear-gradient(145deg, #ffffff, #e6e6e6);
  box-shadow: 5px 5px 10px #d1d9e6, -5px -5px 10px #ffffff;
}

.input-neumorphism {
  background: #F3F4F6;
  box-shadow: inset 5px 5px 10px #d1d9e6, inset -5px -5px 10px #ffffff;
}
```

### Cart State Management Pattern
```tsx
// Gunakan zustand atau context untuk cart state
interface CartState {
  items: CartItem[];
  addItem: (item: Item) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  totalItems: number;
}

// Component pattern untuk cart indicator
const CartIndicator = () => {
  const { totalItems } = useCart();
  return (
    <div className="fixed bottom-20 right-4 cart-floating">
      <Badge>{totalItems}</Badge>
      🛒
    </div>
  );
};
```

### UI Component Standards
- Semua teks UI dalam **Bahasa Indonesia**
- Gunakan komponen dari `@/components/ui/` (Shadcn/UI)
- Layout struktur: `MainLayout` wraps semua authenticated pages
- Mobile-first responsive dengan `BottomNav` untuk mobile

### File Organization
- Pages di `src/pages/` - satu file per route
- Layout components di `src/components/layout/`
- UI primitives di `src/components/ui/` (jangan edit manual)
- Hooks custom di `src/hooks/`
- Supabase integration di `src/integrations/supabase/`

## Role-Based Features

### Borrower (Default)
- Browse inventory, create requests, track status

### Owner
- Review requests untuk department mereka di `/owner-inbox`
- Approve/reject dengan notes

### Headmaster  
- Final approval semua requests di `/headmaster-inbox`
- Generate surat peminjaman

### Admin
- Full system access, user management

## Development Commands

```bash
npm run dev          # Start development server (Vite)
npm run build        # Production build
npm run lint         # ESLint check
npm run preview      # Preview production build
```

## Critical Files
- `src/App.tsx` - Router setup dan providers
- `src/components/ProtectedRoute.tsx` - Auth guard
- `src/integrations/supabase/types.ts` - Generated DB types
- `supabase/migrations/` - Database schema
- `src/components/layout/MainLayout.tsx` - Navigation logic

## Common Tasks
- Tambah halaman baru: Buat di `src/pages/`, tambah route di `App.tsx`
- Database changes: Buat migration baru di `supabase/migrations/`
- UI components: Import dari `@/components/ui/`, jangan modifikasi langsung
- Role check: Query `user_roles` table dengan current user ID

## Specific UX Patterns for Shopping Cart Experience

### 1. Inventory Browse (Marketplace Style)
```tsx
// Card alat dengan interaction pattern e-commerce
<div className="grid grid-cols-2 gap-4 p-4">
  {items.map(item => (
    <Card key={item.id} className="product-card hover:shadow-lg transition-all">
      <div className="relative">
        <img src={item.image_url} className="w-full h-32 object-cover rounded-t-lg" />
        <Badge className="absolute top-2 right-2">{item.available_quantity}</Badge>
      </div>
      <CardContent className="p-3">
        <h4 className="font-semibold text-sm">{item.name}</h4>
        <p className="text-xs text-gray-600">{item.location}</p>
        <Button 
          size="sm" 
          className="w-full mt-2"
          onClick={() => addToCart(item)}
        >
          Request to Borrow
        </Button>
      </CardContent>
    </Card>
  ))}
</div>
```

### 2. Sticky Cart Bottom Bar
```tsx
// Pattern untuk bottom cart indicator
{cartItems.length > 0 && (
  <div className="fixed bottom-16 left-0 right-0 bg-white border-t shadow-lg p-4">
    <div className="flex justify-between items-center">
      <span className="font-medium">{cartItems.length} alat dipilih</span>
      <Button onClick={goToCheckout} className="px-6">
        Ajukan Peminjaman
      </Button>
    </div>
  </div>
)}
```

### 3. Owner Dual Decision Pattern
```tsx
// Pattern untuk owner review dengan 2 opsi
<div className="space-y-4">
  <RequestDetails request={request} />
  <div className="grid grid-cols-1 gap-3">
    <Button 
      onClick={() => approveAndGenerateDirectLetter(request.id)}
      variant="default"
      className="w-full"
    >
      ✅ Terima & Cetak Surat Langsung
      <span className="text-xs block">Untuk alat ringan/internal</span>
    </Button>
    <Button 
      onClick={() => sendToHeadmaster(request.id)}
      variant="outline"
      className="w-full"
    >
      📤 Kirim ke Kepala Sekolah
      <span className="text-xs block">Untuk alat penting/formal</span>
    </Button>
    <Button 
      onClick={() => rejectRequest(request.id)}
      variant="destructive"
      className="w-full"
    >
      ❌ Tolak Permintaan
    </Button>
  </div>
</div>
```

### 4. Status Tracking Pattern (Order Tracking Style)
```tsx
// Pattern untuk tracking status seperti e-commerce
<div className="status-timeline">
  <div className={`step ${status >= 'pending_owner' ? 'active' : ''}`}>
    <div className="step-icon">📝</div>
    <div className="step-text">Permintaan Dikirim</div>
  </div>
  <div className={`step ${status >= 'approved' ? 'active' : ''}`}>
    <div className="step-icon">✅</div>
    <div className="step-text">Disetujui Pemilik</div>
  </div>
  {requiresHeadmaster && (
    <div className={`step ${status >= 'approved' ? 'active' : ''}`}>
      <div className="step-icon">🏫</div>
      <div className="step-text">Disetujui Kepsek</div>
    </div>
  )}
  <div className={`step ${status >= 'active' ? 'active' : ''}`}>
    <div className="step-icon">📜</div>
    <div className="step-text">Surat Siap</div>
  </div>
</div>
```

Prioritaskan konsistensi dengan pola yang ada dan gunakan TypeScript types dari Supabase.