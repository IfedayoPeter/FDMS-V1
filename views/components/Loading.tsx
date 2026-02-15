import React from "react";
import { RefreshCw } from "lucide-react";

type LoadingStateProps = {
  message: string;
  className?: string;
};

const LoadingState = ({ message, className = "" }: LoadingStateProps) => (
  <div className={`text-center py-12 text-slate-500 ${className}`.trim()}>
    {message}
  </div>
);

type LoadingOverlayProps = {
  message: string;
};

const LoadingOverlay = ({ message }: LoadingOverlayProps) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/30 backdrop-blur-sm">
    <div className="bg-white/90 border border-slate-100 rounded-3xl px-10 py-8 shadow-2xl flex flex-col items-center gap-4">
      <RefreshCw className="w-14 h-14 animate-spin text-indigo-600" />
      <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">
        {message}
      </p>
    </div>
  </div>
);

export { LoadingState, LoadingOverlay };
