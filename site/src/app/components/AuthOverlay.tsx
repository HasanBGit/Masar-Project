import { useTranslation } from "react-i18next";

interface Props {
  onLogin: () => void;
  /** Re-runs Google Identity Services detection/initialisation. */
  onRetry: () => void;
  error: string | null;
  darkMode: boolean;
}

export function AuthOverlay({ onLogin, onRetry, error, darkMode }: Props) {
  const { i18n } = useTranslation();
  const isAr = (i18n.resolvedLanguage ?? i18n.language).split("-")[0] === "ar";

  return (
    <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center p-6 backdrop-blur-sm ${darkMode ? "bg-[#0a1628]/80" : "bg-white/80"}`}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-overlay-title"
        className={`w-full max-w-md rounded-3xl border p-8 text-center shadow-2xl ${darkMode ? "border-white/10 bg-[#111c2d]" : "border-gray-200 bg-white"}`}
      >
        <div aria-hidden="true" className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EA4335]/15 text-[2rem] text-[#EA4335]">
          ✉
        </div>

        <h2 id="auth-overlay-title" className={`font-display text-[1.4rem] font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
          {isAr ? "تسجيل الدخول مطلوب" : "Authentication Required"}
        </h2>
        <p className={`mt-3 text-[0.9rem] leading-relaxed ${darkMode ? "text-white/60" : "text-gray-600"}`}>
          {isAr 
            ? "يرجى تسجيل الدخول بحساب Gmail لربط رسائل المشروع واستيرادها إلى المنصة."
            : "Please sign in with your Gmail account to connect your project communications and ingest them into the platform."}
        </p>
        
        {error && (
          <div role="alert" className="mt-4 rounded-xl bg-red-500/10 p-3 text-[0.8rem] text-red-500 border border-red-500/20">
            <p>{error}</p>
            <button
              onClick={onRetry}
              className="mt-2 rounded-lg border border-red-500/40 px-3 py-1.5 text-[0.78rem] font-semibold text-red-500 transition-colors hover:bg-red-500/10"
            >
              {isAr ? "إعادة المحاولة" : "Retry"}
            </button>
          </div>
        )}

        <button
          onClick={onLogin}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl bg-[#c9a227] px-6 py-3.5 font-semibold text-[#0a1628] transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <svg aria-hidden="true" focusable="false" className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {isAr ? "تسجيل الدخول باستخدام Google" : "Sign in with Google"}
        </button>
      </div>
    </div>
  );
}
