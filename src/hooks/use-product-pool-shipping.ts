'use client';

import { useState, useCallback } from 'react';
import { httpsCallable, FunctionsError } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import type { ShippingRate } from '@/types/checkout';
import type { PudoLocker } from '@/types/shipping';
import type { Dispensary } from '@/types';

interface ProductPoolShippingConfig {
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    weight: number;
    lengthCm?: number;
    widthCm?: number;
    heightCm?: number;
  }>;
  sellerDispensary: Dispensary;
  buyerDispensary: Dispensary;
}

interface BuyerAddress {
  streetAddress: string;
  suburb: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

export const useProductPoolShipping = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingLockers, setIsFetchingLockers] = useState(false);
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [pudoLockers, setPudoLockers] = useState<PudoLocker[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [parcelSizeCategory, setParcelSizeCategory] = useState<string>('');

  const resetShipping = useCallback(() => {
    setRates([]);
    setPudoLockers([]);
    setError(null);
    setParcelSizeCategory('');
  }, []);

  /**
   * Fetch ShipLogic rates for door-to-door shipping
   */
  const fetchShiplogicRates = useCallback(async (
    config: ProductPoolShippingConfig,
    buyerAddress: BuyerAddress
  ) => {
    setIsLoading(true);
    setError(null);
    setRates([]);

    try {
      const getShiplogicRatesFn = httpsCallable(functions, 'getShiplogicRates');
      
      const payload = {
        cart: config.items.map(item => ({
          id: item.productId,
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          weight: item.weight,
          lengthCm: item.lengthCm,
          widthCm: item.widthCm,
          heightCm: item.heightCm,
        })),
        dispensaryId: config.sellerDispensary.id,
        type: 'std',
        deliveryAddress: {
          street_address: buyerAddress.streetAddress,
          local_area: buyerAddress.suburb,
          city: buyerAddress.city,
          zone: buyerAddress.province,
          code: buyerAddress.postalCode,
          country: buyerAddress.country,
          lat: buyerAddress.latitude,
          lng: buyerAddress.longitude,
        }
      };

      const result = await getShiplogicRatesFn(payload);
      const data = result.data as { rates?: ShippingRate[] };

      if (data.rates && data.rates.length > 0) {
        setRates(data.rates);
      } else {
        setError("No door-to-door shipping rates found for this address.");
      }
    } catch (e: any) {
      console.error("Error fetching ShipLogic rates:", e);
      let errorMessage = "An unexpected error occurred while fetching shipping rates.";
      if (e instanceof FunctionsError) {
        errorMessage = e.message;
      } else if (e.message) {
        errorMessage = e.message;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetch PUDO locker locations near buyer address
   */
  const fetchPudoLockers = useCallback(async (
    buyerAddress: BuyerAddress,
    totalWeight: number,
    dimensions?: { length: number; width: number; height: number }
  ) => {
    setIsFetchingLockers(true);
    setError(null);

    try {
      const getPudoLockersFn = httpsCallable(functions, 'getPudoLockerLocations');
      
      // Calculate parcel size category
      let sizeCategory = 'SMALL';
      if (dimensions) {
        const volume = dimensions.length * dimensions.width * dimensions.height;
        const maxDimension = Math.max(dimensions.length, dimensions.width, dimensions.height);
        
        if (maxDimension > 60 || volume > 100000 || totalWeight > 30) {
          sizeCategory = 'OVERSIZED';
        } else if (maxDimension > 40 || volume > 50000 || totalWeight > 10) {
          sizeCategory = 'LARGE';
        } else if (maxDimension > 25 || volume > 20000 || totalWeight > 5) {
          sizeCategory = 'MEDIUM';
        }
      }
      
      setParcelSizeCategory(sizeCategory);

      const payload = {
        address: {
          street_address: buyerAddress.streetAddress,
          local_area: buyerAddress.suburb,
          city: buyerAddress.city,
          zone: buyerAddress.province,
          code: buyerAddress.postalCode,
          country: buyerAddress.country,
        },
        parcelSizeCategory: sizeCategory
      };

      const result = await getPudoLockersFn(payload);
      const data = result.data as { pickupPoints?: PudoLocker[] };

      if (data.pickupPoints && data.pickupPoints.length > 0) {
        setPudoLockers(data.pickupPoints);
      } else {
        setError("No PUDO lockers found near this address.");
      }
    } catch (e: any) {
      console.error("Error fetching PUDO lockers:", e);
      let errorMessage = "An unexpected error occurred while fetching locker locations.";
      if (e instanceof FunctionsError) {
        errorMessage = e.message;
      } else if (e.message) {
        errorMessage = e.message;
      }
      setError(errorMessage);
    } finally {
      setIsFetchingLockers(false);
    }
  }, []);

  /**
   * Fetch PUDO rates for locker-based shipping (DTL/LTD/LTL)
   */
  const fetchPudoRates = useCallback(async (
    config: ProductPoolShippingConfig,
    shippingMethod: 'dtl' | 'ltd' | 'ltl',
    buyerAddress: BuyerAddress,
    destinationLocker?: PudoLocker
  ) => {
    setIsLoading(true);
    setError(null);
    setRates([]);

    try {
      const getPudoRatesFn = httpsCallable(functions, 'getPudoRates');
      
      const payload: any = {
        cart: config.items.map(item => ({
          id: item.productId,
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          weight: item.weight,
          lengthCm: item.lengthCm,
          widthCm: item.widthCm,
          heightCm: item.heightCm,
        })),
        dispensaryId: config.sellerDispensary.id,
        selectedTier: shippingMethod,
        deliveryAddress: {
          street_address: buyerAddress.streetAddress,
          local_area: buyerAddress.suburb,
          city: buyerAddress.city,
          zone: buyerAddress.province,
          code: buyerAddress.postalCode,
          country: buyerAddress.country,
          lat: buyerAddress.latitude,
          lng: buyerAddress.longitude,
        }
      };

      // Add locker codes based on method
      if ((shippingMethod === 'ltd' || shippingMethod === 'ltl') && config.sellerDispensary.originLocker) {
        payload.originLockerCode = config.sellerDispensary.originLocker.id;
      }
      
      if ((shippingMethod === 'dtl' || shippingMethod === 'ltl') && destinationLocker) {
        payload.destinationLockerCode = destinationLocker.id;
      }

      const result = await getPudoRatesFn(payload);
      const data = result.data as { rates?: ShippingRate[] };

      if (data.rates && data.rates.length > 0) {
        setRates(data.rates);
      } else {
        setError("No locker-based shipping rates found for the selected criteria.");
      }
    } catch (e: any) {
      console.error("Error fetching PUDO rates:", e);
      let errorMessage = "An unexpected error occurred while fetching PUDO rates.";
      if (e instanceof FunctionsError) {
        errorMessage = e.message;
      } else if (e.message) {
        errorMessage = e.message;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Calculate in-house delivery rate based on distance
   */
  const calculateInHouseDelivery = useCallback((
    sellerDispensary: Dispensary,
    buyerAddress: BuyerAddress
  ): ShippingRate | null => {
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371; // Radius of Earth in km
      const dLat = (lat2 - lat1) * (Math.PI / 180);
      const dLon = (lon2 - lon1) * (Math.PI / 180);
      const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const customerLat = buyerAddress.latitude;
    const customerLon = buyerAddress.longitude;
    const dispensaryLat = sellerDispensary.latitude;
    const dispensaryLon = sellerDispensary.longitude;

    let deliveryFee = 50; // Default fallback
    let deliveryTime = 'Same-day or next-day';

    if (customerLat && customerLon && dispensaryLat && dispensaryLon) {
      const distanceKm = calculateDistance(dispensaryLat, dispensaryLon, customerLat, customerLon);
      const deliveryRadiusKm = sellerDispensary.deliveryRadius && sellerDispensary.deliveryRadius !== 'none'
        ? parseFloat(sellerDispensary.deliveryRadius)
        : null;

      // Flat fee if within radius
      if (sellerDispensary.inHouseDeliveryPrice && deliveryRadiusKm && distanceKm <= deliveryRadiusKm) {
        deliveryFee = sellerDispensary.inHouseDeliveryPrice;
        deliveryTime = sellerDispensary.sameDayDeliveryCutoff
          ? `Same-day if ordered before ${sellerDispensary.sameDayDeliveryCutoff}`
          : 'Same-day delivery';
      }
      // Per km pricing
      else if (sellerDispensary.pricePerKm) {
        const roundedDistance = Math.ceil(distanceKm);
        deliveryFee = sellerDispensary.pricePerKm * roundedDistance;
        deliveryTime = `${roundedDistance}km away - Estimated ${roundedDistance < 10 ? 'same-day' : '1-2 days'}`;
      }
      // Fallback to legacy fee
      else if (sellerDispensary.inHouseDeliveryFee) {
        deliveryFee = sellerDispensary.inHouseDeliveryFee;
      }
    } else {
      deliveryFee = sellerDispensary.inHouseDeliveryPrice ?? sellerDispensary.inHouseDeliveryFee ?? 50;
      deliveryTime = sellerDispensary.sameDayDeliveryCutoff
        ? `Same-day if ordered before ${sellerDispensary.sameDayDeliveryCutoff}`
        : 'Same-day or next-day';
    }

    return {
      id: 'in_house',
      name: 'Local Delivery',
      courier_name: sellerDispensary.dispensaryName || 'In-house Delivery',
      provider: 'in_house',
      label: 'Local Delivery',
      rate: deliveryFee,
      price: deliveryFee,
      serviceType: 'local',
      estimatedDays: deliveryTime,
      delivery_time: deliveryTime,
      service_level: 'local',
    };
  }, []);

  /**
   * Create collection rate (free pickup)
   */
  const createCollectionRate = useCallback((sellerDispensary: Dispensary): ShippingRate => {
    return {
      id: 'collection',
      name: 'In-Store Collection',
      courier_name: sellerDispensary.dispensaryName || 'Collection',
      provider: 'collection',
      label: 'In-Store Collection',
      rate: 0,
      price: 0,
      serviceType: 'collection',
      estimatedDays: 'N/A',
      delivery_time: 'N/A',
      service_level: 'collection',
    };
  }, []);

  return {
    // State
    isLoading,
    isFetchingLockers,
    rates,
    pudoLockers,
    error,
    parcelSizeCategory,

    // Actions
    fetchShiplogicRates,
    fetchPudoLockers,
    fetchPudoRates,
    calculateInHouseDelivery,
    createCollectionRate,
    resetShipping,
  };
};
