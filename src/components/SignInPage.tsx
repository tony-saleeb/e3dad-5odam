'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

export default function SignInPage() {
  const { signInWithGoogle, loading } = useAuth();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="min-h-screen flex" dir="rtl">
      {/* Left Side - Church Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background Image */}
        <img 
          src="/church-logo.png" 
          alt="كنيسة السيدة العذراء مريم بالفجالة" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-emerald-900/90 via-emerald-800/50 to-transparent" />
        
        {/* Content Overlay */}
        <div className="relative z-10 flex flex-col justify-end p-12 text-white">
          <div className="space-y-4">
            <div className="w-16 h-1 bg-white/60 rounded-full" />
            <h2 className="text-4xl font-bold leading-tight">
              كنيسة السيدة العذراء مريم
            </h2>
            <p className="text-xl text-white/80 font-light">
              بالفجالة
            </p>
            <p className="text-white/60 text-sm mt-6 max-w-md">
              نظام حجز القاعات والخدمات الكنسية
            </p>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-8 right-8 w-32 h-32 border border-white/20 rounded-full" />
        <div className="absolute top-12 right-12 w-24 h-24 border border-white/10 rounded-full" />
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-linear-to-br from-slate-50 via-white to-emerald-50/30">
        {/* Subtle background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none lg:hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-100/40 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-100/30 rounded-full blur-3xl" />
        </div>

        <div className="relative w-full max-w-md">
          {/* Mobile Logo - Only visible on small screens */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg">
              <img 
                src="/church-logo.png" 
                alt="كنيسة السيدة العذراء مريم بالفجالة" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Welcome Text */}
          <div className="text-center mb-10">
            <p className="text-emerald-600 font-medium text-sm mb-2">مرحباً بك</p>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              تسجيل الدخول
            </h1>
            <p className="text-gray-500 text-sm">
              سجّل دخولك للوصول إلى نظام الحجوزات
            </p>
          </div>

          {/* Sign In Card */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100/50 p-8">
            {/* Google Sign In Button */}
            <button
              onClick={signInWithGoogle}
              disabled={loading}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className={`
                w-full py-4 px-6 rounded-2xl font-semibold text-base
                flex items-center justify-center gap-3
                transition-all duration-300 ease-out transform
                ${loading
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 shadow-sm hover:shadow-lg hover:shadow-emerald-500/10 hover:scale-[1.02]'
                }
              `}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                  <span>جاري التحميل...</span>
                </>
              ) : (
                <>
                  {/* Google Icon */}
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill={isHovered ? '#059669' : '#EA4335'}
                      className="transition-colors duration-300"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill={isHovered ? '#059669' : '#34A853'}
                      className="transition-colors duration-300"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill={isHovered ? '#059669' : '#FBBC05'}
                      className="transition-colors duration-300"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill={isHovered ? '#059669' : '#4285F4'}
                      className="transition-colors duration-300"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>تسجيل الدخول بحساب Google</span>
                </>
              )}
            </button>

            {/* Security Note */}
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>تسجيل دخول آمن ومشفر</span>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-8">
            © 2026 كنيسة السيدة العذراء مريم بالفجالة
          </p>
        </div>
      </div>
    </div>
  );
}
