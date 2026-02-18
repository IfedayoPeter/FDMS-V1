import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
  Navigate,
} from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Package,
  Key,
  Settings,
  LogOut,
  Search,
  Sparkles,
  User,
  Truck,
  BellRing,
  Monitor,
  Plus,
  Trash2,
  Save,
  ShieldCheck,
  CheckCircle,
  Building2,
  Mail,
  Smartphone,
  KeyRound,
  MessageSquare,
  Activity,
  ChevronRight,
  ChevronDown,
  ImageIcon,
  X,
  FileUp,
  BarChart3,
  TrendingUp,
  Clock,
  PieChart as PieChartIcon,
  Maximize2,
  Calendar,
  Hash,
  Eye,
  UserCheck,
  RefreshCw,
  Download,
  FileText,
  Zap,
  Award,
  MapPin,
  Flame,
  Timer,
  Edit2,
  AlertTriangle,
  Layers,
  FileSignature,
  ShieldAlert,
  MoreVertical,
  Hammer,
  Lock,
  Briefcase,
  Box,
  SendHorizontal,
  FileSignature as SigIcon,
  Code,
  Filter,
  SearchX,
  Target,
  History,
  LogIn,
  Globe,
  MessageCircle,
  Key as KeyIcon,
  Fingerprint,
  Car,
  UserPlus,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  BadgeCheck,
  UserCog,
  Camera,
  Shield,
  FileCheck,
  TableProperties,
  ArrowRightLeft,
  PanelLeftOpen,
  PanelLeftClose,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Visitor,
  KeyLog,
  DeliveryRecord,
  SystemSettings,
  Host,
  KeyAsset,
  AssetMovement,
  AssetStatus,
  MovementReason,
  VisitorReason,
  WatchlistEntry,
  SecurityAlert,
  NotificationLog,
  SecurityOfficer,
} from "../types";
import { getAdminInsights } from "../services/geminiService";
import { workspaceService } from "../services/workspaceService";
import apiService from "../services/apiService";
import { LoadingOverlay } from "./components/Loading";
import ConfirmActionModal from "./components/ConfirmActionModal";
import ErrorBanner from "./components/ErrorBanner";
import {
  ApiEnvelope,
  ensureApiSuccess,
  getApiContent,
  getApiErrorMessage,
} from "../services/apiResponse";

const DEFAULT_SETTINGS: SystemSettings = {
  notificationsEnabled: true,
  notificationCopyEmail: "",
  hostCheckInTemplate:
    "Hello {{host_name}}, your visitor {{visitor_name}} from {{company}} has arrived for {{purpose}} at {{time}} at the {{location}} campus.",
  guestCheckInTemplate:
    "Hi {{visitor_name}}, welcome to {{company}}! Your host {{host_name}} has been notified and will be with you shortly.",
  hostCheckOutTemplate:
    "Your visitor {{visitor_name}} from {{company}} has checked out at {{time}}.",
  guestCheckOutTemplate:
    "Hi {{visitor_name}}, thank you for visiting {{company}}. Safe travels!",
  hostDeliveryTemplate:
    "Hello {{delivery_for}}, a delivery from {{company}} ({{courier_name}}) has been received for you at {{time}}. Package Type: {{package_type}}.",
  courierDeliveryTemplate:
    "Hi {{courier_name}}, your delivery to {{company_name}} for {{delivery_for}} has been successfully logged at {{time}}. Thank you.",
  hostAssetCheckoutTemplate:
    "Hello {{staff_in_charge}}, {{borrower_name}} has checked out {{equipment_name}} for {{reason}} at {{time}}.",
  borrowerAssetCheckoutTemplate:
    "Hi {{borrower_name}}, you have checked out {{equipment_name}} from {{company_name}}. Please return it by the required time.",
  hostAssetReturnTemplate:
    "Hello {{staff_in_charge}}, {{equipment_name}} has been returned by {{borrower_name}} at {{time}}. Reported Condition: {{condition}}.",
  borrowerAssetReturnTemplate:
    "Hi {{borrower_name}}, thank you for returning {{equipment_name}}. The return has been logged successfully.",
  hostAssetOverdueTemplate:
    "🚨 HIGH SECURITY ALERT 🚨\n\n⚠️ URGENT: Equipment {{equipment_name}} is currently {{overdue_duration}} OVERDUE for campus delivery. \n\n👤 Custodian: {{borrower_name}}\n📍 Target: {{target_campus}}\n⏰ Last Seen: {{time}}",
  borrowerAssetOverdueTemplate:
    "⚠️ URGENT SECURITY NOTICE ⚠️\n\n{{borrower_name}}, the equipment ({{equipment_name}}) you are transferring is currently {{overdue_duration}} overdue. Please record delivery immediately at the {{target_campus}} kiosk.",
  hostKeyCheckoutTemplate:
    "Hello, {{borrower_name}} has checked out Key #{{key_number}} ({{key_name}}) for {{purpose}} at {{time}}. Security Witness: {{security_name}}.",
  borrowerKeyCheckoutTemplate:
    "Hi {{borrower_name}}, you have checked out Key #{{key_number}} ({{key_name}}). Please return it by 18:00 today. Witnessed by: {{security_name}}.",
  hostKeyReturnTemplate:
    "Hello, Key #{{key_number}} ({{key_name}}) was returned by {{returner_name}} at {{time}}. Reported Condition: {{condition}}. Witnessed by: {{security_name}}.",
  borrowerKeyReturnTemplate:
    "Hi {{returner_name}}, thank you for returning Key #{{key_number}} ({{key_name}}). Your return has been verified by {{security_name}}.",
  hostKeyOverdueTemplate:
    "🚨 SECURITY ALERT: UNRETURNED KEY 🚨\n\nHello Security Admin, Key #{{key_number}} ({{key_name}}) borrowed by {{borrower_name}} at {{borrowed_at}} has not been returned. The 18:00 cutoff has passed.",
  borrowerKeyOverdueTemplate:
    "⚠️ URGENT: KEY RETURN REQUIRED ⚠️\n\nHi {{borrower_name}}, our records show that you still have Key #{{key_number}} ({{key_name}}). Please return it to the kiosk immediately as the business day has ended.",
  kiosk: {
    companyName: "Exxcel Consulting",
    locationName: "Front Desk",
    supportEmail: "support@exxcel.consulting",
    senderEmail: "notifications@exxcel.consulting",
    logoUrl: "",
  },
  workspace: {
    enabled: false,
    domain: "exxcel.consulting",
    useCustomerDirectory: false,
    chatNotificationsEnabled: false,
    calendarEnabled: false,
  },
};

const normalizeNumericIds = (ids: Array<number | string | undefined | null>) =>
  Array.from(
    new Set(ids.map((id) => Number(id)).filter((id) => Number.isFinite(id))),
  );

const resolveCurrentOperatorName = () => {
  const adminName = localStorage.getItem("adminSessionName");
  if (adminName) return adminName;

  const securitySessionRaw = localStorage.getItem("securitySession");
  if (securitySessionRaw) {
    try {
      const parsed = JSON.parse(securitySessionRaw);
      if (parsed?.name) return parsed.name;
    } catch {
      // Ignore parse errors and fall back.
    }
  }

  return "System Operator";
};

const resolveCurrentAdminName = () => {
  const adminName = localStorage.getItem("adminSessionName");
  if (adminName) return adminName;
  return resolveCurrentOperatorName();
};

/* --- EXPORT UTILITIES --- */

