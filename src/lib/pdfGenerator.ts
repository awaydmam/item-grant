import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF with autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface RequestItem {
  quantity: number;
  items: {
    name: string;
    code: string;
    description?: string;
  };
}

interface PDFData {
  request: {
    id: string;
    letter_number: string;
    purpose: string;
    start_date: string;
    end_date: string;
    location_usage: string;
    pic_name: string;
    pic_contact: string;
    created_at: string;
    borrower: {
      full_name: string;
      unit: string;
      phone: string;
    };
    request_items: RequestItem[];
  };
  ownerName?: string;
  headmasterName?: string;
  schoolName?: string;
  schoolAddress?: string;
  qrDataUrl?: string;
  verificationUrl?: string;
}

export const generatePDF = async (data: PDFData): Promise<void> => {
  const doc = new jsPDF();
  
  // Configuration
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  let yPosition = 20;
  
  // Default values
  const schoolName = data.schoolName || "Darul Ma'arif";
  const schoolAddress = data.schoolAddress || "Jalan Raya Kaplongan No. 28, Kaplongan, Karangampel, Indramayu\nTelp: 082219699610";
  
  // ===== HEADER & KOP SURAT =====
  
  // Logo box
  doc.setDrawColor(66, 139, 202);
  doc.setLineWidth(1);
  doc.rect(margin, yPosition, 20, 20);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(66, 139, 202);
  doc.text("Ponpes", margin + 10, yPosition + 13, { align: 'center' });
  
  // School name & address
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(schoolName, pageWidth/2, yPosition + 8, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const addressLines = schoolAddress.split('\n');
  let addressY = yPosition + 16;
  addressLines.forEach(line => {
    doc.text(line, pageWidth/2, addressY, { align: 'center' });
    addressY += 4;
  });
  
  // Separator line (double line for official look)
  yPosition = addressY + 3;
  doc.setLineWidth(0.8);
  doc.setDrawColor(0, 0, 0);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  doc.setLineWidth(0.3);
  doc.line(margin, yPosition + 1, pageWidth - margin, yPosition + 1);
  yPosition += 10;
  
  // ===== TITLE & QR (optional) =====
  if (data.qrDataUrl) {
    try {
      // Embed QR di pojok kanan atas (ukuran kecil 28mm)
      const imgSize = 28;
      doc.addImage(data.qrDataUrl, 'PNG', pageWidth - margin - imgSize, yPosition, imgSize, imgSize);
      if (data.verificationUrl) {
        doc.setFontSize(6);
        doc.setTextColor(60);
        const clean = data.verificationUrl.replace('https://','').replace('http://','');
        doc.text(clean, pageWidth - margin - imgSize, yPosition + imgSize + 3, { align: 'left', maxWidth: imgSize });
      }
    } catch (e) {
      // fallback diam jika gagal render QR
    }
  }
  // ===== TITLE =====
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text("SURAT PEMINJAMAN ALAT", pageWidth/2, yPosition, { align: 'center' });
  yPosition += 6;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nomor: ${data.request.letter_number}`, pageWidth/2, yPosition, { align: 'center' });
  yPosition += 12;
  
  // Horizontal line under title
  doc.setLineWidth(0.3);
  doc.line(margin + 30, yPosition, pageWidth - margin - 30, yPosition);
  yPosition += 10;
  
  // ===== CONTENT =====
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  // Opening
  const openingText = "Yang bertanda tangan di bawah ini:";
  doc.text(openingText, margin, yPosition);
  yPosition += 8;
  
  // Borrower Info (formatted properly)
  const leftCol = margin + 5;
  const colonPos = margin + 40;
  const valuePos = colonPos + 5;
  
  doc.setFont('helvetica', 'normal');
  doc.text("Nama", leftCol, yPosition);
  doc.text(":", colonPos, yPosition);
  doc.setFont('helvetica', 'bold');
  doc.text(data.request.borrower.full_name, valuePos, yPosition);
  yPosition += 6;
  
  doc.setFont('helvetica', 'normal');
  doc.text("Unit/Bagian", leftCol, yPosition);
  doc.text(":", colonPos, yPosition);
  doc.text(data.request.borrower.unit, valuePos, yPosition);
  yPosition += 6;
  
  doc.text("No. Telepon", leftCol, yPosition);
  doc.text(":", colonPos, yPosition);
  doc.text(data.request.borrower.phone, valuePos, yPosition);
  yPosition += 10;
  
  doc.setFont('helvetica', 'normal');
  doc.text("Dengan ini mengajukan peminjaman alat-alat sebagai berikut:", margin, yPosition);
  yPosition += 8;
  
  // ===== TABLE OF ITEMS =====
  const tableData = data.request.request_items.map((item, index) => [
    index + 1,
    item.items.name,
    item.items.code,
    item.quantity,
    item.items.description || '-'
  ]);
  
  doc.autoTable({
    startY: yPosition,
    head: [['No.', 'Nama Alat', 'Kode Alat', 'Jumlah', 'Keterangan']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [66, 139, 202],
      textColor: 255,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      1: { cellWidth: 50 },
      2: { halign: 'center', cellWidth: 25 },
      3: { halign: 'center', cellWidth: 20 },
      4: { cellWidth: 40 }
    }
  });
  
  yPosition = (doc as any).lastAutoTable.finalY + 15;
  
  // ===== LOAN DETAILS =====
  yPosition += 5;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text("DETAIL PEMINJAMAN:", margin, yPosition);
  yPosition += 8;
  
  doc.setFont('helvetica', 'normal');
  const detailLeftCol = margin + 5;
  const detailColonPos = margin + 45;
  const detailValuePos = detailColonPos + 5;
  
  doc.text("Keperluan", detailLeftCol, yPosition);
  doc.text(":", detailColonPos, yPosition);
  const purposeLines = doc.splitTextToSize(data.request.purpose, pageWidth - detailValuePos - margin);
  doc.text(purposeLines, detailValuePos, yPosition);
  yPosition += (purposeLines.length * 5) + 2;
  
  doc.text("Lokasi Penggunaan", detailLeftCol, yPosition);
  doc.text(":", detailColonPos, yPosition);
  doc.text(data.request.location_usage, detailValuePos, yPosition);
  yPosition += 6;
  
  doc.text("Tanggal Pinjam", detailLeftCol, yPosition);
  doc.text(":", detailColonPos, yPosition);
  doc.setFont('helvetica', 'bold');
  doc.text(formatDate(data.request.start_date), detailValuePos, yPosition);
  yPosition += 6;
  
  doc.setFont('helvetica', 'normal');
  doc.text("Tanggal Kembali", detailLeftCol, yPosition);
  doc.text(":", detailColonPos, yPosition);
  doc.setFont('helvetica', 'bold');
  doc.text(formatDate(data.request.end_date), detailValuePos, yPosition);
  yPosition += 6;
  
  doc.setFont('helvetica', 'normal');
  doc.text("Penanggung Jawab", detailLeftCol, yPosition);
  doc.text(":", detailColonPos, yPosition);
  doc.text(data.request.pic_name, detailValuePos, yPosition);
  yPosition += 6;
  
  doc.text("Kontak PJ", detailLeftCol, yPosition);
  doc.text(":", detailColonPos, yPosition);
  doc.text(data.request.pic_contact, detailValuePos, yPosition);
  yPosition += 10;
  
  // ===== TERMS & CONDITIONS =====
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text("SYARAT DAN KETENTUAN:", margin, yPosition);
  yPosition += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const terms = [
    "1. Peminjam bertanggung jawab penuh atas keamanan, keselamatan, dan kondisi alat yang dipinjam.",
    "2. Alat WAJIB dikembalikan sesuai dengan waktu yang telah disepakati dalam surat ini.",
    "3. Apabila terjadi kerusakan atau kehilangan, peminjam WAJIB mengganti atau memperbaiki.",
    "4. Peminjam wajib menjaga kebersihan, kelengkapan, dan kelayakan fungsi alat.",
    "5. Dilarang memindahtangankan atau meminjamkan kembali alat kepada pihak lain.",
    "6. Surat ini berlaku sebagai bukti resmi peminjaman alat dan harus dibawa saat pengambilan."
  ];
  
  terms.forEach(term => {
    const termLines = doc.splitTextToSize(term, pageWidth - (2 * margin));
    doc.text(termLines, margin + 5, yPosition);
    yPosition += (termLines.length * 5);
  });
  
  yPosition += 12;
  
  // ===== SIGNATURES =====
  const signatureY = yPosition;
  
  // Check if we need a new page for signatures
  if (signatureY > 240) {
    doc.addPage();
    yPosition = 20;
  }
  
  // Date and place
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const today = new Date();
  const place = "Bekasi";
  doc.text(`${place}, ${formatDate(today.toISOString().split('T')[0])}`, pageWidth - margin - 60, yPosition);
  yPosition += 15;
  
  // Signature section with boxes
  const leftSignX = margin + 20;
  const rightSignX = pageWidth - margin - 70;
  const signBoxWidth = 60;
  
  // Left signature (Borrower)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text("Peminjam,", leftSignX + 10, yPosition);
  
  // Right signature (Approver)
  doc.text("Menyetujui,", rightSignX + 5, yPosition);
  yPosition += 5;
  
  // Signature boxes
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(leftSignX, yPosition, signBoxWidth, 20);
  doc.rect(rightSignX, yPosition, signBoxWidth, 20);
  
  yPosition += 25;
  
  // Names under signature
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text("(" + data.request.borrower.full_name + ")", leftSignX + (signBoxWidth/2), yPosition, { align: 'center' });
  
  const approverName = data.headmasterName || "Pengelola Inventaris";
  doc.text("(" + approverName + ")", rightSignX + (signBoxWidth/2), yPosition, { align: 'center' });
  yPosition += 5;
  
  // Role labels
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(data.request.borrower.unit || "Peminjam", leftSignX + (signBoxWidth/2), yPosition, { align: 'center' });
  
  const roleLabel = data.headmasterName ? "Kepala Sekolah" : "Pengelola Inventaris";
  doc.text(roleLabel, rightSignX + (signBoxWidth/2), yPosition, { align: 'center' });
  
  // Footer
  yPosition += 15;
  doc.setDrawColor(66, 139, 202);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text("Dokumen ini dihasilkan secara otomatis oleh Sistem Manajemen Inventaris Sekolah", 
           pageWidth/2, yPosition, { align: 'center' });
  yPosition += 4;
  doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 
           pageWidth/2, yPosition, { align: 'center' });
  
  // Save the PDF
  const fileName = `Surat_Peminjaman_${data.request.letter_number}.pdf`;
  doc.save(fileName);
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};