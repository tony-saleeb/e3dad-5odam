'use client';

import { useState, useMemo } from 'react';

interface UnifiedTimeSelectorProps {
  startTime: string;
  endTime: string;
  onStartChange: (val: string) => void;
  onEndChange: (val: string) => void;
  errorStart?: string;
  errorEnd?: string;
}

export default function UnifiedTimeSelector({ 
  startTime, 
  endTime, 
  onStartChange, 
  onEndChange,
  errorStart,
  errorEnd 
}: UnifiedTimeSelectorProps) {
  
  const [activeField, setActiveField] = useState<'start' | 'end'>('start');
  const [mode, setMode] = useState<'hours' | 'minutes'>('hours');

  // Parse current active time
  const activeValue = activeField === 'start' ? startTime : endTime;
  
  const timeState = useMemo(() => {
    if (!activeValue) return { hour: 12, minute: 0, period: 'AM' };
    const [h, m] = activeValue.split(':');
    let hour = parseInt(h, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;
    return {
      hour: hour,
      minute: parseInt(m, 10),
      period
    };
  }, [activeValue]);

  const updateTime = (updates: Partial<typeof timeState>) => {
    const newState = { ...timeState, ...updates };
    const { hour, minute, period } = newState;
    
    // Convert to 24h string
    let h24 = hour;
    if (period === 'PM' && h24 !== 12) h24 += 12;
    if (period === 'AM' && h24 === 12) h24 = 0;
    
    const hStr = h24.toString().padStart(2, '0');
    const mStr = minute.toString().padStart(2, '0');
    
    // Update the correct parent state
    const newVal = `${hStr}:${mStr}:00`;
    if (activeField === 'start') onStartChange(newVal);
    else onEndChange(newVal);
  };

  // Clock Layout Config
  const radius = 80;
  const center = 100; // 200x200
  
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
  if (mode === 'hours') handAngle = (timeState.hour % 12) * 30;
  else handAngle = timeState.minute * 6;

  const handRad = (handAngle - 90) * (Math.PI / 180);
  const handX = center + radius * Math.cos(handRad);
  const handY = center + radius * Math.sin(handRad);

  // Helper to render digital display for a field
  const renderDigitalDisplay = (field: 'start' | 'end', label: string, val: string, err?: string) => {
    const isActive = activeField === field;
    
    // Parse for display
    let display = { h: '12', m: '00', p: 'AM' };
    if (val) {
        const [hh, mm] = val.split(':');
        let hInt = parseInt(hh, 10);
        const p = hInt >= 12 ? 'PM' : 'AM';
        if (hInt > 12) hInt -= 12;
        if (hInt === 0) hInt = 12;
        display = {
            h: hInt.toString().padStart(2, '0'),
            m: mm,
            p
        };
    }

    return (
      <div 
        onClick={() => { setActiveField(field); setMode('hours'); }}
        className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all ${
            isActive 
            ? 'border-emerald-500 bg-emerald-50 shadow-md' 
            : 'border-gray-100 bg-white hover:border-emerald-200'
        } ${err ? 'border-red-300 bg-red-50' : ''}`}
      >
        <div className="text-xs text-gray-500 mb-1">{label}</div>
        <div className="flex items-end gap-1" dir="ltr">
             <span className={`text-2xl font-bold ${isActive ? 'text-gray-800' : 'text-gray-600'}`}>
                {display.h}:{display.m}
             </span>
             <span className={`text-xs font-bold mb-1 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`}>
                {display.p}
             </span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Top Section: Two Active Field Selectors */}
      <div className="grid grid-cols-2 gap-4">
        {renderDigitalDisplay('start', 'وقت البدء', startTime, errorStart)}
        {renderDigitalDisplay('end', 'وقت الانتهاء', endTime, errorEnd)}
      </div>

      {/* Shared Control Area */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          
          {/* Active Field Digital Editor (Big Numbers) */}
          <div className="bg-emerald-50/30 p-4 flex items-center justify-center gap-6 border-b border-gray-100">
             
             {/* Big Time */}
             <div className="flex items-end gap-1" dir="ltr">
                <button
                onClick={() => setMode('hours')}
                className={`text-5xl font-bold transition-colors ${
                    mode === 'hours' ? 'text-emerald-600' : 'text-gray-300'
                }`}
                >
                {timeState.hour.toString().padStart(2, '0')}
                </button>
                <span className="text-5xl font-bold text-gray-300 mb-2">:</span>
                <button
                onClick={() => setMode('minutes')}
                className={`text-5xl font-bold transition-colors ${
                    mode === 'minutes' ? 'text-emerald-600' : 'text-gray-300'
                }`}
                >
                {timeState.minute.toString().padStart(2, '0')}
                </button>
            </div>

            {/* AM/PM Switcher (Vertical) */}
            <div className="flex flex-col gap-2">
                <button
                onClick={() => updateTime({ period: 'AM' })}
                className={`px-3 py-1 rounded-md text-sm font-bold border transition-all ${
                    timeState.period === 'AM' 
                    ? 'bg-emerald-500 text-white border-emerald-600' 
                    : 'text-gray-400 border-gray-200 hover:bg-gray-50'
                }`}
                >
                AM
                </button>
                <button
                onClick={() => updateTime({ period: 'PM' })}
                className={`px-3 py-1 rounded-md text-sm font-bold border transition-all ${
                    timeState.period === 'PM' 
                    ? 'bg-emerald-500 text-white border-emerald-600' 
                    : 'text-gray-400 border-gray-200 hover:bg-gray-50'
                }`}
                >
                PM
                </button>
            </div>
          </div>

          {/* Clock Face */}
          <div className="relative h-55 bg-white flex items-center justify-center">
             <div className="relative w-45 h-45">
                <div className="absolute inset-0 rounded-full bg-gray-50 border border-gray-100" />
                <div className="absolute left-22 top-22 w-1 h-1 bg-emerald-500 rounded-full z-10" />
                
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                    <line x1={center} y1={center} x2={handX} y2={handY} stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
                    <circle cx={handX} cy={handY} r="14" fill="#10b981" />
                </svg>

                <div className="absolute inset-0 z-10">
                {mode === 'hours' && hourNumbers.map((num) => {
                    const pos = getPosition(num, 12);
                    return (
                    <button
                        key={num}
                        onClick={() => { updateTime({ hour: num }); setMode('minutes'); }}
                        style={{ left: pos.x - 14, top: pos.y - 14 }} // 180px box -> radius 80 -> ok (20 margin)
                        // Adjust center: 180 box -> center is 90.
                        // Wait, my center var is 100. Need to match container 180 or 200.
                        // I will set container w-[200px] h-[200px] and use center 100.
                        className={`absolute w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
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
                        onClick={() => { updateTime({ minute: num }); }}
                        style={{ left: pos.x - 14, top: pos.y - 14 }}
                        className={`absolute w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
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
    </div>
  );
}
