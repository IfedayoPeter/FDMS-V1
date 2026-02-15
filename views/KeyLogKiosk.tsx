import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Key,
  User,
  Search,
  Check,
  AlertCircle,
  RefreshCw,
  UserCheck,
  ChevronRight,
  Briefcase,
  X,
  ChevronDown,
  ShieldCheck,
  Camera,
  MapPin,
  Clock,
  Hammer,
  AlertTriangle,
  FileEdit,
  Loader2,
  Globe,
  BadgeCheck,
  Shield,
} from "lucide-react";
import {
  KeyAsset,
  Host,
  KeyLog,
  CreateKeyLogDto,
  UpdateKeyLogDto,
  SystemSettings,
  NotificationLog,
  SecurityOfficer,
} from "../types";
import { workspaceService } from "../services/workspaceService";
import apiService from "../services/apiService";
import {
  ensureApiSuccess,
  getApiContent,
  getApiErrorMessage,
} from "../services/apiResponse";
import ErrorBanner from "./components/ErrorBanner";
import Toast from "./components/Toast";

type Mode =
  | "selection"
  | "checkout"
  | "return-select"
  | "return-form"
  | "photo-verify"
  | "success";

const KeyLogKiosk: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("selection");
  const [securitySession, setSecuritySession] = useState<any>(null);

  const [availableKeys, setAvailableKeys] = useState<KeyAsset[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [officers, setOfficers] = useState<SecurityOfficer[]>([]);
  const [activeLogs, setActiveLogs] = useState<KeyLog[]>([]);
  const [borrowingReasons, setBorrowingReasons] = useState<string[]>([]);

  // Shared state
  const [error, setError] = useState("");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [lastFormStep, setLastFormStep] = useState<
    "checkout" | "return" | null
  >(null);
  const [isSendingNotifications, setIsSendingNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState("");

  // Borrowing Form State
  const [selectedKey, setSelectedKey] = useState<KeyAsset | null>(null);
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [selectedOfficer, setSelectedOfficer] =
    useState<SecurityOfficer | null>(null);
  const [keySearch, setKeySearch] = useState("");
  const [hostSearch, setHostSearch] = useState("");
  const [officerSearch, setOfficerSearch] = useState("");
  const [purpose, setPurpose] = useState("");

  // Returning State
  const [logSearch, setLogSearch] = useState("");
  const [selectedLogForReturn, setSelectedLogForReturn] =
    useState<KeyLog | null>(null);
  const [returnerSearch, setReturnerSearch] = useState("");
  const [selectedReturnerHost, setSelectedReturnerHost] = useState<Host | null>(
    null,
  );
  const [returnCondition, setReturnCondition] = useState<
    "Good" | "Damaged" | "Needs Service"
  >("Good");
  const [maintenanceNotes, setMaintenanceNotes] = useState("");

  // UI Search Results Visibility
  const [showKeyResults, setShowKeyResults] = useState(false);
  const [showHostResults, setShowHostResults] = useState(false);
  const [showOfficerResults, setShowOfficerResults] = useState(false);
  const [showReturnerResults, setShowReturnerResults] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const hostResultsRef = useRef<HTMLDivElement>(null);
  const keyResultsRef = useRef<HTMLDivElement>(null);
  const officerResultsRef = useRef<HTMLDivElement>(null);
  const returnerResultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Session check
    const sess = localStorage.getItem("securitySession");
    if (!sess) {
      navigate("/security-login?redirect=/key-access");
      return;
    }
    const parsedSess = JSON.parse(sess);
    setSecuritySession(parsedSess);

    const loadData = async () => {
      try {
        // Load keys from API
        const keysResponse = await apiService.keyAsset.getAll();
        setAvailableKeys(
          getApiContent(keysResponse, [], "key assets"),
        );

        // Load hosts from API
        const hostsResponse = await apiService.host.getAll();
        setHosts(getApiContent(hostsResponse, [], "hosts"));

        // Load active key logs from API
        const logsResponse = await apiService.keyLog.getAll({
          filter: "status=Out",
        });
        setActiveLogs(getApiContent(logsResponse, [], "key logs"));

        // Load security officers from API
        const offResponse = await apiService.securityOfficer.getAll({
          filter: "status:Active",
        });
        const officerList = getApiContent<SecurityOfficer[]>(
          offResponse,
          [],
          "security officers",
        );
        setOfficers(officerList);
        const current = officerList.find(
          (o: SecurityOfficer) => o.id === parsedSess.officerId,
        );
        if (current) setSelectedOfficer(current);
      } catch (e) {
        console.error("Failed to load key log data", e);
      }
    };

    loadData();

    // Borrowing reasons (could also come from API)
    const reasonsList = [
      "Cleaning",
      "Scheduled Meeting",
      "Tutorials/Lecture",
      "Training",
      "Office Use",
      "Examination",
      "Rehearsal",
    ];
    setBorrowingReasons(reasonsList);
    if (reasonsList.length > 0) setPurpose(reasonsList[0]);

    const handleClickOutside = (e: MouseEvent) => {
      if (
        hostResultsRef.current &&
        !hostResultsRef.current.contains(e.target as Node)
      )
        setShowHostResults(false);
      if (
        keyResultsRef.current &&
        !keyResultsRef.current.contains(e.target as Node)
      )
        setShowKeyResults(false);
      if (
        officerResultsRef.current &&
        !officerResultsRef.current.contains(e.target as Node)
      )
        setShowOfficerResults(false);
      if (
        returnerResultsRef.current &&
        !returnerResultsRef.current.contains(e.target as Node)
      )
        setShowReturnerResults(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [navigate]);

  useEffect(() => {
    if (!notificationError) return;
    const timer = setTimeout(() => setNotificationError(""), 5000);
    return () => clearTimeout(timer);
  }, [notificationError]);

  useEffect(() => {
    if (mode === "photo-verify" && !capturedImage) startCamera();
    return () => stopCamera();
  }, [mode, capturedImage]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      setError("Camera access is mandatory for security verification.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0);
        setCapturedImage(canvasRef.current.toDataURL("image/jpeg"));
        stopCamera();
      }
    }
  };

  const finalizeAction = async () => {
    setIsSendingNotifications(true);
    setMode("success");

    try {
      // Load settings from API for notification templates
      const settingsResponse = await apiService.settings.getAll();
      const settings = getApiContent<SystemSettings | null>(
        settingsResponse,
        null,
        "settings",
      );
      const sender =
        settings?.kiosk?.senderEmail || "notifications@system.com";
      const now = new Date();

      if (
        lastFormStep === "checkout" &&
        selectedKey &&
        selectedHost &&
        selectedOfficer
      ) {
        // Create key checkout via API
        const checkoutData: CreateKeyLogDto = {
          keyId: String(selectedKey.id),
          keyNumber: selectedKey.keyNumber,
          keyName: selectedKey.keyName,
          borrower: String(selectedHost.id),
          borrowerName: selectedHost.fullName,
          purpose,
          checkoutSecurityName: selectedOfficer.fullName,
          photo: capturedImage || undefined,
          processedBy: securitySession?.name,
          borrowedAt: now.toISOString(),
          status: "Out",
        };

        const response = await apiService.keyLog.checkout(checkoutData);
        ensureApiSuccess(response, "Failed to checkout key");

        // Send notifications via API
        if (settings?.notificationsEnabled) {
          try {
            const replaceVars = (template: string) => {
              return (template || "")
                .replace(/{{borrower_name}}/g, selectedHost.fullName)
                .replace(/{{key_name}}/g, selectedKey.keyName)
                .replace(/{{key_number}}/g, selectedKey.keyNumber)
                .replace(/{{purpose}}/g, purpose)
                .replace(/{{security_name}}/g, selectedOfficer.fullName)
                .replace(
                  /{{company_name}}/g,
                  settings.kiosk?.companyName || "The Company",
                )
                .replace(/{{time}}/g, now.toLocaleTimeString());
            };

            const hostMsg = replaceVars(settings.hostKeyCheckoutTemplate);

            // Send Google Chat notification if enabled
            if (
              settings.workspace?.enabled &&
              settings.workspace?.chatNotificationsEnabled
            ) {
              await workspaceService.sendChatMessage(
                selectedHost,
                hostMsg,
                settings,
              );
              const response = await apiService.notificationLog.create({
                visitorName: selectedHost.fullName,
                hostName: "Security Hub",
                recipient: selectedHost.fullName,
                sender,
                recipientRole: "Host",
                trigger: "Key Checkout",
                message: hostMsg,
                status: "Sent",
                channel: "Google Chat",
              });
              ensureApiSuccess(response, "Failed to log notification");
            }

            // Send email notifications
            const response = await apiService.notificationLog.create({
              visitorName: selectedHost.fullName,
              hostName: "Security Hub",
              recipient: selectedHost.email,
              sender,
              recipientRole: "Host",
              trigger: "Key Checkout",
              message: hostMsg,
              status: "Sent",
              channel: "Email",
            });
            ensureApiSuccess(response, "Failed to log notification");

            const response2 = await apiService.notificationLog.create({
              visitorName: selectedHost.fullName,
              hostName: "Security Hub",
              recipient: selectedHost.email,
              sender,
              recipientRole: "Borrower",
              trigger: "Key Checkout",
              message: replaceVars(settings.borrowerKeyCheckoutTemplate),
              status: "Sent",
              channel: "Email",
            });
            ensureApiSuccess(response2, "Failed to log notification");
          } catch (err) {
            console.error("Failed to send key checkout notifications", err);
            setNotificationError(
              getApiErrorMessage(err, "Notifications failed to send."),
            );
          }
        }
      } else if (
        lastFormStep === "return" &&
        selectedLogForReturn &&
        selectedReturnerHost &&
        selectedOfficer
      ) {
        // Return key via API
        const returnData: UpdateKeyLogDto = {
          keyId: String(selectedLogForReturn.keyId),
          keyNumber: selectedLogForReturn.keyNumber,
          keyName: selectedLogForReturn.keyName,
          borrower: String(selectedLogForReturn.borrower),
          borrowerName: selectedLogForReturn.borrowerName,
          purpose: selectedLogForReturn.purpose,
          checkoutSecurityName: selectedLogForReturn.checkoutSecurityName,
          photo: selectedLogForReturn.photo,
          borrowedAt: selectedLogForReturn.borrowedAt,
          status: "Returned",
          returnedAt: now.toISOString(),
          returnerName: selectedReturnerHost.fullName,
          returnSecurityName: selectedOfficer.fullName,
          condition: returnCondition,
          maintenanceNotes: maintenanceNotes || undefined,
          returnPhoto: capturedImage || undefined,
          processedBy: securitySession?.name || selectedOfficer.fullName,
        };

        const response = await apiService.keyLog.return(
          selectedLogForReturn.id,
          returnData,
        );
        ensureApiSuccess(response, "Failed to return key");

        // Send notifications via API
        if (settings?.notificationsEnabled) {
          try {
            const replaceVars = (template: string) => {
              return (template || "")
                .replace(/{{returner_name}}/g, selectedReturnerHost.fullName)
                .replace(/{{key_name}}/g, selectedLogForReturn.keyName)
                .replace(/{{key_number}}/g, selectedLogForReturn.keyNumber)
                .replace(/{{condition}}/g, returnCondition)
                .replace(/{{security_name}}/g, selectedOfficer.fullName)
                .replace(
                  /{{company_name}}/g,
                  settings.kiosk?.companyName || "The Company",
                )
                .replace(/{{time}}/g, now.toLocaleTimeString());
            };

            const hostMsg = replaceVars(settings.hostKeyReturnTemplate);

            // Send Google Chat notification if enabled
            if (
              settings.workspace?.enabled &&
              settings.workspace?.chatNotificationsEnabled
            ) {
              await workspaceService.sendChatMessage(
                selectedReturnerHost,
                hostMsg,
                settings,
              );
              const response = await apiService.notificationLog.create({
                visitorName: selectedReturnerHost.fullName,
                hostName: "Security Hub",
                recipient: selectedReturnerHost.fullName,
                sender,
                recipientRole: "Host",
                trigger: "Key Return",
                message: hostMsg,
                status: "Sent",
                channel: "Google Chat",
              });
              ensureApiSuccess(response, "Failed to log notification");
            }

            // Send email notifications
            const response = await apiService.notificationLog.create({
              visitorName: selectedReturnerHost.fullName,
              hostName: "Security Hub",
              recipient: selectedReturnerHost.email,
              sender,
              recipientRole: "Host",
              trigger: "Key Return",
              message: hostMsg,
              status: "Sent",
              channel: "Email",
            });
            ensureApiSuccess(response, "Failed to log notification");

            const response2 = await apiService.notificationLog.create({
              visitorName: selectedReturnerHost.fullName,
              hostName: "Security Hub",
              recipient: selectedReturnerHost.email,
              sender,
              recipientRole: "Borrower",
              trigger: "Key Return",
              message: replaceVars(settings.borrowerKeyReturnTemplate),
              status: "Sent",
              channel: "Email",
            });
            ensureApiSuccess(response2, "Failed to log notification");
          } catch (err) {
            console.error("Failed to send key return notifications", err);
            setNotificationError(
              getApiErrorMessage(err, "Notifications failed to send."),
            );
          }
        }
      }

      setIsSendingNotifications(false);
      setTimeout(() => navigate("/"), 3000);
    } catch (err) {
      console.error("Failed to finalize key action:", err);
      setError(getApiErrorMessage(err, "Failed to complete action."));
      setIsSendingNotifications(false);
    }
  };

  const getFilteredHosts = (query: string) => {
    if (!query) return hosts.slice(0, 5);
    return hosts
      .filter((h) => h.fullName.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 10);
  };

  const getFilteredOfficers = (query: string) => {
    if (!query) return officers.slice(0, 5);
    return officers
      .filter(
        (o) =>
          o.fullName.toLowerCase().includes(query.toLowerCase()) ||
          o.badgeId.toLowerCase().includes(query.toLowerCase()),
      )
      .slice(0, 10);
  };

  const getFilteredKeys = (query: string) => {
    const available = availableKeys.filter(
      (k) => !activeLogs.some((l) => l.keyId === k.id),
    );
    if (!query) return available.slice(0, 5);
    return available
      .filter(
        (k) =>
          k.keyName.toLowerCase().includes(query.toLowerCase()) ||
          k.keyNumber.toLowerCase().includes(query.toLowerCase()),
      )
      .slice(0, 10);
  };

  const getFilteredReturnLogs = (query: string) => {
    if (!query) return activeLogs.slice(0, 5);
    return activeLogs
      .filter(
        (l) =>
          l.keyName.toLowerCase().includes(query.toLowerCase()) ||
          l.keyNumber.toLowerCase().includes(query.toLowerCase()) ||
          l.borrowerName.toLowerCase().includes(query.toLowerCase()),
      )
      .slice(0, 10);
  };

  const isKeyOverdue = (borrowedAt: string) => {
    const now = new Date();
    const borrowedDate = new Date(borrowedAt);
    const todayStr = now.toDateString();
    const currentHour = now.getHours();
    return borrowedDate.toDateString() !== todayStr || currentHour >= 18;
  };

  if (mode === "selection") {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-12 font-sans relative overflow-hidden">
        <Toast
          message={notificationError}
          onClose={() => setNotificationError("")}
        />
        <div className="absolute top-0 right-0 w-[50vw] h-[50vh] bg-amber-50/50 rounded-bl-[100%] -z-10 blur-3xl opacity-50"></div>
        <button
          onClick={() => navigate("/")}
          className="absolute top-16 left-16 flex items-center gap-4 text-slate-400 hover:text-amber-600 font-black uppercase tracking-[0.3em] text-[10px] transition-colors"
        >
          <ArrowLeft size={16} /> Back Home
        </button>
        <div className="text-center mb-24">
          <h1 className="text-6xl font-black text-slate-900 tracking-tight mb-6">
            Key Inventory
          </h1>
          <div className="flex items-center justify-center gap-4 text-slate-500 text-xl font-medium opacity-60">
            <Shield size={24} className="text-amber-500" />
            <span>
              Active Security Session:{" "}
              <span className="text-slate-800 font-black">
                {securitySession?.name}
              </span>
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-6xl w-full">
          <SelectionCard
            icon={Key}
            title="Borrow Key"
            desc="Initiate Asset Session"
            color="amber"
            onClick={() => {
              setMode("checkout");
              setCapturedImage(null);
            }}
          />
          <SelectionCard
            icon={RefreshCw}
            title="Return Key"
            desc="Close Active Session"
            color="emerald"
            onClick={() => {
              setMode("return-select");
              setCapturedImage(null);
              setReturnCondition("Good");
              setMaintenanceNotes("");
            }}
          />
        </div>
      </div>
    );
  }

  if (mode === "checkout") {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-12 md:p-24 overflow-y-auto font-sans">
        <Toast
          message={notificationError}
          onClose={() => setNotificationError("")}
        />
        <button
          onClick={() => setMode("selection")}
          className="flex items-center gap-4 text-slate-400 hover:text-amber-600 font-black uppercase tracking-[0.3em] text-[10px] transition-colors mb-20"
        >
          <ArrowLeft size={16} /> Key Menu
        </button>
        <div className="max-w-4xl mx-auto bg-white rounded-[4rem] shadow-2xl overflow-hidden border border-slate-100 animate-in slide-in-from-bottom-8 duration-500">
          <div className="bg-amber-600 p-16 text-white text-center">
            <h2 className="text-4xl font-black tracking-tight">
              Access Checkout
            </h2>
            <p className="opacity-50 mt-4 text-[10px] font-black uppercase tracking-[0.4em]">
              Audit Trail Protocol // Session Startup
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (selectedKey && selectedHost && selectedOfficer) {
                setLastFormStep("checkout");
                setMode("photo-verify");
              }
            }}
            className="p-16 space-y-12"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="relative space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
                  Select Key to Borrow
                </label>
                <div className="relative group">
                  <Key className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 transition-colors group-focus-within:text-amber-500" />
                  <input
                    required
                    placeholder="Search by name or number..."
                    className="w-full pl-16 pr-14 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-4 focus:ring-amber-500/10 focus:bg-white focus:border-amber-300 outline-none font-bold text-xl transition-all"
                    value={
                      selectedKey
                        ? `${selectedKey.keyNumber} • ${selectedKey.keyName}`
                        : keySearch
                    }
                    onFocus={() => setShowKeyResults(true)}
                    onChange={(e) => {
                      setKeySearch(e.target.value);
                      setSelectedKey(null);
                      setShowKeyResults(true);
                    }}
                    autoComplete="off"
                  />
                  {selectedKey && (
                    <X
                      className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 cursor-pointer"
                      onClick={() => setSelectedKey(null)}
                    />
                  )}
                </div>
                {showKeyResults && (
                  <div
                    ref={keyResultsRef}
                    className="absolute z-50 w-full mt-4 bg-white border border-slate-100 rounded-[3rem] shadow-2xl overflow-hidden max-h-[250px] overflow-y-auto animate-in fade-in slide-in-from-top-4 duration-300"
                  >
                    {getFilteredKeys(keySearch).map((key) => (
                      <button
                        key={key.id}
                        type="button"
                        className="w-full px-10 py-6 text-left hover:bg-amber-50 border-b border-slate-50 last:border-0 flex items-center justify-between group transition-all"
                        onClick={() => {
                          setSelectedKey(key);
                          setShowKeyResults(false);
                        }}
                      >
                        <div className="flex flex-col">
                          <p className="font-black text-slate-800 text-lg group-hover:text-amber-600 transition-colors">
                            {key.keyNumber} • {key.keyName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
                            L{key.floor} • BLOCK {key.block}
                          </p>
                        </div>
                        <Check className="w-6 h-6 text-amber-500 opacity-0 group-hover:opacity-100 transition-all" />
                      </button>
                    ))}
                    {getFilteredKeys(keySearch).length === 0 && (
                      <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                        No keys available
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="relative space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
                  Staff Member Borrowing
                </label>
                <div className="relative group">
                  <UserCheck className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 transition-colors group-focus-within:text-amber-500" />
                  <input
                    required
                    placeholder="Search staff list..."
                    className="w-full pl-16 pr-14 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-4 focus:ring-amber-500/10 focus:bg-white focus:border-indigo-300 outline-none font-bold text-xl transition-all"
                    value={selectedHost ? selectedHost.fullName : hostSearch}
                    onFocus={() => setShowHostResults(true)}
                    onChange={(e) => {
                      setHostSearch(e.target.value);
                      setSelectedHost(null);
                      setShowHostResults(true);
                    }}
                    autoComplete="off"
                  />
                  {selectedHost && (
                    <X
                      className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 cursor-pointer"
                      onClick={() => setSelectedHost(null)}
                    />
                  )}
                </div>
                {showHostResults && (
                  <div
                    ref={hostResultsRef}
                    className="absolute z-50 w-full mt-4 bg-white border border-slate-100 rounded-[3rem] shadow-2xl overflow-hidden max-h-[250px] overflow-y-auto animate-in fade-in slide-in-from-top-4 duration-300"
                  >
                    {getFilteredHosts(hostSearch).map((host) => (
                      <button
                        key={host.id}
                        type="button"
                        className="w-full px-10 py-6 text-left hover:bg-amber-50 border-b border-slate-50 last:border-0 flex items-center justify-between group transition-all"
                        onClick={() => {
                          setSelectedHost(host);
                          setShowHostResults(false);
                        }}
                      >
                        <div className="flex flex-col">
                          <p className="font-black text-slate-800 text-lg group-hover:text-amber-600 transition-colors">
                            {host.fullName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
                            {host.department}
                          </p>
                        </div>
                        <Check className="w-6 h-6 text-amber-500 opacity-0 group-hover:opacity-100 transition-all" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
                  Reason for Access
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 pointer-events-none" />
                  <select
                    className="w-full pl-16 pr-14 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-4 focus:ring-amber-500/10 focus:bg-white focus:border-amber-300 outline-none font-bold text-xl appearance-none cursor-pointer transition-all"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                  >
                    {borrowingReasons.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 pointer-events-none" />
                </div>
              </div>

              <div className="relative space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
                  Security Officer (Witness)
                </label>
                <div className="relative group">
                  <BadgeCheck className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 transition-colors group-focus-within:text-amber-500" />
                  <input
                    required
                    placeholder="Search security officer..."
                    className="w-full pl-16 pr-14 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-4 focus:ring-amber-500/10 focus:bg-white focus:border-amber-300 outline-none font-bold text-xl transition-all"
                    value={
                      selectedOfficer ? selectedOfficer.fullName : officerSearch
                    }
                    onFocus={() => setShowOfficerResults(true)}
                    onChange={(e) => {
                      setOfficerSearch(e.target.value);
                      setSelectedOfficer(null);
                      setShowOfficerResults(true);
                    }}
                    autoComplete="off"
                  />
                  {selectedOfficer && (
                    <X
                      className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 cursor-pointer"
                      onClick={() => setSelectedOfficer(null)}
                    />
                  )}
                </div>
                {showOfficerResults && (
                  <div
                    ref={officerResultsRef}
                    className="absolute z-50 w-full mt-4 bg-white border border-slate-100 rounded-[3rem] shadow-2xl overflow-hidden max-h-[250px] overflow-y-auto animate-in fade-in slide-in-from-top-4 duration-300"
                  >
                    {getFilteredOfficers(officerSearch).map((off) => (
                      <button
                        key={off.id}
                        type="button"
                        className="w-full px-10 py-6 text-left hover:bg-amber-50 border-b border-slate-50 last:border-0 flex items-center justify-between group transition-all"
                        onClick={() => {
                          setSelectedOfficer(off);
                          setShowOfficerResults(false);
                        }}
                      >
                        <div className="flex flex-col">
                          <p className="font-black text-slate-800 text-lg group-hover:text-amber-600 transition-colors">
                            {off.fullName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
                            Badge ID: {off.badgeId}
                          </p>
                        </div>
                        <Check className="w-6 h-6 text-amber-500 opacity-0 group-hover:opacity-100 transition-all" />
                      </button>
                    ))}
                    {getFilteredOfficers(officerSearch).length === 0 && (
                      <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                        No active officers found
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-12 border-t border-slate-50">
              <button
                type="submit"
                disabled={!selectedKey || !selectedHost || !selectedOfficer}
                className="w-full py-10 rounded-[2.5rem] bg-amber-600 hover:bg-amber-700 font-black text-2xl text-white shadow-2xl shadow-amber-100 transition-all active:scale-[0.98] disabled:opacity-20"
              >
                Proceed to Photo Verification
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (mode === "return-select") {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-12 md:p-24 overflow-y-auto font-sans">
        <Toast
          message={notificationError}
          onClose={() => setNotificationError("")}
        />
        <button
          onClick={() => setMode("selection")}
          className="flex items-center gap-4 text-slate-400 hover:text-emerald-600 font-black uppercase tracking-[0.3em] text-[10px] transition-colors mb-20"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="max-w-3xl mx-auto bg-white rounded-[4rem] shadow-2xl overflow-hidden border border-slate-100 animate-in slide-in-from-bottom-8 duration-500">
          <div className="bg-emerald-600 p-16 text-white text-center">
            <h2 className="text-4xl font-black tracking-tight">Key Return</h2>
            <p className="opacity-50 mt-4 text-[10px] font-black uppercase tracking-[0.4em]">
              Search active log by key details
            </p>
          </div>
          <div className="p-16 space-y-12">
            <div className="relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 w-6 h-6 group-focus-within:text-emerald-500 transition-colors" />
              <input
                placeholder="Search Key Name, # or Borrower..."
                className="w-full pl-16 pr-6 py-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] outline-none font-black text-xl transition-all"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
              />
            </div>
            <div className="space-y-6 pt-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-2">
                Active Checkouts
              </p>
              {getFilteredReturnLogs(logSearch).map((log) => {
                const overdue = isKeyOverdue(log.borrowedAt);
                return (
                  <button
                    key={log.id}
                    onClick={() => {
                      setSelectedLogForReturn(log);
                      setMode("return-form");
                    }}
                    className={`w-full flex justify-between items-center p-10 border rounded-[3rem] transition-all text-left group shadow-sm ${
                      overdue
                        ? "bg-amber-50 border-amber-200 hover:bg-amber-100"
                        : "bg-slate-50/50 border-slate-50 hover:bg-emerald-50 hover:border-emerald-200"
                    }`}
                  >
                    <div className="flex gap-8 items-center">
                      <div
                        className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm ${overdue ? "bg-amber-500 text-white animate-pulse" : "bg-white text-emerald-600"}`}
                      >
                        {overdue ? (
                          <AlertCircle size={32} />
                        ) : (
                          <Key size={32} />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-2xl text-slate-800 tracking-tight block">
                            {log.keyNumber} • {log.keyName}
                          </span>
                          {overdue && (
                            <span className="bg-amber-600 text-white text-[8px] font-black uppercase px-2 py-1 rounded-full flex items-center gap-1">
                              <Clock size={10} /> Overdue (Past 18:00)
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2 block flex items-center gap-2">
                          <User size={12} /> Held by {log.borrowerName}
                        </span>
                      </div>
                    </div>
                    <ChevronRight
                      className={`group-hover:translate-x-2 transition-all ${overdue ? "text-amber-500" : "text-slate-200 group-hover:text-emerald-500"}`}
                      size={32}
                    />
                  </button>
                );
              })}
              {activeLogs.length === 0 && (
                <div className="text-center py-24 text-slate-300 font-black uppercase tracking-widest text-[10px] border-2 border-dashed border-slate-100 rounded-[4rem]">
                  No keys currently on loan
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "return-form") {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-12 md:p-24 overflow-y-auto font-sans">
        <Toast
          message={notificationError}
          onClose={() => setNotificationError("")}
        />
        <button
          onClick={() => setMode("return-select")}
          className="flex items-center gap-4 text-slate-400 hover:text-emerald-600 font-black uppercase tracking-[0.3em] text-[10px] transition-colors mb-20"
        >
          <ArrowLeft size={16} /> Back to Selection
        </button>
        <div className="max-w-4xl mx-auto bg-white rounded-[4rem] shadow-2xl overflow-hidden border border-slate-100 animate-in slide-in-from-bottom-8 duration-500">
          <div className="bg-emerald-600 p-16 text-white text-center">
            <h2 className="text-4xl font-black tracking-tight">
              Return Synchronization
            </h2>
            <p className="opacity-50 mt-4 text-[10px] font-black uppercase tracking-[0.4em]">
              Protocol ID: {selectedLogForReturn?.id}
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (selectedReturnerHost && selectedOfficer) {
                setLastFormStep("return");
                setMode("photo-verify");
              }
            }}
            className="p-16 space-y-12"
          >
            <div className="p-8 bg-slate-50 rounded-[3rem] border border-slate-100 flex items-center gap-8">
              <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center text-emerald-600 shadow-sm">
                <Key size={36} />
              </div>
              <div>
                <p className="text-3xl font-black text-slate-800 tracking-tight">
                  {selectedLogForReturn?.keyNumber} •{" "}
                  {selectedLogForReturn?.keyName}
                </p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">
                  Currently Loaned to {selectedLogForReturn?.borrowerName}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="relative space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
                  Staff Member Returning Key
                </label>
                <div className="relative group">
                  <UserCheck className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 transition-colors group-focus-within:text-emerald-500" />
                  <input
                    required
                    placeholder="Search staff list..."
                    className="w-full pl-16 pr-14 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-4 focus:ring-emerald-500/10 focus:bg-white focus:border-emerald-300 outline-none font-bold text-xl transition-all"
                    value={
                      selectedReturnerHost
                        ? selectedReturnerHost.fullName
                        : returnerSearch
                    }
                    onFocus={() => setShowReturnerResults(true)}
                    onChange={(e) => {
                      setReturnerSearch(e.target.value);
                      setSelectedReturnerHost(null);
                      setShowReturnerResults(true);
                    }}
                    autoComplete="off"
                  />
                  {selectedReturnerHost && (
                    <X
                      className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 cursor-pointer"
                      onClick={() => setSelectedReturnerHost(null)}
                    />
                  )}
                </div>
                {showReturnerResults && (
                  <div
                    ref={returnerResultsRef}
                    className="absolute z-50 w-full mt-4 bg-white border border-slate-100 rounded-[3rem] shadow-2xl overflow-hidden max-h-[250px] overflow-y-auto animate-in fade-in slide-in-from-top-4 duration-300"
                  >
                    {getFilteredHosts(returnerSearch).map((host) => (
                      <button
                        key={host.id}
                        type="button"
                        className="w-full px-10 py-6 text-left hover:bg-emerald-50 border-b border-slate-50 last:border-0 flex items-center justify-between group transition-all"
                        onClick={() => {
                          setSelectedReturnerHost(host);
                          setShowReturnerResults(false);
                        }}
                      >
                        <div className="flex flex-col">
                          <p className="font-black text-slate-800 text-lg group-hover:text-emerald-600 transition-colors">
                            {host.fullName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
                            {host.department}
                          </p>
                        </div>
                        <Check className="w-6 h-6 text-emerald-500 opacity-0 group-hover:opacity-100 transition-all" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
                  Security Officer (Witness)
                </label>
                <div className="relative group">
                  <BadgeCheck className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 transition-colors group-focus-within:text-emerald-500" />
                  <input
                    required
                    placeholder="Search security officer..."
                    className="w-full pl-16 pr-14 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-4 focus:ring-emerald-500/10 focus:bg-white focus:border-emerald-300 outline-none font-bold text-xl transition-all"
                    value={
                      selectedOfficer ? selectedOfficer.fullName : officerSearch
                    }
                    onFocus={() => setShowOfficerResults(true)}
                    onChange={(e) => {
                      setOfficerSearch(e.target.value);
                      setSelectedOfficer(null);
                      setShowOfficerResults(true);
                    }}
                    autoComplete="off"
                  />
                  {selectedOfficer && (
                    <X
                      className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 cursor-pointer"
                      onClick={() => setSelectedOfficer(null)}
                    />
                  )}
                </div>
                {showOfficerResults && (
                  <div
                    ref={officerResultsRef}
                    className="absolute z-50 w-full mt-4 bg-white border border-slate-100 rounded-[3rem] shadow-2xl overflow-hidden max-h-[250px] overflow-y-auto animate-in fade-in slide-in-from-top-4 duration-300"
                  >
                    {getFilteredOfficers(officerSearch).map((off) => (
                      <button
                        key={off.id}
                        type="button"
                        className="w-full px-10 py-6 text-left hover:bg-emerald-50 border-b border-slate-50 last:border-0 flex items-center justify-between group transition-all"
                        onClick={() => {
                          setSelectedOfficer(off);
                          setShowOfficerResults(false);
                        }}
                      >
                        <div className="flex flex-col">
                          <p className="font-black text-slate-800 text-lg group-hover:text-emerald-600 transition-colors">
                            {off.fullName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
                            Badge ID: {off.badgeId}
                          </p>
                        </div>
                        <Check className="w-6 h-6 text-emerald-500 opacity-0 group-hover:opacity-100 transition-all" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
                  Key Health & Condition
                </label>
                <div className="flex gap-4">
                  {[
                    { val: "Good", icon: Check, color: "emerald" },
                    { val: "Needs Service", icon: Hammer, color: "amber" },
                    { val: "Damaged", icon: AlertTriangle, color: "rose" },
                  ].map((cond: any) => (
                    <button
                      key={cond.val}
                      type="button"
                      onClick={() => setReturnCondition(cond.val)}
                      className={`flex-1 flex items-center justify-center gap-3 py-6 rounded-2xl border-2 transition-all font-black text-[10px] uppercase tracking-widest ${
                        returnCondition === cond.val
                          ? `bg-${cond.color}-50 border-${cond.color}-500 text-${cond.color}-700 shadow-inner`
                          : "bg-white border-slate-100 text-slate-400 hover:bg-slate-50"
                      }`}
                    >
                      <cond.icon size={16} />
                      {cond.val}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
                  Condition Notes (Optional)
                </label>
                <div className="relative group">
                  <FileEdit className="absolute left-6 top-6 w-5 h-5 text-slate-300 transition-colors group-focus-within:text-emerald-500" />
                  <textarea
                    placeholder="e.g. Key is slightly bent, keychain ring is loose..."
                    className="w-full pl-16 pr-6 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-4 focus:ring-emerald-500/10 focus:bg-white focus:border-emerald-300 outline-none font-bold text-lg min-h-[120px] transition-all resize-none"
                    value={maintenanceNotes}
                    onChange={(e) => setMaintenanceNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="pt-12 border-t border-slate-50">
              <button
                type="submit"
                disabled={
                  !selectedLogForReturn ||
                  !selectedReturnerHost ||
                  !selectedOfficer
                }
                className="w-full py-10 rounded-[2.5rem] bg-emerald-600 hover:bg-emerald-700 font-black text-2xl text-white shadow-2xl shadow-emerald-100 transition-all active:scale-[0.98] disabled:opacity-20"
              >
                Proceed to Photo Verification
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (mode === "photo-verify") {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-12 text-white font-sans overflow-hidden">
        <Toast
          message={notificationError}
          onClose={() => setNotificationError("")}
        />
        <div className="max-w-4xl w-full bg-white/5 rounded-[5rem] p-20 backdrop-blur-2xl border border-white/10 text-center space-y-16 shadow-2xl animate-in zoom-in-95 duration-500">
          <div>
            <h2 className="text-5xl font-black tracking-tight mb-4">
              Verification Evidence
            </h2>
            <p className="text-white/40 font-black uppercase tracking-[0.5em] text-xs">
              Security Synchronization protocol
            </p>
          </div>
          <div className="relative w-full aspect-video bg-black rounded-[4rem] overflow-hidden border-[12px] border-white/5 shadow-inner">
            {capturedImage ? (
              <img
                src={capturedImage}
                className="w-full h-full object-cover"
                alt="Captured"
              />
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
          <div className="flex gap-10 w-full max-w-2xl mx-auto">
            {!capturedImage ? (
              <button
                onClick={takePhoto}
                className="flex-grow bg-indigo-600 py-8 rounded-[2.5rem] font-black text-2xl flex items-center justify-center gap-6 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-900/50"
              >
                <Camera size={32} /> Capture Evidence
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    setCapturedImage(null);
                    startCamera();
                  }}
                  className="flex-1 bg-white/10 py-8 rounded-[2.5rem] font-black text-xl hover:bg-white/20 transition-all"
                >
                  Retake
                </button>
                <button
                  onClick={finalizeAction}
                  className="flex-1 bg-emerald-600 py-8 rounded-[2.5rem] font-black text-xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-900/50"
                >
                  Complete Sync
                </button>
              </>
            )}
          </div>
          <ErrorBanner message={error} />
        </div>
      </div>
    );
  }

  if (mode === "success") {
    return (
      <div className="min-h-screen bg-emerald-600 flex items-center justify-center text-white text-center p-12 font-sans overflow-hidden">
        <Toast
          message={notificationError}
          onClose={() => setNotificationError("")}
        />
        <div className="animate-in zoom-in duration-1000">
          <div className="w-48 h-48 bg-white/10 rounded-[5rem] flex items-center justify-center mx-auto mb-16 shadow-2xl border border-white/5 backdrop-blur-xl">
            {isSendingNotifications ? (
              <Loader2 className="w-24 h-24 animate-spin opacity-40" />
            ) : (
              <Check className="w-24 h-24" />
            )}
          </div>
          <h1 className="text-7xl font-black mb-6 tracking-tight">
            Access Logged
          </h1>
          <p className="text-3xl opacity-60 font-medium tracking-wide">
            {isSendingNotifications
              ? "Broadcasting security packets..."
              : "Identity and protocol verified. Registry updated."}
          </p>
          {!isSendingNotifications && (
            <div className="mt-16 max-w-2xl mx-auto flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <div className="flex items-center justify-center gap-3 bg-white/10 py-5 px-10 rounded-[2rem] border border-white/10 backdrop-blur-md">
                <Globe size={20} className="text-white" />
                <div className="text-left">
                  <span className="block text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
                    Security Hub Sync
                  </span>
                  <span className="text-xs font-black uppercase tracking-[0.1em]">
                    Verification receipt dispatched to staff
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

const SelectionCard = ({ icon: Icon, title, desc, color, onClick }: any) => (
  <button
    onClick={onClick}
    className={`bg-white p-24 rounded-[5rem] shadow-xl hover:shadow-2xl transition-all border border-slate-100 flex flex-col items-center group animate-in slide-in-from-bottom duration-1000 ${color === "amber" ? "hover:border-amber-500" : "hover:border-emerald-500"}`}
  >
    <div
      className={`w-40 h-40 ${color === "amber" ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"} rounded-[3rem] flex items-center justify-center group-hover:scale-110 transition-all duration-700 shadow-sm mb-12`}
    >
      <Icon size={64} />
    </div>
    <h2 className="text-5xl font-black text-slate-800 tracking-tight">
      {title}
    </h2>
    <p className="text-slate-400 mt-6 text-xl font-bold uppercase tracking-[0.2em]">
      {desc}
    </p>
  </button>
);

export default KeyLogKiosk;
