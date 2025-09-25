import { NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // Assuming you have a firebase config file

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cart, dispensaryId, deliveryAddress } = body;

    if (!cart || !dispensaryId || !deliveryAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Fetch dispensary details from Firestore to get the collection_address
    const dispensaryRef = doc(db, 'dispensaries', dispensaryId);
    const dispensarySnap = await getDoc(dispensaryRef);

    if (!dispensarySnap.exists()) {
      return NextResponse.json({ error: 'Dispensary not found' }, { status: 404 });
    }

    const dispensaryData = dispensarySnap.data();
    // IMPORTANT: Ensure the dispensary address is in the format Shiplogic expects.
    // You might need to adapt this based on your Firestore data structure.
    const collectionAddress = {
        "street_number": dispensaryData.address.street_number,
        "route": dispensaryData.address.route,
        "locality": dispensaryData.address.locality,
        "administrative_area_level_1": dispensaryData.address.administrative_area_level_1,
        "country": dispensaryData.address.country,
        "postal_code": dispensaryData.address.postal_code
    };

    // 2. Format the parcels array from the cart data
    // IMPORTANT: Your products in Firestore MUST have these dimension and weight fields.
    const parcels = cart.map((item: any) => ({
      submitted_length_cm: item.dimensions?.length || 10, // Default values as a fallback
      submitted_width_cm: item.dimensions?.width || 10,
      submitted_height_cm: item.dimensions?.height || 10,
      submitted_weight_kg: item.weight || 1,
    }));

    const declared_value = cart.reduce((total: number, item: any) => total + (item.price * item.quantity), 0);

    // 3. Construct the request body for ShipLogic API
    const shiplogicRequestBody = {
      collection_address: collectionAddress,
      delivery_address: deliveryAddress, // This comes from the user in the checkout form
      parcels,
      declared_value,
      service_level: "economy" // Or other service levels as needed
    };

    // 4. Call the ShipLogic API
    const shiplogicResponse = await fetch('https://api.shiplogic.com/v2/rates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SHIPLOGIC_API_KEY}`,
      },
      body: JSON.stringify(shiplogicRequestBody),
    });

    if (!shiplogicResponse.ok) {
      const errorText = await shiplogicResponse.text();
      console.error("ShipLogic API Error:", errorText);
      return NextResponse.json({ error: `ShipLogic API error: ${errorText}` }, { status: shiplogicResponse.status });
    }

    const data = await shiplogicResponse.json();

    // 5. Return the rates to the client
    return NextResponse.json(data);

  } catch (error: any) {
    console.error("Error in shipping-rates API route:", error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
