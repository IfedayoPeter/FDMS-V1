/**
 * Backend API Service Layer
 * Centralized service for all backend API calls
 * Replaces localStorage with backend database calls
 */

import {
  Visitor,
  WatchlistEntry,
  SecurityOfficer,
  SecurityAlert,
  DeliveryRecord,
  AssetMovement,
  KeyLog,
  Host,
  KeyAsset,
  MovementReason,
  VisitorReason,
  NotificationLog,
  SystemSettings,
  CreateKeyLogDto,
  UpdateKeyLogDto,
} from "../types";

type CreateVisitorRequest = Omit<Visitor, "id" | "checkOutTime">;
type UpdateVisitorRequest = Omit<Visitor, "id">;

// Configuration
const rawApiBaseUrl =
  import.meta.env.VITE_API_URL ||
  process.env.REACT_APP_API_URL ||
  "https://localhost:7146/api";

const API_BASE_URL = (() => {
  let resolved = String(rawApiBaseUrl).trim().replace(/\/+$/, "");

  // Prevent mixed-content failures when frontend is served over HTTPS (e.g., Vercel).
  if (
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    resolved.startsWith("http://")
  ) {
    resolved = resolved.replace("http://", "https://");
  }

  return resolved;
})();
// const TIMEOUT = 10000; // 10 seconds

interface ApiResponse<T> {
  data?: T;
  totalCount?: number;
  message?: string;
  statusCode?: number;
  errors?: string[];
}

interface ApiError {
  statusCode: number;
  message: string;
  errors?: string[];
}

interface ApiEnvelopeLike {
  hasError?: boolean;
  isSuccess?: boolean;
  errorMessage?: string;
  message?: string;
}

export const ACTION_FEEDBACK_EVENT = "fdm:action-feedback";

export type ActionFeedbackPhase = "loading" | "success" | "error";

export type ActionFeedbackPayload = {
  actionId: number;
  phase: ActionFeedbackPhase;
  message: string;
};

const isApiEnvelope = (payload: unknown): payload is ApiEnvelopeLike =>
  typeof payload === "object" &&
  payload !== null &&
  ("hasError" in payload || "isSuccess" in payload);

const isMutationMethod = (method: string) =>
  ["POST", "PUT", "DELETE"].includes(method.toUpperCase());

const shouldShowMutationPopup = (endpoint: string) => {
  const lower = endpoint.toLowerCase();
  if (lower.includes("/notificationlogs")) return false;
  if (lower.includes("/admin/login")) return false;
  if (lower.includes("/baseuser/login")) return false;
  if (lower.includes("/securityofficers/authenticate")) return false;
  return true;
};

const emitActionFeedback = (payload: ActionFeedbackPayload) => {
  if (typeof window === "undefined" || !payload.message.trim()) return;
  window.dispatchEvent(
    new CustomEvent(ACTION_FEEDBACK_EVENT, {
      detail: payload,
    }),
  );
};

const getActionVerb = (method: string) => {
  const upper = method.toUpperCase();
  if (upper === "POST") return "CREATING";
  if (upper === "PUT" || upper === "PATCH") return "UPDATING";
  if (upper === "DELETE") return "DELETING";
  return "PROCESSING";
};

const getActionTarget = (endpoint: string) => {
  const cleaned = endpoint.split("?")[0];
  const segments = cleaned
    .split("/")
    .filter(Boolean)
    .filter((segment) => isNaN(Number(segment)));

  const firstSegment = segments[0];
  if (!firstSegment) return "RECORD";
  if (firstSegment.toLowerCase() === "api" && segments[1]) {
    return segments[1].replace(/-/g, " ").replace(/s$/i, "").toUpperCase();
  }
  return firstSegment.replace(/-/g, " ").replace(/s$/i, "").toUpperCase();
};

let actionFeedbackCounter = 0;

