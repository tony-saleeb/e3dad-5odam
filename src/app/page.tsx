'use client';

import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import WeeklySchedule from '@/components/WeeklySchedule';
import MiniCalendar from '@/components/MiniCalendar';
import UpcomingEvents from '@/components/UpcomingEvents';
import BookingModal from '@/components/BookingModal';
import AdminPanel from '@/components/AdminPanel';
import AdminDashboard from '@/components/AdminDashboard';
import EventModal from '@/components/EventModal';
import SignInPage from '@/components/SignInPage';
import { ToastContainer } from '@/components/Toast';
import { useSchedulerStore } from '@/store/useSchedulerStore';

export default function Home() {
  const { user, loading } = useAuth();
  const { isEventModalOpen, selectedEvent, closeEventModal } = useSchedulerStore();

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // Show sign-in page if not logged in
  if (!user) {
    return <SignInPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="max-w-400 mx-auto px-4 py-4 lg:px-6 lg:py-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Weekly Schedule - Main Area */}
          <div className="flex-1 min-w-0">
            <WeeklySchedule />
          </div>

          {/* Sidebar - Below on mobile, Right on desktop */}
          <div className="w-full lg:w-72 lg:shrink-0 space-y-4 lg:space-y-6">
            <MiniCalendar />
          </div>
        </div>
      </main>

      {/* Modals */}
      <BookingModal />
      <AdminPanel />
      <AdminDashboard />
      <EventModal 
        booking={selectedEvent}
        isOpen={isEventModalOpen}
        onClose={closeEventModal}
      />
      
      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
}

