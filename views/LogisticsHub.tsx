import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Package,
  Truck,
  Camera,
  RefreshCw,
  Check,
  AlertCircle,
  Building,
  User,
  Phone,
  Briefcase,
  Search,
  Hash,
  FileText,
  ChevronRight,
  MapPin,
  Mail,
  Layers,
  UserCheck,
  X,
  ChevronDown,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Hammer,
  FileEdit,
  Loader2,
  Globe,
  GraduationCap,
  School,
  Shield,
  Target,
} from "lucide-react";
import {
  DeliveryRecord,
  AssetMovement,
  AssetStatus,
  MovementReason,
  Host,
  SystemSettings,
  NotificationLog,
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

type Workflow =
  | "selection"
  | "delivery-form"
  | "asset-mode-select"
  | "asset-checkout"
  | "asset-return-select"
  | "asset-return-form"
  | "photo-verify"
  | "success";

const DEFAULT_HOST_DELIVERY =
  "Hello {{delivery_for}}, a delivery from {{company}} ({{courier_name}}) has been received for you at {{time}}. Package Type: {{package_type}}.";

type DeliveryTypeOption = {
  id: number | string;
  name: string;
  description?: string;
  isActive?: boolean;
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
      <Icon className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
      <input
        required={required}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        className="w-full pl-16 pr-6 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-4 focus:ring-emerald-500/10 focus:bg-white focus:border-emerald-300 outline-none font-bold text-xl transition-all"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  </div>
);

const LogisticsHub: React.FC = () => {
  const navigate = useNavigate();
  const statusOptions: AssetStatus[] = ["Off-site", "In-transit", "On-site"];
  const [workflow, setWorkflow] = useState<Workflow>("selection");
  const [securitySession, setSecuritySession] = useState<any>(null);
  const [lastFormStep, setLastFormStep] = useState<
    "delivery" | "asset-checkout" | "asset-return" | null
  >(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isSendingNotifications, setIsSendingNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hosts, setHosts] = useState<Host[]>([]);
  const [assetReasons, setAssetReasons] = useState<MovementReason[]>([]);
  const [activeAssets, setActiveAssets] = useState<AssetMovement[]>([]);
  const [deliveryTypes, setDeliveryTypes] = useState<DeliveryTypeOption[]>([]);
  const [availableStations, setAvailableStations] = useState<string[]>([]);
  const [cachedSettings, setCachedSettings] = useState<SystemSettings | null>(
    null,
  );

  const [assetSearch, setAssetSearch] = useState("");

  const toDateTimeInputValue = (value: Date) => {
    const local = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };

  const toIsoString = (value?: string) => {
    if (!value) return new Date().toISOString();
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
    return parsed.toISOString();
  };

  const [deliveryData, setDeliveryData] = useState({
    company: "",
    personName: "",
    phone: "",
    email: "",
    deliveryFor: "",
    receivedBy: "",
    packageType: "",
    itemName: "",
    packageCount: 1,
    trackingNumber: "",
    location: "College",
    deliveryTime: toDateTimeInputValue(new Date()),
    processedBy: "",
  });

  const [assetForm, setAssetForm] = useState({
    equipmentName: "",
    staffInCharge: "",
    borrowerName: "",
    phone: "",
    email: "",
    reason: "",
    targetCampus: "",
    status: "Off-site" as AssetStatus,
    checkoutTime: toDateTimeInputValue(new Date()),
    processedBy: "",
  });

  const [selectedAssetForReturn, setSelectedAssetForReturn] =
    useState<AssetMovement | null>(null);
  const [returnData, setReturnData] = useState({
    status: "On-site" as AssetStatus,
    receiverName: "",
    returningStaffName: "",
    returnerName: "",
    securityName: "",
    condition: "Good" as "Good" | "Damaged" | "Needs Service",
    maintenanceNotes: "",
    returnTime: toDateTimeInputValue(new Date()),
    processedBy: "",
  });

  const [showHostResults, setShowHostResults] = useState<
    | "deliveryFor"
    | "staffInCharge"
    | "receiverName"
    | "returningStaffName"
    | null
  >(null);
  const hostResultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const loadData = async () => {
      try {
        const toEnvelopeError = (error: unknown, fallback: string) => {
          if ((error as any)?.name === "AbortError") throw error;
          return {
            hasError: true,
            errorMessage: getApiErrorMessage(error, fallback),
          };
        };
        const sess = localStorage.getItem("securitySession");
        if (!sess) {
          navigate("/security-login?redirect=/logistics");
          return;
        }
        const parsedSess = JSON.parse(sess);
        setSecuritySession(parsedSess);

        const [
          hostsResp,
          reasonsResp,
          settingsResp,
          assetMovementsResp,
          deliveryTypesResp,
        ] =
          await Promise.all([
            apiService
              .host.getAll(undefined, { signal: controller.signal })
              .catch((error) => toEnvelopeError(error, "Failed to load hosts")),
            apiService
              .movementReason.getAll(undefined, { signal: controller.signal })
              .catch((error) =>
                toEnvelopeError(error, "Failed to load movement reasons"),
              ),
            apiService
              .settings.getAll({ signal: controller.signal })
              .catch((error) => toEnvelopeError(error, "Failed to load settings")),
            apiService.assetMovement
              .getAll({ filter: "status=Off-site" }, { signal: controller.signal })
              .catch((error) =>
                toEnvelopeError(error, "Failed to load asset movements"),
              ),
            apiService.deliveryType
              .getAll({ page: 1, pageSize: 100 }, { signal: controller.signal })
              .catch((error) =>
                toEnvelopeError(error, "Failed to load delivery types"),
              ),
          ]);

        setHosts(getApiContent(hostsResp, [], "hosts"));

        const reasons = getApiContent(reasonsResp, [], "movement reasons");
        if (reasons.length > 0) {
          setAssetReasons(reasons);
          setAssetForm((prev) => ({
            ...prev,
            reason: reasons[0]?.name || "",
          }));
        } else {
          const defaults = [
            { id: "1", name: "Repair", description: "" },
            { id: "2", name: "Loan", description: "" },
            { id: "4", name: "Between Campus Move", description: "" },
          ];
          setAssetReasons(defaults);
          setAssetForm((prev) => ({ ...prev, reason: defaults[0].name }));
        }

        const settings = getApiContent<any>(settingsResp, null, "settings");
        setCachedSettings(settings);
        if (settings && settings.kiosk) {
          const stations = settings.securityStations?.content || [];
          setAvailableStations(stations);
          const parsedTypes = getApiContent<DeliveryTypeOption[]>(
            deliveryTypesResp,
            [],
            "delivery types",
          ).filter((t) => t?.name && t?.isActive !== false);
          setDeliveryTypes(parsedTypes);
          setDeliveryData((prev) => ({
            ...prev,
            packageType:
              parsedTypes.some((t) => t.name === prev.packageType) &&
              prev.packageType
                ? prev.packageType
                : parsedTypes[0]?.name || "",
          }));
        } else {
          const parsedTypes = getApiContent<DeliveryTypeOption[]>(
            deliveryTypesResp,
            [],
            "delivery types",
          ).filter((t) => t?.name && t?.isActive !== false);
          setDeliveryTypes(parsedTypes);
          setDeliveryData((prev) => ({
            ...prev,
            packageType:
              parsedTypes.some((t) => t.name === prev.packageType) &&
              prev.packageType
                ? prev.packageType
                : parsedTypes[0]?.name || "",
          }));
        }

        setActiveAssets(
          getApiContent(assetMovementsResp, [], "asset movements"),
        );

        setAssetForm((prev) => ({
          ...prev,
          targetCampus: parsedSess.station,
          processedBy: parsedSess.name,
        }));
        setDeliveryData((prev) => ({
          ...prev,
          receivedBy: parsedSess.name,
          processedBy: parsedSess.name,
        }));
        setReturnData((prev) => ({
          ...prev,
          securityName: parsedSess.name,
          processedBy: parsedSess.name,
        }));
      } catch (error) {
        if ((error as any)?.name === "AbortError") return;
        console.error(
          "Error loading data:",
          getApiErrorMessage(error, "Failed to load logistics data"),
        );
      }
    };

    void loadData();

    const handleClickOutside = (event: MouseEvent) => {
      if (
        hostResultsRef.current &&
        !hostResultsRef.current.contains(event.target as Node)
      ) {
        setShowHostResults(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      controller.abort();
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [navigate]);

  useEffect(() => {
    if (!notificationError) return;
    const timer = setTimeout(() => setNotificationError(""), 5000);
    return () => clearTimeout(timer);
  }, [notificationError]);

  useEffect(() => {
    if (workflow === "photo-verify" && !capturedImage) startCamera();
    return () => stopCamera();
  }, [workflow, capturedImage]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      setError("Camera access required for verification.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
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
    setWorkflow("success");

    try {
      let settings = cachedSettings;
      if (!settings) {
        const settingsResponse = await apiService.settings.getAll();
        settings = getApiContent<SystemSettings>(
          settingsResponse,
          null,
          "settings",
        );
        setCachedSettings(settings);
      }
      const sender = settings?.kiosk?.senderEmail || "notifications@system.com";

      if (lastFormStep === "delivery") {
        const deliveryPayload = {
          ...deliveryData,
          photo: capturedImage || undefined,
          timestamp: toIsoString(deliveryData.deliveryTime),
          processedBy: securitySession?.name || deliveryData.processedBy,
        };

        const deliveryResponse = await apiService.delivery.create(
          deliveryPayload as any,
        );
        ensureApiSuccess(deliveryResponse, "Failed to create delivery");

        if (settings?.notificationsEnabled) {
          try {
            const host = hosts.find(
              (h) => h.fullName === deliveryData.deliveryFor,
            );
            const replaceVars = (template: string) =>
              (template || "")
                .replace(/{{courier_name}}/g, deliveryData.personName)
                .replace(/{{company}}/g, deliveryData.company)
                .replace(/{{delivery_for}}/g, deliveryData.deliveryFor)
                .replace(/{{package_type}}/g, deliveryData.packageType)
                .replace(/{{item_name}}/g, deliveryData.itemName || "N/A")
                .replace(
                  /{{tracking_number}}/g,
                  deliveryData.trackingNumber || "N/A",
                )
                .replace(/{{location}}/g, deliveryData.location)
                .replace(/{{company_name}}/g, settings.kiosk?.companyName || "")
                .replace(
                  /{{time}}/g,
                  new Date(toIsoString(deliveryData.deliveryTime)).toLocaleTimeString(),
                );
            const notificationMsg = replaceVars(
              settings.hostDeliveryTemplate || DEFAULT_HOST_DELIVERY,
            );

            if (
              host &&
              settings.workspace?.enabled &&
              settings.workspace?.chatNotificationsEnabled
            ) {
              await workspaceService.sendChatMessage(
                host,
                notificationMsg,
                settings,
              );
            }

            const response = await apiService.notificationLog.create({
              visitorName: deliveryData.personName,
              hostName: deliveryData.deliveryFor,
              recipient: host?.email || "host@company.com",
              sender,
              recipientRole: "Host",
              trigger: "Delivery",
              message: notificationMsg,
              status: "Sent",
              channel: "Email",
            } as any);
            ensureApiSuccess(response, "Failed to log notification");

            if (settings.notificationCopyEmail) {
              const response2 = await apiService.notificationLog.create({
                visitorName: deliveryData.personName,
                hostName: deliveryData.deliveryFor,
                recipient: settings.notificationCopyEmail,
                sender,
                recipientRole: "CC",
                trigger: "Delivery",
                message: `[COPY] ${notificationMsg}`,
                status: "Sent",
                channel: "Email",
              } as any);
              ensureApiSuccess(response2, "Failed to log notification");
            }
          } catch (err) {
            console.error("Failed to send delivery notifications", err);
            setNotificationError(
              getApiErrorMessage(err, "Notifications failed to send."),
            );
          }
        }
      } else if (lastFormStep === "asset-checkout") {
        const movementPayload = {
          ...assetForm,
          checkoutTime: toIsoString(assetForm.checkoutTime),
          photo: capturedImage || undefined,
          processedBy: securitySession?.name || assetForm.processedBy,
        };

        const response = await apiService.assetMovement.checkout(
          movementPayload as any,
        );
        ensureApiSuccess(response, "Failed to checkout asset");
      } else if (lastFormStep === "asset-return" && selectedAssetForReturn) {
        const returnPayload = {
          equipmentName: selectedAssetForReturn.equipmentName,
          staffInCharge: selectedAssetForReturn.staffInCharge,
          borrowerName: selectedAssetForReturn.borrowerName,
          phone: selectedAssetForReturn.phone,
          email: selectedAssetForReturn.email,
          reason: selectedAssetForReturn.reason,
          targetCampus: selectedAssetForReturn.targetCampus || undefined,
          checkoutTime:
            selectedAssetForReturn.checkoutTime || toIsoString(undefined),
          ...returnData,
          returnTime: toIsoString(returnData.returnTime),
          returnPhoto: capturedImage || undefined,
          processedBy: securitySession?.name || returnData.processedBy,
        };

        const response = await apiService.assetMovement.return(
          selectedAssetForReturn.id,
          returnPayload as any,
        );
        ensureApiSuccess(response, "Failed to return asset");
      }

      setIsSendingNotifications(false);
      setTimeout(() => navigate("/"), 4000);
    } catch (error) {
      console.error("Error finalizing action:", error);
      setError(getApiErrorMessage(error, "Failed to process request."));
      setIsSendingNotifications(false);
    }
  };

  const filteredHosts = useMemo(() => {
    let query = "";
    if (showHostResults === "deliveryFor") query = deliveryData.deliveryFor;
    else if (showHostResults === "staffInCharge")
      query = assetForm.staffInCharge;
    else if (showHostResults === "receiverName")
      query = returnData.receiverName;
    else if (showHostResults === "returningStaffName")
      query = returnData.returningStaffName;

    if (!query) return hosts.slice(0, 5);
    return hosts
      .filter((h) => h.fullName.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 10);
  }, [
    showHostResults,
    deliveryData.deliveryFor,
    assetForm.staffInCharge,
    returnData.receiverName,
    returnData.returningStaffName,
    hosts,
  ]);

  const showMoreInfoField = useMemo(() => {
    const selectedType = deliveryTypes.find(
      (t) => t.name === deliveryData.packageType,
    );
    const description = (selectedType?.description || "").toLowerCase();
    const requiresFromDescription =
      description.includes("require") &&
      (description.includes("detail") ||
        description.includes("description") ||
        description.includes("item"));

    const triggerTypes = [
      "Food",
      "Building Materials",
      "Electronics",
      "Furniture",
      "Equipment",
      "Other",
    ];
    const requiresFromLegacyName = triggerTypes.some(
      (t) => t.toLowerCase() === deliveryData.packageType.toLowerCase(),
    );
    return requiresFromDescription || requiresFromLegacyName;
  }, [deliveryData.packageType, deliveryTypes]);

  const successMessage = useMemo(() => {
    if (lastFormStep === "delivery") return "Delivery Logged";
    if (lastFormStep === "asset-checkout") return "Asset Checked Out";
    if (lastFormStep === "asset-return") return "Asset Returned";
    return "Protocol Verified";
  }, [lastFormStep]);

  if (workflow === "selection") {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-12 font-sans relative overflow-hidden">
        <Toast
          message={notificationError}
          onClose={() => setNotificationError("")}
        />
        <div className="absolute top-0 right-0 w-[50vw] h-[50vh] bg-emerald-50/50 rounded-bl-[100%] -z-10 blur-3xl opacity-50"></div>
        <button
          onClick={() => navigate("/")}
          className="absolute top-16 left-16 flex items-center gap-4 text-slate-400 hover:text-emerald-600 font-black uppercase tracking-[0.3em] text-[10px] transition-colors"
        >
          <ArrowLeft size={16} /> Back Home
        </button>
        <div className="text-center mb-24">
          <h1 className="text-6xl font-black text-slate-900 tracking-tight mb-6">
            Logistics Portal
          </h1>
          <div className="flex items-center justify-center gap-4 text-slate-500 text-xl font-medium opacity-60">
            <Shield size={24} className="text-emerald-500" />
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
            icon={Truck}
            title="I am a Courier"
            desc="Log Inbound Delivery"
            color="emerald"
            onClick={() => setWorkflow("delivery-form")}
          />
          <SelectionCard
            icon={Layers}
            title="Asset Movement"
            desc="Equipment Checkout/Return"
            color="indigo"
            onClick={() => setWorkflow("asset-mode-select")}
          />
        </div>
      </div>
    );
  }

  if (workflow === "asset-mode-select") {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-12 font-sans relative">
        <Toast
          message={notificationError}
          onClose={() => setNotificationError("")}
        />
        <button
          onClick={() => setWorkflow("selection")}
          className="absolute top-16 left-16 flex items-center gap-4 text-slate-400 hover:text-indigo-600 font-black uppercase tracking-[0.3em] text-[10px] transition-colors"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="max-w-xl w-full space-y-8">
          <button
            onClick={() => setWorkflow("asset-checkout")}
            className="w-full bg-white p-12 rounded-[3.5rem] shadow-xl border border-slate-100 hover:border-indigo-500 flex items-center justify-between group transition-all"
          >
            <div className="flex items-center gap-8">
              <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-all shadow-sm">
                <Truck size={32} />
              </div>
              <div className="text-left">
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">
                  Checkout Item
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                  Log equipment leaving campus
                </p>
              </div>
            </div>
            <ChevronRight
              className="text-slate-200 group-hover:text-indigo-500 group-hover:translate-x-2 transition-all"
              size={32}
            />
          </button>
          <button
            onClick={() => setWorkflow("asset-return-select")}
            className="w-full bg-white p-12 rounded-[3.5rem] shadow-xl border border-slate-100 hover:border-emerald-500 flex items-center justify-between group transition-all"
          >
            <div className="flex items-center gap-8">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-all shadow-sm">
                <RefreshCw size={32} />
              </div>
              <div className="text-left">
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">
                  Return Item
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                  Log equipment arrival on campus
                </p>
              </div>
            </div>
            <ChevronRight
              className="text-slate-200 group-hover:text-emerald-500 group-hover:translate-x-2 transition-all"
              size={32}
            />
          </button>
        </div>
      </div>
    );
  }

  if (workflow === "delivery-form") {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-12 md:p-24 overflow-y-auto font-sans">
        <Toast
          message={notificationError}
          onClose={() => setNotificationError("")}
        />
        <button
          onClick={() => setWorkflow("selection")}
          className="flex items-center gap-4 text-slate-400 hover:text-emerald-600 font-black uppercase tracking-[0.3em] text-[10px] transition-colors mb-20"
        >
          <ArrowLeft size={16} /> Menu
        </button>
        <div className="max-w-4xl mx-auto bg-white rounded-[4rem] shadow-2xl overflow-hidden border border-slate-100 animate-in slide-in-from-bottom-8 duration-500">
          <div className="bg-slate-900 p-16 text-white text-center">
            <h2 className="text-4xl font-black tracking-tight">
              Courier Registry
            </h2>
            <p className="opacity-50 mt-4 text-[10px] font-black uppercase tracking-[0.4em]">
              Inbound Package Synchronization
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setLastFormStep("delivery");
              setWorkflow("photo-verify");
            }}
            className="p-16 space-y-12"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <Input
                icon={Building}
                label="Courier Service"
                placeholder="e.g. FedEx, UPS"
                value={deliveryData.company}
                onChange={(v: any) =>
                  setDeliveryData({ ...deliveryData, company: v })
                }
              />
              <Input
                icon={User}
                label="Driver Name"
                placeholder="Full Name"
                value={deliveryData.personName}
                onChange={(v: any) =>
                  setDeliveryData({ ...deliveryData, personName: v })
                }
              />
              <Input
                icon={Phone}
                label="Contact Phone"
                type="tel"
                placeholder="000-000-0000"
                value={deliveryData.phone}
                onChange={(v: any) =>
                  setDeliveryData({ ...deliveryData, phone: v })
                }
              />
              <Input
                icon={Mail}
                label="Contact Email"
                type="email"
                placeholder="driver@courier.com"
                value={deliveryData.email}
                onChange={(v: any) =>
                  setDeliveryData({ ...deliveryData, email: v })
                }
              />

              <div className="relative space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
                  Delivery Intended For
                </label>
                <div className="relative group">
                  <UserCheck className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 transition-colors group-focus-within:text-emerald-500" />
                  <input
                    required
                    placeholder="Search staff name..."
                    className="w-full pl-16 pr-14 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-4 focus:ring-emerald-500/10 focus:bg-white focus:border-emerald-300 outline-none font-bold text-xl transition-all"
                    value={deliveryData.deliveryFor}
                    onFocus={() => setShowHostResults("deliveryFor")}
                    onChange={(e) => {
                      setDeliveryData({
                        ...deliveryData,
                        deliveryFor: e.target.value,
                      });
                      setShowHostResults("deliveryFor");
                    }}
                    autoComplete="off"
                  />
                  <Search className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-200" />
                </div>
                {showHostResults === "deliveryFor" && (
                  <HostDropdown
                    hosts={filteredHosts}
                    onSelect={(h) => {
                      setDeliveryData({
                        ...deliveryData,
                        deliveryFor: h.fullName,
                      });
                      setShowHostResults(null);
                    }}
                    onClose={() => setShowHostResults(null)}
                  />
                )}
              </div>

              <Input
                icon={ShieldCheck}
                label="Physically Received By (Witness)"
                placeholder="Authorized Name"
                value={deliveryData.receivedBy}
                onChange={(v: any) =>
                  setDeliveryData({ ...deliveryData, receivedBy: v })
                }
              />

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
                  Package Type
                </label>
                <div className="relative">
                  <Package className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 pointer-events-none" />
                  <select
                    required
                    disabled={deliveryTypes.length === 0}
                    className="w-full pl-16 pr-14 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-4 focus:ring-emerald-500/10 focus:bg-white outline-none font-bold text-xl appearance-none cursor-pointer"
                    value={deliveryData.packageType}
                    onChange={(e) =>
                      setDeliveryData({
                        ...deliveryData,
                        packageType: e.target.value,
                      })
                    }
                  >
                    {deliveryTypes.length === 0 && (
                      <option value="">No package types available</option>
                    )}
                    {deliveryTypes.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 pointer-events-none" />
                </div>
              </div>

              <Input
                icon={Hash}
                label="Package Quantity"
                type="number"
                min="1"
                placeholder="Number of items"
                value={deliveryData.packageCount}
                onChange={(v: any) =>
                  setDeliveryData({
                    ...deliveryData,
                    packageCount: parseInt(v) || 1,
                  })
                }
              />

              {showMoreInfoField && (
                <div className="md:col-span-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Input
                    icon={FileText}
                    label="Item Description / Details"
                    placeholder="e.g. 2x Monitors, Catering Trays, etc."
                    value={deliveryData.itemName}
                    onChange={(v: any) =>
                      setDeliveryData({ ...deliveryData, itemName: v })
                    }
                  />
                </div>
              )}

              <Input
                icon={Clock}
                label="Delivery Time"
                type="datetime-local"
                value={deliveryData.deliveryTime}
                onChange={(v: any) =>
                  setDeliveryData({ ...deliveryData, deliveryTime: v })
                }
              />

              <Input
                icon={ShieldCheck}
                label="Processed By"
                value={securitySession?.name || deliveryData.processedBy || ""}
                onChange={() => {}}
                disabled
                required={false}
              />

              <Input
                icon={Hash}
                label="Tracking Number"
                placeholder="Optional"
                value={deliveryData.trackingNumber}
                onChange={(v: any) =>
                  setDeliveryData({ ...deliveryData, trackingNumber: v })
                }
                required={false}
              />
            </div>
            <button
              type="submit"
              className="w-full py-10 rounded-[3rem] bg-emerald-600 hover:bg-emerald-700 font-black text-2xl text-white shadow-2xl shadow-emerald-100 transition-all active:scale-[0.98]"
            >
              Continue to Photo Verify
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (workflow === "asset-checkout") {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-12 md:p-24 overflow-y-auto font-sans">
        <button
          onClick={() => setWorkflow("asset-mode-select")}
          className="flex items-center gap-4 text-slate-400 hover:text-indigo-600 font-black uppercase tracking-[0.3em] text-[10px] transition-colors mb-20"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="max-w-4xl mx-auto bg-white rounded-[4rem] shadow-2xl overflow-hidden border border-slate-100 animate-in slide-in-from-bottom-8 duration-500">
          <div className="bg-indigo-600 p-16 text-white text-center">
            <h2 className="text-4xl font-black tracking-tight">
              Equipment Departure
            </h2>
            <p className="opacity-50 mt-4 text-[10px] font-black uppercase tracking-[0.4em]">
              Asset Synchronization Protocol
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setLastFormStep("asset-checkout");
              setWorkflow("photo-verify");
            }}
            className="p-16 space-y-12"
          >
            <div className="p-6 bg-indigo-50/70 border-2 border-indigo-200 rounded-[2.5rem] shadow-sm">
              <label className="block text-[10px] font-black text-indigo-700 uppercase tracking-[0.3em] ml-1 mb-3">
                Select Asset Status (Required)
              </label>
              <select
                required
                className="w-full px-6 py-4 bg-white border border-indigo-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-lg appearance-none"
                value={assetForm.status}
                onChange={(e) =>
                  setAssetForm({
                    ...assetForm,
                    status: e.target.value as AssetStatus,
                  })
                }
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <Input
                icon={Package}
                label="Equipment / Tag Name"
                placeholder="e.g. MacBook Pro #42"
                value={assetForm.equipmentName}
                onChange={(v: any) =>
                  setAssetForm({ ...assetForm, equipmentName: v })
                }
              />
              <div className="relative space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
                  Staff Member in Charge
                </label>
                <div className="relative group">
                  <UserCheck className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 transition-colors group-focus-within:text-indigo-500" />
                  <input
                    required
                    placeholder="Who authorized this?"
                    className="w-full pl-16 pr-14 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none font-bold text-xl transition-all"
                    value={assetForm.staffInCharge}
                    onFocus={() => setShowHostResults("staffInCharge")}
                    onChange={(e) => {
                      setAssetForm({
                        ...assetForm,
                        staffInCharge: e.target.value,
                      });
                      setShowHostResults("staffInCharge");
                    }}
                    autoComplete="off"
                  />
                </div>
                {showHostResults === "staffInCharge" && (
                  <HostDropdown
                    hosts={filteredHosts}
                    onSelect={(h) => {
                      setAssetForm({ ...assetForm, staffInCharge: h.fullName });
                      setShowHostResults(null);
                    }}
                    onClose={() => setShowHostResults(null)}
                  />
                )}
              </div>
              <Input
                icon={User}
                label="Custodian Name"
                placeholder="Person taking the item"
                value={assetForm.borrowerName}
                onChange={(v: any) =>
                  setAssetForm({ ...assetForm, borrowerName: v })
                }
              />
              <Input
                icon={Phone}
                label="Custodian Phone"
                type="tel"
                placeholder="000-000-0000"
                value={assetForm.phone}
                onChange={(v: any) => setAssetForm({ ...assetForm, phone: v })}
              />

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
                  Logged Station / Campus
                </label>
                <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-6 flex items-center gap-4 group transition-all shadow-inner">
                  <MapPin
                    className="text-slate-300 group-hover:text-indigo-500 transition-colors"
                    size={24}
                  />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Assigned Location
                    </p>
                    <p className="text-xl font-black text-slate-800 tracking-tight leading-tight mt-1">
                      {securitySession?.station || "General Node"}
                    </p>
                  </div>
                </div>
                <p className="text-[8px] font-bold text-slate-300 uppercase tracking-[0.2em] ml-1">
                  Determined by Terminal Session Lockdown
                </p>
              </div>
              <Input
                icon={ShieldCheck}
                label="Processed By"
                value={securitySession?.name || assetForm.processedBy || ""}
                onChange={() => {}}
                disabled
                required={false}
              />
              <Input
                icon={Clock}
                label="Checkout Time"
                type="datetime-local"
                value={assetForm.checkoutTime}
                onChange={(v: any) =>
                  setAssetForm({ ...assetForm, checkoutTime: v })
                }
              />

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
                  Movement Reason
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 pointer-events-none" />
                  <select
                    className="w-full pl-16 pr-14 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none font-bold text-xl appearance-none cursor-pointer"
                    value={assetForm.reason}
                    onChange={(e) => {
                      const newReason = e.target.value;
                      // Reset targetCampus to current station if reason is NOT "Between Campus Move"
                      setAssetForm((prev) => ({
                        ...prev,
                        reason: newReason,
                        targetCampus:
                          newReason === "Between Campus Move"
                            ? ""
                            : securitySession?.station || "",
                      }));
                    }}
                  >
                    {assetReasons.map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 pointer-events-none" />
                </div>
              </div>

              {assetForm.reason === "Between Campus Move" && (
                <div className="space-y-4 md:col-span-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
                    Destination Campus / Station
                  </label>
                  <div className="relative group">
                    <Target className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 pointer-events-none group-focus-within:text-indigo-500" />
                    <select
                      required
                      className="w-full pl-16 pr-14 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-4 focus:ring-indigo-500/10 focus:bg-white outline-none font-bold text-xl appearance-none cursor-pointer transition-all"
                      value={assetForm.targetCampus}
                      onChange={(e) =>
                        setAssetForm({
                          ...assetForm,
                          targetCampus: e.target.value,
                        })
                      }
                    >
                      <option value="" disabled>
                        Select target destination...
                      </option>
                      {availableStations
                        .filter((s) => s !== securitySession?.station)
                        .map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 pointer-events-none" />
                  </div>
                </div>
              )}
            </div>
            <button
              type="submit"
              className="w-full py-10 rounded-[3rem] bg-indigo-600 hover:bg-indigo-700 font-black text-2xl text-white shadow-2xl shadow-indigo-100 transition-all active:scale-[0.98]"
            >
              Proceed to Verification
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (workflow === "asset-return-select") {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-12 md:p-24 overflow-y-auto font-sans">
        <Toast
          message={notificationError}
          onClose={() => setNotificationError("")}
        />
        <button
          onClick={() => setWorkflow("asset-mode-select")}
          className="flex items-center gap-4 text-slate-400 hover:text-emerald-600 font-black uppercase tracking-[0.3em] text-[10px] transition-colors mb-20"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="max-w-3xl mx-auto bg-white rounded-[4rem] shadow-2xl overflow-hidden border border-slate-100 animate-in slide-in-from-bottom-8 duration-500">
          <div className="bg-emerald-600 p-16 text-white text-center">
            <h2 className="text-4xl font-black tracking-tight">Asset Return</h2>
            <p className="opacity-50 mt-4 text-[10px] font-black uppercase tracking-[0.4em]">
              Close Active Logistics Record
            </p>
          </div>
          <div className="p-16 space-y-12">
            <div className="relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 w-6 h-6 group-focus-within:text-emerald-500 transition-colors" />
              <input
                placeholder="Search Equipment or Custodian..."
                className="w-full pl-16 pr-6 py-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] outline-none font-black text-xl transition-all"
                value={assetSearch}
                onChange={(e) => setAssetSearch(e.target.value)}
              />
            </div>
            <div className="space-y-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-2">
                Active Movements
              </p>
              {activeAssets
                .filter(
                  (a) =>
                    a.equipmentName
                      .toLowerCase()
                      .includes(assetSearch.toLowerCase()) ||
                    a.borrowerName
                      .toLowerCase()
                      .includes(assetSearch.toLowerCase()),
                )
                .map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => {
                      setSelectedAssetForReturn(asset);
                      setReturnData({
                        status: "On-site",
                        receiverName: "",
                        returningStaffName: "",
                        returnerName: "",
                        securityName: securitySession?.name || "",
                        condition: "Good",
                        maintenanceNotes: "",
                        returnTime: toDateTimeInputValue(new Date()),
                        processedBy: securitySession?.name || "",
                      });
                      setWorkflow("asset-return-form");
                    }}
                    className="w-full flex justify-between items-center p-10 bg-slate-50/50 border border-slate-50 rounded-[3rem] hover:bg-emerald-50 hover:border-emerald-200 transition-all text-left group shadow-sm"
                  >
                    <div className="flex gap-8 items-center">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                        <RefreshCw size={32} />
                      </div>
                      <div>
                        <span className="font-black text-2xl text-slate-800 tracking-tight block">
                          {asset.equipmentName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2 block">
                          Held by {asset.borrowerName} • Reason: {asset.reason}
                        </span>
                      </div>
                    </div>
                    <ChevronRight
                      className="text-slate-200 group-hover:text-emerald-500 group-hover:translate-x-2 transition-all"
                      size={32}
                    />
                  </button>
                ))}
              {activeAssets.length === 0 && (
                <div className="text-center py-24 text-slate-300 font-black uppercase tracking-widest text-[10px] border-2 border-dashed border-slate-100 rounded-[4rem]">
                  No active equipment movements found
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (workflow === "asset-return-form") {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-12 md:p-24 overflow-y-auto font-sans">
        <Toast
          message={notificationError}
          onClose={() => setNotificationError("")}
        />
        <button
          onClick={() => setWorkflow("asset-return-select")}
          className="flex items-center gap-4 text-slate-400 hover:text-emerald-600 font-black uppercase tracking-[0.3em] text-[10px] transition-colors mb-20"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="max-w-4xl mx-auto bg-white rounded-[4rem] shadow-2xl overflow-hidden border border-slate-100 animate-in slide-in-from-bottom-8 duration-500">
          <div className="bg-emerald-600 p-16 text-white text-center">
            <h2 className="text-4xl font-black tracking-tight">Return Sync</h2>
            <p className="opacity-50 mt-4 text-[10px] font-black uppercase tracking-[0.4em]">
              Item: {selectedAssetForReturn?.equipmentName}
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (
                !returnData.status ||
                !returnData.returnerName.trim() ||
                !returnData.returningStaffName.trim() ||
                !returnData.receiverName.trim() ||
                !returnData.securityName.trim() ||
                !returnData.condition ||
                !returnData.returnTime
              ) {
                setError(
                  "Status, returner, returning staff, receiver, security witness, condition and return time are required.",
                );
                return;
              }
              setLastFormStep("asset-return");
              setWorkflow("photo-verify");
            }}
            className="p-16 space-y-12"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
                  Return Status
                </label>
                <div className="relative">
                  <Target className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 pointer-events-none" />
                  <select
                    required
                    className="w-full pl-16 pr-14 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-4 focus:ring-emerald-500/10 focus:bg-white outline-none font-bold text-xl appearance-none cursor-pointer"
                    value={returnData.status}
                    onChange={(e) =>
                      setReturnData({
                        ...returnData,
                        status: e.target.value as AssetStatus,
                      })
                    }
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 pointer-events-none" />
                </div>
              </div>
              <Input
                icon={User}
                label="Person Physically Returning Item"
                placeholder="Full Name"
                value={returnData.returnerName}
                onChange={(v: any) =>
                  setReturnData({ ...returnData, returnerName: v })
                }
              />
              <div className="relative space-y-4" ref={hostResultsRef}>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
                  Returning Staff Name
                </label>
                <div className="relative group">
                  <UserCheck className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 transition-colors group-focus-within:text-emerald-500" />
                  <input
                    required
                    placeholder="Search staff name..."
                    className="w-full pl-16 pr-14 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-4 focus:ring-emerald-500/10 focus:bg-white focus:border-emerald-300 outline-none font-bold text-xl transition-all"
                    value={returnData.returningStaffName}
                    onFocus={() => setShowHostResults("returningStaffName")}
                    onChange={(e) => {
                      setReturnData({
                        ...returnData,
                        returningStaffName: e.target.value,
                      });
                      setShowHostResults("returningStaffName");
                    }}
                    autoComplete="off"
                  />
                  <Search className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-200" />
                </div>
                {showHostResults === "returningStaffName" && (
                  <HostDropdown
                    hosts={filteredHosts}
                    onSelect={(h) => {
                      setReturnData({
                        ...returnData,
                        returningStaffName: h.fullName,
                      });
                      setShowHostResults(null);
                    }}
                    onClose={() => setShowHostResults(null)}
                  />
                )}
              </div>
              <div className="relative space-y-4" ref={hostResultsRef}>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
                  Receiver Name
                </label>
                <div className="relative group">
                  <UserCheck className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 transition-colors group-focus-within:text-emerald-500" />
                  <input
                    required
                    placeholder="Search receiver name..."
                    className="w-full pl-16 pr-14 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-4 focus:ring-emerald-500/10 focus:bg-white focus:border-emerald-300 outline-none font-bold text-xl transition-all"
                    value={returnData.receiverName}
                    onFocus={() => setShowHostResults("receiverName")}
                    onChange={(e) => {
                      setReturnData({
                        ...returnData,
                        receiverName: e.target.value,
                      });
                      setShowHostResults("receiverName");
                    }}
                    autoComplete="off"
                  />
                  <Search className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-200" />
                </div>
                {showHostResults === "receiverName" && (
                  <HostDropdown
                    hosts={filteredHosts}
                    onSelect={(h) => {
                      setReturnData({
                        ...returnData,
                        receiverName: h.fullName,
                      });
                      setShowHostResults(null);
                    }}
                    onClose={() => setShowHostResults(null)}
                  />
                )}
              </div>
              <Input
                icon={ShieldCheck}
                label="Verification Officer (Witness)"
                placeholder="Security Name"
                value={returnData.securityName}
                onChange={(v: any) =>
                  setReturnData({ ...returnData, securityName: v })
                }
              />
              <Input
                icon={Clock}
                label="Return Time"
                type="datetime-local"
                value={returnData.returnTime}
                onChange={(v: any) =>
                  setReturnData({ ...returnData, returnTime: v })
                }
              />
              <Input
                icon={Shield}
                label="Processed By"
                value={securitySession?.name || returnData.processedBy || ""}
                onChange={() => {}}
                disabled
                required={false}
              />

              <div className="space-y-4 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
                  Condition Protocol
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
                      onClick={() =>
                        setReturnData({ ...returnData, condition: cond.val })
                      }
                      className={`flex-1 flex items-center justify-center gap-3 py-6 rounded-2xl border-2 transition-all font-black text-[10px] uppercase tracking-widest ${returnData.condition === cond.val ? `bg-${cond.color}-50 border-${cond.color}-500 text-${cond.color}-700 shadow-inner` : "bg-white border-slate-100 text-slate-400 hover:bg-slate-50"}`}
                    >
                      <cond.icon size={16} /> {cond.val}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-4 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
                  Maintenance Notes (Optional)
                </label>
                <textarea
                  placeholder="e.g. Needs cleaning, screen flicker observed..."
                  className="w-full p-8 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold text-lg min-h-[150px] transition-all resize-none"
                  value={returnData.maintenanceNotes}
                  onChange={(e) =>
                    setReturnData({
                      ...returnData,
                      maintenanceNotes: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-10 rounded-[3rem] bg-emerald-600 hover:bg-emerald-700 font-black text-2xl text-white shadow-2xl shadow-emerald-100 transition-all active:scale-[0.98]"
            >
              Confirm & Photo Evidence
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (workflow === "photo-verify") {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-12 text-white font-sans overflow-hidden">
        <Toast
          message={notificationError}
          onClose={() => setNotificationError("")}
        />
        <div className="max-w-4xl w-full bg-white/5 rounded-[5rem] p-20 backdrop-blur-2xl border border-white/10 text-center space-y-16 shadow-2xl animate-in zoom-in-95 duration-500">
          <div>
            <h2 className="text-5xl font-black tracking-tight mb-4">
              Registry Evidence
            </h2>
            <p className="text-white/40 font-black uppercase tracking-[0.5em] text-xs">
              Visual synchronization required for logistics log
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
                <Camera size={32} /> Capture Registry Evidence
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
                  Synchronize Log
                </button>
              </>
            )}
          </div>
          <ErrorBanner message={error} />
        </div>
      </div>
    );
  }

  if (workflow === "success") {
    return (
      <div className="min-h-screen bg-indigo-600 flex items-center justify-center text-white text-center p-12 font-sans overflow-hidden">
        <Toast
          message={notificationError}
          onClose={() => setNotificationError("")}
        />
        <div className="animate-in zoom-in duration-1000">
          <div className="w-48 h-48 bg-white/10 rounded-[5rem] flex items-center justify-center mx-auto mb-16 shadow-2xl border border-white/5 backdrop-blur-xl">
            {isSendingNotifications ? (
              <Loader2 className="w-24 h-24 animate-spin opacity-40" />
            ) : (
              <ShieldCheck className="w-24 h-24" />
            )}
          </div>
          <h1 className="text-7xl font-black mb-6 tracking-tight">
            {successMessage}
          </h1>
          <p className="text-3xl opacity-60 font-medium tracking-wide">
            {isSendingNotifications
              ? "Dispatching encrypted cloud notifications..."
              : "The logistics record has been successfully synchronized."}
          </p>
          {!isSendingNotifications && (
            <div className="mt-16 max-w-2xl mx-auto flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <div className="flex items-center justify-center gap-3 bg-white/10 py-5 px-10 rounded-[2rem] border border-white/10 backdrop-blur-md">
                <Globe size={20} className="text-white" />
                <div className="text-left">
                  <span className="block text-[10px] font-black uppercase tracking-widest opacity-40">
                    Digital Hub Sync
                  </span>
                  <span className="text-xs font-black uppercase tracking-[0.1em]">
                    Verification records transmitted to administration
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
    className={`bg-white p-24 rounded-[5rem] shadow-xl hover:shadow-2xl transition-all border border-slate-100 flex flex-col items-center group animate-in slide-in-from-bottom duration-1000 ${color === "emerald" ? "hover:border-emerald-500" : "hover:border-indigo-500"}`}
  >
    <div
      className={`w-40 h-40 ${color === "emerald" ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"} rounded-[3rem] flex items-center justify-center group-hover:scale-110 transition-all duration-700 shadow-sm mb-12`}
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

const HostDropdown = ({
  hosts,
  onSelect,
  onClose,
}: {
  hosts: Host[];
  onSelect: (h: Host) => void;
  onClose: () => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      className="absolute z-50 w-full mt-4 bg-white border border-slate-100 rounded-[3rem] shadow-2xl overflow-hidden max-h-[350px] overflow-y-auto animate-in fade-in slide-in-from-top-4 duration-300"
    >
      {hosts.map((host) => (
        <button
          key={host.id}
          type="button"
          className="w-full px-10 py-6 text-left hover:bg-emerald-50 border-b border-slate-50 last:border-0 flex items-center justify-between group transition-all"
          onClick={() => onSelect(host)}
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
      {hosts.length === 0 && (
        <div className="p-12 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">
          No matching personnel found
        </div>
      )}
    </div>
  );
};

export default LogisticsHub;