// Utility function for API calls
async function apiCall<T>(
  method: string,
  endpoint: string,
  body?: any,
  queryParams?: Record<string, any>,
): Promise<T> {
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = new URL(`${API_BASE_URL}${normalizedEndpoint}`);
  const mutationCall = isMutationMethod(method);
  const notifyMutation = mutationCall && shouldShowMutationPopup(endpoint);
  const actionId = ++actionFeedbackCounter;
  const loadingMessage = `${getActionVerb(method)} ${getActionTarget(endpoint)}...`;

  if (queryParams) {
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const controller = new AbortController();
  // const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    if (notifyMutation) {
      emitActionFeedback({
        actionId,
        phase: "loading",
        message: loadingMessage,
      });
    }

    const response = await fetch(url.toString(), {
      ...options,
      signal: controller.signal,
    });

    // clearTimeout(timeoutId);

    const rawResponse = await response.text();
    let parsedResponse: any = null;
    if (rawResponse) {
      try {
        parsedResponse = JSON.parse(rawResponse);
      } catch {
        parsedResponse = null;
      }
    }

    if (!response.ok) {
      const errorData = parsedResponse || {};
      const envelopeError =
        isApiEnvelope(errorData) &&
        (errorData.hasError || errorData.isSuccess === false)
          ? errorData.message
          : undefined;
      const error: ApiError = {
        statusCode: response.status,
        message:
          envelopeError || errorData.message || `HTTP ${response.status}`,
        errors: errorData.errors,
      };
      if (notifyMutation) {
        emitActionFeedback({
          actionId,
          phase: "error",
          message: `Action failed: ${error.message}`,
        });
      }
      throw error;
    }

    if (
      isApiEnvelope(parsedResponse) &&
      (parsedResponse.hasError || parsedResponse.isSuccess === false)
    ) {
      const message = parsedResponse.message || "Request failed";
      if (notifyMutation) {
        emitActionFeedback({
          actionId,
          phase: "error",
          message: `Action failed: ${message}`,
        });
      }
      throw {
        statusCode: response.status,
        message,
      } as ApiError;
    }

    if (notifyMutation) {
      const successMessage =
        isApiEnvelope(parsedResponse) && parsedResponse.message
          ? parsedResponse.message
          : "Action completed successfully.";
      emitActionFeedback({
        actionId,
        phase: "success",
        message: successMessage,
      });
    }

    return parsedResponse as T;
  } catch (error) {
    // clearTimeout(timeoutId);
    if (
      error instanceof TypeError &&
      error.message.includes("Failed to fetch")
    ) {
      if (notifyMutation) {
        emitActionFeedback({
          actionId,
          phase: "error",
          message:
            "Action failed: Failed to connect to backend. Please check the server is running.",
        });
      }
      throw {
        statusCode: 0,
        message:
          "Failed to connect to backend. Please check the server is running.",
      } as ApiError;
    }
    throw error;
  }
}

// ============================================================
// VISITOR MANAGEMENT
// ============================================================

export const visitorAPI = {
  checkIn: (visitor: CreateVisitorRequest) => {
    return apiCall<{ id: number; checkInTime: string }>(
      "POST",
      "/Visitors/check-in",
      visitor,
    );
  },

  getAll: (filters?: {
    search?: string;
    filter?: string;
    page?: number;
    pageSize?: number;
    select?: string;
    orderBy?: string;
    orderDirection?: number;
  }) => {
    return apiCall<any>("GET", "/Visitors", undefined, filters);
  },

  getById: (id: number) => {
    return apiCall<Visitor>("GET", `/Visitors/${id}`);
  },

  checkOut: (id: number, data: UpdateVisitorRequest) => {
    return apiCall<{ id: number; status: string; checkOutTime: string }>(
      "PUT",
      `/Visitors/${id}/check-out`,
      data,
    );
  },

  update: (id: number, data: Partial<Visitor>) => {
    return apiCall<void>("PUT", `/Visitors/${id}`, data);
  },

  delete: (id: number) => {
    return apiCall<void>("DELETE", `/Visitors/${id}`);
  },

  bulkDelete: (ids: number[]) => {
    return apiCall<void>("DELETE", "/Visitors/bulk-delete", ids);
  },

  import: (data: any[]) => {
    return apiCall<void>("POST", "/Visitors/import", data);
  },
};

