
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as logger from 'firebase-functions/logger';
import axios from 'axios';

// Define the secret parameter for the Shiplogic API Key
const shiplogicApiKeySecret = defineSecret('shiplogic-api-key');

// Define the expected structure for a single item in the cart
interface CartItem {
  sku: string;
  description: string;
  quantity: number;
  price: number;
  weight: number; // in kg
  length: number; // in cm
  width: number; // in cm
  height: number; // in cm
}

// Define the expected structure for the destination address
interface DestinationAddress {
  street: string;
  suburb: string;
  city: string;
  province: string;
  postalCode: string;
  country: string; // e.g., "South Africa"
}

// Define the complete request data structure for our function
interface GetRatesRequestData {
  cartItems: CartItem[];
  destination: DestinationAddress;
  // Also expecting user/customer details for the destination contact
  destinationContactName: string;
  destinationContactPhone: string;
}

const SHIPLOGIC_API_URL = 'https://api.shiplogic.com/v2/rates';

export const getShiplogicRates = onCall({ secrets: [shiplogicApiKeySecret], cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const shiplogicApiKey = shiplogicApiKeySecret.value();

  const data = request.data as GetRatesRequestData;

  // --- Data Validation ---
  if (!data.cartItems || !Array.isArray(data.cartItems) || data.cartItems.length === 0) {
    throw new HttpsError('invalid-argument', 'Cart items are missing or invalid.');
  }
  if (!data.destination) {
    throw new HttpsError('invalid-argument', 'Destination address is missing.');
  }
  if (!data.destinationContactName || !data.destinationContactPhone) {
    throw new HttpsError('invalid-argument', 'Destination contact name and phone are required.');
  }

  // --- Construct Shiplogic Payload ---
  // TODO: Replace hardcoded collection address with dynamic data from Firestore
  // This would involve getting the dispensaryId from the products in the cart
  // and then fetching the corresponding dispensary document.
  const shiplogicPayload = {
    collection_address: {
      street: "1 Disa Rd, Kaapstad",
      suburb: "Westlake",
      city: "Cape Town",
      province: "Western Cape",
      postal_code: "7945",
      country: "South Africa"
    },
    collection_contact: {
      name: "The Wellness Tree",
      telephone: "0217881234",
      email: "info@wellnesstree.co.za"
    },
    destination_address: {
      street: data.destination.street,
      suburb: data.destination.suburb,
      city: data.destination.city,
      province: data.destination.province,
      postal_code: data.destination.postalCode,
      country: data.destination.country,
    },
    destination_contact: {
        name: data.destinationContactName,
        telephone: data.destinationContactPhone,
    },
    parcels: data.cartItems.map(item => ({
      description: item.description,
      quantity: item.quantity,
      value: item.price,
      weight: item.weight,
      length: item.length,
      width: item.width,
      height: item.height,
    })),
    service_level: 'DTD',
  };

  try {
    logger.info("Requesting rates from Shiplogic...", { street: data.destination.street });

    const response = await axios.post(SHIPLOGIC_API_URL, shiplogicPayload, {
      headers: {
        'Authorization': `Bearer ${shiplogicApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    logger.info("Successfully received rates from Shiplogic.");

    // The API returns a "rates" array. We will return this to the client.
    return { rates: response.data.rates };

  } catch (error: any) {
    if (axios.isAxiosError(error)) {
        logger.error('Axios error calling Shiplogic API:', { 
            message: error.message, 
            response: error.response?.data,
            status: error.response?.status
        });
        // Pass a more user-friendly error message back to the client
        const errorMessage = error.response?.data?.message || 'Failed to fetch shipping rates from the provider.';
        throw new HttpsError('internal', errorMessage);
    } else {
        logger.error('Unknown error in getShiplogicRates:', error);
        throw new HttpsError('internal', 'An unexpected error occurred while fetching shipping rates.');
    }
  }
});