const exportToCSV = (data: any[], type: string) => {
  if (data.length === 0) return;
  const cleanData = data.map((item) => {
    const newItem = { ...item };
    delete newItem.photo;
    delete newItem.returnPhoto;
    delete newItem.signature;
    delete newItem.sessions;
    return newItem;
  });
  const headers = Object.keys(cleanData[0]).join(",");
  const rows = cleanData.map((item) =>
    Object.values(item)
      .map((val) =>
        val === null || val === undefined
          ? ""
          : `"${String(val).replace(/"/g, '""')}"`,
      )
      .join(","),
  );
  const csvContent = [headers, ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `${type}_log_${new Date().toISOString().split("T")[0]}.csv`,
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const exportToPDF = (
  data: any[],
  title: string,
  type: string,
  settings: SystemSettings,
) => {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  const { companyName, logoUrl, locationName } = settings.kiosk;
  const excludeKeys = [
    "photo",
    "returnPhoto",
    "id",
    "signature",
    "maintenanceNotes",
    "sessions",
  ];
  const columns =
    data.length > 0
      ? Object.keys(data[0]).filter((k) => !excludeKeys.includes(k))
      : [];

  // Reorder columns to ensure accountability is near the end but visible
  const finalCols = [
    ...columns.filter((c) => c !== "processedBy"),
    "processedBy",
  ];

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" style="height: 60px; max-width: 200px; object-fit: contain; margin-bottom: 10px;" />`
    : `<div style="height: 60px; display: flex; align-items: center; font-size: 24px; font-weight: 900; color: #4f46e5; letter-spacing: -0.05em;">${companyName}</div>`;

  const html = `
    <html>
      <head>
        <title>Audit Report - ${title}</title>
        <style>
          @page { size: landscape; margin: 15mm; }
          body { font-family: 'Inter', system-ui, -apple-system, sans-serif; padding: 0; color: #1e293b; line-height: 1.4; background-color: #fff; }
          .header { border-bottom: 3px solid #4f46e5; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
          .header-branding { display: flex; flex-direction: column; }
          .header-title h1 { margin: 10px 0 0 0; font-size: 28px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.025em; color: #0f172a; }
          .header-title p { margin: 4px 0 0 0; color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; }
          .audit-meta { text-align: right; font-size: 10px; color: #94a3b8; font-weight: 600; font-family: monospace; }
          .summary { background: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 30px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; border: 1px solid #e2e8f0; }
          .summary-item { display: flex; flex-direction: column; }
          .summary-label { font-size: 9px; text-transform: uppercase; font-weight: 800; color: #64748b; letter-spacing: 0.08em; margin-bottom: 4px; }
          .summary-value { font-size: 16px; font-weight: 800; color: #1e293b; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; table-layout: auto; border: 1px solid #e2e8f0; }
          th { text-align: left; background: #1e293b; color: #fff; padding: 12px 10px; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid #1e293b; }
          td { padding: 10px; font-size: 9px; border-bottom: 1px solid #e2e8f0; color: #334155; vertical-align: top; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .pill { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 7px; font-weight: 800; text-transform: uppercase; border: 1px solid transparent; }
          .pill-green { background: #10b981; color: #fff; }
          .pill-red { background: #ef4444; color: #fff; }
          .verified-stamp { color: #4f46e5; font-weight: 900; text-transform: uppercase; font-size: 8px; display: flex; align-items: center; gap: 4px; }
          .sign-off { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 60px; page-break-inside: avoid; }
          .signature-box { border-top: 2px solid #e2e8f0; padding-top: 10px; height: 80px; display: flex; align-items: flex-end; }
          .signature-label { font-size: 9px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.1em; }
          .footer { position: fixed; bottom: 0; width: 100%; font-size: 8px; color: #94a3b8; text-align: center; padding-top: 10px; border-top: 1px solid #f1f5f9; text-transform: uppercase; font-weight: 700; letter-spacing: 0.15em; background: #fff; }
          @media print {
            .footer { position: fixed; bottom: 0; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            th { -webkit-print-color-adjust: exact; background-color: #1e293b !important; color: white !important; }
            .summary { -webkit-print-color-adjust: exact; background-color: #f1f5f9 !important; }
            .pill-green { -webkit-print-color-adjust: exact; background-color: #10b981 !important; color: #fff !important; }
            .pill-red { -webkit-print-color-adjust: exact; background-color: #ef4444 !important; color: #fff !important; }
            .verified-stamp { -webkit-print-color-adjust: exact; color: #4f46e5 !important; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-branding">
            ${logoHtml}
            <div class="header-title">
              <h1>Audit: ${title}</h1>
              <p>Official Verification Protocol // ${companyName}</p>
            </div>
          </div>
          <div class="audit-meta">
            <div>REF-ID: AUD-${Math.random().toString(36).substr(2, 8).toUpperCase()}</div>
            <div>STAMP: ${new Date().toLocaleString()}</div>
            <div>AUTH: Registry Console v3.14</div>
          </div>
        </div>
        <div class="summary">
          <div class="summary-item">
            <span class="summary-label">Volume</span>
            <span class="summary-value">${data.length} Registered Entries</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Registry Node</span>
            <span class="summary-value">${locationName} Hub</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Data Modality</span>
            <span class="summary-value">${type.toUpperCase()} Log</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Accountability State</span>
            <span class="summary-value">STAMPED & SIGNED</span>
          </div>
        </div>
        <table>
          <thead>
            <tr>${finalCols.map((k) => `<th>${k.replace(/([A-Z])/g, " $1").replace("processed By", "Verified By")}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${data
              .map(
                (item) => `
              <tr>
                ${finalCols
                  .map((col) => {
                    const val = item[col];
                    let displayVal = val || "—";
                    if (col === "status") {
                      const isGreen =
                        val === "In" ||
                        val === "On-site" ||
                        val === "Returned" ||
                        val === "Sent" ||
                        val === "Delivered";
                      return `<td><span class="pill ${isGreen ? "pill-green" : "pill-red"}">${val}</span></td>`;
                    }
                    if (col === "processedBy") {
                      return `<td><div class="verified-stamp">✓ ${val || "System Registry"}</div></td>`;
                    }
                    if (
                      typeof val === "string" &&
                      val.includes("T") &&
                      val.endsWith("Z")
                    ) {
                      displayVal = new Date(val).toLocaleString([], {
                        dateStyle: "short",
                        timeStyle: "short",
                      });
                    }
                    return `<td>${displayVal}</td>`;
                  })
                  .join("")}
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
        <div class="sign-off">
          <div class="signature-box"><div class="signature-label">Auditor Digital Certificate</div></div>
          <div class="signature-box"><div class="signature-label">Admin Approval Handshake</div></div>
        </div>
        <div class="footer">Certified System Audit Log • Accountability Protocol Active • © ${new Date().getFullYear()} ${companyName}</div>
        <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 800); };</script>
      </body>
    </html>
  `;
  printWindow.document.write(html);
  printWindow.document.close();
};

/* --- SHARED LOG VIEW COMPONENTS --- */

const DetailModal = ({
  isOpen,
  onClose,
  title,
  data,
  type,
  allData,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: any;
  type: string;
  allData: any[];
}) => {
  if (!isOpen || !data) return null;
  const history = useMemo(() => {
    if (type !== "visitor") return [];
    return allData
      .filter((item) => item.phone === data.phone && item.id !== data.id)
      .sort(
        (a, b) =>
          new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime(),
      );
  }, [type, data.phone, data.id, allData]);

  const getStatusStyle = (status: string) => {
    const isSuccess =
      status === "In" ||
      status === "On-site" ||
      status === "Returned" ||
      status === "Sent" ||
      status === "Delivered";
    return isSuccess
      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-100"
      : "bg-rose-500 text-white shadow-lg shadow-rose-100";
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-[3.5rem] shadow-2xl animate-in zoom-in-95 duration-500 flex flex-col">
        <header className="p-10 border-b border-slate-50 flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-md z-10 flex-shrink-0">
          <div>
            <div className="flex items-center gap-4">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                {title}
              </h2>
              <span
                className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusStyle(data.status)}`}
              >
                {data.status === "In" ||
                data.status === "Returned" ||
                data.status === "On-site" ||
                data.status === "Delivered"
                  ? "Session Active / Delivered"
                  : "Currently Signed Out"}
              </span>
            </div>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em] mt-2">
              Registry Record ID // {data.id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all"
          >
            <X size={28} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-12">
              <div className="grid grid-cols-1 gap-8">
                {type === "visitor" && (
                  <>
                    <DetailItem
                      label="Full Name"
                      value={data.name}
                      icon={User}
                    />
                    <DetailItem
                      label="Contact"
                      value={`${data.email} • ${data.phone}`}
                      icon={Mail}
                    />
                    <DetailItem
                      label="Affiliation"
                      value={data.company}
                      icon={Building2}
                    />
                    <div className="grid grid-cols-2 gap-8">
                      <DetailItem
                        label="Visitor Type"
                        value={data.visitorType || "Guest"}
                        icon={Users}
                      />
                      <DetailItem
                        label="Duration"
                        value={data.expectedDuration || "1 Hour"}
                        icon={Timer}
                      />
                    </div>
                    {data.licensePlate && (
                      <DetailItem
                        label="Vehicle Plate"
                        value={data.licensePlate}
                        icon={Car}
                      />
                    )}
                    <DetailItem
                      label="Host"
                      value={data.host}
                      icon={UserCheck}
                    />
                    <DetailItem
                      label="Location"
                      value={`${data.location} Campus`}
                      icon={MapPin}
                    />
                    <DetailItem
                      label="Purpose"
                      value={data.purpose}
                      icon={MessageSquare}
                    />
                    <DetailItem
                      label="Check-In"
                      value={new Date(data.checkInTime).toLocaleString()}
                      icon={Clock}
                    />
                    {data.checkOutTime && (
                      <DetailItem
                        label="Check-Out"
                        value={new Date(data.checkOutTime).toLocaleString()}
                        icon={LogOut}
                      />
                    )}
                    {data.signature && (
                      <div className="space-y-4 pt-4 border-t border-slate-50">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
                          Digital Compliance Signature
                        </p>
                        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex items-center justify-center">
                          <img
                            src={data.signature}
                            className="max-h-24 w-auto object-contain mix-blend-multiply opacity-80"
                            alt="Signature"
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
                {type === "delivery" && (
                  <>
                    <DetailItem
                      label="Courier Service"
                      value={data.company}
                      icon={Truck}
                    />
                    <DetailItem
                      label="Courier's Name"
                      value={data.personName}
                      icon={User}
                    />
                    <DetailItem
                      label="Courier Contact"
                      value={`${data.phone || "N/A"} • ${data.email || "N/A"}`}
                      icon={Mail}
                    />
                    <DetailItem
                      label="Intended For"
                      value={data.deliveryFor || "N/A"}
                      icon={UserCheck}
                    />
                    <DetailItem
                      label="Campus Location"
                      value={data.location || "N/A"}
                      icon={MapPin}
                    />
                    <DetailItem
                      label="Physically Received By"
                      value={data.receivedBy || data.recipient || "N/A"}
                      icon={ShieldCheck}
                    />
                    <DetailItem
                      label="Contents"
                      value={`${data.packageCount}x ${data.packageType}${data.itemName ? ` (${data.itemName})` : ""}`}
                      icon={Package}
                    />
                    <DetailItem
                      label="Tracking ID"
                      value={data.trackingNumber || "N/A"}
                      icon={Hash}
                    />
                    <DetailItem
                      label="Synchronization"
                      value={new Date(data.timestamp).toLocaleString()}
                      icon={Clock}
                    />
                  </>
                )}
                {type === "key" && (
                  <>
                    <DetailItem
                      label="Asset Identifier"
                      value={`${data.keyNumber} - ${data.keyName}`}
                      icon={KeyRound}
                    />
                    <DetailItem
                      label="Borrowed By"
                      value={data.borrowerName}
                      icon={User}
                    />
                    {data.returnerName && (
                      <DetailItem
                        label="Returned By"
                        value={data.returnerName}
                        icon={UserCheck}
                      />
                    )}
                    <DetailItem
                      label="Access Reason"
                      value={data.purpose}
                      icon={MessageSquare}
                    />
                    <DetailItem
                      label="Time Borrowed"
                      value={new Date(data.borrowedAt).toLocaleString()}
                      icon={Clock}
                    />
                    {data.returnedAt && (
                      <DetailItem
                        label="Time Returned"
                        value={new Date(data.returnedAt).toLocaleString()}
                        icon={RefreshCw}
                      />
                    )}
                    <DetailItem
                      label="Verification Officer"
                      value={
                        data.checkoutSecurityName ||
                        data.returnSecurityName ||
                        "N/A"
                      }
                      icon={ShieldCheck}
                    />
                  </>
                )}
                {type === "asset" && (
                  <>
                    <DetailItem
                      label="Equipment Tag"
                      value={data.equipmentName}
                      icon={Package}
                    />
                    <DetailItem
                      label="Custodian"
                      value={data.borrowerName}
                      icon={User}
                    />
                    <DetailItem
                      label="Staff in Charge"
                      value={data.staffInCharge || "N/A"}
                      icon={UserCheck}
                    />
                    <DetailItem
                      label="Movement Reason"
                      value={data.reason}
                      icon={MessageSquare}
                    />
                    <DetailItem
                      label="Departure"
                      value={new Date(data.checkoutTime).toLocaleString()}
                      icon={Clock}
                    />
                    {data.returnTime && (
                      <DetailItem
                        label="Return"
                        value={new Date(data.returnTime).toLocaleString()}
                        icon={RefreshCw}
                      />
                    )}
                    <DetailItem
                      label="Logistics Status"
                      value={data.status}
                      icon={Truck}
                    />
                  </>
                )}
              </div>

              <div className="pt-8 mt-4 border-t border-slate-100 animate-in slide-in-from-bottom-2 duration-700">
                <div className="p-8 bg-indigo-50/50 border border-indigo-100 rounded-[2.5rem] relative overflow-hidden group">
                  <div className="absolute -top-4 -right-4 opacity-5 group-hover:scale-125 transition-transform duration-1000 rotate-12">
                    <ShieldCheck size={120} className="text-indigo-600" />
                  </div>
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-50">
                        <FileCheck size={28} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 mb-1">
                          Official Security Seal
                        </p>
                        <p className="text-xl font-black text-indigo-900 tracking-tight">
                          Verified by {data.processedBy || "System Registry"}
                        </p>
                        <p className="text-[9px] font-bold text-indigo-400/60 uppercase tracking-widest mt-1">
                          Authenticated via Terminal ID: KSK-01 // Timestamp
                          Validated
                        </p>
                      </div>
                    </div>
                    <div className="hidden sm:flex flex-col items-end opacity-40">
                      <Fingerprint size={32} className="text-indigo-300" />
                      <span className="text-[8px] font-black uppercase tracking-tighter mt-1">
                        Audit Cert. 0314-X
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-12">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-2 mb-4">
                  Verification Capture
                </p>
                {data.photo ? (
                  <div className="aspect-square bg-slate-50 rounded-[3rem] overflow-hidden border-8 border-slate-50 shadow-inner group relative">
                    <img
                      src={data.photo}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      alt="Verification"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8">
                      <button
                        onClick={() => {
                          const link = document.createElement("a");
                          link.href = data.photo;
                          link.download = `Verification-${data.id}.jpg`;
                          link.click();
                        }}
                        className="bg-white/20 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-full hover:bg-white/40 transition-all"
                      >
                        Download Capture
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-square bg-slate-50 rounded-[3rem] flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100">
                    <ImageIcon size={64} className="opacity-20 mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">
                      No visual record synchronized
                    </p>
                  </div>
                )}
              </div>
              {type === "visitor" &&
                data.sessions &&
                data.sessions.length > 1 && (
                  <div className="space-y-6 animate-in slide-in-from-top-4 duration-700">
                    <div className="flex items-center gap-3">
                      <Layers size={16} className="text-indigo-600" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">
                        Combined Daily Sessions
                      </p>
                    </div>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {data.sessions.map((session: any) => (
                        <div
                          key={session.id}
                          className="p-5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group hover:border-indigo-200 transition-all shadow-sm"
                        >
                          <div className="space-y-1">
                            <p className="text-xs font-black text-slate-800">
                              In:{" "}
                              {new Date(session.checkInTime).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                              {session.checkOutTime
                                ? ` — Out: ${new Date(session.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                                : " (Active)"}
                            </p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                              {session.purpose}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${session.status === "In" ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}
                          >
                            {session.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailItem = ({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: any;
}) => (
  <div className="flex gap-6 group">
    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all flex-shrink-0">
      <Icon size={24} />
    </div>
    <div className="pt-1">
      <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">
        {label}
      </p>
      <p className="text-xl font-bold text-slate-800 tracking-tight leading-tight">
        {value}
      </p>
    </div>
  </div>
);

const DeliveryFormModal = ({ delivery, onClose, onSave }: any) => {
  const requiredIfExisting = (value: any) =>
    value !== undefined &&
    value !== null &&
    (typeof value !== "string" || value.trim() !== "");
  const currentAdminName = resolveCurrentAdminName();
  const [formData, setFormData] = useState({
    company: delivery?.company || "",
    personName: delivery?.personName || "",
    phone: delivery?.phone || "",
    email: delivery?.email || "",
    deliveryFor: delivery?.deliveryFor || "",
    receivedBy: delivery?.receivedBy || "",
    packageType: delivery?.packageType || "",
    packageCount:
      typeof delivery?.packageCount === "number" ? delivery.packageCount : 1,
    trackingNumber: delivery?.trackingNumber || "",
    location: delivery?.location || "",
    notes: delivery?.notes || "",
    processedBy: currentAdminName,
  });
  const [deliveryTypes, setDeliveryTypes] = useState<any[]>([]);
  const [loadingDeliveryTypes, setLoadingDeliveryTypes] = useState(true);

  useEffect(() => {
    const loadDeliveryTypes = async () => {
      setLoadingDeliveryTypes(true);
      try {
        const response = await apiService.deliveryType.getAll({
          page: 1,
          pageSize: 100,
        });
        const types = getApiContent<any[]>(
          response as ApiEnvelope<any[]>,
          [],
          "delivery types",
        ).filter((type) => type && type.name && type.isActive !== false);
        setDeliveryTypes(types);
      } catch (error) {
        console.error("Failed to load delivery types for update:", error);
        setDeliveryTypes([]);
      } finally {
        setLoadingDeliveryTypes(false);
      }
    };

    loadDeliveryTypes();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      location: delivery?.location || formData.location,
      processedBy: currentAdminName,
    });
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl p-12 rounded-[3.5rem] shadow-2xl animate-in zoom-in-95 duration-500 border border-slate-100 max-h-[90vh] overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">
              Edit Delivery
            </h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
              Registry Synchronization
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all"
          >
            <X size={20} />
          </button>
        </header>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <SettingInput
              label="Company"
              icon={Building2}
              value={formData.company}
              onChange={(v: string) => setFormData({ ...formData, company: v })}
              required={requiredIfExisting(delivery?.company)}
            />
            <SettingInput
              label="Courier Name"
              icon={User}
              value={formData.personName}
              onChange={(v: string) =>
                setFormData({ ...formData, personName: v })
              }
              required={requiredIfExisting(delivery?.personName)}
            />
            <SettingInput
              label="Phone"
              icon={Smartphone}
              value={formData.phone}
              onChange={(v: string) => setFormData({ ...formData, phone: v })}
              required={requiredIfExisting(delivery?.phone)}
            />
            <SettingInput
              label="Email"
              icon={Mail}
              value={formData.email}
              onChange={(v: string) => setFormData({ ...formData, email: v })}
              required={requiredIfExisting(delivery?.email)}
            />
            <SettingInput
              label="Delivery For"
              icon={UserCheck}
              value={formData.deliveryFor}
              onChange={(v: string) =>
                setFormData({ ...formData, deliveryFor: v })
              }
              required={requiredIfExisting(delivery?.deliveryFor)}
            />
            <SettingInput
              label="Received By"
              icon={ShieldCheck}
              value={formData.receivedBy}
              onChange={(v: string) =>
                setFormData({ ...formData, receivedBy: v })
              }
              required={requiredIfExisting(delivery?.receivedBy)}
            />
            <div className="space-y-4">
              <label className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.3em] ml-2">
                Package Type
              </label>
              <div className="relative group">
                <Package className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                <select
                  required={requiredIfExisting(delivery?.packageType)}
                  disabled={loadingDeliveryTypes}
                  className="w-full pl-16 pr-10 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold text-sm text-slate-800 transition-all shadow-sm appearance-none cursor-pointer disabled:opacity-60"
                  value={formData.packageType}
                  onChange={(e) =>
                    setFormData({ ...formData, packageType: e.target.value })
                  }
                >
                  {loadingDeliveryTypes && (
                    <option value={formData.packageType || ""}>
                      Loading package types...
                    </option>
                  )}
                  {!loadingDeliveryTypes &&
                    formData.packageType &&
                    !deliveryTypes.some(
                      (type) => type.name === formData.packageType,
                    ) && (
                      <option value={formData.packageType}>
                        {formData.packageType}
                      </option>
                    )}
                  {!loadingDeliveryTypes &&
                    deliveryTypes.map((type) => (
                      <option key={type.id ?? type.name} value={type.name}>
                        {type.name}
                      </option>
                    ))}
                  {!loadingDeliveryTypes && deliveryTypes.length === 0 && (
                    <option value={formData.packageType || ""}>
                      {formData.packageType || "No package types available"}
                    </option>
                  )}
                </select>
                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
              </div>
            </div>
            <SettingInput
              label="Package Count"
              icon={Hash}
              type="number"
              value={formData.packageCount}
              onChange={(v: string) => {
                const count = Number(v);
                setFormData({
                  ...formData,
                  packageCount: Number.isNaN(count) ? 0 : count,
                });
              }}
              required={requiredIfExisting(delivery?.packageCount)}
            />
            <SettingInput
              label="Tracking Number"
              icon={FileSignature}
              value={formData.trackingNumber}
              onChange={(v: string) =>
                setFormData({ ...formData, trackingNumber: v })
              }
              required={requiredIfExisting(delivery?.trackingNumber)}
            />
            <SettingInput
              label="Location"
              icon={MapPin}
              value={formData.location}
              onChange={() => {}}
              disabled
              readOnly
              required={requiredIfExisting(delivery?.location)}
            />
          </div>
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-2">
              Notes
            </label>
            <div className="relative group">
              <MessageSquare className="absolute left-6 top-6 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
              <textarea
                rows={4}
                placeholder="Additional delivery notes..."
                className="w-full pl-16 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold text-sm text-slate-800 transition-all shadow-sm resize-none"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>
          </div>
          <div className="pt-6">
            <button
              type="submit"
              className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3"
            >
              <Save size={18} /> Synchronize Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AssetMovementFormModal = ({ assetMovement, onClose, onSave }: any) => {
  const toDateTimeInputValue = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };

  const toIsoString = (value?: string) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  };

  const normalizeStatus = (value?: string) =>
    (value || "").toLowerCase().replace(/[\s-]+/g, "");

  const currentOperator = resolveCurrentAdminName();
  const [formData, setFormData] = useState({
    equipmentName: assetMovement?.equipmentName || "",
    borrowerName: assetMovement?.borrowerName || "",
    staffInCharge: assetMovement?.staffInCharge || "",
    phone: assetMovement?.phone || "",
    email: assetMovement?.email || "",
    reason: assetMovement?.reason || "",
    targetCampus: assetMovement?.targetCampus || "",
    status: assetMovement?.status || "Off-site",
    condition: assetMovement?.condition || "",
    receiverName: assetMovement?.receiverName || "",
    securityName: assetMovement?.securityName || "",
    returnerName: assetMovement?.returnerName || "",
    returningStaffName: assetMovement?.returningStaffName || "",
    maintenanceNotes: assetMovement?.maintenanceNotes || "",
    checkoutTime: toDateTimeInputValue(assetMovement?.checkoutTime),
    returnTime: toDateTimeInputValue(assetMovement?.returnTime),
    processedBy: currentOperator,
  });
  const [availableHosts, setAvailableHosts] = useState<Host[]>([]);
  const [movementReasons, setMovementReasons] = useState<MovementReason[]>([]);
  const [validationError, setValidationError] = useState("");

  const statusChoices: AssetStatus[] = ["Off-site", "In-transit", "On-site"];

  useEffect(() => {
    const loadHosts = async () => {
      try {
        const response = await apiService.host.getAll();
        const hostsList = getApiContent<Host[]>(
          response as ApiEnvelope<Host[]>,
          [],
          "hosts",
        );
        setAvailableHosts(hostsList);
      } catch (err) {
        console.error("Failed to load hosts:", err);
      }
    };

    const loadMovementReasons = async () => {
      try {
        const response = await apiService.movementReason.getAll();
        const reasonsList = getApiContent<MovementReason[]>(
          response as ApiEnvelope<MovementReason[]>,
          [],
          "movement reasons",
        );
        if (reasonsList.length > 0) {
          setMovementReasons(reasonsList);
          if (!assetMovement?.reason) {
            setFormData((prev) => ({ ...prev, reason: reasonsList[0].name }));
          }
        } else {
          const defaults = [
            { id: "1", name: "Repair", description: "" },
            { id: "2", name: "Loan", description: "" },
            { id: "3", name: "Rent", description: "" },
            {
              id: "4",
              name: "Between Locations (College and Elementary)",
              description: "",
            },
            { id: "5", name: "Decommissioning", description: "" },
          ];
          setMovementReasons(defaults);
          if (!assetMovement?.reason) {
            setFormData((prev) => ({ ...prev, reason: defaults[0].name }));
          }
        }
      } catch (err) {
        console.error("Failed to load movement reasons:", err);
      }
    };

    loadHosts();
    loadMovementReasons();
  }, [assetMovement?.reason]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");
    const fromStatus = normalizeStatus(assetMovement?.status);
    const toStatus = normalizeStatus(formData.status);
    const isFromNonOnsiteToOnsite =
      toStatus === "onsite" && fromStatus !== "onsite";
    const isFromOnsiteToAway =
      fromStatus === "onsite" &&
      (toStatus === "offsite" || toStatus === "intransit");

    const hasUnclearedReturnDetails = !!(
      formData.returnerName?.trim() ||
      formData.returningStaffName?.trim() ||
      formData.receiverName?.trim() ||
      formData.securityName?.trim() ||
      formData.returnTime ||
      formData.condition ||
      formData.maintenanceNotes?.trim()
    );

    if (isFromOnsiteToAway && hasUnclearedReturnDetails) {
      setValidationError(
        `Clear all return details before changing status from ${assetMovement?.status || "On-site"} to ${formData.status}.`,
      );
      return;
    }

    if (isFromNonOnsiteToOnsite) {
      const requiredReturnDetails = [
        { key: "returnerName", label: "Returner Name" },
        { key: "returningStaffName", label: "Returning Staff" },
        { key: "receiverName", label: "Receiver Name" },
        { key: "securityName", label: "Security Witness" },
        { key: "condition", label: "Condition" },
        { key: "returnTime", label: "Return Time" },
      ] as const;

      const missing = requiredReturnDetails
        .filter(({ key }) => {
          const value = formData[key];
          return typeof value === "string" ? !value.trim() : !value;
        })
        .map(({ label }) => label);

      if (missing.length > 0) {
        setValidationError(
          `Returning details are required for status change (${assetMovement?.status || "Unknown"} -> ${formData.status}). Missing: ${missing.join(", ")}.`,
        );
        return;
      }
    }

    onSave({
      ...formData,
      checkoutTime:
        toIsoString(formData.checkoutTime) || assetMovement?.checkoutTime,
      returnTime: toIsoString(formData.returnTime),
      processedBy: formData.processedBy || currentOperator,
    });
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl p-12 rounded-[3.5rem] shadow-2xl animate-in zoom-in-95 duration-500 border border-slate-100 max-h-[90vh] overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">
              Edit Asset Movement
            </h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
              Registry Synchronization
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all"
          >
            <X size={20} />
          </button>
        </header>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <SettingInput
              label="Equipment Name"
              icon={Box}
              value={formData.equipmentName}
              onChange={(v: string) =>
                setFormData({ ...formData, equipmentName: v })
              }
              required={false}
            />
            <SettingInput
              label="Borrower Name"
              icon={User}
              value={formData.borrowerName}
              onChange={(v: string) =>
                setFormData({ ...formData, borrowerName: v })
              }
              required={false}
            />
            <div className="space-y-4">
              <label className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.3em] ml-2">
                Staff In Charge
              </label>
              <div className="relative">
                <Shield className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <select
                  className="w-full pl-16 pr-10 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold text-sm text-slate-800 appearance-none cursor-pointer shadow-sm"
                  value={formData.staffInCharge}
                  onChange={(e) =>
                    setFormData({ ...formData, staffInCharge: e.target.value })
                  }
                >
                  {formData.staffInCharge &&
                    !availableHosts.some(
                      (h) => h.fullName === formData.staffInCharge,
                    ) && (
                      <option value={formData.staffInCharge}>
                        {formData.staffInCharge}
                      </option>
                    )}
                  {availableHosts.map((h) => (
                    <option key={h.id} value={h.fullName}>
                      {h.fullName}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              </div>
            </div>
            <SettingInput
              label="Phone"
              icon={Smartphone}
              value={formData.phone}
              onChange={(v: string) => setFormData({ ...formData, phone: v })}
              required={false}
            />
            <SettingInput
              label="Email"
              icon={Mail}
              value={formData.email}
              onChange={(v: string) => setFormData({ ...formData, email: v })}
              required={false}
            />
            <div className="space-y-4">
              <label className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.3em] ml-2">
                Movement Reason
              </label>
              <div className="relative">
                <Hammer className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <select
                  className="w-full pl-16 pr-10 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold text-sm text-slate-800 appearance-none cursor-pointer shadow-sm"
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                >
                  {formData.reason &&
                    !movementReasons.some(
                      (r) => r.name === formData.reason,
                    ) && (
                      <option value={formData.reason}>{formData.reason}</option>
                    )}
                  {movementReasons.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              </div>
            </div>
            <SettingInput
              label="Logged Station / Campus"
              icon={MapPin}
              value={formData.targetCampus}
              onChange={(v: string) =>
                setFormData({ ...formData, targetCampus: v })
              }
              disabled
              required={false}
            />
            <div className="space-y-4">
              <label className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.3em] ml-2">
                Asset Status
              </label>
              <div className="relative">
                <Activity className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <select
                  className="w-full pl-16 pr-10 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold text-sm text-slate-800 appearance-none cursor-pointer shadow-sm"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData((prev) => {
                      const nextStatus = e.target.value;
                      const fromStatusNormalized = normalizeStatus(
                        assetMovement?.status,
                      );
                      const toStatusNormalized = normalizeStatus(nextStatus);
                      const requiresReturnClear =
                        fromStatusNormalized === "onsite" &&
                        (toStatusNormalized === "offsite" ||
                          toStatusNormalized === "intransit");

                      if (!requiresReturnClear) {
                        return { ...prev, status: nextStatus };
                      }

                      return {
                        ...prev,
                        status: nextStatus,
                        returnerName: "",
                        returningStaffName: "",
                        receiverName: "",
                        securityName: "",
                        returnTime: "",
                        condition: "",
                        maintenanceNotes: "",
                      };
                    })
                  }
                >
                  {statusChoices.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              </div>
            </div>
            <div className="space-y-4">
              <label className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.3em] ml-2">
                Reported Condition
              </label>
              <div className="relative">
                <FileCheck className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <select
                  className="w-full pl-16 pr-10 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold text-sm text-slate-800 appearance-none cursor-pointer shadow-sm"
                  value={formData.condition}
                  onChange={(e) =>
                    setFormData({ ...formData, condition: e.target.value })
                  }
                >
                  <option value="">Select condition</option>
                  {["Good", "Damaged", "Needs Service"].map((condition) => (
                    <option key={condition} value={condition}>
                      {condition}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
                Checkout Time
              </label>
              <input
                type="datetime-local"
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold text-sm text-slate-800"
                value={formData.checkoutTime}
                onChange={(e) =>
                  setFormData({ ...formData, checkoutTime: e.target.value })
                }
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
                Return Time
              </label>
              <input
                type="datetime-local"
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold text-sm text-slate-800"
                value={formData.returnTime}
                onChange={(e) =>
                  setFormData({ ...formData, returnTime: e.target.value })
                }
              />
            </div>
          </div>
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-2">
              Return Details
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <SettingInput
                label="Receiver Name"
                icon={UserCheck}
                value={formData.receiverName}
                onChange={(v: string) =>
                  setFormData({ ...formData, receiverName: v })
                }
                required={false}
              />
              <SettingInput
                label="Security Witness"
                icon={ShieldCheck}
                value={formData.securityName}
                onChange={(v: string) =>
                  setFormData({ ...formData, securityName: v })
                }
                required={false}
              />
              <SettingInput
                label="Returner Name"
                icon={User}
                value={formData.returnerName}
                onChange={(v: string) =>
                  setFormData({ ...formData, returnerName: v })
                }
                required={false}
              />
              <SettingInput
                label="Returning Staff"
                icon={UserCog}
                value={formData.returningStaffName}
                onChange={(v: string) =>
                  setFormData({ ...formData, returningStaffName: v })
                }
                required={false}
              />
            </div>
          </div>
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-2">
              Maintenance Notes
            </label>
            <div className="relative group">
              <MessageSquare className="absolute left-6 top-6 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
              <textarea
                rows={4}
                placeholder="Additional maintenance notes..."
                className="w-full pl-16 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold text-sm text-slate-800 transition-all shadow-sm resize-none"
                value={formData.maintenanceNotes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maintenanceNotes: e.target.value,
                  })
                }
              />
            </div>
          </div>
          {validationError && (
            <p className="text-[10px] font-black uppercase tracking-widest text-rose-600">
              {validationError}
            </p>
          )}
          <SettingInput
            label="Processed By"
            icon={Shield}
            value={formData.processedBy}
            readOnly
            onChange={(v: string) =>
              setFormData({ ...formData, processedBy: v })
            }
          />
          <div className="pt-6">
            <button
              type="submit"
              className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3"
            >
              <Save size={18} /> Synchronize Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const LogView = ({
  title,
  data,
  type,
  settings,
  onDelete,
  onBulkDelete,
  onUpdate,
}: {
  title: string;
  data: any[];
  type: string;
  settings: SystemSettings;
  onDelete: (type: string, id: number | string) => Promise<void> | void;
  onBulkDelete: (type: string, ids: number[]) => Promise<void> | void;
  onUpdate: (type: string, id: number | string, updatedData: any) => void;
}) => {
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [hostFilter, setHostFilter] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Stage 4: Nesting State
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const data = localStorage.getItem("watchlist");
    if (data) setWatchlist(JSON.parse(data));
  }, []);

  const requestConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
  ) => {
    setConfirmAction({ title, message, onConfirm });
  };

  const getRecordLabel = (item: any) =>
    item?.name ||
    item?.fullName ||
    item?.company ||
    item?.personName ||
    item?.borrowerName ||
    item?.equipmentName ||
    item?.keyName ||
    "this record";

  const getDeleteIds = useCallback(
    (item: any) => {
      const deleteIds: number[] =
        type === "visitor" && Array.isArray(item?.sessions)
          ? item.sessions
              .map((session: any) => Number(session?.id))
              .filter((id: number) => Number.isFinite(id))
          : [Number(item?.id)].filter((id: number) => Number.isFinite(id));
      return Array.from(new Set(deleteIds));
    },
    [type],
  );

  const requestDelete = (item: any) => {
    if (type === "key") {
      requestConfirm(
        "Delete Registry Record",
        `Are you sure you want to delete ${getRecordLabel(item)}?`,
        async () => {
          await onDelete(type, item.id);
        },
      );
      return;
    }

    const deleteIds = getDeleteIds(item);

    requestConfirm(
      "Delete Registry Record",
      `Are you sure you want to delete ${getRecordLabel(item)}?`,
      async () => {
        for (const deleteId of deleteIds) {
          await onDelete(type, deleteId);
        }
        setSelectedIds((prev) => {
          const next = new Set(prev);
          deleteIds.forEach((id) => next.delete(id));
          return next;
        });
      },
    );
  };

  const toggleSelection = (ids: number[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const everySelected = ids.every((id) => next.has(id));
      ids.forEach((id) => {
        if (everySelected) {
          next.delete(id);
        } else {
          next.add(id);
        }
      });
      return next;
    });
  };

  const requestUpdate = (item: any, updatedData: any) => {
    const payload =
      type === "delivery" || type === "asset"
        ? (() => {
            const merged = { ...item, ...updatedData };
            const { id: _id, ...rest } = merged;
            return rest;
          })()
        : updatedData;
    requestConfirm(
      "Update Registry Record",
      `Are you sure you want to update ${getRecordLabel(item)}?`,
      () => onUpdate(type, item.id, payload),
    );
  };

  const uniqueLocations = useMemo(() => {
    const locs = new Set(
      data.map((item) => item.location || item.targetCampus).filter(Boolean),
    );
    return ["All", ...Array.from(locs)];
  }, [data]);

  const uniqueHosts = useMemo(() => {
    const hostsSet = new Set(
      data
        .map((item) => item.host || item.deliveryFor || item.staffInCharge)
        .filter(Boolean),
    );
    return ["All", ...Array.from(hostsSet)];
  }, [data]);

  const categories = useMemo(() => {
    let key = "";
    if (type === "visitor") key = "purpose";
    else if (type === "delivery") key = "packageType";
    else if (type === "key") key = "purpose";
    else if (type === "asset") key = "reason";

    if (!key) return ["All"];
    const unique = new Set(data.map((item) => item[key]).filter(Boolean));
    return ["All", ...Array.from(unique)];
  }, [data, type]);

  const filteredData = useMemo(() => {
    let results = data.filter((item) => {
      const searchStr = searchTerm.toLowerCase().trim();
      const timeStamp =
        item.checkInTime ||
        item.timestamp ||
        item.borrowedAt ||
        item.checkoutTime;
      const formattedTime = new Date(timeStamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      const matchSearch =
        !searchStr ||
        (type === "visitor" &&
          (item.name.toLowerCase().includes(searchStr) ||
            item.company.toLowerCase().includes(searchStr) ||
            item.host.toLowerCase().includes(searchStr) ||
            formattedTime.includes(searchStr) ||
            (item.processedBy &&
              item.processedBy.toLowerCase().includes(searchStr)))) ||
        (type === "delivery" &&
          (item.company.toLowerCase().includes(searchStr) ||
            item.personName.toLowerCase().includes(searchStr) ||
            (item.deliveryFor &&
              item.deliveryFor.toLowerCase().includes(searchStr)) ||
            (item.receivedBy &&
              item.receivedBy.toLowerCase().includes(searchStr)) ||
            formattedTime.includes(searchStr) ||
            (item.location &&
              item.location.toLowerCase().includes(searchStr)) ||
            (item.processedBy &&
              item.processedBy.toLowerCase().includes(searchStr)))) ||
        (type === "key" &&
          (item.borrowerName.toLowerCase().includes(searchStr) ||
            item.keyName.toLowerCase().includes(searchStr) ||
            item.keyNumber.toLowerCase().includes(searchStr) ||
            formattedTime.includes(searchStr) ||
            (item.returnerName &&
              item.returnerName.toLowerCase().includes(searchStr)) ||
            (item.processedBy &&
              item.processedBy.toLowerCase().includes(searchStr)))) ||
        (type === "asset" &&
          (item.equipmentName.toLowerCase().includes(searchStr) ||
            item.borrowerName.toLowerCase().includes(searchStr) ||
            formattedTime.includes(searchStr) ||
            (item.processedBy &&
              item.processedBy.toLowerCase().includes(searchStr))));

      const matchStatus =
        statusFilter === "All" ||
        (type === "visitor" &&
          (statusFilter === "In"
            ? item.status === "In"
            : item.status === "Out")) ||
        (type === "key" &&
          (statusFilter === "Out"
            ? item.status === "Out"
            : item.status === "Returned")) ||
        (type === "asset" && item.status === statusFilter) ||
        (type === "delivery" && statusFilter === "Delivered");

      const categoryKey =
        type === "visitor"
          ? "purpose"
          : type === "delivery"
            ? "packageType"
            : type === "key"
              ? "purpose"
              : "reason";
      const matchCategory =
        categoryFilter === "All" || item[categoryKey] === categoryFilter;

      const matchLocation =
        locationFilter === "All" ||
        item.location === locationFilter ||
        item.targetCampus === locationFilter;
      const matchHost =
        hostFilter === "All" ||
        item.host === hostFilter ||
        item.deliveryFor === hostFilter ||
        item.staffInCharge === hostFilter;

      const itemDate = new Date(timeStamp).toISOString().split("T")[0];
      const matchStartDate = !startDate || itemDate >= startDate;
      const matchEndDate = !endDate || itemDate <= endDate;

      // Stage 4: In Visitor Registry, exclude non-leads from the main list
      const isVisibleVisitor =
        type !== "visitor" || item.isGroupLead || !item.groupId;

      return (
        matchSearch &&
        matchStatus &&
        matchStartDate &&
        matchEndDate &&
        matchCategory &&
        matchLocation &&
        matchHost &&
        isVisibleVisitor
      );
    });

    if (type === "visitor") {
      const grouped: Record<string, any> = {};
      results.forEach((v) => {
        const dateStr = new Date(v.checkInTime).toISOString().split("T")[0];
        const key = `${v.phone}_${v.location}_${dateStr}`;
        if (!grouped[key]) {
          grouped[key] = { ...v, sessions: [v] };
        } else {
          grouped[key].sessions.push(v);
          if (v.status === "In") grouped[key].status = "In";
          grouped[key].sessions.sort(
            (a: any, b: any) =>
              new Date(a.checkInTime).getTime() -
              new Date(b.checkInTime).getTime(),
          );
          const latest =
            grouped[key].sessions[grouped[key].sessions.length - 1];
          const first = grouped[key].sessions[0];
          const sessRef = grouped[key].sessions;
          Object.assign(grouped[key], latest);
          grouped[key].sessions = sessRef;
          grouped[key].firstCheckIn = first.checkInTime;
          grouped[key].lastCheckOut = latest.checkOutTime;
        }
      });
      results = Object.values(grouped);
    }

    // Apply Sorting
    if (sortConfig) {
      results.sort((a, b) => {
        let valA: any, valB: any;

        switch (sortConfig.key) {
          case "name":
            valA = (
              type === "visitor"
                ? a.name
                : type === "delivery"
                  ? a.deliveryFor
                  : type === "key"
                    ? a.borrowerName
                    : a.equipmentName
            ).toLowerCase();
            valB = (
              type === "visitor"
                ? b.name
                : type === "delivery"
                  ? b.deliveryFor
                  : type === "key"
                    ? b.borrowerName
                    : b.equipmentName
            ).toLowerCase();
            break;
          case "time":
            valA = new Date(
              a.checkInTime || a.timestamp || a.borrowedAt || a.checkoutTime,
            ).getTime();
            valB = new Date(
              b.checkInTime || b.timestamp || b.borrowedAt || b.checkoutTime,
            ).getTime();
            break;
          case "status":
            valA = (a.status || "").toLowerCase();
            valB = (b.status || "").toLowerCase();
            break;
          case "verified":
            valA = (a.processedBy || "").toLowerCase();
            valB = (b.processedBy || "").toLowerCase();
            break;
          default:
            valA = a[sortConfig.key];
            valB = b[sortConfig.key];
        }

        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    } else {
      // Default Sort by Time Descending
      results.sort((a, b) => {
        const timeA = new Date(
          a.checkInTime || a.timestamp || a.borrowedAt || a.checkoutTime,
        ).getTime();
        const timeB = new Date(
          b.checkInTime || b.timestamp || b.borrowedAt || b.checkoutTime,
        ).getTime();
        return timeB - timeA;
      });
    }

    return results;
  }, [
    data,
    searchTerm,
    statusFilter,
    categoryFilter,
    locationFilter,
    hostFilter,
    startDate,
    endDate,
    type,
    sortConfig,
  ]);

  const visibleIds = useMemo(
    () =>
      Array.from(new Set(filteredData.flatMap((item) => getDeleteIds(item)))),
    [filteredData, getDeleteIds],
  );

  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  const hasSelectedRecords = selectedIds.size > 0;

  const requestBulkDelete = () => {
    const ids = normalizeNumericIds(Array.from(selectedIds));
    if (ids.length === 0) return;
    requestConfirm(
      "Bulk Delete Registry Records",
      `Are you sure you want to delete ${ids.length} selected record(s)?`,
      async () => {
        await onBulkDelete(type, ids);
        setSelectedIds(new Set());
      },
    );
  };

  const isItemSelected = (item: any) => {
    const ids = getDeleteIds(item);
    return ids.length > 0 && ids.every((id) => selectedIds.has(id));
  };

  useEffect(() => {
    setSelectedIds(new Set());
  }, [type, data]);

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        if (prev.direction === "asc") return { key, direction: "desc" };
        return null;
      }
      return { key, direction: "asc" };
    });
  };

  const statusOptions = useMemo(() => {
    if (type === "visitor") return ["All", "In", "Out"];
    if (type === "key") return ["All", "Out", "In", "Returned"];
    if (type === "asset") return ["All", "Off-site", "In-transit", "On-site"];
    if (type === "delivery") return ["All", "Delivered"];
    return ["All"];
  }, [type]);

  const activeFilterCount =
    (statusFilter !== "All" ? 1 : 0) +
    (categoryFilter !== "All" ? 1 : 0) +
    (locationFilter !== "All" ? 1 : 0) +
    (hostFilter !== "All" ? 1 : 0) +
    (startDate ? 1 : 0) +
    (endDate ? 1 : 0);

  const resetFilters = () => {
    setStatusFilter("All");
    setCategoryFilter("All");
    setLocationFilter("All");
    setHostFilter("All");
    setStartDate("");
    setEndDate("");
    setSortConfig(null);
  };

  const toggleGroup = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) newExpanded.delete(groupId);
    else newExpanded.add(groupId);
    setExpandedGroups(newExpanded);
  };

  const getWatchlistEntry = (phone: string) =>
    watchlist.find((entry) => entry.phone === phone);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <DetailModal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={`${type.charAt(0).toUpperCase() + type.slice(1)} Record`}
        data={selectedItem}
        type={type}
        allData={data}
      />
      <ConfirmActionModal
        confirmAction={confirmAction}
        onClose={() => setConfirmAction(null)}
      />
      {editingItem && type === "visitor" && (
        <VisitorFormModal
          visitor={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={(updated) => {
            requestUpdate(editingItem, updated);
            setEditingItem(null);
          }}
        />
      )}
      {editingItem && type === "delivery" && (
        <DeliveryFormModal
          delivery={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={(updated) => {
            requestUpdate(editingItem, updated);
            setEditingItem(null);
          }}
        />
      )}
      {editingItem && type === "asset" && (
        <AssetMovementFormModal
          assetMovement={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={(updated) => {
            requestUpdate(editingItem, updated);
            setEditingItem(null);
          }}
        />
      )}
      {editingItem && type === "key" && (
        <KeyLogFormModal
          keyLog={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={(updated) => {
            requestUpdate(editingItem, updated);
            setEditingItem(null);
          }}
        />
      )}

      <header className="flex flex-col gap-6">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {title}
            </h2>
            <p className="text-slate-400 text-sm mt-1 font-medium tracking-tight">
              Sync terminal records with digital registry.
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 flex-1 max-w-4xl">
            <div className="relative flex-1 group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                placeholder={`Search across all fields...`}
                className="w-full pl-16 pr-12 py-4 bg-white border border-slate-100 rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-300 outline-none font-bold text-sm text-slate-700 transition-all shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-rose-50 hover:bg-rose-50 transition-all"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={requestBulkDelete}
                disabled={!hasSelectedRecords}
                className="px-6 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-3 border shadow-sm bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={16} />
                Delete Selected ({selectedIds.size})
              </button>
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`relative px-6 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-3 border shadow-sm ${showAdvancedFilters ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-500 border-slate-100 hover:border-indigo-200"}`}
              >
                <Filter size={16} />
                Advanced Filters
                {activeFilterCount > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[8px] font-black ring-2 ring-white animate-in zoom-in">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <div className="flex bg-white p-1.5 rounded-[1.5rem] border border-slate-100 shadow-sm">
                <button
                  onClick={() => exportToCSV(filteredData, type)}
                  title="Export to CSV"
                  className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                >
                  <Download size={18} />
                </button>
                <div className="w-[1px] h-6 bg-slate-100 my-auto mx-1" />
                <button
                  onClick={() =>
                    exportToPDF(filteredData, title, type, settings)
                  }
                  title="Download PDF Report"
                  className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                >
                  <FileText size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {showAdvancedFilters && (
          <div className="p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 animate-in slide-in-from-top-4 duration-500 shadow-inner">
            <FilterSelect
              label="Status Protocol"
              icon={Activity}
              value={statusFilter}
              options={statusOptions}
              onChange={setStatusFilter}
            />
            <FilterSelect
              label="Category/Type"
              icon={Layers}
              value={categoryFilter}
              options={categories}
              onChange={setCategoryFilter}
            />
            <FilterSelect
              label="Campus Location"
              icon={MapPin}
              value={locationFilter}
              options={uniqueLocations}
              onChange={setLocationFilter}
            />
            <FilterSelect
              label="Host/Personnel"
              icon={UserCheck}
              value={hostFilter}
              options={uniqueHosts}
              onChange={setHostFilter}
            />

            <div className="space-y-3">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Calendar size={10} /> Start Date
              </label>
              <input
                type="date"
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none font-bold text-xs text-slate-600 focus:border-indigo-500 transition-all"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Calendar size={10} /> End Date
              </label>
              <input
                type="date"
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none font-bold text-xs text-slate-600 focus:border-indigo-500 transition-all"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="w-full px-6 py-3 bg-slate-200 text-slate-600 hover:bg-slate-300 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw size={14} /> Reset
              </button>
            </div>
          </div>
        )}
      </header>

      <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                <th className="px-6 py-8 w-12">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={() => toggleSelection(visibleIds)}
                    aria-label="Select all visible records"
                    className="w-4 h-4 accent-indigo-600"
                  />
                </th>
                <th
                  className="px-10 py-8 cursor-pointer hover:text-indigo-600 transition-colors group"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center gap-2">
                    Principal Identifier
                    {sortConfig?.key === "name" ? (
                      sortConfig.direction === "asc" ? (
                        <ArrowUp size={12} />
                      ) : (
                        <ArrowDown size={12} />
                      )
                    ) : (
                      <ArrowUpDown
                        size={12}
                        className="opacity-20 group-hover:opacity-100"
                      />
                    )}
                  </div>
                </th>
                <th className="px-10 py-8">Category / Profile</th>
                <th
                  className="px-10 py-8 cursor-pointer hover:text-indigo-600 transition-colors group"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center gap-2">
                    Status Protocol
                    {sortConfig?.key === "status" ? (
                      sortConfig.direction === "asc" ? (
                        <ArrowUp size={12} />
                      ) : (
                        <ArrowDown size={12} />
                      )
                    ) : (
                      <ArrowUpDown
                        size={12}
                        className="opacity-20 group-hover:opacity-100"
                      />
                    )}
                  </div>
                </th>
                <th
                  className="px-10 py-8 cursor-pointer hover:text-indigo-600 transition-colors group"
                  onClick={() => handleSort("verified")}
                >
                  <div className="flex items-center gap-2">
                    Verification Signature
                    {sortConfig?.key === "verified" ? (
                      sortConfig.direction === "asc" ? (
                        <ArrowUp size={12} />
                      ) : (
                        <ArrowDown size={12} />
                      )
                    ) : (
                      <ArrowUpDown
                        size={12}
                        className="opacity-20 group-hover:opacity-100"
                      />
                    )}
                  </div>
                </th>
                <th
                  className="px-10 py-8 cursor-pointer hover:text-indigo-600 transition-colors group"
                  onClick={() => handleSort("time")}
                >
                  <div className="flex items-center gap-2">
                    Time Signature
                    {sortConfig?.key === "time" ? (
                      sortConfig.direction === "asc" ? (
                        <ArrowUp size={12} />
                      ) : (
                        <ArrowDown size={12} />
                      )
                    ) : (
                      <ArrowUpDown
                        size={12}
                        className="opacity-20 group-hover:opacity-100"
                      />
                    )}
                  </div>
                </th>
                <th className="px-10 py-8 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredData.map((item) => {
                const watchlistMatch =
                  type === "visitor" ? getWatchlistEntry(item.phone) : null;
                const isOverdueKey =
                  type === "key" &&
                  item.status === "Out" &&
                  (new Date(item.borrowedAt).toDateString() !==
                    new Date().toDateString() ||
                    new Date().getHours() >= 18);
                const isStatusSuccess =
                  type === "delivery"
                    ? true
                    : item.status === "In" ||
                      item.status === "On-site" ||
                      item.status === "Returned" ||
                      item.status === "Sent" ||
                      item.status === "Delivered";
                const checkInTime =
                  item.checkInTime ||
                  item.timestamp ||
                  item.borrowedAt ||
                  item.checkoutTime;
                const checkOutTime =
                  item.checkOutTime || item.returnedAt || item.returnTime;
                const categoryKey =
                  type === "visitor"
                    ? "purpose"
                    : type === "delivery"
                      ? "packageType"
                      : type === "key"
                        ? "purpose"
                        : "reason";

                const isGroupLead =
                  type === "visitor" && item.isGroupLead && item.groupId;
                const isExpanded =
                  isGroupLead && expandedGroups.has(item.groupId);
                const groupMembers = isGroupLead
                  ? data.filter(
                      (v) => v.groupId === item.groupId && !v.isGroupLead,
                    )
                  : [];

                return (
                  <React.Fragment key={item.id}>
                    <tr
                      onClick={() => setSelectedItem(item)}
                      className="hover:bg-slate-50/50 transition-all cursor-pointer group relative"
                    >
                      <td className="px-6 py-8">
                        <input
                          type="checkbox"
                          checked={isItemSelected(item)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => toggleSelection(getDeleteIds(item))}
                          aria-label={`Select ${getRecordLabel(item)}`}
                          className="w-4 h-4 accent-indigo-600"
                        />
                      </td>
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-6">
                          {isGroupLead && (
                            <button
                              onClick={(e) => toggleGroup(item.groupId, e)}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isExpanded ? "bg-indigo-600 text-white rotate-180" : "bg-slate-100 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"}`}
                            >
                              <ChevronDown size={16} />
                            </button>
                          )}
                          <div className="w-14 h-14 bg-slate-100 rounded-2xl overflow-hidden flex-shrink-0 border border-slate-100 flex items-center justify-center relative">
                            {item.photo ? (
                              <img
                                src={item.photo}
                                className="w-full h-full object-cover"
                                alt="Thumbnail"
                              />
                            ) : (
                              <User className="text-slate-300" size={20} />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-3">
                              <p className="font-black text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">
                                {type === "visitor"
                                  ? item.name
                                  : type === "delivery"
                                    ? item.deliveryFor || "N/A"
                                    : type === "key"
                                      ? item.borrowerName
                                      : item.equipmentName}
                              </p>
                              {watchlistMatch && (
                                <span
                                  className={`flex items-center gap-1 text-white text-[7px] font-black uppercase px-2 py-0.5 rounded-full shadow-lg animate-pulse ${watchlistMatch.riskLevel === "High" ? "bg-rose-500 shadow-rose-200" : watchlistMatch.riskLevel === "Medium" ? "bg-amber-500 shadow-amber-200" : "bg-blue-400 shadow-blue-100"}`}
                                >
                                  <ShieldAlert size={8} /> Watchlist
                                </span>
                              )}
                              {isGroupLead && (
                                <span className="flex items-center gap-1.5 bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full border border-indigo-100">
                                  <Users size={12} />
                                  <span className="text-[8px] font-black uppercase tracking-wider">
                                    Party of {item.groupSize}
                                  </span>
                                </span>
                              )}
                            </div>
                            <div className="mt-1.5 flex flex-col gap-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {type === "visitor"
                                  ? item.company
                                  : type === "delivery"
                                    ? `via ${item.company} (${item.personName})`
                                    : type === "key"
                                      ? `Key ${item.keyNumber}: ${item.keyName}`
                                      : `By: ${item.borrowerName}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-xs font-black text-slate-800 tracking-tight">
                            {item[categoryKey] || "Uncategorized"}
                          </span>
                          {type === "visitor" && (
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                              {item.visitorType}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <div className="flex flex-col gap-2">
                          <span
                            className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm w-fit ${isStatusSuccess ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}`}
                          >
                            {type === "delivery"
                              ? "Delivered"
                              : item.status === "In" ||
                                  item.status === "Returned" ||
                                  item.status === "On-site" ||
                                  item.status === "Delivered"
                                ? "Active / In"
                                : "Logged Out"}
                          </span>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 border border-slate-100 shadow-sm">
                            <Shield size={14} className="text-indigo-500" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-800 tracking-tight leading-none">
                              {item.processedBy || "System Registry"}
                            </p>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">
                              Authorized Official
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <p className="text-xs font-bold text-slate-500 tracking-tight">
                          {new Date(checkInTime).toLocaleDateString()}
                        </p>
                        <div className="flex flex-col gap-1 mt-2">
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-2">
                            <LogIn size={10} className="text-emerald-500" />{" "}
                            {new Date(
                              item.firstCheckIn || checkInTime,
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                          {(item.lastCheckOut || checkOutTime) && (
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-2">
                              <LogOut size={10} className="text-rose-500" />{" "}
                              {new Date(
                                item.lastCheckOut || checkOutTime,
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-10 py-8 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingItem(item);
                            }}
                            className="p-2.5 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 shadow-sm transition-all"
                            title="Edit Record"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              requestDelete(item);
                            }}
                            className="p-2.5 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-rose-500 hover:border-rose-100 shadow-sm transition-all"
                            title="Delete Record"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Stage 4: Nested Member View */}
                    {isExpanded &&
                      groupMembers.map((member) => (
                        <tr
                          key={member.id}
                          className="bg-slate-50/30 border-l-[6px] border-indigo-600 animate-in slide-in-from-top-4 duration-300 group"
                        >
                          <td className="px-6 py-6">
                            <input
                              type="checkbox"
                              checked={isItemSelected(member)}
                              onChange={() =>
                                toggleSelection(getDeleteIds(member))
                              }
                              aria-label={`Select ${member.name}`}
                              className="w-4 h-4 accent-indigo-600"
                            />
                          </td>
                          <td className="px-20 py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                              <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-300">
                                <User size={16} />
                              </div>
                              <div>
                                <p className="text-sm font-black text-slate-700 tracking-tight">
                                  {member.name}
                                </p>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                  Group Companion
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-10 py-6">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                              {member.visitorType}
                            </span>
                          </td>
                          <td className="px-10 py-6">
                            <span
                              className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${member.status === "In" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}
                            >
                              {member.status}
                            </span>
                          </td>
                          <td className="px-10 py-6">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                              Inherited ID
                            </p>
                          </td>
                          <td className="px-10 py-6">
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-2">
                              <Clock size={10} /> Sync{" "}
                              {new Date(member.checkInTime).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </p>
                          </td>
                          <td className="px-10 py-6 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingItem(member);
                                }}
                                className="p-2 rounded-lg text-slate-300 hover:text-indigo-600 transition-all"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  requestDelete(member);
                                }}
                                className="p-2 rounded-lg text-slate-300 hover:text-rose-500 transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </React.Fragment>
                );
              })}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-32 text-center bg-slate-50/10">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                      <SearchX size={48} className="text-slate-300" />
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
                        No synchronized records match these filters
                      </p>
                      <button
                        onClick={resetFilters}
                        className="text-indigo-600 text-[10px] font-black underline uppercase tracking-widest"
                      >
                        Clear all parameters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const VisitorFormModal = ({ visitor, onClose, onSave }: any) => {
  const currentAdminName = resolveCurrentAdminName();

  const toDateTimeInputValue = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };

  const toIsoString = (value?: string) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  };

  const [formData, setFormData] = useState({
    name: visitor.name || "",
    company: visitor.company || "",
    purpose: visitor.purpose || "",
    host: visitor.host || "",
    visitorType: visitor.visitorType || "Guest",
    status: visitor.status || "In",
    checkInTime: toDateTimeInputValue(visitor.checkInTime),
    checkOutTime: toDateTimeInputValue(visitor.checkOutTime),
    processedBy: currentAdminName,
  });
  const [availableHosts, setAvailableHosts] = useState<Host[]>([]);
  const [availablePurposes, setAvailablePurposes] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    const loadOptions = async () => {
      setLoadingOptions(true);
      try {
        const [hostsResponse, reasonsResponse] = await Promise.all([
          apiService.host.getAll(),
          apiService.visitorReason.getAll(),
        ]);

        const hosts = getApiContent<Host[]>(hostsResponse, [], "hosts").filter(
          (h) => h.status === "Active",
        );
        const reasons = getApiContent<VisitorReason[]>(
          reasonsResponse,
          [],
          "visitor reasons",
        );

        setAvailableHosts(hosts);
        setAvailablePurposes(
          reasons
            .filter((r) => (r as any).isActive !== false)
            .map((r) => r.name)
            .filter(Boolean),
        );
      } catch (error) {
        console.error("Failed to load visitor update options:", error);
      } finally {
        setLoadingOptions(false);
      }
    };
    loadOptions();
  }, []);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl p-12 rounded-[3.5rem] shadow-2xl animate-in zoom-in-95 duration-500 border border-slate-100 max-h-[90vh] overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">
              Edit Visitor
            </h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
              Update Registry Profile
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-50 hover:text-rose-500 transition-all"
          >
            <X size={20} />
          </button>
        </header>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setValidationError("");
            const normalizedStatus = formData.status === "Out" ? "Out" : "In";
            const normalizedCheckOut =
              normalizedStatus === "Out"
                ? toIsoString(formData.checkOutTime)
                : null;

            if (normalizedStatus === "Out" && !normalizedCheckOut) {
              setValidationError(
                "Check Out Time is required when status is Out.",
              );
              return;
            }

            onSave({
              ...formData,
              status: normalizedStatus,
              checkInTime:
                toIsoString(formData.checkInTime) || visitor.checkInTime,
              checkOutTime: normalizedCheckOut,
              processedBy: currentAdminName,
            });
          }}
          className="space-y-8"
        >
          <SettingInput
            label="Full Name"
            icon={User}
            value={formData.name}
            onChange={(v: string) => setFormData({ ...formData, name: v })}
          />
          <SettingInput
            label="Organization"
            icon={Building2}
            value={formData.company}
            onChange={(v: string) => setFormData({ ...formData, company: v })}
          />

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
              Assigned Host
            </label>
            <div className="relative group">
              <UserCheck className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500" />
              <select
                required
                className="w-full pl-16 pr-10 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold text-sm text-slate-800 transition-all shadow-sm appearance-none cursor-pointer"
                value={formData.host}
                onChange={(e) =>
                  setFormData({ ...formData, host: e.target.value })
                }
              >
                {loadingOptions && <option value="">Loading hosts...</option>}
                {!loadingOptions &&
                  formData.host &&
                  !availableHosts.some((h) => h.fullName === formData.host) && (
                    <option value={formData.host}>{formData.host}</option>
                  )}
                {!loadingOptions &&
                  availableHosts.map((h) => (
                    <option key={h.id} value={h.fullName}>
                      {h.fullName}
                    </option>
                  ))}
              </select>
              <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
              Visit Purpose
            </label>
            <div className="relative">
              <Briefcase className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              <select
                className="w-full pl-16 pr-10 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold text-sm text-slate-800 appearance-none cursor-pointer"
                value={formData.purpose}
                onChange={(e) =>
                  setFormData({ ...formData, purpose: e.target.value })
                }
              >
                {loadingOptions && <option value="">Loading reasons...</option>}
                {!loadingOptions &&
                  formData.purpose &&
                  !availablePurposes.includes(formData.purpose) && (
                    <option value={formData.purpose}>{formData.purpose}</option>
                  )}
                {!loadingOptions &&
                  availablePurposes.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
              </select>
              <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
              Status
            </label>
            <div className="relative">
              <BadgeCheck className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              <select
                className="w-full pl-16 pr-10 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold text-sm text-slate-800 appearance-none cursor-pointer"
                value={formData.status}
                onChange={(e) =>
                  setFormData((prev) => {
                    const nextStatus = e.target.value === "Out" ? "Out" : "In";
                    return {
                      ...prev,
                      status: nextStatus,
                      checkOutTime:
                        nextStatus === "In" ? "" : prev.checkOutTime,
                    };
                  })
                }
              >
                <option value="In">In</option>
                <option value="Out">Out</option>
              </select>
              <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
                Check In Time
              </label>
              <input
                type="datetime-local"
                required
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold text-sm text-slate-800"
                value={formData.checkInTime}
                onChange={(e) =>
                  setFormData({ ...formData, checkInTime: e.target.value })
                }
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
                Check Out Time
              </label>
              <input
                type="datetime-local"
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold text-sm text-slate-800"
                value={formData.checkOutTime}
                required={formData.status === "Out"}
                disabled={formData.status === "In"}
                onChange={(e) =>
                  setFormData({ ...formData, checkOutTime: e.target.value })
                }
              />
            </div>
          </div>
          {validationError && (
            <p className="text-[10px] font-black uppercase tracking-widest text-rose-600">
              {validationError}
            </p>
          )}

          <SettingInput
            label="Processed By"
            icon={Shield}
            value={formData.processedBy}
            readOnly
            onChange={(v: string) =>
              setFormData({ ...formData, processedBy: v })
            }
          />

          <div className="pt-6">
            <button
              type="submit"
              className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3"
            >
              <Save size={18} /> Update Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const KeyLogFormModal = ({ keyLog, onClose, onSave }: any) => {
  const currentAdminName = resolveCurrentAdminName();

  const toDateTimeInputValue = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };

  const toIsoString = (value?: string) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  };

  const [validationError, setValidationError] = useState("");
  const [formData, setFormData] = useState({
    keyId: String(keyLog?.keyId || ""),
    keyNumber: keyLog?.keyNumber || "",
    keyName: keyLog?.keyName || "",
    borrower: String(keyLog?.borrower || ""),
    borrowerName: keyLog?.borrowerName || "",
    purpose: keyLog?.purpose || "",
    checkoutSecurityName: keyLog?.checkoutSecurityName || "",
    borrowedAt: toDateTimeInputValue(keyLog?.borrowedAt),
    status: keyLog?.status || "Out",
    returnedAt: toDateTimeInputValue(keyLog?.returnedAt),
    returnerName: keyLog?.returnerName || "",
    returnSecurityName: keyLog?.returnSecurityName || "",
    condition: keyLog?.condition || "",
    maintenanceNotes: keyLog?.maintenanceNotes || "",
    processedBy: currentAdminName,
  });

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl p-12 rounded-[3.5rem] shadow-2xl animate-in zoom-in-95 duration-500 border border-slate-100 max-h-[90vh] overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">
              Edit Key Log
            </h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
              Update Key Borrow/Return Record
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all"
          >
            <X size={20} />
          </button>
        </header>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setValidationError("");

            const borrowedAtIso = toIsoString(formData.borrowedAt);
            const returnedAtIso = toIsoString(formData.returnedAt);
            const normalizedStatus =
              formData.status === "Returned"
                ? "Returned"
                : formData.status === "In"
                  ? "In"
                  : "Out";

            if (!borrowedAtIso) {
              setValidationError("Borrowed At is required.");
              return;
            }
            if (normalizedStatus === "Returned" && !returnedAtIso) {
              setValidationError(
                "Returned At is required when status is Returned.",
              );
              return;
            }

            onSave({
              ...formData,
              borrowedAt: borrowedAtIso,
              returnedAt:
                normalizedStatus === "Returned" ? returnedAtIso : null,
              returnerName:
                normalizedStatus === "Returned" ? formData.returnerName : null,
              returnSecurityName:
                normalizedStatus === "Returned"
                  ? formData.returnSecurityName
                  : null,
              condition:
                normalizedStatus === "Returned" ? formData.condition : null,
              maintenanceNotes:
                normalizedStatus === "Returned"
                  ? formData.maintenanceNotes
                  : null,
              status: normalizedStatus,
              processedBy: currentAdminName,
            });
          }}
          className="space-y-8"
        >
          <SettingInput
            label="Key Number"
            icon={Hash}
            value={formData.keyNumber}
            onChange={(v: string) =>
              setFormData((prev) => ({ ...prev, keyNumber: v }))
            }
            required
          />
          <SettingInput
            label="Key Name"
            icon={KeyRound}
            value={formData.keyName}
            onChange={(v: string) =>
              setFormData((prev) => ({ ...prev, keyName: v }))
            }
            required
          />
          <SettingInput
            label="Borrower Name"
            icon={User}
            value={formData.borrowerName}
            onChange={(v: string) =>
              setFormData((prev) => ({ ...prev, borrowerName: v }))
            }
            required
          />
          <SettingInput
            label="Purpose"
            icon={Briefcase}
            value={formData.purpose}
            onChange={(v: string) =>
              setFormData((prev) => ({ ...prev, purpose: v }))
            }
            required
          />
          <SettingInput
            label="Checkout Security Name"
            icon={ShieldCheck}
            value={formData.checkoutSecurityName}
            onChange={(v: string) =>
              setFormData((prev) => ({ ...prev, checkoutSecurityName: v }))
            }
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
                Borrowed At
              </label>
              <input
                type="datetime-local"
                required
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold text-sm text-slate-800"
                value={formData.borrowedAt}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    borrowedAt: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
                Status
              </label>
              <div className="relative">
                <BadgeCheck className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <select
                  className="w-full pl-12 pr-10 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold text-sm text-slate-800 appearance-none"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, status: e.target.value }))
                  }
                >
                  <option value="Out">Out</option>
                  <option value="In">In</option>
                  <option value="Returned">Returned</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
                Returned At
              </label>
              <input
                type="datetime-local"
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold text-sm text-slate-800"
                value={formData.returnedAt}
                disabled={formData.status !== "Returned"}
                required={formData.status === "Returned"}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    returnedAt: e.target.value,
                  }))
                }
              />
            </div>
            <SettingInput
              label="Returner Name"
              icon={UserCheck}
              value={formData.returnerName}
              onChange={(v: string) =>
                setFormData((prev) => ({ ...prev, returnerName: v }))
              }
              disabled={formData.status !== "Returned"}
            />
          </div>

          <SettingInput
            label="Return Security Name"
            icon={Shield}
            value={formData.returnSecurityName}
            onChange={(v: string) =>
              setFormData((prev) => ({ ...prev, returnSecurityName: v }))
            }
            disabled={formData.status !== "Returned"}
          />

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
              Condition
            </label>
            <div className="relative">
              <ShieldCheck className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              <select
                disabled={formData.status !== "Returned"}
                className="w-full pl-16 pr-10 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold text-sm text-slate-800 appearance-none cursor-pointer"
                value={formData.condition}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    condition: e.target.value,
                  }))
                }
              >
                <option value="">Select condition</option>
                <option value="Good">Good</option>
                <option value="Damaged">Damaged</option>
                <option value="Needs Service">Needs Service</option>
              </select>
              <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
              Maintenance Notes
            </label>
            <textarea
              rows={3}
              disabled={formData.status !== "Returned"}
              className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold text-sm text-slate-800 resize-none"
              value={formData.maintenanceNotes}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  maintenanceNotes: e.target.value,
                }))
              }
            />
          </div>

          {validationError && (
            <p className="text-[10px] font-black uppercase tracking-widest text-rose-600">
              {validationError}
            </p>
          )}

          <SettingInput
            label="Processed By"
            icon={Shield}
            value={formData.processedBy}
            onChange={(v: string) =>
              setFormData((prev) => ({ ...prev, processedBy: v }))
            }
            readOnly
          />

          <div className="pt-6">
            <button
              type="submit"
              className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3"
            >
              <Save size={18} /> Update Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const FilterSelect = ({ label, icon: Icon, value, options, onChange }: any) => (
  <div className="space-y-3">
    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
      <Icon size={10} /> {label}
    </label>
    <div className="relative">
      <select
        className="w-full pl-4 pr-10 py-2 bg-white border border-slate-200 rounded-xl outline-none font-bold text-xs text-slate-600 appearance-none focus:border-indigo-500 transition-all cursor-pointer truncate"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt: string) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
    </div>
  </div>
);

/* --- DASHBOARD & ANALYTICS --- */
const AdminDashboard = ({
  insights,
  visitors,
  deliveries,
  keyLogs,
}: {
  insights: string;
  visitors: Visitor[];
  deliveries: DeliveryRecord[];
  keyLogs: KeyLog[];
}) => {
  const analytics = useMemo(() => {
    const getFrequencyMap = (arr: any[], key: string) =>
      arr.reduce((acc: any, curr: any) => {
        const val = curr[key];
        if (val) acc[val] = (acc[val] || 0) + 1;
        return acc;
      }, {});
    const getTopFromMap = (map: any) => {
      const entries = Object.entries(map);
      if (entries.length === 0) return "N/A";
      return entries.sort((a: any, b: any) => b[1] - a[1])[0][0];
    };

    // Stage 4: Filtering visitors for correct metrics
    const bodyVisitors = visitors; // Body count
    const mostVisitedHost = getTopFromMap(
      getFrequencyMap(
        visitors.filter((v) => v.isGroupLead || !v.groupId),
        "host",
      ),
    );
    const mostVisitedCampus = getTopFromMap(
      getFrequencyMap(
        visitors.filter((v) => v.isGroupLead || !v.groupId),
        "location",
      ),
    );
    const highestVisitReason = getTopFromMap(
      getFrequencyMap(
        visitors.filter((v) => v.isGroupLead || !v.groupId),
        "purpose",
      ),
    );

    const mostBorrowedKey = getTopFromMap(getFrequencyMap(keyLogs, "keyName"));
    const mostFrequentVisitor = getTopFromMap(
      getFrequencyMap(
        visitors.filter((v) => v.isGroupLead || !v.groupId),
        "name",
      ),
    );
    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayTraffic = visitors
      .filter((v) => v.isGroupLead || !v.groupId)
      .reduce((acc: any, v: any) => {
        const day = dayLabels[new Date(v.checkInTime).getDay()];
        acc[day] = (acc[day] || 0) + 1;
        return acc;
      }, {});
    const dayData = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
      (d) => ({ name: d, visitors: dayTraffic[d] || 0 }),
    );
    const hourMap = visitors.reduce((acc: any, v: any) => {
      const hour = new Date(v.checkInTime).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});
    const topHourEntry = Object.entries(hourMap).sort(
      (a: any, b: any) => b[1] - a[1],
    )[0];
    return {
      mostVisitedHost,
      mostVisitedCampus,
      highestVisitReason,
      mostBorrowedKey,
      mostFrequentVisitor,
      peakHour: topHourEntry
        ? `${parseInt(topHourEntry[0]) % 12 || 12}${parseInt(topHourEntry[0]) >= 12 ? "PM" : "AM"}`
        : "N/A",
      dayOfWeekData: dayData,
    };
  }, [visitors, keyLogs]);

  const recentDeliveries = useMemo(() => {
    return [...deliveries]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, 5);
  }, [deliveries]);

  const insightCards = [
    {
      label: "Top Key",
      value: analytics.mostBorrowedKey,
      icon: KeyRound,
      color: "amber",
    },
    {
      label: "Top Host",
      value: analytics.mostVisitedHost,
      icon: Award,
      color: "indigo",
    },
    {
      label: "Main Campus",
      value: analytics.mostVisitedCampus,
      icon: MapPin,
      color: "rose",
    },
    {
      label: "Frequent Guest",
      value: analytics.mostFrequentVisitor,
      icon: UserCheck,
      color: "blue",
    },
    {
      label: "Primary Reason",
      value: analytics.highestVisitReason,
      icon: Flame,
      color: "emerald",
    },
  ];
  const deliveryStats = useMemo(() => {
    const counts: Record<string, number> = {};
    deliveries.forEach((d) => {
      counts[d.company] = (counts[d.company] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [deliveries]);

  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-indigo-600 rounded-[3.5rem] p-12 text-white shadow-2xl shadow-indigo-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-1000">
            <Sparkles size={160} />
          </div>
          <div className="relative z-10 space-y-8">
            <div className="flex items-center gap-3">
              <div className="px-4 py-1.5 bg-white/20 rounded-full backdrop-blur-md border border-white/20 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  AI Operational Intelligence
                </span>
              </div>
            </div>
            <p className="text-2xl font-bold leading-relaxed whitespace-pre-wrap">
              {insights}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 pt-10 border-t border-white/10">
              {insightCards.map((card, idx) => (
                <div key={idx} className="space-y-2">
                  <p className="text-[8px] font-black text-white/40 uppercase tracking-widest flex items-center gap-2">
                    <card.icon
                      size={10}
                      className={
                        card.color === "amber"
                          ? "text-amber-400"
                          : card.color === "indigo"
                            ? "text-indigo-400"
                            : card.color === "rose"
                              ? "text-rose-400"
                              : card.color === "blue"
                                ? "text-blue-400"
                                : "text-emerald-400"
                      }
                    />{" "}
                    {card.label}
                  </p>
                  <p className="text-xs font-black tracking-tight truncate">
                    {card.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-slate-800 uppercase tracking-widest text-[10px]">
                Peak Operations
              </h3>
              <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black">
                ACTIVE
              </div>
            </div>
            <p className="text-4xl font-black text-slate-900 tracking-tighter mb-4">
              {analytics.peakHour}
            </p>
            <p className="text-sm text-slate-400 font-medium">
              Historical high-volume arrival window identified by terminal
              sensors.
            </p>
          </div>
          <div className="pt-8 border-t border-slate-50">
            <div className="flex items-center gap-4 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              <Timer size={14} className="text-indigo-50" /> Sensor
              synchronization active
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <StatCard
          label="Total Occupancy"
          value={visitors.filter((v) => v.status === "In").length}
          icon={Users}
          color="indigo"
          delta="+12%"
        />
        <StatCard
          label="Active Packages"
          value={deliveries.length}
          icon={Package}
          color="emerald"
          delta="+4%"
        />
        <StatCard
          label="Keys Loaned"
          value={keyLogs.filter((k) => k.status === "Out").length}
          icon={Key}
          color="amber"
          delta="-2"
        />
        <StatCard
          label="Security Health"
          value="OPTIMAL"
          icon={ShieldCheck}
          color="rose"
          delta="100%"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                <TrendingUp size={24} />
              </div>
              <div>
                <h3 className="font-black text-slate-800 tracking-tight">
                  Weekly Session Distribution
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Arrival volume by day
                </p>
              </div>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.dayOfWeekData}>
                  <defs>
                    <linearGradient
                      id="colorVisitors"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }}
                  />
                  <ReTooltip
                    cursor={{ stroke: "#4f46e5", strokeWidth: 2 }}
                    contentStyle={{
                      borderRadius: "16px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                      padding: "12px",
                    }}
                    itemStyle={{ fontWeight: 800, fontSize: "12px" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="visitors"
                    stroke="#4f46e5"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorVisitors)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                <BarChart3 size={24} />
              </div>
              <div>
                <h3 className="font-black text-slate-800 tracking-tight">
                  Logistics Ratio
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Active Courier Distribution
                </p>
              </div>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deliveryStats} layout="vertical">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    width={80}
                    tick={{ fontSize: 10, fontWeight: 800, fill: "#64748b" }}
                  />
                  <ReTooltip
                    cursor={{ fill: "#f8fafc" }}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Bar
                    dataKey="value"
                    fill="#10b981"
                    radius={[0, 8, 8, 0]}
                    barSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                <Truck size={20} />
              </div>
              <div>
                <h3 className="font-black text-slate-800 tracking-tight">
                  Recent Deliveries
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Last 5 records
                </p>
              </div>
            </div>
            <Link
              to="/admin/deliveries"
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-all"
            >
              <ChevronRight size={20} />
            </Link>
          </div>
          <div className="flex-1 space-y-6">
            {recentDeliveries.map((delivery) => (
              <div
                key={delivery.id}
                className="flex items-start justify-between group"
              >
                <div className="space-y-1 max-w-[150px]">
                  <p className="font-black text-slate-900 text-sm truncate group-hover:text-indigo-600 transition-colors">
                    {delivery.company}
                  </p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">
                    For: {delivery.deliveryFor}
                  </p>
                  <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest truncate">
                    Recv: {delivery.receivedBy}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-end gap-1.5">
                    <Clock size={10} className="text-slate-300" />
                    {new Date(delivery.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="text-[8px] font-bold text-slate-300 mt-0.5">
                    {new Date(delivery.timestamp).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            ))}
            {recentDeliveries.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center py-20 text-center opacity-30">
                <Box size={40} className="text-slate-300 mb-4" />
                <p className="text-[9px] font-black uppercase tracking-widest">
                  No Recent Activity
                </p>
              </div>
            )}
          </div>
          <div className="pt-8 border-t border-slate-50 mt-8">
            <div className="flex items-center gap-2 text-[9px] font-black text-slate-300 uppercase tracking-widest">
              <ShieldCheck size={12} className="text-emerald-500" /> Verified
              Logistics Log
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, color, delta }: any) => {
  const colors: any = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
  };
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-500">
      <div className="flex items-center gap-6">
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center ${colors[color]} group-hover:scale-110 transition-transform`}
        >
          <Icon size={24} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            {label}
          </p>
          <p className="text-3xl font-black text-slate-900 mt-1 tracking-tighter">
            {value}
          </p>
        </div>
      </div>
      <div
        className={`text-[10px] font-black px-3 py-1 rounded-full ${delta.startsWith("+") ? "bg-emerald-50 text-emerald-600" : delta.startsWith("-") ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-400"}`}
      >
        {delta}
      </div>
    </div>
  );
};

const SettingInput = ({
  label,
  icon: Icon,
  type = "text",
  value,
  onChange,
  placeholder,
  disabled = false,
  readOnly = false,
  required = true,
}: any) => (
  <div className={`space-y-4 ${disabled ? "opacity-50" : ""}`}>
    <label className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.3em] ml-2">
      {label}
    </label>
    <div className="relative group">
      <Icon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
      <input
        required={required}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        className="w-full pl-16 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold text-sm text-slate-800 transition-all shadow-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  </div>
);

const BulkProgress = ({
  progress,
  label,
}: {
  progress: number;
  label: string;
}) => (
  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] animate-in fade-in duration-300">
    <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl w-full max-w-lg text-center space-y-8 animate-in zoom-in-95 duration-500 border border-slate-100">
      <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto animate-bounce shadow-inner border border-indigo-100">
        <FileUp size={40} />
      </div>
      <div>
        <h3 className="text-3xl font-black text-slate-900 tracking-tight">
          {label}
        </h3>
        <p className="text-slate-400 text-sm mt-2 font-medium">
          Processing records and synchronizing directory...
        </p>
      </div>
      <div className="space-y-4">
        <div className="w-full h-5 bg-slate-50 rounded-full overflow-hidden shadow-inner border border-slate-100">
          <div
            className="h-full bg-indigo-600 transition-all duration-300 ease-out shadow-lg shadow-indigo-200"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between items-center px-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
            {progress}% Processed
          </span>
          <div className="flex gap-1">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-1 h-1 rounded-full ${progress >= i * 33 ? "bg-indigo-600" : "bg-slate-200"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const AdminSettings = ({
  settings,
  onUpdate,
  securityAlerts,
  onUpdateAlerts,
}: {
  settings: SystemSettings;
  onUpdate: (s: SystemSettings) => void;
  securityAlerts: SecurityAlert[];
  onUpdateAlerts: (a: SecurityAlert[]) => void;
}) => {
  const location = useLocation();
  const subTabs = [
    { label: "System", path: "/admin/settings/system", icon: Building2 },
    { label: "Hosts", path: "/admin/settings/hosts", icon: Users },
    { label: "Keys", path: "/admin/settings/keys", icon: KeyRound },
    { label: "Location", path: "/admin/settings/location", icon: MapPin },
    {
      label: "Visitor Types",
      path: "/admin/settings/visitor-types",
      icon: UserPlus,
    },
    {
      label: "Visitor Reasons",
      path: "/admin/settings/visitor-reasons",
      icon: MessageSquare,
    },
    {
      label: "Movement Reasons",
      path: "/admin/settings/movement-reasons",
      icon: ArrowRightLeft,
    },
    {
      label: "Access Reasons",
      path: "/admin/settings/key-reasons",
      icon: KeyIcon,
    },
    {
      label: "Delivery Types",
      path: "/admin/settings/delivery-types",
      icon: Box,
    },
    {
      label: "Communication",
      path: "/admin/settings/communication",
      icon: MessageSquare,
    },
    {
      label: "Google Workspace",
      path: "/admin/settings/workspace",
      icon: Globe,
    },
    {
      label: "Security",
      path: "/admin/settings/security",
      icon: ShieldAlert,
      badge: securityAlerts.filter((a) => a.status === "Unread").length,
    },
  ];
  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <nav className="flex flex-wrap gap-4 p-2 bg-white/50 rounded-full w-fit shadow-sm border border-slate-100/50 backdrop-blur-sm">
        {subTabs.map((tab) => (
          <Link
            key={tab.label}
            to={tab.path}
            className={`flex items-center gap-3 px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest transition-all relative ${location.pathname === tab.path || (location.pathname === "/admin/settings" && tab.label === "System") ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-slate-400 hover:text-slate-600 hover:bg-white"}`}
          >
            <tab.icon size={14} />
            {tab.label}
            {tab.badge ? (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[7px] w-3 h-3 rounded-full flex items-center justify-center ring-2 ring-white">
                {tab.badge}
              </span>
            ) : null}
          </Link>
        ))}
      </nav>
      <div className="bg-white rounded-[3.5rem] p-12 border border-slate-100 shadow-sm min-h-[500px]">
        <Routes>
          <Route path="/" element={<Navigate to="system" replace />} />
          <Route
            path="system"
            element={<SystemConfig settings={settings} onUpdate={onUpdate} />}
          />
          <Route path="hosts" element={<HostManagement />} />
          <Route path="keys" element={<KeyManagement />} />
          <Route path="location" element={<LocationManagement />} />
          <Route path="visitor-types" element={<VisitorTypeManagement />} />
          <Route
            path="reasons"
            element={<Navigate to="visitor-reasons" replace />}
          />
          <Route path="visitor-reasons" element={<VisitReasonManagement />} />
          <Route
            path="movement-reasons"
            element={<MovementReasonManagement />}
          />
          <Route
            path="key-reasons"
            element={<KeyBorrowingReasonManagement />}
          />
          <Route path="delivery-types" element={<DeliveryTypeManagement />} />
          <Route
            path="communication"
            element={
              <NotificationManagement settings={settings} onUpdate={onUpdate} />
            }
          />
          <Route
            path="workspace"
            element={
              <WorkspaceSettingsView settings={settings} onUpdate={onUpdate} />
            }
          />
          <Route
            path="security"
            element={
              <SecurityManagement
                alerts={securityAlerts}
                onUpdateAlerts={onUpdateAlerts}
              />
            }
          />
        </Routes>
      </div>
    </div>
  );
};

// ============================================================
// LocationManagement - Manage security stations
// ============================================================
const LocationManagement = () => {
  const [stations, setStations] = useState<any[]>([]);
  const [selectedStationIds, setSelectedStationIds] = useState<Set<number>>(
    new Set(),
  );
  const [newStation, setNewStation] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingOverlay, setLoadingOverlay] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(
    "Loading security stations",
  );
  const [error, setError] = useState("");
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    loadStations();
  }, []);

  const loadStations = async () => {
    try {
      setError("");
      setLoading(true);
      const response = await apiService.securityStation.getAll();
      setStations(
        getApiContent(response as ApiEnvelope<any[]>, [], "security stations"),
      );
      setSelectedStationIds(new Set());
    } catch (err: any) {
      console.error("Failed to load security stations:", err);
      setError(err.message || "Failed to load security stations");
    } finally {
      setLoading(false);
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStation.trim()) return;

    try {
      setError(""); // Add this
      setLoadingOverlay(true);
      setLoadingMessage("Adding Security Station");
      const response = await apiService.securityStation.create({
        name: newStation.trim(),
        isActive: true,
      });
      ensureApiSuccess(response, "Failed to add security station");
      setNewStation("");
      await loadStations();
    } catch (err: any) {
      console.error("Failed to add security station:", err);
      setError(
        err.errorMessage || err.message || "Failed to add security station",
      );
    } finally {
      setLoadingOverlay(false);
    }
  };

  const remove = async (id: number) => {
    try {
      setError("");
      setLoadingOverlay(true);
      setLoadingMessage("Deleting Security Station");
      const response = await apiService.securityStation.delete(id);
      ensureApiSuccess(response, "Failed to delete security station");
      await loadStations();
    } catch (err: any) {
      console.error("Failed to delete security station:", err);
      setError(err.message || "Failed to delete security station");
    } finally {
      setLoadingOverlay(false);
    }
  };

  const requestConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
  ) => {
    setConfirmAction({ title, message, onConfirm });
  };

  const requestRemove = (station: any) => {
    requestConfirm(
      "Delete Security Station",
      `Are you sure you want to delete ${station?.name || "this station"}?`,
      () => remove(station.id),
    );
  };

  const requestBulkRemove = () => {
    const ids = normalizeNumericIds(Array.from(selectedStationIds));
    if (!ids.length) return;
    requestConfirm(
      "Bulk Delete Security Stations",
      `Are you sure you want to delete ${ids.length} selected station(s)?`,
      async () => {
        try {
          setError("");
          setLoadingOverlay(true);
          setLoadingMessage("Bulk Deleting Security Stations");
          const response = await apiService.securityStation.bulkDelete(ids);
          ensureApiSuccess(response, "Failed to bulk delete security stations");
          await loadStations();
        } catch (err: any) {
          console.error("Failed to bulk delete security stations:", err);
          setError(
            err.errorMessage ||
              err.message ||
              "Failed to bulk delete security stations",
          );
        } finally {
          setLoadingOverlay(false);
        }
      },
    );
  };

  const allStationsSelected =
    stations.length > 0 && selectedStationIds.size === stations.length;

  const toggleSelectAllStations = () => {
    if (allStationsSelected) {
      setSelectedStationIds(new Set());
      return;
    }
    setSelectedStationIds(
      new Set(normalizeNumericIds(stations.map((station: any) => station.id))),
    );
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {(loadingOverlay || loading) && (
        <LoadingOverlay message={loadingMessage} />
      )}
      <ConfirmActionModal
        confirmAction={confirmAction}
        onClose={() => setConfirmAction(null)}
      />
      <header>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Security Node Registry
        </h2>
        <p className="text-slate-400 text-sm mt-1 font-medium tracking-tight">
          Define physical terminal locations for security personnel selection.
        </p>
      </header>
      <ErrorBanner message={error} />
      <form
        onSubmit={add}
        className="flex gap-4 max-w-md bg-slate-50 p-3 rounded-[2rem] border border-slate-100"
      >
        <input
          placeholder="e.g. Loading Dock North"
          className="flex-1 bg-white px-6 py-4 rounded-[1.5rem] border border-slate-100 text-sm font-bold outline-none"
          value={newStation}
          onChange={(e) => setNewStation(e.target.value)}
        />
        <button
          type="submit"
          className="bg-slate-900 text-white px-8 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-md"
        >
          Add Station
        </button>
      </form>
      <div className="flex items-center gap-3 pl-8">
        <input
          type="checkbox"
          checked={allStationsSelected}
          onChange={toggleSelectAllStations}
          disabled={stations.length === 0}
          aria-label="Select all stations"
          className="w-4 h-4 accent-indigo-600 disabled:opacity-50"
        />
        <button
          onClick={requestBulkRemove}
          disabled={selectedStationIds.size === 0}
          className="px-6 py-3 rounded-2xl border border-rose-100 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Delete Selected ({selectedStationIds.size})
        </button>
      </div>
      <div className="flex flex-wrap gap-5">
        {stations.map((station) => (
          <div
            key={station.id}
            className="flex items-center gap-4 bg-white border border-slate-100 px-8 py-5 rounded-[2rem] group hover:border-emerald-200 transition-all shadow-sm"
          >
            <input
              type="checkbox"
              checked={selectedStationIds.has(Number(station.id))}
              onChange={() =>
                setSelectedStationIds((prev) => {
                  const next = new Set(prev);
                  const id = Number(station.id);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })
              }
              className="w-4 h-4 accent-indigo-600"
            />
            <span className="font-black text-slate-700 text-xs uppercase tracking-wider">
              {station.name}
            </span>
            <button
              onClick={() => requestRemove(station)}
              className="text-slate-300 hover:text-rose-500 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {stations.length === 0 && (
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] py-12">
            No terminal stations defined.
          </p>
        )}
      </div>
    </div>
  );
};

const WorkspaceSettingsView = ({ settings, onUpdate }: any) => {
  const [formData, setFormData] = useState(
    settings?.workspace || DEFAULT_SETTINGS.workspace,
  );
  const [saved, setSaved] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authorizing, setAuthorizing] = useState(false);
  const [loadingOverlay, setLoadingOverlay] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Updating Workspace");
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  useEffect(() => {
    const authorized = localStorage.getItem("googleAuthorized") === "true";
    setIsAuthorized(authorized);
  }, []);

  const requestConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
  ) => {
    setConfirmAction({ title, message, onConfirm });
  };
  const handleAuthorize = async () => {
    setAuthorizing(true);
    setLoadingOverlay(true);
    setLoadingMessage("Authorizing Workspace");
    const success = await workspaceService.authorize();
    if (success) {
      setIsAuthorized(true);
      localStorage.setItem("googleAuthorized", "true");
    }
    setAuthorizing(false);
    setLoadingOverlay(false);
  };
  const handleDisconnect = () => {
    requestConfirm(
      "Disconnect Workspace",
      "Are you sure you want to disconnect this Google Workspace authorization?",
      () => {
        setIsAuthorized(false);
        localStorage.removeItem("googleAuthorized");
      },
    );
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newSettings = { ...settings, workspace: formData };
    requestConfirm(
      "Update Workspace Settings",
      "Apply these Workspace integration settings?",
      () => {
        setLoadingOverlay(true);
        setLoadingMessage("Updating Workspace");
        onUpdate(newSettings);
        localStorage.setItem("systemSettings", JSON.stringify(newSettings));
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        setLoadingOverlay(false);
      },
    );
  };
  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-12 max-w-2xl animate-in fade-in duration-500"
    >
      {loadingOverlay && <LoadingOverlay message={loadingMessage} />}
      <ConfirmActionModal
        confirmAction={confirmAction}
        onClose={() => setConfirmAction(null)}
      />
      <header>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Google Workspace Integration
        </h2>
        <p className="text-slate-400 text-sm mt-1 font-medium tracking-tight">
          Sync personnel directory and enable real-time Chat notifications.
        </p>
      </header>
      <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 space-y-6">
        <div className="flex items-center gap-6">
          <div
            className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all shadow-sm ${isAuthorized ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-300"}`}
          >
            <Fingerprint size={32} />
          </div>
          <div>
            <h3 className="font-black text-slate-900 tracking-tight">
              Authorization Status
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              {isAuthorized ? "Handshake Secure" : "Handshake Required"}
            </p>
          </div>
        </div>
        <p className="text-xs font-medium text-slate-500 leading-relaxed">
          Authorization allows the Front Desk Hub to securely access your
          organization's Directory and Chat APIs.
        </p>
        {!isAuthorized ? (
          <button
            type="button"
            onClick={handleAuthorize}
            disabled={authorizing}
            className="w-full py-5 bg-black text-white font-black rounded-2xl text-[10px] uppercase tracking-[0.3em] shadow-xl hover:bg-zinc-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {authorizing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Lock size={16} />
            )}
            {authorizing ? "Connecting..." : "Connect Google Account"}
          </button>
        ) : (
          <div className="flex gap-4">
            <div className="flex-1 px-8 py-5 bg-emerald-50 text-emerald-600 font-black rounded-2xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
              <CheckCircle size={16} /> Authenticated
            </div>
            <button
              type="button"
              onClick={handleDisconnect}
              className="px-8 py-5 bg-white text-rose-500 border border-rose-100 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-rose-50 transition-all"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
      <div
        className={`space-y-8 transition-all ${isAuthorized ? "opacity-100" : "opacity-40 pointer-events-none"}`}
      >
        <div className="flex items-center gap-6 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
          <div className="flex gap-4 items-center flex-1">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border ${formData.enabled ? "bg-indigo-50 text-indigo-600 border-indigo-100" : "bg-white text-slate-300 border-slate-100"}`}
            >
              <Globe size={24} />
            </div>
            <div>
              <p className="font-black text-slate-800 text-sm tracking-tight">
                Enable Integration
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Connect to your organization directory
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              setFormData({ ...formData, enabled: !formData.enabled })
            }
            className={`relative w-16 h-8 rounded-full transition-all duration-500 ${formData.enabled ? "bg-indigo-600" : "bg-slate-300"}`}
          >
            <div
              className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-lg transition-transform duration-500 ${formData.enabled ? "translate-x-8" : ""}`}
            />
          </button>
        </div>
        <SettingInput
          label="Organization Domain"
          icon={Globe}
          value={formData.domain}
          onChange={(v: string) => setFormData({ ...formData, domain: v })}
          placeholder="yourcompany.com"
        />
        <div className="flex items-center gap-6 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
          <div className="flex gap-4 items-center flex-1">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border ${formData.useCustomerDirectory ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-white text-slate-300 border-slate-100"}`}
            >
              <Users size={24} />
            </div>
            <div>
              <p className="font-black text-slate-800 text-sm tracking-tight">
                Sync Entire Workspace Tenant
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Use customer=my_customer for multi-domain organizations
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              setFormData({
                ...formData,
                useCustomerDirectory: !formData.useCustomerDirectory,
              })
            }
            className={`relative w-16 h-8 rounded-full transition-all duration-500 ${formData.useCustomerDirectory ? "bg-blue-600" : "bg-slate-300"}`}
          >
            <div
              className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-lg transition-transform duration-500 ${formData.useCustomerDirectory ? "translate-x-8" : ""}`}
            />
          </button>
        </div>
        <div className="flex items-center gap-6 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
          <div className="flex gap-4 items-center flex-1">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border ${formData.chatNotificationsEnabled ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-white text-slate-300 border-slate-100"}`}
            >
              <MessageCircle size={24} />
            </div>
            <div>
              <p className="font-black text-slate-800 text-sm tracking-tight">
                Google Chat Notifications
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Alert hosts directly in Workchat
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              setFormData({
                ...formData,
                chatNotificationsEnabled: !formData.chatNotificationsEnabled,
              })
            }
            className={`relative w-16 h-8 rounded-full transition-all duration-500 ${formData.chatNotificationsEnabled ? "bg-emerald-600" : "bg-slate-300"}`}
          >
            <div
              className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-lg transition-transform duration-500 ${formData.chatNotificationsEnabled ? "translate-x-8" : ""}`}
            />
          </button>
        </div>
        <div className="flex items-center gap-6 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
          <div className="flex gap-4 items-center flex-1">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border ${formData.calendarEnabled ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-white text-slate-300 border-slate-100"}`}
            >
              <Calendar size={24} />
            </div>
            <div>
              <p className="font-black text-slate-800 text-sm tracking-tight">
                Google Calendar Sync
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Display real-time host availability
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              setFormData({
                ...formData,
                calendarEnabled: !formData.calendarEnabled,
              })
            }
            className={`relative w-16 h-8 rounded-full transition-all duration-500 ${formData.calendarEnabled ? "bg-amber-500" : "bg-slate-300"}`}
          >
            <div
              className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-lg transition-transform duration-500 ${formData.calendarEnabled ? "translate-x-8" : ""}`}
            />
          </button>
        </div>
      </div>
      <div className="pt-6">
        <button
          type="submit"
          disabled={!isAuthorized}
          className="bg-slate-900 text-white font-black px-12 py-5 rounded-2xl flex items-center gap-4 text-[11px] uppercase tracking-[0.2em] shadow-2xl hover:bg-black transition-all disabled:opacity-20"
        >
          {saved ? (
            <>
              <CheckCircle size={20} /> Integration Updated
            </>
          ) : (
            <>
              <Save size={20} /> Save Configuration
            </>
          )}
        </button>
      </div>
    </form>
  );
};

// ============================================================
// DeliveryTypeManagement - Manage delivery package types
// ============================================================

const DeliveryTypeManagement = () => {
  const [types, setTypes] = useState<any[]>([]);
  const [selectedTypeIds, setSelectedTypeIds] = useState<Set<number>>(
    new Set(),
  );
  const [newType, setNewType] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingOverlay, setLoadingOverlay] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(
    "Loading delivery types",
  );
  const [error, setError] = useState("");
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    loadTypes();
  }, []);

  // LOAD FUNCTION - Handle backend response structure
  const loadTypes = async () => {
    try {
      setLoading(true);
      setError(""); // Clear previous errors
      const response = await apiService.deliveryType.getAll();
      const data = getApiContent(
        response as ApiEnvelope<any[]>,
        [],
        "delivery types",
      );
      setTypes(data);
      setSelectedTypeIds(new Set());
    } catch (err: any) {
      console.error("Failed to load delivery types:", err);
      // Use backend error message if available
      setError(
        err.errorMessage || err.message || "Failed to load delivery types",
      );
    } finally {
      setLoading(false);
    }
  };

  // CREATE - NO ID PASSED
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newType.trim()) return;

    try {
      setError(""); // Clear previous errors
      setLoadingOverlay(true);
      setLoadingMessage("Adding Delivery Type");

      // CRITICAL: Do NOT pass id in create
      const response = await apiService.deliveryType.create({
        name: newType.trim(),
        description: "",
        isActive: true, // Optional: defaults to true on backend
      });
      ensureApiSuccess(response, "Failed to add delivery type");

      setNewType("");
      await loadTypes(); // Reload to get fresh data with server-generated IDs
    } catch (err: any) {
      console.error("Failed to add delivery type:", err);
      setError(
        err.errorMessage || err.message || "Failed to add delivery type",
      );
    } finally {
      setLoadingOverlay(false);
    }
  };

  // DELETE - ID REQUIRED
  const remove = async (id: number) => {
    try {
      setError(""); // Clear previous errors
      setLoadingOverlay(true);
      setLoadingMessage("Deleting Delivery Type");
      const response = await apiService.deliveryType.delete(id);
      ensureApiSuccess(response, "Failed to delete delivery type");
      await loadTypes(); // Reload fresh data
    } catch (err: any) {
      console.error("Failed to delete delivery type:", err);
      setError(
        err.errorMessage || err.message || "Failed to delete delivery type",
      );
    } finally {
      setLoadingOverlay(false);
    }
  };

  const requestConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
  ) => {
    setConfirmAction({ title, message, onConfirm });
  };

  const requestRemove = (type: any) => {
    requestConfirm(
      "Delete Delivery Type",
      `Are you sure you want to delete ${type?.name || "this type"}?`,
      () => remove(type.id),
    );
  };

  const requestBulkRemove = () => {
    const ids = normalizeNumericIds(Array.from(selectedTypeIds));
    if (!ids.length) return;
    requestConfirm(
      "Bulk Delete Delivery Types",
      `Are you sure you want to delete ${ids.length} selected type(s)?`,
      async () => {
        try {
          setError("");
          setLoadingOverlay(true);
          setLoadingMessage("Bulk Deleting Delivery Types");
          const response = await apiService.deliveryType.bulkDelete(ids);
          ensureApiSuccess(response, "Failed to bulk delete delivery types");
          await loadTypes();
        } catch (err: any) {
          console.error("Failed to bulk delete delivery types:", err);
          setError(
            err.errorMessage ||
              err.message ||
              "Failed to bulk delete delivery types",
          );
        } finally {
          setLoadingOverlay(false);
        }
      },
    );
  };

  const allTypesSelected =
    types.length > 0 && selectedTypeIds.size === types.length;

  const toggleSelectAllTypes = () => {
    if (allTypesSelected) {
      setSelectedTypeIds(new Set());
      return;
    }
    setSelectedTypeIds(
      new Set(normalizeNumericIds(types.map((type: any) => type.id))),
    );
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {(loadingOverlay || loading) && (
        <LoadingOverlay message={loadingMessage} />
      )}
      <ConfirmActionModal
        confirmAction={confirmAction}
        onClose={() => setConfirmAction(null)}
      />
      <header>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Delivery Categorization
        </h2>
        <p className="text-slate-400 text-sm mt-1 font-medium tracking-tight">
          Define mandatory package classifications for courier registration.
        </p>
      </header>
      <ErrorBanner message={error} />
      <form
        onSubmit={add}
        className="flex gap-4 max-w-md bg-slate-50 p-3 rounded-[2rem] border border-slate-100"
      >
        <input
          required
          placeholder="e.g. Perishable Goods"
          className="flex-1 bg-white px-6 py-4 rounded-[1.5rem] border border-slate-100 text-sm font-bold outline-none"
          value={newType}
          onChange={(e) => setNewType(e.target.value)}
        />
        <button
          type="submit"
          className="bg-slate-900 text-white px-8 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-md"
        >
          Add Type
        </button>
      </form>
      <div className="flex items-center gap-3 pl-8">
        <input
          type="checkbox"
          checked={allTypesSelected}
          onChange={toggleSelectAllTypes}
          disabled={types.length === 0}
          aria-label="Select all delivery types"
          className="w-4 h-4 accent-indigo-600 disabled:opacity-50"
        />
        <button
          onClick={requestBulkRemove}
          disabled={selectedTypeIds.size === 0}
          className="px-6 py-3 rounded-2xl border border-rose-100 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Delete Selected ({selectedTypeIds.size})
        </button>
      </div>
      <div className="flex flex-wrap gap-5">
        {types.map((type) => (
          <div
            key={type.id}
            className="flex items-center gap-4 bg-white border border-slate-100 px-8 py-5 rounded-[2rem] group hover:border-emerald-200 transition-all shadow-sm"
          >
            <input
              type="checkbox"
              checked={selectedTypeIds.has(Number(type.id))}
              onChange={() =>
                setSelectedTypeIds((prev) => {
                  const next = new Set(prev);
                  const id = Number(type.id);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })
              }
              className="w-4 h-4 accent-indigo-600"
            />
            <span className="font-black text-slate-700 text-xs uppercase tracking-wider">
              {type.name}
            </span>
            <button
              onClick={() => requestRemove(type)}
              className="text-slate-300 hover:text-rose-500 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {types.length === 0 && (
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] py-12">
            No delivery types defined.
          </p>
        )}
      </div>
    </div>
  );
};

// ============================================================
// VisitReasonManagement - Manage visit reasons
// ============================================================
const VisitReasonManagement = () => {
  const [reasons, setReasons] = useState<any[]>([]);
  const [selectedReasonIds, setSelectedReasonIds] = useState<Set<number>>(
    new Set(),
  );
  const [newReason, setNewReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingOverlay, setLoadingOverlay] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Loading visit reasons");
  const [error, setError] = useState("");
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    loadReasons();
  }, []);

  const loadReasons = async () => {
    try {
      setError("");

      setLoading(true);
      const response = await apiService.visitorReason.getAll();
      const data = getApiContent(
        response as ApiEnvelope<any[]>,
        [],
        "visitor reasons",
      );
      setReasons(data);
      setSelectedReasonIds(new Set());
    } catch (err: any) {
      console.error("Failed to load visit reasons:", err);
      setError(err.message || "Failed to load visit reasons");
    } finally {
      setLoading(false);
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReason.trim()) return;

    try {
      setError("");
      setLoadingOverlay(true);
      setLoadingMessage("Adding Visit Reason");
      const response = await apiService.visitorReason.create({
        name: newReason.trim(),
        description: "",
      });
      ensureApiSuccess(response, "Failed to add visit reason");
      setNewReason("");
      await loadReasons();
    } catch (err: any) {
      console.error("Failed to add visit reason:", err);
      setError(err.errorMessage || err.message || "Failed to add visit reason");
    } finally {
      setLoadingOverlay(false);
    }
  };

  const remove = async (id: number) => {
    try {
      setError("");
      setLoadingOverlay(true);
      setLoadingMessage("Deleting Visit Reason");
      const response = await apiService.visitorReason.delete(id);
      ensureApiSuccess(response, "Failed to delete visit reason");
      await loadReasons();
    } catch (err: any) {
      console.error("Failed to delete visit reason:", err);
      setError(err.message || "Failed to delete visit reason");
    } finally {
      setLoadingOverlay(false);
    }
  };

  const requestConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
  ) => {
    setConfirmAction({ title, message, onConfirm });
  };

  const requestRemove = (reason: any) => {
    requestConfirm(
      "Delete Visit Reason",
      `Are you sure you want to delete ${reason?.name || "this reason"}?`,
      () => remove(reason.id),
    );
  };

  const requestBulkRemove = () => {
    const ids = normalizeNumericIds(Array.from(selectedReasonIds));
    if (!ids.length) return;
    requestConfirm(
      "Bulk Delete Visit Reasons",
      `Are you sure you want to delete ${ids.length} selected reason(s)?`,
      async () => {
        try {
          setError("");
          setLoadingOverlay(true);
          setLoadingMessage("Bulk Deleting Visit Reasons");
          const response = await apiService.visitorReason.bulkDelete(ids);
          ensureApiSuccess(response, "Failed to bulk delete visit reasons");
          await loadReasons();
        } catch (err: any) {
          console.error("Failed to bulk delete visit reasons:", err);
          setError(
            err.errorMessage || err.message || "Failed to bulk delete reasons",
          );
        } finally {
          setLoadingOverlay(false);
        }
      },
    );
  };

  const allReasonsSelected =
    reasons.length > 0 && selectedReasonIds.size === reasons.length;

  const toggleSelectAllReasons = () => {
    if (allReasonsSelected) {
      setSelectedReasonIds(new Set());
      return;
    }
    setSelectedReasonIds(
      new Set(normalizeNumericIds(reasons.map((reason: any) => reason.id))),
    );
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {(loadingOverlay || loading) && (
        <LoadingOverlay message={loadingMessage} />
      )}
      <ConfirmActionModal
        confirmAction={confirmAction}
        onClose={() => setConfirmAction(null)}
      />
      <header>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Visit Purpose Registry
        </h2>
        <p className="text-slate-400 text-sm mt-1 font-medium tracking-tight">
          Define primary visit purposes for the check-in terminal.
        </p>
      </header>
      <ErrorBanner message={error} />
      <form
        onSubmit={add}
        className="flex gap-4 max-w-md bg-slate-50 p-3 rounded-[2rem] border border-slate-100"
      >
        <input
          required
          placeholder="e.g. Quarterly Audit"
          className="flex-1 bg-white px-6 py-4 rounded-[1.5rem] border border-slate-100 text-sm font-bold outline-none"
          value={newReason}
          onChange={(e) => setNewReason(e.target.value)}
        />
        <button
          type="submit"
          className="bg-slate-900 text-white px-8 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-md"
        >
          Add Reason
        </button>
      </form>
      <div className="flex items-center gap-3 pl-8">
        <input
          type="checkbox"
          checked={allReasonsSelected}
          onChange={toggleSelectAllReasons}
          disabled={reasons.length === 0}
          aria-label="Select all visit reasons"
          className="w-4 h-4 accent-indigo-600 disabled:opacity-50"
        />
        <button
          onClick={requestBulkRemove}
          disabled={selectedReasonIds.size === 0}
          className="px-6 py-3 rounded-2xl border border-rose-100 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Delete Selected ({selectedReasonIds.size})
        </button>
      </div>
      <div className="flex flex-wrap gap-5">
        {reasons.map((reason) => (
          <div
            key={reason.id}
            className="flex items-center gap-4 bg-white border border-slate-100 px-8 py-5 rounded-[2rem] group hover:border-indigo-200 transition-all shadow-sm"
          >
            <input
              type="checkbox"
              checked={selectedReasonIds.has(Number(reason.id))}
              onChange={() =>
                setSelectedReasonIds((prev) => {
                  const next = new Set(prev);
                  const id = Number(reason.id);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })
              }
              className="w-4 h-4 accent-indigo-600"
            />
            <span className="font-black text-slate-700 text-xs uppercase tracking-wider">
              {reason.name}
            </span>
            <button
              onClick={() => requestRemove(reason)}
              className="text-slate-300 hover:text-rose-500 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {reasons.length === 0 && (
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] py-12">
            No visit reasons defined.
          </p>
        )}
      </div>
    </div>
  );
};

// ============================================================
// MovementReasonManagement - Manage movement reasons
// ============================================================
const MovementReasonManagement = () => {
  const [reasons, setReasons] = useState<any[]>([]);
  const [selectedReasonIds, setSelectedReasonIds] = useState<Set<number>>(
    new Set(),
  );
  const [newReason, setNewReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingOverlay, setLoadingOverlay] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(
    "Loading movement reasons",
  );
  const [error, setError] = useState("");
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    loadReasons();
  }, []);

  const loadReasons = async () => {
    try {
      setError("");
      setLoading(true);
      const response = await apiService.movementReason.getAll();
      const data = getApiContent(
        response as ApiEnvelope<any[]>,
        [],
        "movement reasons",
      );
      setReasons(data);
      setSelectedReasonIds(new Set());
    } catch (err: any) {
      console.error("Failed to load movement reasons:", err);
      setError(err.message || "Failed to load movement reasons");
    } finally {
      setLoading(false);
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReason.trim()) return;

    try {
      setError("");
      setLoadingOverlay(true);
      setLoadingMessage("Adding Movement Reason");
      const response = await apiService.movementReason.create({
        name: newReason.trim(),
        description: "",
      });
      ensureApiSuccess(response, "Failed to add movement reason");
      setNewReason("");
      await loadReasons();
    } catch (err: any) {
      console.error("Failed to add movement reason:", err);
      setError(
        err.errorMessage || err.message || "Failed to add movement reason",
      );
    } finally {
      setLoadingOverlay(false);
    }
  };

  const remove = async (id: number) => {
    try {
      setError("");
      setLoadingOverlay(true);
      setLoadingMessage("Deleting Movement Reason");
      const response = await apiService.movementReason.delete(id);
      ensureApiSuccess(response, "Failed to delete movement reason");
      await loadReasons();
    } catch (err: any) {
      console.error("Failed to delete movement reason:", err);
      setError(err.message || "Failed to delete movement reason");
    } finally {
      setLoadingOverlay(false);
    }
  };

  const requestConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
  ) => {
    setConfirmAction({ title, message, onConfirm });
  };

  const requestRemove = (reason: any) => {
    requestConfirm(
      "Delete Movement Reason",
      `Are you sure you want to delete ${reason?.name || "this reason"}?`,
      () => remove(reason.id),
    );
  };

  const requestBulkRemove = () => {
    const ids = normalizeNumericIds(Array.from(selectedReasonIds));
    if (!ids.length) return;
    requestConfirm(
      "Bulk Delete Movement Reasons",
      `Are you sure you want to delete ${ids.length} selected reason(s)?`,
      async () => {
        try {
          setError("");
          setLoadingOverlay(true);
          setLoadingMessage("Bulk Deleting Movement Reasons");
          const response = await apiService.movementReason.bulkDelete(ids);
          ensureApiSuccess(response, "Failed to bulk delete movement reasons");
          await loadReasons();
        } catch (err: any) {
          console.error("Failed to bulk delete movement reasons:", err);
          setError(
            err.errorMessage || err.message || "Failed to bulk delete reasons",
          );
        } finally {
          setLoadingOverlay(false);
        }
      },
    );
  };

  const allReasonsSelected =
    reasons.length > 0 && selectedReasonIds.size === reasons.length;

  const toggleSelectAllReasons = () => {
    if (allReasonsSelected) {
      setSelectedReasonIds(new Set());
      return;
    }
    setSelectedReasonIds(
      new Set(normalizeNumericIds(reasons.map((reason: any) => reason.id))),
    );
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {(loadingOverlay || loading) && (
        <LoadingOverlay message={loadingMessage} />
      )}
      <ConfirmActionModal
        confirmAction={confirmAction}
        onClose={() => setConfirmAction(null)}
      />
      <header>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Movement Reason Registry
        </h2>
        <p className="text-slate-400 text-sm mt-1 font-medium tracking-tight">
          Define movement purposes for asset and logistics flows.
        </p>
      </header>
      <ErrorBanner message={error} />
      <form
        onSubmit={add}
        className="flex gap-4 max-w-md bg-slate-50 p-3 rounded-[2rem] border border-slate-100"
      >
        <input
          required
          placeholder="e.g. Between Campus Move"
          className="flex-1 bg-white px-6 py-4 rounded-[1.5rem] border border-slate-100 text-sm font-bold outline-none"
          value={newReason}
          onChange={(e) => setNewReason(e.target.value)}
        />
        <button
          type="submit"
          className="bg-slate-900 text-white px-8 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-md"
        >
          Add Reason
        </button>
      </form>
      <div className="flex items-center gap-3 pl-8">
        <input
          type="checkbox"
          checked={allReasonsSelected}
          onChange={toggleSelectAllReasons}
          disabled={reasons.length === 0}
          aria-label="Select all movement reasons"
          className="w-4 h-4 accent-indigo-600 disabled:opacity-50"
        />
        <button
          onClick={requestBulkRemove}
          disabled={selectedReasonIds.size === 0}
          className="px-6 py-3 rounded-2xl border border-rose-100 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Delete Selected ({selectedReasonIds.size})
        </button>
      </div>
      <div className="flex flex-wrap gap-5">
        {reasons.map((reason) => (
          <div
            key={reason.id}
            className="flex items-center gap-4 bg-white border border-slate-100 px-8 py-5 rounded-[2rem] group hover:border-indigo-200 transition-all shadow-sm"
          >
            <input
              type="checkbox"
              checked={selectedReasonIds.has(Number(reason.id))}
              onChange={() =>
                setSelectedReasonIds((prev) => {
                  const next = new Set(prev);
                  const id = Number(reason.id);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })
              }
              className="w-4 h-4 accent-indigo-600"
            />
            <span className="font-black text-slate-700 text-xs uppercase tracking-wider">
              {reason.name}
            </span>
            <button
              onClick={() => requestRemove(reason)}
              className="text-slate-300 hover:text-rose-500 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {reasons.length === 0 && (
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] py-12">
            No movement reasons defined.
          </p>
        )}
      </div>
    </div>
  );
};

// ============================================================
// KeyBorrowingReasonManagement - Manage key borrowing reasons
// ============================================================
const KeyBorrowingReasonManagement = () => {
  const [reasons, setReasons] = useState<any[]>([]);
  const [selectedReasonIds, setSelectedReasonIds] = useState<Set<number>>(
    new Set(),
  );
  const [newReason, setNewReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingOverlay, setLoadingOverlay] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(
    "Loading key borrowing reasons",
  );
  const [error, setError] = useState("");
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    loadReasons();
  }, []);

  const loadReasons = async () => {
    try {
      setError("");
      setLoading(true);
      const response = await apiService.keyBorrowingReason.getAll();
      const data = getApiContent(
        response as ApiEnvelope<any[]>,
        [],
        "key borrowing reasons",
      );
      setReasons(data);
      setSelectedReasonIds(new Set());
    } catch (err: any) {
      console.error("Failed to load key borrowing reasons:", err);
      setError(err.message || "Failed to load key borrowing reasons");
    } finally {
      setLoading(false);
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReason.trim()) return;

    try {
      setError(""); // Add this
      setLoadingOverlay(true);
      setLoadingMessage("Adding Key Borrowing Reason");
      const response = await apiService.keyBorrowingReason.create({
        name: newReason.trim(),
        description: "",
      });
      ensureApiSuccess(response, "Failed to add key borrowing reason");
      setNewReason("");
      await loadReasons();
    } catch (err: any) {
      console.error("Failed to add key borrowing reason:", err);
      setError(
        err.errorMessage || err.message || "Failed to add key borrowing reason",
      );
    } finally {
      setLoadingOverlay(false);
    }
  };

  const remove = async (id: number) => {
    try {
      setError("");
      setLoadingOverlay(true);
      setLoadingMessage("Deleting Key Borrowing Reason");
      const response = await apiService.keyBorrowingReason.delete(id);
      ensureApiSuccess(response, "Failed to delete key borrowing reason");
      await loadReasons();
    } catch (err: any) {
      console.error("Failed to delete key borrowing reason:", err);
      setError(err.message || "Failed to delete key borrowing reason");
    } finally {
      setLoadingOverlay(false);
    }
  };

  const requestConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
  ) => {
    setConfirmAction({ title, message, onConfirm });
  };

  const requestRemove = (reason: any) => {
    requestConfirm(
      "Delete Key Borrowing Reason",
      `Are you sure you want to delete ${reason?.name || "this reason"}?`,
      () => remove(reason.id),
    );
  };

  const requestBulkRemove = () => {
    const ids = normalizeNumericIds(Array.from(selectedReasonIds));
    if (!ids.length) return;
    requestConfirm(
      "Bulk Delete Key Borrowing Reasons",
      `Are you sure you want to delete ${ids.length} selected reason(s)?`,
      async () => {
        try {
          setError("");
          setLoadingOverlay(true);
          setLoadingMessage("Bulk Deleting Key Borrowing Reasons");
          const response = await apiService.keyBorrowingReason.bulkDelete(ids);
          ensureApiSuccess(
            response,
            "Failed to bulk delete key borrowing reasons",
          );
          await loadReasons();
        } catch (err: any) {
          console.error("Failed to bulk delete key borrowing reasons:", err);
          setError(
            err.errorMessage ||
              err.message ||
              "Failed to bulk delete key borrowing reasons",
          );
        } finally {
          setLoadingOverlay(false);
        }
      },
    );
  };

  const allReasonsSelected =
    reasons.length > 0 && selectedReasonIds.size === reasons.length;

  const toggleSelectAllReasons = () => {
    if (allReasonsSelected) {
      setSelectedReasonIds(new Set());
      return;
    }
    setSelectedReasonIds(
      new Set(normalizeNumericIds(reasons.map((reason: any) => reason.id))),
    );
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {(loadingOverlay || loading) && (
        <LoadingOverlay message={loadingMessage} />
      )}
      <ConfirmActionModal
        confirmAction={confirmAction}
        onClose={() => setConfirmAction(null)}
      />
      <header>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Key Borrowing Reasons
        </h2>
        <p className="text-slate-400 text-sm mt-1 font-medium tracking-tight">
          Define valid reasons for borrowing access keys from the facility.
        </p>
      </header>
      <ErrorBanner message={error} />
      <form
        onSubmit={add}
        className="flex gap-4 max-w-md bg-slate-50 p-3 rounded-[2rem] border border-slate-100"
      >
        <input
          required
          placeholder="e.g. Temporary Access"
          className="flex-1 bg-white px-6 py-4 rounded-[1.5rem] border border-slate-100 text-sm font-bold outline-none"
          value={newReason}
          onChange={(e) => setNewReason(e.target.value)}
        />
        <button
          type="submit"
          className="bg-slate-900 text-white px-8 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-md"
        >
          Add Reason
        </button>
      </form>
      <div className="flex items-center gap-3 pl-8">
        <input
          type="checkbox"
          checked={allReasonsSelected}
          onChange={toggleSelectAllReasons}
          disabled={reasons.length === 0}
          aria-label="Select all key borrowing reasons"
          className="w-4 h-4 accent-indigo-600 disabled:opacity-50"
        />
        <button
          onClick={requestBulkRemove}
          disabled={selectedReasonIds.size === 0}
          className="px-6 py-3 rounded-2xl border border-rose-100 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Delete Selected ({selectedReasonIds.size})
        </button>
      </div>
      <div className="flex flex-wrap gap-5">
        {reasons.map((reason) => (
          <div
            key={reason.id}
            className="flex items-center gap-4 bg-white border border-slate-100 px-8 py-5 rounded-[2rem] group hover:border-amber-200 transition-all shadow-sm"
          >
            <input
              type="checkbox"
              checked={selectedReasonIds.has(Number(reason.id))}
              onChange={() =>
                setSelectedReasonIds((prev) => {
                  const next = new Set(prev);
                  const id = Number(reason.id);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })
              }
              className="w-4 h-4 accent-indigo-600"
            />
            <span className="font-black text-slate-700 text-xs uppercase tracking-wider">
              {reason.name}
            </span>
            <button
              onClick={() => requestRemove(reason)}
              className="text-slate-300 hover:text-rose-500 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {reasons.length === 0 && (
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] py-12">
            No key borrowing reasons defined.
          </p>
        )}
      </div>
    </div>
  );
};

// ============================================================
// VisitorTypeManagement - Manage visitor types
// ============================================================
const VisitorTypeManagement = () => {
  const [types, setTypes] = useState<any[]>([]);
  const [selectedTypeIds, setSelectedTypeIds] = useState<Set<number>>(
    new Set(),
  );
  const [newType, setNewType] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingOverlay, setLoadingOverlay] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Loading visitor types");
  const [error, setError] = useState("");
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    loadTypes();
  }, []);

  const loadTypes = async () => {
    try {
      setError("");
      setLoading(true);
      const response = await apiService.visitorType.getAll();
      setTypes(
        getApiContent(response as ApiEnvelope<any[]>, [], "visitor types"),
      );
      setSelectedTypeIds(new Set());
    } catch (err: any) {
      console.error("Failed to load visitor types:", err);
      setError(err.message || "Failed to load visitor types");
    } finally {
      setLoading(false);
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newType.trim()) return;

    try {
      setError(""); // Add this
      setLoadingOverlay(true);
      setLoadingMessage("Adding Visitor Type");
      const response = await apiService.visitorType.create({
        name: newType.trim(),
        isActive: true,
      });
      ensureApiSuccess(response, "Failed to add visitor type");
      setNewType("");
      await loadTypes();
    } catch (err: any) {
      console.error("Failed to add visitor type:", err);
      setError(err.errorMessage || err.message || "Failed to add visitor type");
    } finally {
      setLoadingOverlay(false);
    }
  };

  const remove = async (id: number) => {
    try {
      setError("");
      setLoadingOverlay(true);
      setLoadingMessage("Deleting Visitor Type");
      const response = await apiService.visitorType.delete(id);
      ensureApiSuccess(response, "Failed to delete visitor type");
      await loadTypes();
    } catch (err: any) {
      console.error("Failed to delete visitor type:", err);
      setError(err.message || "Failed to delete visitor type");
    } finally {
      setLoadingOverlay(false);
    }
  };

  const requestConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
  ) => {
    setConfirmAction({ title, message, onConfirm });
  };

  const requestRemove = (type: any) => {
    requestConfirm(
      "Delete Visitor Type",
      `Are you sure you want to delete ${type?.name || "this type"}?`,
      () => remove(type.id),
    );
  };

  const requestBulkRemove = () => {
    const ids = normalizeNumericIds(Array.from(selectedTypeIds));
    if (!ids.length) return;
    requestConfirm(
      "Bulk Delete Visitor Types",
      `Are you sure you want to delete ${ids.length} selected type(s)?`,
      async () => {
        try {
          setError("");
          setLoadingOverlay(true);
          setLoadingMessage("Bulk Deleting Visitor Types");
          const response = await apiService.visitorType.bulkDelete(ids);
          ensureApiSuccess(response, "Failed to bulk delete visitor types");
          await loadTypes();
        } catch (err: any) {
          console.error("Failed to bulk delete visitor types:", err);
          setError(
            err.errorMessage ||
              err.message ||
              "Failed to bulk delete visitor types",
          );
        } finally {
          setLoadingOverlay(false);
        }
      },
    );
  };

  const allTypesSelected =
    types.length > 0 && selectedTypeIds.size === types.length;

  const toggleSelectAllTypes = () => {
    if (allTypesSelected) {
      setSelectedTypeIds(new Set());
      return;
    }
    setSelectedTypeIds(
      new Set(normalizeNumericIds(types.map((type: any) => type.id))),
    );
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {(loadingOverlay || loading) && (
        <LoadingOverlay message={loadingMessage} />
      )}
      <ConfirmActionModal
        confirmAction={confirmAction}
        onClose={() => setConfirmAction(null)}
      />
      <header>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Visitor Classifications
        </h2>
        <p className="text-slate-400 text-sm mt-1 font-medium tracking-tight">
          Manage available visitor type profiles for the check-in terminal.
        </p>
      </header>
      <ErrorBanner message={error} />
      <form
        onSubmit={add}
        className="flex gap-4 max-w-md bg-slate-50 p-3 rounded-[2rem] border border-slate-100"
      >
        <input
          required
          placeholder="e.g. Inspector"
          className="flex-1 bg-white px-6 py-4 rounded-[1.5rem] border border-slate-100 text-sm font-bold outline-none"
          value={newType}
          onChange={(e) => setNewType(e.target.value)}
        />
        <button
          type="submit"
          className="bg-slate-900 text-white px-8 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-md"
        >
          Add Profile
        </button>
      </form>
      <div className="flex items-center gap-3 pl-8">
        <input
          type="checkbox"
          checked={allTypesSelected}
          onChange={toggleSelectAllTypes}
          disabled={types.length === 0}
          aria-label="Select all visitor types"
          className="w-4 h-4 accent-indigo-600 disabled:opacity-50"
        />
        <button
          onClick={requestBulkRemove}
          disabled={selectedTypeIds.size === 0}
          className="px-6 py-3 rounded-2xl border border-rose-100 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Delete Selected ({selectedTypeIds.size})
        </button>
      </div>
      <div className="flex flex-wrap gap-5">
        {types.map((type) => (
          <div
            key={type.id}
            className="flex items-center gap-4 bg-white border border-slate-100 px-8 py-5 rounded-[2rem] group hover:border-indigo-200 transition-all shadow-sm"
          >
            <input
              type="checkbox"
              checked={selectedTypeIds.has(Number(type.id))}
              onChange={() =>
                setSelectedTypeIds((prev) => {
                  const next = new Set(prev);
                  const id = Number(type.id);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })
              }
              className="w-4 h-4 accent-indigo-600"
            />
            <span className="font-black text-slate-700 text-xs uppercase tracking-wider">
              {type.name}
            </span>
            <button
              onClick={() => requestRemove(type)}
              className="text-slate-300 hover:text-rose-500 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {types.length === 0 && (
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] py-12">
            No visitor types defined.
          </p>
        )}
      </div>
    </div>
  );
};

// ============================================================
// SecurityManagement - Manage Security Alerts, Watchlist, and Personnel
// ============================================================
const SecurityManagement = ({
  alerts,
  onUpdateAlerts,
}: {
  alerts: SecurityAlert[];
  onUpdateAlerts: (a: SecurityAlert[]) => void;
}) => {
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [officers, setOfficers] = useState<SecurityOfficer[]>([]);
  const [selectedWatchlistIds, setSelectedWatchlistIds] = useState<Set<number>>(
    new Set(),
  );
  const [selectedOfficerIds, setSelectedOfficerIds] = useState<Set<number>>(
    new Set(),
  );
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<SecurityOfficer | null>(
    null,
  );
  const [isOfficerModalOpen, setIsOfficerModalOpen] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<
    "alerts" | "watchlist" | "personnel" | "credentials"
  >("alerts");
  const [loading, setLoading] = useState(true);
  const [loadingOverlay, setLoadingOverlay] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(
    "Loading Security Console",
  );
  const [error, setError] = useState("");
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    loadData({ showOverlay: true, message: "Loading Security Console" });
  }, []);

  const loadData = async (options?: {
    showOverlay?: boolean;
    message?: string;
  }) => {
    const showOverlay = options?.showOverlay ?? false;
    try {
      if (showOverlay) {
        setLoadingOverlay(true);
        setLoadingMessage(options?.message || "Loading Security Console");
      }
      setLoading(true);
      const [watchlistResp, officersResp] = await Promise.all([
        apiService.watchlist.getAll(),
        apiService.securityOfficer.getAll(),
      ]);

      setWatchlist(
        getApiContent(
          watchlistResp as ApiEnvelope<WatchlistEntry[]>,
          [],
          "watchlist",
        ),
      );
      setOfficers(
        getApiContent(
          officersResp as ApiEnvelope<SecurityOfficer[]>,
          [],
          "security officers",
        ),
      );
      setSelectedWatchlistIds(new Set());
      setSelectedOfficerIds(new Set());
    } catch (err: any) {
      console.error("Error loading security data:", err);
      setError(err.message || "Failed to load security data");
    } finally {
      setLoading(false);
      if (showOverlay) {
        setLoadingOverlay(false);
      }
    }
  };

  // WATCHLIST - Separated create and update
  const createWatchlistEntry = async (
    entry: Omit<WatchlistEntry, "id" | "addedAt">,
  ) => {
    try {
      setLoading(true);
      const response = await apiService.watchlist.create(entry);
      ensureApiSuccess(response, "Failed to add watchlist entry");
      await loadData({
        showOverlay: true,
        message: "Creating Watchlist Entry",
      }); // Reload to get fresh data with new ID
    } catch (err: any) {
      console.error("Error creating watchlist entry:", err);
      setError(err.message || "Failed to create watchlist entry");
    } finally {
      setLoading(false);
    }
  };

  const requestConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
  ) => {
    setConfirmAction({ title, message, onConfirm });
  };

  const updateWatchlistEntry = (id: number, data: Partial<WatchlistEntry>) => {
    const entry = watchlist.find((w) => w.id === id);
    requestConfirm(
      "Update Watchlist Entry",
      `Are you sure you want to update ${entry?.name || "this entry"}?`,
      async () => {
        try {
          setLoading(true);
          const response = await apiService.watchlist.update(id, data);
          ensureApiSuccess(response, "Failed to update watchlist entry");
          await loadData({
            showOverlay: true,
            message: "Updating Watchlist Entry",
          });
        } catch (err: any) {
          console.error("Error updating watchlist entry:", err);
          setError(err.message || "Failed to update watchlist entry");
        } finally {
          setLoading(false);
        }
      },
    );
  };

  const removeWatchlistEntry = (id: number) => {
    const entry = watchlist.find((w) => w.id === id);
    requestConfirm(
      "Delete Watchlist Entry",
      `Are you sure you want to delete ${entry?.name || "this entry"}?`,
      async () => {
        try {
          setLoading(true);
          const response = await apiService.watchlist.delete(id);
          ensureApiSuccess(response, "Failed to delete watchlist entry");
          await loadData({
            showOverlay: true,
            message: "Deleting Watchlist Entry",
          });
        } catch (err: any) {
          console.error("Error removing watchlist entry:", err);
          setError(err.message || "Failed to delete watchlist entry");
        } finally {
          setLoading(false);
        }
      },
    );
  };

  const removeSelectedWatchlistEntries = () => {
    const ids = normalizeNumericIds(Array.from(selectedWatchlistIds));
    if (!ids.length) return;
    requestConfirm(
      "Bulk Delete Watchlist Entries",
      `Are you sure you want to delete ${ids.length} selected watchlist entr${ids.length === 1 ? "y" : "ies"}?`,
      async () => {
        try {
          setLoading(true);
          const response = await apiService.watchlist.bulkDelete(ids);
          ensureApiSuccess(response, "Failed to bulk delete watchlist entries");
          await loadData({
            showOverlay: true,
            message: "Bulk Deleting Watchlist Entries",
          });
        } catch (err: any) {
          console.error("Error bulk removing watchlist entries:", err);
          setError(err.message || "Failed to bulk delete watchlist entries");
        } finally {
          setLoading(false);
        }
      },
    );
  };

  // SECURITY OFFICERS - Separated create and update
  const createOfficer = async (
    officer: Omit<SecurityOfficer, "id" | "addedAt">,
  ) => {
    try {
      setLoading(true);
      const response = await apiService.securityOfficer.create(officer);
      ensureApiSuccess(response, "Failed to create officer");
      await loadData({
        showOverlay: true,
        message: "Creating Security Officer",
      }); // Reload to get fresh data with new ID
    } catch (err: any) {
      console.error("Error creating officer:", err);
      setError(err.message || "Failed to create officer");
    } finally {
      setLoading(false);
    }
  };

  const performUpdateOfficer = async (
    id: number,
    data: Partial<SecurityOfficer>,
    overlayMessage: string,
  ) => {
    try {
      setLoading(true);
      const response = await apiService.securityOfficer.update(id, data);
      ensureApiSuccess(response, "Failed to update officer");
      await loadData({ showOverlay: true, message: overlayMessage });
    } catch (err: any) {
      console.error("Error updating officer:", err);
      setError(err.message || "Failed to update officer");
    } finally {
      setLoading(false);
    }
  };

  const updateOfficer = (
    id: number,
    data: Partial<SecurityOfficer>,
    confirmMessage: string,
    overlayMessage = "Updating Security Officer",
  ) => {
    requestConfirm("Update Security Officer", confirmMessage, async () => {
      await performUpdateOfficer(id, data, overlayMessage);
    });
  };

  const removeOfficer = (id: number) => {
    const officer = officers.find((o) => o.id === id);
    requestConfirm(
      "Delete Security Officer",
      `Are you sure you want to delete ${officer?.fullName || "this officer"}?`,
      async () => {
        try {
          setLoading(true);
          const response = await apiService.securityOfficer.delete(id);
          ensureApiSuccess(response, "Failed to delete officer");
          await loadData({
            showOverlay: true,
            message: "Deleting Security Officer",
          });
        } catch (err: any) {
          console.error("Error removing officer:", err);
          setError(err.message || "Failed to delete officer");
        } finally {
          setLoading(false);
        }
      },
    );
  };

  const removeSelectedOfficers = () => {
    const ids = normalizeNumericIds(Array.from(selectedOfficerIds));
    if (!ids.length) return;
    requestConfirm(
      "Bulk Delete Security Officers",
      `Are you sure you want to delete ${ids.length} selected officer(s)?`,
      async () => {
        try {
          setLoading(true);
          const response = await apiService.securityOfficer.bulkDelete(ids);
          ensureApiSuccess(response, "Failed to bulk delete officers");
          await loadData({
            showOverlay: true,
            message: "Bulk Deleting Security Officers",
          });
        } catch (err: any) {
          console.error("Error bulk removing officers:", err);
          setError(err.message || "Failed to bulk delete officers");
        } finally {
          setLoading(false);
        }
      },
    );
  };

  const allWatchlistSelected =
    watchlist.length > 0 && selectedWatchlistIds.size === watchlist.length;
  const allOfficersSelected =
    officers.length > 0 && selectedOfficerIds.size === officers.length;

  const toggleSelectAllWatchlist = () => {
    if (allWatchlistSelected) {
      setSelectedWatchlistIds(new Set());
      return;
    }
    setSelectedWatchlistIds(
      new Set(normalizeNumericIds(watchlist.map((entry) => entry.id))),
    );
  };

  const toggleSelectAllOfficers = () => {
    if (allOfficersSelected) {
      setSelectedOfficerIds(new Set());
      return;
    }
    setSelectedOfficerIds(
      new Set(normalizeNumericIds(officers.map((officer) => officer.id))),
    );
  };

  const toggleOfficerStatus = (id: number) => {
    const officer = officers.find((o) => o.id === id);
    if (!officer) return;

    const newStatus = officer.status === "Active" ? "Inactive" : "Active";
    updateOfficer(
      id,
      { status: newStatus },
      `Are you sure you want to set ${officer.fullName || "this officer"} to ${newStatus}?`,
      "Updating Officer Status",
    );
  };

  const clearAlert = (id: number) => {
    const alert = alerts.find((a) => a.id === id);
    requestConfirm(
      "Clear Security Alert",
      `Are you sure you want to clear the alert for ${alert?.visitorName || "this visitor"}?`,
      async () => {
        const updated = alerts.map((a) =>
          a.id === id ? { ...a, status: "Cleared" as const } : a,
        );
        onUpdateAlerts(updated);
        try {
          setLoading(true);
          const response = await apiService.securityAlert.update(id, {
            status: "Cleared",
          });
          ensureApiSuccess(response, "Failed to clear alert");
        } catch (err: any) {
          console.error("Error clearing alert:", err);
          setError(err.message || "Failed to clear alert");
        } finally {
          setLoading(false);
        }
      },
    );
  };

  const handleEditOfficer = (officer: SecurityOfficer) => {
    setEditingOfficer(officer);
    setIsOfficerModalOpen(true);
  };
  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {loadingOverlay && <LoadingOverlay message={loadingMessage} />}
      <ConfirmActionModal
        confirmAction={confirmAction}
        onClose={() => setConfirmAction(null)}
      />
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Security Command
          </h2>
          <p className="text-slate-400 text-sm mt-1 font-medium tracking-tight">
            Silent detection, restricted access, and console credentials.
          </p>
        </div>
        <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
          <button
            onClick={() => setActiveSubTab("alerts")}
            disabled={loading}
            className={`px-6 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all disabled:opacity-60 disabled:cursor-not-allowed ${activeSubTab === "alerts" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
          >
            Active Alerts
          </button>
          <button
            onClick={() => setActiveSubTab("watchlist")}
            disabled={loading}
            className={`px-6 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all disabled:opacity-60 disabled:cursor-not-allowed ${activeSubTab === "watchlist" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
          >
            Watchlist
          </button>
          <button
            onClick={() => setActiveSubTab("personnel")}
            disabled={loading}
            className={`px-6 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all disabled:opacity-60 disabled:cursor-not-allowed ${activeSubTab === "personnel" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
          >
            Personnel
          </button>
          <button
            onClick={() => setActiveSubTab("credentials")}
            disabled={loading}
            className={`px-6 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all disabled:opacity-60 disabled:cursor-not-allowed ${activeSubTab === "credentials" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
          >
            Admin Access
          </button>
        </div>
      </header>

      {activeSubTab === "alerts" ? (
        <div className="space-y-6">
          {alerts.filter((a) => a.status === "Unread").length > 0 ? (
            alerts
              .filter((a) => a.status === "Unread")
              .map((alert) => (
                <div
                  key={alert.id}
                  className="p-8 border-l-4 border-rose-500 bg-rose-50/30 rounded-r-[2.5rem] flex justify-between items-center animate-in slide-in-from-left-4 duration-500"
                >
                  <div className="flex gap-8 items-center">
                    <div className="w-16 h-16 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200">
                      <ShieldAlert size={32} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h4 className="text-xl font-black text-slate-900 tracking-tight">
                          {alert.visitorName}
                        </h4>
                        <span className="px-3 py-1 bg-rose-100 text-rose-600 text-[8px] font-black uppercase rounded-full">
                          RISK: {alert.riskLevel}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                        Reason: {alert.watchlistReason} • Detected at{" "}
                        {alert.location}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                        <Clock size={10} />{" "}
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => clearAlert(alert.id)}
                    disabled={loading}
                    className="px-8 py-3 bg-white text-slate-400 hover:text-indigo-600 hover:border-indigo-200 border border-slate-100 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Mark Cleared
                  </button>
                </div>
              ))
          ) : (
            <div className="py-24 text-center bg-slate-50/50 border-2 border-dashed border-slate-100 rounded-[3rem]">
              <ShieldCheck size={48} className="mx-auto text-slate-200 mb-6" />
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">
                No active security alerts
              </p>
            </div>
          )}
        </div>
      ) : activeSubTab === "watchlist" ? (
        <div className="space-y-10">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium text-slate-400">
              Individuals listed here will trigger silent alerts upon check-in
              attempt.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={removeSelectedWatchlistEntries}
                disabled={loading || selectedWatchlistIds.size === 0}
                className="flex items-center gap-3 bg-rose-50 text-rose-600 border border-rose-100 font-black px-6 py-4 rounded-2xl text-[10px] uppercase tracking-[0.2em] hover:bg-rose-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Trash2 size={16} /> Delete Selected (
                {selectedWatchlistIds.size})
              </button>
              <button
                onClick={() => setIsAddModalOpen(true)}
                disabled={loading}
                className="flex items-center gap-3 bg-slate-900 text-white font-black px-8 py-4 rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-lg hover:bg-black transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Plus size={16} /> Add Flagged Profile
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex justify-end pr-8">
              <input
                type="checkbox"
                checked={allWatchlistSelected}
                onChange={toggleSelectAllWatchlist}
                disabled={loading || watchlist.length === 0}
                aria-label="Select all watchlist entries"
                className="w-4 h-4 accent-indigo-600 disabled:opacity-50"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {watchlist.map((entry) => (
              <div
                key={entry.id}
                className="p-8 bg-white border border-slate-100 rounded-[2.5rem] flex flex-col gap-6 shadow-sm group hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 font-black border border-slate-100">
                      {entry.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-black text-slate-900 tracking-tight">
                        {entry.name}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {entry.phone}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${entry.riskLevel === "High" ? "bg-rose-50 text-rose-600 border-rose-100" : entry.riskLevel === "Medium" ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-slate-100 text-slate-500 border-slate-200"}`}
                    >
                      {entry.riskLevel} Risk
                    </span>
                    <input
                      type="checkbox"
                      checked={selectedWatchlistIds.has(Number(entry.id))}
                      onChange={() =>
                        setSelectedWatchlistIds((prev) => {
                          const next = new Set(prev);
                          const id = Number(entry.id);
                          if (next.has(id)) next.delete(id);
                          else next.add(id);
                          return next;
                        })
                      }
                      className="w-4 h-4 accent-indigo-600"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Detection Logic
                  </p>
                  <p className="p-4 bg-slate-50 rounded-xl text-xs font-bold text-slate-700 italic">
                    "{entry.reason}"
                  </p>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                  <span className="text-[8px] font-bold text-slate-300 uppercase">
                    Registered {new Date(entry.addedAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => removeWatchlistEntry(entry.id)}
                    disabled={loading}
                    className="text-slate-300 hover:text-rose-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {watchlist.length === 0 && (
              <div className="md:col-span-2 py-24 text-center text-slate-300 font-black uppercase tracking-[0.3em] text-[10px]">
                Watchlist is empty.
              </div>
            )}
          </div>
        </div>
      ) : activeSubTab === "personnel" ? (
        <div className="space-y-10">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Security Officers
              </h3>
              <p className="text-sm font-medium text-slate-400">
                Authorized personnel for witness duty and desk management.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={removeSelectedOfficers}
                disabled={loading || selectedOfficerIds.size === 0}
                className="flex items-center gap-3 bg-rose-50 text-rose-600 border border-rose-100 font-black px-6 py-4 rounded-2xl text-[10px] uppercase tracking-[0.2em] hover:bg-rose-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Trash2 size={16} /> Delete Selected ({selectedOfficerIds.size})
              </button>
              <button
                onClick={() => {
                  setEditingOfficer(null);
                  setIsOfficerModalOpen(true);
                }}
                disabled={loading}
                className="flex items-center gap-3 bg-indigo-600 text-white font-black px-8 py-4 rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Plus size={16} /> Register Officer
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="flex justify-end pr-8">
              <input
                type="checkbox"
                checked={allOfficersSelected}
                onChange={toggleSelectAllOfficers}
                disabled={loading || officers.length === 0}
                aria-label="Select all officers"
                className="w-4 h-4 accent-indigo-600 disabled:opacity-50"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {officers.map((officer) => (
              <div
                key={officer.id}
                className="p-8 bg-white border border-slate-100 rounded-[2.5rem] flex flex-col gap-6 shadow-sm group hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-black border border-slate-800 overflow-hidden">
                      {officer.photo ? (
                        <img
                          src={officer.photo}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <BadgeCheck size={20} />
                      )}
                    </div>
                    <div>
                      <p className="font-black text-slate-900 tracking-tight">
                        {officer.fullName}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {officer.company || "Security Dept"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleOfficerStatus(officer.id)}
                      disabled={loading}
                      className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border transition-all disabled:opacity-60 disabled:cursor-not-allowed ${officer.status === "Active" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-100 text-slate-500 border-slate-200"}`}
                    >
                      {officer.status}
                    </button>
                    <input
                      type="checkbox"
                      checked={selectedOfficerIds.has(Number(officer.id))}
                      onChange={() =>
                        setSelectedOfficerIds((prev) => {
                          const next = new Set(prev);
                          const id = Number(officer.id);
                          if (next.has(id)) next.delete(id);
                          else next.add(id);
                          return next;
                        })
                      }
                      className="w-4 h-4 accent-indigo-600"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-slate-500 text-xs font-bold">
                    <Hash size={14} className="text-slate-300" /> ID:{" "}
                    {officer.badgeId}
                  </div>
                  <div className="flex items-center gap-3 text-slate-500 text-xs font-bold">
                    <Smartphone size={14} className="text-slate-300" />{" "}
                    {officer.phone}
                  </div>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleEditOfficer(officer)}
                      disabled={loading}
                      className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Edit2 size={12} /> Edit Detail
                    </button>
                    <span className="text-[8px] font-bold text-slate-300 uppercase">
                      PIN Active
                    </span>
                  </div>
                  <button
                    onClick={() => removeOfficer(officer.id)}
                    disabled={loading}
                    className="text-slate-300 hover:text-rose-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {officers.length === 0 && (
              <div className="md:col-span-3 py-24 text-center text-slate-300 font-black uppercase tracking-[0.3em] text-[10px]">
                No security officers registered.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in duration-500">
          <AdminPasswordChange />
        </div>
      )}

      {isAddModalOpen && (
        <WatchlistModal
          onClose={() => setIsAddModalOpen(false)}
          onSave={(entry: any) => {
            createWatchlistEntry(entry);
            setIsAddModalOpen(false);
          }}
        />
      )}
      {isOfficerModalOpen && (
        <OfficerModal
          officer={editingOfficer}
          onClose={() => setIsOfficerModalOpen(false)}
          onSave={(off: any) => {
            if (editingOfficer) {
              updateOfficer(
                editingOfficer.id,
                off,
                `Are you sure you want to update ${off.fullName || "this officer"}?`,
                "Updating Security Officer",
              );
            } else {
              createOfficer(off);
            }
            setIsOfficerModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

const OfficerModal = ({ officer, onClose, onSave }: any) => {
  const [formData, setFormData] = useState({
    fullName: officer?.fullName || "",
    badgeId: officer?.badgeId || "",
    phone: officer?.phone || "",
    email: officer?.email || "",
    company: officer?.company || "",
    pin: officer?.pin || "",
    status: officer?.status || "Active",
  });
  const [capturedImage, setCapturedImage] = useState<string | null>(
    officer?.photo || null,
  );
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      console.error("Camera access failed:", err);
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
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

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl p-12 rounded-[3.5rem] shadow-2xl animate-in zoom-in-95 duration-500 border border-slate-100 my-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">
              {officer ? "Edit Officer" : "Register Officer"}
            </h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
              Personnel Registration
            </p>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-50 hover:text-rose-500 transition-all"
          >
            <X size={20} />
          </button>
        </header>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave({ ...formData, photo: capturedImage });
          }}
          className="space-y-10"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="md:col-span-1 space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
                Identity Capture
              </label>
              <div className="aspect-square bg-slate-100 rounded-[2rem] overflow-hidden border-4 border-slate-50 relative group">
                {isCameraActive ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : capturedImage ? (
                  <img
                    src={capturedImage}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                    <User size={48} className="opacity-20" />
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div className="flex gap-2">
                {!isCameraActive ? (
                  <button
                    type="button"
                    onClick={startCamera}
                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                  >
                    <Camera size={14} />{" "}
                    {capturedImage ? "Retake" : "Open Camera"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={takePhoto}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={14} /> Capture
                  </button>
                )}
              </div>
            </div>
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8 h-fit">
              <SettingInput
                label="Officer Full Name"
                icon={User}
                value={formData.fullName}
                onChange={(v: string) =>
                  setFormData({ ...formData, fullName: v })
                }
              />
              <SettingInput
                label="Badge / Employee ID"
                icon={Hash}
                value={formData.badgeId}
                onChange={(v: string) =>
                  setFormData({ ...formData, badgeId: v })
                }
              />
              <SettingInput
                label="Organization / Company"
                icon={Building2}
                value={formData.company}
                onChange={(v: string) =>
                  setFormData({ ...formData, company: v })
                }
              />
              <SettingInput
                label="Kiosk Access PIN"
                icon={Lock}
                type="password"
                value={formData.pin}
                onChange={(v: string) => setFormData({ ...formData, pin: v })}
                placeholder="Numeric Code"
              />
              <SettingInput
                label="Contact Phone"
                icon={Smartphone}
                type="tel"
                value={formData.phone}
                onChange={(v: string) => setFormData({ ...formData, phone: v })}
              />
              <SettingInput
                label="Work Email"
                icon={Mail}
                type="email"
                value={formData.email}
                onChange={(v: string) => setFormData({ ...formData, email: v })}
              />
            </div>
          </div>
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-2">
              Initial Protocol State
            </label>
            <div className="flex gap-4">
              {["Active", "Inactive"].map((s: any) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFormData({ ...formData, status: s })}
                  className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all ${formData.status === s ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100" : "bg-white text-slate-400 border-slate-100 hover:border-slate-300"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="pt-6 border-t border-slate-50">
            <button
              type="submit"
              className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3"
            >
              {officer ? <Save size={18} /> : <BadgeCheck size={18} />}
              {officer
                ? "Update Personnel Record"
                : "Synchronize New Personnel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AdminPasswordChange = () => {
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const savedPass = localStorage.getItem("adminPassword") || "admin123";
    if (current !== savedPass) {
      setError("Current verification key is incorrect.");
      return;
    }
    if (newPass.length < 4) {
      setError("New identification key must be at least 4 characters long.");
      return;
    }
    if (newPass !== confirm) {
      setError("New identification key confirmation does not match.");
      return;
    }
    localStorage.setItem("adminPassword", newPass);
    setSuccess("Console credential protocol synchronized successfully.");
    setCurrent("");
    setNewPass("");
    setConfirm("");
  };
  return (
    <div className="max-w-xl space-y-8 p-10 bg-slate-50/50 border border-slate-100 rounded-[3rem]">
      <div className="space-y-2">
        <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">
          Credential Sync
        </h3>
        <p className="text-xs font-medium text-slate-400">
          Modify the primary terminal handshake key.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <SettingInput
          label="Current verification key"
          icon={Lock}
          type="password"
          value={current}
          onChange={setCurrent}
        />
        <div className="h-[1px] bg-slate-100 w-full" />
        <SettingInput
          label="New identification key"
          icon={Zap}
          type="password"
          value={newPass}
          onChange={setNewPass}
        />
        <SettingInput
          label="Confirm identification key"
          icon={ShieldCheck}
          type="password"
          value={confirm}
          onChange={setConfirm}
        />
        <ErrorBanner
          message={error}
          className="animate-in slide-in-from-top-2"
        />
        {success && (
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center gap-3 border border-emerald-100 animate-in slide-in-from-top-2">
            <CheckCircle size={16} />
            <p className="text-[10px] font-black uppercase tracking-widest">
              {success}
            </p>
          </div>
        )}
        <button
          type="submit"
          className="w-full py-5 bg-black text-white font-black rounded-2xl text-[10px] uppercase tracking-[0.3em] shadow-xl hover:bg-zinc-900 transition-all flex items-center justify-center gap-3"
        >
          Update Security Identity
        </button>
      </form>
    </div>
  );
};

const WatchlistModal = ({ onClose, onSave }: any) => {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    reason: "",
    riskLevel: "Medium" as const,
  });
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl p-12 rounded-[3.5rem] shadow-2xl animate-in zoom-in-95 duration-500 border border-slate-100">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">
              Flag Protocol
            </h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
              Silent Detection Profile
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-50 hover:text-rose-500 transition-all"
          >
            <X size={20} />
          </button>
        </header>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(formData);
          }}
          className="space-y-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <SettingInput
              label="Target Full Name"
              icon={User}
              value={formData.name}
              onChange={(v: string) => setFormData({ ...formData, name: v })}
            />
            <SettingInput
              label="Target Phone Number"
              icon={Smartphone}
              value={formData.phone}
              onChange={(v: string) => setFormData({ ...formData, phone: v })}
            />
          </div>
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-2">
              Reason for Restriction
            </label>
            <textarea
              required
              className="w-full h-32 p-6 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none focus:border-indigo-500 font-bold text-sm text-slate-700 resize-none"
              value={formData.reason}
              onChange={(e) =>
                setFormData({ ...formData, reason: e.target.value })
              }
              placeholder="e.g. Previous security breach..."
            />
          </div>
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-2">
              Risk Classification
            </label>
            <div className="flex gap-4">
              {["Low", "Medium", "High"].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, riskLevel: level as any })
                  }
                  className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all ${formData.riskLevel === level ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-white text-slate-400 border-slate-100 hover:border-slate-300"}`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
          <div className="pt-6">
            <button
              type="submit"
              className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3"
            >
              <ShieldAlert size={18} /> Activate Silent Monitoring
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SystemConfig = ({ settings, onUpdate }: any) => {
  const [formData, setFormData] = useState(settings.kiosk);
  const [saved, setSaved] = useState(false);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newSettings = { ...settings, kiosk: formData };
    onUpdate(newSettings);
    localStorage.setItem("systemSettings", JSON.stringify(newSettings));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };
  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-10 max-w-2xl animate-in fade-in duration-500"
    >
      <header>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Terminal Hub Identity
        </h2>
        <p className="text-slate-400 text-sm mt-1 font-medium tracking-tight">
          Define corporate branding and email identifiers for public kiosks.
        </p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <SettingInput
          label="Company Authority"
          icon={Building2}
          value={formData.companyName}
          onChange={(v: string) => setFormData({ ...formData, companyName: v })}
        />
        <SettingInput
          label="Deployment Name"
          icon={Monitor}
          value={formData.locationName}
          onChange={(v: string) =>
            setFormData({ ...formData, locationName: v })
          }
        />
        <SettingInput
          label="Inbound Support Gateway"
          icon={Mail}
          type="email"
          value={formData.supportEmail}
          onChange={(v: string) =>
            setFormData({ ...formData, supportEmail: v })
          }
        />
        <SettingInput
          label="Outbound Sender Identity"
          icon={SendHorizontal}
          type="email"
          value={formData.senderEmail}
          onChange={(v: string) => setFormData({ ...formData, senderEmail: v })}
        />
        <SettingInput
          label="Asset Logo (URL)"
          icon={ImageIcon}
          placeholder="https://..."
          value={formData.logoUrl || ""}
          onChange={(v: string) => setFormData({ ...formData, logoUrl: v })}
        />
      </div>
      <div className="pt-10">
        <button
          type="submit"
          className="bg-slate-900 text-white font-black px-12 py-5 rounded-2xl flex items-center gap-4 text-[11px] uppercase tracking-[0.2em] shadow-2xl hover:bg-black transition-all"
        >
          {saved ? (
            <>
              <CheckCircle size={20} /> Persistence Confirmed
            </>
          ) : (
            <>
              <Save size={20} /> Synchronize Hub
            </>
          )}
        </button>
      </div>
    </form>
  );
};

/* --- SHARED HELPER FOR CSV PARSING --- */
const parseCSVLine = (text: string) => {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === "," && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ""));
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ""));
  return result;
};

