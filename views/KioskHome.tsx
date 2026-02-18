import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LogIn,
  LogOut,
  Settings,
  Clock,
  AlertCircle,
  Key,
  Building2,
  PackageCheck,
  ChevronRight,
  ArrowRight,
  Globe,
  X,
  ShieldCheck,
  User,
  Shield,
  Activity,
  Zap,
  MapPin,
  Lock,
  AlertTriangle,
} from "lucide-react";
import {
  Visitor,
  SystemSettings,
  AssetMovement,
  Language,
  KeyLog,
} from "../types";
import { useLanguage } from "../LanguageContext";
import apiService from "../services/apiService";
import { getApiContent, getApiErrorMessage } from "../services/apiResponse";

interface WeatherData {
  temp: number;
  condition: string;
  icon: React.ReactNode;
}

const KioskHome: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());
  const [overdueCount, setOverdueCount] = useState(0);
  const [overdueAssets, setOverdueAssets] = useState<AssetMovement[]>([]);
  const [overdueKeys, setOverdueKeys] = useState<KeyLog[]>([]);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [securitySession, setSecuritySession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState<SystemSettings["kiosk"]>({
    companyName: "Exxcel Consulting",
    locationName: "Front Desk",
    supportEmail: "support@exxcel.consulting",
    senderEmail: "notifications@exxcel.consulting",
    logoUrl: "",
  });

  const languages: { code: Language; name: string; label: string }[] = [
    { code: "en", name: "English", label: "EN" },
    { code: "es", name: "Español", label: "ES" },
    { code: "pt", name: "Português", label: "PT" },
    { code: "fr", name: "Français", label: "FR" },
    { code: "ha", name: "Hausa", label: "HA" },
    { code: "yo", name: "Yoruba", label: "YO" },
    { code: "ig", name: "Igbo", label: "IG" },
    { code: "pd", name: "Pidgin", label: "PD" },
  ];

  const currentHour = time.getHours();
  const isSystemOpen = currentHour >= 5;

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        const sessionData = localStorage.getItem("securitySession");
        if (sessionData) setSecuritySession(JSON.parse(sessionData));

        const settingsResponse = await apiService.settings.getAll({
          signal: controller.signal,
        });
        const settings = getApiContent<SystemSettings | null>(
          settingsResponse,
          null,
          "settings",
        );
        if (settings?.kiosk) {
          setConfig(settings.kiosk);
        }

        const visitorsResponse = await apiService.visitor.getAll({
          filter: "status=In",
          page: 1,
          pageSize: 100,
        }, { signal: controller.signal });
        const activeVisitors = getApiContent<Visitor[]>(
          visitorsResponse,
          [],
          "active visitors",
        );
        setOverdueCount(activeVisitors.length);

        // const assetOverdueResponse = await apiService.assetMovement.getOverdue(60);
        // if (assetOverdueResponse.content) {
        //   setOverdueAssets(assetOverdueResponse.content);
        // }

        // const keyOverdueResponse = await apiService.keyLog.getOverdue();
        // if (keyOverdueResponse.content) {
        //   setOverdueKeys(keyOverdueResponse.content);
        // }
      } catch (error) {
        if ((error as any)?.name === "AbortError") return;
        console.error(
          "Error loading dashboard data:",
          getApiErrorMessage(error, "Failed to load dashboard data"),
        );
        // Continue with default state on error - don't break the UI
      } finally {
        setIsLoading(false);
      }
    };

    void loadDashboardData();
    return () => controller.abort();
  }, []);

  const handleEndSession = () => {
    localStorage.removeItem("securitySession");
    setSecuritySession(null);
  };

  const currentYear = new Date().getFullYear();

  // OFF-HOURS LOCK
  if (!isSystemOpen) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-12 text-white font-sans overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] contrast-150"></div>
        <div className="max-w-xl w-full text-center space-y-12 animate-in fade-in zoom-in-95 duration-1000">
          <div className="w-32 h-32 bg-white/5 rounded-[3rem] flex items-center justify-center mx-auto border border-white/10 shadow-2xl">
            <Lock size={64} className="text-slate-400" />
          </div>
          <div className="space-y-4">
            <h1 className="text-5xl font-black tracking-tight">
              Terminal Locked
            </h1>
            <p className="text-slate-400 text-xl font-medium leading-relaxed">
              The system is currently in daily maintenance mode. New sessions
              will be authorized starting at{" "}
              <span className="text-white font-black">05:00 AM</span>.
            </p>
          </div>
          <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 backdrop-blur-md">
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">
                Current Time
              </span>
              <span className="text-4xl font-black tabular-nums">
                {time.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            </div>
          </div>
          <div className="pt-8 flex flex-col items-center gap-6">
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-600">
              Protocol ID: SYSRST-24-00 // Midnight Cleanup Active
            </p>
            <Link
              to="/admin-login"
              className="flex items-center gap-2 text-slate-700 hover:text-indigo-400 transition-colors text-[8px] font-black uppercase tracking-[0.5em]"
            >
              <Settings size={12} /> Admin Console
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // MANDATORY SECURITY SESSION
  if (!securitySession) {
    return (
      <div className="min-h-screen bg-white font-sans text-slate-900 flex flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[50vw] h-[50vh] bg-indigo-50/50 rounded-bl-[100%] -z-10 blur-3xl opacity-50"></div>
        <div className="max-w-4xl w-full text-center space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="space-y-8">
            <div className="w-24 h-24 bg-indigo-600 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-indigo-200">
              <Shield size={48} className="text-white" />
            </div>
            <div className="space-y-4">
              <h1 className="text-6xl font-black tracking-tighter text-slate-900 leading-tight">
                Duty Shift Required
              </h1>
              <p className="text-slate-400 text-2xl font-medium max-w-2xl mx-auto">
                Unauthorized terminal access detected. Security personnel must
                authenticate to begin daily logs and accountability
                synchronization.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-8">
            <Link
              to="/security-login"
              className="group relative flex items-center gap-6 bg-slate-900 text-white px-12 py-8 rounded-[3rem] hover:bg-black transition-all font-black text-2xl uppercase tracking-widest shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] active:scale-95"
            >
              <ShieldCheck size={32} />
              Start Security Shift
              <ArrowRight className="group-hover:translate-x-3 transition-transform" />
            </Link>
          </div>

          <footer className="pt-24 opacity-20">
            <Link
              to="/admin-login"
              className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-900 hover:opacity-100 transition-opacity"
            >
              System Administrator Console
            </Link>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans text-slate-900 relative overflow-x-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[50vw] h-[50vh] bg-indigo-50/50 rounded-bl-[100%] -z-10 blur-3xl opacity-50"></div>
      <div className="absolute bottom-0 left-0 w-[30vw] h-[30vh] bg-emerald-50/50 rounded-tr-[100%] -z-10 blur-2xl opacity-50"></div>

      <div className="max-w-7xl mx-auto px-6 sm:px-12 py-8 sm:py-16 min-h-screen flex flex-col">
        <header className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-8 mb-12 sm:mb-20">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-indigo-100 flex-shrink-0 overflow-hidden border border-slate-100">
              {config.logoUrl ? (
                <img
                  src={config.logoUrl}
                  className="w-full h-full object-cover"
                  alt="Logo"
                />
              ) : (
                <Building2 className="text-indigo-600 w-6 h-6 sm:w-8 sm:h-8" />
              )}
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-xl sm:text-3xl font-black tracking-tighter text-slate-900 leading-none">
                {config.companyName}
              </h1>
              <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2">
                {config.locationName} Hub
              </p>
            </div>
          </div>

          <div className="flex gap-6 sm:gap-10 items-center">
            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-3 bg-white px-5 py-3 rounded-full border border-slate-100 hover:bg-slate-50 transition-all font-black text-[10px] uppercase tracking-widest shadow-sm"
              >
                <Globe size={16} className="text-indigo-600" />
                {languages.find((l) => l.code === language)?.label}
              </button>

              {showLangMenu && (
                <div className="absolute top-full right-0 mt-4 bg-white border border-slate-100 rounded-[2rem] shadow-2xl z-50 p-4 min-w-[180px] animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="flex justify-between items-center px-4 py-2 border-b border-slate-50 mb-2">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                      {t("language")}
                    </span>
                    <button onClick={() => setShowLangMenu(false)}>
                      <X
                        size={14}
                        className="text-slate-300 hover:text-slate-600"
                      />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLanguage(lang.code);
                          setShowLangMenu(false);
                        }}
                        className={`px-4 py-3 text-left rounded-xl text-[11px] font-black tracking-tight transition-all flex items-center justify-between ${
                          language === lang.code
                            ? "bg-indigo-50 text-indigo-600"
                            : "text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        {lang.name}
                        {language === lang.code && (
                          <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center sm:items-end">
              <span className="text-3xl sm:text-5xl font-black tracking-tighter tabular-nums leading-none text-slate-900">
                {time.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] sm:tracking-[0.3em] mt-1">
                {time.toLocaleDateString([], {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 grid grid-cols-2 gap-4 sm:gap-8 lg:gap-12 mb-12 items-stretch">
          <MenuCard
            to="/check-in"
            icon={LogIn}
            title={t("checkIn")}
            subtitle={t("arrival")}
            color="indigo"
          />
          <MenuCard
            to="/check-out"
            icon={LogOut}
            title={t("checkOut")}
            subtitle={t("departure")}
            color="rose"
          />
          <MenuCard
            to="/logistics"
            icon={PackageCheck}
            title={t("logistics")}
            subtitle={t("couriers")}
            color="emerald"
          />
          <MenuCard
            to="/key-access"
            icon={Key}
            title={t("keyAccess")}
            subtitle={t("security")}
            color="amber"
          />
        </main>

        <div className="space-y-6 mb-12">
          {overdueAssets.length > 0 && (
            <div className="animate-in slide-in-from-bottom duration-700">
              <Link
                to="/logistics"
                className="flex items-center justify-between p-6 sm:p-10 bg-rose-500 rounded-[2.5rem] shadow-2xl shadow-rose-100 text-white group hover:bg-rose-600 transition-all border border-rose-400"
              >
                <div className="flex items-center gap-6 sm:gap-10">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md animate-pulse">
                    <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-3xl font-black tracking-tight">
                      Logistics Security Alert
                    </h3>
                    <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] opacity-80 mt-1">
                      {overdueAssets.length} Inter-campus transfer(s) exceeded
                      window
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="hidden sm:block text-[10px] font-black uppercase tracking-[0.2em]">
                    Synchronize Hub
                  </span>
                  <ArrowRight className="group-hover:translate-x-3 transition-transform" />
                </div>
              </Link>
            </div>
          )}

          {overdueKeys.length > 0 && (
            <div className="animate-in slide-in-from-bottom duration-700 delay-75">
              <Link
                to="/key-access"
                className="flex items-center justify-between p-6 sm:p-10 bg-amber-500 rounded-[2.5rem] shadow-2xl shadow-amber-100 text-white group hover:bg-amber-600 transition-all border border-amber-400"
              >
                <div className="flex items-center gap-6 sm:gap-10">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md animate-pulse">
                    <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-3xl font-black tracking-tight">
                      Security Token Caution
                    </h3>
                    <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] opacity-80 mt-1">
                      {overdueKeys.length} master key(s) not returned (Past
                      cutoff)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="hidden sm:block text-[10px] font-black uppercase tracking-[0.2em]">
                    Return Access
                  </span>
                  <ArrowRight className="group-hover:translate-x-3 transition-transform" />
                </div>
              </Link>
            </div>
          )}
        </div>

        {/* REPOSITIONED AND REDESIGNED SECURITY SESSION INDICATOR */}
        <div className="flex justify-center mb-16 animate-in slide-in-from-bottom-8 duration-1000">
          <div className="flex items-center gap-4 bg-white/70 backdrop-blur-xl border border-white/50 p-2 pl-2 pr-6 rounded-full shadow-[0_20px_40px_-10px_rgba(0,0,0,0.05)] group hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.08)] transition-all duration-500 border-indigo-50">
            <div className="relative">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0 bg-slate-100 transition-transform group-hover:scale-105 duration-500">
                {securitySession.photo ? (
                  <img
                    src={securitySession.photo}
                    className="w-full h-full object-cover"
                    alt="Officer"
                  />
                ) : (
                  <User size={20} className="m-auto text-slate-400" />
                )}
              </div>
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                <div className="w-1 h-1 bg-white rounded-full animate-ping"></div>
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest leading-none">
                  {securitySession.name}
                </p>
                <div className="h-1 w-1 bg-slate-200 rounded-full"></div>
                <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest leading-none">
                  Officer
                </p>
              </div>
              <div className="flex items-center gap-3 mt-1.5 opacity-60">
                <div className="flex items-center gap-1.5">
                  <MapPin size={10} className="text-slate-400" />
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.1em] leading-none">
                    {securitySession.station || "Main Station"}
                  </p>
                </div>
                <div className="w-[1px] h-2 bg-slate-200"></div>
                <div className="flex items-center gap-1.5">
                  <Activity size={10} className="text-slate-400" />
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.1em] leading-none">
                    On-Duty
                  </p>
                </div>
              </div>
            </div>

            <div className="w-[1px] h-8 bg-slate-100 mx-4"></div>

            <button
              onClick={handleEndSession}
              className="group/logout flex items-center gap-2 px-4 py-2 rounded-full hover:bg-rose-50 transition-all active:scale-95 border border-transparent hover:border-rose-100"
              title="End Duty Session"
            >
              <LogOut
                size={16}
                className="text-slate-400 group-hover/logout:text-rose-500 transition-colors"
              />
              <span className="text-[9px] font-black text-slate-400 group-hover/logout:text-rose-500 uppercase tracking-[0.2em] transition-colors">
                Logout
              </span>
            </button>
          </div>
        </div>

        <footer className="flex flex-col gap-8 pt-8 border-t border-slate-200 mt-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
              <Link
                to="/admin-login"
                className="flex items-center gap-4 text-slate-400 hover:text-indigo-600 transition-colors group"
              >
                <div className="w-11 h-11 rounded-full border border-slate-200 flex items-center justify-center group-hover:bg-indigo-50 group-hover:border-indigo-200 transition-all shadow-sm bg-white">
                  <Settings size={20} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                  System Admin
                </span>
              </Link>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-12">
              {overdueCount > 0 && (
                <div className="flex items-center gap-2 text-amber-500 animate-pulse">
                  <AlertCircle size={14} />
                  <span className="text-[8px] font-black uppercase tracking-widest">
                    {overdueCount} Active Visits
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-slate-400">
                <Clock size={14} />
                <span className="text-[8px] font-black uppercase tracking-widest tabular-nums">
                  Verified Registry Protocol v3.14.2
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center space-y-2 pb-4 opacity-30">
            <div className="flex items-center gap-3">
              <div className="h-[1px] w-8 bg-slate-300"></div>
              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-600">
                &copy; {currentYear} {config.companyName}
              </p>
              <div className="h-[1px] w-8 bg-slate-300"></div>
            </div>
            <p className="text-[7px] font-bold uppercase tracking-[0.6em] text-slate-500">
              Terminal Authorization Active // Confidential Registry
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

const MenuCard = ({ to, icon: Icon, title, subtitle, color }: any) => {
  const themes: any = {
    indigo:
      "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100 border-indigo-500",
    rose: "bg-white hover:bg-slate-50 shadow-slate-200 border-slate-100",
    emerald:
      "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100 border-emerald-500",
    amber: "bg-amber-500 hover:bg-amber-600 shadow-amber-100 border-amber-400",
  };

  const textColors: any = {
    indigo: "text-white",
    rose: "text-slate-900",
    emerald: "text-white",
    amber: "text-white",
  };

  const subtitleColors: any = {
    indigo: "text-indigo-200",
    rose: "text-slate-400",
    emerald: "text-emerald-200",
    amber: "text-amber-100",
  };

  const iconBg: any = {
    indigo:
      "bg-white/10 group-hover:bg-white text-white group-hover:text-indigo-600",
    rose: "bg-slate-50 group-hover:bg-indigo-600 text-slate-400 group-hover:text-white",
    emerald:
      "bg-white/10 group-hover:bg-white text-white group-hover:text-emerald-600",
    amber:
      "bg-white/10 group-hover:bg-white text-white group-hover:text-amber-500",
  };

  return (
    <Link
      to={to}
      className={`${themes[color]} ${textColors[color]} p-6 sm:p-12 rounded-[3rem] sm:rounded-[4.5rem] flex flex-col justify-between group transition-all hover:-translate-y-2 shadow-2xl active:scale-95 duration-500 h-full min-h-[160px] sm:min-h-[280px] relative overflow-hidden border-2`}
    >
      <div className="flex justify-between items-start">
        <div
          className={`w-12 h-12 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center backdrop-blur-md transition-all duration-500 shadow-sm ${iconBg[color]}`}
        >
          <Icon className="w-6 h-6 sm:w-10 sm:h-10" />
        </div>
        <div
          className={`w-10 h-10 rounded-full border border-current opacity-10 flex items-center justify-center group-hover:opacity-100 group-hover:bg-current transition-all duration-500`}
        >
          <ChevronRight className={`w-5 h-5 group-hover:invert`} />
        </div>
      </div>

      <div className="mt-4 sm:mt-0">
        <h2 className="text-xl sm:text-4xl font-black tracking-tight mb-1 sm:mb-2">
          {title}
        </h2>
        <p
          className={`text-[7px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.4em] ${subtitleColors[color]}`}
        >
          {subtitle}
        </p>
      </div>
    </Link>
  );
};

export default KioskHome;
