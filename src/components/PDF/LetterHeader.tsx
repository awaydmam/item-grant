import React from 'react';
import { Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  headerContainer: {
    marginBottom: 30,
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingBottom: 15,
  },
  schoolName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  schoolAddress: {
    fontSize: 10,
    marginBottom: 8,
    color: '#666',
  },
  letterTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 15,
    textTransform: 'uppercase',
    textDecoration: 'underline',
  },
  letterInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 10,
    marginBottom: 10,
  },
  letterNumber: {
    fontWeight: 'bold',
  },
});

interface LetterHeaderProps {
  schoolName: string;
  schoolAddress: string;
  letterDate: string;
  letterNumber: string;
}

export const LetterHeader: React.FC<LetterHeaderProps> = ({
  schoolName,
  schoolAddress,
  letterDate,
  letterNumber
}) => {
  return (
    <View style={styles.headerContainer}>
      <Text style={styles.schoolName}>{schoolName}</Text>
      <Text style={styles.schoolAddress}>{schoolAddress}</Text>
      
      <Text style={styles.letterTitle}>Surat Peminjaman Alat</Text>
      
      <View style={styles.letterInfo}>
        <Text style={styles.letterNumber}>No: {letterNumber}</Text>
        <Text>Tanggal: {letterDate}</Text>
      </View>
    </View>
  );
};

export default LetterHeader;