"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBookings } from "@/hooks/useBookings";
import { useSettings } from "@/hooks/useSettings";
import { useSchedulerStore } from "@/store/useSchedulerStore";
import { services, rooms, getChurchColor } from "@/data/initialData";
import { isSupabaseConfigured } from "@/lib/supabase";
import { format, startOfWeek, addDays, subDays, isToday, isBefore, isAfter, startOfDay } from "date-fns";
import { ar } from "date-fns/locale";

const dayNames = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
const dayNamesFull = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export default function WeeklySchedule() {
  const { user, isAdmin, canSeePending } = useAuth();
  const { bookings, loading: bookingsLoading, hasUserAlreadyBooked } = useBookings();
  const { settings, loading: settingsLoading } = useSettings();
  
  const { timePeriods, bookingRange } = settings;
  const { allowedDays } = bookingRange;

  const userAlreadyBooked = !isAdmin && user?.email && hasUserAlreadyBooked(user.email);
  
  const loading = bookingsLoading || settingsLoading;
  const {
    currentMonth,
    setCurrentMonth,
    setSelectedDate,
    openBookingModal,
    openEventModal,
    setSelectedStartTime,
    setSelectedEndTime,
  } = useSchedulerStore();

  const [mobileSelectedDayIndex, setMobileSelectedDayIndex] = useState(() => {
    const today = new Date();
    return today.getDay();
  });

  const weekStart = startOfWeek(currentMonth, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    const dayIndex = currentMonth.getDay();
    setMobileSelectedDayIndex(dayIndex);
  }, [currentMonth]);

  const getBookingsForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return bookings.filter((b) => {
      if (b.date !== dateStr) return false;
      if (b.status === "rejected") return false;
      if (b.status === "pending" && !canSeePending) return false;
      return true;
    });
  };

  const handleDayClick = (date: Date, startTime?: string, endTime?: string) => {
    if (!user) return;
    
    // CHURCH ADAPTATION: Disable booking on non-allowed days
    if (!allowedDays.includes(date.getDay())) return;
    
    setSelectedDate(format(date, "yyyy-MM-dd"));
    if (startTime) setSelectedStartTime(startTime);
    if (endTime) setSelectedEndTime(endTime);
    openBookingModal();
  };

  const goToPrevWeek = () => setCurrentMonth(subDays(currentMonth, 7));
  const goToNextWeek = () => setCurrentMonth(addDays(currentMonth, 7));
  const goToPrevDay = () => setMobileSelectedDayIndex((prev) => (prev === 0 ? 6 : prev - 1));
  const goToNextDay = () => setMobileSelectedDayIndex((prev) => (prev === 6 ? 0 : prev + 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(format(today, "yyyy-MM-dd"));
    setMobileSelectedDayIndex(today.getDay());
  };

  if (loading) {
    return (
      <div className="flex-1 bg-white rounded-2xl shadow-sm border flex items-center justify-center min-h-100">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">جاري تحميل الجدول...</p>
        </div>
      </div>
    );
  }

  const mobileSelectedDay = weekDays[mobileSelectedDayIndex];
  const mobileBookings = getBookingsForDay(mobileSelectedDay);
  const isMobileToday = isToday(mobileSelectedDay);

  return (
    <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      
      {!isSupabaseConfigured && (
        <div className="bg-red-500 text-white font-bold text-center py-2 text-xs px-4 border-b border-red-600 animate-pulse" dir="rtl">
          ⚠️ تنبيه: قاعدة بيانات Supabase غير متصلة! يرجى إدخال الرابط (URL) والمفتاح (Anon Key) في ملف .env.local لحفظ الحجوزات بشكل حقيقي.
        </div>
      )}

      {/* ===== MOBILE VIEW ===== */}
      <div className="lg:hidden" dir="rtl">
        {/* Mobile Header */}
        <div className="px-3 sm:px-4 py-3 sm:py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-800">الجدول الأسبوعي</h2>
              <p className="text-[10px] sm:text-xs text-gray-400">
                {format(weekStart, "d MMM")} - {format(addDays(weekStart, 6), "d MMM yyyy")}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={goToNextWeek} className="p-1.5 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-all">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
              <button onClick={goToToday} className="px-2.5 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-lg active:bg-emerald-100 transition-all">اليوم</button>
              <button onClick={goToPrevWeek} className="p-1.5 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-all">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
            </div>
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
            {weekDays.map((day, index) => {
              const isSelected = index === mobileSelectedDayIndex;
              const isDayToday = isToday(day);
              const isAllowed = allowedDays.includes(day.getDay());
              const dayHasBooking = getBookingsForDay(day).length > 0;
              
              return (
                <button
                  key={index}
                  onClick={() => setMobileSelectedDayIndex(index)}
                  className={`flex-1 min-w-[40px] py-2 px-0.5 rounded-xl text-center transition-all active:scale-95 ${
                    isSelected ? "bg-slate-800 text-white shadow-lg scale-105" : isDayToday ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-50 text-gray-600"
                  } ${!isAllowed ? 'opacity-30' : ''}`}
                >
                  <p className="text-[9px] sm:text-[10px] font-medium opacity-80">{dayNames[index]}</p>
                  <p className="text-sm sm:text-base font-bold">{format(day, "d")}</p>
                  {dayHasBooking && !isSelected && (
                    <span className="block w-1 h-1 rounded-full bg-emerald-500 mx-auto mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Header */}
        <div className={`px-3 sm:px-4 py-2.5 flex items-center justify-between ${isMobileToday ? "bg-emerald-50" : "bg-gray-50"}`}>
          <div className="flex items-center gap-2">
            <button onClick={goToNextDay} className="p-1.5 hover:bg-white rounded-lg active:bg-gray-100 transition-all"><svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
            <div>
              <p className={`text-base font-bold ${isMobileToday ? "text-emerald-700" : "text-gray-800"}`}>{dayNamesFull[mobileSelectedDayIndex]}</p>
              <p className="text-xs text-gray-500">{format(mobileSelectedDay, "d MMMM yyyy", { locale: ar })}</p>
            </div>
            <button onClick={goToPrevDay} className="p-1.5 hover:bg-white rounded-lg active:bg-gray-100 transition-all"><svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
          </div>
        </div>

        {/* Events List */}
        <div className="p-3 sm:p-4 space-y-3 min-h-64">
          {/* CHURCH ADAPTATION: Showing the 3 periods in mobile view */}
          {timePeriods.map((period) => {
            const booking = mobileBookings.find(b => b.startTime === period.startTime);
            const isAllowed = allowedDays.includes(mobileSelectedDay.getDay());
            
            if (!isAllowed) return null;

            return (
              <div
                key={period.id}
                onClick={() => booking && openEventModal(booking)}
                className={`p-4 rounded-2xl border transition-all ${
                  booking 
                    ? `${getChurchColor(booking.churchName).gradient} text-white border-transparent shadow-md cursor-pointer active:scale-[0.98]` 
                    : "bg-gray-50/80 border-gray-100"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-bold text-sm ${booking ? 'text-white' : 'text-gray-800'}`}>{period.label}</h4>
                    <p className={`text-xs mt-0.5 ${booking ? 'text-white/80' : 'text-gray-500'}`}>{period.startTime} – {period.endTime}</p>
                    
                    {/* CHURCH ADAPTATION: Display booking details on slot */}
                    {booking && (
                      <div className="mt-2 space-y-0.5">
                        <p className="text-sm font-black text-white truncate">{booking.churchName}</p>
                        <p className="text-xs text-white/80 truncate">المشروع: {booking.title}</p>
                      </div>
                    )}
                  </div>
                  
                  {!booking && user && isAllowed && !userAlreadyBooked && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDate(format(mobileSelectedDay, "yyyy-MM-dd"));
                        setSelectedStartTime(period.startTime);
                        setSelectedEndTime(period.endTime);
                        openBookingModal();
                      }} 
                      className="px-4 py-2 bg-emerald-500 text-white text-xs rounded-xl shadow font-bold active:scale-95 transition-all shrink-0"
                    >
                      + حجز
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {!allowedDays.includes(mobileSelectedDay.getDay()) && (
            <p className="text-center text-gray-400 py-6 text-sm">هذا اليوم غير متاح للحجز</p>
          )}
        </div>
      </div>

      {/* ===== DESKTOP VIEW ===== */}
      <div className="hidden lg:block bg-slate-50/50 p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/40">
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-100" dir="rtl">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button onClick={goToNextWeek} className="p-2 rounded-xl bg-white shadow-sm border border-slate-100 text-slate-500 hover:text-slate-700 transition-all hover:shadow"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg></button>
              <button onClick={goToPrevWeek} className="p-2 rounded-xl bg-white shadow-sm border border-slate-100 text-slate-500 hover:text-slate-700 transition-all hover:shadow"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg></button>
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">الجدول الأسبوعي</h2>
              <p className="text-sm font-medium text-slate-400">{format(weekStart, "d MMM")} - {format(addDays(weekStart, 6), "d MMM yyyy")}</p>
            </div>
          </div>
          <button onClick={goToToday} className="px-4 py-2 text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 rounded-xl transition-all shadow-sm shadow-emerald-100/50 border border-emerald-100">اليوم</button>
        </div>

        {/* Schedule Grid */}
        <div className="relative overflow-x-auto" dir="rtl">
          {/* Header row with periods */}
          <div className="flex gap-4 mb-4 font-bold text-slate-700">
            <div className="w-24 p-3 text-center text-sm font-black text-slate-400 uppercase tracking-wider">اليوم</div>
            {timePeriods.map(p => (
              <div key={p.id} className="flex-1 p-4 text-center text-sm bg-white rounded-2xl shadow-sm border border-slate-100/80">
                <span className="block font-black text-slate-800 text-base">{p.label}</span>
                <span className="block text-xs font-semibold text-emerald-600 mt-1 bg-emerald-50 py-1 px-3 rounded-full inline-block">{p.startTime} - {p.endTime}</span>
              </div>
            ))}
          </div>

          {/* Day Rows */}
          <div className="flex flex-col gap-3">
            {weekDays.map((day, idx) => {
              const isAllowed = allowedDays.includes(day.getDay());
              const dayBookings = getBookingsForDay(day);
              return (
                <div key={idx} className={`flex gap-4 items-center p-2 rounded-2xl transition-all ${isToday(day) ? 'bg-emerald-500/[0.04] border border-emerald-200/50 shadow-md shadow-emerald-500/[0.02]' : 'bg-transparent'} ${!isAllowed ? 'opacity-40' : ''}`}>
                  <div className={`w-24 p-4 rounded-xl text-center shrink-0 flex flex-col justify-center transition-all ${isToday(day) ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 font-bold scale-105' : 'bg-white border border-slate-100 shadow-sm'}`}>
                    <p className={`text-xs font-black ${isToday(day) ? 'text-emerald-100' : 'text-slate-400'}`}>{dayNames[idx]}</p>
                    <p className="text-2xl font-black mt-0.5">{format(day, "d")}</p>
                  </div>
                  
                  {timePeriods.map((period) => {
                    const booking = dayBookings.find(b => b.startTime === period.startTime);
                    return (
                      <div key={period.id} className="flex-1 relative flex items-center justify-center min-h-[110px]">
                        {booking ? (
                          <div 
                            onClick={() => openEventModal(booking)}
                            className={`absolute inset-0 p-4 rounded-2xl ${getChurchColor(booking.churchName).gradient} text-white shadow-lg hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02] transition-all cursor-pointer flex flex-col justify-center border ${getChurchColor(booking.churchName).border} text-right`}
                          >
                            <p className="font-black text-white text-base tracking-tight leading-snug">{booking.churchName}</p>
                            <p className="mt-1.5 text-xs text-white/90 font-medium"><strong className="text-white opacity-100 font-bold">المشروع:</strong> {booking.title}</p>
                          </div>
                        ) : isAllowed && user && !userAlreadyBooked ? (
                          <button 
                            onClick={() => handleDayClick(day, period.startTime, period.endTime)}
                            className="absolute inset-0 bg-white hover:bg-slate-50 rounded-2xl border border-dashed border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col items-center justify-center gap-2 group shadow-sm"
                          >
                            <span className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-emerald-50 text-slate-400 group-hover:text-emerald-600 flex items-center justify-center text-xl font-light transition-all">+</span>
                            <span className="text-xs font-bold text-slate-400 group-hover:text-emerald-600 transition-all">حجز {period.label}</span>
                          </button>
                        ) : (
                          <div className="absolute inset-0 bg-slate-100/50 rounded-2xl border border-dashed border-slate-100"></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
