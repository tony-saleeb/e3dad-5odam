'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught React exception:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6" dir="rtl">
          <div className="max-w-md w-full bg-white border border-slate-200/80 rounded-3xl p-8 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200/60 flex items-center justify-center mx-auto shadow-sm">
              <svg className="w-8 h-8 text-red-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-black text-slate-800">عذرًا، حدث خطأ غير متوقع</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                واجه النظام مشكلة أثناء تحميل هذه الصفحة. يمكنك محاولة إعادة تحميل الصفحة أو تسجيل الدخول مرة أخرى.
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-right overflow-x-auto max-h-40">
                <p className="text-xs font-mono text-red-650 font-bold mb-1">{this.state.error.name}: {this.state.error.message}</p>
                <pre className="text-[10px] font-mono text-slate-500 whitespace-pre-wrap leading-normal">{this.state.error.stack}</pre>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="flex-1 py-3.5 px-6 bg-linear-to-r from-slate-800 to-slate-900 hover:brightness-105 text-white font-black rounded-xl shadow-md transition-all cursor-pointer text-sm active:scale-98"
              >
                إعادة المحاولة ↻
              </button>
              <button
                onClick={() => {
                  window.location.href = '/';
                }}
                className="flex-1 py-3.5 px-6 border border-slate-200 bg-white hover:bg-slate-50 text-slate-650 font-bold rounded-xl shadow-3xs transition-all cursor-pointer text-sm active:scale-98"
              >
                الصفحة الرئيسية
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
