'use client';

import { useSchedulerStore } from '@/store/useSchedulerStore';

export default function FloatingActionButton() {
  const { openBookingModal } = useSchedulerStore();

  return (
    <button
      onClick={openBookingModal}
      className="fixed bottom-8 right-8 z-40 w-16 h-16 rounded-2xl bg-linear-to-br from-purple-500 to-pink-500 text-white shadow-2xl shadow-purple-500/40 hover:shadow-purple-500/60 transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center group"
    >
      <svg
        className="w-8 h-8 transition-transform duration-300 group-hover:rotate-90"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.5}
          d="M12 4v16m8-8H4"
        />
      </svg>
      
      {/* Pulse animation */}
      <span className="absolute inset-0 rounded-2xl bg-linear-to-br from-purple-500 to-pink-500 animate-ping opacity-20" />
    </button>
  );
}
