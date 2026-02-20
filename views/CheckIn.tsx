import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Building,
  Mail,
  UserCheck,
  Briefcase,
  Phone,
  AlertCircle,
  Camera,
  RefreshCw,
  Check,
  Search,
  GraduationCap,
  School,
  X,
  ChevronDown,
  ChevronRight,
  Zap,
  Eraser,
  Building2,
  Bell,
  Loader2,
  Globe,
  Calendar,
  Clock,
  Car,
  Timer,
  Users,
  Shield,
  Plus,
  Minus,
  UserPlus,
  Trash2,
} from "lucide-react";
import {
  Visitor,
  SystemSettings,
  Host,
  WatchlistEntry,
  SecurityAlert,
  NotificationLog,
} from "../types";
import { useLanguage } from "../LanguageContext";
import {
  workspaceService,
  HostAvailability,
} from "../services/workspaceService";
import apiService from "../services/apiService";
import {
  ensureApiSuccess,
  getApiContent,
  getApiErrorMessage,
} from "../services/apiResponse";
import ErrorBanner from "./components/ErrorBanner";
import Toast from "./components/Toast";

const DEFAULT_HOST_CI =
  "Hello {{host_name}}, your visitor {{visitor_name}} from {{company}} has arrived for {{purpose}} at {{time}} at the {{location}} campus.";
const DEFAULT_GUEST_CI =
  "Hi {{visitor_name}}, welcome to {{company}}! Your host {{host_name}} has been notified and will be with you shortly.";
