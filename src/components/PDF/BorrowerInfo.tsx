import React from 'react';
import { Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  opening: {
    fontSize: 11,
    marginBottom: 15,
    lineHeight: 1.5,
  },
  infoContainer: {
    marginLeft: 20,
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: 120,
    fontSize: 11,
  },
  colon: {
    width: 10,
    fontSize: 11,
  },
  value: {
    flex: 1,
    fontSize: 11,
    fontWeight: 'bold',
  },
  valueNormal: {
    flex: 1,
    fontSize: 11,
  },
  purposeText: {
    fontSize: 11,
    marginBottom: 10,
    lineHeight: 1.5,
  },
});

interface BorrowerInfoProps {
  borrower: {
    full_name: string;
    unit: string;
    phone: string;
  };
  purpose: string;
  startDate: string;
  endDate: string;
  location: string;
  picName: string;
  picContact: string;
}

export const BorrowerInfo: React.FC<BorrowerInfoProps> = ({
  borrower,
  purpose,
  startDate,
  endDate,
  location,
  picName,
  picContact
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.opening}>
        Yang bertanda tangan di bawah ini:
      </Text>
      
      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Nama</Text>
          <Text style={styles.colon}>:</Text>
          <Text style={styles.value}>{borrower.full_name}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Unit/Bagian</Text>
          <Text style={styles.colon}>:</Text>
          <Text style={styles.valueNormal}>{borrower.unit}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>No. Telepon</Text>
          <Text style={styles.colon}>:</Text>
          <Text style={styles.valueNormal}>{borrower.phone}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Keperluan</Text>
          <Text style={styles.colon}>:</Text>
          <Text style={styles.valueNormal}>{purpose}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Tanggal Pakai</Text>
          <Text style={styles.colon}>:</Text>
          <Text style={styles.valueNormal}>
            {formatDate(startDate)} s/d {formatDate(endDate)}
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Lokasi Penggunaan</Text>
          <Text style={styles.colon}>:</Text>
          <Text style={styles.valueNormal}>{location}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Penanggung Jawab</Text>
          <Text style={styles.colon}>:</Text>
          <Text style={styles.valueNormal}>{picName} ({picContact})</Text>
        </View>
      </View>
      
      <Text style={styles.purposeText}>
        Dengan ini mengajukan peminjaman alat-alat sebagai berikut:
      </Text>
    </View>
  );
};

export default BorrowerInfo;