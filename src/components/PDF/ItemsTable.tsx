import React from 'react';
import { Text, View, StyleSheet } from '@react-pdf/renderer';

const borderColor = '#000';
const styles = StyleSheet.create({
  tableContainer: {
    marginBottom: 20,
    borderWidth: 1,
    borderColor: borderColor,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: borderColor,
    alignItems: 'center',
    height: 30,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: borderColor,
    alignItems: 'center',
    minHeight: 25,
  },
  tableRowLast: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 25,
  },
  colNo: {
    width: '8%',
    textAlign: 'center',
    borderRightWidth: 1,
    borderRightColor: borderColor,
    padding: 5,
  },
  colName: {
    width: '45%',
    textAlign: 'left',
    borderRightWidth: 1,
    borderRightColor: borderColor,
    padding: 5,
  },
  colCode: {
    width: '20%',
    textAlign: 'center',
    borderRightWidth: 1,
    borderRightColor: borderColor,
    padding: 5,
  },
  colQty: {
    width: '12%',
    textAlign: 'center',
    borderRightWidth: 1,
    borderRightColor: borderColor,
    padding: 5,
  },
  colNote: {
    width: '15%',
    textAlign: 'center',
    padding: 5,
  },
  headerText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  cellText: {
    fontSize: 9,
    lineHeight: 1.3,
  },
});

interface ItemsTableProps {
  items: Array<{
    quantity: number;
    items?: {
      name: string;
      code?: string;
      description?: string;
    };
    item?: {
      name: string;
      code?: string;
      description?: string;
    };
  }>;
}

export const ItemsTable: React.FC<ItemsTableProps> = ({ items }) => {
  return (
    <View style={styles.tableContainer}>
      {/* Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.colNo, styles.headerText]}>No.</Text>
        <Text style={[styles.colName, styles.headerText]}>Nama Alat</Text>
        <Text style={[styles.colCode, styles.headerText]}>Kode Alat</Text>
        <Text style={[styles.colQty, styles.headerText]}>Jumlah</Text>
        <Text style={[styles.colNote, styles.headerText]}>Keterangan</Text>
      </View>
      
      {/* Rows */}
      {items.map((item, index) => {
        const ref = item.items || item.item || { name: '-', code: '-', description: '' };
        return (
        <View 
          key={index} 
          style={index === items.length - 1 ? styles.tableRowLast : styles.tableRow}
        >
          <Text style={[styles.colNo, styles.cellText]}>{index + 1}</Text>
          <Text style={[styles.colName, styles.cellText]}>{ref.name}</Text>
          <Text style={[styles.colCode, styles.cellText]}>{ref.code || '-'}</Text>
          <Text style={[styles.colQty, styles.cellText]}>{item.quantity} unit</Text>
          <Text style={[styles.colNote, styles.cellText]}>
            {ref.description || 'Baik'}
          </Text>
        </View>
      );})}
    </View>
  );
};

export default ItemsTable;