const getDateTimeLocalValue = (date: Date = new Date()) => {
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const normalizePhone = (value: string) => value.replace(/\D/g, "");

type ReturningVisitorRecord = Pick<
  Visitor,
  | "name"
  | "phone"
  | "email"
  | "company"
  | "host"
  | "purpose"
  | "location"
  | "visitorType"
  | "licensePlate"
  | "expectedDuration"
  | "status"
  | "photo"
  | "checkInTime"
>;

const CheckIn: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [step, setStep] = useState<
    | "phone"
    | "location"
    | "form"
    | "members"
    | "waiver"
    | "photo"
    | "already-in"
    | "success"
  >("phone");
  const [isSendingNotifications, setIsSendingNotifications] = useState(false);
  const [phone, setPhone] = useState("");
  const [isGroup, setIsGroup] = useState(false);
  const [error, setError] = useState("");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [isReturningGuest, setIsReturningGuest] = useState(false);
  const [cachedSettings, setCachedSettings] = useState<SystemSettings | null>(
    null,
  );
  const [availableHosts, setAvailableHosts] = useState<Host[]>([]);
  const [availablePurposes, setAvailablePurposes] = useState<string[]>([
    "Meeting",
    "Interview",
    "Delivery",
    "Facility Tour",
    "Other",
  ]);
  const [availableVisitorTypes, setAvailableVisitorTypes] = useState<string[]>([
    "Guest",
    "Contractor",
    "Candidate",
    "VIP",
    "Delivery",
  ]);
  const [showHostResults, setShowHostResults] = useState(false);
  const [selectedHostObj, setSelectedHostObj] = useState<Host | null>(null);
  const [hostAvailability, setHostAvailability] =
    useState<HostAvailability | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [securitySession, setSecuritySession] = useState<any>(null);
  const [notificationError, setNotificationError] = useState("");
  const [previousVisitors, setPreviousVisitors] = useState<
    ReturningVisitorRecord[]
  >([]);
  const [selectedReturningVisitor, setSelectedReturningVisitor] =
    useState<ReturningVisitorRecord | null>(null);

  // Stage 2: Member Names State
  const [groupMemberNames, setGroupMemberNames] = useState<string[]>([]);
  const [currentMemberName, setCurrentMemberName] = useState("");

  const [formData, setFormData] = useState<
    Omit<Visitor, "id" | "phone" | "checkOutTime" | "photo" | "signature">
  >({
    name: "",
    email: "",
    company: "",
    host: "",
    purpose: "",
    location: "",
    visitorType: "Guest",
    licensePlate: "",
    expectedDuration: "1 Hour",
    checkInTime: getDateTimeLocalValue(),
    status: "In",
    processedBy: "",
    groupSize: 1,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const hostResultsRef = useRef<HTMLDivElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);

  // Stepper Calculation
  const getStepProgress = () => {
    switch (step) {
      case "phone":
        return 10;
      case "location":
        return 25;
      case "form":
        return 40;
      case "members":
        return 55;
      case "waiver":
        return 70;
      case "photo":
        return 85;
      case "success":
        return 100;
      default:
        return 0;
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const sess = localStorage.getItem("securitySession");
    if (!sess) {
      navigate("/security-login?redirect=/check-in");
      return;
    }
    const parsedSession = JSON.parse(sess);
    setSecuritySession(parsedSession);
    setFormData((prev) => ({
      ...prev,
      processedBy: parsedSession?.name || prev.processedBy || "",
    }));

    const loadData = async () => {
      try {
        // Load hosts from API
        const hostsResponse = await apiService.host.getAll({
          filter: "status:Active",
        }, { signal: controller.signal });
        const hosts = getApiContent<Host[]>(hostsResponse, [], "hosts");
        setAvailableHosts(hosts);

        // Load purposes from API (visit purposes)
        const purposesResponse = await apiService.movementReason.getAll(
          undefined,
          { signal: controller.signal },
        );
        const purposes = getApiContent<any[]>(
          purposesResponse,
          [],
          "visit reasons",
        );
        if (purposes.length > 0) {
          const purposeNames = purposes.map((p: any) => p.name);
          setAvailablePurposes(purposeNames);
          setFormData((prev) => ({ ...prev, purpose: purposeNames[0] }));
        } else {
          setFormData((prev) => ({ ...prev, purpose: "Meeting" }));
        }

        // Load visitor types from API
        const visitorTypesResponse = await apiService.visitorType.getAll(
          undefined,
          { signal: controller.signal },
        );
        const visitorTypes = getApiContent<any[]>(
          visitorTypesResponse,
          [],
          "visitor types",
        );
        if (visitorTypes.length > 0) {
          const typeNames = visitorTypes.map((t: any) => t.name);
          setAvailableVisitorTypes(typeNames);
          setFormData((prev) => ({ ...prev, visitorType: typeNames[0] }));
        }

        // Load previous visitors for returning-guest suggestions
        const visitorsResponse = await apiService.visitor.getAll({
          pageSize: 500,
          orderBy: "checkInTime",
          orderDirection: 1,
        }, { signal: controller.signal });
        const visitorRecords = getApiContent<any[]>(
          visitorsResponse,
          [],
          "visitors",
        );
        const normalizedMap = new Map<string, ReturningVisitorRecord>();

        visitorRecords.forEach((raw) => {
          const record: ReturningVisitorRecord = {
            name: raw?.name || "",
            phone: raw?.phone || "",
            email: raw?.email || "",
            company: raw?.company || "",
            host: raw?.host || "",
            purpose: raw?.purpose || "",
            location: raw?.location || "",
            visitorType: raw?.visitorType || "Guest",
            licensePlate: raw?.licensePlate || "",
            expectedDuration: raw?.expectedDuration || "1 Hour",
            status: raw?.status || "Out",
            photo: raw?.photo,
            checkInTime: raw?.checkInTime || "",
          };
          const normalized = normalizePhone(record.phone);
          if (!normalized || record.phone.startsWith("GRP-")) return;
          if (!normalizedMap.has(normalized)) {
            normalizedMap.set(normalized, record);
          }
        });
        setPreviousVisitors(Array.from(normalizedMap.values()));
      } catch (e) {
        if ((e as any)?.name === "AbortError") return;
        console.error("Failed to load data from API", e);
        // Keep check-in usable with local cache if API visitor lookup fails.
        const cachedVisitors: Visitor[] = JSON.parse(
          localStorage.getItem("visitors") || "[]",
        );
        const normalizedMap = new Map<string, ReturningVisitorRecord>();
        cachedVisitors.forEach((v) => {
          const normalized = normalizePhone(v.phone || "");
          if (!normalized || (v.phone || "").startsWith("GRP-")) return;
          if (!normalizedMap.has(normalized)) {
            normalizedMap.set(normalized, {
              name: v.name,
              phone: v.phone,
              email: v.email,
              company: v.company,
              host: v.host,
              purpose: v.purpose,
              location: v.location,
              visitorType: v.visitorType,
              licensePlate: v.licensePlate,
              expectedDuration: v.expectedDuration,
              status: v.status,
              photo: v.photo,
              checkInTime: v.checkInTime,
            });
          }
        });
        setPreviousVisitors(Array.from(normalizedMap.values()));
        setError(getApiErrorMessage(e, "Failed to load check-in data"));
      }
    };

    void loadData();
    return () => controller.abort();
  }, [navigate]);

  useEffect(() => {
    if (!notificationError) return;
    const timer = setTimeout(() => setNotificationError(""), 5000);
    return () => clearTimeout(timer);
  }, [notificationError]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        hostResultsRef.current &&
        !hostResultsRef.current.contains(event.target as Node)
      ) {
        setShowHostResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (step === "photo" && !capturedImage) startCamera();
    return () => stopCamera();
  }, [step, capturedImage]);

  useEffect(() => {
    const checkStatus = async () => {
      if (selectedHostObj) {
        setIsCheckingAvailability(true);
        const sData = localStorage.getItem("systemSettings");
        const settings: SystemSettings = sData
          ? JSON.parse(sData)
          : { workspace: { enabled: false } };
        const availability = await workspaceService.getHostAvailability(
          selectedHostObj,
          settings,
        );
        setHostAvailability(availability);
        setIsCheckingAvailability(false);
      } else {
        setHostAvailability(null);
      }
    };
    checkStatus();
  }, [selectedHostObj]);

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
      setError("Unable to access camera.");
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

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const endDrawing = () => {
    setIsDrawing(false);
    if (sigCanvasRef.current) {
      const ctx = sigCanvasRef.current.getContext("2d");
      if (ctx) ctx.beginPath();
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !sigCanvasRef.current) return;
    const canvas = sigCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x =
      "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y =
      "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearSignature = () => {
    if (sigCanvasRef.current) {
      const canvas = sigCanvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      setSignatureImage(null);
    }
  };

  const saveSignature = () => {
    if (sigCanvasRef.current) {
      setSignatureImage(sigCanvasRef.current.toDataURL("image/png"));
      setStep("photo");
    }
  };

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedPhone = normalizePhone(phone);
    if (normalizedPhone.length < 8) {
      setError("Invalid phone number.");
      return;
    }

    const existing =
      selectedReturningVisitor ||
      previousVisitors.find((v) => normalizePhone(v.phone) === normalizedPhone);

    if (existing) {
      if (existing.status === "In") {
        setStep("already-in");
      } else {
        setIsReturningGuest(true);
        setSelectedReturningVisitor(existing);
        setStep("location");
      }
    } else {
      setIsReturningGuest(false);
      setSelectedReturningVisitor(null);
      setCapturedImage(null);
      setSignatureImage(null);
      setFormData((prev) => ({
        ...prev,
        checkInTime: getDateTimeLocalValue(),
        status: "In",
        processedBy: securitySession?.name || prev.processedBy || "",
      }));
      setStep("location");
    }
  };

  const applyVisitorPrefillForCampus = (campus: string) => {
    const previous = selectedReturningVisitor;

    if (previous) {
      setFormData({
        name: previous.name || "",
        email: previous.email || "",
        company: previous.company || "",
        host: previous.host || "",
        purpose:
          previous.purpose && availablePurposes.includes(previous.purpose)
            ? previous.purpose
            : availablePurposes[0],
        location: campus,
        visitorType:
          previous.visitorType &&
          availableVisitorTypes.includes(previous.visitorType)
            ? previous.visitorType
            : availableVisitorTypes[0],
        licensePlate: previous.licensePlate || "",
        expectedDuration: previous.expectedDuration || "1 Hour",
        checkInTime: getDateTimeLocalValue(),
        status: "In",
        processedBy: securitySession?.name || formData.processedBy || "",
        groupSize: 1,
      });
      setCapturedImage(previous.photo || null);
      const matchedHost =
        availableHosts.find(
          (h) =>
            h.status === "Active" &&
            h.fullName.toLowerCase() === (previous.host || "").toLowerCase(),
        ) || null;
      setSelectedHostObj(matchedHost);
      setShowHostResults(false);
      return;
    }

    setSelectedHostObj(null);
    setCapturedImage(null);
    setSignatureImage(null);
    setFormData((prev) => ({
      ...prev,
      location: campus,
      checkInTime: getDateTimeLocalValue(),
      status: "In",
      processedBy: securitySession?.name || prev.processedBy || "",
    }));
  };

  // Stage 2: Helper to handle member name addition
  const addMemberName = () => {
    if (currentMemberName.trim()) {
      setGroupMemberNames([...groupMemberNames, currentMemberName.trim()]);
      setCurrentMemberName("");
    }
  };

  const finalize = async () => {
    setIsSendingNotifications(true);
    setStep("success");

    const groupId = isGroup
      ? Math.random().toString(36).substr(2, 9)
      : undefined;
    const checkInTime = formData.checkInTime
      ? new Date(formData.checkInTime).toISOString()
      : new Date().toISOString();
    const processedBy = formData.processedBy || securitySession?.name;
    const status = formData.status || "In";

    // Create the Group Lead (Primary Visitor)
    const primaryVisitor: Omit<Visitor, "id" | "checkOutTime"> = {
      phone,
      ...formData,
      photo: capturedImage || undefined,
      signature: signatureImage || undefined,
      checkInTime,
      status,
      processedBy,
      isGroupLead: isGroup,
      groupId,
    };

    const newVisitorEntries: Omit<Visitor, "id" | "checkOutTime">[] = [
      primaryVisitor,
    ];

    // Stage 2: Bulk record creation for group members
    if (isGroup && groupMemberNames.length > 0) {
      groupMemberNames.forEach((memberName) => {
        newVisitorEntries.push({
          name: memberName,
          phone: `GRP-${phone}`, // Link via lead's phone for simple lookup if needed
          email: formData.email, // Share lead's email/context
          company: formData.company,
          host: formData.host,
          purpose: formData.purpose,
          location: formData.location,
          visitorType: formData.visitorType,
          expectedDuration: formData.expectedDuration,
          checkInTime,
          status,
          processedBy,
          isGroupLead: false,
          groupId,
          groupSize: 1, // Individual entry in the list
        });
      });
    }

    // Create visitors via API
    try {
      for (const visitor of newVisitorEntries) {
        const response = await apiService.visitor.checkIn(visitor);
        ensureApiSuccess(response, "Failed to save visitor data");
      }
    } catch (err) {
      console.error("Failed to create visitor", err);
      setError(getApiErrorMessage(err, "Failed to save visitor data"));
      setIsSendingNotifications(false);
      return;
    }

    try {
      let settings = cachedSettings;
      if (!settings) {
        const settingsResponse = await apiService.settings.getAll();
        settings = getApiContent<SystemSettings>(settingsResponse, null, "settings");
        setCachedSettings(settings);
      }
      const sender = settings?.kiosk?.senderEmail || "notifications@system.com";

      if (settings?.notificationsEnabled) {
        const replaceVars = (template: string) => {
          const displayVisitorName =
            isGroup && groupMemberNames.length > 0
              ? `${primaryVisitor.name} (Group of ${formData.groupSize})`
              : primaryVisitor.name;

          return (template || "")
            .replace(/{{visitor_name}}/g, displayVisitorName)
            .replace(/{{host_name}}/g, primaryVisitor.host)
            .replace(/{{company}}/g, primaryVisitor.company)
            .replace(/{{purpose}}/g, primaryVisitor.purpose)
            .replace(/{{location}}/g, primaryVisitor.location)
            .replace(/{{time}}/g, new Date().toLocaleTimeString())
            .replace(/{{email}}/g, primaryVisitor.email);
        };

        const notificationMsg = replaceVars(
          settings.hostCheckInTemplate || DEFAULT_HOST_CI,
        );

        if (
          selectedHostObj &&
          settings.workspace?.enabled &&
          settings.workspace?.chatNotificationsEnabled
        ) {
          const success = await workspaceService.sendChatMessage(
            selectedHostObj,
            notificationMsg,
            settings,
          );
          if (success) {
            const response = await apiService.notificationLog.create({
              id: Math.random(),
              visitorName: primaryVisitor.name,
              hostName: primaryVisitor.host,
              recipient: selectedHostObj.fullName,
              sender: sender,
              recipientRole: "Host",
              trigger: "Check-In",
              message: notificationMsg,
              timestamp: new Date().toISOString(),
              status: "Sent",
              channel: "Google Chat",
            } as NotificationLog);
            ensureApiSuccess(response, "Failed to log notification");
          }
        }

        const hostEmail = selectedHostObj?.email || "host@company.com";
        const response = await apiService.notificationLog.create({
          id: Math.random(),
          visitorName: primaryVisitor.name,
          hostName: primaryVisitor.host,
          recipient: hostEmail,
          sender: sender,
          recipientRole: "Host",
          trigger: "Check-In",
          message: notificationMsg,
          timestamp: new Date().toISOString(),
          status: "Sent",
          channel: "Email",
        } as NotificationLog);
        ensureApiSuccess(response, "Failed to log notification");

        const response2 = await apiService.notificationLog.create({
          id: Math.random(),
          visitorName: primaryVisitor.name,
          hostName: primaryVisitor.host,
          recipient: primaryVisitor.email,
          sender: sender,
          recipientRole: "Guest",
          trigger: "Check-In",
          message: replaceVars(
            settings.guestCheckInTemplate || DEFAULT_GUEST_CI,
          ),
          timestamp: new Date().toISOString(),
          status: "Sent",
          channel: "Email",
        } as NotificationLog);
        ensureApiSuccess(response2, "Failed to log notification");

        if (settings.notificationCopyEmail) {
          const response3 = await apiService.notificationLog.create({
            id: Math.random(),
            visitorName: primaryVisitor.name,
            hostName: primaryVisitor.host,
            recipient: settings.notificationCopyEmail,
            sender: sender,
            recipientRole: "CC",
            trigger: "Check-In",
            message: `[COPY] ${notificationMsg}`,
            timestamp: new Date().toISOString(),
            status: "Sent",
            channel: "Email",
          } as NotificationLog);
          ensureApiSuccess(response3, "Failed to log notification");
        }
      }
    } catch (err) {
      console.error("Failed to create notifications", err);
      setNotificationError(
        getApiErrorMessage(err, "Notifications failed to send."),
      );
    }

    setIsSendingNotifications(false);
    setTimeout(() => navigate("/"), 1400);
  };

  const filteredHosts = useMemo(() => {
    const query = formData.host.toLowerCase().trim();
    if (!query)
      return availableHosts.filter((h) => h.status === "Active").slice(0, 8);
    return availableHosts
      .filter(
        (h) =>
          h.status === "Active" && h.fullName.toLowerCase().includes(query),
      )
      .slice(0, 15);
  }, [formData.host, availableHosts]);

  const filteredReturningVisitors = useMemo(() => {
    const query = normalizePhone(phone);
    if (query.length < 3) return [];
    return previousVisitors
      .filter((v) => normalizePhone(v.phone).includes(query))
      .slice(0, 6);
  }, [phone, previousVisitors]);

  if (step === "phone") {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-12 font-sans">
        <Toast
          message={notificationError}
          onClose={() => setNotificationError("")}
        />
        <div className="max-w-md w-full bg-white rounded-[4rem] shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-500">
          <div className="bg-slate-900 p-16 text-white text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <h2 className="text-4xl font-black tracking-tight">
              {t("welcome")}
            </h2>
            <div className="flex items-center justify-center gap-2 mt-4 opacity-50">
              <Shield size={12} className="text-indigo-400" />
              <p className="font-bold text-[10px] uppercase tracking-[0.3em]">
                Duty Shift: {securitySession?.name}
              </p>
            </div>
          </div>
          <form onSubmit={handlePhoneSubmit} className="p-16 space-y-10">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
                {t("phoneNum")}
              </label>
              <div className="relative group">
                <Phone className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  required
                  type="tel"
                  placeholder="000-000-0000"
                  className="w-full pl-16 pr-6 py-8 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-300 outline-none text-3xl font-black tracking-tighter transition-all"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setSelectedReturningVisitor(null);
                  }}
                />
              </div>
              {filteredReturningVisitors.length > 0 && (
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                  {filteredReturningVisitors.map((visitor) => (
                    <button
                      key={`${normalizePhone(visitor.phone)}-${visitor.name}`}
                      type="button"
                      className="w-full text-left px-5 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-b-0"
                      onClick={() => {
                        setPhone(visitor.phone);
                        setSelectedReturningVisitor(visitor);
                        setIsReturningGuest(true);
                        setError("");
                      }}
                    >
                      <p className="text-sm font-black text-slate-800">
                        {visitor.name}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {visitor.phone}
                      </p>
                    </button>
                  ))}
                </div>
              )}
              <ErrorBanner message={error} />
            </div>

            {/* Group Toggle Card */}
            <div
              className={`flex items-center justify-between p-6 rounded-[2.5rem] border transition-all cursor-pointer group shadow-sm ${isGroup ? "bg-indigo-50 border-indigo-200" : "bg-slate-50 border-slate-100 hover:border-slate-200"}`}
              onClick={() => setIsGroup(!isGroup)}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm ${isGroup ? "bg-indigo-600 text-white" : "bg-white text-slate-300 border border-slate-100"}`}
                >
                  <Users size={24} />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800 tracking-tight uppercase">
                    Group Check-In
                  </p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    {isGroup ? "Party Mode Active" : "I am with a party"}
                  </p>
                </div>
              </div>
              <div
                className={`relative w-12 h-6 rounded-full transition-all duration-500 ${isGroup ? "bg-indigo-600" : "bg-slate-200"}`}
              >
                <div
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-500 ${isGroup ? "translate-x-6" : ""}`}
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white font-black py-8 rounded-[2rem] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 text-xl active:scale-95 flex items-center justify-center gap-3"
              >
                {t("continue")}
              </button>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="w-full text-slate-400 font-black py-4 mt-6 hover:text-slate-600 text-[10px] uppercase tracking-[0.4em]"
              >
                {t("cancel")}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (step === "location") {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-12 font-sans">
        <Toast
          message={notificationError}
          onClose={() => setNotificationError("")}
        />
        <button
          onClick={() => setStep("phone")}
          className="absolute top-16 left-16 flex items-center gap-4 text-slate-400 hover:text-indigo-600 font-black uppercase tracking-[0.3em] text-[10px] transition-colors"
        >
          <ArrowLeft size={16} /> {t("backHome")}
        </button>
        <div className="text-center mb-24">
          <h1 className="text-6xl font-black text-slate-900 tracking-tight mb-6">
            {t("selectCampus")}
          </h1>
          <p className="text-slate-500 text-2xl font-medium opacity-60">
            Please confirm your current terminal location.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-6xl w-full">
          <CampusCard
            icon={GraduationCap}
            title="College"
            desc="Main Corporate Center"
            color="indigo"
            onClick={() => {
              applyVisitorPrefillForCampus("College");
              setStep("form");
            }}
          />
          <CampusCard
            icon={School}
            title="Elementary"
            desc="Academic Services"
            color="amber"
            onClick={() => {
              applyVisitorPrefillForCampus("Elementary");
              setStep("form");
            }}
          />
        </div>
      </div>
    );
  }

  if (step === "form") {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-12 md:p-24 overflow-y-auto font-sans">
        <Toast
          message={notificationError}
          onClose={() => setNotificationError("")}
        />
        <button
          onClick={() => setStep("location")}
          className="flex items-center gap-4 text-slate-400 hover:text-indigo-600 font-black uppercase tracking-[0.3em] text-[10px] transition-colors mb-20"
        >
          <ArrowLeft size={16} /> {t("selectCampus")}
        </button>

        <div className="max-w-4xl mx-auto bg-white rounded-[4rem] shadow-2xl overflow-hidden border border-slate-100 animate-in slide-in-from-bottom-8 duration-500">
          <div className="w-full h-2 bg-slate-100">
            <div
              className="h-full bg-indigo-600 transition-all duration-700"
              style={{ width: `${getStepProgress()}%` }}
            ></div>
          </div>

          <div className="bg-slate-900 p-16 text-white text-center relative">
            <h2 className="text-4xl font-black tracking-tight">
              {isReturningGuest ? "Quick Check-In" : "Visitor Information"}
            </h2>
            <p className="opacity-50 mt-4 text-[10px] font-black uppercase tracking-[0.4em]">
              {formData.location} Campus Hub // Registry V3
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (isReturningGuest) finalize();
              else if (isGroup && formData.groupSize > 1) setStep("members");
              else setStep("waiver");
            }}
            className="p-16 space-y-12"
          >
            {/* Form Group: Basic Identity */}
            <div className="space-y-10">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-4">
                  <User size={16} className="text-indigo-600" />
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                    Personal Identification
                  </h3>
                </div>
                {isGroup && (
                  <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                    <Users size={12} className="text-indigo-600" />
                    <span className="text-[8px] font-black uppercase text-indigo-600 tracking-wider">
                      Group Lead
                    </span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <Input
                  icon={User}
                  label={t("fullName")}
                  placeholder="Jane Doe"
                  value={formData.name}
                  onChange={(v: any) => setFormData({ ...formData, name: v })}
                  disabled={isReturningGuest}
                />
                <Input
                  icon={Mail}
                  label={t("emailAddress")}
                  type="email"
                  placeholder="jane@example.com"
                  value={formData.email}
                  onChange={(v: any) => setFormData({ ...formData, email: v })}
                  disabled={isReturningGuest}
                />

                {/* Group Size Input (Stage 1) */}
                {isGroup && (
                  <div className="md:col-span-2 bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex items-center justify-between animate-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-md">
                        <Users size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Total Party Size
                        </p>
                        <p className="text-lg font-black text-slate-800 tracking-tight leading-none mt-1">
                          Including yourself
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            groupSize: Math.max(1, (prev.groupSize || 1) - 1),
                          }))
                        }
                        className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-white transition-all text-slate-400 hover:text-indigo-600"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="text-3xl font-black tabular-nums text-slate-900 w-8 text-center">
                        {formData.groupSize}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            groupSize: Math.min(20, (prev.groupSize || 1) + 1),
                          }))
                        }
                        className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-white transition-all text-slate-400 hover:text-indigo-600"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Form Group: Visit Context */}
            <div className="space-y-10">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                <Building2 size={16} className="text-indigo-600" />
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                  Organization & Context
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="md:col-span-2">
                  <Input
                    icon={Building}
                    label={t("organization")}
                    placeholder="Company Name"
                    value={formData.company}
                    onChange={(v: any) =>
                      setFormData({ ...formData, company: v })
                    }
                    disabled={isReturningGuest}
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
                    Visitor Type
                  </label>
                  <div className="relative">
                    <Users className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 pointer-events-none" />
                    <select
                      className="w-full pl-16 pr-14 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-300 outline-none font-bold text-xl appearance-none cursor-pointer"
                      value={formData.visitorType}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          visitorType: e.target.value as any,
                        })
                      }
                    >
                      {availableVisitorTypes.map((vt) => (
                        <option key={vt} value={vt}>
                          {vt}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
                    Expected Stay
                  </label>
                  <div className="relative">
                    <Timer className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 pointer-events-none" />
                    <select
                      className="w-full pl-16 pr-14 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-300 outline-none font-bold text-xl appearance-none cursor-pointer"
                      value={formData.expectedDuration}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          expectedDuration: e.target.value,
                        })
                      }
                    >
                      <option>30 Minutes</option>
                      <option>1 Hour</option>
                      <option>2 Hours</option>
                      <option>Half Day</option>
                      <option>Full Day</option>
                    </select>
                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Form Group: Security & Logistics */}
            <div className="space-y-10">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                <UserCheck size={16} className="text-indigo-600" />
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                  Host & Logistics
                </h3>
              </div>

              <div className="relative space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
                  Select Your Host
                </label>
                <div className="relative group">
                  <UserCheck className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 transition-colors group-focus-within:text-indigo-500" />
                  <input
                    required
                    placeholder={t("searchName")}
                    className="w-full pl-16 pr-14 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-300 outline-none font-bold text-xl transition-all shadow-sm"
                    value={formData.host}
                    onFocus={() => setShowHostResults(true)}
                    onChange={(e) => {
                      setFormData({ ...formData, host: e.target.value });
                      setShowHostResults(true);
                    }}
                    autoComplete="off"
                  />
                  <Search className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-200" />
                </div>

                {showHostResults && (
                  <div
                    ref={hostResultsRef}
                    className="absolute z-50 w-full mt-4 bg-white border border-slate-100 rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] overflow-hidden max-h-[350px] overflow-y-auto animate-in fade-in slide-in-from-top-4 duration-300"
                  >
                    {filteredHosts.map((host) => (
                      <button
                        key={host.id}
                        type="button"
                        className="w-full px-10 py-6 text-left hover:bg-indigo-50 border-b border-slate-50 last:border-0 flex items-center justify-between group transition-all"
                        onClick={() => {
                          setFormData({ ...formData, host: host.fullName });
                          setSelectedHostObj(host);
                          setShowHostResults(false);
                        }}
                      >
                        <div className="flex flex-col">
                          <p className="font-black text-slate-800 text-lg group-hover:text-indigo-600 transition-colors">
                            {host.fullName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
                            {host.department}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {host.isWorkspaceSynced && (
                            <Globe size={14} className="text-slate-200" />
                          )}
                          <Check
                            className={`w-6 h-6 text-emerald-500 transition-all ${selectedHostObj?.id === host.id ? "opacity-100 scale-100" : "opacity-0 scale-50"}`}
                          />
                        </div>
                      </button>
                    ))}
                    {filteredHosts.length === 0 && (
                      <div className="p-12 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                        No matching personnel found
                      </div>
                    )}
                  </div>
                )}

                {(isCheckingAvailability || hostAvailability) && (
                  <div className="mt-6 bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex items-center justify-between animate-in slide-in-from-top-2 duration-500 shadow-inner">
                    <div className="flex items-center gap-5">
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${
                          isCheckingAvailability
                            ? "bg-slate-100"
                            : hostAvailability?.status === "Available"
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-amber-100 text-amber-600"
                        }`}
                      >
                        {isCheckingAvailability ? (
                          <Loader2
                            className="animate-spin text-slate-300"
                            size={24}
                          />
                        ) : (
                          <Calendar size={24} />
                        )}
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          Calendar Insights
                        </p>
                        <p className="text-lg font-black text-slate-800 tracking-tight leading-tight mt-1">
                          {isCheckingAvailability
                            ? "Synchronizing schedule..."
                            : hostAvailability?.status === "Available"
                              ? "Verified Available"
                              : `Host Busy: ${hostAvailability?.currentEventSummary}`}
                        </p>
                      </div>
                    </div>
                    {hostAvailability?.status === "Busy" && (
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-xl border border-amber-100">
                          <Clock size={14} className="animate-pulse" />
                          <span className="text-[9px] font-black uppercase tracking-widest">
                            Free at {hostAvailability.nextAvailableTime}
                          </span>
                        </div>
                        <span className="text-[7px] font-bold text-slate-300 uppercase tracking-widest">
                          A priority alert will be sent
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
                    {t("reasonVisit")}
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 pointer-events-none" />
                    <select
                      className="w-full pl-16 pr-14 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-300 outline-none font-bold text-xl appearance-none cursor-pointer"
                      value={formData.purpose}
                      onChange={(e) =>
                        setFormData({ ...formData, purpose: e.target.value })
                      }
                    >
                      {availablePurposes.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 pointer-events-none" />
                  </div>
                </div>

                <Input
                  icon={Car}
                  label="Vehicle Plate (Optional)"
                  placeholder="ABC-1234"
                  value={formData.licensePlate}
                  onChange={(v: any) =>
                    setFormData({ ...formData, licensePlate: v })
                  }
                  required={false}
                />

                <Input
                  icon={Shield}
                  label="Processed By"
                  placeholder="Security Officer"
                  value={formData.processedBy || ""}
                  onChange={(v: any) =>
                    setFormData({ ...formData, processedBy: v })
                  }
                  disabled
                  required={false}
                />

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
                    Visitor Status
                  </label>
                  <div className="relative">
                    <Bell className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 pointer-events-none" />
                    <select
                      className="w-full pl-16 pr-14 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-300 outline-none font-bold text-xl appearance-none cursor-pointer"
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          status: e.target.value as Visitor["status"],
                        })
                      }
                    >
                      <option value="In">In</option>
                      <option value="Out">Out</option>
                    </select>
                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
                    Check-In Date & Time
                  </label>
                  <div className="relative group">
                    <Clock className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                      required
                      type="datetime-local"
                      className="w-full pl-16 pr-6 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-300 outline-none font-bold text-xl transition-all"
                      value={formData.checkInTime || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          checkInTime: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-10 border-t border-slate-50">
              <button
                type="submit"
                disabled={!selectedHostObj}
                className="w-full bg-indigo-600 text-white font-black py-10 rounded-[3rem] hover:bg-indigo-700 shadow-2xl shadow-indigo-100 text-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-4 disabled:opacity-20"
              >
                {isReturningGuest ? "Complete Check-In" : "Validate & Continue"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Stage 2: Member Roster Step
  if (step === "members") {
    const requiredMembers = formData.groupSize - 1;
    const remaining = requiredMembers - groupMemberNames.length;

    return (
      <div className="min-h-screen bg-[#f8fafc] p-12 md:p-24 overflow-y-auto font-sans">
        <Toast
          message={notificationError}
          onClose={() => setNotificationError("")}
        />
        <button
          onClick={() => setStep("form")}
          className="flex items-center gap-4 text-slate-400 hover:text-indigo-600 font-black uppercase tracking-[0.3em] text-[10px] transition-colors mb-20"
        >
          <ArrowLeft size={16} /> {t("visitorDetails")}
        </button>

        <div className="max-w-4xl mx-auto bg-white rounded-[4rem] shadow-2xl overflow-hidden border border-slate-100 animate-in slide-in-from-bottom-8 duration-500">
          <div className="w-full h-2 bg-slate-100">
            <div
              className="h-full bg-indigo-600 transition-all duration-700"
              style={{ width: `${getStepProgress()}%` }}
            ></div>
          </div>
          <div className="bg-slate-900 p-16 text-white text-center relative">
            <h2 className="text-4xl font-black tracking-tight">
              Party Manifest
            </h2>
            <p className="opacity-50 mt-4 text-[10px] font-black uppercase tracking-[0.4em]">
              Registering {requiredMembers} companion
              {requiredMembers !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="p-16 space-y-12">
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                  Quick Entry
                </label>
                <span
                  className={`text-[10px] font-black uppercase tracking-widest ${remaining > 0 ? "text-amber-500" : "text-emerald-500"}`}
                >
                  {remaining > 0
                    ? `${remaining} names remaining`
                    : "Roster Complete"}
                </span>
              </div>

              <div className="flex gap-4">
                <div className="relative flex-1 group">
                  <UserPlus className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                  <input
                    type="text"
                    placeholder="Enter companion name..."
                    className="w-full pl-16 pr-6 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-300 outline-none font-bold text-xl transition-all"
                    value={currentMemberName}
                    onChange={(e) => setCurrentMemberName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addMemberName();
                      }
                    }}
                  />
                </div>
                <button
                  onClick={addMemberName}
                  disabled={!currentMemberName.trim()}
                  className="bg-indigo-600 text-white p-6 rounded-[2rem] hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-20"
                >
                  <Plus size={24} />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">
                Manifest Registry
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupMemberNames.map((name, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-6 bg-slate-50 border border-slate-100 rounded-3xl group animate-in zoom-in-95 duration-300"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-300 font-black text-xs border border-slate-100 group-hover:text-indigo-600 transition-colors">
                        {idx + 1}
                      </div>
                      <p className="font-black text-slate-800 tracking-tight">
                        {name}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setGroupMemberNames(
                          groupMemberNames.filter((_, i) => i !== idx),
                        )
                      }
                      className="text-slate-300 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                {groupMemberNames.length === 0 && (
                  <div className="md:col-span-2 py-16 text-center border-2 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/30">
                    <Users className="w-12 h-12 mx-auto text-slate-200 mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">
                      No companions registered yet
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-10 border-t border-slate-50">
              <button
                onClick={() => setStep("waiver")}
                disabled={remaining > 0}
                className="w-full bg-slate-900 text-white font-black py-10 rounded-[3rem] hover:bg-black shadow-2xl text-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-4 disabled:opacity-20"
              >
                Proceed to Security Briefing <ChevronRight />
              </button>
              {remaining > 0 && (
                <p className="text-center text-[9px] font-bold text-slate-300 uppercase tracking-[0.3em] mt-4">
                  Please list all companions to proceed
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "waiver") {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-12 md:p-24 overflow-y-auto font-sans">
        <Toast
          message={notificationError}
          onClose={() => setNotificationError("")}
        />
        <button
          onClick={() => setStep(isGroup ? "members" : "form")}
          className="flex items-center gap-4 text-slate-400 hover:text-indigo-600 font-black uppercase tracking-[0.3em] text-[10px] transition-colors mb-20"
        >
          <ArrowLeft size={16} />{" "}
          {isGroup ? "Party Manifest" : t("visitorDetails")}
        </button>

        <div className="max-w-4xl mx-auto bg-white rounded-[4rem] shadow-2xl overflow-hidden border border-slate-100 animate-in slide-in-from-bottom-8 duration-500">
          <div className="w-full h-2 bg-slate-100">
            <div
              className="h-full bg-indigo-600 transition-all duration-700"
              style={{ width: `${getStepProgress()}%` }}
            ></div>
          </div>
          <div className="bg-slate-900 p-16 text-white text-center relative">
            <h2 className="text-4xl font-black tracking-tight">
              Security Compliance
            </h2>
            <p className="opacity-50 mt-4 text-[10px] font-black uppercase tracking-[0.4em]">
              Non-Disclosure & Liability Synchronization
            </p>
          </div>
          <div className="div p-16 space-y-12">
            <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 max-h-80 overflow-y-auto space-y-8 text-slate-600 leading-relaxed text-sm shadow-inner">
              <div className="space-y-4">
                <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">
                  1. Confidentiality Agreement
                </h3>
                <p>
                  During your visit to our facility, you may be exposed to
                  proprietary and confidential information. By signing below,
                  you agree to maintain the strict confidentiality of all
                  business information, trade secrets, and internal processes
                  discovered during your stay.
                </p>
              </div>
              <div className="space-y-4 border-t border-slate-200 pt-8">
                <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">
                  2. Safety & Security Protocol
                </h3>
                <p>
                  You agree to follow all safety instructions provided by your
                  host or security personnel. Photography and video recording
                  are strictly prohibited in designated secure zones. We are not
                  responsible for any personal property loss or injury during
                  the visit.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-center px-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                  Handwritten Verification
                </label>
                <button
                  type="button"
                  onClick={clearSignature}
                  className="flex items-center gap-2 text-slate-400 hover:text-rose-500 transition-colors font-black uppercase text-[9px] tracking-widest"
                >
                  <Eraser size={14} /> Clear Signature
                </button>
              </div>
              <div className="bg-white border-4 border-slate-100 rounded-[3rem] overflow-hidden cursor-crosshair shadow-inner relative group">
                <canvas
                  ref={sigCanvasRef}
                  width={800}
                  height={300}
                  className="w-full h-64 touch-none"
                  onMouseDown={startDrawing}
                  onMouseUp={endDrawing}
                  onMouseMove={draw}
                  onTouchStart={startDrawing}
                  onTouchEnd={endDrawing}
                  onTouchMove={draw}
                />
              </div>
            </div>

            <div className="pt-6">
              <button
                onClick={saveSignature}
                className="w-full bg-slate-900 text-white font-black py-10 rounded-[3rem] hover:bg-black shadow-2xl text-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-4"
              >
                Authorize & Continue <ChevronDown className="-rotate-90" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "photo") {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-12 font-sans">
        <Toast
          message={notificationError}
          onClose={() => setNotificationError("")}
        />
        <div className="max-w-4xl w-full bg-white rounded-[5rem] shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-500">
          <div className="w-full h-2 bg-slate-100">
            <div
              className="h-full bg-indigo-600 transition-all duration-700"
              style={{ width: `${getStepProgress()}%` }}
            ></div>
          </div>
          <div className="bg-slate-900 p-20 text-white flex justify-between items-center relative">
            <div>
              <h2 className="text-5xl font-black tracking-tight">
                Facial Logic
              </h2>
              <p className="opacity-50 mt-4 text-[10px] font-black uppercase tracking-[0.5em]">
                Arrival Identity Verification
              </p>
            </div>
            <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center border border-white/5">
              <Camera className="w-10 h-10 opacity-60" />
            </div>
          </div>
          <div className="p-20 flex flex-col items-center gap-16">
            <div className="relative w-full aspect-video bg-slate-50 rounded-[4rem] overflow-hidden shadow-inner border-[12px] border-slate-100 group">
              {capturedImage ? (
                <img
                  src={capturedImage}
                  className="w-full h-full object-cover"
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
              {!capturedImage && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-64 h-64 border-2 border-indigo-500/30 rounded-full animate-ping opacity-20"></div>
                </div>
              )}
            </div>
            <div className="flex gap-10 w-full max-w-2xl">
              {!capturedImage ? (
                <button
                  onClick={takePhoto}
                  className="flex-grow bg-indigo-600 text-white font-black py-10 rounded-[3rem] hover:bg-indigo-700 shadow-2xl shadow-indigo-100 text-2xl flex items-center justify-center gap-6 active:scale-95 transition-all"
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
                    className="flex-1 bg-slate-100 text-slate-700 font-black py-10 rounded-[3rem] hover:bg-slate-200 text-xl transition-all"
                  >
                    {t("retake")}
                  </button>
                  <button
                    onClick={finalize}
                    className="flex-1 bg-emerald-600 text-white font-black py-10 rounded-[3rem] hover:bg-emerald-700 shadow-2xl shadow-emerald-100 text-xl active:scale-95 transition-all"
                  >
                    Finish Registration
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "already-in") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rose-50 p-12 font-sans">
        <Toast
          message={notificationError}
          onClose={() => setNotificationError("")}
        />
        <div className="max-w-xl w-full bg-white rounded-[5rem] shadow-2xl p-24 text-center border border-rose-100 animate-in zoom-in duration-500">
          <div className="w-32 h-32 bg-rose-50 rounded-[3.5rem] flex items-center justify-center mx-auto mb-12 shadow-sm border border-rose-100/50">
            <AlertCircle className="w-16 h-16 text-rose-600" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 mb-6 tracking-tight">
            Active Check-In Found
          </h1>
          <p className="text-slate-500 mb-16 text-xl font-medium leading-relaxed opacity-60">
            Our system identifies you as currently logged in. Please sign out
            before re-entering.
          </p>
          <button
            onClick={() => navigate("/")}
            className="w-full bg-slate-900 text-white font-black py-8 rounded-[2.5rem] text-xl shadow-xl transition-all"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-indigo-600 p-12 text-white text-center font-sans overflow-hidden">
        <Toast
          message={notificationError}
          onClose={() => setNotificationError("")}
        />
        <div className="animate-in zoom-in duration-1000">
          <div className="w-48 h-48 bg-white/10 rounded-[5rem] flex items-center justify-center mx-auto mb-16 shadow-2xl border border-white/5 backdrop-blur-xl animate-pulse">
            {isSendingNotifications ? (
              <Loader2 className="w-24 h-24 animate-spin opacity-40" />
            ) : (
              <UserCheck className="w-24 h-24" />
            )}
          </div>
          <h1 className="text-7xl font-black mb-6 tracking-tight">
            Registration Logged
          </h1>
          <p className="text-3xl opacity-60 font-medium tracking-wide">
            Welcome, {formData.name}.{" "}
            {hostAvailability?.status === "Busy"
              ? `Your host is currently in a session but has been alerted to your arrival.`
              : `Your host has been notified and will be with you shortly.`}
          </p>

          <div className="mt-16 max-w-2xl mx-auto flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
            <div className="flex items-center justify-center gap-3 bg-white/10 py-6 px-12 rounded-[2.5rem] border border-white/10 backdrop-blur-md">
              <Globe
                size={24}
                className={isSendingNotifications ? "animate-bounce" : ""}
              />
              <div className="text-left">
                <span className="block text-[10px] font-black uppercase tracking-[0.4em] opacity-40">
                  Identity Sync Active
                </span>
                <span className="text-xs font-black uppercase tracking-[0.1em] mt-1 block">
                  {isSendingNotifications
                    ? "Dispatching encrypted cloud notifications..."
                    : `Verified via Google Workspace Hub`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

const Input = ({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
  min,
  required = true,
}: any) => (
  <div className={`space-y-4 ${disabled ? "opacity-50" : ""}`}>
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
      {label}
    </label>
    <div className="relative group">
      <Icon className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
      <input
        required={required}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        className="w-full pl-16 pr-6 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-300 outline-none font-bold text-xl transition-all"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  </div>
);

const CampusCard = ({ icon: Icon, title, desc, color, onClick }: any) => (
  <button
    onClick={onClick}
    className={`group bg-white p-24 rounded-[5rem] shadow-xl hover:shadow-2xl transition-all border border-slate-100 flex flex-col items-center text-center space-y-12 animate-in slide-in-from-bottom duration-1000 hover:-translate-y-3 ${color === "indigo" ? "hover:border-indigo-500" : "hover:border-amber-500"}`}
  >
    <div
      className={`w-40 h-40 ${color === "indigo" ? "bg-indigo-50 text-indigo-600" : "bg-amber-50 text-amber-600"} rounded-[3rem] flex items-center justify-center group-hover:scale-110 transition-all duration-700 shadow-sm`}
    >
      <Icon size={64} />
    </div>
    <div>
      <h2 className="text-5xl font-black text-slate-800 tracking-tight">
        {title}
      </h2>
      <p className="text-slate-400 mt-6 text-xl font-bold uppercase tracking-[0.2em]">
        {desc}
      </p>
    </div>
  </button>
);

export default CheckIn;
