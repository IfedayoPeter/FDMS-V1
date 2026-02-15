import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  Heart,
  User,
  Clock,
  ChevronRight,
  Bell,
  Mail,
  Loader2,
  Globe,
  Shield,
  Users,
  Check,
  X,
} from "lucide-react";
import { Visitor, NotificationLog, SystemSettings, Host } from "../types";
import { workspaceService } from "../services/workspaceService";
import apiService from "../services/apiService";
import {
  ensureApiSuccess,
  getApiContent,
  getApiErrorMessage,
} from "../services/apiResponse";
import Toast from "./components/Toast";

const DEFAULT_HOST_CO =
  "Your visitor {{visitor_name}} from {{company}} has checked out at {{time}}.";
const DEFAULT_GUEST_CO =
  "Hi {{visitor_name}}, thank you for visiting {{company}}. Safe travels!";
const DEFAULT_HOST_GROUP_CO =
  "Your group of {{group_size}} led by {{visitor_name}} from {{company}} has checked out at {{time}}.";

const CheckOut: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [isDone, setIsDone] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [activeVisitors, setActiveVisitors] = useState<Visitor[]>([]);
  const [checkedOutVisitor, setCheckedOutVisitor] = useState<Visitor | null>(
    null,
  );
  const [securitySession, setSecuritySession] = useState<any>(null);
  const [notificationError, setNotificationError] = useState("");

  // Stage 3: Group Checkout State
  const [groupLeadToConfirm, setGroupLeadToConfirm] = useState<Visitor | null>(
    null,
  );
  const [isCheckingOutWholeGroup, setIsCheckingOutWholeGroup] = useState(false);

  useEffect(() => {
    const sess = localStorage.getItem("securitySession");
    if (!sess) {
      navigate("/security-login?redirect=/check-out");
      return;
    }
    setSecuritySession(JSON.parse(sess));

    const loadActiveVisitors = async () => {
      try {
        const response = await apiService.visitor.getAll({
          filter: "status=In",
          page: 1,
          pageSize: 100,
        });
        setActiveVisitors(getApiContent(response, [], "active visitors"));
      } catch (e) {
        console.error("Failed to load active visitors", e);
      }
    };

    loadActiveVisitors();
  }, [navigate]);

  useEffect(() => {
    if (!notificationError) return;
    const timer = setTimeout(() => setNotificationError(""), 5000);
    return () => clearTimeout(timer);
  }, [notificationError]);

  const handleCheckOut = async (
    visitorId: number,
    checkoutEntireGroup: boolean = false,
  ) => {
    let checkoutCompleted = false;
    try {
      setIsSending(true);

      const visitor = activeVisitors.find((v) => v.id === visitorId);
      if (!visitor) {
        setIsSending(false);
        return;
      }

      const now = new Date().toISOString();
      const processedBy = securitySession?.name;
      const getCheckoutPayload = (v: Visitor): Omit<Visitor, "id"> => {
        const { id: _id, ...visitorWithoutId } = v;
        return {
          ...visitorWithoutId,
          status: "Out",
          checkOutTime: now,
          processedBy,
        };
      };

      // Call API to checkout visitor(s)
      if (checkoutEntireGroup && visitor.groupId) {
        // Checkout all visitors in the group
        const groupVisitors = activeVisitors.filter(
          (v) => v.groupId === visitor.groupId,
        );
        for (const v of groupVisitors) {
          const response = await apiService.visitor.checkOut(
            v.id,
            getCheckoutPayload(v),
          );
          ensureApiSuccess(response, "Failed to checkout visitor");
        }
      } else {
        const response = await apiService.visitor.checkOut(
          visitorId,
          getCheckoutPayload(visitor),
        );
        ensureApiSuccess(response, "Failed to checkout visitor");
      }
      checkoutCompleted = true;
      setCheckedOutVisitor(visitor);
      setIsCheckingOutWholeGroup(checkoutEntireGroup);
      setIsDone(true);

      // Load settings and create notifications
      try {
        const settingsResponse = await apiService.settings.getAll();
        const settings = getApiContent<SystemSettings>(
          settingsResponse,
          null,
          "settings",
        );
        const hostsResponse = await apiService.host.getAll();
        const hosts: Host[] = getApiContent(hostsResponse, [], "hosts");
        const sender =
          settings?.kiosk?.senderEmail || "notifications@system.com";

        if (settings?.notificationsEnabled) {
          const host = hosts.find((h) => h.fullName === visitor.host);
          const groupSize = visitor.groupSize || 1;

          const replaceVars = (template: string) => {
            return (template || "")
              .replace(/{{visitor_name}}/g, visitor.name)
              .replace(/{{host_name}}/g, visitor.host)
              .replace(/{{company}}/g, visitor.company)
              .replace(/{{purpose}}/g, visitor.purpose)
              .replace(/{{location}}/g, visitor.location)
              .replace(/{{time}}/g, new Date().toLocaleTimeString())
              .replace(/{{group_size}}/g, groupSize.toString())
              .replace(/{{email}}/g, visitor.email);
          };

          const template =
            checkoutEntireGroup && visitor.groupId
              ? settings.hostCheckOutTemplate || DEFAULT_HOST_GROUP_CO
              : settings.hostCheckOutTemplate || DEFAULT_HOST_CO;

          const notificationMsg = replaceVars(template);

          // 1. Google Chat Notification
          if (
            host &&
            settings.workspace?.enabled &&
            settings.workspace?.chatNotificationsEnabled
          ) {
            const chatSuccess = await workspaceService.sendChatMessage(
              host,
              notificationMsg,
              settings,
            );
            if (chatSuccess) {
              const response = await apiService.notificationLog.create({
                id: Math.random(),
                visitorName: visitor.name,
                hostName: visitor.host,
                recipient: host.fullName,
                sender: sender,
                recipientRole: "Host",
                trigger: "Check-Out",
                message: notificationMsg,
                timestamp: now,
                status: "Sent",
                channel: "Google Chat",
              } as NotificationLog);
              ensureApiSuccess(response, "Failed to log notification");
            }
          }

          // 2. Email Notifications
          const hostEmail = host?.email || "host@company.com";
          const response = await apiService.notificationLog.create({
            id: Math.random(),
            visitorName: visitor.name,
            hostName: visitor.host,
            recipient: hostEmail,
            sender: sender,
            recipientRole: "Host",
            trigger: "Check-Out",
            message: notificationMsg,
            timestamp: now,
            status: "Sent",
            channel: "Email",
          } as NotificationLog);
          ensureApiSuccess(response, "Failed to log notification");

          const response2 = await apiService.notificationLog.create({
            id: Math.random(),
            visitorName: visitor.name,
            hostName: visitor.host,
            recipient: visitor.email,
            sender: sender,
            recipientRole: "Guest",
            trigger: "Check-Out",
            message: replaceVars(
              settings.guestCheckOutTemplate || DEFAULT_GUEST_CO,
            ),
            timestamp: now,
            status: "Sent",
            channel: "Email",
          } as NotificationLog);
          ensureApiSuccess(response2, "Failed to log notification");

          if (settings.notificationCopyEmail) {
            const response3 = await apiService.notificationLog.create({
              id: Math.random(),
              visitorName: visitor.name,
              hostName: visitor.host,
              recipient: settings.notificationCopyEmail,
              sender: sender,
              recipientRole: "CC",
              trigger: "Check-Out",
              message: `[COPY] ${notificationMsg}`,
              timestamp: now,
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
    } catch (err) {
      console.error(
        "Failed to checkout visitor",
        getApiErrorMessage(err, "Checkout failed"),
      );
    } finally {
      setIsSending(false);
      if (checkoutCompleted) {
        setTimeout(() => navigate("/"), 1400);
      }
    }
  };

  const filtered = activeVisitors.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase()),
  );

  if (isDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rose-600 p-12 text-white text-center font-sans overflow-hidden">
        <Toast
          message={notificationError}
          onClose={() => setNotificationError("")}
        />
        <div className="animate-in zoom-in duration-700">
          <div className="w-48 h-48 bg-white/10 rounded-[5rem] flex items-center justify-center mx-auto mb-16 shadow-2xl border border-white/5 backdrop-blur-xl">
            {isSending ? (
              <Loader2 className="w-24 h-24 animate-spin opacity-40" />
            ) : (
              <Heart className="w-24 h-24" />
            )}
          </div>
          <h1 className="text-7xl font-black mb-6 tracking-tight">
            {isCheckingOutWholeGroup
              ? "Safe Travels, Team"
              : `Safe Travels, ${checkedOutVisitor?.name}`}
          </h1>
          <p className="text-3xl opacity-60 font-medium tracking-wide">
            {isCheckingOutWholeGroup
              ? `The entire group led by ${checkedOutVisitor?.name} has been checked out.`
              : "You have been checked out. Thank you for visiting!"}
          </p>

          <div className="mt-16 max-w-2xl mx-auto flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
            <div className="flex items-center justify-center gap-3 bg-white/10 py-5 px-10 rounded-[2rem] border border-white/10 backdrop-blur-md">
              <Globe size={20} className={isSending ? "animate-bounce" : ""} />
              <div className="text-left">
                <span className="block text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
                  Identity Exit Handshake
                </span>
                <span className="text-xs font-black uppercase tracking-[0.1em]">
                  {isSending
                    ? "Dispatching final cloud notifications..."
                    : `Host and Administration Synchronized`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-12 md:p-24 font-sans">
      <Toast
        message={notificationError}
        onClose={() => setNotificationError("")}
      />
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-4 text-slate-400 hover:text-rose-600 font-black uppercase tracking-[0.3em] text-[10px] transition-colors mb-20"
      >
        <ArrowLeft size={16} /> Back Home
      </button>

      <div className="max-w-2xl mx-auto bg-white rounded-[4rem] shadow-2xl overflow-hidden border border-slate-100 animate-in slide-in-from-bottom-8 duration-500">
        <div className="bg-slate-900 p-16 text-white text-center">
          <h2 className="text-4xl font-black tracking-tight">Departure</h2>
          <div className="flex items-center justify-center gap-2 mt-4 opacity-50">
            <Shield size={12} className="text-rose-400" />
            <p className="font-bold text-[10px] uppercase tracking-[0.3em]">
              Duty Shift: {securitySession?.name}
            </p>
          </div>
        </div>

        <div className="p-16 space-y-12">
          {/* Group Confirmation Overlay/Modal (Stage 3) */}
          {groupLeadToConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="bg-white w-full max-w-md p-10 rounded-[3rem] shadow-2xl animate-in zoom-in-95 duration-500 border border-slate-100 text-center space-y-8">
                <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-indigo-100">
                  <Users size={40} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                    Group Checkout
                  </h3>
                  <p className="text-slate-500 font-medium mt-2">
                    Check out all{" "}
                    <span className="text-indigo-600 font-black">
                      {groupLeadToConfirm.groupSize} members
                    </span>{" "}
                    of the party led by {groupLeadToConfirm.name}?
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => handleCheckOut(groupLeadToConfirm.id, true)}
                    className="w-full py-6 bg-rose-600 text-white font-black rounded-2xl hover:bg-rose-700 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-lg shadow-rose-100"
                  >
                    <Check size={18} /> Yes, Checkout All
                  </button>
                  <button
                    onClick={() => handleCheckOut(groupLeadToConfirm.id, false)}
                    className="w-full py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all uppercase tracking-widest text-[10px]"
                  >
                    Just me
                  </button>
                  <button
                    onClick={() => setGroupLeadToConfirm(null)}
                    className="w-full py-4 text-slate-400 font-black hover:text-slate-600 transition-all uppercase tracking-widest text-[9px]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 transition-colors group-focus-within:text-rose-500" />
            <input
              type="text"
              placeholder="Search your name..."
              className="w-full pl-16 pr-6 py-8 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-4 focus:ring-rose-500/10 focus:bg-white focus:border-rose-300 outline-none font-black text-2xl tracking-tight transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="space-y-6">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">
              Active Visitors ({filtered.length})
            </p>
            {activeVisitors.length === 0 ? (
              <div className="p-24 text-center text-slate-300 border-2 border-dashed border-slate-100 rounded-[3.5rem] bg-slate-50/50">
                <User className="w-16 h-16 mx-auto mb-6 opacity-10" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
                  No visitors currently checked in
                </p>
              </div>
            ) : filtered.length > 0 ? (
              filtered.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    if (v.isGroupLead && v.groupId) {
                      setGroupLeadToConfirm(v);
                    } else {
                      handleCheckOut(v.id, false);
                    }
                  }}
                  className="w-full flex items-center justify-between p-10 bg-slate-50/50 border border-slate-50 rounded-[2.5rem] hover:bg-rose-50 hover:border-rose-200 transition-all group animate-in slide-in-from-top-2 duration-300"
                >
                  <div className="text-left">
                    <div className="flex items-center gap-3">
                      <span className="font-black text-slate-800 text-2xl block tracking-tight group-hover:text-rose-700 transition-colors">
                        {v.name}
                      </span>
                      {v.isGroupLead && (
                        <div className="flex items-center gap-1.5 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                          <Users size={12} className="text-indigo-600" />
                          <span className="text-[8px] font-black uppercase text-indigo-600 tracking-wider">
                            Group Lead ({v.groupSize})
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em] mt-2 block flex items-center gap-2">
                      <Clock size={12} /> Arrived{" "}
                      {new Date(v.checkInTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="bg-white px-8 py-4 rounded-2xl border border-slate-100 text-rose-500 text-[10px] font-black uppercase tracking-widest group-hover:bg-rose-600 group-hover:text-white group-hover:border-rose-600 transition-all shadow-sm">
                    {v.isGroupLead ? "Review Party" : "Confirm"}
                  </div>
                </button>
              ))
            ) : (
              <div className="p-16 text-center text-slate-300 font-black uppercase tracking-[0.2em] text-[10px]">
                No active visitor matching "{search}"
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckOut;
