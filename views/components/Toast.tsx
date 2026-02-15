import React from "react";
import { AlertTriangle, X } from "lucide-react";

type ToastProps = {
  message?: string;
  onClose?: () => void;
};

const Toast = ({ message, onClose }: ToastProps) => {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[220] max-w-sm w-[90vw] sm:w-auto">
      <div className="bg-white border border-rose-100 text-rose-600 shadow-2xl rounded-2xl px-5 py-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 mt-0.5" />
        <div className="flex-1">
          <p className="text-[10px] font-black uppercase tracking-widest">
            Notification Failure
          </p>
          <p className="text-xs font-medium text-rose-500 mt-1">{message}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-rose-300 hover:text-rose-500 transition-colors"
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default Toast;