// ============================================================
// WATCHLIST MANAGEMENT
// ============================================================

export const watchlistAPI = {
  create: (entry: Omit<WatchlistEntry, "id" | "addedAt">) => {
    return apiCall<{ id: number; addedAt: string }>(
      "POST",
      "/Watchlist",
      entry,
    );
  },

  getAll: (filters?: {
    search?: string;
    filter?: string;
    page?: number;
    pageSize?: number;
    select?: string;
    orderBy?: string;
    orderDirection?: number;
  }) => {
    return apiCall<any>("GET", "/Watchlist", undefined, filters);
  },

  getById: (id: number) => {
    return apiCall<WatchlistEntry>("GET", `/Watchlist/${id}`);
  },

  update: (id: number, data: Partial<WatchlistEntry>) => {
    return apiCall<void>("PUT", `/Watchlist/${id}`, data);
  },

  delete: (id: number) => {
    return apiCall<void>("DELETE", `/Watchlist/${id}`);
  },

  bulkDelete: (ids: number[]) => {
    return apiCall<void>("DELETE", "/Watchlist/bulk-delete", ids);
  },

  import: (data: any[]) => {
    return apiCall<void>("POST", "/Watchlist/import", data);
  },
};

// ============================================================
// SECURITY OFFICER MANAGEMENT
// ============================================================

export const securityOfficerAPI = {
  create: (officer: Omit<SecurityOfficer, "id" | "addedAt">) => {
    return apiCall<{ id: number; status: string; addedAt: string }>(
      "POST",
      "/SecurityOfficers",
      officer,
    );
  },

  getAll: (filters?: {
    search?: string;
    filter?: string;
    page?: number;
    pageSize?: number;
    select?: string;
    orderBy?: string;
    orderDirection?: number;
  }) => {
    return apiCall<any>("GET", "/SecurityOfficers", undefined, filters);
  },

  getById: (id: number) => {
    return apiCall<SecurityOfficer>("GET", `/SecurityOfficers/${id}`);
  },

  authenticate: (badgeId: string, pin: string) => {
    return apiCall<any>("POST", "/SecurityOfficers/authenticate", undefined, {
      badgeId,
      pin,
    });
  },

  update: (id: number, data: Partial<SecurityOfficer>) => {
    return apiCall<void>("PUT", `/SecurityOfficers/${id}`, data);
  },

  delete: (id: number) => {
    return apiCall<void>("DELETE", `/SecurityOfficers/${id}`);
  },

  bulkDelete: (ids: number[]) => {
    return apiCall<void>("DELETE", "/SecurityOfficers/bulk-delete", ids);
  },

  import: (data: any[]) => {
    return apiCall<void>("POST", "/SecurityOfficers/import", data);
  },
};

// ============================================================
// SECURITY ALERTS
// ============================================================

export const securityAlertAPI = {
  create: (alert: Omit<SecurityAlert, "id" | "timestamp" | "status">) => {
    return apiCall<{ id: number; timestamp: string; status: string }>(
      "POST",
      "/SecurityAlerts",
      alert,
    );
  },

  getAll: (filters?: {
    search?: string;
    filter?: string;
    page?: number;
    pageSize?: number;
    select?: string;
    orderBy?: string;
    orderDirection?: number;
  }) => {
    return apiCall<any>("GET", "/SecurityAlerts", undefined, filters);
  },

  getById: (id: number) => {
    return apiCall<SecurityAlert>("GET", `/SecurityAlerts/${id}`);
  },

  update: (id: number, data: Partial<SecurityAlert>) => {
    return apiCall<void>("PUT", `/SecurityAlerts/${id}`, data);
  },

  delete: (id: number) => {
    return apiCall<void>("DELETE", `/SecurityAlerts/${id}`);
  },

  import: (data: any[]) => {
    return apiCall<void>("POST", "/SecurityAlerts/import", data);
  },
};

