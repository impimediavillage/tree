"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin,
  Package,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Search,
  Building2,
} from "lucide-react";

interface PudoLocker {
  LockerID: string;
  LockerCode: string;
  LockerName: string;
  Address: string;
  SuburbName: string;
  CityName: string;
  ProvinceName: string;
  PostalCode: string;
  Latitude: number;
  Longitude: number;
}

interface OriginLockerConfig {
  lockerId: string;
  lockerCode: string;
  lockerName: string;
  address: string;
  suburb: string;
  city: string;
  province: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  updatedAt: Timestamp | Date;
  updatedBy?: string;
}

export default function OriginLockerTab() {
  const [config, setConfig] = useState<OriginLockerConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingLockers, setLoadingLockers] = useState(false);
  const [lockers, setLockers] = useState<PudoLocker[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredLockers, setFilteredLockers] = useState<PudoLocker[]>([]);
  const [selectedLocker, setSelectedLocker] = useState<PudoLocker | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchOriginLocker();
  }, []);

  useEffect(() => {
    filterLockers();
  }, [lockers, searchTerm]);

  const fetchOriginLocker = async () => {
    try {
      setLoading(true);
      const configRef = doc(db, "treehouse_config", "origin_locker");
      const configSnap = await getDoc(configRef);

      if (configSnap.exists()) {
        setConfig(configSnap.data() as OriginLockerConfig);
      }
    } catch (error) {
      console.error("Error fetching origin locker:", error);
      toast({
        title: "Error",
        description: "Failed to load origin locker configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPudoLockers = async () => {
    try {
      setLoadingLockers(true);
      
      // Call the getPudoLockers Cloud Function
      const response = await fetch('/api/get-pudo-lockers');
      
      if (!response.ok) {
        throw new Error('Failed to fetch Pudo lockers');
      }

      const data = await response.json();
      
      if (data.lockers && Array.isArray(data.lockers)) {
        setLockers(data.lockers);
        toast({
          title: "Success",
          description: `Loaded ${data.lockers.length} Pudo lockers`,
        });
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error("Error fetching Pudo lockers:", error);
      toast({
        title: "Error",
        description: "Failed to load Pudo lockers. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingLockers(false);
    }
  };

  const filterLockers = () => {
    if (!searchTerm) {
      setFilteredLockers(lockers);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = lockers.filter(
      (locker) =>
        locker.LockerCode?.toLowerCase().includes(term) ||
        locker.LockerName?.toLowerCase().includes(term) ||
        locker.Address?.toLowerCase().includes(term) ||
        locker.SuburbName?.toLowerCase().includes(term) ||
        locker.CityName?.toLowerCase().includes(term) ||
        locker.ProvinceName?.toLowerCase().includes(term)
    );
    setFilteredLockers(filtered);
  };

  const handleSelectLocker = (locker: PudoLocker) => {
    setSelectedLocker(locker);
  };

  const handleSaveOriginLocker = async () => {
    if (!selectedLocker) {
      toast({
        title: "No Locker Selected",
        description: "Please select a Pudo locker to set as origin",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      const originConfig: OriginLockerConfig = {
        lockerId: selectedLocker.LockerID,
        lockerCode: selectedLocker.LockerCode,
        lockerName: selectedLocker.LockerName,
        address: selectedLocker.Address,
        suburb: selectedLocker.SuburbName,
        city: selectedLocker.CityName,
        province: selectedLocker.ProvinceName,
        postalCode: selectedLocker.PostalCode,
        latitude: selectedLocker.Latitude,
        longitude: selectedLocker.Longitude,
        updatedAt: Timestamp.now(),
      };

      const configRef = doc(db, "treehouse_config", "origin_locker");
      await setDoc(configRef, originConfig, { merge: true });

      setConfig(originConfig);
      
      toast({
        title: "Success",
        description: "Origin locker set successfully",
      });
    } catch (error) {
      console.error("Error saving origin locker:", error);
      toast({
        title: "Error",
        description: "Failed to save origin locker",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading origin locker configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Configuration Card */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-[#3D2E17] flex items-center gap-2">
              <MapPin className="h-5 w-5 text-[#006B3E]" />
              Current Origin Locker
            </h3>
            <p className="text-sm text-muted-foreground">
              This locker is used as the origin point for all Treehouse product shipments
            </p>
          </div>
          {config && (
            <Badge className="bg-[#006B3E]">
              <CheckCircle className="h-3 w-3 mr-1" />
              Configured
            </Badge>
          )}
        </div>

        {config ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Locker Code</Label>
                <p className="font-mono font-bold text-[#006B3E] text-lg">{config.lockerCode}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Locker Name</Label>
                <p className="font-medium text-[#3D2E17]">{config.lockerName}</p>
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Address</Label>
              <p className="text-sm">{config.address}</p>
              <p className="text-sm text-muted-foreground">
                {config.suburb}, {config.city}, {config.province} {config.postalCode}
              </p>
            </div>

            <div className="flex items-center gap-4 text-sm p-3 bg-white/50 dark:bg-black/10 rounded-lg">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-600" />
                <span className="text-muted-foreground">Coordinates:</span>
                <span className="font-mono">{config.latitude}, {config.longitude}</span>
              </div>
            </div>

            {config.updatedAt && (
              <div className="text-xs text-muted-foreground">
                Last updated: {new Date(config.updatedAt as any).toLocaleString()}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-amber-600 mx-auto mb-3" />
            <p className="text-muted-foreground mb-2">No origin locker configured</p>
            <p className="text-sm text-muted-foreground">
              Please load Pudo lockers and select one to set as origin
            </p>
          </div>
        )}
      </Card>

      {/* Load Pudo Lockers Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-[#3D2E17] flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#006B3E]" />
              Select Origin Locker
            </h3>
            <p className="text-sm text-muted-foreground">
              Load Pudo lockers and choose one as the shipping origin point
            </p>
          </div>
          <Button
            onClick={fetchPudoLockers}
            disabled={loadingLockers}
            variant="outline"
          >
            {loadingLockers ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Load Pudo Lockers
              </>
            )}
          </Button>
        </div>

        {lockers.length > 0 && (
          <>
            {/* Search */}
            <div className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by code, name, address, city, province..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Selected Locker Preview */}
            {selectedLocker && (
              <div className="mb-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border-2 border-[#006B3E]">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-[#3D2E17]">Selected Locker</p>
                    <p className="font-mono text-[#006B3E] font-bold">{selectedLocker.LockerCode}</p>
                  </div>
                  <Button
                    onClick={handleSaveOriginLocker}
                    disabled={saving}
                    className="bg-[#006B3E] hover:bg-[#005a33]"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Set as Origin
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-sm font-medium">{selectedLocker.LockerName}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedLocker.Address}, {selectedLocker.SuburbName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedLocker.CityName}, {selectedLocker.ProvinceName} {selectedLocker.PostalCode}
                </p>
              </div>
            )}

            {/* Lockers List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredLockers.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No lockers found matching your search</p>
                </div>
              ) : (
                filteredLockers.map((locker) => (
                  <Card
                    key={locker.LockerID}
                    className={`p-4 cursor-pointer transition-all hover:border-[#006B3E] ${
                      selectedLocker?.LockerID === locker.LockerID
                        ? "border-2 border-[#006B3E] bg-green-50 dark:bg-green-950/20"
                        : ""
                    } ${
                      config?.lockerId === locker.LockerID
                        ? "border-2 border-blue-600 bg-blue-50 dark:bg-blue-950/20"
                        : ""
                    }`}
                    onClick={() => handleSelectLocker(locker)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="font-mono">
                            {locker.LockerCode}
                          </Badge>
                          {config?.lockerId === locker.LockerID && (
                            <Badge className="bg-blue-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Current Origin
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium text-[#3D2E17]">{locker.LockerName}</p>
                        <p className="text-sm text-muted-foreground">{locker.Address}</p>
                        <p className="text-sm text-muted-foreground">
                          {locker.SuburbName}, {locker.CityName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {locker.ProvinceName} {locker.PostalCode}
                        </p>
                      </div>
                      <div className="text-right">
                        <MapPin className="h-5 w-5 text-[#006B3E] ml-auto" />
                        <p className="text-xs text-muted-foreground font-mono mt-1">
                          {locker.Latitude.toFixed(4)}, {locker.Longitude.toFixed(4)}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </>
        )}

        {lockers.length === 0 && !loadingLockers && (
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-2">No Pudo lockers loaded</p>
            <p className="text-sm text-muted-foreground mb-4">
              Click "Load Pudo Lockers" to fetch available lockers
            </p>
          </div>
        )}
      </Card>

      {/* Info Card */}
      <Card className="p-4 bg-amber-50 dark:bg-amber-950/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-[#3D2E17] mb-1">Important Information</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• The origin locker is used to calculate shipping rates for all Treehouse orders</li>
              <li>• All POD products will be shipped from this locker location</li>
              <li>• Make sure the locker is accessible and has sufficient capacity</li>
              <li>• Changes take effect immediately for new orders</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
