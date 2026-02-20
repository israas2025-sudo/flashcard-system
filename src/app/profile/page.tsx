"use client";

/**
 * Profile Page
 *
 * Displays the user's profile information, level/XP progress,
 * achievement badges, study statistics, and language breakdown.
 *
 * Sections:
 * 1. User info: avatar, display name, email, member since
 * 2. Level display: level number, XP progress bar, cosmetic unlocks
 * 3. Achievement badges grid: earned, locked, and hidden
 * 4. Statistics summary: total cards, reviews, streak, accuracy
 * 5. Language breakdown: per-language card counts and progress
 * 6. Edit profile button
 */

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Calendar,
  BookOpen,
  Target,
  Flame,
  Trophy,
  Edit3,
  X,
  Check,
  BarChart3,
  Globe,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AchievementGrid } from "./components/AchievementGrid";
import { LevelDisplay } from "./components/LevelDisplay";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
  settings: Record<string, unknown>;
  stats: {
    totalCards: number;
    totalReviews: number;
    streakDays: number;
    level: number;
    xp: number;
  };
}

interface LevelProgress {
  currentLevel: number;
  currentXP: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  progressPercent: number;
  unlockedCosmetics: Array<{
    type: string;
    name: string;
    description: string;
    unlockedAtLevel: number;
  }>;
}

interface AchievementWithStatus {
  definition: {
    id: string;
    name: string;
    description: string;
    icon: string;
    hidden: boolean;
  };
  earned: boolean;
  earnedAt: string | null;
  progress: number;
}

interface LanguageBreakdown {
  language: string;
  slug: string;
  totalCards: number;
  matureCards: number;
  newCards: number;
  learningCards: number;
  accuracy: number;
}

