'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Clock } from 'lucide-react';

interface TimePickerProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function TimePicker({ value, onChange, disabled }: TimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [hour, setHour] = React.useState(12);
  const [minute, setMinute] = React.useState(0);
  const [period, setPeriod] = React.useState<'AM' | 'PM'>('AM');

  React.useEffect(() => {
    if (value) {
      const [h, m] = value.split(':').map(Number);
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      setHour(hour12);
      setMinute(m);
      setPeriod(h >= 12 ? 'PM' : 'AM');
    }
  }, [value]);

  const handleHourClick = (newHour: number) => {
    setHour(newHour);
    updateTime(newHour, minute, period);
  };

  const handleMinuteClick = (newMinute: number) => {
    setMinute(newMinute);
    updateTime(hour, newMinute, period);
  };

  const togglePeriod = () => {
    const newPeriod = period === 'AM' ? 'PM' : 'AM';
    setPeriod(newPeriod);
    updateTime(hour, minute, newPeriod);
  };

  const updateTime = (h: number, m: number, p: 'AM' | 'PM') => {
    let hour24 = h;
    if (p === 'PM' && h !== 12) hour24 = h + 12;
    if (p === 'AM' && h === 12) hour24 = 0;
    
    const timeString = `${String(hour24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    onChange(timeString);
  };

  const getClockHandStyle = (value: number, max: number, isHour: boolean) => {
    const angle = ((value / max) * 360) - 90;
    const length = isHour ? 35 : 45;
    return {
      transform: `rotate(${angle}deg)`,
      width: `${length}%`,
    };
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className="w-full justify-start text-left font-normal text-[#5D4E37]"
        >
          <Clock className="mr-2 h-4 w-4" />
          {value ? value : 'Select time'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-4 space-y-4">
          {/* Analog Clock */}
          <div className="flex justify-center">
            <div className="relative w-64 h-64 rounded-full border-4 border-[#006B3E] bg-white shadow-lg">
              {/* Hour markers */}
              {[...Array(12)].map((_, i) => {
                const angle = (i * 30) - 90;
                const x = 50 + 40 * Math.cos(angle * Math.PI / 180);
                const y = 50 + 40 * Math.sin(angle * Math.PI / 180);
                const hourNum = i === 0 ? 12 : i;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleHourClick(hourNum)}
                    className={`absolute w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                      hour === hourNum
                        ? 'bg-[#006B3E] text-white'
                        : 'bg-gray-100 text-[#5D4E37] hover:bg-gray-200'
                    }`}
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    {hourNum}
                  </button>
                );
              })}

              {/* Center dot */}
              <div className="absolute w-3 h-3 bg-[#006B3E] rounded-full left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10" />

              {/* Hour hand */}
              <div
                className="absolute h-1 bg-[#006B3E] rounded-full origin-left left-1/2 top-1/2 transform -translate-y-1/2"
                style={getClockHandStyle(hour, 12, true)}
              />

              {/* Minute hand */}
              <div
                className="absolute h-0.5 bg-[#5D4E37] rounded-full origin-left left-1/2 top-1/2 transform -translate-y-1/2"
                style={getClockHandStyle(minute, 60, false)}
              />
            </div>
          </div>

          {/* Minute selector */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#5D4E37]">Minutes</label>
            <div className="grid grid-cols-6 gap-1">
              {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleMinuteClick(m)}
                  className={`px-2 py-1 rounded text-sm font-medium transition-colors ${
                    minute === m
                      ? 'bg-[#006B3E] text-white'
                      : 'bg-gray-100 text-[#5D4E37] hover:bg-gray-200'
                  }`}
                >
                  :{String(m).padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>

          {/* AM/PM toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setPeriod('AM');
                updateTime(hour, minute, 'AM');
              }}
              className={`flex-1 py-2 rounded font-semibold transition-colors ${
                period === 'AM'
                  ? 'bg-[#006B3E] text-white'
                  : 'bg-gray-100 text-[#5D4E37] hover:bg-gray-200'
              }`}
            >
              AM
            </button>
            <button
              type="button"
              onClick={() => {
                setPeriod('PM');
                updateTime(hour, minute, 'PM');
              }}
              className={`flex-1 py-2 rounded font-semibold transition-colors ${
                period === 'PM'
                  ? 'bg-[#006B3E] text-white'
                  : 'bg-gray-100 text-[#5D4E37] hover:bg-gray-200'
              }`}
            >
              PM
            </button>
          </div>

          <Button
            onClick={() => setIsOpen(false)}
            className="w-full bg-[#006B3E] hover:bg-[#005030] text-white"
          >
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