// ============================================================
// DELIVERY MANAGEMENT
// ============================================================

export const deliveryAPI = {
  create: (delivery: Omit<DeliveryRecord, "id">) => {
    return apiCall<{ id: number; timestamp: string }>(
      "POST",
      "/Deliveries",
      delivery,
    );
  },

  getAll: (filters?: {
    search?: string;
    filter?: string;
    page?: number;
    pageSize?: number;
    select?: string;
    orderBy?: string;
    orderDirection?: number;
  }) => {
    return apiCall<any>("GET", "/Deliveries", undefined, filters);
  },

  getById: (id: number) => {
    return apiCall<DeliveryRecord>("GET", `/Deliveries/${id}`);
  },

  update: (id: number, data: Partial<DeliveryRecord>) => {
    return apiCall<void>("PUT", `/Deliveries/${id}`, data);
  },

  delete: (id: number) => {
    return apiCall<void>("DELETE", `/Deliveries/${id}`);
  },

  bulkDelete: (ids: number[]) => {
    return apiCall<void>("DELETE", "/Deliveries/bulk-delete", ids);
  },

  import: (data: any[]) => {
    return apiCall<void>("POST", "/Deliveries/import", data);
  },
};

// ============================================================
// ASSET MOVEMENT
// ============================================================

export const assetMovementAPI = {
  checkout: (
    asset: Omit<AssetMovement, "id" | "status" | "checkoutTime" | "returnTime">,
  ) => {
    return apiCall<{ id: number; status: string; checkoutTime: string }>(
      "POST",
      "/AssetMovements",
      asset,
    );
  },

  getAll: (filters?: {
    search?: string;
    filter?: string;
    page?: number;
    pageSize?: number;
    select?: string;
    orderBy?: string;
    orderDirection?: number;
  }) => {
    return apiCall<any>("GET", "/AssetMovements", undefined, filters);
  },

  getById: (id: number) => {
    return apiCall<AssetMovement>("GET", `/AssetMovements/${id}`);
  },

  return: (id: number, data: Partial<AssetMovement>) => {
    return apiCall<{ id: number; status: string; returnTime: string }>(
      "PUT",
      `/AssetMovements/${id}/return`,
      data,
    );
  },

  update: (id: number, data: Partial<AssetMovement>) => {
    return apiCall<void>("PUT", `/AssetMovements/${id}`, data);
  },

  delete: (id: number) => {
    return apiCall<void>("DELETE", `/AssetMovements/${id}`);
  },

  bulkDelete: (ids: number[]) => {
    return apiCall<void>("DELETE", "/AssetMovements/bulk-delete", ids);
  },

  import: (data: any[]) => {
    return apiCall<void>("POST", "/AssetMovements/import", data);
  },
};

// ============================================================
// KEY LOG
// ============================================================

export const keyLogAPI = {
  checkout: (keyLog: CreateKeyLogDto) => {
    return apiCall<{ id: number; status: string; borrowedAt: string }>(
      "POST",
      "/KeyLogs",
      keyLog,
    );
  },

  getAll: (filters?: {
    search?: string;
    filter?: string;
    page?: number;
    pageSize?: number;
    select?: string;
    orderBy?: string;
    orderDirection?: number;
  }) => {
    return apiCall<any>("GET", "/KeyLogs", undefined, filters);
  },

  getById: (id: number | string) => {
    return apiCall<KeyLog>("GET", `/KeyLogs/${id}`);
  },

  return: (id: number | string, data: UpdateKeyLogDto) => {
    return apiCall<{ id: number; status: string; returnedAt: string }>(
      "PUT",
      `/KeyLogs/${id}/return`,
      data,
    );
  },

  update: (id: number | string, data: UpdateKeyLogDto) => {
    return apiCall<void>("PUT", `/KeyLogs/${id}`, data);
  },

  delete: (id: number | string) => {
    return apiCall<void>("DELETE", `/KeyLogs/${id}`);
  },

  bulkDelete: (ids: number[]) => {
    return apiCall<void>("DELETE", "/KeyLogs/bulk-delete", ids);
  },

  import: (data: any[]) => {
    return apiCall<void>("POST", "/KeyLogs/import", data);
  },
};

