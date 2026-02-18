export type Language = "en" | "fr" | "ha" | "yo" | "ig" | "pd" | "pt" | "es";

export interface Visitor {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  host: string;
  purpose: string;
  visitorType: string;
  licensePlate?: string;
  expectedDuration: string;
  location: string;
  checkInTime: string;
  checkOutTime?: string;
  status: "In" | "Out";
  photo?: string;
  signature?: string;
  processedBy?: string; // Accountability Tracking
  // Group Management Fields
  groupId?: string;
  isGroupLead?: boolean;
  groupSize?: number;
}

export interface WatchlistEntry {
  id: number;
  name: string;
  phone: string;
  email?: string;
  reason: string;
  riskLevel: "Low" | "Medium" | "High";
  addedAt: string;
}

export interface SecurityOfficer {
  id: number;
  fullName: string;
  badgeId: string;
  phone: string;
  email: string;
  company: string;
  pin: string;
  photo?: string;
  status: "Active" | "Inactive";
  addedAt: string;
}

export interface SecurityAlert {
  id: number;
  visitorName: string;
  phone: string;
  timestamp: string;
  watchlistReason: string;
  riskLevel: "Low" | "Medium" | "High";
  location: string;
  status: "Unread" | "Cleared";
}

export interface DeliveryRecord {
  id: number;
  company: string;
  personName: string;
  phone: string;
  email: string;
  deliveryFor: string;
  receivedBy: string;
  packageType: string;
  packageCount: number;
  itemName?: string;
  trackingNumber: string;
  location: string;
  notes?: string;
  photo?: string;
  timestamp: string;
  processedBy?: string; // Accountability Tracking
}

export type AssetStatus = "Off-site" | "In-transit" | "On-site" | string;

export interface AssetMovement {
  id: number;
  equipmentName: string;
  staffInCharge: string;
  borrowerName: string;
  phone: string;
  email: string;
  reason: string;
  targetCampus?: string;
  status: AssetStatus;
  checkoutTime: string;
  returnTime?: string;
  returnerName?: string;
  returningStaffName?: string;
  receiverName?: string;
  securityName?: string;
  condition?: "Good" | "Damaged" | "Needs Service";
  maintenanceNotes?: string;
  photo?: string;
  returnPhoto?: string;
  lastOverdueNotificationTime?: string;
  processedBy?: string; // Accountability Tracking
}

export interface KeyLog {
  id: number;
  keyId: string;
  keyNumber: string;
  keyName: string;
  borrower: string;
  borrowerName: string;
  purpose: string;
  borrowedAt: string;
  returnedAt?: string;
  returnerName?: string;
  checkoutSecurityName?: string;
  returnSecurityName?: string;
  status: "Out" | "In" | "Returned";
  condition?: "Good" | "Damaged" | "Needs Service";
  maintenanceNotes?: string;
  photo?: string;
  returnPhoto?: string;
  lastOverdueNotificationTime?: string;
  processedBy?: string; // Accountability Tracking
}

export interface CreateKeyLogDto {
  keyId: string;
  keyNumber: string;
  keyName: string;
  borrower: string;
  borrowerName: string;
  purpose: string;
  checkoutSecurityName?: string;
  photo?: string;
  processedBy?: string;
  borrowedAt: string;
  status?: string;
}

export interface UpdateKeyLogDto extends CreateKeyLogDto {
  returnedAt?: string;
  returnerName?: string;
  returnSecurityName?: string;
  condition?: "Good" | "Damaged" | "Needs Service";
  maintenanceNotes?: string;
  returnPhoto?: string;
}

export type AdminTab =
  | "Dashboard"
  | "Visitors"
  | "Deliveries"
  | "Key Log"
  | "Assets"
  | "Notifications"
  | "Settings";

export interface Host {
  id: number;
  fullName: string;
  department: string;
  phone: string;
  email: string;
  status: "Active" | "Inactive";
  // Google Workspace Integration
  googleId?: string;
  googleChatSpaceId?: string;
  isWorkspaceSynced?: boolean;
}

export interface KeyAsset {
  id: number;
  keyNumber: string;
  keyName: string;
  block: string;
  floor: string;
  location: string;
  notes: string;
}

export interface MovementReason {
  id: number;
  name: string;
  description: string;
}

export interface VisitorReason {
  id: number;
  name: string;
  description: string;
}

export interface NotificationLog {
  id: number;
  visitorName: string;
  hostName: string;
  recipient: string;
  sender: string;
  recipientRole: "Host" | "Guest" | "Courier" | "Borrower" | "Admin" | "CC";
  trigger:
    | "Check-In"
    | "Check-Out"
    | "Delivery"
    | "Asset Checkout"
    | "Asset Return"
    | "Overdue Alert"
    | "Key Checkout"
    | "Key Return";
  message: string;
  timestamp: string;
  status: "Sent" | "Failed";
  channel?: "Email" | "Google Chat";
}

export interface KioskSettings {
  companyName: string;
  locationName: string;
  supportEmail: string;
  senderEmail: string;
  logoUrl?: string;
}

export interface GoogleWorkspaceSettings {
  enabled: boolean;
  domain: string;
  useCustomerDirectory?: boolean;
  chatNotificationsEnabled: boolean;
  calendarEnabled: boolean;
  webhookUrl?: string; // Optional global webhook
}

export interface SystemSettings {
  notificationsEnabled: boolean;
  notificationCopyEmail?: string;
  hostCheckInTemplate: string;
  guestCheckInTemplate: string;
  hostCheckOutTemplate: string;
  guestCheckOutTemplate: string;
  hostDeliveryTemplate: string;
  courierDeliveryTemplate: string;
  hostAssetCheckoutTemplate: string;
  borrowerAssetCheckoutTemplate: string;
  hostAssetReturnTemplate: string;
  borrowerAssetReturnTemplate: string;
  hostAssetOverdueTemplate: string;
  borrowerAssetOverdueTemplate: string;
  hostKeyCheckoutTemplate: string;
  borrowerKeyCheckoutTemplate: string;
  hostKeyReturnTemplate: string;
  borrowerKeyReturnTemplate: string;
  hostKeyOverdueTemplate?: string;
  borrowerKeyOverdueTemplate?: string;
  kiosk: KioskSettings;
  workspace: GoogleWorkspaceSettings;
}
