import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { Order } from '@/types/order';
import { formatCurrency } from '@/lib/utils';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    width: 'auto',
    marginBottom: 20,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 8,
  },
  tableHeader: {
    backgroundColor: '#F3F4F6',
    fontWeight: 'bold',
  },
  tableCell: {
    flex: 1,
    fontSize: 10,
    paddingHorizontal: 4,
  },
  total: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 10,
  },
  totalAmount: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  address: {
    fontSize: 10,
    marginBottom: 5,
  },
});

interface OrderInvoiceProps {
  order: Order;
}

export function OrderInvoice({ order }: OrderInvoiceProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Invoice</Text>
          <Text style={styles.subtitle}>Order #{order.orderNumber}</Text>
          <Text style={styles.subtitle}>
            {order.createdAt.toDate().toLocaleDateString()}
          </Text>
        </View>

        {/* Customer Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Details</Text>
          <Text style={styles.address}>{order.customerDetails.name}</Text>
          <Text style={styles.address}>{order.customerDetails.email}</Text>
          <Text style={styles.address}>{order.customerDetails.phone}</Text>
        </View>

        {/* Shipping Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shipping Address</Text>
          <Text style={styles.address}>{order.shippingAddress.streetAddress}</Text>
          <Text style={styles.address}>{order.shippingAddress.suburb}</Text>
          <Text style={styles.address}>
            {order.shippingAddress.city}, {order.shippingAddress.province}
          </Text>
          <Text style={styles.address}>{order.shippingAddress.postalCode}</Text>
          <Text style={styles.address}>{order.shippingAddress.country}</Text>
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.tableCell}>Item</Text>
              <Text style={styles.tableCell}>Quantity</Text>
              <Text style={styles.tableCell}>Unit Price</Text>
              <Text style={styles.tableCell}>Total</Text>
            </View>
            {Object.values(order.shipments).flatMap(shipment =>
              shipment.items.map((item, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{item.name}</Text>
                  <Text style={styles.tableCell}>{item.quantity}</Text>
                  <Text style={styles.tableCell}>{formatCurrency(item.price)}</Text>
                  <Text style={styles.tableCell}>
                    {formatCurrency(item.price * item.quantity)}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <View style={styles.total}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalAmount}>{formatCurrency(order.subtotal)}</Text>
          </View>
          <View style={styles.total}>
            <Text style={styles.totalLabel}>Shipping</Text>
            <Text style={styles.totalAmount}>{formatCurrency(order.shippingTotal)}</Text>
          </View>
          <View style={styles.total}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>{formatCurrency(order.total)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}