// ============================================================
// HOST MANAGEMENT
// ============================================================

export const hostAPI = {
  create: (host: Omit<Host, "id" | "status">) => {
    return apiCall<{ id: number; status: string }>("POST", "/Hosts", host);
  },

  getAll: (filters?: {
    search?: string;
    filter?: string;
    page?: number;
    pageSize?: number;
    select?: string;
    orderBy?: string;
    orderDirection?: number;
  }) => {
    return apiCall<any>("GET", "/Hosts", undefined, filters);
  },

  getById: (id: number) => {
    return apiCall<Host>("GET", `/Hosts/${id}`);
  },

  update: (id: number, data: Partial<Host>) => {
    return apiCall<void>("PUT", `/Hosts/${id}`, data);
  },

  delete: (id: number) => {
    return apiCall<void>("DELETE", `/Hosts/${id}`);
  },

  bulkDelete: (ids: number[]) => {
    return apiCall<void>("DELETE", "/Hosts/bulk-delete", ids);
  },

  import: (data: any[]) => {
    return apiCall<void>("POST", "/Hosts/import", data);
  },
};

// ============================================================
// KEY ASSETS
// ============================================================

export const keyAssetAPI = {
  create: (keyAsset: Omit<KeyAsset, "id">) => {
    return apiCall<{ id: number }>("POST", "/KeyAssets", keyAsset);
  },

  getAll: (filters?: {
    search?: string;
    filter?: string;
    page?: number;
    pageSize?: number;
    select?: string;
    orderBy?: string;
    orderDirection?: number;
  }) => {
    return apiCall<any>("GET", "/KeyAssets", undefined, filters);
  },

  getById: (id: number) => {
    return apiCall<KeyAsset>("GET", `/KeyAssets/${id}`);
  },

  update: (id: number, data: Partial<KeyAsset>) => {
    return apiCall<void>("PUT", `/KeyAssets/${id}`, data);
  },

  delete: (id: number) => {
    return apiCall<void>("DELETE", `/KeyAssets/${id}`);
  },

  bulkDelete: (ids: number[]) => {
    return apiCall<void>("DELETE", "/KeyAssets/bulk-delete", ids);
  },

  import: (data: any[]) => {
    return apiCall<void>("POST", "/KeyAssets/import", data);
  },
};

// ============================================================
// MOVEMENT REASONS
// ============================================================

export const movementReasonAPI = {
  create: (reason: Omit<MovementReason, "id">) => {
    return apiCall<{ id: number }>("POST", "/MovementReasons", reason);
  },

  getAll: (filters?: {
    search?: string;
    filter?: string;
    page?: number;
    pageSize?: number;
    select?: string;
    orderBy?: string;
    orderDirection?: number;
  }) => {
    return apiCall<any>("GET", "/MovementReasons", undefined, filters);
  },

  getById: (id: number) => {
    return apiCall<MovementReason>("GET", `/MovementReasons/${id}`);
  },

  update: (id: number, data: Partial<MovementReason>) => {
    return apiCall<void>("PUT", `/MovementReasons/${id}`, data);
  },

  delete: (id: number) => {
    return apiCall<void>("DELETE", `/MovementReasons/${id}`);
  },

  bulkDelete: (ids: number[]) => {
    return apiCall<void>("DELETE", "/MovementReasons/bulk-delete", ids);
  },

  import: (data: any[]) => {
    return apiCall<void>("POST", "/MovementReasons/import", data);
  },
};

