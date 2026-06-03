import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Smile,
  Activity,
  BarChart2,
  Plus,
  Brain,
  ChevronRight,
  TrendingUp,
  Zap,
  Pencil,
  Trash2,
  X,
  Save,
  Calendar,
} from "lucide-react";

// Design System Constants
const BORDER_GHOST = "border-[#E5E7EB]";
const ACTION_BLUE = "#2563EB";

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function HappinessOSHome() {
  const queryClient = useQueryClient();
  const [selectedMood, setSelectedMood] = useState(null);
  const [editingLogId, setEditingLogId] = useState(null);
  const [editForm, setEditForm] = useState({
    activity_id: null,
    mood_rating: 5,
    note: "",
  });

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const res = await fetch("/api/logs/stats");
      return res.json();
    },
  });

  const { data: recentLogs } = useQuery({
    queryKey: ["logs"],
    queryFn: async () => {
      const res = await fetch("/api/logs");
      return res.json();
    },
  });

  const { data: activities } = useQuery({
    queryKey: ["activities"],
    queryFn: async () => {
      const res = await fetch("/api/activities");
      if (!res.ok) throw new Error("Failed to fetch activities");
      return res.json();
    },
  });

  const logMoodMutation = useMutation({
    mutationFn: async (rating) => {
      const res = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood_rating: rating }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logs"] });
      setSelectedMood(null);
    },
  });

  const updateLogMutation = useMutation({
    mutationFn: async (data) => {
      const res = await fetch("/api/logs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update log");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logs"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      setEditingLogId(null);
    },
  });

  const deleteLogMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch("/api/logs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed to delete log");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logs"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });

  const startEditing = (log) => {
    setEditingLogId(log.id);
    setEditForm({
      activity_id: log.activity_id,
      mood_rating: log.mood_rating,
      note: log.note || "",
    });
  };

  const saveEdit = () => {
    updateLogMutation.mutate({ id: editingLogId, ...editForm });
  };

  const cancelEdit = () => {
    setEditingLogId(null);
  };

  return (
    <div className="min-h-screen bg-white font-inter text-[#111827]">
      {/* Tab Navigation Structure */}
      <nav
        className={`flex items-center justify-between px-6 border-b ${BORDER_GHOST} bg-white sticky top-0 z-50`}
      >
        <div className="flex gap-8">
          <a
            href="/"
            className="text-[#111827] font-semibold border-b-2 border-[#2563EB] pb-3 -mb-[1px] pt-4"
          >
            Today
          </a>
          <a
            href="/insights"
            className="text-[#6B7280] font-normal border-b-2 border-transparent hover:text-[#111827] pb-3 pt-4"
          >
            Insights
          </a>
          <a
            href="/calendar"
            className="text-[#6B7280] font-normal border-b-2 border-transparent hover:text-[#111827] pb-3 pt-4"
          >
            Calendar
          </a>
          <a
            href="/journal"
            className="text-[#6B7280] font-normal border-b-2 border-transparent hover:text-[#111827] pb-3 pt-4"
          >
            Journal
          </a>
          <a
            href="/diagnose"
            className="text-[#6B7280] font-normal border-b-2 border-transparent hover:text-[#111827] pb-3 pt-4"
          >
            Diagnosis
          </a>
        </div>
        <div className="bg-blue-50 text-[#2563EB] rounded-full px-3 py-1 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer">
          <Zap size={12} />
          <span>Beta</span>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-8">
        {/* Hero Section */}
        <header className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight mb-2">
            Happiness OS
          </h1>
          <p className="text-[#6B7280] text-sm">
            Understand what actually moves the needle.
          </p>
        </header>

        {/* Quick Mood Input */}
        <section
          className={`bg-white rounded-xl border ${BORDER_GHOST} p-6 mb-8`}
        >
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-1">How are you feeling?</h2>
            <p className="text-[#6B7280] text-sm">
              Select your current happiness baseline.
            </p>
          </div>

          <div className="flex justify-between gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
              <button
                key={rating}
                onClick={() => setSelectedMood(rating)}
                className={`
                  w-full h-10 rounded-sm border flex items-center justify-center text-sm font-medium transition-all
                  ${
                    selectedMood === rating
                      ? "bg-[#2563EB] border-[#2563EB] text-white"
                      : `bg-white ${BORDER_GHOST} text-[#6B7280] hover:border-gray-400`
                  }
                `}
              >
                {rating}
              </button>
            ))}
          </div>

          {selectedMood && (
            <div className="mt-6">
              <button
                onClick={() => logMoodMutation.mutate(selectedMood)}
                className="w-full bg-[#2563EB] text-white font-semibold py-3 rounded-sm hover:bg-blue-700 transition-colors"
                disabled={logMoodMutation.isLoading}
              >
                {logMoodMutation.isLoading ? "Logging..." : "Confirm Log"}
              </button>
            </div>
          )}
        </section>

        {/* Action Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <a
            href="/log"
            className={`flex flex-col items-start p-5 bg-white border ${BORDER_GHOST} rounded-xl hover:bg-[#F9FAFB] transition-colors`}
          >
            <div className="bg-blue-50 p-2 rounded-lg mb-3">
              <Plus size={20} className="text-[#2563EB]" />
            </div>
            <span className="font-semibold text-sm">Log Activity</span>
            <span className="text-[#6B7280] text-xs">
              Record what you're doing
            </span>
          </a>

          <a
            href="/diagnose"
            className={`flex flex-col items-start p-5 bg-white border ${BORDER_GHOST} rounded-xl hover:bg-[#F9FAFB] transition-colors`}
          >
            <div className="bg-orange-50 p-2 rounded-lg mb-3">
              <Brain size={20} className="text-orange-600" />
            </div>
            <span className="font-semibold text-sm">Diagnose</span>
            <span className="text-[#6B7280] text-xs">
              AI-driven needs check
            </span>
          </a>
        </div>

        {/* Recent Patterns / Score Cards */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Activity Impacts</h2>
            <a
              href="/insights"
              className="text-[#6B7280] text-xs flex items-center gap-1 hover:text-[#111827]"
            >
              View All <ChevronRight size={12} />
            </a>
          </div>

          <div className="space-y-3">
            {stats?.stats
              ?.filter(
                (item) => item.log_count > 0 && item.impact_score != null,
              )
              .slice(0, 3)
              .map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-4 bg-white border ${BORDER_GHOST} rounded-xl`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full border ${BORDER_GHOST} flex items-center justify-center bg-[#F9FAFB]`}
                    >
                      <Activity size={14} className="text-[#6B7280]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{item.name}</p>
                      <p className="text-[#6B7280] text-xs">
                        {item.log_count} logs recorded
                      </p>
                    </div>
                  </div>
                  <div
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${item.impact_score >= 0 ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}
                  >
                    {item.impact_score >= 0 ? "+" : ""}
                    {item.impact_score?.toFixed(1)} Happiness
                  </div>
                </div>
              ))}

            {(!stats?.stats ||
              stats.stats.filter((s) => s.log_count > 0).length === 0) && (
              <div
                className={`p-8 text-center bg-[#F9FAFB] border ${BORDER_GHOST} rounded-xl border-dashed`}
              >
                <p className="text-[#6B7280] text-sm">
                  No activity data yet. Start logging to see impacts.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Recent Logs - Editable */}
        <section className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Logs</h2>
            <span className="text-[#6B7280] text-xs">
              {recentLogs?.length || 0} entries
            </span>
          </div>

          <div className="space-y-3">
            {recentLogs?.slice(0, 5).map((log) => {
              const isEditing = editingLogId === log.id;

              if (isEditing) {
                return (
                  <div
                    key={log.id}
                    className="p-5 bg-white border-2 border-[#2563EB] rounded-xl"
                  >
                    <div className="mb-4">
                      <label className="text-xs font-medium text-[#6B7280] mb-2 block">
                        Activity
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {activities?.map((act) => (
                          <button
                            key={act.id}
                            onClick={() =>
                              setEditForm((prev) => ({
                                ...prev,
                                activity_id: act.id,
                              }))
                            }
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                              editForm.activity_id === act.id
                                ? "bg-blue-50 border-[#2563EB] text-[#2563EB]"
                                : `bg-white ${BORDER_GHOST} text-[#6B7280] hover:border-gray-400`
                            }`}
                          >
                            {act.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="text-xs font-medium text-[#6B7280] mb-2 block">
                        Mood ({editForm.mood_rating}/10)
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={editForm.mood_rating}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              mood_rating: parseInt(e.target.value),
                            }))
                          }
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#2563EB]"
                        />
                        <span className="text-lg font-semibold text-[#2563EB] w-6 text-center">
                          {editForm.mood_rating}
                        </span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="text-xs font-medium text-[#6B7280] mb-2 block">
                        Note
                      </label>
                      <textarea
                        className={`w-full p-3 rounded-lg border ${BORDER_GHOST} text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-1`}
                        rows={2}
                        placeholder="How did this feel?"
                        value={editForm.note}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            note: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        disabled={updateLogMutation.isPending}
                        className="flex-1 bg-[#2563EB] text-white font-medium py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center justify-center gap-2"
                      >
                        <Save size={14} />
                        {updateLogMutation.isPending
                          ? "Saving..."
                          : "Save Changes"}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className={`px-4 py-2.5 rounded-lg border ${BORDER_GHOST} text-[#6B7280] hover:bg-[#F9FAFB] transition-colors text-sm`}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={log.id}
                  className={`flex items-center justify-between p-4 bg-white border ${BORDER_GHOST} rounded-xl group hover:bg-[#F9FAFB] transition-colors`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                        log.mood_rating >= 7
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : log.mood_rating >= 4
                            ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                      }`}
                    >
                      {log.mood_rating}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {log.activity_name || "Mood Check"}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-[#6B7280] text-xs">
                          {timeAgo(log.logged_at)}
                        </span>
                        {log.note && (
                          <span className="text-[#9CA3AF] text-xs truncate max-w-[150px]">
                            — {log.note}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                    <button
                      onClick={() => startEditing(log)}
                      className="p-2 rounded-lg hover:bg-blue-50 text-[#6B7280] hover:text-[#2563EB] transition-colors"
                      title="Edit log"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm("Delete this log entry?")) {
                          deleteLogMutation.mutate(log.id);
                        }
                      }}
                      className="p-2 rounded-lg hover:bg-red-50 text-[#6B7280] hover:text-red-600 transition-colors"
                      title="Delete log"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}

            {(!recentLogs || recentLogs.length === 0) && (
              <div
                className={`p-8 text-center bg-[#F9FAFB] border ${BORDER_GHOST} rounded-xl border-dashed`}
              >
                <p className="text-[#6B7280] text-sm">
                  No logs yet. Start tracking to see entries here.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; }
      `}</style>
    </div>
  );
}
