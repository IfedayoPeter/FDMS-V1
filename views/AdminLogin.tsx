/**
 * Admin Login Component
 *
 * Frontend component for admin authentication
 * Place this in: frontend/src/views/AdminLogin.tsx
 *
 * Dependencies:
 * - react-router-dom
 * - lucide-react
 * - tailwindcss
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, ShieldCheck, ArrowLeft, Loader2 } from "lucide-react";
import apiService from "../services/apiService";
import { LoadingOverlay } from "./components/Loading";
import {
  ensureApiSuccess,
  getApiContent,
  getApiErrorMessage,
} from "../services/apiResponse";

interface Props {
  onLogin: () => void;
}

const AdminLogin: React.FC<Props> = ({ onLogin }) => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("FDMS");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [loadingOverlay, setLoadingOverlay] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Loading Admin Console");

  useEffect(() => {
    const controller = new AbortController();
    // Load system branding configuration from API (if available)
    const loadSettings = async () => {
      setLoadingOverlay(true);
      setLoadingMessage("Loading Admin Console");
      try {
        const response = await apiService.settings.getAll({
          signal: controller.signal,
        });
        const settings = getApiContent<any>(response, null, "system settings");
        if (settings?.kiosk?.logoUrl) setLogoUrl(settings.kiosk.logoUrl);
        if (settings?.kiosk?.companyName)
          setCompanyName(settings.kiosk.companyName);
      } catch (e) {
        if ((e as any)?.name === "AbortError") return;
        console.error("Failed to load system settings from API", e);
      } finally {
        setLoadingOverlay(false);
      }
    };
    void loadSettings();
    return () => controller.abort();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setError("");
    setLoadingOverlay(true);
    setLoadingMessage("Authenticating Admin");

    try {
      // Call backend admin login endpoint
      const response = await apiService.admin.login({ password });

      ensureApiSuccess(response, "Verification Failed: Access Unauthorized");

      const token =
        response?.token ??
        (typeof response?.token === "string" ? response?.token : null);

      if (!token) {
        throw new Error(
          response?.message || "Verification Failed: Access Unauthorized",
        );
      }

      // Store auth token in localStorage
      localStorage.setItem("authToken", token);
      const resolvedAdminName =
        response?.fullName ||
        response?.name ||
        response?.adminName ||
        response?.email ||
        "Admin Officer";
      localStorage.setItem("adminSessionName", resolvedAdminName);
      onLogin();
      navigate("/admin");
    } catch (err: any) {
      setError(
        getApiErrorMessage(err, "Verification Failed: Access Unauthorized"),
      );
    } finally {
      setIsAuthenticating(false);
      setLoadingOverlay(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-white flex flex-col items-center justify-center p-6 font-sans overflow-hidden">
      {loadingOverlay && <LoadingOverlay message={loadingMessage} />}
      {/* Subtle Monochrome Noise Overlay for Texture */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] contrast-150"></div>

      <button
        onClick={() => navigate("/")}
        className="absolute top-12 left-12 flex items-center gap-4 text-zinc-400 hover:text-black transition-all text-[9px] font-black uppercase tracking-[0.4em] group z-20"
      >
        <div className="w-8 h-8 rounded-full border border-zinc-100 flex items-center justify-center group-hover:border-black group-hover:bg-black group-hover:text-white transition-all">
          <ArrowLeft className="w-3 h-3" />
        </div>
        Return to Kiosk
      </button>

      <div className="relative max-w-lg w-full z-10">
        {/* Gallery Minimalist Card */}
        <div className="bg-white rounded-[3.5rem] p-16 border border-zinc-100 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.05)] animate-in fade-in zoom-in-95 duration-1000">
          <div className="flex flex-col items-center mb-16">
            <div className="relative mb-10 group">
              {/* LOGO CONTAINER */}
              <div className="relative w-24 h-24 bg-gradient-to-br from-zinc-50 to-white rounded-full flex items-center justify-center overflow-hidden shadow-sm ring-1 ring-zinc-100">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    className="w-full h-full object-cover transition-all duration-700"
                    alt="Company Logo"
                  />
                ) : (
                  <span className="text-black font-black text-3xl tracking-tighter">
                    {companyName.charAt(0)}
                  </span>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-black w-4 h-4 rounded-full border-[3px] border-white shadow-lg"></div>
            </div>

            <div className="text-center space-y-3 animate-in fade-in slide-in-from-top-4 duration-700 delay-200">
              <h1 className="text-2xl font-black text-black tracking-tighter uppercase">
                Admin Console
              </h1>
              <div className="flex items-center justify-center gap-3">
                <div className="w-4 h-[1px] bg-zinc-100"></div>
                <p className="text-zinc-400 text-[9px] font-black uppercase tracking-[0.5em]">
                  Identity Handshake Required
                </p>
                <div className="w-4 h-[1px] bg-zinc-100"></div>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleLogin}
            className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300"
          >
            <div className="space-y-4">
              <label className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.3em] ml-2">
                Verification Key
              </label>
              <div className="relative group">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-black transition-colors" />
                <input
                  type="password"
                  placeholder="PROTECTED"
                  autoFocus
                  disabled={isAuthenticating}
                  className="relative w-full pl-16 pr-6 py-5 bg-zinc-50 border border-zinc-200 text-black rounded-2xl focus:border-black outline-none transition-all placeholder:text-zinc-300 font-bold text-lg tracking-[0.2em] disabled:opacity-50"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-zinc-500 px-2 animate-in slide-in-from-left-2 duration-300">
                  <div className="w-1 h-1 bg-black rounded-full animate-pulse"></div>
                  <p className="text-[9px] font-bold uppercase tracking-widest">
                    {error}
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isAuthenticating || !password}
              className="w-full relative bg-black text-white font-black py-5 rounded-2xl transition-all shadow-xl hover:bg-zinc-900 active:scale-[0.98] disabled:opacity-10 disabled:grayscale disabled:cursor-not-allowed overflow-hidden"
            >
              <span className="relative flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.3em]">
                {isAuthenticating ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Synchronizing...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Enter Terminal
                  </>
                )}
              </span>
            </button>
          </form>

          <div className="mt-16 pt-8 border-t border-zinc-100 flex flex-col items-center gap-3 animate-in fade-in duration-1000 delay-500">
            <span className="text-[7px] font-black text-zinc-300 uppercase tracking-[0.4em]">
              Protocol Version 3.14.0 // Encrypted Session
            </span>
            <p className="text-[6px] font-bold text-zinc-200 uppercase tracking-widest">
              Authorized Access Only • System Logging Active
            </p>
          </div>
        </div>
      </div>

      {/* Discreet Auth Hint */}
      <div className="absolute bottom-12 text-zinc-200 text-[8px] font-black uppercase tracking-[0.3em] opacity-30 hover:opacity-100 transition-opacity cursor-default">
        Default Key: admin123
      </div>
    </div>
  );
};

export default AdminLogin;
