'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { churches } from '@/data/initialData';

export default function SignInPage() {
  const { signInWithGoogle, loading, authError, lastFailedEmail } = useAuth();

  // Access request modal state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [reqName, setReqName] = useState('');
  const [reqChurch, setReqChurch] = useState(churches[0]);
  const [reqTeam, setReqTeam] = useState('');
  const [reqSubmitting, setReqSubmitting] = useState(false);
  const [reqSuccess, setReqSuccess] = useState(false);
  const [reqError, setReqError] = useState('');

  const handleSubmitRequest = async () => {
    setReqError('');
    if (!reqName.trim()) { setReqError('الاسم الكامل مطلوب'); return; }
    if (!reqTeam.trim()) { setReqError('اسم الفريق مطلوب'); return; }
    if (!lastFailedEmail) { setReqError('لم يتم التعرف على البريد الإلكتروني. يرجى تسجيل الدخول أولاً.'); return; }

    setReqSubmitting(true);
    try {
      const email = lastFailedEmail.toLowerCase();
      await setDoc(doc(db, 'access_requests', email), {
        email,
        name: reqName.trim(),
        churchName: reqChurch,
        teamName: reqTeam.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setReqSuccess(true);
    } catch (err) {
      console.error('Error submitting access request:', err);
      setReqError('حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.');
    } finally {
      setReqSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&family=Noto+Naskh+Arabic:wght@400;500;600;700&display=swap');

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        html,
        body {
          height: 100%;
          overflow-x: hidden;
        }

        body {
          font-family: 'Cairo', 'Noto Naskh Arabic', sans-serif;
        }

        .signin-root {
          min-height: 100vh;
          display: flex;
          direction: rtl;
          background: #0d1b2a;
        }

        /* ═════════════════ LEFT PANEL ═════════════════ */
        .left-panel {
          display: none;
          position: relative;
          overflow: hidden;
        }

        @media (min-width: 1024px) {
          .left-panel {
            display: flex;
            width: 48%;
            align-items: center;
            justify-content: center;
          }
        }

        .left-bg {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            160deg,
            #071827 0%,
            #06291a 55%,
            #03130d 100%
          );
        }

        .left-bg-image {
          position: absolute;
          inset: 0;
          background-image: url('/logo.png');
          background-size: cover;
          background-position: center;
          opacity: 0.04;
        }

        .left-glow-top {
          position: absolute;
          top: -80px;
          left: 50%;
          transform: translateX(-50%);
          width: 500px;
          height: 500px;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(16,185,129,0.12) 0%,
            transparent 65%
          );
        }

        .left-glow-bottom {
          position: absolute;
          bottom: -100px;
          left: 50%;
          transform: translateX(-50%);
          width: 400px;
          height: 400px;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(6,78,59,0.2) 0%,
            transparent 65%
          );
        }

        .left-content {
          position: relative;
          z-index: 2;
          text-align: center;
          padding: 60px;
          max-width: 440px;
        }

        .ring-wrap {
          position: relative;
          width: 200px;
          height: 200px;
          margin: 0 auto 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ring-outer {
          position: absolute;
          inset: -20px;
          border-radius: 50%;
          border: 1px solid rgba(16,185,129,0.15);
          animation: spin 25s linear infinite;
        }

        .ring-outer::before {
          content: '';
          position: absolute;
          top: -3px;
          left: 50%;
          transform: translateX(-50%);
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 10px #10b981;
        }

        .ring-mid {
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 1px dashed rgba(16,185,129,0.1);
          animation: spin 15s linear infinite reverse;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .logo-orb {
          width: 160px;
          height: 160px;
          border-radius: 50%;
          background: linear-gradient(145deg, #f0faf6, #ffffff);
          border: 2px solid rgba(16,185,129,0.25);

          display: flex;
          align-items: center;
          justify-content: center;

          box-shadow:
            0 0 0 6px rgba(16,185,129,0.06),
            0 0 40px rgba(16,185,129,0.15),
            0 20px 60px rgba(0,0,0,0.4);

          animation: float 6s ease-in-out infinite;
        }

        .logo-orb img {
          width: 75%;
          height: 75%;
          object-fit: contain;
          border-radius: 50%;
        }

        .left-title {
          font-size: 48px;
          line-height: 1.15;
          font-weight: 900;
          color: white;
          margin-bottom: 14px;
        }

        .left-title span {
          color: #10b981;
        }

        .left-subtitle {
          font-size: 20px;
          color: rgba(255,255,255,0.4);
        }

        /* ═════════════════ RIGHT PANEL ═════════════════ */

        .right-panel {
          flex: 1;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f1f5f9;
          min-height: 100vh;
          overflow: hidden;
          padding: 0 20px 40px;
        }

        /* MOBILE FIX */
        @media (max-width: 768px) {
          .right-panel {
            align-items: flex-start;
            padding-top: 28px;
          }
        }

        /* GREEN HEADER */
        .right-panel::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;

          height: 380px;

          background: linear-gradient(
            165deg,
            #064e3b 0%,
            #065f46 50%,
            #0d9488 100%
          );

          clip-path: ellipse(120% 100% at 50% 0%);
          z-index: 0;
        }

        @media (max-width: 768px) {
          .right-panel::before {
            height: 260px;
            clip-path: ellipse(160% 100% at 50% 0%);
          }
        }

        .right-inner {
          position: relative;
          z-index: 1;

          width: 100%;
          max-width: 400px;

          display: flex;
          flex-direction: column;
          align-items: center;

          padding-top: 40px;
        }

        @media (max-width: 768px) {
          .right-inner {
            padding-top: 12px;
          }
        }

        /* MOBILE LOGO */
        .mobile-logo {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 10px;
        }

        @media (min-width: 1024px) {
          .mobile-logo {
            display: none;
          }
        }

        .mobile-logo-orb {
          width: 92px;
          height: 92px;

          border-radius: 50%;
          background: linear-gradient(145deg, #f0faf6, #ffffff);

          border: 3px solid rgba(255,255,255,0.6);

          display: flex;
          align-items: center;
          justify-content: center;

          box-shadow:
            0 8px 32px rgba(0,0,0,0.2),
            0 0 0 6px rgba(255,255,255,0.15);
        }

        .mobile-logo-orb img {
          width: 70%;
          height: 70%;
          object-fit: contain;
          border-radius: 50%;
        }

        /* HERO */
        .right-hero {
          text-align: center;
          margin-bottom: 20px;
          animation: fadeSlideUp 0.6s ease both;
        }

        .right-hero-eyebrow {
          font-size: 11px;
          font-weight: 700;
          color: rgba(255,255,255,0.7);
          margin-bottom: 4px;
        }

        .right-hero-title {
          font-size: 28px;
          font-weight: 900;
          color: white;
          line-height: 1.2;
          margin-bottom: 4px;
          text-shadow: 0 2px 20px rgba(0,0,0,0.25);
        }

        .right-hero-sub {
          font-size: 12px;
          color: rgba(255,255,255,0.55);
        }

        /* CARD */
        .login-card {
          width: 100%;
          background: white;

          border-radius: 24px;
          padding: 32px 28px 28px;

          box-shadow:
            0 4px 6px rgba(0,0,0,0.04),
            0 20px 60px rgba(6,78,59,0.12),
            0 40px 100px rgba(0,0,0,0.08);

          position: relative;
          overflow: hidden;
        }

        .login-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;

          background: linear-gradient(
            90deg,
            #059669,
            #10b981,
            #34d399
          );
        }

        .card-greeting {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          text-align: center;
          margin-bottom: 24px;
        }

        .card-greeting-icon {
          width: 48px;
          height: 48px;

          border-radius: 14px;

          background: linear-gradient(
            135deg,
            #ecfdf5,
            #d1fae5
          );

          display: flex;
          align-items: center;
          justify-content: center;

          margin-bottom: 4px;

          box-shadow: 0 4px 16px rgba(16,185,129,0.2);
        }

        .card-greeting-title {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
        }

        .card-greeting-sub {
          font-size: 12px;
          color: #64748b;
        }

        /* GOOGLE BUTTON */
        .google-btn {
          width: 100%;
          padding: 16px 24px;

          border: none;
          border-radius: 16px;

          background: #0f172a;
          color: white;

          font-family: 'Cairo', sans-serif;
          font-size: 15px;
          font-weight: 700;

          cursor: pointer;

          display: flex;
          align-items: center;
          justify-content: center;

          transition: all 0.25s ease;

          position: relative;
          overflow: hidden;
        }

        .google-btn::after {
          content: '';
          position: absolute;
          inset: 0;

          background: linear-gradient(
            135deg,
            #065f46,
            #059669
          );

          opacity: 0;
          transition: opacity 0.25s ease;
        }

        .google-btn:hover::after {
          opacity: 1;
        }

        .google-btn:hover {
          transform: translateY(-2px);

          box-shadow:
            0 12px 40px rgba(5,150,105,0.35),
            0 4px 16px rgba(0,0,0,0.15);
        }

        .google-btn-content {
          position: relative;
          z-index: 1;

          display: flex;
          align-items: center;
          gap: 12px;
        }

        .google-icon-wrap {
          width: 32px;
          height: 32px;

          border-radius: 8px;
          background: white;

          display: flex;
          align-items: center;
          justify-content: center;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border-radius: 50%;

          border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: white;

          animation: spin 0.7s linear infinite;
        }

        .security-note {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;

          margin-top: 20px;

          color: #94a3b8;
          font-size: 12px;
          font-weight: 500;
        }

        .error-box {
          margin-top: 16px;

          padding: 12px 16px;

          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 12px;

          color: #dc2626;
          font-size: 13px;
        }

        .right-footer {
          margin-top: 28px;
          text-align: center;

          font-size: 11px;
          color: #94a3b8;
        }

        /* ═════════ ACCESS REQUEST MODAL ═════════ */
        .request-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: fadeSlideUp 0.3s ease both;
        }

        .request-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(12px);
        }

        .request-card {
          position: relative;
          width: 100%;
          max-width: 420px;
          background: white;
          border-radius: 24px;
          padding: 32px 28px 28px;
          box-shadow: 0 25px 80px rgba(0,0,0,0.2);
          z-index: 1;
        }

        .request-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #f59e0b, #f97316, #ef4444);
          border-radius: 24px 24px 0 0;
        }

        .request-title {
          font-size: 18px;
          font-weight: 900;
          color: #0f172a;
          text-align: center;
          margin-bottom: 4px;
        }

        .request-subtitle {
          font-size: 12px;
          color: #64748b;
          text-align: center;
          margin-bottom: 20px;
        }

        .request-field {
          margin-bottom: 14px;
        }

        .request-label {
          display: block;
          font-size: 12px;
          font-weight: 700;
          color: #475569;
          margin-bottom: 6px;
        }

        .request-input,
        .request-select {
          width: 100%;
          padding: 12px 16px;
          border: 1.5px solid #e2e8f0;
          border-radius: 14px;
          font-family: 'Cairo', sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: #0f172a;
          background: #f8fafc;
          transition: all 0.2s ease;
          outline: none;
        }

        .request-input:focus,
        .request-select:focus {
          border-color: #059669;
          box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1);
          background: white;
        }

        .request-input[readonly] {
          background: #f1f5f9;
          color: #94a3b8;
          cursor: not-allowed;
        }

        .request-submit {
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 14px;
          background: #0f172a;
          color: white;
          font-family: 'Cairo', sans-serif;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: 6px;
        }

        .request-submit:hover:not(:disabled) {
          background: #065f46;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(6, 95, 70, 0.3);
        }

        .request-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .request-cancel {
          width: 100%;
          padding: 12px;
          border: 1.5px solid #e2e8f0;
          border-radius: 14px;
          background: transparent;
          color: #64748b;
          font-family: 'Cairo', sans-serif;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 8px;
        }

        .request-cancel:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }

        .request-error {
          padding: 10px 14px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 10px;
          color: #dc2626;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 12px;
          text-align: center;
        }

        /* SUCCESS STATE */
        .request-success {
          text-align: center;
          padding: 20px 0;
        }

        .success-checkmark {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ecfdf5, #d1fae5);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }

        @keyframes scaleIn {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .success-title {
          font-size: 17px;
          font-weight: 900;
          color: #065f46;
          margin-bottom: 6px;
        }

        .success-desc {
          font-size: 12px;
          color: #64748b;
          line-height: 1.7;
        }

        /* JOIN REQUEST TRIGGER BUTTON */
        .request-trigger {
          width: 100%;
          padding: 14px;
          margin-top: 12px;
          border: 2px dashed #f59e0b;
          border-radius: 14px;
          background: #fffbeb;
          color: #92400e;
          font-family: 'Cairo', sans-serif;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .request-trigger:hover {
          background: #fef3c7;
          border-color: #d97706;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.15);
        }
      `}</style>

      <div className="signin-root">
        {/* LEFT PANEL */}
        <div className="left-panel">
          <div className="left-bg" />
          <div className="left-bg-image" />
          <div className="left-glow-top" />
          <div className="left-glow-bottom" />

          <div className="left-content">
            <div className="ring-wrap">
              <div className="ring-outer" />
              <div className="ring-mid" />

              <div className="logo-orb">
                <img src="/logo.png" alt="شعار الأسرة" />
              </div>
            </div>

            <h2 className="left-title">
              أسرة إعداد
              <br />
              <span>خدام</span>
            </h2>

            <p className="left-subtitle">
              كنائس وسط القاهرة
            </p>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="right-panel">
          <div className="right-inner">
            {/* MOBILE LOGO */}
            <div className="mobile-logo">
              <div className="mobile-logo-orb">
                <img src="/logo.png" alt="شعار الأسرة" />
              </div>
            </div>

            {/* HERO */}
            <div className="right-hero">
              <p className="right-hero-eyebrow">
                مرحباً بك
              </p>

              <h1 className="right-hero-title">
                تسجيل الدخول
              </h1>

              <p className="right-hero-sub">
                سجّل دخولك للوصول إلى نظام الحجوزات
              </p>
            </div>

            {/* CARD */}
            <div className="login-card">
              <div className="card-greeting">
                <div className="card-greeting-icon">
                  <svg
                    width="24"
                    height="24"
                    fill="none"
                    stroke="#059669"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>

                <div>
                  <div className="card-greeting-title">
                    تسجيل الدخول
                  </div>

                  <div className="card-greeting-sub">
                    استخدم حساب Google الخاص بك
                  </div>
                </div>
              </div>

              <button
                onClick={signInWithGoogle}
                disabled={loading}
                className="google-btn"
              >
                {loading ? (
                  <div className="google-btn-content">
                    <div className="spinner" />
                    <span>جاري التحميل...</span>
                  </div>
                ) : (
                  <div className="google-btn-content">
                    <div className="google-icon-wrap">
                      <svg width="18" height="18" viewBox="0 0 24 24">
                        <path
                          fill="#EA4335"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#4285F4"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                    </div>

                    <span>
                      تسجيل الدخول بحساب Google
                    </span>
                  </div>
                )}
              </button>

              <div className="security-note">
                <svg
                  width="13"
                  height="13"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>

                تسجيل دخول آمن ومشفر بالكامل
              </div>

              {authError && (
                <div className="error-box">
                  {authError}
                </div>
              )}

              {/* Access Request Trigger — only shown when auth fails with unauthorized email */}
              {authError && lastFailedEmail && (
                <button
                  className="request-trigger"
                  onClick={() => { setShowRequestModal(true); setReqSuccess(false); setReqError(''); }}
                >
                  📝 تقديم طلب انضمام كقائد فريق
                </button>
              )}
            </div>

            <p className="right-footer">
              © 2026 أسرة إعداد خدام كنائس وسط القاهرة
            </p>
          </div>
        </div>
      </div>

      {/* ═══════ ACCESS REQUEST MODAL ═══════ */}
      {showRequestModal && (
        <div className="request-overlay" dir="rtl">
          <div className="request-backdrop" onClick={() => !reqSubmitting && setShowRequestModal(false)} />
          <div className="request-card">
            {reqSuccess ? (
              <div className="request-success">
                <div className="success-checkmark">
                  <svg width="32" height="32" fill="none" stroke="#059669" strokeWidth="3" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="success-title">تم إرسال طلبك بنجاح! ✓</div>
                <div className="success-desc">
                  سيقوم المسؤول بمراجعة طلبك والموافقة عليه.
                  <br />
                  ستتمكن من تسجيل الدخول بمجرد قبول الطلب.
                </div>
                <button
                  className="request-cancel"
                  style={{ marginTop: 20 }}
                  onClick={() => setShowRequestModal(false)}
                >
                  إغلاق
                </button>
              </div>
            ) : (
              <>
                <div className="request-title">طلب انضمام كقائد فريق</div>
                <div className="request-subtitle">أدخل بياناتك وسيتم إرسال الطلب للمسؤول للموافقة</div>

                {reqError && <div className="request-error">{reqError}</div>}

                <div className="request-field">
                  <label className="request-label">البريد الإلكتروني</label>
                  <input className="request-input" type="email" value={lastFailedEmail || ''} readOnly />
                </div>

                <div className="request-field">
                  <label className="request-label">الاسم الكامل *</label>
                  <input
                    className="request-input"
                    type="text"
                    placeholder="أدخل اسمك الكامل"
                    value={reqName}
                    onChange={(e) => setReqName(e.target.value)}
                  />
                </div>

                <div className="request-field">
                  <label className="request-label">الكنيسة *</label>
                  <select
                    className="request-select"
                    value={reqChurch}
                    onChange={(e) => setReqChurch(e.target.value)}
                  >
                    {churches.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="request-field">
                  <label className="request-label">اسم الفريق *</label>
                  <input
                    className="request-input"
                    type="text"
                    placeholder="أدخل اسم فريقك"
                    value={reqTeam}
                    onChange={(e) => setReqTeam(e.target.value)}
                  />
                </div>

                <button
                  className="request-submit"
                  disabled={reqSubmitting}
                  onClick={handleSubmitRequest}
                >
                  {reqSubmitting ? 'جاري الإرسال...' : 'إرسال طلب الانضمام'}
                </button>

                <button
                  className="request-cancel"
                  onClick={() => setShowRequestModal(false)}
                  disabled={reqSubmitting}
                >
                  إلغاء
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
