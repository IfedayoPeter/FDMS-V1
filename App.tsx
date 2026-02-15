import React, { useState, useEffect } from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { LanguageProvider } from "./LanguageContext";
import KioskHome from "./views/KioskHome";
import AdminPortal from "./views/AdminPortal";
import AdminLogin from "./views/AdminLogin";
import SecurityLogin from "./views/SecurityLogin";
import CheckIn from "./views/CheckIn";
import CheckOut from "./views/CheckOut";
import KeyLogKiosk from "./views/KeyLogKiosk";
import LogisticsHub from "./views/LogisticsHub";
import {
  AssetMovement,
  NotificationLog,
  SystemSettings,
  Host,
  KeyLog,
  Visitor,
} from "./types";
import apiService from "./services/apiService";
import {
  ensureApiSuccess,
  getApiContent,
  getApiErrorMessage,
} from "./services/apiResponse";
import ActionFeedbackModal from "./views/components/ActionFeedbackModal";

const App: React.FC = () => {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    return !!localStorage.getItem("authToken");
  });

  // Monitor auth token changes (e.g., logout from another tab or manual logout)
  useEffect(() => {
    const checkAuthToken = () => {
      const hasToken = !!localStorage.getItem("authToken");
      setIsAdminAuthenticated(hasToken);
    };

    const interval = setInterval(checkAuthToken, 1000);
    return () => clearInterval(interval);
  }, []);

  // Background monitoring for overdue inter-campus transfers and unreturned keys
  useEffect(() => {
    const checkOverdueAlerts = async () => {
      try {
        // Load data from API
        const [movementsData, keyLogsData, settingsData, hostsData] =
          await Promise.all([
            apiService.assetMovement.getAll().catch((error) => ({
              hasError: true,
              errorMessage: getApiErrorMessage(
                error,
                "Failed to load asset movements",
              ),
            })),
            apiService.keyLog.getAll().catch((error) => ({
              hasError: true,
              errorMessage: getApiErrorMessage(error, "Failed to load key logs"),
            })),
            apiService.settings.getAll().catch((error) => ({
              hasError: true,
              errorMessage: getApiErrorMessage(
                error,
                "Failed to load settings",
              ),
            })),
            apiService.host.getAll().catch((error) => ({
              hasError: true,
              errorMessage: getApiErrorMessage(error, "Failed to load hosts"),
            })),
          ]);

        const settings: SystemSettings | null = getApiContent(
          settingsData,
          null,
          "settings",
        );
        if (!settings) return;

        const movements: AssetMovement[] = getApiContent(
          movementsData,
          [],
          "asset movements",
        );
        const keyLogs: KeyLog[] = getApiContent(keyLogsData, [], "key logs");
        const hosts: Host[] = getApiContent(hostsData, [], "hosts");

        const now = new Date();
        const currentHour = now.getHours();
        const todayStr = now.toDateString();

        // STAGE 2: MIDNIGHT CLEANUP & OPERATING HOURS ENFORCEMENT
        // If it's between 00:00 and 05:00, ensure security is logged out
        if (currentHour < 5) {
          const lastReset = localStorage.getItem("lastMidnightReset");
          const hasActiveSecuritySession =
            localStorage.getItem("securitySession");

          if (lastReset !== todayStr || hasActiveSecuritySession) {
            console.log(
              "[System Cleanup] Locked hours detected. Clearing security duty sessions.",
            );

            // 1. Clear security session (Accountability requirement)
            localStorage.removeItem("securitySession");

            // 2. Mark reset done for today
            localStorage.setItem("lastMidnightReset", todayStr);

            // Force refresh if a session was actually cleared to update UI state
            if (hasActiveSecuritySession) {
              window.location.reload();
              return;
            }
          }
        }

        if (!settings.notificationsEnabled) return;

        const logs: NotificationLog[] = [];

        // 1. Check Asset Movements for overdue
        for (const asset of movements) {
          if (
            asset.reason === "Between Campus Move" &&
            asset.status !== "On-site"
          ) {
            const checkoutTime = new Date(asset.checkoutTime);
            const diffMs = now.getTime() - checkoutTime.getTime();
            const diffHours = diffMs / 3600000;

            if (diffHours >= 1) {
              const hours = Math.floor(diffHours);
              const minutes = Math.floor((diffMs % 3600000) / 60000);
              const durationStr = `${hours} hour(s) and ${minutes} minute(s)`;
              const host = hosts.find(
                (h) => h.fullName === asset.staffInCharge,
              );

              const replaceVars = (template: string) => {
                return (template || "")
                  .replace(/{{borrower_name}}/g, asset.borrowerName)
                  .replace(/{{equipment_name}}/g, asset.equipmentName)
                  .replace(/{{staff_in_charge}}/g, asset.staffInCharge)
                  .replace(/{{overdue_duration}}/g, durationStr)
                  .replace(
                    /{{target_campus}}/g,
                    asset.targetCampus || "Unknown",
                  )
                  .replace(/{{company_name}}/g, settings.kiosk.companyName)
                  .replace(/{{time}}/g, now.toLocaleTimeString());
              };

              const defaultHostTemplate =
                "🚨 HIGH SECURITY ALERT 🚨\n\n⚠️ URGENT: Equipment {{equipment_name}} is currently {{overdue_duration}} OVERDUE for campus delivery. \n\n👤 Custodian: {{borrower_name}}\n📍 Target: {{target_campus}}\n⏰ Last Seen: {{time}}";
              const defaultBorrowerTemplate =
                "⚠️ URGENT SECURITY NOTICE ⚠️\n\n{{borrower_name}}, the equipment ({{equipment_name}}) you are transferring is currently {{overdue_duration}} overdue. Please record delivery immediately at the {{target_campus}} kiosk.";

              // Create notifications via API
              const response = await apiService.notificationLog.create({
                visitorName: asset.borrowerName,
                hostName: asset.staffInCharge,
                recipient: host?.email || "staff@company.com",
                sender: settings.kiosk.senderEmail,
                recipientRole: "Host",
                trigger: "Overdue Alert",
                message: replaceVars(
                  settings.hostAssetOverdueTemplate || defaultHostTemplate,
                ),
                timestamp: now.toISOString(),
                status: "Sent",
              } as NotificationLog);
              ensureApiSuccess(response, "Failed to create notification log");

              const response2 = await apiService.notificationLog.create({
                visitorName: asset.borrowerName,
                hostName: asset.staffInCharge,
                recipient: asset.email,
                sender: settings.kiosk.senderEmail,
                recipientRole: "Borrower",
                trigger: "Overdue Alert",
                message: replaceVars(
                  settings.borrowerAssetOverdueTemplate ||
                    defaultBorrowerTemplate,
                ),
                timestamp: now.toISOString(),
                status: "Sent",
              } as NotificationLog);
              ensureApiSuccess(response2, "Failed to create notification log");
            }
          }
        }

        // 2. Check Key Logs (Overdue if borrowed before today OR borrowed today and it's 6pm or later)
        for (const log of keyLogs) {
          if (log.status === "Out") {
            const borrowedDate = new Date(log.borrowedAt);
            const isOverdue =
              borrowedDate.toDateString() !== todayStr || currentHour >= 18;

            if (isOverdue) {
              const host = hosts.find(
                (h) => h.id === log.borrower || h.fullName === log.borrowerName,
              );
              const borrowerEmail = host?.email || "staff@company.com";
              const adminEmail =
                settings.kiosk.supportEmail || "admin@company.com";

              const replaceVars = (template: string) => {
                return (template || "")
                  .replace(/{{borrower_name}}/g, log.borrowerName)
                  .replace(/{{key_name}}/g, log.keyName)
                  .replace(/{{key_number}}/g, log.keyNumber)
                  .replace(/{{company_name}}/g, settings.kiosk.companyName)
                  .replace(/{{borrowed_at}}/g, borrowedDate.toLocaleString())
                  .replace(/{{time}}/g, now.toLocaleTimeString());
              };

              const defaultAdminTemplate =
                "🚨 SECURITY ALERT: UNRETURNED KEY 🚨\n\nHello Security Admin, Key #{{key_number}} ({{key_name}}) borrowed by {{borrower_name}} at {{borrowed_at}} has not been returned. The 18:00 cutoff has passed.";
              const defaultBorrowerTemplate =
                "⚠️ URGENT: KEY RETURN REQUIRED ⚠️\n\nHi {{borrower_name}}, our records show that you still have Key #{{key_number}} ({{key_name}}). Please return it to the kiosk immediately as the business day has ended.";

              // Send to Admin
              const response = await apiService.notificationLog.create({
                visitorName: log.borrowerName,
                hostName: "System Security",
                recipient: adminEmail,
                sender: settings.kiosk.senderEmail,
                recipientRole: "Admin",
                trigger: "Overdue Alert",
                message: replaceVars(
                  settings.hostKeyOverdueTemplate || defaultAdminTemplate,
                ),
                timestamp: now.toISOString(),
                status: "Sent",
              } as NotificationLog);
              ensureApiSuccess(response, "Failed to create notification log");

              // Send to Borrower
              const response2 = await apiService.notificationLog.create({
                visitorName: log.borrowerName,
                hostName: "System Security",
                recipient: borrowerEmail,
                sender: settings.kiosk.senderEmail,
                recipientRole: "Borrower",
                trigger: "Overdue Alert",
                message: replaceVars(
                  settings.borrowerKeyOverdueTemplate ||
                    defaultBorrowerTemplate,
                ),
                timestamp: now.toISOString(),
                status: "Sent",
              } as NotificationLog);
              ensureApiSuccess(response2, "Failed to create notification log");
            }
          }
        }
      } catch (error) {
        console.error("Error checking overdue alerts:", error);
      }
    };

    checkOverdueAlerts();
    const interval = setInterval(checkOverdueAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <LanguageProvider>
      <Router>
        <ActionFeedbackModal />
        <Routes>
          {/* Kiosk Routes */}
          <Route path="/" element={<KioskHome />} />
          <Route path="/security-login" element={<SecurityLogin />} />
          <Route path="/check-in" element={<CheckIn />} />
          <Route path="/check-out" element={<CheckOut />} />
          <Route path="/key-access" element={<KeyLogKiosk />} />
          <Route path="/logistics" element={<LogisticsHub />} />

          {/* Admin Routes */}
          <Route
            path="/admin-login"
            element={
              <AdminLogin onLogin={() => setIsAdminAuthenticated(true)} />
            }
          />
          <Route
            path="/admin/*"
            element={
              isAdminAuthenticated ? (
                <AdminPortal />
              ) : (
                <Navigate to="/admin-login" />
              )
            }
          />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </LanguageProvider>
  );
};

export default App;
