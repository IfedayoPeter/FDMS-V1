import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Package,
  Camera,
  RefreshCw,
  Check,
  Building,
  User,
  Phone,
  Mail,
  Hash,
  FileText,
  UserCheck,
} from "lucide-react";
import { DeliveryRecord } from "../types";
import apiService from "../services/apiService";
import {
  ensureApiSuccess,
  getApiContent,
  getApiErrorMessage,
} from "../services/apiResponse";
import ErrorBanner from "./components/ErrorBanner";

type DeliveryTypeOption = {
  id: number;
  name: string;
  description?: string;
  isActive?: boolean;
};

const DeliveryEntry: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"form" | "photo" | "success">("form");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [deliveryTypes, setDeliveryTypes] = useState<DeliveryTypeOption[]>([]);
  const [loadingDeliveryTypes, setLoadingDeliveryTypes] = useState(true);

  const resolveProcessedBy = () => {
    const adminName = localStorage.getItem("adminSessionName");
    if (adminName) return adminName;
    const securitySessionRaw = localStorage.getItem("securitySession");
    if (securitySessionRaw) {
      try {
        const parsed = JSON.parse(securitySessionRaw);
        if (parsed?.name) return parsed.name;
      } catch {
        // Ignore parse errors and fall through
      }
    }
    return "Front Desk Officer";
  };

  const toDateTimeInputValue = (value: Date) => {
    const local = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };

  const [formData, setFormData] = useState({
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
    notes: "",
    location: "Main Desk",
    deliveryTime: toDateTimeInputValue(new Date()),
    processedBy: resolveProcessedBy(),
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (step === "photo" && !capturedImage) {
      startCamera();
    }
    return () => stopCamera();
  }, [step, capturedImage]);

  useEffect(() => {
    const controller = new AbortController();
    const loadDeliveryTypes = async () => {
      setLoadingDeliveryTypes(true);
      try {
        const response = await apiService.deliveryType.getAll({
          page: 1,
          pageSize: 100,
        }, { signal: controller.signal });
        const types = getApiContent<DeliveryTypeOption[]>(
          response,
          [],
          "delivery types",
        ).filter((t) => t?.name && t?.isActive !== false);

        setDeliveryTypes(types);
        if (types.length > 0) {
          setFormData((prev) => {
            const hasCurrent = types.some((t) => t.name === prev.packageType);
            return {
              ...prev,
              packageType: hasCurrent ? prev.packageType : types[0].name,
            };
          });
        }
      } catch (err) {
        if ((err as any)?.name === "AbortError") return;
        console.error("Failed to load delivery types", err);
        setError(getApiErrorMessage(err, "Failed to load delivery types"));
      } finally {
        setLoadingDeliveryTypes(false);
      }
    };

    void loadDeliveryTypes();
    return () => controller.abort();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      setError("Unable to access camera. Please check permissions.");
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
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        setCapturedImage(canvas.toDataURL("image/jpeg"));
        stopCamera();
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("photo");
  };

  const handleFinalSubmit = async () => {
    try {
      const selectedDeliveryTime = new Date(formData.deliveryTime);
      const normalizedTimestamp = Number.isNaN(selectedDeliveryTime.getTime())
        ? new Date().toISOString()
        : selectedDeliveryTime.toISOString();

      const newRecord: Omit<DeliveryRecord, "id"> = {
        company: formData.company,
        personName: formData.personName,
        phone: formData.phone,
        email: formData.email,
        deliveryFor: formData.deliveryFor,
        receivedBy: formData.receivedBy,
        packageType: formData.packageType,
        itemName: formData.itemName,
        packageCount: formData.packageCount,
        trackingNumber: formData.trackingNumber,
        notes: formData.notes,
        location: formData.location,
        photo: capturedImage || undefined,
        timestamp: normalizedTimestamp,
        processedBy: formData.processedBy || resolveProcessedBy(),
      };

      // Create delivery via API
      const response = await apiService.delivery.create(newRecord);
      ensureApiSuccess(response, "Failed to save delivery record");

      setStep("success");
      setTimeout(() => navigate("/"), 3000);
    } catch (err) {
      console.error("Failed to save delivery", err);
      setError(getApiErrorMessage(err, "Failed to save delivery record"));
    }
  };

  const showMoreInfoField = useMemo(() => {
    const selectedType = deliveryTypes.find((t) => t.name === formData.packageType);
    const description = (selectedType?.description || "").toLowerCase();
    const requiresFromDescription =
      description.includes("require") &&
      (description.includes("detail") ||
        description.includes("description") ||
        description.includes("item"));

    const requiresFromLegacyName = [
      "Food",
      "Building Materials",
      "Electronics",
      "Furniture",
      "Equipment",
      "Other",
    ].includes(formData.packageType);

    return requiresFromDescription || requiresFromLegacyName;
  }, [deliveryTypes, formData.packageType]);

  if (step === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-600 text-white text-center p-6">
        <div className="animate-in zoom-in duration-300">
          <Check className="w-24 h-24 mx-auto mb-6 opacity-40" />
          <h1 className="text-4xl font-bold mb-4">Delivery Logged!</h1>
          <p className="text-xl opacity-90">Verification saved. Thank you.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <button
        onClick={() => (step === "photo" ? setStep("form") : navigate("/"))}
        className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 transition-colors mb-8"
      >
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>

      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="bg-emerald-600 p-8 text-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Delivery Entry</h2>
            <p className="opacity-80">Log incoming packages and couriers.</p>
          </div>
          <Package className="w-8 h-8 opacity-40" />
        </div>

        {step === "form" ? (
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Delivery Company
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    required
                    type="text"
                    placeholder="e.g. FedEx, UPS, DHL"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    value={formData.company}
                    onChange={(e) =>
                      setFormData({ ...formData, company: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Driver Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    required
                    type="text"
                    placeholder="Full Name"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    value={formData.personName}
                    onChange={(e) =>
                      setFormData({ ...formData, personName: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Driver Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    required
                    type="tel"
                    placeholder="000-000-0000"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Delivery Intended For
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    required
                    type="text"
                    placeholder="Person receiving package"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    value={formData.deliveryFor}
                    onChange={(e) =>
                      setFormData({ ...formData, deliveryFor: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Physically Received By
                </label>
                <div className="relative">
                  <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    required
                    type="text"
                    placeholder="Staff member name"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    value={formData.receivedBy}
                    onChange={(e) =>
                      setFormData({ ...formData, receivedBy: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Package Type
                </label>
                <select
                  required
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  value={formData.packageType}
                  disabled={loadingDeliveryTypes}
                  onChange={(e) =>
                    setFormData({ ...formData, packageType: e.target.value })
                  }
                >
                  {loadingDeliveryTypes && (
                    <option value="">Loading package types...</option>
                  )}
                  {!loadingDeliveryTypes && deliveryTypes.length === 0 && (
                    <option value="">No package types available</option>
                  )}
                  {!loadingDeliveryTypes &&
                    deliveryTypes.map((type) => (
                      <option key={type.id} value={type.name}>
                        {type.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Package Count
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    required
                    type="number"
                    min="1"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    value={formData.packageCount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        packageCount: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              {showMoreInfoField && (
                <div className="md:col-span-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Contents / Item Description
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      required
                      type="text"
                      placeholder="Specify items (e.g. 2x Hot Pizza, Dell Monitor)"
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                      value={formData.itemName}
                      onChange={(e) =>
                        setFormData({ ...formData, itemName: e.target.value })
                      }
                    />
                  </div>
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Delivery Time
                </label>
                <input
                  required
                  type="datetime-local"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  value={formData.deliveryTime}
                  onChange={(e) =>
                    setFormData({ ...formData, deliveryTime: e.target.value })
                  }
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Processed By
                </label>
                <input
                  type="text"
                  readOnly
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-600"
                  value={formData.processedBy}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Tracking Number
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Optional"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    value={formData.trackingNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        trackingNumber: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl hover:bg-emerald-700 transition-all shadow-lg"
            >
              Next: Take Verification Photo
            </button>
          </form>
        ) : (
          <div className="p-8 flex flex-col items-center gap-8">
            <div className="relative w-full aspect-video bg-slate-100 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
              {capturedImage ? (
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-full object-cover"
                />
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                </>
              )}
            </div>
            <div className="flex gap-4 w-full">
              {!capturedImage ? (
                <button
                  onClick={takePhoto}
                  className="flex-grow bg-emerald-600 text-white font-bold py-4 rounded-xl hover:bg-emerald-700 transition-colors shadow-lg flex items-center justify-center gap-2"
                >
                  <Camera className="w-5 h-5" /> Take Photo
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setCapturedImage(null);
                      startCamera();
                    }}
                    className="flex-1 bg-slate-100 text-slate-700 font-bold py-4 rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-5 h-5" /> Retake
                  </button>
                  <button
                    onClick={handleFinalSubmit}
                    className="flex-1 bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" /> Confirm & Complete
                  </button>
                </>
              )}
            </div>
            <ErrorBanner message={error} />
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryEntry;
