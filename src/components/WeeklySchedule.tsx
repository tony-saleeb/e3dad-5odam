"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBookings } from "@/hooks/useBookings";
import { useSettings } from "@/hooks/useSettings";
import { useSchedulerStore } from "@/store/useSchedulerStore";
import { getChurchColor } from "@/data/initialData";
import { format, startOfWeek, addDays, subDays, isToday, isBefore, isAfter, startOfDay } from "date-fns";
import { ar } from "date-fns/locale";

const dayNames = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
const dayNamesFull = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export default function WeeklySchedule() {
  const { user, isAdmin, canSeePending, canCreateBooking } = useAuth();
  const { bookings, loading: bookingsLoading, hasUserAlreadyBooked } = useBookings();
  const { settings, loading: settingsLoading } = useSettings();
  
  const { timePeriods, bookingRange } = settings;
  const { startMonth, endMonth, allowedDays } = bookingRange;

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

  const year = currentMonth.getFullYear();
  const startDate = useMemo(() => new Date(year, startMonth, 1), [year, startMonth]);
  const endDate = useMemo(() => new Date(year, endMonth + 1, 0), [year, endMonth]);

  const isDayInBounds = useCallback((day: Date) => {
    const dayStart = startOfDay(day);
    return dayStart >= startOfDay(startDate) && dayStart <= startOfDay(endDate);
  }, [startDate, endDate]);

  const weekStart = startOfWeek(currentMonth, { weekStartsOn: 0 });
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const visibleDays = useMemo(() => weekDays.filter(isDayInBounds), [weekDays, isDayInBounds]);

  const [mobileSelectedDayIndex, setMobileSelectedDayIndex] = useState(0);

  useEffect(() => {
    let active = true;
    const dayIndex = currentMonth.getDay();
    Promise.resolve().then(() => {
      if (!active) return;
      if (isDayInBounds(weekDays[dayIndex])) {
        setMobileSelectedDayIndex(dayIndex);
      } else {
        const firstValidIdx = weekDays.findIndex(day => isDayInBounds(day));
        if (firstValidIdx !== -1) {
          setMobileSelectedDayIndex(firstValidIdx);
        }
      }
    });
    return () => {
      active = false;
    };
  }, [currentMonth, weekDays, isDayInBounds]);

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
    if (!user || !canCreateBooking) return;
    
    // CHURCH ADAPTATION: Disable booking on non-allowed days
    if (!allowedDays.includes(date.getDay())) return;
    
    setSelectedDate(format(date, "yyyy-MM-dd"));
    if (startTime) setSelectedStartTime(startTime);
    if (endTime) setSelectedEndTime(endTime);
    openBookingModal();
  };

  const canGoPrevWeek = useMemo(() => {
    const prevWeekEnd = subDays(weekStart, 1);
    return startOfDay(prevWeekEnd) >= startOfDay(startDate);
  }, [weekStart, startDate]);

  const canGoNextWeek = useMemo(() => {
    const nextWeekStart = addDays(weekStart, 7);
    return startOfDay(nextWeekStart) <= startOfDay(endDate);
  }, [weekStart, endDate]);

  const goToPrevWeek = () => {
    if (!canGoPrevWeek) return;
    setCurrentMonth(subDays(currentMonth, 7));
  };

  const goToNextWeek = () => {
    if (!canGoNextWeek) return;
    setCurrentMonth(addDays(currentMonth, 7));
  };

  const goToPrevDay = () => {
    setMobileSelectedDayIndex((prev) => {
      let curr = prev;
      for (let i = 0; i < 7; i++) {
        curr = curr === 0 ? 6 : curr - 1;
        if (isDayInBounds(weekDays[curr])) {
          return curr;
        }
      }
      return prev;
    });
  };

  const goToNextDay = () => {
    setMobileSelectedDayIndex((prev) => {
      let curr = prev;
      for (let i = 0; i < 7; i++) {
        curr = curr === 6 ? 0 : curr + 1;
        if (isDayInBounds(weekDays[curr])) {
          return curr;
        }
      }
      return prev;
    });
  };

  const goToToday = () => {
    const today = new Date();
    let targetDate = today;
    if (isBefore(today, startDate)) {
      targetDate = startDate;
    } else if (isAfter(today, endDate)) {
      targetDate = endDate;
    }
    setCurrentMonth(targetDate);
    setSelectedDate(format(targetDate, "yyyy-MM-dd"));
    setMobileSelectedDayIndex(targetDate.getDay());
  };

  const headerDateRangeText = useMemo(() => {
    if (visibleDays.length === 0) return "";
    const first = visibleDays[0];
    const last = visibleDays[visibleDays.length - 1];
    
    if (first.getFullYear() !== last.getFullYear()) {
      return `${format(first, "d MMM yyyy", { locale: ar })} - ${format(last, "d MMM yyyy", { locale: ar })}`;
    }
    if (first.getMonth() !== last.getMonth()) {
      return `${format(first, "d MMM", { locale: ar })} - ${format(last, "d MMM yyyy", { locale: ar })}`;
    }
    return `${format(first, "d", { locale: ar })} - ${format(last, "d MMM yyyy", { locale: ar })}`;
  }, [visibleDays]);

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

  const mobileSelectedDay = weekDays[mobileSelectedDayIndex] || visibleDays[0] || currentMonth;
  const mobileBookings = getBookingsForDay(mobileSelectedDay);
  const isMobileToday = isToday(mobileSelectedDay);

  return (
    <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* ===== MOBILE VIEW ===== */}
      <div className="lg:hidden" dir="rtl">
        {/* Mobile Header */}
        <div className="px-3 sm:px-4 py-3 sm:py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-800">الجدول الأسبوعي</h2>
              <p className="text-[10px] sm:text-xs text-gray-400">
                <span dir="ltr">{headerDateRangeText}</span>
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={goToNextWeek} 
                disabled={!canGoNextWeek}
                aria-label="الأسبوع التالي"
                className={`p-1.5 rounded-lg transition-all ${
                  !canGoNextWeek ? "opacity-20 cursor-not-allowed text-gray-300" : "hover:bg-gray-100 active:bg-gray-200 text-gray-500"
                }`}
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
              <button onClick={goToToday} className="px-2.5 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-lg active:bg-emerald-100 transition-all">اليوم</button>
              <button 
                onClick={goToPrevWeek} 
                disabled={!canGoPrevWeek}
                aria-label="الأسبوع السابق"
                className={`p-1.5 rounded-lg transition-all ${
                  !canGoPrevWeek ? "opacity-20 cursor-not-allowed text-gray-300" : "hover:bg-gray-100 active:bg-gray-200 text-gray-500"
                }`}
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
            </div>
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
            {visibleDays.map((day) => {
              const isSelected = day.getDay() === mobileSelectedDayIndex;
              const isDayToday = isToday(day);
              const isAllowed = allowedDays.includes(day.getDay());
              const dayHasBooking = getBookingsForDay(day).length > 0;
              
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setMobileSelectedDayIndex(day.getDay())}
                  className={`flex-1 min-w-10 py-2 px-0.5 rounded-xl text-center transition-all active:scale-95 ${
                    isSelected ? "bg-slate-800 text-white shadow-lg scale-105" : isDayToday ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-50 text-gray-600"
                  } ${isAllowed ? '' : 'opacity-30'}`}
                >
                  <p className="text-[9px] sm:text-[10px] font-medium opacity-80">{dayNames[day.getDay()]}</p>
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
              <p className={`text-base font-bold ${isMobileToday ? "text-emerald-700" : "text-gray-800"}`}>{dayNamesFull[mobileSelectedDay.getDay()]}</p>
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
                    <p dir="ltr" className={`text-xs mt-0.5 text-right ${booking ? 'text-white/80' : 'text-gray-500'}`}>{period.startTime} – {period.endTime}</p>
                    
                    {/* CHURCH ADAPTATION: Display booking details on slot */}
                    {booking && (
                      <div className="mt-2 space-y-0.5">
                        <p className="text-sm font-black text-white leading-normal pb-0.5 truncate">{booking.churchName}</p>
                        <p className="text-xs text-white/80 leading-normal pb-0.5 truncate">المشروع: {booking.title}</p>
                      </div>
                    )}
                  </div>
                  
                  {!booking && user && canCreateBooking && isAllowed && !userAlreadyBooked && (
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
              <button 
                onClick={goToNextWeek} 
                disabled={!canGoNextWeek}
                aria-label="الأسبوع التالي"
                className={`p-2 rounded-xl bg-white shadow-sm border border-slate-100 text-slate-500 transition-all ${
                  !canGoNextWeek ? "opacity-30 cursor-not-allowed text-gray-300" : "hover:text-slate-700 hover:shadow"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
              </button>
              <button 
                onClick={goToPrevWeek} 
                disabled={!canGoPrevWeek}
                aria-label="الأسبوع السابق"
                className={`p-2 rounded-xl bg-white shadow-sm border border-slate-100 text-slate-500 transition-all ${
                  !canGoPrevWeek ? "opacity-30 cursor-not-allowed text-gray-300" : "hover:text-slate-700 hover:shadow"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
              </button>
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">الجدول الأسبوعي</h2>
              <p className="text-sm font-medium text-slate-400">
                <span dir="ltr">{headerDateRangeText}</span>
              </p>
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
                <span dir="ltr" className="inline-block text-xs font-semibold text-emerald-600 mt-1 bg-emerald-50 py-1 px-3 rounded-full">{p.startTime} - {p.endTime}</span>
              </div>
            ))}
          </div>

          {/* Day Rows */}
          <div className="flex flex-col gap-3">
            {visibleDays.map((day) => {
              const isAllowed = allowedDays.includes(day.getDay());
              const dayBookings = getBookingsForDay(day);
              return (
                <div key={day.toISOString()} className={`flex gap-4 items-center p-2 rounded-2xl transition-all ${isToday(day) ? 'bg-emerald-500/4 border border-emerald-200/50 shadow-md shadow-emerald-500/2' : 'bg-transparent'} ${!isAllowed ? 'opacity-40' : ''}`}>
                  <div className={`w-24 p-4 rounded-xl text-center shrink-0 flex flex-col justify-center transition-all ${isToday(day) ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 font-bold scale-105' : 'bg-white border border-slate-100 shadow-sm'}`}>
                    <p className={`text-xs font-black ${isToday(day) ? 'text-emerald-100' : 'text-slate-400'}`}>{dayNames[day.getDay()]}</p>
                    <p className="text-2xl font-black mt-0.5">{format(day, "d")}</p>
                  </div>
                  
                  {timePeriods.map((period) => {
                    const booking = dayBookings.find(b => b.startTime === period.startTime);
                    return (
                      <div key={period.id} className="flex-1 relative flex items-center justify-center min-h-27.5">
                        {booking ? (
                          <div 
                            onClick={() => openEventModal(booking)}
                            className={`absolute inset-0 p-4 rounded-2xl ${getChurchColor(booking.churchName).gradient} text-white shadow-lg hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02] transition-all cursor-pointer flex flex-col justify-center border ${getChurchColor(booking.churchName).border} text-right`}
                          >
                            <p className="font-black text-white text-base tracking-tight leading-snug pb-0.5">{booking.churchName}</p>
                            <p className="mt-1.5 text-xs text-white/90 font-medium pb-0.5"><strong className="text-white opacity-100 font-bold">المشروع:</strong> {booking.title}</p>
                          </div>
                        ) : isAllowed && user && canCreateBooking && !userAlreadyBooked ? (
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
