'use client';

import { useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { Info } from 'lucide-react';

interface DispensaryCommissionSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

/**
 * Commission Slider Component
 * 
 * Allows selecting dispensary commission rate from vendor sales:
 * - 5% to 100%: Increments of 5%
 * - 100% to 1000%: Increments of 10%
 * 
 * Max cap: 1000% (dispensary gets 10x the vendor's sale price)
 */
export function DispensaryCommissionSlider({
  value,
  onChange,
  disabled = false
}: DispensaryCommissionSliderProps) {
  // Internal slider value (0-100 for smooth UI)
  const [sliderValue, setSliderValue] = useState(0);

  // Convert percentage to slider position
  useEffect(() => {
    const position = percentageToSliderPosition(value);
    setSliderValue(position);
  }, [value]);

  // Handle slider change
  const handleSliderChange = (newValue: number[]) => {
    const position = newValue[0];
    setSliderValue(position);
    const percentage = sliderPositionToPercentage(position);
    onChange(percentage);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-gray-900">
            Dispensary Commission Rate
          </label>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-black text-blue-600">
              {value}%
            </span>
          </div>
        </div>

        <Slider
          value={[sliderValue]}
          onValueChange={handleSliderChange}
          max={100}
          step={1}
          disabled={disabled}
          className="w-full"
        />

        <div className="flex justify-between text-xs text-gray-600 font-medium">
          <span>5%</span>
          <span>100%</span>
          <span>1000%</span>
        </div>
      </div>

      {/* Visual Breakdown */}
      <Card className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
        <div className="space-y-3">
          <p className="text-sm font-bold text-blue-900">
            💡 Commission Breakdown Example
          </p>

          {/* Example Calculation */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Vendor Sale:</span>
              <span className="font-bold text-gray-900">R1,000</span>
            </div>

            <div className="h-px bg-blue-300"></div>

            <div className="flex justify-between items-center text-blue-700">
              <span>Dispensary Commission ({value}%):</span>
              <span className="font-black text-lg">
                R{((1000 * value) / 100).toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between items-center text-green-700">
              <span>Vendor Receives ({100 - (value > 100 ? 100 : value)}%):</span>
              <span className="font-black text-lg">
                R{value > 100 ? '0.00' : ((1000 * (100 - value)) / 100).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Warning for high commission */}
          {value > 50 && (
            <div className="flex items-start gap-2 p-3 bg-orange-100 rounded-lg border border-orange-300">
              <Info className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-orange-900">
                {value > 100 ? (
                  <p>
                    <strong>⚠️ Commission over 100%:</strong> You're taking more than the sale price.
                    Vendor will receive R0 and you profit R{((1000 * (value - 100)) / 100).toFixed(2)} extra per R1,000 sale.
                  </p>
                ) : (
                  <p>
                    <strong>High commission rate:</strong> Vendor receives only {100 - value}% of their sales.
                    Ensure this is agreed upon.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Info box */}
          <div className="flex items-start gap-2 p-3 bg-blue-100 rounded-lg border border-blue-300">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-900 leading-relaxed">
              This commission is automatically deducted when the vendor requests a payout.
              The dispensary keeps this percentage from all vendor sales.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

/**
 * Convert slider position (0-100) to percentage (5-1000)
 * 
 * Mapping:
 * - Position 0-50: 5% to 100% (steps of 5)
 * - Position 50-100: 100% to 1000% (steps of 10)
 */
function sliderPositionToPercentage(position: number): number {
  if (position <= 50) {
    // 0-50 maps to 5-100 (19 steps of 5, + starting 5)
    // Each unit = 5/2.5 = 2% increase
    return Math.round((position * 2) + 5);
  } else {
    // 51-100 maps to 100-1000 (50 steps, each = 18%)
    const above50 = position - 50;
    return Math.round(100 + (above50 * 18));
  }
}

/**
 * Convert percentage (5-1000) to slider position (0-100)
 */
function percentageToSliderPosition(percentage: number): number {
  if (percentage <= 100) {
    // 5-100% maps to position 0-50
    return Math.round((percentage - 5) / 2);
  } else {
    // 100-1000% maps to position 50-100
    return Math.round(50 + ((percentage - 100) / 18));
  }
}
