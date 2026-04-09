"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, Shield, Bell, User } from "lucide-react";
import { useUser } from "@clerk/nextjs";

export default function SettingsPage() {
  const { user } = useUser();
  const [notifications, setNotifications] = useState({
    budgetAlerts: true,
    weeklyReport: false,
    apiErrors: true,
  });

  const email = user?.emailAddresses?.[0]?.emailAddress;
  const avatarInitial =
    user?.firstName?.[0]?.toUpperCase() ||
    email?.[0]?.toUpperCase() ||
    "U";

  return (
    <div>
      <Header title="Settings" description="Manage your account and preferences" />

      <div className="px-8 py-6 max-w-2xl space-y-6">
        {/* Profile */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <User size={16} />
            <h3 className="font-semibold">Profile</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-jaffa flex items-center justify-center">
                <span className="text-white font-semibold text-lg">{avatarInitial}</span>
              </div>
              <div>
                <p className="font-medium">{user?.fullName || "User"}</p>
                <p className="text-sm opacity-60">{email || "No email"}</p>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium opacity-60 mb-1.5">
                  Display Name
                </label>
                <Input defaultValue={user?.fullName || ""} placeholder="Your name" />
              </div>
              <div>
                <label className="block text-xs font-medium opacity-60 mb-1.5">
                  Plan
                </label>
                <div className="h-10 flex items-center">
                  <Badge className="bg-jaffa text-white border-0">Free</Badge>
                </div>
              </div>
            </div>
            <p className="text-xs opacity-40">Profile changes are managed through Clerk.</p>
          </div>
        </div>

        {/* Notifications */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={16} />
            <h3 className="font-semibold">Notifications</h3>
          </div>
          <div className="space-y-4">
            {[
              { key: "budgetAlerts", label: "Budget Alerts", desc: "Get notified when you approach your monthly budget" },
              { key: "weeklyReport", label: "Weekly Report", desc: "Receive a weekly summary of your token usage" },
              { key: "apiErrors", label: "API Errors", desc: "Alert when an API key fails or returns an error" },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs opacity-60">{item.desc}</p>
                </div>
                <button
                  className={`w-10 h-6 rounded-full transition-all duration-200 relative ${
                    notifications[item.key as keyof typeof notifications]
                      ? "bg-jaffa"
                      : "bg-black-border"
                  }`}
                  onClick={() =>
                    setNotifications((n) => ({
                      ...n,
                      [item.key]: !n[item.key as keyof typeof notifications],
                    }))
                  }
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${
                      notifications[item.key as keyof typeof notifications]
                        ? "translate-x-5"
                        : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={16} />
            <h3 className="font-semibold">Security</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Authentication</p>
                <p className="text-xs opacity-60">Managed via Clerk</p>
              </div>
              <Badge className="bg-green bg-opacity-15 text-green border-0">Secured</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">API Key Encryption</p>
                <p className="text-xs opacity-60">Keys stored as SHA-256 hashes</p>
              </div>
              <Badge className="bg-green bg-opacity-15 text-green border-0">Encrypted</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Two-Factor Auth</p>
                <p className="text-xs opacity-60">Manage 2FA through your Clerk account settings</p>
              </div>
              <Badge className="bg-navy bg-opacity-10 text-navy border-0">Via Clerk</Badge>
            </div>
          </div>
        </div>

        {/* Data */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Download size={16} />
            <h3 className="font-semibold">Data Management</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Usage Data</p>
                <p className="text-xs opacity-60">View all your token usage and cost data in the Logs page</p>
              </div>
              <a href="/dashboard/logs">
                <Button variant="outline" size="sm">View Logs</Button>
              </a>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Account Deletion</p>
                <p className="text-xs opacity-60">To delete your account, contact support or manage via Clerk</p>
              </div>
              <Badge className="bg-black/5 text-black-soft border-0">Contact Support</Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