// ---------------------------------------------------------------------------
// Profile Page Component
// ---------------------------------------------------------------------------

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [levelProgress, setLevelProgress] = useState<LevelProgress | null>(null);
  const [achievements, setAchievements] = useState<AchievementWithStatus[]>([]);
  const [languages, setLanguages] = useState<LanguageBreakdown[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recentAccuracy, setRecentAccuracy] = useState(0);

  // -------------------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------------------

  const fetchProfile = useCallback(async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const [profileRes, achievementsRes, statsRes] = await Promise.all([
        fetch("/api/auth/profile", { headers }),
        fetch("/api/gamification/achievements", { headers }),
        fetch("/api/stats/overview", { headers }),
      ]);

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData.data.user);
        setEditName(profileData.data.user.displayName);

        // Compute level progress from XP
        const xp = profileData.data.user.stats.xp || 0;
        const level = xp < 50 ? 0 : Math.floor(Math.pow(xp / 50, 1 / 1.5));
        const xpForCurrent = level <= 0 ? 0 : Math.round(50 * Math.pow(level, 1.5));
        const xpForNext = Math.round(50 * Math.pow(level + 1, 1.5));
        const range = xpForNext - xpForCurrent;
        const percent = range > 0 ? Math.min(100, Math.round(((xp - xpForCurrent) / range) * 100)) : 0;

        setLevelProgress({
          currentLevel: level,
          currentXP: xp,
          xpForCurrentLevel: xpForCurrent,
          xpForNextLevel: xpForNext,
          progressPercent: percent,
          unlockedCosmetics: [],
        });
      }

      if (achievementsRes.ok) {
        const achievementsData = await achievementsRes.json();
        setAchievements(achievementsData.data?.achievements || []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setRecentAccuracy(statsData.data?.recentAccuracy || 0);
        setLanguages(statsData.data?.languages || []);
      }
    } catch (error) {
      console.error("[Profile] Failed to fetch profile data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // -------------------------------------------------------------------------
  // Profile Editing
  // -------------------------------------------------------------------------

  const handleSaveProfile = async () => {
    if (!editName.trim()) return;
    setSaving(true);

    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ displayName: editName.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data.data.user);
        setIsEditing(false);
      }
    } catch (error) {
      console.error("[Profile] Failed to update profile:", error);
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatNumber = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  // -------------------------------------------------------------------------
  // Loading State
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-48 bg-[var(--surface-2)] rounded-xl" />
        <div className="h-32 bg-[var(--surface-2)] rounded-xl" />
        <div className="h-64 bg-[var(--surface-2)] rounded-xl" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <User className="w-16 h-16 text-[var(--text-tertiary)] mb-4" />
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          Not Signed In
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          Sign in to view your profile, achievements, and study statistics.
        </p>
        <Button variant="primary" onClick={() => (window.location.href = "/login")}>
          Sign In
        </Button>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Stat Cards Data
  // -------------------------------------------------------------------------

  const statCards = [
    {
      label: "Total Cards",
      value: formatNumber(profile.stats.totalCards),
      icon: BookOpen,
      color: "text-primary-500",
      bgColor: "bg-primary-50 dark:bg-primary-950/30",
    },
    {
      label: "Total Reviews",
      value: formatNumber(profile.stats.totalReviews),
      icon: Target,
      color: "text-green-500",
      bgColor: "bg-green-50 dark:bg-green-950/30",
    },
    {
      label: "Day Streak",
      value: profile.stats.streakDays.toString(),
      icon: Flame,
      color: "text-orange-500",
      bgColor: "bg-orange-50 dark:bg-orange-950/30",
    },
    {
      label: "Accuracy (30d)",
      value: `${Math.round(recentAccuracy * 100)}%`,
      icon: BarChart3,
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
    },
  ];

  const earnedCount = achievements.filter((a) => a.earned).length;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Profile
        </h1>
        <Button
          variant="secondary"
          size="sm"
          icon={<Edit3 className="w-4 h-4" />}
          onClick={() => setIsEditing(true)}
        >
          Edit Profile
        </Button>
      </div>

      {/* ================================================================= */}
      {/* Section 1: User Info Card                                         */}
      {/* ================================================================= */}

      <Card variant="elevated">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <span className="text-3xl font-bold text-white">
                  {profile.displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {/* Level badge overlay */}
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-400 dark:bg-amber-500 flex items-center justify-center text-xs font-bold text-white shadow-md border-2 border-[var(--surface-0)]">
              {profile.stats.level}
            </div>
          </div>

          {/* User Details */}
          <div className="flex-1 text-center sm:text-left">
            {/* Editable Name */}
            <AnimatePresence mode="wait">
              {isEditing ? (
                <motion.div
                  key="editing"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-center gap-2 mb-1"
                >
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="text-xl font-bold bg-[var(--surface-2)] border border-[var(--surface-3)] rounded-lg px-3 py-1 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveProfile();
                      if (e.key === "Escape") setIsEditing(false);
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSaveProfile}
                    loading={saving}
                    icon={<Check className="w-4 h-4" />}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      setEditName(profile.displayName);
                    }}
                    icon={<X className="w-4 h-4" />}
                  />
                </motion.div>
              ) : (
                <motion.h2
                  key="display"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xl font-bold text-[var(--text-primary)] mb-1"
                >
                  {profile.displayName}
                </motion.h2>
              )}
            </AnimatePresence>

            <div className="flex flex-col sm:flex-row items-center gap-3 text-sm text-[var(--text-secondary)]">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                {profile.email}
              </span>
              <span className="hidden sm:inline text-[var(--text-tertiary)]">
                |
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Member since {formatDate(profile.createdAt)}
              </span>
            </div>

            {/* Quick Stats Row */}
            <div className="flex items-center gap-4 mt-3">
              <Badge variant="primary" size="md">
                <Trophy className="w-3 h-3 mr-1" />
                {earnedCount} Achievement{earnedCount !== 1 ? "s" : ""}
              </Badge>
              <Badge variant="success" size="md">
                <Flame className="w-3 h-3 mr-1" />
                {profile.stats.streakDays} day streak
              </Badge>
              <Badge variant="default" size="md">
                Level {profile.stats.level}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* ================================================================= */}
      {/* Section 2: Level & XP Display                                     */}
      {/* ================================================================= */}

      {levelProgress && (
        <LevelDisplay
          level={levelProgress.currentLevel}
          currentXP={levelProgress.currentXP}
          xpForCurrentLevel={levelProgress.xpForCurrentLevel}
          xpForNextLevel={levelProgress.xpForNextLevel}
          progressPercent={levelProgress.progressPercent}
          unlockedCosmetics={levelProgress.unlockedCosmetics}
        />
      )}

      {/* ================================================================= */}
      {/* Section 3: Statistics Summary                                     */}
      {/* ================================================================= */}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} variant="default" padding="md">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center`}
                >
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {stat.label}
                  </p>
                  <p className="text-lg font-bold text-[var(--text-primary)]">
                    {stat.value}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* ================================================================= */}
      {/* Section 4: Achievement Badges Grid                                */}
      {/* ================================================================= */}

      <AchievementGrid achievements={achievements} />

      {/* ================================================================= */}
      {/* Section 5: Language Breakdown                                     */}
      {/* ================================================================= */}

      {languages.length > 0 && (
        <Card variant="default">
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Language Breakdown
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {languages.map((lang) => {
                const total = lang.totalCards || 1;
                const maturePercent = Math.round(
                  (lang.matureCards / total) * 100
                );
                const learningPercent = Math.round(
                  (lang.learningCards / total) * 100
                );
                const newPercent = Math.round((lang.newCards / total) * 100);

                return (
                  <div key={lang.slug} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[var(--text-primary)] capitalize">
                          {lang.language}
                        </span>
                        <span className="text-xs text-[var(--text-tertiary)]">
                          {lang.totalCards} card{lang.totalCards !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <span className="text-xs text-[var(--text-secondary)]">
                        {Math.round(lang.accuracy * 100)}% accuracy
                      </span>
                    </div>

                    {/* Stacked progress bar */}
                    <div className="h-2 rounded-full bg-[var(--surface-3)] overflow-hidden flex">
                      <div
                        className="bg-green-500 transition-all duration-500"
                        style={{ width: `${maturePercent}%` }}
                        title={`Mature: ${lang.matureCards}`}
                      />
                      <div
                        className="bg-blue-500 transition-all duration-500"
                        style={{ width: `${learningPercent}%` }}
                        title={`Learning: ${lang.learningCards}`}
                      />
                      <div
                        className="bg-primary-300 transition-all duration-500"
                        style={{ width: `${newPercent}%` }}
                        title={`New: ${lang.newCards}`}
                      />
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-4 text-[10px] text-[var(--text-tertiary)]">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        Mature ({lang.matureCards})
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        Learning ({lang.learningCards})
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-primary-300" />
                        New ({lang.newCards})
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
