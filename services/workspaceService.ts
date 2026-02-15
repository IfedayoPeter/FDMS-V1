
import { Host, SystemSettings } from "../types";

export interface HostAvailability {
  status: 'Available' | 'Busy';
  nextAvailableTime?: string;
  currentEventSummary?: string;
}

/**
 * WorkspaceService handles the integration with Google Workspace API.
 */
export const workspaceService = {
  /**
   * Simulates an OAuth2 authorization handshake
   */
  authorize: async (): Promise<boolean> => {
    console.log("Initiating Google OAuth2 Handshake...");
    await new Promise(r => setTimeout(r, 1500));
    return true;
  },

  /**
   * Syncs the directory from Google Workspace.
   */
  fetchDirectory: async (domain: string): Promise<Partial<Host>[]> => {
    console.log(`Syncing directory for domain: ${domain}`);
    await new Promise(r => setTimeout(r, 2000));
    
    return [
      {
        fullName: "Alex Workspace",
        email: `alex@${domain}`,
        department: "Operations",
        googleId: "gw-12345",
        status: "Active",
        isWorkspaceSynced: true,
        googleChatSpaceId: "spaces/operations_hub"
      },
      {
        fullName: "Jordan Tech",
        email: `jordan@${domain}`,
        department: "Engineering",
        googleId: "gw-67890",
        status: "Active",
        isWorkspaceSynced: true,
        googleChatSpaceId: "spaces/engineering_alerts"
      },
      {
        fullName: "Taylor HR",
        email: `taylor@${domain}`,
        department: "Human Resources",
        googleId: "gw-11223",
        status: "Active",
        isWorkspaceSynced: true,
        googleChatSpaceId: "spaces/hr_notifications"
      }
    ];
  },

  /**
   * Fetches mock availability from Google Calendar
   */
  getHostAvailability: async (host: Host, settings: SystemSettings): Promise<HostAvailability> => {
    // FIX: Added optional chaining to prevent "Cannot read properties of undefined (reading 'enabled')"
    if (!settings?.workspace?.enabled || !settings?.workspace?.calendarEnabled) {
      return { status: 'Available' };
    }

    console.log(`[Google Calendar Sync] Checking availability for ${host.email}...`);
    await new Promise(r => setTimeout(r, 1200));

    // Simple deterministic mock: Hosts with 'Tech' or 'Engineering' in name are Busy
    const isBusy = host.fullName.includes('Tech') || host.department.includes('Engineering');

    if (isBusy) {
      const later = new Date();
      later.setMinutes(later.getMinutes() + 45);
      return { 
        status: 'Busy', 
        nextAvailableTime: later.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        currentEventSummary: "Internal Technical Sync"
      };
    }

    return { status: 'Available' };
  },

  /**
   * Sends a message to a Google Chat Space or Webhook
   */
  sendChatMessage: async (host: Host, message: string, settings: SystemSettings): Promise<boolean> => {
    // FIX: Added optional chaining
    if (!settings?.workspace?.enabled || !settings?.workspace?.chatNotificationsEnabled) return false;

    // Use the host's specific space ID or fall back to a global webhook if configured
    const target = host.googleChatSpaceId || settings.workspace.webhookUrl;
    if (!target) return false;

    console.log(`[Google Chat Sync] Dispatching to ${host.fullName} (${target}): ${message}`);
    await new Promise(r => setTimeout(r, 800));
    return true;
  }
};
