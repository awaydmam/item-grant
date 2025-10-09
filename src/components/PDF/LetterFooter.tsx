import React from 'react';
import { Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  container: {
    marginTop: 30,
    flex: 1,
    justifyContent: 'flex-end',
  },
  agreementText: {
    fontSize: 11,
    marginBottom: 20,
    lineHeight: 1.5,
  },
  signatureContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  signatureBox: {
    width: '30%',
    textAlign: 'center',
  },
  signatureLabel: {
    fontSize: 10,
    marginBottom: 50,
  },
  signatureName: {
    fontSize: 10,
    fontWeight: 'bold',
    textDecoration: 'underline',
  },
  dateLocation: {
    textAlign: 'right',
    fontSize: 10,
    marginBottom: 30,
  },
  threeSignature: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  signatureBoxThree: {
    width: '30%',
    textAlign: 'center',
  },
});

interface LetterFooterProps {
  borrowerName: string;
  ownerName: string;
  headmasterName?: string;
  letterType: 'internal' | 'official';
  createdDate: string;
}

export const LetterFooter: React.FC<LetterFooterProps> = ({
  borrowerName,
  ownerName,
  headmasterName,
  letterType,
  createdDate
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.agreementText}>
        Demikian surat peminjaman ini dibuat dengan sebenar-benarnya untuk dapat dipergunakan sebagaimana mestinya. 
        Peminjam berjanji akan mengembalikan alat dalam kondisi baik dan tepat waktu sesuai tanggal yang telah disepakati.
      </Text>
      
      <Text style={styles.dateLocation}>
       Kaplongan, {createdDate}
      </Text>
      
      {letterType === 'official' && headmasterName ? (
        // Three signatures: Headmaster, Owner, Borrower
        <View style={styles.threeSignature}>
          <View style={styles.signatureBoxThree}>
            <Text style={styles.signatureLabel}>Kepala Sekolah</Text>
            <Text style={styles.signatureName}>{headmasterName}</Text>
          </View>
          <View style={styles.signatureBoxThree}>
            <Text style={styles.signatureLabel}>Pengelola Inventaris</Text>
            <Text style={styles.signatureName}>{ownerName}</Text>
          </View>
          <View style={styles.signatureBoxThree}>
            <Text style={styles.signatureLabel}>Peminjam</Text>
            <Text style={styles.signatureName}>{borrowerName}</Text>
          </View>
        </View>
      ) : (
        // Two signatures: Owner, Borrower (Internal letter)
        <View style={styles.signatureContainer}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Pengelola Inventaris</Text>
            <Text style={styles.signatureName}>{ownerName}</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Peminjam</Text>
            <Text style={styles.signatureName}>{borrowerName}</Text>
          </View>
        </View>
      )}
      
      <View style={{ marginTop: 20 }}>
        <Text style={{ fontSize: 8, textAlign: 'center', color: '#666' }}>
          --- Dokumen ini dibuat secara elektronik dan sah tanpa tanda tangan basah ---
        </Text>
      </View>
    </View>
  );
};

export default LetterFooter;