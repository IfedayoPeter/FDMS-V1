import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Lock,
  ShieldCheck,
  ArrowLeft,
  Loader2,
  User,
  KeyRound,
  ShieldAlert,
  MapPin,
  ChevronDown,
} from "lucide-react";
import { SecurityOfficer } from "../types";
import apiService from "../services/apiService";
import {
  ensureApiSuccess,
  getApiContent,
  getApiErrorMessage,
} from "../services/apiResponse";

const DEFAULT_STATIONS = [
  "Main Lobby Terminal",
  "East Gate Access",
  "West Gate Access",
  "Service Entrance",
  "Academic Block Reception",
  "Corporate Hub Desk",
];

const SecurityLogin: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/";

  const [badgeId, setBadgeId] = useState(searchParams.get("badgeId") || "");
  const [pin, setPin] = useState("");
  const [station, setStation] = useState("");
  const [availableStations, setAvailableStations] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const loadData = async () => {
      try {
        // Load security stations from API
        const stationsResponse = await apiService.securityStation.getAll(
          undefined,
          { signal: controller.signal },
        );
        const stations = getApiContent<any[]>(
          stationsResponse,
          [],
          "security stations",
        ).map((s: any) => s.name);
        setAvailableStations(stations);
        if (stations.length > 0) setStation(stations[0]);
      } catch (e) {
        if ((e as any)?.name === "AbortError") return;
        console.error("Failed to load stations from API", e);
        setAvailableStations([]);
        setStation("");
      }
    };
    void loadData();
    return () => controller.abort();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setError("");

    try {
      // Authenticate with backend using badgeId + PIN
      const response = await apiService.securityOfficer.authenticate(
        badgeId,
        pin,
      );

      ensureApiSuccess(
        response,
        "Authorization Failed: Invalid Badge ID or PIN",
      );
      const officer = getApiContent<SecurityOfficer | any>(
        response,
        null,
        "security officer",
      );

      if (officer && (officer as any).id) {
        const session = {
          officerId: (officer as any).id,
          name: (officer as any).fullName,
          photo: (officer as any).photo,
          station: station,
          startTime: new Date().toISOString(),
        };
        localStorage.setItem("securitySession", JSON.stringify(session));
        navigate(redirectPath);
      } else {
        setError("Authorization Failed: Invalid Badge ID or PIN");
        setIsAuthenticating(false);
        setPin("");
      }
    } catch (err: any) {
      setError(
        getApiErrorMessage(
          err,
          "Authorization Failed: Invalid Badge ID or PIN",
        ),
      );
      setIsAuthenticating(false);
      setPin("");
    }
  };

  const handlePinInput = (digit: string) => {
    if (pin.length < 6) setPin((prev) => prev + digit);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-12 font-sans relative overflow-hidden text-white">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] contrast-150"></div>

      <button
        onClick={() => navigate("/")}
        className="absolute top-16 left-16 flex items-center gap-4 text-slate-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.4em] group z-20"
      >
        <ArrowLeft size={16} /> Back to Hub
      </button>

      <div className="max-w-md w-full z-10 space-y-10 text-center">
        <div className="space-y-6">
          <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center mx-auto border border-white/10 shadow-2xl animate-in zoom-in duration-700">
            <ShieldCheck size={48} className="text-indigo-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tight">Duty Sync</h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.4em]">
              Officer Authentication Required
            </p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-8">
          <div className="grid grid-cols-1 gap-6">
            {/* Station Selection */}
            <div className="space-y-3 text-left">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">
                Assigned Station
              </label>
              <div className="relative group">
                <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400" />
                <select
                  className="w-full pl-14 pr-12 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-indigo-500 font-bold text-xs appearance-none cursor-pointer transition-all"
                  value={station}
                  onChange={(e) => setStation(e.target.value)}
                >
                  {availableStations.map((s) => (
                    <option
                      key={s}
                      value={s}
                      className="bg-slate-900 text-white"
                    >
                      {s}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-3 text-left">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">
                Badge ID
              </label>
              <div className="relative group">
                <User className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400" />
                <input
                  className="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-indigo-500 font-bold text-xs transition-all uppercase tracking-widest"
                  value={badgeId}
                  onChange={(e) => setBadgeId(e.target.value)}
                  placeholder="Enter badge ID"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="flex justify-center gap-4">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 ${pin.length > i ? "bg-indigo-500 border-indigo-500 scale-125 shadow-lg shadow-indigo-500/50" : "border-white/10 bg-white/5"}`}
                />
              ))}
            </div>

            {error && (
              <div className="flex items-center justify-center gap-2 text-rose-400 animate-in slide-in-from-top-2">
                <ShieldAlert size={14} />
                <p className="text-[10px] font-black uppercase tracking-widest">
                  {error}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, "C", 0, "←"].map((key, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (key === "C") setPin("");
                  else if (key === "←") setPin((prev) => prev.slice(0, -1));
                  else handlePinInput(key.toString());
                }}
                className="aspect-square rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-xl font-black hover:bg-white/10 hover:border-white/20 transition-all active:scale-90"
              >
                {key}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={isAuthenticating || pin.length < 4 || !badgeId.trim()}
            className="w-full py-6 rounded-[2rem] bg-indigo-600 hover:bg-indigo-700 font-black text-lg shadow-2xl shadow-indigo-500/20 transition-all disabled:opacity-20 active:scale-95 flex items-center justify-center gap-4"
          >
            {isAuthenticating ? (
              <Loader2 className="animate-spin" />
            ) : (
              <KeyRound />
            )}
            {isAuthenticating ? "Syncing..." : "Authorize Session"}
          </button>
        </form>

        <div className="flex flex-col items-center gap-2 opacity-30">
          <p className="text-[9px] font-black uppercase tracking-[0.5em] text-slate-400 truncate max-w-full">
            Terminal ID: KSK-01 // Locality: {station || "System"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SecurityLogin;
