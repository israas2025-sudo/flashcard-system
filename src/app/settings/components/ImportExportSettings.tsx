"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Upload,
  Download,
  FileArchive,
  FileSpreadsheet,
  AlertTriangle,
  Check,
  RefreshCw,
  Cloud,
  Trash2,
  BarChart3,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Toggle } from "./AppearanceSettings";

// ---------------------------------------------------------------------------
// Sync Settings
// ---------------------------------------------------------------------------

interface SyncSettingsState {
  syncFrequency: "manual" | "5min" | "15min" | "30min" | "1hr";
  lastSyncAt: string | null;
}

function SyncSection() {
  const [syncSettings, setSyncSettings] = useState<SyncSettingsState>({
    syncFrequency: "15min",
    lastSyncAt: new Date().toISOString(),
  });
  const [syncing, setSyncing] = useState(false);

  const handleForceSync = async () => {
    setSyncing(true);
    await new Promise((r) => setTimeout(r, 2000));
    setSyncSettings((s) => ({ ...s, lastSyncAt: new Date().toISOString() }));
    setSyncing(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
          Sync
        </h4>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Cloud className="w-4 h-4 text-[var(--text-tertiary)]" />
          <div>
            <p className="text-xs font-medium text-[var(--text-secondary)]">
              Sync Frequency
            </p>
          </div>
        </div>
        <select
          value={syncSettings.syncFrequency}
          onChange={(e) =>
            setSyncSettings((s) => ({
              ...s,
              syncFrequency: e.target.value as SyncSettingsState["syncFrequency"],
            }))
          }
          className="h-8 px-2 rounded-lg border border-[var(--surface-3)] bg-[var(--surface-0)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="manual">Manual only</option>
          <option value="5min">Every 5 minutes</option>
          <option value="15min">Every 15 minutes</option>
          <option value="30min">Every 30 minutes</option>
          <option value="1hr">Every hour</option>
        </select>
      </div>

      {syncSettings.lastSyncAt && (
        <p className="text-[10px] text-[var(--text-tertiary)]">
          Last synced: {new Date(syncSettings.lastSyncAt).toLocaleString()}
        </p>
      )}

      <Button
        variant="secondary"
        size="sm"
        onClick={handleForceSync}
        loading={syncing}
        icon={<RefreshCw className="w-3.5 h-3.5" />}
      >
        Force Full Sync
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Import/Export Section
// ---------------------------------------------------------------------------

function ImportExportSection() {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleImportApkg = async () => {
    setImporting(true);
    setImportResult(null);
    // Simulate file picker and import
    await new Promise((r) => setTimeout(r, 1500));
    setImportResult({
      type: "success",
      message: "Successfully imported 342 cards from deck.apkg",
    });
    setImporting(false);
  };

  const handleImportCsv = async () => {
    setImporting(true);
    setImportResult(null);
    await new Promise((r) => setTimeout(r, 1500));
    setImportResult({
      type: "success",
      message: "Successfully imported 128 cards from vocabulary.csv",
    });
    setImporting(false);
  };

  const handleExport = async () => {
    setExporting(true);
    await new Promise((r) => setTimeout(r, 2000));
    setExporting(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
          Import / Export
        </h4>
      </div>

      {/* Import buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={handleImportApkg}
          disabled={importing}
          className="flex items-center gap-3 p-4 rounded-xl border border-[var(--surface-3)] bg-[var(--surface-0)] hover:bg-[var(--surface-1)] transition-colors text-left disabled:opacity-50"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center flex-shrink-0">
            <FileArchive className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--text-primary)]">
              Import .apkg
            </p>
            <p className="text-[10px] text-[var(--text-tertiary)]">
              Anki deck package file
            </p>
          </div>
          <Upload className="w-4 h-4 text-[var(--text-tertiary)] ml-auto" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={handleImportCsv}
          disabled={importing}
          className="flex items-center gap-3 p-4 rounded-xl border border-[var(--surface-3)] bg-[var(--surface-0)] hover:bg-[var(--surface-1)] transition-colors text-left disabled:opacity-50"
        >
          <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-950/30 flex items-center justify-center flex-shrink-0">
            <FileSpreadsheet className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--text-primary)]">
              Import CSV
            </p>
            <p className="text-[10px] text-[var(--text-tertiary)]">
              Comma-separated values
            </p>
          </div>
          <Upload className="w-4 h-4 text-[var(--text-tertiary)] ml-auto" />
        </motion.button>
      </div>

      {/* Import result */}
      {importResult && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
            ${
              importResult.type === "success"
                ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400"
                : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400"
            }
          `}
        >
          {importResult.type === "success" ? (
            <Check className="w-3.5 h-3.5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          )}
          {importResult.message}
        </motion.div>
      )}

      {/* Export */}
      <Button
        variant="secondary"
        size="sm"
        onClick={handleExport}
        loading={exporting}
        icon={<Download className="w-3.5 h-3.5" />}
      >
        Export Collection
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gamification Settings
// ---------------------------------------------------------------------------

function GamificationSection() {
  const [xpEnabled, setXpEnabled] = useState(true);
  const [streaksEnabled, setStreaksEnabled] = useState(true);
  const [achievementsEnabled, setAchievementsEnabled] = useState(true);
  const [soundsEnabled, setSoundsEnabled] = useState(true);

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
          Gamification
        </h4>
      </div>

      <div className="space-y-3">
        <ToggleRow
          label="XP & Leveling"
          description="Earn experience points for studying"
          checked={xpEnabled}
          onChange={setXpEnabled}
        />
        <ToggleRow
          label="Streaks"
          description="Track consecutive study days"
          checked={streaksEnabled}
          onChange={setStreaksEnabled}
        />
        <ToggleRow
          label="Achievements"
          description="Unlock achievements for milestones"
          checked={achievementsEnabled}
          onChange={setAchievementsEnabled}
        />
        <ToggleRow
          label="Celebration Sounds"
          description="Play sounds for milestones and level-ups"
          checked={soundsEnabled}
          onChange={setSoundsEnabled}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notifications Settings
// ---------------------------------------------------------------------------

function NotificationsSection() {
  const [dailyReminder, setDailyReminder] = useState(true);
  const [streakReminder, setStreakReminder] = useState(true);

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
          Notifications
        </h4>
      </div>

      <div className="space-y-3">
        <ToggleRow
          label="Daily Study Reminder"
          description="Get a reminder to study at your preferred time"
          checked={dailyReminder}
          onChange={setDailyReminder}
        />
        <ToggleRow
          label="Streak at Risk"
          description="Alert when your streak might break"
          checked={streakReminder}
          onChange={setStreakReminder}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Advanced Settings
// ---------------------------------------------------------------------------

function AdvancedSection() {
  const [showConfirm, setShowConfirm] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
          Advanced
        </h4>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-4 h-4 text-[var(--text-tertiary)]" />
            <div>
              <p className="text-xs font-medium text-[var(--text-secondary)]">
                Reset Statistics
              </p>
              <p className="text-[10px] text-[var(--text-tertiary)]">
                Clear all review history and statistics
              </p>
            </div>
          </div>
          {showConfirm === "stats" ? (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowConfirm(null)}
              >
                Confirm
              </Button>
            </div>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowConfirm("stats")}
              icon={<BarChart3 className="w-3 h-3" />}
            >
              Reset
            </Button>
          )}
        </div>

        <div className="pt-2 border-t border-[var(--surface-3)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trash2 className="w-4 h-4 text-red-500" />
              <div>
                <p className="text-xs font-medium text-red-600 dark:text-red-400">
                  Delete Account
                </p>
                <p className="text-[10px] text-[var(--text-tertiary)]">
                  Permanently delete your account and all data
                </p>
              </div>
            </div>
            {showConfirm === "delete" ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowConfirm(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowConfirm(null)}
                >
                  Delete
                </Button>
              </div>
            ) : (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowConfirm("delete")}
                icon={<Trash2 className="w-3 h-3" />}
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// About Section
// ---------------------------------------------------------------------------

function AboutSection() {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
          About
        </h4>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[var(--text-secondary)]">Version</span>
          <span className="text-[var(--text-primary)] font-medium">1.0.0</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[var(--text-secondary)]">Algorithm</span>
          <span className="text-[var(--text-primary)] font-medium">FSRS-5</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[var(--text-secondary)]">Database</span>
          <span className="text-[var(--text-primary)] font-medium">PostgreSQL</span>
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--surface-1)] border border-[var(--surface-3)]">
        <Info className="w-3.5 h-3.5 text-[var(--text-tertiary)] mt-0.5 flex-shrink-0" />
        <p className="text-[10px] text-[var(--text-tertiary)] leading-relaxed">
          Built with Next.js, React, TypeScript, Tailwind CSS, and the FSRS-5
          spaced repetition algorithm. Designed for multilingual learners studying
          Arabic, Spanish, English, and more.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toggle Row Helper
// ---------------------------------------------------------------------------

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <p className="text-xs font-medium text-[var(--text-secondary)]">{label}</p>
        <p className="text-[10px] text-[var(--text-tertiary)]">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Export
// ---------------------------------------------------------------------------

export {
  SyncSection,
  ImportExportSection,
  GamificationSection,
  NotificationsSection,
  AdvancedSection,
  AboutSection,
};

export function ImportExportSettings() {
  return (
    <div className="space-y-8">
      <SyncSection />
      <div className="border-t border-[var(--surface-3)]" />
      <ImportExportSection />
      <div className="border-t border-[var(--surface-3)]" />
      <GamificationSection />
      <div className="border-t border-[var(--surface-3)]" />
      <NotificationsSection />
      <div className="border-t border-[var(--surface-3)]" />
      <AdvancedSection />
      <div className="border-t border-[var(--surface-3)]" />
      <AboutSection />
    </div>
  );
}
