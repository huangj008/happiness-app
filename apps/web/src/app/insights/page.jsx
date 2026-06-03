import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  TrendingUp,
  Activity,
  Pencil,
  Trash2,
  X,
  Save,
} from "lucide-react";

const BORDER_GHOST = "border-[#E5E7EB]";

const CATEGORIES = [
  "Exercise",
  "Social",
  "Work",
  "Rest",
  "Digital",
  "Outdoors",
  "Creative",
  "Movement",
  "Entertainment",
  "Mental",
  "Productivity",
  "Other",
];

export default function InsightsPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", category: "" });
  const [deleteError, setDeleteError] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const { data: statsData, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const res = await fetch("/api/logs/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  const allStats = statsData?.stats || [];
  const trackedStats = allStats.filter((s) => s.log_count > 0);
  const untrackedStats = allStats.filter((s) => s.log_count === 0);

  const updateActivityMutation = useMutation({
    mutationFn: async (data) => {
      const res = await fetch("/api/activities", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update activity");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      setEditingId(null);
    },
  });

  const deleteActivityMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch("/api/activities", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, force: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete activity");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });
      setDeleteError(null);
      setConfirmDeleteId(null);
    },
    onError: (err) => {
      setDeleteError(err.message);
      setConfirmDeleteId(null);
    },
  });

  const startEditing = (item) => {
    setEditingId(item.id);
    setEditForm({ name: item.name, category: item.category || "" });
    setDeleteError(null);
    setConfirmDeleteId(null);
  };

  const saveEdit = () => {
    updateActivityMutation.mutate({ id: editingId, ...editForm });
  };

  const ActivityRow = ({ item, showImpact }) => {
    const isEditing = editingId === item.id;
    const hasData = item.log_count > 0;
    const isConfirmingDelete = confirmDeleteId === item.id;

    if (isEditing) {
      return (
        <div className="p-4 border-2 border-[#2563EB] rounded-xl bg-white">
          {/* Name input */}
          <div className="mb-3">
            <label className="text-xs font-medium text-[#6B7280] mb-1 block">
              Activity Name
            </label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, name: e.target.value }))
              }
              className={`w-full px-3 py-2 text-sm border ${BORDER_GHOST} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]`}
              placeholder="e.g. Morning walk"
            />
          </div>
          {/* Category pills */}
          <div className="mb-4">
            <label className="text-xs font-medium text-[#6B7280] mb-2 block">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() =>
                    setEditForm((prev) => ({ ...prev, category: cat }))
                  }
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    editForm.category === cat
                      ? "bg-blue-50 border-[#2563EB] text-[#2563EB]"
                      : `bg-white ${BORDER_GHOST} text-[#6B7280] hover:border-gray-400`
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={saveEdit}
              disabled={
                updateActivityMutation.isPending || !editForm.name.trim()
              }
              className="flex-1 bg-[#2563EB] text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save size={13} />
              {updateActivityMutation.isPending ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => setEditingId(null)}
              className={`px-4 py-2 rounded-lg border ${BORDER_GHOST} text-[#6B7280] hover:bg-[#F9FAFB] transition-colors`}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between group">
        <div className="flex items-center gap-4">
          {showImpact && (
            <div className="relative w-12 h-12 flex items-center justify-center">
              <svg className="w-12 h-12 transform -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="#F3F4F6"
                  strokeWidth="3"
                  fill="transparent"
                />
                {hasData && (
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke={item.impact_score >= 0 ? "#10B981" : "#EF4444"}
                    strokeWidth="3"
                    fill="transparent"
                    strokeDasharray={125.6}
                    strokeDashoffset={
                      125.6 -
                      (Math.min(Math.abs(item.impact_score) * 20, 100) / 100) *
                        125.6
                    }
                    strokeLinecap="round"
                  />
                )}
              </svg>
              <span className="absolute text-[10px] font-semibold">
                {hasData ? item.avg_rating?.toFixed(1) : "—"}
              </span>
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-[#111827]">{item.name}</p>
            <p className="text-[#6B7280] text-xs">
              {hasData
                ? `${item.log_count} session${item.log_count > 1 ? "s" : ""} tracked`
                : item.category || "Uncategorised"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isConfirmingDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-600 font-medium whitespace-nowrap">
                {hasData
                  ? `Delete with ${item.log_count} log${item.log_count > 1 ? "s" : ""}?`
                  : "Delete?"}
              </span>
              <button
                onClick={() => deleteActivityMutation.mutate(item.id)}
                disabled={deleteActivityMutation.isPending}
                className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteActivityMutation.isPending ? "…" : "Yes"}
              </button>
              <button
                onClick={() => setConfirmDeleteId(null)}
                className={`px-3 py-1 rounded-lg border ${BORDER_GHOST} text-[#6B7280] text-xs hover:bg-[#F9FAFB] transition-colors`}
              >
                No
              </button>
            </div>
          ) : (
            <>
              {showImpact && (
                <div className="text-right mr-2">
                  {hasData ? (
                    <>
                      <p
                        className={`text-sm font-semibold ${item.impact_score >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {item.impact_score >= 0 ? "+" : ""}
                        {item.impact_score?.toFixed(1)}
                      </p>
                      <p className="text-[#6B7280] text-[10px] uppercase tracking-wider font-medium">
                        Impact
                      </p>
                    </>
                  ) : (
                    <span
                      className={`text-xs text-[#9CA3AF] px-2 py-1 rounded-full border ${BORDER_GHOST} bg-[#F9FAFB]`}
                    >
                      No data yet
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => startEditing(item)}
                  className="p-2 rounded-lg hover:bg-blue-50 text-[#6B7280] hover:text-[#2563EB] transition-colors"
                  title="Edit activity"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => {
                    setDeleteError(null);
                    setConfirmDeleteId(item.id);
                  }}
                  className="p-2 rounded-lg hover:bg-red-50 text-[#6B7280] hover:text-red-600 transition-colors"
                  title="Delete activity"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white font-inter text-[#111827]">
      <nav
        className={`flex items-center px-6 h-16 border-b ${BORDER_GHOST} bg-white sticky top-0 z-50`}
      >
        <a href="/" className="mr-4 text-[#6B7280] hover:text-[#111827]">
          <ArrowLeft size={20} />
        </a>
        <h1 className="text-lg font-semibold">Happiness Insights</h1>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <header className="mb-10">
          <h2 className="text-2xl font-semibold tracking-tight mb-2">
            Pattern Analysis
          </h2>
          <p className="text-[#6B7280] text-sm">
            Activities correlated with your mood changes. Hover any row to edit
            or delete.
          </p>
        </header>

        {deleteError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start justify-between gap-3">
            <span>{deleteError}</span>
            <button
              onClick={() => setDeleteError(null)}
              className="shrink-0 text-red-400 hover:text-red-600"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-24 bg-gray-50 border ${BORDER_GHOST} rounded-xl animate-pulse`}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Activity Rankings — tracked activities */}
            <section
              className={`bg-white rounded-xl border ${BORDER_GHOST} p-6`}
            >
              <h3 className="text-base font-semibold mb-6">
                Activity Rankings
              </h3>
              <div className="space-y-6">
                {trackedStats.map((item) => (
                  <ActivityRow key={item.id} item={item} showImpact={true} />
                ))}
                {trackedStats.length === 0 && (
                  <p className="text-center text-[#6B7280] text-sm py-4">
                    No activities logged yet. Start tracking to see rankings.
                  </p>
                )}
              </div>
            </section>

            {/* Untracked activities */}
            {untrackedStats.length > 0 && (
              <section
                className={`bg-white rounded-xl border ${BORDER_GHOST} p-6`}
              >
                <h3 className="text-base font-semibold mb-1">
                  Untracked Activities
                </h3>
                <p className="text-xs text-[#6B7280] mb-6">
                  These activities haven't been logged yet. Log them to see
                  their impact score.
                </p>
                <div className="space-y-5">
                  {untrackedStats.map((item) => (
                    <ActivityRow key={item.id} item={item} showImpact={true} />
                  ))}
                </div>
              </section>
            )}

            {/* Key Takeaways */}
            <section
              className={`bg-white rounded-xl border ${BORDER_GHOST} p-6`}
            >
              <h3 className="text-base font-semibold mb-3">Key Takeaways</h3>
              <div className="space-y-2">
                {trackedStats.length > 0 ? (
                  <>
                    <div className="text-sm text-[#4B5563] py-1 flex items-start">
                      <span className="text-[#9CA3AF] mr-2">-</span>
                      Your happiness increases by{" "}
                      {trackedStats[0].impact_score?.toFixed(1)} when you engage
                      in {trackedStats[0].name}.
                    </div>
                    {trackedStats.length > 1 && (
                      <div className="text-sm text-[#4B5563] py-1 flex items-start">
                        <span className="text-[#9CA3AF] mr-2">-</span>
                        {trackedStats[trackedStats.length - 1].name} has the
                        lowest correlation with positive mood.
                      </div>
                    )}
                    <div className="text-sm text-[#4B5563] py-1 flex items-start">
                      <span className="text-[#9CA3AF] mr-2">-</span>
                      Consistent logging will refine these patterns over time.
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-[#4B5563] py-1">
                    <span className="text-[#9CA3AF] mr-2">-</span>
                    No takeaways available yet.
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </main>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; }
      `}</style>
    </div>
  );
}