// ============================================================
// VISITOR REASONS
// ============================================================

export const visitorReasonAPI = {
  create: (reason: Omit<VisitorReason, "id">) => {
    return apiCall<{ id: number }>("POST", "/VisitorReasons", reason);
  },

  getAll: (filters?: {
    search?: string;
    filter?: string;
    page?: number;
    pageSize?: number;
    select?: string;
    orderBy?: string;
    orderDirection?: number;
  }) => {
    return apiCall<any>("GET", "/VisitorReasons", undefined, filters);
  },

  getById: (id: number) => {
    return apiCall<VisitorReason>("GET", `/VisitorReasons/${id}`);
  },

  update: (id: number, data: Partial<VisitorReason>) => {
    return apiCall<void>("PUT", `/VisitorReasons/${id}`, data);
  },

  delete: (id: number) => {
    return apiCall<void>("DELETE", `/VisitorReasons/${id}`);
  },

  bulkDelete: (ids: number[]) => {
    return apiCall<void>("DELETE", "/VisitorReasons/bulk-delete", ids);
  },

  import: (data: any[]) => {
    return apiCall<void>("POST", "/VisitorReasons/import", data);
  },
};

// ============================================================
// NOTIFICATION LOGS
// ============================================================

export const notificationLogAPI = {
  create: (log: Omit<NotificationLog, "id" | "timestamp">) => {
    return apiCall<{ id: number; timestamp: string }>(
      "POST",
      "/NotificationLogs",
      log,
    );
  },

  getAll: (filters?: {
    search?: string;
    filter?: string;
    page?: number;
    pageSize?: number;
    select?: string;
    orderBy?: string;
    orderDirection?: number;
  }) => {
    return apiCall<any>("GET", "/NotificationLogs", undefined, filters);
  },

  getById: (id: number) => {
    return apiCall<NotificationLog>("GET", `/NotificationLogs/${id}`);
  },

  update: (id: number, data: Partial<NotificationLog>) => {
    return apiCall<void>("PUT", `/NotificationLogs/${id}`, data);
  },

  delete: (id: number) => {
    return apiCall<void>("DELETE", `/NotificationLogs/${id}`);
  },

  import: (data: any[]) => {
    return apiCall<void>("POST", "/NotificationLogs/import", data);
  },
};

// ============================================================
// SETTINGS
// ============================================================

export const settingsAPI = {
  getAll: () => {
    return apiCall<SystemSettings>("GET", "/SystemSettings");
  },

  update: (settings: Partial<SystemSettings>) => {
    return apiCall<void>("PUT", "/SystemSettings", settings);
  },

  create: (settings: any) => {
    return apiCall<void>("POST", "/SystemSettings", settings);
  },

  getKiosk: () => {
    return apiCall<any>("GET", "/KioskSettings");
  },

  updateKiosk: (data: any) => {
    return apiCall<void>("PUT", "/KioskSettings", data);
  },

  getWorkspace: () => {
    return apiCall<any>("GET", "/GoogleWorkspaceSettings");
  },

  updateWorkspace: (data: any) => {
    return apiCall<void>("PUT", "/GoogleWorkspaceSettings", data);
  },
};

// ============================================================
// SECURITY STATIONS
// ============================================================

export const securityStationAPI = {
  create: (data: {
    name: string;
    description?: string;
    isActive?: boolean;
  }) => {
    return apiCall<{ id: number }>("POST", "/SecurityStations", data);
  },

  getAll: (filters?: {
    search?: string;
    filter?: string;
    page?: number;
    pageSize?: number;
    select?: string;
    orderBy?: string;
    orderDirection?: number;
  }) => {
    return apiCall<any>("GET", "/SecurityStations", undefined, filters);
  },

  getById: (id: number) => {
    return apiCall<any>("GET", `/SecurityStations/${id}`);
  },

  update: (
    id: number,
    data: { name?: string; description?: string; isActive?: boolean },
  ) => {
    return apiCall<void>("PUT", `/SecurityStations/${id}`, data);
  },

  delete: (id: number) => {
    return apiCall<void>("DELETE", `/SecurityStations/${id}`);
  },

  bulkDelete: (ids: number[]) => {
    return apiCall<void>("DELETE", "/SecurityStations/bulk-delete", ids);
  },

  import: (data: any[]) => {
    return apiCall<void>("POST", "/SecurityStations/import", data);
  },
};

