// Order tracking service stub

export interface CustomerFriendlyTrackingUpdate {
  status: string;
  timestamp: Date;
  location?: string;
  message?: string;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  isError?: boolean;
  isCompleted?: boolean;
  isCurrent?: boolean;
}

export const trackOrder = async (orderId: string) => {
  // Implementation pending
  return null;
};

export const getTrackingInfo = async (trackingNumber: string) => {
  // Implementation pending
  return null;
};
