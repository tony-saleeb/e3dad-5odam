'use client';

import { useState, useMemo } from 'react';

interface TimeSelectorProps {
  label: string;
  value: string; // HH:mm:ss
  onChange: (value: string) => void;
  error?: string;
}

export default function TimeSelector({ label, value, onChange, error }: TimeSelectorProps) {
  // Mode: selecting 'hours' or 'minutes'
  const [mode, setMode] = useState<'hours' | 'minutes'>('hours');

  // Parse value
  const timeState = useMemo(() => {
    if (!value) return { hour: 12, minute: 0, second: 0, period: 'AM' };
    const [h, m] = value.split(':');
    let hour = parseInt(h, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;
    return {
      hour: hour,
      minute: parseInt(m, 10),
      period
    };
  }, [value]);

  const updateTime = (updates: Partial<typeof timeState>) => {
    const newState = { ...timeState, ...updates };
    const { hour, minute, period } = newState;
    
    // Convert to 24h string
    let h24 = hour;
    if (period === 'PM' && h24 !== 12) h24 += 12;
    if (period === 'AM' && h24 === 12) h24 = 0;
    
    const hStr = h24.toString().padStart(2, '0');
    const mStr = minute.toString().padStart(2, '0');
    
    onChange(`${hStr}:${mStr}:00`);
  };

  // Clock Layout
  const radius = 80;
  const center = 100; // viewBox 200x200
  
  // Generate numbers
  const hourNumbers = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minuteNumbers = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const getPosition = (index: number, total: number) => {
    const angle = (index * (360 / total) - 90) * (Math.PI / 180);
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle)
    };
  };

  // Hand position
  let handAngle = 0;
  if (mode === 'hours') {
    handAngle = (timeState.hour % 12) * 30;
  } else {
    handAngle = timeState.minute * 6;
  }

  // Calculate hand endpoint
  const handRad = (handAngle - 90) * (Math.PI / 180);
  const handX = center + radius * Math.cos(handRad);
  const handY = center + radius * Math.sin(handRad);

  return (
    <div className="flex flex-col gap-2">
      <label className="block text-sm font-semibold text-gray-700">{label}</label>
      
      <div className={`bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm ${error ? 'ring-2 ring-red-400' : ''}`}>
        
        {/* Digital Display Area */}
        <div className="bg-emerald-50/50 p-4 flex items-center justify-center gap-4 border-b border-emerald-100">
          <div className="flex items-end gap-1" dir="ltr">
            {/* Hour */}
            <button
              onClick={() => setMode('hours')}
              className={`text-5xl font-bold transition-colors ${
                mode === 'hours' ? 'text-emerald-600' : 'text-gray-400'
              }`}
            >
              {timeState.hour.toString().padStart(2, '0')}
            </button>
            <span className="text-5xl font-bold text-gray-300 mb-2">:</span>
            {/* Minute */}
            <button
              onClick={() => setMode('minutes')}
              className={`text-5xl font-bold transition-colors ${
                mode === 'minutes' ? 'text-emerald-600' : 'text-gray-400'
              }`}
            >
              {timeState.minute.toString().padStart(2, '0')}
            </button>
          </div>

          {/* AM/PM Toggle */}
          <div className="flex flex-col gap-2 ml-4">
            <button
              onClick={() => updateTime({ period: 'AM' })}
              className={`px-3 py-1 rounded-md text-sm font-bold border transition-all ${
                timeState.period === 'AM' 
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                  : 'text-gray-400 border-gray-200 hover:bg-gray-50'
              }`}
            >
              AM
            </button>
            <button
              onClick={() => updateTime({ period: 'PM' })}
              className={`px-3 py-1 rounded-md text-sm font-bold border transition-all ${
                timeState.period === 'PM' 
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                  : 'text-gray-400 border-gray-200 hover:bg-gray-50'
              }`}
            >
              PM
            </button>
          </div>
        </div>

        {/* Clock Face Area */}
        <div className="p-4 bg-white flex justify-center relative">
          <div className="relative w-50 h-50">
            {/* Clock Circle Background */}
            <div className="absolute inset-0 rounded-full bg-gray-50 border border-gray-100" />
            
            {/* Center Dot */}
            <div className="absolute left-24.5 top-24.5 w-1 h-1 bg-emerald-500 rounded-full z-10" />

            {/* SVG Lines (Hand) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <line
                x1={center}
                y1={center}
                x2={handX}
                y2={handY}
                stroke="#10b981" // emerald-500
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx={handX} cy={handY} r="16" fill="#10b981" />
            </svg>

            {/* Numbers */}
            <div className="absolute inset-0 z-10">
              {mode === 'hours' && hourNumbers.map((num) => {
                const pos = getPosition(num, 12);
                return (
                  <button
                    key={num}
                    onClick={() => {
                      updateTime({ hour: num });
                      setMode('minutes');
                    }}
                    style={{
                      left: pos.x - 16,
                      top: pos.y - 16,
                    }}
                    className={`absolute w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                      timeState.hour === num ? 'text-white' : 'text-gray-500 hover:text-emerald-600'
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
              
              {mode === 'minutes' && minuteNumbers.map((num) => {
                 const idx = num / 5;
                 const posIdx = idx === 0 ? 12 : idx;
                 const pos = getPosition(posIdx, 12);
                 return (
                  <button
                    key={num}
                    onClick={() => {
                      updateTime({ minute: num });
                    }}
                    style={{
                      left: pos.x - 16,
                      top: pos.y - 16,
                    }}
                    className={`absolute w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                      timeState.minute === num ? 'text-white' : 'text-gray-500 hover:text-emerald-600'
                    }`}
                  >
                    {num.toString().padStart(2, '0')}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
