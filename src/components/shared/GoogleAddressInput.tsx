"use client";

import React, { useRef, useEffect, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { UseFormReturn } from "react-hook-form";

interface GoogleAddressInputProps {
    form: UseFormReturn<any>; 
    className?: string;
}

export function GoogleAddressInput({ form, className }: GoogleAddressInputProps) {
    const locationInputRef = useRef<HTMLInputElement>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loader = new Loader({
            apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
            version: "weekly",
            libraries: ["places", "maps", "marker"],
        });

        loader.load().then(async () => {
            const { Map } = await google.maps.importLibrary("maps") as google.maps.MapsLibrary;
            const { Marker } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;

            // Default to a central location in South Africa
            const initialLat = -29.8587;
            const initialLng = 31.0218;

            const mapInstance = new Map(mapContainerRef.current!, {
                center: { lat: initialLat, lng: initialLng },
                zoom: 5,
                mapId: 'b39f3f8b7139051d',
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
            });

            const markerInstance = new Marker({
                map: mapInstance,
                draggable: true,
                title: "Drag to set location",
            });

            // Function to parse address components and set form values
            const setAddressComponents = (place: google.maps.places.PlaceResult) => {
                const components: { [key: string]: string } = {};
                place.address_components?.forEach(component => {
                    const type = component.types[0];
                    components[type] = component.long_name;
                });

                form.setValue('shippingAddress.street_number', components['street_number'] || '', { shouldValidate: true });
                form.setValue('shippingAddress.route', components['route'] || '', { shouldValidate: true });
                form.setValue('shippingAddress.locality', components['locality'] || '', { shouldValidate: true });
                form.setValue('shippingAddress.administrative_area_level_1', components['administrative_area_level_1'] || '', { shouldValidate: true });
                form.setValue('shippingAddress.country', components['country'] || '', { shouldValidate: true });
                form.setValue('shippingAddress.postal_code', components['postal_code'] || '', { shouldValidate: true });
            };

            // Setup Autocomplete
            if (locationInputRef.current) {
                const autocomplete = new google.maps.places.Autocomplete(locationInputRef.current, {
                    fields: ["formatted_address", "address_components", "geometry.location"],
                    types: ["address"],
                    componentRestrictions: { country: "za" },
                });

                autocomplete.addListener("place_changed", () => {
                    const place = autocomplete.getPlace();
                    if (place.formatted_address && place.geometry?.location) {
                        const loc = place.geometry.location;
                        form.setValue('shippingAddress.address', place.formatted_address, { shouldValidate: true });
                        form.setValue('shippingAddress.latitude', loc.lat(), { shouldValidate: true });
                        form.setValue('shippingAddress.longitude', loc.lng(), { shouldValidate: true });
                        setAddressComponents(place);

                        mapInstance.setCenter(loc);
                        mapInstance.setZoom(17);
                        markerInstance.setPosition(loc);
                        markerInstance.setVisible(true);
                    }
                });
            }

            // Handle Marker Dragging
            markerInstance.addListener('dragend', (event: google.maps.MapMouseEvent) => {
                if (event.latLng) {
                    const lat = event.latLng.lat();
                    const lng = event.latLng.lng();
                    form.setValue('shippingAddress.latitude', lat, { shouldValidate: true, shouldDirty: true });
                    form.setValue('shippingAddress.longitude', lng, { shouldValidate: true, shouldDirty: true });

                    const geocoder = new google.maps.Geocoder();
                    geocoder.geocode({ location: event.latLng }, (results, status) => {
                        if (status === 'OK' && results?.[0]) {
                            const place = results[0];
                            form.setValue('shippingAddress.address', place.formatted_address, { shouldValidate: true, shouldDirty: true });
                            // Manually update the input field value
                            if (locationInputRef.current) {
                                locationInputRef.current.value = place.formatted_address;
                            }
                            setAddressComponents(place);
                        } else {
                            console.error('Geocoder failed due to: ' + status);
                        }
                    });
                }
            });
        });
    }, [form]);


    return (
        <div className={cn("space-y-4", className)}>
            <div>
                <Label htmlFor="location">Shipping Address</Label>
                <Input 
                    id="location" 
                    ref={locationInputRef} 
                    {...form.register("shippingAddress.address")}
                    placeholder="Start typing your address..." 
                />
                <p className="text-sm text-muted-foreground pt-1">
                    Please provide a valid South African address for delivery.
                </p>
            </div>
            <div ref={mapContainerRef} style={{ height: '300px', width: '100%', borderRadius: '8px' }}></div>
            {/* Hidden fields for structured address data */}
            <Input {...form.register("shippingAddress.street_number")} type="hidden" />
            <Input {...form.register("shippingAddress.route")} type="hidden" />
            <Input {...form.register("shippingAddress.locality")} type="hidden" />
            <Input {...form.register("shippingAddress.administrative_area_level_1")} type="hidden" />
            <Input {...form.register("shippingAddress.country")} type="hidden" />
            <Input {...form.register("shippingAddress.postal_code")} type="hidden" />
            <Input {...form.register("shippingAddress.latitude")} type="hidden" />
            <Input {...form.register("shippingAddress.longitude")} type="hidden" />
        </div>
    )
}
