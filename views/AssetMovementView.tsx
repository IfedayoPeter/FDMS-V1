import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Truck,
  User,
  Phone,
  Mail,
  Check,
  RefreshCcw,
  Search,
  Briefcase,
  UserCheck,
  ShieldCheck,
  UserCog,
  Clock3,
  Activity,
  FileCheck,
  Shield,
} from "lucide-react";
import { AssetMovement, AssetStatus, MovementReason } from "../types";
import apiService from "../services/apiService";
import { LoadingOverlay, LoadingState } from "./components/Loading";
import ConfirmActionModal from "./components/ConfirmActionModal";
import ErrorBanner from "./components/ErrorBanner";
import {
  ensureApiSuccess,
  getApiContent,
  getApiErrorMessage,
} from "../services/apiResponse";

const AssetMovementView: React.FC = () => {
  const navigate = useNavigate();
  const statusOptions: AssetStatus[] = ["Off-site", "In-transit", "On-site"];
  const [mode, setMode] = useState<
    "selection" | "checkout" | "return" | "success"
  >("selection");
  const [activeAssets, setActiveAssets] = useState<AssetMovement[]>([]);
  const [movementReasons, setMovementReasons] = useState<MovementReason[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingOverlay, setLoadingOverlay] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState(
    "Loading Asset Movements",
  );
  const [error, setError] = useState("");
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const resolveProcessedBy = () => {
    const adminName = localStorage.getItem("adminSessionName");
    if (adminName) return adminName;
    const securitySessionRaw = localStorage.getItem("securitySession");
    if (securitySessionRaw) {
      try {
        const parsed = JSON.parse(securitySessionRaw);
        if (parsed?.name) return parsed.name;
      } catch {
        // Ignore parse errors and use fallback
      }
    }
    return "Security Officer";
  };
  const processedBy = resolveProcessedBy();
  const toDateTimeInputValue = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };

  // Fix: Added missing staffInCharge property to match AssetMovement interface
  const [formData, setFormData] = useState({
    equipmentName: "",
    staffInCharge: "",
    borrowerName: "",
    phone: "",
    email: "",
    reason: "",
    status: "Off-site" as AssetStatus,
    processedBy,
  });

  const [returnData, setReturnData] = useState({
    status: "On-site" as AssetStatus,
    returnerName: "",
    returningStaffName: "",
    receiverName: "",
    securityName: processedBy,
    condition: "Good" as "Good" | "Damaged" | "Needs Service",
    maintenanceNotes: "",
    returnTime: toDateTimeInputValue(new Date().toISOString()),
    processedBy,
  });

  const requestConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
  ) => {
    setConfirmAction({ title, message, onConfirm });
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");
      setLoadingOverlay(true);
      setLoadingMessage("Loading Asset Movements");
      try {
        // Load active asset movements from API
        const allAssetsResponse = await apiService.assetMovement.getAll();
        const allAssets = getApiContent<AssetMovement[]>(allAssetsResponse, []);
        setActiveAssets(allAssets.filter((a) => a.status !== "On-site"));

        // Load movement reasons from API
        const reasonsResponse = await apiService.movementReason.getAll();
        const reasonsList = getApiContent<MovementReason[]>(
          reasonsResponse,
          [],
        );
        if (reasonsList.length > 0) {
          setMovementReasons(reasonsList);
          setFormData((prev) => ({ ...prev, reason: reasonsList[0].name }));
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
          setFormData((prev) => ({ ...prev, reason: defaults[0].name }));
        }
      } catch (err) {
        console.error("Failed to load asset data", err);
        setError(getApiErrorMessage(err, "Failed to load asset data"));
      } finally {
        setLoading(false);
        setLoadingOverlay(false);
      }
    };

    loadData();
  }, []);

  const performCheckout = async () => {
    try {
      setError("");
      setLoadingOverlay(true);
      setLoadingMessage("Recording Asset Checkout");
      const newRecord: AssetMovement = {
        id: Math.random(),
        ...formData,
        status: formData.status || ("Off-site" as AssetStatus),
        checkoutTime: new Date().toISOString(),
        processedBy: formData.processedBy || processedBy,
      };

      // Create asset movement via API
      const response = await apiService.assetMovement.checkout(newRecord);
      ensureApiSuccess(response);

      setMode("success");
      setTimeout(() => navigate("/"), 3000);
    } catch (err) {
      console.error("Failed to create asset movement", err);
      setError(getApiErrorMessage(err, "Failed to save asset movement"));
    } finally {
      setLoadingOverlay(false);
    }
  };

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    requestConfirm(
      "Confirm Asset Checkout",
      `Record ${formData.equipmentName || "this asset"} to ${formData.borrowerName || "this borrower"} as ${formData.status}?`,
      performCheckout,
    );
  };

  const performReturn = async (id: number) => {
    const requiredFields = [
      { key: "returnerName", label: "Returner Name" },
      { key: "returningStaffName", label: "Returning Staff" },
      { key: "receiverName", label: "Receiver Name" },
      { key: "securityName", label: "Security Witness" },
      { key: "returnTime", label: "Return Time" },
      { key: "status", label: "Status" },
      { key: "condition", label: "Condition" },
    ] as const;

    const missing = requiredFields
      .filter(({ key }) => {
        const value = returnData[key];
        return typeof value === "string" ? !value.trim() : !value;
      })
      .map(({ label }) => label);

    if (missing.length > 0) {
      setError(`Please provide: ${missing.join(", ")}.`);
      return;
    }

    try {
      setError("");
      setLoadingOverlay(true);
      setLoadingMessage("Recording Asset Return");
      const selectedAsset = activeAssets.find((asset) => asset.id === id);
      if (!selectedAsset) {
        setError("Selected asset was not found. Please refresh and try again.");
        return;
      }
      // Return asset via API
      const response = await apiService.assetMovement.return(id, {
        equipmentName: selectedAsset.equipmentName,
        staffInCharge: selectedAsset.staffInCharge,
        borrowerName: selectedAsset.borrowerName,
        phone: selectedAsset.phone,
        email: selectedAsset.email,
        reason: selectedAsset.reason,
        targetCampus: selectedAsset.targetCampus || undefined,
        checkoutTime: selectedAsset.checkoutTime || new Date().toISOString(),
        status: returnData.status,
        returnerName: returnData.returnerName.trim(),
        returningStaffName: returnData.returningStaffName.trim(),
        receiverName: returnData.receiverName.trim(),
        securityName: returnData.securityName.trim(),
        condition: returnData.condition,
        maintenanceNotes: returnData.maintenanceNotes.trim() || undefined,
        returnTime: new Date(returnData.returnTime).toISOString(),
        processedBy: returnData.processedBy || processedBy,
      });
      ensureApiSuccess(response);

      setMode("success");
      setTimeout(() => navigate("/"), 3000);
    } catch (err) {
      console.error("Failed to return asset", err);
      setError(getApiErrorMessage(err, "Failed to return asset"));
    } finally {
      setLoadingOverlay(false);
    }
  };

  const handleReturn = (id: number) => {
    if (!returnData.returnerName.trim()) {
      setError("Please enter the name of the person returning the item.");
      return;
    }
    const asset = activeAssets.find((a) => a.id === id);
    requestConfirm(
      "Confirm Asset Return",
      `Mark ${asset?.equipmentName || "this asset"} as returned by ${returnData.returnerName}?`,
      () => performReturn(id),
    );
  };

  if (mode === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-600 text-white text-center p-6">
        <div className="animate-in zoom-in duration-300">
          <Check className="w-24 h-24 mx-auto mb-6 opacity-40" />
          <h1 className="text-4xl font-bold mb-4">Update Successful!</h1>
          <p className="text-xl">Asset record has been synchronized.</p>
        </div>
      </div>
    );
  }

  if (mode === "selection") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        {loadingOverlay && <LoadingOverlay message={loadingMessage} />}
        <ConfirmActionModal
          confirmAction={confirmAction}
          onClose={() => setConfirmAction(null)}
        />
        <button
          onClick={() => navigate("/")}
          className="absolute top-8 left-8 flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" /> Back Home
        </button>
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
          <button
            onClick={() => setMode("checkout")}
            className="bg-white p-12 rounded-3xl shadow-xl hover:shadow-2xl transition-all flex flex-col items-center border-2 border-transparent hover:border-blue-500 group"
          >
            <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Truck className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800">
              Checkout Asset
            </h2>
            <p className="text-slate-500 mt-2 text-center">
              Log an item leaving the campus.
            </p>
          </button>
          <button
            onClick={() => setMode("return")}
            className="bg-white p-12 rounded-3xl shadow-xl hover:shadow-2xl transition-all flex flex-col items-center border-2 border-transparent hover:border-emerald-500 group"
          >
            <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <RefreshCcw className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800">Return Asset</h2>
            <p className="text-slate-500 mt-2 text-center">
              Mark a borrowed item as returned.
            </p>
          </button>
        </div>
      </div>
    );
  }

  if (mode === "checkout") {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-12">
        {loadingOverlay && <LoadingOverlay message={loadingMessage} />}
        <ConfirmActionModal
          confirmAction={confirmAction}
          onClose={() => setConfirmAction(null)}
        />
        <button
          onClick={() => setMode("selection")}
          className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors mb-8"
        >
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
        <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-blue-600 p-8 text-white">
            <h2 className="text-2xl font-bold">Asset Movement (Checkout)</h2>
          </div>
          <form onSubmit={handleCheckout} className="p-8 space-y-6">
            <ErrorBanner message={error} />
            <div className="p-5 bg-blue-50/70 border-2 border-blue-200 rounded-2xl shadow-sm">
              <label className="block text-xs font-black text-blue-700 uppercase tracking-widest mb-3">
                Initial Status (Required)
              </label>
              <input
                list="asset-status-options"
                required
                className="w-full px-4 py-3 border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold text-slate-800"
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as AssetStatus,
                  })
                }
                placeholder="Select or type a status"
              />
              <datalist id="asset-status-options">
                {statusOptions.map((status) => (
                  <option key={status} value={status} />
                ))}
              </datalist>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-blue-500">
                Choose from the list or type a custom status.
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Equipment Name
              </label>
              <input
                required
                type="text"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.equipmentName}
                onChange={(e) =>
                  setFormData({ ...formData, equipmentName: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Staff in Charge
              </label>
              <div className="relative">
                <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  required
                  type="text"
                  placeholder="Assigned staff member name"
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.staffInCharge}
                  onChange={(e) =>
                    setFormData({ ...formData, staffInCharge: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Borrower Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  required
                  type="text"
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.borrowerName}
                  onChange={(e) =>
                    setFormData({ ...formData, borrowerName: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    required
                    type="tel"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    required
                    type="email"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Processed By
              </label>
              <div className="relative">
                <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  readOnly
                  type="text"
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-600"
                  value={formData.processedBy}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Reason for Movement
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select
                  required
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                >
                  {movementReasons.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 shadow-lg transition-all"
            >
              Log Asset Movement
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      {loadingOverlay && <LoadingOverlay message={loadingMessage} />}
      <ConfirmActionModal
        confirmAction={confirmAction}
        onClose={() => setConfirmAction(null)}
      />
      <button
        onClick={() => setMode("selection")}
        className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 transition-colors mb-8"
      >
        <ArrowLeft className="w-5 h-5" /> Back
      </button>
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="bg-emerald-600 p-8 text-white">
          <h2 className="text-2xl font-bold">Return Asset</h2>
        </div>
        <div className="p-8 space-y-6">
          <ErrorBanner message={error} />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by equipment or borrower..."
              className="w-full pl-10 pr-4 py-4 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Name of Person Physically Returning It
            </label>
            <input
              type="text"
              placeholder="Full Name"
              className="w-full px-4 py-4 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              value={returnData.returnerName}
              onChange={(e) =>
                setReturnData({ ...returnData, returnerName: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Returning Staff
              </label>
              <div className="relative">
                <UserCog className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  value={returnData.returningStaffName}
                  onChange={(e) =>
                    setReturnData({
                      ...returnData,
                      returningStaffName: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Receiver Name
              </label>
              <div className="relative">
                <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  value={returnData.receiverName}
                  onChange={(e) =>
                    setReturnData({
                      ...returnData,
                      receiverName: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Security Witness
              </label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  value={returnData.securityName}
                  onChange={(e) =>
                    setReturnData({
                      ...returnData,
                      securityName: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Return Time
              </label>
              <div className="relative">
                <Clock3 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="datetime-local"
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  value={returnData.returnTime}
                  onChange={(e) =>
                    setReturnData({
                      ...returnData,
                      returnTime: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Status
              </label>
              <div className="relative">
                <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 appearance-none bg-white"
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
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Condition
              </label>
              <div className="relative">
                <FileCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 appearance-none bg-white"
                  value={returnData.condition}
                  onChange={(e) =>
                    setReturnData({
                      ...returnData,
                      condition: e.target.value as
                        | "Good"
                        | "Damaged"
                        | "Needs Service",
                    })
                  }
                >
                  {["Good", "Damaged", "Needs Service"].map((condition) => (
                    <option key={condition} value={condition}>
                      {condition}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Maintenance Notes
            </label>
            <textarea
              rows={3}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              value={returnData.maintenanceNotes}
              onChange={(e) =>
                setReturnData({
                  ...returnData,
                  maintenanceNotes: e.target.value,
                })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Processed By
            </label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                readOnly
                type="text"
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-600"
                value={returnData.processedBy}
              />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Select Item to Return
            </p>
            {loading ? (
              <LoadingState message="Loading active assets..." />
            ) : activeAssets.length > 0 ? (
              activeAssets
                .filter(
                  (a) =>
                    a.equipmentName
                      .toLowerCase()
                      .includes(search.toLowerCase()) ||
                    a.borrowerName.toLowerCase().includes(search.toLowerCase()),
                )
                .map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => handleReturn(asset.id)}
                    className="w-full flex items-center justify-between p-5 border border-slate-100 rounded-2xl hover:bg-emerald-50 hover:border-emerald-200 transition-all text-left group"
                  >
                    <div>
                      <span className="font-bold block text-slate-800">
                        {asset.equipmentName}
                      </span>
                      <span className="text-xs text-slate-500">
                        {asset.borrowerName} • Reason: {asset.reason}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white px-3 py-1 rounded-full transition-colors">
                      Confirm Return
                    </div>
                  </button>
                ))
            ) : (
              <div className="py-12 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl">
                No equipment is currently off-site.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetMovementView;
