
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { CartItem, Dispensary } from '@/types';
import * as admin from 'firebase-admin';

const initializeFirebaseAdmin = () => {
    if (!admin.apps.length) {
        try {
            console.log('Initializing Firebase Admin...');
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            console.log('Firebase Admin initialized successfully.');
        } catch (e: any) {
            console.error("Firebase Admin initialization error:", e.message);
            throw new Error("Firebase Admin initialization failed.");
        }
    }
    return admin.firestore();
};

interface RequestBody { cart: CartItem[]; dispensaryId: string; deliveryAddress: { street_number?: string; route?: string; locality?: string; administrative_area_level_1?: string; country?: string; postal_code?: string; };}
interface ShipLogicRate { id: number; courier_name: string; rate: string; service_level: { name: string; description: string; }; estimated_delivery: string; }

const parseLocationString = (location: string) => {
    console.log(`Parsing location string: "${location}"`);
    const parts = location.split(',').map(part => part.trim());
    if (parts.length < 4) {
        console.warn(`Location string is not detailed. Parts found: ${parts.length}`);
        return { street_address: parts[0] || '', city: parts[1] || parts[0] || '', postal_code: parts[2] || '', local_area: parts[1] || '' };
    }
    const address = { street_address: parts[0], local_area: parts[1], city: parts[2], postal_code: parts[3] };
    console.log('Parsed location:', address);
    return address;
};

export async function POST(request: NextRequest) {
    console.log('\n--- New Shipping Rate Request ---');
    try {
        console.log('Step 1: Initializing DB');
        const db = initializeFirebaseAdmin();

        console.log('Step 2: Parsing request body');
        const body: RequestBody = await request.json();
        console.log('Request body parsed:', { dispensaryId: body.dispensaryId, deliveryAddress: body.deliveryAddress });

        if (!body.cart || !body.dispensaryId || !body.deliveryAddress) {
            return NextResponse.json({ error: 'Missing cart, dispensary, or delivery address information' }, { status: 400 });
        }

        console.log(`Step 3: Fetching dispensary '${body.dispensaryId}'`);
        const dispensaryRef = db.collection('dispensaries').doc(body.dispensaryId);
        const dispensaryDoc = await dispensaryRef.get();

        if (!dispensaryDoc.exists) {
            console.error('Dispensary not found.');
            return NextResponse.json({ error: 'Dispensary not found' }, { status: 404 });
        }
        const dispensaryData = dispensaryDoc.data() as Dispensary;
        console.log('Dispensary data fetched:', { name: dispensaryData.dispensaryName, location: dispensaryData.location });

        if (!dispensaryData.location || !dispensaryData.dispensaryName) {
             return NextResponse.json({ error: 'Dispensary address or name is missing.' }, { status: 500 });
        }
        
        const parsedCollectionAddress = parseLocationString(dispensaryData.location);

        console.log('Step 4: Preparing ShipLogic payload');
        const collectionAddress = { company: dispensaryData.dispensaryName, street_address: parsedCollectionAddress.street_address, local_area: parsedCollectionAddress.local_area, city: parsedCollectionAddress.city, postal_code: parsedCollectionAddress.postal_code, country: 'ZA' };
        const deliveryAddress = { street_address: `${body.deliveryAddress.street_number || ''} ${body.deliveryAddress.route || ''}`.trim(), local_area: body.deliveryAddress.locality || '', city: body.deliveryAddress.locality || '', postal_code: body.deliveryAddress.postal_code || '', country: 'ZA' };
        const parcel = { width: 20, height: 20, length: 20, weight: 2 };
        const shipLogicPayload = { collection_address: collectionAddress, delivery_address: deliveryAddress, parcels: [parcel], declared_value: body.cart.reduce((total, item) => total + (item.price * item.quantity), 0), service_level: 'economy' };
        console.log('ShipLogic payload ready:', JSON.stringify(shipLogicPayload, null, 2));

        console.log('Step 5: Calling ShipLogic API');
        const shipLogicResponse = await fetch('https://api.shiplogic.com/v2/rates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.SHIPLOGIC_API_KEY}` },
            body: JSON.stringify(shipLogicPayload),
        });
        console.log(`ShipLogic API response status: ${shipLogicResponse.status}`);

        if (!shipLogicResponse.ok) {
            const errorBody = await shipLogicResponse.text(); // Use text() to avoid JSON parsing errors
            console.error('ShipLogic API Error Response:', errorBody);
            const errorMessage = 'Failed to fetch shipping rates from provider.';
            try {
                const jsonError = JSON.parse(errorBody);
                const message = jsonError.error?.message || errorMessage;
                return NextResponse.json({ error: message, details: jsonError }, { status: shipLogicResponse.status });
            } catch (e) {
                return NextResponse.json({ error: errorMessage, details: errorBody }, { status: shipLogicResponse.status });
            }
        }

        console.log('Step 6: Processing ShipLogic response');
        const shipLogicData = await shipLogicResponse.json();

        const formattedRates = shipLogicData.map((rate: ShipLogicRate) => ({ id: rate.id, name: rate.service_level.name, rate: parseFloat(rate.rate), service_level: rate.service_level.name, delivery_time: rate.service_level.description, courier_name: rate.courier_name }));
        
        if (formattedRates.length === 0) {
            console.warn('No shipping rates were returned from ShipLogic.');
            return NextResponse.json({ error: "No shipping rates could be found for the provided address. Please check the address and try again." }, { status: 404 });
        }
        
        console.log(`Step 7: Successfully returning ${formattedRates.length} rates.`);
        return NextResponse.json({ rates: formattedRates });

    } catch (error: any) {
        console.error('--- Unhandled Exception in shipping-rates endpoint ---');
        console.error(error);
        return NextResponse.json({ error: `An unexpected internal server error occurred: ${error.message}` }, { status: 500 });
    }
}

export async function OPTIONS() {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
}
