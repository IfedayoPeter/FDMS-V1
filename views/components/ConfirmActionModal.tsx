import React from "react";

type ConfirmAction = {
  title: string;
  message: string;
  onConfirm: () => void;
};

type ConfirmActionModalProps = {
  confirmAction: ConfirmAction | null;
  onClose: () => void;
};

const ConfirmActionModal = ({
  confirmAction,
  onClose,
}: ConfirmActionModalProps) => {
  if (!confirmAction) return null;
  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg p-10 rounded-[2.5rem] shadow-2xl border border-slate-100">
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">
          {confirmAction.title}
        </h3>
        <p className="text-slate-500 text-sm mt-3 font-medium">
          {confirmAction.message}
        </p>
        <div className="mt-8 flex gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all"
          >
            No, Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              const action = confirmAction.onConfirm;
              onClose();
              action();
            }}
            className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-rose-600 text-white hover:bg-rose-700 transition-all shadow-lg shadow-rose-100"
          >
            Yes, Proceed
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmActionModal;
