import QRCode from 'qrcode';

/**
 * Generate QR code data URL (PNG) untuk teks tertentu.
 * Menggunakan error correction level M agar cukup padat tapi tetap terbaca.
 */
export async function generateQRDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'M',
      margin: 1,
      scale: 4,
      width: 160,
      color: {
        dark: '#000000',
        light: '#FFFFFFFF'
      }
    });
  } catch (e) {
    console.error('Gagal membuat QR:', e);
    return '';
  }
}
