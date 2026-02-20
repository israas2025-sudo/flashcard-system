"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, Camera, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ProfileData {
  displayName: string;
  email: string;
  avatarUrl: string | null;
}

interface ProfileSettingsProps {
  profile?: ProfileData;
  onSave?: (data: ProfileData) => void;
}

export function ProfileSettings({ profile, onSave }: ProfileSettingsProps) {
  const [displayName, setDisplayName] = useState(profile?.displayName || "Israa");
  const [email, setEmail] = useState(profile?.email || "israa@example.com");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatarUrl || null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    onSave?.({ displayName, email, avatarUrl });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Profile</h3>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          Manage your account information and avatar.
        </p>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            )}
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[var(--surface-0)] border border-[var(--surface-3)] flex items-center justify-center shadow-sm hover:bg-[var(--surface-2)] transition-colors"
          >
            <Camera className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
          </motion.button>
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">{displayName}</p>
          <p className="text-xs text-[var(--text-tertiary)]">{email}</p>
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
            Display Name
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-lg border border-[var(--surface-3)] bg-[var(--surface-0)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              placeholder="Your name"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-lg border border-[var(--surface-3)] bg-[var(--surface-0)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              placeholder="you@example.com"
            />
          </div>
        </div>
      </div>

      <Button
        variant="primary"
        size="sm"
        onClick={handleSave}
        loading={saving}
        icon={<Save className="w-3.5 h-3.5" />}
      >
        Save Changes
      </Button>
    </div>
  );
}
