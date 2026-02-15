import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import {
  ACTION_FEEDBACK_EVENT,
  ActionFeedbackPayload,
} from "../../services/apiService";

const ActionFeedbackModal = () => {
  const [queue, setQueue] = useState<ActionFeedbackPayload[]>([]);
  const [active, setActive] = useState<ActionFeedbackPayload | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const clearTimer = () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const handleActionFeedback = (event: Event) => {
      const payload = (event as CustomEvent<ActionFeedbackPayload>).detail;
      if (!payload?.message) return;

      setQueue((prev) => {
        const existingIndex = prev.findIndex(
          (item) => item.actionId === payload.actionId,
        );
        if (existingIndex === -1) return [...prev, payload];
        const next = [...prev];
        next[existingIndex] = payload;
        return next;
      });
    };

    window.addEventListener(ACTION_FEEDBACK_EVENT, handleActionFeedback);
    return () => {
      clearTimer();
      window.removeEventListener(ACTION_FEEDBACK_EVENT, handleActionFeedback);
    };
  }, []);

  useEffect(() => {
    if (active || queue.length === 0) return;
    setActive(queue[0]);
  }, [active, queue]);

  useEffect(() => {
    if (!active) return;
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = null;

    if (active.phase !== "loading") {
      timeoutRef.current = window.setTimeout(() => {
        setQueue((prev) => prev.filter((item) => item.actionId !== active.actionId));
        setActive(null);
        timeoutRef.current = null;
      }, 1800);
    }

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const nextActive = queue.find((item) => item.actionId === active.actionId);
    if (!nextActive) {
      setActive(null);
      return;
    }
    if (
      nextActive.phase !== active.phase ||
      nextActive.message !== active.message
    ) {
      setActive(nextActive);
    }
  }, [queue, active]);

  if (!active) return null;

  const icon =
    active.phase === "loading" ? (
      <RefreshCw className="w-12 h-12 text-indigo-600 animate-spin" />
    ) : active.phase === "success" ? (
      <CheckCircle2 className="w-12 h-12 text-emerald-600" />
    ) : (
      <XCircle className="w-12 h-12 text-rose-600" />
    );

  const labelClass =
    active.phase === "loading"
      ? "text-indigo-700"
      : active.phase === "success"
        ? "text-emerald-700"
        : "text-rose-700";

  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center bg-slate-900/35 backdrop-blur-sm px-6">
      <div className="w-full max-w-lg rounded-[2.5rem] bg-white border border-slate-100 shadow-2xl px-10 py-9 flex flex-col items-center text-center gap-5">
        {icon}
        <p
          className={`text-xs font-black uppercase tracking-[0.24em] ${labelClass}`}
        >
          {active.message}
        </p>
      </div>
    </div>
  );
};

export default ActionFeedbackModal;
