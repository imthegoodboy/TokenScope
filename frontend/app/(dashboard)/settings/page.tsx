"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserButton, useUser } from "@clerk/nextjs";
import { Separator } from "@/components/ui/separator";
import { Download, Trash2, Shield, Bell, User } from "lucide-react";

export default function SettingsPage() {
  const { user } = useUser();
  const [notifications, setNotifications] = useState({
    budgetAlerts: true,
    weeklyReport: false,
    apiErrors: true,
  });

  return (
    <div>
      <Header title="Settings" description="Manage your account and preferences" />

      <div className="px-8 py-6 max-w-2xl space-y-6">
        {/* Profile */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <User size={16} className="text-black" />
            <h3 className="font-semibold text-black">Profile</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center">
                <span className="text-cream font-semibold text-lg">
                  {user?.firstName?.[0] || user?.emailAddresses[0]?.emailAddress[0]?.toUpperCase() || "U"}
                </span>
              </div>
              <div>
                <p className="font-medium text-black">
                  {user?.fullName || "User"}
                </p>
                <p className="text-sm text-black-muted">
                  {user?.emailAddresses[0]?.emailAddress}
                </p>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-black-muted mb-1.5">
                  Display Name
                </label>
                <Input defaultValue={user?.fullName || ""} placeholder="Your name" />
              </div>
              <div>
                <label className="block text-xs font-medium text-black-muted mb-1.5">
                  Plan
                </label>
                <div className="h-10 flex items-center">
                  <Badge variant="black">Free</Badge>
                </div>
              </div>
            </div>
            <Button size="sm">Save Changes</Button>
          </div>
        </div>

        {/* Notifications */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={16} className="text-black" />
            <h3 className="font-semibold text-black">Notifications</h3>
          </div>
          <div className="space-y-4">
            {[
              { key: "budgetAlerts", label: "Budget Alerts", desc: "Get notified when you approach your monthly budget" },
              { key: "weeklyReport", label: "Weekly Report", desc: "Receive a weekly summary of your token usage" },
              { key: "apiErrors", label: "API Errors", desc: "Alert when an API key fails or returns an error" },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-black">{item.label}</p>
                  <p className="text-xs text-black-muted">{item.desc}</p>
                </div>
                <button
                  className={`w-10 h-6 rounded-full transition-all duration-200 relative ${
                    notifications[item.key as keyof typeof notifications]
                      ? "bg-black"
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
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-surface shadow transition-all duration-200 ${
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
            <Shield size={16} className="text-black" />
            <h3 className="font-semibold text-black">Security</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-black">Authentication</p>
                <p className="text-xs text-black-muted">Managed via Clerk</p>
              </div>
              <Badge variant="success">Secured</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-black">API Key Encryption</p>
                <p className="text-xs text-black-muted">Keys stored as SHA-256 hashes</p>
              </div>
              <Badge variant="success">Encrypted</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-black">Two-Factor Auth</p>
                <p className="text-xs text-black-muted">Add 2FA via Clerk settings</p>
              </div>
              <Button variant="outline" size="sm">
                Enable 2FA
              </Button>
            </div>
          </div>
        </div>

        {/* Data */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Download size={16} className="text-black" />
            <h3 className="font-semibold text-black">Data Management</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-black">Export All Data</p>
                <p className="text-xs text-black-muted">Download all your usage data as JSON</p>
              </div>
              <Button variant="outline" size="sm">
                <Download size={14} /> Export JSON
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-black">Export as CSV</p>
                <p className="text-xs text-black-muted">Download usage history as CSV</p>
              </div>
              <Button variant="outline" size="sm">
                <Download size={14} /> Export CSV
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-danger">Delete Account</p>
                <p className="text-xs text-black-muted">
                  Permanently delete your account and all data
                </p>
              </div>
              <Button variant="danger" size="sm">
                <Trash2 size={14} /> Delete
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
