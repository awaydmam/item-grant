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
    fontSize: 11,
    paddingTop: 30,
    paddingLeft: 50,
    paddingRight: 50,
    paddingBottom: 30,
    lineHeight: 1.5,
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
      location_usage: string;
      pic_name: string;
      pic_contact: string;
      created_at: string;
      borrower: {
        full_name: string;
        unit: string;
        phone: string;
      };
      request_items: Array<{
        quantity: number;
        items: {
          name: string;
          code: string;
          description?: string;
        };
      }>;
    };
    ownerName?: string;
    headmasterName?: string;
    schoolName?: string;
    schoolAddress?: string;
    letterType?: 'internal' | 'official';
  };
}

export const BorrowLetter: React.FC<BorrowLetterProps> = ({ data }) => {
  const currentDate = new Date().toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.container}>
          <LetterHeader 
            schoolName={data.schoolName || "Darul Ma'arif"}
            schoolAddress={data.schoolAddress || "Jalan Raya Kaplongan No. 28, Kaplongan, Karangampel, Indramayu"}
            letterDate={currentDate}
            letterNumber={data.request.letter_number || `SPB/${new Date().getFullYear()}/${String(Date.now()).slice(-6)}`}
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