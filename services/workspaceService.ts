import { Host, SystemSettings } from "../types";
import apiService from "./apiService";
import { getApiContent } from "./apiResponse";

export interface HostAvailability {
  status: "Available" | "Busy";
  nextAvailableTime?: string;
  currentEventSummary?: string;
}

export interface WorkspaceSyncSummary {
  totalFetched: number;
  totalSynced: number;
  createdCount: number;
  updatedCount: number;
}

export interface WorkspaceDirectorySyncResult {
  hosts: Partial<Host>[];
  summary?: WorkspaceSyncSummary;
}

/**
 * WorkspaceService handles the integration with Google Workspace API.
 */
export const workspaceService = {
  /**
   * Verifies backend Google Workspace connectivity/authorization.
   */
  authorize: async (): Promise<boolean> => {
    try {
      const response = await apiService.workspace.authorize();
      const payload = getApiContent<any>(response, { authorized: false });
      return Boolean(payload?.authorized);
    } catch (error) {
      console.error("Workspace authorization failed", error);
      return false;
    }
  },

  /**
   * Syncs host directory from Google Workspace.
   */
  fetchDirectory: async (
    domain: string,
    useCustomerDirectory = false,
  ): Promise<WorkspaceDirectorySyncResult> => {
    const response = await apiService.workspace.syncDirectory(
      domain,
      useCustomerDirectory,
    );
    const payload = getApiContent<any>(response, [], "workspace directory");

    if (Array.isArray(payload)) {
      return { hosts: payload };
    }

    return {
      hosts: Array.isArray(payload?.hosts) ? payload.hosts : [],
      summary: payload?.summary
        ? {
            totalFetched: Number(payload.summary.totalFetched || 0),
            totalSynced: Number(payload.summary.totalSynced || 0),
            createdCount: Number(payload.summary.createdCount || 0),
            updatedCount: Number(payload.summary.updatedCount || 0),
          }
        : undefined,
    };
  },

  /**
   * Fetches host availability from Google Calendar
   */
  getHostAvailability: async (
    host: Host,
    settings: SystemSettings,
  ): Promise<HostAvailability> => {
    if (
      !settings?.workspace?.enabled ||
      !settings?.workspace?.calendarEnabled
    ) {
      return { status: "Available" };
    }

    try {
      const response = await apiService.workspace.getAvailability(host.email);
      return getApiContent<HostAvailability>(response, { status: "Available" });
    } catch (error) {
      console.error("Calendar availability check failed", error);
      return { status: "Available" };
    }
  },

  /**
   * Sends a message to a Google Chat Space or Webhook
   */
  sendChatMessage: async (
    host: Host,
    message: string,
    settings: SystemSettings,
  ): Promise<boolean> => {
    if (
      !settings?.workspace?.enabled ||
      !settings?.workspace?.chatNotificationsEnabled
    )
      return false;

    const target = host.googleChatSpaceId || settings.workspace.webhookUrl;
    if (!target) return false;

    try {
      const response = await apiService.workspace.sendChatMessage(
        target,
        message,
      );
      const payload = getApiContent<any>(response, { sent: false });
      return Boolean(payload?.sent);
    } catch (error) {
      console.error("Google Chat message send failed", error);
      return false;
    }
  },
};