// ============================================================
// DELIVERY TYPES
// ============================================================

export const deliveryTypeAPI = {
  create: (data: {
    name: string;
    description?: string;
    isActive?: boolean;
  }) => {
    return apiCall<{ id: number }>("POST", "/DeliveryTypes", data);
  },

  getAll: (filters?: {
    search?: string;
    filter?: string;
    page?: number;
    pageSize?: number;
    select?: string;
    orderBy?: string;
    orderDirection?: number;
  }) => {
    return apiCall<any>("GET", "/DeliveryTypes", undefined, filters);
  },

  getById: (id: number) => {
    return apiCall<any>("GET", `/DeliveryTypes/${id}`);
  },

  update: (
    id: number,
    data: { name?: string; description?: string; isActive?: boolean },
  ) => {
    return apiCall<void>("PUT", `/DeliveryTypes/${id}`, data);
  },

  delete: (id: number) => {
    return apiCall<void>("DELETE", `/DeliveryTypes/${id}`);
  },

  bulkDelete: (ids: number[]) => {
    return apiCall<void>("DELETE", "/DeliveryTypes/bulk-delete", ids);
  },

  import: (data: any[]) => {
    return apiCall<void>("POST", "/DeliveryTypes/import", data);
  },
};

// ============================================================
// VISITOR TYPES
// ============================================================

export const visitorTypeAPI = {
  create: (data: {
    name: string;
    description?: string;
    isActive?: boolean;
  }) => {
    return apiCall<{ id: number }>("POST", "/VisitorTypes", data);
  },

  getAll: (filters?: {
    search?: string;
    filter?: string;
    page?: number;
    pageSize?: number;
    select?: string;
    orderBy?: string;
    orderDirection?: number;
  }) => {
    return apiCall<any>("GET", "/VisitorTypes", undefined, filters);
  },

  getById: (id: number) => {
    return apiCall<any>("GET", `/VisitorTypes/${id}`);
  },

  update: (
    id: number,
    data: { name?: string; description?: string; isActive?: boolean },
  ) => {
    return apiCall<void>("PUT", `/VisitorTypes/${id}`, data);
  },

  delete: (id: number) => {
    return apiCall<void>("DELETE", `/VisitorTypes/${id}`);
  },

  bulkDelete: (ids: number[]) => {
    return apiCall<void>("DELETE", "/VisitorTypes/bulk-delete", ids);
  },

  import: (data: any[]) => {
    return apiCall<void>("POST", "/VisitorTypes/import", data);
  },
};

// ============================================================
// KEY BORROWING REASONS
// ============================================================

export const keyBorrowingReasonAPI = {
  create: (data: {
    name: string;
    description?: string;
    isActive?: boolean;
  }) => {
    return apiCall<{ id: number }>("POST", "/KeyBorrowingReasons", data);
  },

  getAll: (filters?: {
    search?: string;
    filter?: string;
    page?: number;
    pageSize?: number;
    select?: string;
    orderBy?: string;
    orderDirection?: number;
  }) => {
    return apiCall<any>("GET", "/KeyBorrowingReasons", undefined, filters);
  },

  getById: (id: number) => {
    return apiCall<any>("GET", `/KeyBorrowingReasons/${id}`);
  },

  update: (
    id: number,
    data: { name?: string; description?: string; isActive?: boolean },
  ) => {
    return apiCall<void>("PUT", `/KeyBorrowingReasons/${id}`, data);
  },

  delete: (id: number) => {
    return apiCall<void>("DELETE", `/KeyBorrowingReasons/${id}`);
  },

  bulkDelete: (ids: number[]) => {
    return apiCall<void>("DELETE", "/KeyBorrowingReasons/bulk-delete", ids);
  },

  import: (data: any[]) => {
    return apiCall<void>("POST", "/KeyBorrowingReasons/import", data);
  },
};