// ============================================================
// HostMangement - Manage Hosts / Employees
// ============================================================
const HostManagement = () => {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [selectedHostIds, setSelectedHostIds] = useState<Set<number>>(
    new Set(),
  );
  const [progress, setProgress] = useState<number | null>(null);
  const [editingHost, setEditingHost] = useState<Host | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingOverlay, setLoadingOverlay] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Loading Host Registry");
  const [error, setError] = useState("");
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // CSV Staging Area
  const [stagingHeaders, setStagingHeaders] = useState<string[]>([]);
  const [stagingRows, setStagingRows] = useState<string[][]>([]);
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);

  useEffect(() => {
    loadHosts({ showOverlay: true, message: "Loading Host Registry" });
  }, []);

  const loadHosts = async (options?: {
    showOverlay?: boolean;
    message?: string;
  }) => {
    const showOverlay = options?.showOverlay ?? false;
    try {
      if (showOverlay) {
        setLoadingOverlay(true);
        setLoadingMessage(options?.message || "Loading Host Registry");
      }
      setLoading(true);
      const response = await apiService.host.getAll();
      setHosts(getApiContent(response as ApiEnvelope<any[]>, [], "hosts"));
      setSelectedHostIds(new Set());
    } catch (err: any) {
      console.error("Error loading hosts:", err);
      setError(err.message || "Failed to load hosts");
    } finally {
      setLoading(false);
      if (showOverlay) {
        setLoadingOverlay(false);
      }
    }
  };

  const requestConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
  ) => {
    setConfirmAction({ title, message, onConfirm });
  };

  // CREATE - No ID passed
  const createHost = async (hostData: Omit<Host, "id" | "status">) => {
    try {
      setLoading(true);
      const response = await apiService.host.create(hostData);
      ensureApiSuccess(response, "Failed to create host");
      await loadHosts({ showOverlay: true, message: "Creating Host" }); // Reload to get fresh data
    } catch (err: any) {
      console.error("Error creating host:", err);
      setError(err.message || "Failed to create host");
    } finally {
      setLoading(false);
    }
  };

  const importHosts = async (hostData: Array<Omit<Host, "id">>) => {
    try {
      setLoading(true);
      const response = await apiService.host.import(hostData);
      ensureApiSuccess(response, "Failed to import hosts");
      await loadHosts({ showOverlay: true, message: "Importing Hosts" });
    } catch (err: any) {
      console.error("Error importing hosts:", err);
      setError(err.message || "Failed to import hosts");
    } finally {
      setLoading(false);
    }
  };

  const performUpdateHost = async (
    id: number,
    data: Partial<Host>,
    overlayMessage: string,
  ) => {
    try {
      setLoading(true);
      const response = await apiService.host.update(id, data);
      ensureApiSuccess(response, "Failed to update host");
      await loadHosts({ showOverlay: true, message: overlayMessage });
    } catch (err: any) {
      console.error("Error updating host:", err);
      setError(err.message || "Failed to update host");
    } finally {
      setLoading(false);
    }
  };

  // UPDATE - ID required
  const updateHost = (
    id: number,
    data: Partial<Host>,
    confirmMessage: string,
    overlayMessage: string,
  ) => {
    requestConfirm("Update Host Profile", confirmMessage, async () => {
      await performUpdateHost(id, data, overlayMessage);
    });
  };

  const hostFields = [
    {
      key: "fullName",
      label: "Full Name",
      required: true,
      variants: ["name", "full", "staff", "employee"],
    },
    {
      key: "department",
      label: "Department",
      required: true,
      variants: ["dept", "department", "team", "unit"],
    },
    {
      key: "email",
      label: "Email Address",
      required: true,
      variants: ["email", "mail", "contact"],
    },
    {
      key: "phone",
      label: "Phone Number",
      required: false,
      variants: ["phone", "mobile", "tel", "cell"],
    },
    {
      key: "status",
      label: "Employment Status",
      required: false,
      variants: ["status", "active", "state"],
    },
  ];

  const handleSyncWorkspace = async () => {
    const sData = localStorage.getItem("systemSettings");
    let settings: SystemSettings = DEFAULT_SETTINGS;
    if (sData) {
      const parsed = JSON.parse(sData);
      settings = {
        ...DEFAULT_SETTINGS,
        ...parsed,
        workspace: {
          ...DEFAULT_SETTINGS.workspace,
          ...(parsed.workspace || {}),
        },
      };
    }
    const authorized = localStorage.getItem("googleAuthorized") === "true";
    if (!settings.workspace.enabled || !authorized) {
      alert(
        "Please ensure Google Workspace is enabled and authorized in Settings first.",
      );
      return;
    }
    setIsSyncing(true);
    setLoadingOverlay(true);
    setLoadingMessage("Syncing with Google Workspace");
    try {
      const result = await workspaceService.fetchDirectory(
        settings.workspace.domain,
        Boolean(settings.workspace.useCustomerDirectory),
      );
      await loadHosts({ showOverlay: true, message: "Refreshing Host Registry" });
      if (result.summary) {
        alert(
          `Workspace sync complete.\nFetched: ${result.summary.totalFetched}\nSynced: ${result.summary.totalSynced}\nCreated: ${result.summary.createdCount}\nUpdated: ${result.summary.updatedCount}`,
        );
      }
    } catch (e) {
      alert("Failed to sync with Workspace.");
    } finally {
      setIsSyncing(false);
      setLoadingOverlay(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const lines = content
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length < 2) return;

      const headers = parseCSVLine(lines[0]);
      const rows = lines.slice(1).map((line) => parseCSVLine(line));

      setStagingHeaders(headers);
      setStagingRows(rows);
      setIsMappingModalOpen(true);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const finalizeImport = async (mapping: Record<string, number>) => {
    setIsMappingModalOpen(false);
    setProgress(10);

    const imported: Array<Omit<Host, "id">> = [];
    const getVal = (row: string[], index: number) =>
      index !== -1 && row[index] ? row[index].trim() : "";

    for (let i = 0; i < stagingRows.length; i++) {
      const row = stagingRows[i];
      imported.push({
        fullName: getVal(row, mapping.fullName) || "Unknown Staff",
        department: getVal(row, mapping.department) || "General",
        email: getVal(row, mapping.email),
        phone: getVal(row, mapping.phone),
        status:
          (getVal(row, mapping.status) as "Active" | "Inactive") || "Active",
      });

      if (i % 10 === 0 || i === stagingRows.length - 1) {
        setProgress(Math.floor(10 + (i / stagingRows.length) * 85));
        await new Promise((r) => setTimeout(r, 10));
      }
    }

    setProgress(100);
    setTimeout(() => {
      importHosts(imported);
      setProgress(null);
      setStagingHeaders([]);
      setStagingRows([]);
    }, 600);
  };

  const openAddModal = () => {
    setEditingHost(null);
    setIsModalOpen(true);
  };
  const openEditModal = (host: Host) => {
    setEditingHost(host);
    setIsModalOpen(true);
  };
  const handleSaveHost = (formData: Omit<Host, "id">) => {
    if (editingHost) {
      // Update existing
      updateHost(
        editingHost.id,
        formData,
        `Are you sure you want to update ${editingHost.fullName}?`,
        "Updating Host",
      );
    } else {
      // Create new - no id passed
      createHost(formData);
    }
    setIsModalOpen(false);
  };

  const toggleStatus = (id: number) => {
    const host = hosts.find((h) => h.id === id);
    if (!host) return;

    const newStatus = host.status === "Active" ? "Inactive" : "Active";
    updateHost(
      id,
      { status: newStatus },
      `Are you sure you want to set ${host.fullName} as ${newStatus}?`,
      "Updating Host Status",
    );
  };

  const requestHostDelete = (host: Host) => {
    requestConfirm(
      "Delete Host Profile",
      `Are you sure you want to delete ${host.fullName}?`,
      async () => {
        try {
          setLoading(true);
          setLoadingOverlay(true);
          setLoadingMessage("Deleting Host");
          const response = await apiService.host.delete(host.id);
          ensureApiSuccess(response, "Failed to delete host");
          await loadHosts();
        } catch (err: any) {
          console.error("Error deleting host:", err);
          setError(err.message || "Failed to delete host");
        } finally {
          setLoading(false);
          setLoadingOverlay(false);
        }
      },
    );
  };

  const requestBulkHostDelete = () => {
    const ids = normalizeNumericIds(Array.from(selectedHostIds));
    if (!ids.length) return;
    requestConfirm(
      "Bulk Delete Host Profiles",
      `Are you sure you want to delete ${ids.length} selected host profile(s)?`,
      async () => {
        try {
          setLoading(true);
          setLoadingOverlay(true);
          setLoadingMessage("Bulk Deleting Hosts");
          const response = await apiService.host.bulkDelete(ids);
          ensureApiSuccess(response, "Failed to bulk delete hosts");
          await loadHosts();
        } catch (err: any) {
          console.error("Error bulk deleting hosts:", err);
          setError(err.message || "Failed to bulk delete hosts");
        } finally {
          setLoading(false);
          setLoadingOverlay(false);
        }
      },
    );
  };

  const allHostsSelected =
    hosts.length > 0 && selectedHostIds.size === hosts.length;

  const toggleSelectAllHosts = () => {
    if (allHostsSelected) {
      setSelectedHostIds(new Set());
      return;
    }
    setSelectedHostIds(
      new Set(normalizeNumericIds(hosts.map((host) => host.id))),
    );
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {loadingOverlay && <LoadingOverlay message={loadingMessage} />}
      {progress !== null && (
        <BulkProgress
          progress={progress}
          label="Importing Personnel Directory"
        />
      )}
      <ConfirmActionModal
        confirmAction={confirmAction}
        onClose={() => setConfirmAction(null)}
      />
      {isModalOpen && (
        <HostFormModal
          host={editingHost}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveHost}
        />
      )}
      {isMappingModalOpen && (
        <CSVMappingModal
          headers={stagingHeaders}
          rows={stagingRows}
          fields={hostFields}
          onCancel={() => setIsMappingModalOpen(false)}
          onConfirm={finalizeImport}
        />
      )}

      <header className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Staff Authority
          </h2>
          <p className="text-slate-400 text-sm mt-1 font-medium tracking-tight">
            Manage the active notification directory.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={requestBulkHostDelete}
            disabled={loading || selectedHostIds.size === 0}
            className="flex items-center gap-3 bg-rose-50 border border-rose-100 text-rose-600 font-black px-6 py-4 rounded-2xl text-[10px] uppercase tracking-[0.2em] hover:bg-rose-100 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 size={16} /> Delete Selected ({selectedHostIds.size})
          </button>
          <button
            onClick={handleSyncWorkspace}
            disabled={isSyncing || loading}
            className="flex items-center gap-3 bg-white border border-slate-200 text-indigo-600 font-black px-6 py-4 rounded-2xl text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-50 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSyncing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Globe size={16} />
            )}
            Sync Workspace
          </button>
          <label
            className={`flex items-center gap-3 bg-white border border-slate-200 text-zinc-600 font-black px-6 py-4 rounded-2xl text-[10px] uppercase tracking-[0.2em] hover:bg-slate-50 transition-all shadow-sm ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <FileUp size={16} /> Bulk Upload
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileSelect}
              disabled={loading}
            />
          </label>
          <button
            onClick={openAddModal}
            disabled={loading}
            className="flex items-center gap-3 bg-indigo-600 text-white font-black px-8 py-4 rounded-2xl text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Plus size={16} /> Add Personnel
          </button>
        </div>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div className="flex justify-end pr-8">
          <input
            type="checkbox"
            checked={allHostsSelected}
            onChange={toggleSelectAllHosts}
            disabled={loading || hosts.length === 0}
            aria-label="Select all hosts"
            className="w-4 h-4 accent-indigo-600 disabled:opacity-50"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {hosts.map((host) => (
          <div
            key={host.id}
            className="p-8 border border-slate-100 rounded-[2.5rem] bg-white flex flex-col gap-6 group shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 font-black border border-slate-100 relative">
                  {host.fullName.charAt(0)}
                  {host.isWorkspaceSynced && (
                    <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-sm border border-slate-100">
                      <Globe size={10} className="text-indigo-600" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-black text-slate-900 tracking-tight">
                      {host.fullName}
                    </p>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {host.department}
                  </p>
                </div>
              </div>
              <button
                onClick={() => toggleStatus(host.id)}
                title="Click to toggle status"
                disabled={loading}
                className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border transition-all disabled:opacity-60 disabled:cursor-not-allowed ${host.status === "Active" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-100 text-slate-400 border-slate-200"}`}
              >
                {host.status}
              </button>
              <input
                type="checkbox"
                checked={selectedHostIds.has(Number(host.id))}
                onChange={() =>
                  setSelectedHostIds((prev) => {
                    const next = new Set(prev);
                    const id = Number(host.id);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  })
                }
                className="w-4 h-4 accent-indigo-600"
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 text-slate-400 text-[10px] font-medium">
                <Mail size={12} className="text-slate-300" />
                {host.email || "No email provided"}
              </div>
              <div className="flex items-center gap-3 text-slate-400 text-[10px] font-medium">
                <Smartphone size={12} className="text-slate-300" />
                {host.phone || "No phone provided"}
              </div>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-slate-50">
              <button
                onClick={() => openEditModal(host)}
                disabled={loading}
                className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Edit2 size={12} /> Edit Detail
              </button>
              <button
                onClick={() => requestHostDelete(host)}
                disabled={loading}
                className="text-slate-300 hover:text-rose-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {hosts.length === 0 && (
          <div className="md:col-span-3 py-24 text-center text-slate-300 font-black uppercase tracking-[0.3em] text-[10px]">
            Registry is currently empty.
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// KeyManagement - Manage key assets
// ============================================================
const KeyManagement = () => {
  const [keys, setKeys] = useState<KeyAsset[]>([]);
  const [selectedKeyIds, setSelectedKeyIds] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState<number | null>(null);
  const [editingKey, setEditingKey] = useState<KeyAsset | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingOverlay, setLoadingOverlay] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Loading key assets");
  const [error, setError] = useState("");
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // CSV Staging Area
  const [stagingHeaders, setStagingHeaders] = useState<string[]>([]);
  const [stagingRows, setStagingRows] = useState<string[][]>([]);
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    try {
      setLoading(true);
      const response = await apiService.keyAsset.getAll();
      setKeys(getApiContent(response as ApiEnvelope<any[]>, [], "key assets"));
      setSelectedKeyIds(new Set());
    } catch (err: any) {
      console.error("Error loading keys:", err);
      setError(err.message || "Failed to load keys");
    } finally {
      setLoading(false);
    }
  };

  // CREATE - No ID passed
  const createKey = async (keyData: Omit<KeyAsset, "id">) => {
    try {
      setLoadingOverlay(true);
      setLoadingMessage("Creating Key Asset");
      const response = await apiService.keyAsset.create(keyData);
      ensureApiSuccess(response, "Failed to create key asset");
      await loadKeys(); // Reload to get fresh data
    } catch (err: any) {
      console.error("Error creating key:", err);
      setError(err.message || "Failed to create key");
    } finally {
      setLoadingOverlay(false);
    }
  };

  const requestConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
  ) => {
    setConfirmAction({ title, message, onConfirm });
  };

  // UPDATE - ID required
  const updateKey = (id: number, data: Partial<KeyAsset>) => {
    const keyAsset = keys.find((k) => k.id === id);
    requestConfirm(
      "Update Key Asset",
      `Are you sure you want to update ${keyAsset?.keyName || "this key"}?`,
      async () => {
        try {
          setLoadingOverlay(true);
          setLoadingMessage("Updating Key Asset");
          const response = await apiService.keyAsset.update(id, data);
          ensureApiSuccess(response, "Failed to update key asset");
          await loadKeys();
        } catch (err: any) {
          console.error("Error updating key:", err);
          setError(err.message || "Failed to update key");
        } finally {
          setLoadingOverlay(false);
        }
      },
    );
  };

  const importKeys = async (keyData: Array<Omit<KeyAsset, "id">>) => {
    try {
      setLoadingOverlay(true);
      setLoadingMessage("Importing Key Assets");
      const response = await apiService.keyAsset.import(keyData);
      ensureApiSuccess(response, "Failed to import key assets");
      await loadKeys();
    } catch (err: any) {
      console.error("Error importing keys:", err);
      setError(err.message || "Failed to import keys");
    } finally {
      setLoadingOverlay(false);
    }
  };

  const keyFields = [
    {
      key: "keyNumber",
      label: "Key ID/Number",
      required: true,
      variants: ["number", "num", "id", "tag"],
    },
    {
      key: "keyName",
      label: "Asset Name",
      required: true,
      variants: ["name", "title", "key"],
    },
    {
      key: "block",
      label: "Block/Building",
      required: true,
      variants: ["block", "building", "wing"],
    },
    {
      key: "floor",
      label: "Floor Level",
      required: true,
      variants: ["floor", "level"],
    },
    {
      key: "location",
      label: "Specific Location",
      required: false,
      variants: ["loc", "room", "space"],
    },
    {
      key: "notes",
      label: "Audit Notes",
      required: false,
      variants: ["note", "comment", "description"],
    },
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const lines = content
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length < 2) return;

      const headers = parseCSVLine(lines[0]);
      const rows = lines.slice(1).map((line) => parseCSVLine(line));

      setStagingHeaders(headers);
      setStagingRows(rows);
      setIsMappingModalOpen(true);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const finalizeImport = async (mapping: Record<string, number>) => {
    setIsMappingModalOpen(false);
    setProgress(10);

    const imported: Array<Omit<KeyAsset, "id">> = [];
    const getVal = (row: string[], index: number) =>
      index !== -1 && row[index] ? row[index].trim() : "";

    for (let i = 0; i < stagingRows.length; i++) {
      const row = stagingRows[i];
      imported.push({
        keyNumber: getVal(row, mapping.keyNumber) || "N/A",
        keyName: getVal(row, mapping.keyName) || "Unknown Asset",
        block: getVal(row, mapping.block) || "A",
        floor: getVal(row, mapping.floor) || "1",
        location: getVal(row, mapping.location),
        notes: getVal(row, mapping.notes) || " ",
      });

      if (i % 10 === 0 || i === stagingRows.length - 1) {
        setProgress(Math.floor(10 + (i / stagingRows.length) * 85));
        await new Promise((r) => setTimeout(r, 10));
      }
    }

    setProgress(100);
    setTimeout(() => {
      importKeys(imported);
      setProgress(null);
      setStagingHeaders([]);
      setStagingRows([]);
    }, 600);
  };

  const openAddModal = () => {
    setEditingKey(null);
    setIsModalOpen(true);
  };
  const openEditModal = (key: KeyAsset) => {
    setEditingKey(key);
    setIsModalOpen(true);
  };
  const handleSaveKey = (formData: Omit<KeyAsset, "id">) => {
    if (editingKey) {
      // Update existing
      updateKey(editingKey.id, formData);
    } else {
      // Create new - no id passed
      createKey(formData);
    }
    setIsModalOpen(false);
  };

  const requestDelete = (keyAsset: KeyAsset) => {
    requestConfirm(
      "Delete Key Asset",
      `This will permanently remove ${keyAsset.keyName || "this key"} from the digital inventory. Proceed?`,
      async () => {
        try {
          setLoadingOverlay(true);
          setLoadingMessage("Deleting Key Asset");
          const response = await apiService.keyAsset.delete(keyAsset.id);
          ensureApiSuccess(response, "Failed to delete key asset");
          await loadKeys();
        } catch (err: any) {
          console.error("Error deleting key:", err);
          setError(err.message || "Failed to delete key");
        } finally {
          setLoadingOverlay(false);
        }
      },
    );
  };

  const requestBulkDelete = () => {
    const ids = normalizeNumericIds(Array.from(selectedKeyIds));
    if (!ids.length) return;
    requestConfirm(
      "Bulk Delete Key Assets",
      `This will permanently remove ${ids.length} selected key asset(s). Proceed?`,
      async () => {
        try {
          setLoadingOverlay(true);
          setLoadingMessage("Bulk Deleting Key Assets");
          const response = await apiService.keyAsset.bulkDelete(ids);
          ensureApiSuccess(response, "Failed to bulk delete key assets");
          await loadKeys();
        } catch (err: any) {
          console.error("Error bulk deleting keys:", err);
          setError(err.message || "Failed to bulk delete keys");
        } finally {
          setLoadingOverlay(false);
        }
      },
    );
  };

  const allKeysSelected =
    keys.length > 0 && selectedKeyIds.size === keys.length;

  const toggleSelectAllKeys = () => {
    if (allKeysSelected) {
      setSelectedKeyIds(new Set());
      return;
    }
    setSelectedKeyIds(new Set(normalizeNumericIds(keys.map((key) => key.id))));
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {(loadingOverlay || loading) && (
        <LoadingOverlay message={loadingMessage} />
      )}
      {progress !== null && (
        <BulkProgress progress={progress} label="Inventory Synchronization" />
      )}
      <ConfirmActionModal
        confirmAction={confirmAction}
        onClose={() => setConfirmAction(null)}
      />
      {isModalOpen && (
        <KeyFormModal
          keyAsset={editingKey}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveKey}
        />
      )}
      {isMappingModalOpen && (
        <CSVMappingModal
          headers={stagingHeaders}
          rows={stagingRows}
          fields={keyFields}
          onCancel={() => setIsMappingModalOpen(false)}
          onConfirm={finalizeImport}
        />
      )}

      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Security Tokens
          </h2>
          <p className="text-slate-400 text-sm mt-1 font-medium tracking-tight">
            Facility access inventory and physical master keys.
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={requestBulkDelete}
            disabled={selectedKeyIds.size === 0}
            className="flex items-center gap-3 bg-rose-50 border border-rose-100 text-rose-600 font-black px-6 py-4 rounded-2xl text-[10px] uppercase tracking-[0.2em] hover:bg-rose-100 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 size={16} /> Delete Selected ({selectedKeyIds.size})
          </button>
          <label className="flex items-center gap-3 bg-white border border-slate-200 text-zinc-600 font-black px-6 py-4 rounded-2xl text-[10px] uppercase tracking-[0.2em] hover:bg-slate-50 transition-all cursor-pointer shadow-sm">
            <FileUp size={16} /> Import CSV
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileSelect}
            />
          </label>
          <button
            onClick={openAddModal}
            className="flex items-center gap-3 bg-indigo-600 text-white font-black px-8 py-4 rounded-2xl text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            <Plus size={16} /> Add Key
          </button>
        </div>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div className="flex justify-end pr-8">
          <input
            type="checkbox"
            checked={allKeysSelected}
            onChange={toggleSelectAllKeys}
            disabled={keys.length === 0}
            aria-label="Select all keys"
            className="w-4 h-4 accent-indigo-600 disabled:opacity-50"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {keys.map((key) => (
          <div
            key={key.id}
            className="p-8 border border-slate-100 rounded-[2.5rem] bg-white flex flex-col gap-6 group shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex justify-between items-start">
              <div className="flex gap-4 items-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 font-black flex items-center justify-center border border-amber-100 text-[10px]">
                  {key.keyNumber}
                </div>
                <div>
                  <p className="font-black text-slate-900 tracking-tight">
                    {key.keyName}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    L{key.floor} • BLOCK {key.block}
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={selectedKeyIds.has(Number(key.id))}
                onChange={() =>
                  setSelectedKeyIds((prev) => {
                    const next = new Set(prev);
                    const id = Number(key.id);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  })
                }
                className="w-4 h-4 accent-indigo-600"
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 text-slate-400 text-[10px] font-medium">
                <MapPin size={12} className="text-slate-300" />
                {key.location || "General Access"}
              </div>
              {key.notes && (
                <div className="flex items-center gap-3 text-slate-400 text-[10px] font-medium">
                  <FileText size={12} className="text-slate-300" />
                  <span className="truncate">{key.notes}</span>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-slate-50">
              <button
                onClick={() => openEditModal(key)}
                className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-600 transition-colors"
              >
                <Edit2 size={12} /> Edit Asset
              </button>
              <button
                onClick={() => requestDelete(key)}
                className="text-slate-300 hover:text-rose-500 transition-all"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {keys.length === 0 && (
          <div className="md:col-span-3 py-24 text-center text-slate-300 font-black uppercase tracking-widest text-[10px]">
            Zero assets registered in inventory.
          </div>
        )}
      </div>
    </div>
  );
};

/* --- GENERIC CSV MAPPING MODAL COMPONENT --- */

const CSVMappingModal = ({
  headers,
  rows,
  fields,
  onCancel,
  onConfirm,
}: {
  headers: string[];
  rows: string[][];
  fields: {
    key: string;
    label: string;
    required: boolean;
    variants: string[];
  }[];
  onCancel: () => void;
  onConfirm: (mapping: Record<string, number>) => void;
}) => {
  const [mapping, setMapping] = useState<Record<string, number>>({});

  useEffect(() => {
    const initialMapping: Record<string, number> = {};
    const lowerHeaders = headers.map((h) => h.toLowerCase());

    fields.forEach((field) => {
      const matchIndex = lowerHeaders.findIndex((h) =>
        field.variants.some((v) => h.includes(v)),
      );
      if (matchIndex !== -1) {
        initialMapping[field.key] = matchIndex;
      }
    });
    setMapping(initialMapping);
  }, [headers, fields]);

  const previewRows = useMemo(() => rows.slice(0, 3), [rows]);
  const isReady = fields
    .filter((f) => f.required)
    .every((f) => mapping[f.key] !== undefined);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-5xl rounded-[3.5rem] shadow-2xl animate-in zoom-in-95 duration-500 border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
        <header className="p-10 border-b border-slate-50 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">
              Registry Mapping Protocol
            </h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
              Align CSV headers with System Logic
            </p>
          </div>
          <button
            onClick={onCancel}
            className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-50 hover:text-rose-500 transition-all"
          >
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-10 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fields.map((field) => (
              <div
                key={field.key}
                className={`p-6 rounded-[2rem] border transition-all ${mapping[field.key] !== undefined ? "bg-indigo-50/30 border-indigo-100 shadow-sm" : "bg-slate-50 border-slate-100"}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {field.label}
                    {field.required && (
                      <span className="text-rose-500 ml-1">*</span>
                    )}
                  </label>
                  {mapping[field.key] !== undefined && (
                    <CheckCircle size={14} className="text-emerald-500" />
                  )}
                </div>
                <div className="relative">
                  <select
                    className="w-full pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-xs text-slate-600 appearance-none focus:border-indigo-500 transition-all cursor-pointer"
                    value={mapping[field.key] ?? ""}
                    onChange={(e) =>
                      setMapping({
                        ...mapping,
                        [field.key]:
                          e.target.value === ""
                            ? undefined
                            : parseInt(e.target.value),
                      })
                    }
                  >
                    <option value="">-- No Mapping --</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <TableProperties size={18} className="text-indigo-600" />
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Data Sample Preview
              </h4>
            </div>
            <div className="bg-slate-900 rounded-[2.5rem] overflow-hidden border border-slate-800 shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-white/5">
                      {fields.map((f) => (
                        <th
                          key={f.key}
                          className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap"
                        >
                          {f.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className="border-b border-slate-800/50 last:border-0"
                      >
                        {fields.map((f) => (
                          <td
                            key={f.key}
                            className="px-6 py-4 font-mono text-[10px] text-slate-300 whitespace-nowrap truncate max-w-[150px]"
                          >
                            {mapping[f.key] !== undefined ? (
                              row[mapping[f.key]] || "—"
                            ) : (
                              <span className="text-slate-700 italic">
                                Unmapped
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <footer className="p-10 border-t border-slate-50 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400">
              <FileText size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                {rows.length} records staged
              </p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                Registry Ready for Synchronization
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={onCancel}
              className="px-8 py-4 bg-white border border-slate-200 text-slate-400 font-black rounded-[1.5rem] text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
            >
              Abort Protocol
            </button>
            <button
              onClick={() => onConfirm(mapping)}
              disabled={!isReady}
              className="px-10 py-4 bg-indigo-600 text-white font-black rounded-[1.5rem] text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center gap-3 disabled:opacity-30"
            >
              <ArrowRightLeft size={14} /> Finalize Synchronization
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

const HostFormModal = ({ host, onClose, onSave }: any) => {
  const [formData, setFormData] = useState({
    fullName: host?.fullName || "",
    department: host?.department || "",
    email: host?.email || "",
    phone: host?.phone || "",
    status: host?.status || "Active",
    googleChatSpaceId: host?.googleChatSpaceId || "",
    isWorkspaceSynced: host?.isWorkspaceSynced || false,
  });
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl p-12 rounded-[3.5rem] shadow-2xl animate-in zoom-in-95 duration-500 border border-slate-100 max-h-[90vh] overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">
              {host ? "Edit Personnel" : "Add Personnel"}
            </h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
              Directory Synchronization
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-50 hover:text-rose-500 transition-all"
          >
            <X size={20} />
          </button>
        </header>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <SettingInput
              label="Full Name"
              icon={User}
              value={formData.fullName}
              onChange={(v: string) =>
                setFormData({ ...formData, fullName: v })
              }
            />
            <SettingInput
              label="Department"
              icon={Briefcase}
              value={formData.department}
              onChange={(v: string) =>
                setFormData({ ...formData, department: v })
              }
            />
            <SettingInput
              label="Email Address"
              icon={Mail}
              type="email"
              value={formData.email}
              onChange={(v: string) => setFormData({ ...formData, email: v })}
            />
            <SettingInput
              label="Phone Number"
              icon={Smartphone}
              type="tel"
              value={formData.phone}
              onChange={(v: string) => setFormData({ ...formData, phone: v })}
            />
          </div>
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-2">
              Workspace Identification
            </label>
            <SettingInput
              label="Google Chat Space ID"
              icon={MessageCircle}
              value={formData.googleChatSpaceId}
              onChange={(v: string) =>
                setFormData({ ...formData, googleChatSpaceId: v })
              }
              placeholder="e.g. spaces/AAAA..."
            />
          </div>
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-2">
              Initial Protocol State
            </label>
            <div className="flex gap-4">
              {["Active", "Inactive"].map((s: any) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFormData({ ...formData, status: s })}
                  className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all ${formData.status === s ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100" : "bg-white text-slate-400 border-slate-100 hover:border-slate-300"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="pt-6">
            <button
              type="submit"
              className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3"
            >
              <Save size={18} /> Synchronize Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const KeyFormModal = ({ keyAsset, onClose, onSave }: any) => {
  const [formData, setFormData] = useState({
    keyNumber: keyAsset?.keyNumber || "",
    keyName: keyAsset?.keyName || "",
    block: keyAsset?.block || "A",
    floor: keyAsset?.floor || "1",
    location: keyAsset?.location || "",
    notes: keyAsset?.notes || " ",
  });
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl p-12 rounded-[3.5rem] shadow-2xl animate-in zoom-in-95 duration-500 border border-slate-100">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">
              {keyAsset ? "Modify Key" : "New Key Asset"}
            </h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
              Inventory Synchronization
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-50 hover:text-rose-500 transition-all"
          >
            <X size={20} />
          </button>
        </header>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <SettingInput
              label="Key ID / Number"
              icon={Hash}
              value={formData.keyNumber}
              onChange={(v: string) =>
                setFormData({ ...formData, keyNumber: v })
              }
            />
            <SettingInput
              label="Asset Name"
              icon={KeyRound}
              value={formData.keyName}
              onChange={(v: string) => setFormData({ ...formData, keyName: v })}
            />
            <SettingInput
              label="Block/Building"
              icon={Building2}
              value={formData.block}
              onChange={(v: string) => setFormData({ ...formData, block: v })}
            />
            <SettingInput
              label="Floor Level"
              icon={Layers}
              value={formData.floor}
              onChange={(v: string) => setFormData({ ...formData, floor: v })}
            />
          </div>
          <SettingInput
            label="Specific Location"
            icon={MapPin}
            value={formData.location}
            onChange={(v: string) => setFormData({ ...formData, location: v })}
          />
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-2">
              Audit Notes
            </label>
            <textarea
              className="w-full px-8 py-5 bg-white border border-slate-100 rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold text-sm text-slate-800 shadow-sm min-h-[100px] resize-none"
              placeholder="e.g. Requires special clearance..."
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
            />
          </div>
          <div className="pt-6">
            <button
              type="submit"
              className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3"
            >
              <Save size={18} /> Synchronize Asset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================
// NotificationManagement - Manage notification templates
// ============================================================
const NotificationManagement = ({ settings, onUpdate }: any) => {
  const [formData, setFormData] = useState({
    ccEmail: settings?.notificationCopyEmail || "",
    hostCheckIn:
      settings?.hostCheckInTemplate || DEFAULT_SETTINGS.hostCheckInTemplate,
    guestCheckIn:
      settings?.guestCheckInTemplate || DEFAULT_SETTINGS.guestCheckInTemplate,
    hostCheckOut:
      settings?.hostCheckOutTemplate || DEFAULT_SETTINGS.hostCheckOutTemplate,
    guestCheckOut:
      settings?.guestCheckOutTemplate || DEFAULT_SETTINGS.guestCheckOutTemplate,
    hostDelivery:
      settings?.hostDeliveryTemplate || DEFAULT_SETTINGS.hostDeliveryTemplate,
    courierDelivery:
      settings?.courierDeliveryTemplate ||
      DEFAULT_SETTINGS.courierDeliveryTemplate,
    hostAssetCI:
      settings?.hostAssetCheckoutTemplate ||
      DEFAULT_SETTINGS.hostAssetCheckoutTemplate,
    borrowerAssetCI:
      settings?.borrowerAssetCheckoutTemplate ||
      DEFAULT_SETTINGS.borrowerAssetCheckoutTemplate,
    hostAssetCO:
      settings?.hostAssetReturnTemplate ||
      DEFAULT_SETTINGS.hostAssetReturnTemplate,
    borrowerAssetCO:
      settings?.borrowerAssetReturnTemplate ||
      DEFAULT_SETTINGS.borrowerAssetReturnTemplate,
    hostAssetOverdue:
      settings?.hostAssetOverdueTemplate ||
      DEFAULT_SETTINGS.hostAssetOverdueTemplate,
    borrowerAssetOverdue:
      settings?.borrowerAssetOverdueTemplate ||
      DEFAULT_SETTINGS.borrowerAssetOverdueTemplate,
    hostKeyCI:
      settings?.hostKeyCheckoutTemplate ||
      DEFAULT_SETTINGS.hostKeyCheckoutTemplate,
    borrowerKeyCI:
      settings?.borrowerKeyCheckoutTemplate ||
      DEFAULT_SETTINGS.borrowerKeyCheckoutTemplate,
    hostKeyCO:
      settings?.hostKeyReturnTemplate || DEFAULT_SETTINGS.hostKeyReturnTemplate,
    borrowerKeyReturnTemplate:
      settings?.borrowerKeyReturnTemplate ||
      DEFAULT_SETTINGS.borrowerKeyReturnTemplate,
    hostKeyOverdue:
      settings?.hostKeyOverdueTemplate ||
      DEFAULT_SETTINGS.hostKeyOverdueTemplate,
    borrowerKeyOverdue:
      settings?.borrowerKeyOverdueTemplate ||
      DEFAULT_SETTINGS.borrowerKeyOverdueTemplate,
  });
  const [enabled, setEnabled] = useState(
    settings?.notificationsEnabled ?? DEFAULT_SETTINGS.notificationsEnabled,
  );
  const [saved, setSaved] = useState(false);
  const [loadingOverlay, setLoadingOverlay] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(
    "Updating Notification Settings",
  );
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const requestConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
  ) => {
    setConfirmAction({ title, message, onConfirm });
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newSettings = {
      ...settings,
      notificationCopyEmail: formData.ccEmail,
      hostCheckInTemplate: formData.hostCheckIn,
      guestCheckInTemplate: formData.guestCheckIn,
      hostCheckOutTemplate: formData.hostCheckOut,
      guestCheckOutTemplate: formData.guestCheckOut,
      hostDeliveryTemplate: formData.hostDelivery,
      courierDeliveryTemplate: formData.courierDelivery,
      hostAssetCheckoutTemplate: formData.hostAssetCI,
      borrowerAssetCheckoutTemplate: formData.borrowerAssetCheckoutTemplate,
      hostAssetReturnTemplate: formData.hostAssetCO,
      borrowerAssetReturnTemplate: formData.borrowerAssetReturnTemplate,
      hostAssetOverdueTemplate: formData.hostAssetOverdue,
      borrowerAssetOverdueTemplate: formData.borrowerAssetOverdue,
      hostKeyCheckoutTemplate: formData.hostKeyCI,
      borrowerKeyCheckoutTemplate: formData.borrowerKeyCI,
      hostKeyReturnTemplate: formData.hostKeyCO,
      borrowerKeyReturnTemplate: formData.borrowerKeyReturnTemplate,
      hostKeyOverdueTemplate: formData.hostKeyOverdue,
      borrowerKeyOverdueTemplate: formData.borrowerKeyOverdue,
      notificationsEnabled: enabled,
    };
    requestConfirm(
      "Update Notification Templates",
      "Apply these notification templates and settings?",
      async () => {
        try {
          setLoadingOverlay(true);
          const response = await apiService.settings.update(newSettings);
          ensureApiSuccess(response, "Failed to update settings");
          onUpdate(newSettings);
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
        } catch (error) {
          console.error("Error updating settings:", error);
        } finally {
          setLoadingOverlay(false);
        }
      },
    );
  };
  const variables = [
    { code: "{{visitor_name}}", desc: "Guest's full name" },
    { code: "{{host_name}}", desc: "Assigned host's name" },
    { code: "{{company}}", desc: "Visitor's organization" },
    { code: "{{purpose}}", desc: "Reason for visit/access" },
    { code: "{{location}}", desc: "Campus/Building" },
    { code: "{{time}}", desc: "Timestamp of event" },
    { code: "{{email}}", desc: "Subject's contact email" },
    { code: "{{courier_name}}", desc: "Delivery driver's name" },
    { code: "{{delivery_for}}", desc: "Intended recipient staff name" },
    { code: "{{package_type}}", desc: "Type of delivery" },
    { code: "{{item_name}}", desc: "Specific delivery items" },
    { code: "{{tracking_number}}", desc: "Logistics ID" },
    { code: "{{equipment_name}}", desc: "Name of asset/item" },
    { code: "{{staff_in_charge}}", desc: "Host in charge of item" },
    { code: "{{borrower_name}}", desc: "Name of custodian/borrower" },
    { code: "{{returner_name}}", desc: "Name of person returning item" },
    { code: "{{condition}}", desc: "Item health state upon return" },
    { code: "{{key_name}}", desc: "Name of the facility key" },
    { code: "{{key_number}}", desc: "Identifier/Tag of the key" },
    { code: "{{security_name}}", desc: "Security witness name" },
    { code: "{{borrowed_at}}", desc: "Timestamp when key was borrowed" },
    { code: "{{overdue_duration}}", desc: "Time elapsed since checkout" },
    { code: "{{target_campus}}", desc: "Destination campus name" },
  ];
  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-12 animate-in fade-in duration-500"
    >
      {loadingOverlay && <LoadingOverlay message={loadingMessage} />}
      <ConfirmActionModal
        confirmAction={confirmAction}
        onClose={() => setConfirmAction(null)}
      />
      <header className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Broadcast Protocol
          </h2>
          <p className="text-slate-400 text-sm mt-1 font-medium tracking-tight">
            Automated outbound email logic for hosts and guests.
          </p>
        </div>
        <div className="flex items-center gap-6 bg-slate-50 p-4 rounded-[2rem] border border-slate-100">
          <div className="flex gap-4 items-center">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${enabled ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-white text-slate-300 border-slate-100"}`}
            >
              <BellRing size={20} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Master Switch
            </span>
          </div>
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`relative w-16 h-8 rounded-full transition-all duration-500 ${enabled ? "bg-emerald-500" : "bg-slate-300"}`}
          >
            <div
              className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-lg transition-transform duration-500 ${enabled ? "translate-x-8" : ""}`}
            />
          </button>
        </div>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-indigo-500 rounded-full" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
                Global Notification CC
              </h3>
            </div>
            <SettingInput
              label="Receive copy of all notifications"
              icon={Mail}
              value={formData.ccEmail}
              onChange={(v: string) => setFormData({ ...formData, ccEmail: v })}
              placeholder="admin@company.com"
            />
          </div>
          <div className="h-[1px] bg-slate-50 w-full" />
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-indigo-500 rounded-full" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
                Check-In Event (Broadcast)
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-8">
              <TemplateArea
                label="Host Notification (Arrival)"
                icon={UserCheck}
                value={formData.hostCheckIn}
                onChange={(v) => setFormData({ ...formData, hostCheckIn: v })}
              />
              <TemplateArea
                label="Guest Welcome Message"
                icon={User}
                value={formData.guestCheckIn}
                onChange={(v) => setFormData({ ...formData, guestCheckIn: v })}
              />
            </div>
          </div>
          <div className="h-[1px] bg-slate-50 w-full" />
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-amber-500 rounded-full" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
                Key Events (Broadcast)
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-8">
              <TemplateArea
                label="Host/Security Alert (Key Checkout)"
                icon={Key}
                value={formData.hostKeyCI}
                onChange={(v) => setFormData({ ...formData, hostKeyCI: v })}
              />
              <TemplateArea
                label="Borrower Receipt (Key Checkout)"
                icon={Mail}
                value={formData.borrowerKeyCI}
                onChange={(v) => setFormData({ ...formData, borrowerKeyCI: v })}
              />
              <TemplateArea
                label="Host/Security Alert (Key Return)"
                icon={RefreshCw}
                value={formData.hostKeyCO}
                onChange={(v) => setFormData({ ...formData, hostKeyCO: v })}
              />
              <TemplateArea
                label="Borrower Receipt (Key Return)"
                icon={Mail}
                value={formData.borrowerKeyCO}
                onChange={(v) => setFormData({ ...formData, borrowerKeyCO: v })}
              />
            </div>
          </div>
          <div className="h-[1px] bg-slate-50 w-full" />
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-rose-500 rounded-full" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
                Key Overdue Alerts (Broadcast)
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-8">
              <TemplateArea
                label="Security Admin Alert (Unreturned Key)"
                icon={ShieldAlert}
                value={formData.hostKeyOverdue}
                onChange={(v) =>
                  setFormData({ ...formData, hostKeyOverdue: v })
                }
              />
              <TemplateArea
                label="Borrower Reminder (Unreturned Key)"
                icon={BellRing}
                value={formData.borrowerKeyOverdue}
                onChange={(v) =>
                  setFormData({ ...formData, borrowerKeyOverdue: v })
                }
              />
            </div>
          </div>
          <div className="h-[1px] bg-slate-50 w-full" />
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
                Logistics Event (Broadcast)
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-8">
              <TemplateArea
                label="Recipient Alert (Incoming Package)"
                icon={Package}
                value={formData.hostDelivery}
                onChange={(v) => setFormData({ ...formData, hostDelivery: v })}
              />
              <TemplateArea
                label="Courier Confirmation"
                icon={Truck}
                value={formData.courierDelivery}
                onChange={(v) =>
                  setFormData({ ...formData, courierDelivery: v })
                }
              />
            </div>
          </div>
        </div>
        <div className="space-y-8">
          <div className="sticky top-12 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <Code size={20} className="text-indigo-600" />
              <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">
                Variable Guide
              </h3>
            </div>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {variables.map((v) => (
                <div
                  key={v.code}
                  className="p-4 bg-white rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-all cursor-default"
                >
                  <p className="text-[11px] font-mono font-black text-indigo-600 mb-1">
                    {v.code}
                  </p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                    {v.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="pt-10 flex items-center justify-between">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-3">
          <ShieldCheck size={16} className="text-emerald-500" /> Local
          synchronization only (Simulated SMTP)
        </p>
        <button
          type="submit"
          className="bg-slate-900 text-white font-black px-12 py-5 rounded-2xl flex items-center gap-4 text-[11px] uppercase tracking-[0.2em] shadow-2xl hover:bg-black transition-all"
        >
          {saved ? (
            <>
              <CheckCircle size={20} /> Persistence Confirmed
            </>
          ) : (
            <>
              <Save size={20} /> Synchronize Hub
            </>
          )}
        </button>
      </div>
    </form>
  );
};

const TemplateArea = ({ label, icon: Icon, value, onChange }: any) => (
  <div className="space-y-4 group">
    <div className="flex items-center justify-between px-2">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3">
        <Icon
          size={14}
          className="text-slate-300 group-hover:text-indigo-500 transition-colors"
        />{" "}
        {label}
      </label>
    </div>
    <textarea
      className="w-full h-32 p-8 bg-white border border-slate-100 rounded-[2rem] outline-none focus:border-indigo-500 transition-all font-medium text-slate-700 leading-relaxed shadow-sm resize-none text-xs"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

const NotificationLogView = ({
  logs,
  settings,
}: {
  logs: NotificationLog[];
  settings: SystemSettings;
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const filteredLogs = useMemo(
    () =>
      logs
        .filter(
          (log) =>
            log.visitorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.hostName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.message.toLowerCase().includes(searchTerm.toLowerCase()),
        )
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        ),
    [logs, searchTerm],
  );
  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Broadcast History
          </h2>
          <p className="text-slate-400 text-sm mt-1 font-medium tracking-tight">
            Audit trail of automated notifications synchronized by terminal hub.
          </p>
        </div>
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 flex-1 max-w-2xl">
          <div className="relative flex-1 group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Search broadcast logs..."
              className="w-full pl-16 pr-12 py-4 bg-white border border-slate-100 rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-300 outline-none font-bold text-sm text-slate-700 transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-rose-50 transition-all"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <div className="flex bg-white p-1.5 rounded-[1.5rem] border border-slate-100 shadow-sm">
            <button
              onClick={() => exportToCSV(filteredLogs, "notifications")}
              className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
              title="Export to CSV"
            >
              <Download size={18} />
            </button>
          </div>
        </div>
      </header>
      <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
              <th className="px-10 py-8">Recipient Node</th>
              <th className="px-10 py-8">Event Trigger</th>
              <th className="px-10 py-8">Transmission Data</th>
              <th className="px-10 py-8 text-right">Synchronization</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredLogs.map((log) => (
              <tr
                key={log.id}
                className="hover:bg-slate-50/50 transition-all group"
              >
                <td className="px-10 py-8">
                  <div>
                    <p className="font-black text-slate-900 tracking-tight">
                      {log.recipient}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      Role: {log.recipientRole}
                    </p>
                  </div>
                </td>
                <td className="px-10 py-8">
                  <div className="flex flex-col gap-2">
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase rounded-full border border-indigo-100 w-fit">
                      {log.trigger}
                    </span>
                    {log.channel && (
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                        <Globe size={8} /> {log.channel}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-10 py-8">
                  <div className="max-w-md">
                    <p className="text-[11px] font-medium text-slate-600 line-clamp-2 leading-relaxed">
                      "{log.message}"
                    </p>
                  </div>
                </td>
                <td className="px-10 py-8 text-right">
                  <div className="inline-flex flex-col items-end">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest ${log.status === "Sent" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}
                    >
                      {log.status}
                    </span>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-1">
                      <Clock size={10} />{" "}
                      {new Date(log.timestamp).toLocaleString([], {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                </td>
              </tr>
            ))}
            {filteredLogs.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="p-32 text-center text-slate-300 font-black uppercase tracking-[0.3em] text-[10px]"
                >
                  Zero broadcast transmissions synchronized in terminal log.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Heart = ({ size, className }: any) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
);

const AdminPortal: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [insights, setInsights] = useState<string>(
    "Analyzing terminal data...",
  );
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [keyLogs, setKeyLogs] = useState<KeyLog[]>([]);
  const [assetLogs, setAssetLogs] = useState<AssetMovement[]>([]);
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>(
    [],
  );
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [loadingOverlay, setLoadingOverlay] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Loading Admin Console");
  const [error, setError] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("adminSidebarCollapsed") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        "adminSidebarCollapsed",
        isSidebarCollapsed ? "true" : "false",
      );
    } catch {
      // Ignore storage errors
    }
  }, [isSidebarCollapsed]);

  type AdminSection =
    | "settings"
    | "securityAlerts"
    | "visitors"
    | "deliveries"
    | "keyLogs"
    | "assetLogs"
    | "notificationLogs";

  const loadedSectionsRef = useRef<Record<AdminSection, boolean>>({
    settings: false,
    securityAlerts: false,
    visitors: false,
    deliveries: false,
    keyLogs: false,
    assetLogs: false,
    notificationLogs: false,
  });
  const inflightLoadsRef = useRef<Partial<Record<AdminSection, Promise<void>>>>(
    {},
  );

  const reloadVisitors = useCallback(async (signal?: AbortSignal) => {
    const visitorsResp = await apiService.visitor.getAll(undefined, { signal });
    const parsedVisitors = getApiContent<Visitor[]>(
      visitorsResp as ApiEnvelope<Visitor[]>,
      [],
      "visitors",
    );
    setVisitors(parsedVisitors);
  }, []);

  const reloadDeliveries = useCallback(async (signal?: AbortSignal) => {
    const deliveriesResp = await apiService.delivery.getAll(undefined, { signal });
    const parsedDeliveries = getApiContent<DeliveryRecord[]>(
      deliveriesResp as ApiEnvelope<DeliveryRecord[]>,
      [],
      "deliveries",
    );
    setDeliveries(parsedDeliveries);
  }, []);

  const reloadKeyLogs = useCallback(async (signal?: AbortSignal) => {
    const keyLogsResp = await apiService.keyLog.getAll(undefined, { signal });
    const parsedKeyLogs = getApiContent<KeyLog[]>(
      keyLogsResp as ApiEnvelope<KeyLog[]>,
      [],
      "key logs",
    );
    setKeyLogs(parsedKeyLogs);
  }, []);

  const reloadAssetLogs = useCallback(async (signal?: AbortSignal) => {
    const assetLogsResp = await apiService.assetMovement.getAll(undefined, {
      signal,
    });
    const parsedAssetLogs = getApiContent<AssetMovement[]>(
      assetLogsResp as ApiEnvelope<AssetMovement[]>,
      [],
      "asset movements",
    );
    setAssetLogs(parsedAssetLogs);
  }, []);

  const reloadNotificationLogs = useCallback(async (signal?: AbortSignal) => {
    const notificationLogsResp = await apiService.notificationLog.getAll(
      undefined,
      { signal },
    );
    const parsedNotificationLogs = getApiContent<NotificationLog[]>(
      notificationLogsResp as ApiEnvelope<NotificationLog[]>,
      [],
      "notification logs",
    );
    setNotificationLogs(parsedNotificationLogs);
  }, []);

  const reloadSettings = useCallback(async (signal?: AbortSignal) => {
    const settingsResp = await apiService.settings.getAll({ signal });
    const parsedSettings = getApiContent<SystemSettings>(
      settingsResp as ApiEnvelope<SystemSettings>,
      DEFAULT_SETTINGS,
      "settings",
    );
    if (parsedSettings) {
      setSettings({
        ...DEFAULT_SETTINGS,
        ...(parsedSettings as any),
        kiosk: {
          ...DEFAULT_SETTINGS.kiosk,
          ...((parsedSettings as any).kiosk || {}),
        },
        workspace: {
          ...DEFAULT_SETTINGS.workspace,
          ...((parsedSettings as any).workspace || {}),
        },
      });
    }
  }, []);

  const reloadSecurityAlerts = useCallback(async (signal?: AbortSignal) => {
    const alertsResp = await apiService.securityAlert.getAll(undefined, {
      signal,
    });
    const parsedSecurityAlerts = getApiContent<SecurityAlert[]>(
      alertsResp as ApiEnvelope<SecurityAlert[]>,
      [],
      "security alerts",
    );
    setSecurityAlerts(parsedSecurityAlerts);
  }, []);

  const runSectionLoad = useCallback(
    async (
      section: AdminSection,
      loader: (signal?: AbortSignal) => Promise<void>,
      signal?: AbortSignal,
      force = false,
    ) => {
      if (!force && loadedSectionsRef.current[section]) return;
      if (!force && inflightLoadsRef.current[section]) {
        await inflightLoadsRef.current[section];
        return;
      }
      const task = (async () => {
        await loader(signal);
        loadedSectionsRef.current[section] = true;
      })().finally(() => {
        delete inflightLoadsRef.current[section];
      });
      inflightLoadsRef.current[section] = task;
      await task;
    },
    [],
  );

  const resolveRequiredSections = useCallback((path: string): AdminSection[] => {
    if (path.startsWith("/admin/visitors")) return ["settings", "visitors"];
    if (path.startsWith("/admin/deliveries")) return ["settings", "deliveries"];
    if (path.startsWith("/admin/keys")) return ["settings", "keyLogs"];
    if (path.startsWith("/admin/logistics")) return ["settings", "assetLogs"];
    if (path.startsWith("/admin/notifications"))
      return ["settings", "notificationLogs"];
    if (path.startsWith("/admin/settings")) return ["settings", "securityAlerts"];
    if (path === "/admin" || path === "/admin/")
      return ["settings", "visitors", "deliveries", "keyLogs"];
    return ["settings"];
  }, []);

  const getLoadingMessageForPath = useCallback((path: string) => {
    if (path.startsWith("/admin/visitors")) return "Loading Visitor Registry";
    if (path.startsWith("/admin/deliveries")) return "Loading Deliveries";
    if (path.startsWith("/admin/keys")) return "Loading Access Key Activity";
    if (path.startsWith("/admin/logistics")) return "Loading Asset Movement Log";
    if (path.startsWith("/admin/notifications")) return "Loading Notifications";
    if (path.startsWith("/admin/settings")) return "Loading Settings";
    return "Loading Admin Console";
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const loadForCurrentPath = async () => {
      const requiredSections = resolveRequiredSections(location.pathname);
      const missingSections = requiredSections.filter(
        (section) => !loadedSectionsRef.current[section],
      );

      if (missingSections.length === 0) {
        setLoadingOverlay(false);
        return;
      }

      setLoadingOverlay(true);
      setLoadingMessage(getLoadingMessageForPath(location.pathname));
      setError("");

      try {
        const loaders: Record<
          AdminSection,
          (signal?: AbortSignal) => Promise<void>
        > = {
          settings: reloadSettings,
          securityAlerts: reloadSecurityAlerts,
          visitors: reloadVisitors,
          deliveries: reloadDeliveries,
          keyLogs: reloadKeyLogs,
          assetLogs: reloadAssetLogs,
          notificationLogs: reloadNotificationLogs,
        };
        await Promise.all(
          missingSections.map((section) =>
            runSectionLoad(section, loaders[section], controller.signal),
          ),
        );
      } catch (loadError) {
        if ((loadError as any)?.name === "AbortError") return;
        console.error("Error loading admin data:", loadError);
        if (!cancelled) {
          setError(
            getApiErrorMessage(loadError, "Failed to load admin console data"),
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingOverlay(false);
        }
      }
    };

    void loadForCurrentPath();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    location.pathname,
    getLoadingMessageForPath,
    reloadAssetLogs,
    reloadDeliveries,
    reloadKeyLogs,
    reloadNotificationLogs,
    reloadSecurityAlerts,
    reloadSettings,
    reloadVisitors,
    resolveRequiredSections,
    runSectionLoad,
  ]);

  useEffect(() => {
    const isDashboardPath =
      location.pathname === "/admin" || location.pathname === "/admin/";
    if (!isDashboardPath) return;

    if (
      !loadedSectionsRef.current.visitors ||
      !loadedSectionsRef.current.deliveries ||
      !loadedSectionsRef.current.keyLogs
    ) {
      return;
    }

    let cancelled = false;
    const fetchInsights = async () => {
      try {
        const text = await getAdminInsights(visitors, deliveries, keyLogs);
        if (!cancelled) {
          setInsights(text || "No insights available.");
        }
      } catch (insightError) {
        console.error("Error fetching insights:", insightError);
        if (!cancelled) {
          setInsights("Unable to generate insights at this time.");
        }
      }
    };

    void fetchInsights();
    return () => {
      cancelled = true;
    };
  }, [deliveries, keyLogs, location.pathname, visitors]);

  const deleteRecord = async (type: string, id: number | string) => {
    const numericId = Number(id);
    try {
      if (type === "visitor") {
        const response = await apiService.visitor.delete(numericId);
        ensureApiSuccess(response, "Failed to delete visitor");
        await reloadVisitors();
      } else if (type === "delivery") {
        const response = await apiService.delivery.delete(numericId);
        ensureApiSuccess(response, "Failed to delete delivery");
        await reloadDeliveries();
      } else if (type === "key") {
        const response = await apiService.keyLog.delete(id);
        ensureApiSuccess(response, "Failed to delete key log");
        await reloadKeyLogs();
      } else if (type === "asset") {
        const response = await apiService.assetMovement.delete(numericId);
        ensureApiSuccess(response, "Failed to delete asset movement");
        await reloadAssetLogs();
      } else if (type === "notification") {
        const response = await apiService.notificationLog.delete(numericId);
        ensureApiSuccess(response, "Failed to delete notification log");
        await reloadNotificationLogs();
      }
    } catch (error) {
      console.error("Error deleting record:", error);
      setError(getApiErrorMessage(error, "Failed to delete record"));
    }
  };

  const bulkDeleteRecords = async (type: string, ids: number[]) => {
    const uniqueIds = Array.from(
      new Set(ids.map((id) => Number(id)).filter((id) => Number.isFinite(id))),
    );
    if (uniqueIds.length === 0) return;

    try {
      if (type === "visitor") {
        const response = await apiService.visitor.bulkDelete(uniqueIds);
        ensureApiSuccess(response, "Failed to bulk delete visitors");
        await reloadVisitors();
      } else if (type === "delivery") {
        const response = await apiService.delivery.bulkDelete(uniqueIds);
        ensureApiSuccess(response, "Failed to bulk delete deliveries");
        await reloadDeliveries();
      } else if (type === "key") {
        const response = await apiService.keyLog.bulkDelete(uniqueIds);
        ensureApiSuccess(response, "Failed to bulk delete key logs");
        await reloadKeyLogs();
      } else if (type === "asset") {
        const response = await apiService.assetMovement.bulkDelete(uniqueIds);
        ensureApiSuccess(response, "Failed to bulk delete asset movements");
        await reloadAssetLogs();
      }
    } catch (error) {
      console.error("Error bulk deleting records:", error);
      setError(getApiErrorMessage(error, "Failed to bulk delete records"));
    }
  };

  const updateRecord = async (
    type: string,
    id: number | string,
    updatedData: any,
  ) => {
    const currentAdminName = resolveCurrentAdminName();
    const numericId = Number(id);
    try {
      if (type === "visitor") {
        const currentVisitor = visitors.find((v) => v.id === numericId);
        if (!currentVisitor) {
          throw new Error("Visitor record not found");
        }
        const mergedVisitor = { ...currentVisitor, ...updatedData };
        const { id: _id, ...visitorPayload } = mergedVisitor;
        (visitorPayload as any).processedBy = currentAdminName;
        const response = await apiService.visitor.update(
          numericId,
          visitorPayload,
        );
        ensureApiSuccess(response, "Failed to update visitor");
        await reloadVisitors();
      } else if (type === "delivery") {
        const payload = {
          ...updatedData,
          processedBy: currentAdminName,
        };
        const response = await apiService.delivery.update(numericId, payload);
        ensureApiSuccess(response, "Failed to update delivery");
        await reloadDeliveries();
      } else if (type === "key") {
        const currentKeyLog = keyLogs.find((k) => String(k.id) === String(id));
        if (!currentKeyLog) {
          throw new Error("Key log record not found");
        }
        const mergedKeyLog = { ...currentKeyLog, ...updatedData };
        const { id: _id, code: _code, ...payload } = mergedKeyLog as any;
        payload.processedBy = currentAdminName;
        payload.status = payload.status || currentKeyLog.status || "Out";
        payload.borrowedAt = payload.borrowedAt || currentKeyLog.borrowedAt;
        const response = await apiService.keyLog.update(id, payload);
        ensureApiSuccess(response, "Failed to update key log");
        await reloadKeyLogs();
      } else if (type === "asset") {
        const payload = {
          ...updatedData,
          processedBy: currentAdminName,
        };
        const response = await apiService.assetMovement.update(
          numericId,
          payload,
        );
        ensureApiSuccess(response, "Failed to update asset movement");
        await reloadAssetLogs();
      } else if (type === "notification") {
        const response = await apiService.notificationLog.update(
          numericId,
          updatedData,
        );
        ensureApiSuccess(response, "Failed to update notification log");
        await reloadNotificationLogs();
      }
    } catch (error) {
      console.error("Error updating record:", error);
      setError(getApiErrorMessage(error, "Failed to update record"));
    }
  };

  const tabs = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/admin" },
    { label: "Visitors", icon: Users, path: "/admin/visitors" },
    { label: "Deliveries", icon: Package, path: "/admin/deliveries" },
    { label: "Key Log", icon: Key, path: "/admin/keys" },
    { label: "Assets", icon: Layers, path: "/admin/logistics" },
    { label: "Notifications", icon: BellRing, path: "/admin/notifications" },
    {
      label: "Settings",
      icon: Settings,
      path: "/admin/settings",
      badge: securityAlerts.filter((a) => a.status === "Unread").length,
    },
  ];
  const currentTab =
    tabs.find(
      (t) =>
        location.pathname === t.path ||
        location.pathname.startsWith(t.path + "/"),
    )?.label || "Dashboard";
  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans">
      {loadingOverlay && <LoadingOverlay message={loadingMessage} />}
      <aside
        className={`${isSidebarCollapsed ? "w-24" : "w-80"} relative bg-white border-r border-slate-100 flex flex-col p-6 flex-shrink-0 transition-all duration-300`}
      >
        <div className="flex items-center justify-between mb-12 px-2">
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white shadow-lg flex-shrink-0 overflow-hidden">
                {settings.kiosk.logoUrl ? (
                  <img
                    src={settings.kiosk.logoUrl}
                    className="w-full h-full object-cover"
                    alt="Logo"
                  />
                ) : (
                  <ShieldCheck size={20} />
                )}
              </div>
              <div>
                <h2 className="font-black text-slate-900 tracking-tight leading-none text-xs uppercase">
                  {settings.kiosk.companyName}
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 text-nowrap">
                  Admin Operations
                </p>
              </div>
            </div>
          )}
          {!isSidebarCollapsed && (
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              className="w-10 h-10 rounded-xl border border-slate-100 text-slate-400 hover:text-slate-700 hover:border-slate-200 transition-all flex items-center justify-center"
              title="Collapse sidebar"
            >
              <PanelLeftClose size={18} />
            </button>
          )}
          {isSidebarCollapsed && (
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              className="absolute top-6 right-4 w-8 h-8 rounded-lg border border-slate-100 text-slate-400 hover:text-slate-700 hover:border-slate-200 transition-all flex items-center justify-center"
              title="Expand sidebar"
            >
              <PanelLeftOpen size={16} />
            </button>
          )}
        </div>
        <nav className="flex-1 space-y-2">
          {tabs.map((tab) => (
            <Link
              key={tab.label}
              to={tab.path}
              title={isSidebarCollapsed ? undefined : tab.label}
              className={`relative flex items-center ${isSidebarCollapsed ? "justify-center px-2" : "gap-4 px-6"} py-4 rounded-2xl transition-all group ${currentTab === tab.label ? "bg-zinc-50 text-black shadow-sm" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"}`}
            >
              <tab.icon
                size={20}
                className={
                  currentTab === tab.label
                    ? "text-black"
                    : "group-hover:text-slate-600 transition-colors"
                }
              />
              {!isSidebarCollapsed && (
                <span className="font-black text-xs uppercase tracking-wider">
                  {tab.label}
                </span>
              )}
              {isSidebarCollapsed && (
                <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 whitespace-nowrap bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  {tab.label}
                </span>
              )}
              {tab.badge ? (
                <span
                  className={`absolute ${isSidebarCollapsed ? "-top-1 -right-1" : "top-1/2 -translate-y-1/2 right-4"} bg-rose-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse`}
                >
                  {tab.badge}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>
        <button
          onClick={() => {
            localStorage.removeItem("authToken");
            localStorage.removeItem("adminSessionName");
            navigate("/admin-login");
          }}
          title={isSidebarCollapsed ? undefined : "Sign Out"}
          className={`mt-8 flex items-center ${isSidebarCollapsed ? "justify-center px-2" : "gap-4 px-6"} py-4 rounded-2xl text-rose-500 hover:bg-rose-50 transition-all group relative`}
        >
          <LogOut size={20} />
          {!isSidebarCollapsed && (
            <span className="font-black text-xs uppercase tracking-wider">
              Sign Out
            </span>
          )}
          {isSidebarCollapsed && (
            <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 whitespace-nowrap bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
              Sign Out
            </span>
          )}
        </button>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-100 px-12 py-8 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              {currentTab}
            </h1>
            <p className="text-slate-400 text-sm font-medium mt-1">
              Management console for {settings.kiosk.locationName}.
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-200 transition-all">
              <User size={20} />
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-12 bg-[#f8fafc]">
          <ErrorBanner message={error} className="mb-8" />
          <Routes>
            <Route
              path="/"
              element={
                <AdminDashboard
                  insights={insights}
                  visitors={visitors}
                  deliveries={deliveries}
                  keyLogs={keyLogs}
                />
              }
            />
            <Route
              path="/visitors"
              element={
                <LogView
                  title="Visitor Registry"
                  data={visitors}
                  type="visitor"
                  settings={settings}
                  onDelete={deleteRecord}
                  onBulkDelete={bulkDeleteRecords}
                  onUpdate={updateRecord}
                />
              }
            />
            <Route
              path="/deliveries"
              element={
                <LogView
                  title="Delivery Registry"
                  data={deliveries}
                  type="delivery"
                  settings={settings}
                  onDelete={deleteRecord}
                  onBulkDelete={bulkDeleteRecords}
                  onUpdate={updateRecord}
                />
              }
            />
            <Route
              path="/keys"
              element={
                <LogView
                  title="Access Key Activity"
                  data={keyLogs}
                  type="key"
                  settings={settings}
                  onDelete={deleteRecord}
                  onBulkDelete={bulkDeleteRecords}
                  onUpdate={updateRecord}
                />
              }
            />
            <Route
              path="/logistics"
              element={
                <LogView
                  title="Asset Movement Log"
                  data={assetLogs}
                  type="asset"
                  settings={settings}
                  onDelete={deleteRecord}
                  onBulkDelete={bulkDeleteRecords}
                  onUpdate={updateRecord}
                />
              }
            />
            <Route
              path="/notifications"
              element={
                <NotificationLogView
                  logs={notificationLogs}
                  settings={settings}
                />
              }
            />
            <Route
              path="/settings/*"
              element={
                <AdminSettings
                  settings={settings}
                  onUpdate={setSettings}
                  securityAlerts={securityAlerts}
                  onUpdateAlerts={setSecurityAlerts}
                />
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default AdminPortal;
