// Static data for Church Facility Scheduler
// Services and Rooms - these don't need to be in the database

import { TimePeriod } from '@/types';

export const churches = [
  'العذراء بالفجالة',
  'العذراء بحارة زويلة',
  'العذراء بحارة الروم',
  'العذراء بجاردن سيتى',
  'العذراء والأنبا موسى بالوكالة',
  'العذراء والأنبا بيشوى ش الجيش',
  'ماريوحنا - باب اللوق',
  'الملاك غبريال بحارة السقايين',
  'المرقسية بالأزبكية',
  'الشهيدة دميانة بالعدوية',
  'مارجرجس بالقللى'
];
export const churchColorMap: Record<string, { hex: string, bg: string, text: string, border: string, badge: string, gradient: string }> = {
  'العذراء بالفجالة': { 
    hex: '#EF4444', 
    bg: 'bg-red-500', 
    text: 'text-white', 
    border: 'border-red-600', 
    badge: 'bg-red-50 text-red-700',
    gradient: 'bg-gradient-to-r from-red-500 to-rose-500'
  },
  'العذراء بحارة زويلة': { 
    hex: '#F97316', 
    bg: 'bg-orange-500', 
    text: 'text-white', 
    border: 'border-orange-600', 
    badge: 'bg-orange-50 text-orange-700',
    gradient: 'bg-gradient-to-r from-orange-500 to-amber-500'
  },
  'العذراء بحارة الروم': { 
    hex: '#F59E0B', 
    bg: 'bg-amber-500', 
    text: 'text-white', 
    border: 'border-amber-600', 
    badge: 'bg-amber-50 text-amber-700',
    gradient: 'bg-gradient-to-r from-amber-500 to-yellow-500'
  },
  'العذراء بجاردن سيتى': { 
    hex: '#10B981', 
    bg: 'bg-emerald-500', 
    text: 'text-white', 
    border: 'border-emerald-600', 
    badge: 'bg-emerald-50 text-emerald-700',
    gradient: 'bg-gradient-to-r from-emerald-500 to-teal-500'
  },
  'العذراء والأنبا موسى بالوكالة': { 
    hex: '#14B8A6', 
    bg: 'bg-teal-500', 
    text: 'text-white', 
    border: 'border-teal-600', 
    badge: 'bg-teal-50 text-teal-700',
    gradient: 'bg-gradient-to-r from-teal-500 to-cyan-500'
  },
  'العذراء والأنبا بيشوى ش الجيش': { 
    hex: '#3B82F6', 
    bg: 'bg-blue-500', 
    text: 'text-white', 
    border: 'border-blue-600', 
    badge: 'bg-blue-50 text-blue-700',
    gradient: 'bg-gradient-to-r from-sky-500 to-blue-500'
  },
  'ماريوحنا - باب اللوق': { 
    hex: '#6366F1', 
    bg: 'bg-indigo-500', 
    text: 'text-white', 
    border: 'border-indigo-600', 
    badge: 'bg-indigo-50 text-indigo-700',
    gradient: 'bg-gradient-to-r from-indigo-500 to-violet-500'
  },
  'الملاك غبريال بحارة السقايين': { 
    hex: '#8B5CF6', 
    bg: 'bg-purple-500', 
    text: 'text-white', 
    border: 'border-purple-600', 
    badge: 'bg-purple-50 text-purple-700',
    gradient: 'bg-gradient-to-r from-violet-500 to-purple-500'
  },
  'المرقسية بالأزبكية': { 
    hex: '#EC4899', 
    bg: 'bg-pink-500', 
    text: 'text-white', 
    border: 'border-pink-600', 
    badge: 'bg-pink-50 text-pink-700',
    gradient: 'bg-gradient-to-r from-pink-500 to-rose-400'
  },
  'الشهيدة دميانة بالعدوية': { 
    hex: '#0F172A', 
    bg: 'bg-slate-800', 
    text: 'text-white', 
    border: 'border-slate-900', 
    badge: 'bg-slate-50 text-slate-700',
    gradient: 'bg-gradient-to-r from-slate-700 to-slate-900'
  },
  'مارجرجس بالقللى': { 
    hex: '#B45309', 
    bg: 'bg-yellow-700', 
    text: 'text-white', 
    border: 'border-yellow-800', 
    badge: 'bg-yellow-50 text-yellow-800',
    gradient: 'bg-gradient-to-r from-yellow-600 to-amber-700'
  }
};

export const getChurchColor = (churchName?: string) => {
  if (!churchName || !churchColorMap[churchName]) {
    return { 
      hex: '#059669',
      bg: 'bg-emerald-600', 
      text: 'text-white', 
      border: 'border-emerald-700', 
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      gradient: 'bg-gradient-to-br from-emerald-500 to-teal-600'
    };
  }
  return churchColorMap[churchName];
};
// CHURCH ADAPTATION: Fixed time periods for church project bookings
export const timePeriods: TimePeriod[] = [
  { id: 'period-1', label: 'الفترة الأولى', startTime: '6:00 PM', endTime: '7:30 PM' },
  { id: 'period-2', label: 'الفترة الثانية', startTime: '7:30 PM', endTime: '9:00 PM' },
  { id: 'period-3', label: 'الفترة الثالثة', startTime: '9:00 PM', endTime: '10:30 PM' },
];

// CHURCH ADAPTATION: Allowed days of week (0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday)
export const ALLOWED_DAYS = [0, 1, 2, 3]; // Sunday through Wednesday

// CHURCH ADAPTATION: Date range restriction
export const getDateRange = (startMonth = 6, endMonth = 8) => {
  const year = new Date().getFullYear();
  return {
    start: new Date(year, startMonth, 1),
    end: new Date(year, endMonth + 1, 0), // Last day of endMonth (handles 28/29/30/31 correctly)
  };
};
