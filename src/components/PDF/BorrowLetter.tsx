import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { LetterHeader } from './LetterHeader';
import { BorrowerInfo } from './BorrowerInfo';
import { ItemsTable } from './ItemsTable';
import { LetterFooter } from './LetterFooter';

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#fff',
    fontFamily: 'Helvetica',
    fontSize: 10.5,
    paddingTop: 26,
    paddingLeft: 40,
    paddingRight: 40,
    paddingBottom: 28,
    lineHeight: 1.35,
    flexDirection: 'column',
  },
  container: {
    flex: 1,
    flexDirection: 'column',
  },
});

interface BorrowLetterProps {
  data: {
    request: {
      id: string;
      letter_number?: string;
      purpose: string;
      start_date: string;
      end_date: string;
      location_usage?: string;
      pic_name: string;
      pic_contact: string;
      created_at?: string;
      borrower: {
        full_name: string;
        unit: string;
        phone?: string;
      };
      request_items: Array<{
        quantity: number;
        items?: {
          name: string;
          code?: string;
          description?: string;
        };
        // fallback struktur lain (kadang dipakai alias 'items' vs 'item')
        item?: {
          name: string;
          code?: string;
          description?: string;
        };
      }>;
    };
    ownerName?: string;
    headmasterName?: string;
    schoolName?: string;
    schoolAddress?: string;
    letterType?: 'internal' | 'official';
    logoUrl?: string;
  };
}

export const BorrowLetter: React.FC<BorrowLetterProps> = ({ data }) => {
  const currentDate = new Date().toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  // Fallback logo: prioritaskan logo yang dikirim via props, lalu logo lokal publik, terakhir URL eksternal lama
  const fallbackLogo = [
    data.logoUrl,
    '/logodm.webp',
    'https://darulmaarif.net/wp-content/uploads/al_opt_content/IMAGE/darulmaarif.net/wp-content/uploads/2025/08/android-chrome-192x192-1.png.bv.webp?bv_host=darulmaarif.net'
  ].find(Boolean);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.container}>
          <LetterHeader 
            schoolName={data.schoolName || "Darul Ma'arif"}
            schoolAddress={data.schoolAddress || "Jalan Raya Kaplongan No. 28, Kaplongan, Karangampel, Indramayu"}
            letterDate={currentDate}
            letterNumber={data.request.letter_number || `SPB/${new Date().getFullYear()}/${String(Date.now()).slice(-6)}`}
            logoUrl={fallbackLogo}
            letterType={data.letterType || 'internal'}
          />
          
          <BorrowerInfo 
            borrower={data.request.borrower}
            purpose={data.request.purpose}
            startDate={data.request.start_date}
            endDate={data.request.end_date}
            location={data.request.location_usage}
            picName={data.request.pic_name}
            picContact={data.request.pic_contact}
          />
          
          <ItemsTable items={data.request.request_items} />
          
          <LetterFooter 
            borrowerName={data.request.borrower.full_name}
            ownerName={data.ownerName || "Pengelola Inventaris"}
            headmasterName={data.headmasterName}
            letterType={data.letterType || 'internal'}
            createdDate={currentDate}
          />
        </View>
      </Page>
    </Document>
  );
};

export default BorrowLetter;