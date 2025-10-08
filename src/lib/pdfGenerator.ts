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
}

export const generatePDF = async (data: PDFData): Promise<void> => {
  const doc = new jsPDF();
  
  // Configuration
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  let yPosition = 20;
  
  // Default values
  const schoolName = data.schoolName || "SEKOLAH MENENGAH KEJURUAN NEGERI 1";
  const schoolAddress = data.schoolAddress || "Jl. Pendidikan No. 123, Kota Pendidikan\nTelp: (021) 1234567 | Email: info@smkn1.sch.id";
  
  // ===== HEADER & KOP SURAT =====
  
  // Logo placeholder (you can add actual logo here)
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text("🏫", margin, yPosition);
  
  // School name
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(schoolName, pageWidth/2, yPosition, { align: 'center' });
  yPosition += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const addressLines = schoolAddress.split('\n');
  addressLines.forEach(line => {
    doc.text(line, pageWidth/2, yPosition, { align: 'center' });
    yPosition += 5;
  });
  
  // Separator line
  yPosition += 5;
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;
  
  // ===== TITLE =====
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text("SURAT PEMINJAMAN ALAT", pageWidth/2, yPosition, { align: 'center' });
  yPosition += 5;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nomor: ${data.request.letter_number}`, pageWidth/2, yPosition, { align: 'center' });
  yPosition += 15;
  
  // ===== CONTENT =====
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // Opening
  const openingText = "Yang bertanda tangan di bawah ini, dengan ini menyatakan bahwa:";
  doc.text(openingText, margin, yPosition);
  yPosition += 10;
  
  // Borrower Info
  const borrowerInfo = [
    `Nama\t\t\t: ${data.request.borrower.full_name}`,
    `Unit Kerja\t\t: ${data.request.borrower.unit}`,
    `No. Telepon\t\t: ${data.request.borrower.phone}`,
    ``,
    `Telah disetujui untuk meminjam alat-alat sebagai berikut:`
  ];
  
  borrowerInfo.forEach(line => {
    doc.text(line, margin, yPosition);
    yPosition += 6;
  });
  
  yPosition += 5;
  
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
  const loanDetails = [
    `Keperluan\t\t: ${data.request.purpose}`,
    `Lokasi Penggunaan\t: ${data.request.location_usage}`,
    `Tanggal Pinjam\t\t: ${formatDate(data.request.start_date)}`,
    `Tanggal Kembali\t\t: ${formatDate(data.request.end_date)}`,
    `Penanggung Jawab\t: ${data.request.pic_name}`,
    `Kontak PJ\t\t: ${data.request.pic_contact}`
  ];
  
  loanDetails.forEach(line => {
    doc.text(line, margin, yPosition);
    yPosition += 6;
  });
  
  yPosition += 10;
  
  // ===== TERMS & CONDITIONS =====
  doc.setFont('helvetica', 'bold');
  doc.text("Syarat dan Ketentuan:", margin, yPosition);
  yPosition += 8;
  
  doc.setFont('helvetica', 'normal');
  const terms = [
    "1. Peminjam bertanggung jawab penuh atas keamanan dan kerusakan alat",
    "2. Alat harus dikembalikan sesuai dengan waktu yang telah ditentukan",
    "3. Apabila terjadi kerusakan, peminjam wajib mengganti atau memperbaiki",
    "4. Peminjam wajib menjaga kebersihan dan kelengkapan alat",
    "5. Surat ini berlaku sebagai bukti resmi peminjaman alat"
  ];
  
  terms.forEach(term => {
    doc.text(term, margin, yPosition);
    yPosition += 6;
  });
  
  yPosition += 15;
  
  // ===== SIGNATURES =====
  const signatureY = yPosition;
  const leftSignX = margin + 30;
  const rightSignX = pageWidth - margin - 80;
  
  // Check if we need a new page for signatures
  if (signatureY > 250) {
    doc.addPage();
    yPosition = 20;
  }
  
  // Date and place
  doc.text(`Dibuat di: Kota Pendidikan`, rightSignX, yPosition);
  yPosition += 5;
  doc.text(`Tanggal: ${formatDate(new Date().toISOString().split('T')[0])}`, rightSignX, yPosition);
  yPosition += 15;
  
  // Left signature (Borrower)
  doc.setFont('helvetica', 'bold');
  doc.text("Peminjam,", leftSignX, yPosition);
  doc.text("Menyetujui,", rightSignX, yPosition);
  yPosition += 25;
  
  doc.setFont('helvetica', 'normal');
  doc.text("(" + data.request.borrower.full_name + ")", leftSignX, yPosition);
  
  // Right signature (Owner/Headmaster)
  const approverName = data.headmasterName || data.ownerName || "Pengelola Inventaris";
  doc.text("(" + approverName + ")", rightSignX, yPosition);
  yPosition += 5;
  
  if (data.headmasterName) {
    doc.setFontSize(9);
    doc.text("Kepala Sekolah", rightSignX, yPosition);
  } else {
    doc.setFontSize(9);
    doc.text("Pengelola Inventaris", rightSignX, yPosition);
  }
  
  // Footer
  yPosition += 20;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text("Dokumen ini dihasilkan secara otomatis oleh Sistem Manajemen Inventaris", 
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