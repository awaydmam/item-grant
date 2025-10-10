import React from 'react';
import { Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  headerContainer: {
    marginBottom: 18,
    textAlign: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: '#000',
    paddingBottom: 10,
    position: 'relative'
  },
  schoolName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  schoolAddress: {
    fontSize: 9,
    marginBottom: 4,
    color: '#666',
  },
  letterTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
    textTransform: 'uppercase',
    textDecoration: 'underline',
  },
  letterInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 9,
    marginBottom: 4,
  },
  letterNumber: {
    fontWeight: 'bold',
  },
  logo: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 46,
    height: 46,
    objectFit: 'cover'
  },
  typeBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    fontSize: 7,
    padding: 3,
    borderWidth: 0.7,
    borderColor: '#444',
    borderRadius: 2,
    textTransform: 'uppercase'
  }
});

interface LetterHeaderProps {
  schoolName: string;
  schoolAddress: string;
  letterDate: string;
  letterNumber: string;
  logoUrl?: string;
  letterType?: 'internal' | 'official';
}

export const LetterHeader: React.FC<LetterHeaderProps> = ({
  schoolName,
  schoolAddress,
  letterDate,
  letterNumber,
  logoUrl,
  letterType
}) => {
  // Pastikan hanya pakai format yang aman (png/jpg/jpeg/base64). Jika webp -> coba ganti .webp ke .png
  const resolvedLogo = (() => {
    if (!logoUrl) return '/logodm.png';
    if (logoUrl.startsWith('data:image')) return logoUrl; // base64 inline
    if (logoUrl.endsWith('.webp')) return logoUrl.replace('.webp', '.png');
    return logoUrl;
  })();

  return (
    <View style={styles.headerContainer}>
      {resolvedLogo && <Image style={styles.logo} src={resolvedLogo} />}
      {letterType && (
        <Text style={styles.typeBadge}>{letterType === 'official' ? 'RESMI' : 'INTERNAL'}</Text>
      )}
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