import React from "react";
import { AlertTriangle } from "lucide-react";

type ErrorBannerProps = {
  message?: string;
  className?: string;
};

const ErrorBanner = ({ message, className = "" }: ErrorBannerProps) => {
  if (!message) return null;
  return (
    <div
      className={`p-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 text-xs font-bold uppercase tracking-widest flex items-center gap-3 ${className}`.trim()}
    >
      <AlertTriangle size={16} />
      {message}
    </div>
  );
};

export default ErrorBanner;