// ============================================================
// ADMIN
// ============================================================

export const adminAPI = {
  login: (data: { password: string }) => {
    return apiCall<{
      token?: string;
      message?: string;
      statusCode?: number;
      fullName?: string;
      name?: string;
      adminName?: string;
      email?: string;
    }>("POST", "/admin/login", data);
  },
};

// ============================================================
// BASE USER / AUTHENTICATION
// ============================================================

export const baseUserAPI = {
  login: (data: { email: string; password: string }) => {
    return apiCall<any>("POST", "/BaseUser/login", data);
  },

  getAll: (filters?: {
    search?: string;
    filter?: string;
    page?: number;
    pageSize?: number;
    select?: string;
  }) => {
    return apiCall<any>("GET", "/BaseUser", undefined, filters);
  },

  getById: (id: number) => {
    return apiCall<any>("GET", `/BaseUser/${id}`);
  },

  getByEmail: (email: string) => {
    return apiCall<any>("GET", `/BaseUser/email/${email}`);
  },

  create: (data: any) => {
    return apiCall<any>("POST", "/BaseUser/create", data);
  },

  update: (data: any) => {
    return apiCall<void>("PUT", "/BaseUser/update", data);
  },

  delete: (id: number) => {
    return apiCall<void>("DELETE", `/BaseUser/delete/${id}`);
  },
};

// ============================================================
// ANALYTICS
// ============================================================

export const analyticsAPI = {
  getDashboard: (from?: string, to?: string) => {
    return apiCall<any>("GET", "/analytics/dashboard", undefined, { from, to });
  },

  getVisitors: (from?: string, to?: string, groupBy?: string) => {
    return apiCall<any>("GET", "/analytics/visitors", undefined, {
      from,
      to,
      groupBy,
    });
  },

  getDeliveries: (from?: string, to?: string) => {
    return apiCall<any>("GET", "/analytics/deliveries", undefined, {
      from,
      to,
    });
  },

  getAssets: (from?: string, to?: string) => {
    return apiCall<any>("GET", "/analytics/assets", undefined, { from, to });
  },

  getKeys: (from?: string, to?: string) => {
    return apiCall<any>("GET", "/analytics/keys", undefined, { from, to });
  },

  getSecurity: (from?: string, to?: string) => {
    return apiCall<any>("GET", "/analytics/security", undefined, { from, to });
  },
};

// ============================================================
// SYSTEM HEALTH
// ============================================================

export const systemAPI = {
  getStatus: () => {
    return apiCall<any>("GET", "/system/status");
  },

  getHealth: () => {
    return apiCall<any>("GET", "/health");
  },
};

export default {
  visitor: visitorAPI,
  watchlist: watchlistAPI,
  securityOfficer: securityOfficerAPI,
  securityAlert: securityAlertAPI,
  delivery: deliveryAPI,
  assetMovement: assetMovementAPI,
  keyLog: keyLogAPI,
  host: hostAPI,
  keyAsset: keyAssetAPI,
  movementReason: movementReasonAPI,
  visitorReason: visitorReasonAPI,
  notificationLog: notificationLogAPI,
  settings: settingsAPI,
  admin: adminAPI,
  baseUser: baseUserAPI,
  securityStation: securityStationAPI,
  deliveryType: deliveryTypeAPI,
  visitorType: visitorTypeAPI,
  keyBorrowingReason: keyBorrowingReasonAPI,
  analytics: analyticsAPI,
  system: systemAPI,
};
