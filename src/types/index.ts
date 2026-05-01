// TypeScript interfaces for Church Facility Scheduler

export type BookingStatus = 'pending' | 'approved' | 'rejected';

// User roles: admin (مسؤول), servant (أمين الخدمة), user (مستخدم)
export type UserRole = 'admin' | 'servant' | 'user';

export interface Service {
  id: string;
  name: string;
  color: string;
  gradient: string;
  description: string;
}

export interface Room {
  id: string;
  name: string;
  capacity?: number;
  requiresCustomLocation?: boolean; // For "خارج الكنيسة"
}

export interface Servant {
  id: string;
  email: string;
  name: string;
  serviceId: string; // The service they manage
  addedAt: string;
  addedBy: string; // Admin who added them
}

export interface Admin {
  id: string;
  email: string;
  name: string;
  addedAt: string;
  addedBy: string; // Admin who added them
}

// CHURCH ADAPTATION: New time period interface for the 3 fixed slots
export interface TimePeriod {
  id: string;
  label: string;
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
}

export interface TeamMember {
  name: string;
  id: string; // National ID or church ID
}

export interface AppSettings {
  timePeriods: TimePeriod[];
  bookingRange: {
    startMonth: number; // 0-indexed
    endMonth: number;   // 0-indexed
    allowedDays: number[]; // [0,1,2,3]
  };
}

export interface Booking {
  id: string;
  title: string; // CHURCH ADAPTATION: This becomes "Project Title"
  requesterName: string; // CHURCH ADAPTATION: This becomes "Group Leader Name"
  requesterEmail: string;
  serviceId: string;
  roomId: string;
  roomIds?: string[];
  customLocation?: string; // For "خارج الكنيسة" - custom place text
  date: string; // ISO date string (YYYY-MM-DD)
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  status: BookingStatus;
  rejectionReason?: string;
  notes?: string;
  createdAt: string;
  // CHURCH ADAPTATION: New fields for church booking
  churchName?: string;
  teamName?: string;
  ageGroup?: string;
  teammates?: string[]; // Legacy: Array of teammate names
  teamMembers?: TeamMember[]; // New: Array of {name, id} objects
}

export interface DayBookings {
  date: string;
  bookings: Booking[];
}

// User profile with role
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  serviceId?: string; // For servants - their assigned service
}
