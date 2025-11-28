import { db, functions } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, query, where, orderBy, Timestamp, addDoc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import type { Order, OrderShipment } from '@/types/order';

const ORDERS_COLLECTION = 'orders';

export const createOrder = async (
  userId: string,
  orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  // Generate unique order number
  const timestamp = new Date().getTime();
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  const orderNumber = `WT-${timestamp}-${randomStr}`;

  // Create the order document
  const orderDoc = {
    ...orderData,
    orderNumber,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  // Create orders in respective dispensary type collections
  const dispensaryOrders = new Map<string, OrderShipment[]>();
  
  // Group shipments by dispensary type
  Object.entries(orderData.shipments).forEach(([dispensaryId, shipment]) => {
    const dispensaryType = shipment.items[0]?.dispensaryType; // Assuming all items in a shipment are from same dispensary type
    if (!dispensaryType) return;
    
    const existingShipments = dispensaryOrders.get(dispensaryType) || [];
    dispensaryOrders.set(dispensaryType, [...existingShipments, { ...shipment, dispensaryId }]);
  });

  // Create order in the orders collection
  const orderRef = await addDoc(collection(db, ORDERS_COLLECTION), orderDoc);
  
  return orderNumber;
};

export const getOrder = async (orderNumber: string, dispensaryType: string): Promise<Order | null> => {
  const ordersRef = collection(db, ORDERS_COLLECTION);
  const q = query(ordersRef, where('orderNumber', '==', orderNumber));
  
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  
  const orderDoc = snapshot.docs[0];
  return { id: orderDoc.id, ...orderDoc.data() } as Order;
};

export const getUserOrders = async (userId: string): Promise<Order[]> => {
  const ordersRef = collection(db, ORDERS_COLLECTION);
  const q = query(
    ordersRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
};

export const getDispensaryOrders = async (dispensaryId: string, dispensaryType: string): Promise<Order[]> => {
  const ordersRef = collection(db, ORDERS_COLLECTION);
  const q = query(
    ordersRef,
    where('shipments', 'array-contains', { dispensaryId }),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
};

export const updateOrderStatus = async (
  orderId: string,
  dispensaryType: string,
  status: Order['status'],
  dispensaryId?: string,
  shipmentStatus?: OrderShipment['status']
): Promise<void> => {
  const orderRef = doc(db, ORDERS_COLLECTION, orderId);
  
  const updateData: any = {
    status,
    updatedAt: Timestamp.now()
  };

  // If updating a specific shipment
  if (dispensaryId && shipmentStatus) {
    updateData[`shipments.${dispensaryId}.status`] = shipmentStatus;
    updateData[`shipments.${dispensaryId}.lastStatusUpdate`] = Timestamp.now();
    updateData[`shipments.${dispensaryId}.statusHistory`] = {
      status: shipmentStatus,
      timestamp: Timestamp.now()
    };
  }

  await updateDoc(orderRef, updateData);
};

// Updates tracking info for a shipment
export const updateShipmentTracking = async (
  orderId: string,
  dispensaryType: string,
  dispensaryId: string,
  trackingData: {
    trackingNumber: string;
    trackingUrl?: string;
    provider: 'shiplogic' | 'pudo';
  }
): Promise<void> => {
  const orderRef = doc(db, ORDERS_COLLECTION, orderId);
  
  await updateDoc(orderRef, {
    [`shipments.${dispensaryId}.trackingNumber`]: trackingData.trackingNumber,
    [`shipments.${dispensaryId}.trackingUrl`]: trackingData.trackingUrl,
    [`shipments.${dispensaryId}.shippingProvider`]: trackingData.provider,
    updatedAt: Timestamp.now()
  });
};