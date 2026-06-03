import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Check,
  X,
  Trash2,
  Pencil,
  Save,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";

const BORDER_GHOST = "border-[#E5E7EB]";

function moodColor(rating) {
  if (rating >= 8) return { bg: "bg-green-500", text: "text-white" };
  if (rating >= 6) return { bg: "bg-green-300", text: "text-green-900" };
  if (rating >= 4) return { bg: "bg-yellow-300", text: "text-yellow-900" };
  if (rating >= 2) return { bg: "bg-red-300", text: "text-red-900" };
  return { bg: "bg-red-500", text: "text-white" };
}

function moodBorderColor(rating) {
  if (rating >= 8) return "border-green-400";
  if (rating >= 6) return "border-green-200";
  if (rating >= 4) return "border-yellow-200";
  if (rating >= 2) return "border-red-200";
  return "border-red-400";
}

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [newEntry, setNewEntry] = useState({
    activity_id: null,
    mood_rating: 5,
    note: "",
  });
  const [isAddingNewActivity, setIsAddingNewActivity] = useState(false);
  const [newActivityName, setNewActivityName] = useState("");
  const [confirmDeleteLogId, setConfirmDeleteLogId] = useState(null);
  const [editingLogId, setEditingLogId] = useState(null);
  const [editForm, setEditForm] = useState({
    activity_id: null,
    mood_rating: 5,
    note: "",
  });

  const { data: logs } = useQuery({
    queryKey: ["logs"],
    queryFn: async () => {
      const res = await fetch("/api/logs");
      if (!res.ok) throw new Error("Failed to fetch logs");
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

  const createActivityMutation = useMutation({
    mutationFn: async (name) => {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, category: "General" }),
      });
      if (!res.ok) throw new Error("Failed to create activity");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      setNewEntry((prev) => ({ ...prev, activity_id: data.id }));
      setIsAddingNewActivity(false);
      setNewActivityName("");
    },
  });

  const addLogMutation = useMutation({
    mutationFn: async (data) => {
      const res = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add log");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logs"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      setIsAddingEntry(false);
      setNewEntry({ activity_id: null, mood_rating: 5, note: "" });
      setIsAddingNewActivity(false);
      setNewActivityName("");
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
      setConfirmDeleteLogId(null);
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

  const handleAddEntry = () => {
    if (!newEntry.activity_id) return;
    const loggedAt = new Date(selectedDate);
    loggedAt.setHours(12, 0, 0, 0);
    addLogMutation.mutate({
      activity_id: newEntry.activity_id,
      mood_rating: newEntry.mood_rating,
      note: newEntry.note,
      logged_at: loggedAt.toISOString(),
    });
  };

  const resetAddForm = () => {
    setIsAddingEntry(false);
    setNewEntry({ activity_id: null, mood_rating: 5, note: "" });
    setIsAddingNewActivity(false);
    setNewActivityName("");
  };

  const logsByDate = useMemo(() => {
    if (!logs) return {};
    const grouped = {};
    for (const log of logs) {
      const dateKey = format(new Date(log.logged_at), "yyyy-MM-dd");
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(log);
    }
    return grouped;
  }, [logs]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const days = [];
    let day = gridStart;
    while (day <= gridEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  const selectedDateKey = format(selectedDate, "yyyy-MM-dd");
  const selectedLogs = logsByDate[selectedDateKey] || [];

  const avgMoodForDate = (dateKey) => {
    const dayLogs = logsByDate[dateKey];
    if (!dayLogs || dayLogs.length === 0) return null;
    const sum = dayLogs.reduce((acc, l) => acc + l.mood_rating, 0);
    return sum / dayLogs.length;
  };

  const startEditingLog = (log) => {
    setEditingLogId(log.id);
    setEditForm({
      activity_id: log.activity_id,
      mood_rating: log.mood_rating,
      note: log.note || "",
    });
    setConfirmDeleteLogId(null);
    setIsAddingEntry(false);
  };

  const cancelEditing = () => setEditingLogId(null);

  return (
    <div className="min-h-screen bg-white font-inter text-[#111827]">
      <nav className="flex items-center px-6 h-16 border-b border-[#E5E7EB] bg-white sticky top-0 z-50">
        <a href="/" className="mr-4 text-[#6B7280] hover:text-[#111827]">
          <ArrowLeft size={20} />
        </a>
        <h1 className="text-lg font-semibold">Activity Calendar</h1>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors"
          >
            <ChevronLeft size={18} className="text-[#6B7280]" />
          </button>
          <h2 className="text-xl font-semibold tracking-tight">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors"
          >
            <ChevronRight size={18} className="text-[#6B7280]" />
          </button>
        </div>

        <section className="bg-white rounded-xl border border-[#E5E7EB] p-4 mb-8">
          <div className="grid grid-cols-7 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div
                key={d}
                className="text-center text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider py-2"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((day) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const dayLogs = logsByDate[dateKey] || [];
              const avgMood = avgMoodForDate(dateKey);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = isSameDay(day, selectedDate);
              const isTodayDate = isToday(day);

              return (
                <button
                  key={dateKey}
                  onClick={() => {
                    setSelectedDate(day);
                    resetAddForm();
                  }}
                  className={`relative flex flex-col items-center justify-start p-1.5 min-h-[72px] border transition-all ${
                    isSelected
                      ? "border-[#2563EB] bg-blue-50 z-10"
                      : "border-[#E5E7EB] hover:bg-[#F9FAFB]"
                  } ${!isCurrentMonth ? "opacity-30" : ""}`}
                >
                  <span
                    className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                      isTodayDate && !isSelected
                        ? "bg-[#111827] text-white"
                        : isSelected
                          ? "text-[#2563EB] font-bold"
                          : "text-[#6B7280]"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                  {dayLogs.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-0.5 mt-0.5">
                      {dayLogs.slice(0, 4).map((log) => {
                        const colors = moodColor(log.mood_rating);
                        return (
                          <div
                            key={log.id}
                            className={`w-2 h-2 rounded-full ${colors.bg}`}
                          />
                        );
                      })}
                      {dayLogs.length > 4 && (
                        <span className="text-[8px] text-[#9CA3AF] font-medium">
                          +{dayLogs.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                  {avgMood !== null && (
                    <span
                      className={`mt-auto text-[9px] font-bold px-1 py-0.5 rounded ${moodColor(avgMood).bg} ${moodColor(avgMood).text}`}
                    >
                      {avgMood.toFixed(1)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <div className="flex items-center justify-center gap-4 mb-8">
          {[
            ["bg-green-500", "Great (8-10)"],
            ["bg-green-300", "Good (6-7)"],
            ["bg-yellow-300", "OK (4-5)"],
            ["bg-red-400", "Low (1-3)"],
          ].map(([bg, label]) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${bg}`} />
              <span className="text-[10px] text-[#6B7280]">{label}</span>
            </div>
          ))}
        </div>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {isToday(selectedDate)
                ? "Today"
                : format(selectedDate, "EEEE, MMM d")}
            </h3>
            <span className="text-[#6B7280] text-xs">
              {selectedLogs.length}{" "}
              {selectedLogs.length === 1 ? "entry" : "entries"}
            </span>
          </div>

          <div className="space-y-3">
            {selectedLogs.map((log) => {
              const isConfirming = confirmDeleteLogId === log.id;
              const isEditing = editingLogId === log.id;

              if (isEditing) {
                return (
                  <div
                    key={log.id}
                    className="p-5 bg-white border-2 border-[#2563EB] rounded-xl"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-semibold">Edit entry</p>
                      <button
                        onClick={cancelEditing}
                        className="text-[#9CA3AF] hover:text-[#6B7280]"
                      >
                        <X size={16} />
                      </button>
                    </div>

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
                                : "bg-white border-[#E5E7EB] text-[#6B7280] hover:border-gray-400"
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
                        Note (optional)
                      </label>
                      <textarea
                        className="w-full p-3 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
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
                        onClick={() =>
                          updateLogMutation.mutate({ id: log.id, ...editForm })
                        }
                        disabled={updateLogMutation.isPending}
                        className="flex-1 bg-[#2563EB] text-white font-medium py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Save size={14} />
                        {updateLogMutation.isPending
                          ? "Saving…"
                          : "Save Changes"}
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="px-4 py-2.5 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB] transition-colors"
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
                  className="flex items-center justify-between p-4 bg-white border border-[#E5E7EB] rounded-xl group transition-colors hover:bg-[#F9FAFB]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border ${moodBorderColor(log.mood_rating)} ${
                        log.mood_rating >= 7
                          ? "bg-green-50 text-green-700"
                          : log.mood_rating >= 4
                            ? "bg-yellow-50 text-yellow-700"
                            : "bg-red-50 text-red-700"
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
                          {format(new Date(log.logged_at), "h:mm a")}
                        </span>
                        {log.note && (
                          <span className="text-[#9CA3AF] text-xs truncate max-w-[160px]">
                            — {log.note}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {isConfirming ? (
                      <>
                        <span className="text-xs text-red-600 font-medium whitespace-nowrap">
                          Delete?
                        </span>
                        <button
                          onClick={() => deleteLogMutation.mutate(log.id)}
                          disabled={deleteLogMutation.isPending}
                          className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          {deleteLogMutation.isPending ? "…" : "Yes"}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteLogId(null)}
                          className="px-3 py-1 rounded-lg border border-[#E5E7EB] text-[#6B7280] text-xs hover:bg-[#F9FAFB] transition-colors"
                        >
                          No
                        </button>
                      </>
                    ) : (
                      <>
                        {log.activity_category && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium border border-[#E5E7EB] bg-[#F9FAFB] text-[#6B7280]">
                            {log.activity_category}
                          </span>
                        )}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEditingLog(log)}
                            className="p-2 rounded-lg hover:bg-blue-50 text-[#6B7280] hover:text-[#2563EB] transition-colors"
                            title="Edit entry"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => {
                              setConfirmDeleteLogId(log.id);
                              setEditingLogId(null);
                            }}
                            className="p-2 rounded-lg hover:bg-red-50 text-[#6B7280] hover:text-red-600 transition-colors"
                            title="Delete entry"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {selectedLogs.length > 1 && (
              <div className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl">
                <p className="text-xs text-[#6B7280]">
                  <span className="font-semibold text-[#111827]">
                    Daily average:
                  </span>{" "}
                  {(
                    selectedLogs.reduce((s, l) => s + l.mood_rating, 0) /
                    selectedLogs.length
                  ).toFixed(1)}
                  /10 across {selectedLogs.length} activities
                </p>
              </div>
            )}

            {selectedLogs.length === 0 && !isAddingEntry && (
              <div className="p-8 text-center bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl border-dashed">
                <CalendarIcon
                  size={24}
                  className="text-[#D1D5DB] mx-auto mb-2"
                />
                <p className="text-[#6B7280] text-sm">
                  No activities logged on this day.
                </p>
              </div>
            )}

            {isAddingEntry ? (
              <div className="p-5 bg-white border-2 border-[#2563EB] rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold">
                    Add entry for {format(selectedDate, "MMM d")}
                  </p>
                  <button
                    onClick={resetAddForm}
                    className="text-[#9CA3AF] hover:text-[#6B7280]"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-[#6B7280]">
                      Activity
                    </label>
                    <button
                      onClick={() =>
                        setIsAddingNewActivity(!isAddingNewActivity)
                      }
                      className="text-[#2563EB] text-xs font-medium flex items-center gap-0.5 hover:underline"
                    >
                      <Plus size={11} /> New
                    </button>
                  </div>

                  {isAddingNewActivity && (
                    <div className="mb-3 p-3 rounded-lg border border-[#2563EB] bg-blue-50 flex gap-2">
                      <input
                        autoFocus
                        className="flex-1 bg-transparent border-none focus:outline-none text-sm"
                        placeholder="e.g. Journaling"
                        value={newActivityName}
                        onChange={(e) => setNewActivityName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newActivityName.trim()) {
                            createActivityMutation.mutate(
                              newActivityName.trim(),
                            );
                          }
                        }}
                      />
                      <button
                        onClick={() =>
                          newActivityName.trim() &&
                          createActivityMutation.mutate(newActivityName.trim())
                        }
                        disabled={createActivityMutation.isPending}
                        className="text-[#2563EB] text-xs font-semibold"
                      >
                        {createActivityMutation.isPending ? "…" : "Add"}
                      </button>
                      <button
                        onClick={() => setIsAddingNewActivity(false)}
                        className="text-[#9CA3AF] text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {activities?.map((act) => (
                      <button
                        key={act.id}
                        onClick={() =>
                          setNewEntry((prev) => ({
                            ...prev,
                            activity_id: act.id,
                          }))
                        }
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          newEntry.activity_id === act.id
                            ? "bg-blue-50 border-[#2563EB] text-[#2563EB]"
                            : "bg-white border-[#E5E7EB] text-[#6B7280] hover:border-gray-400"
                        }`}
                      >
                        {act.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-xs font-medium text-[#6B7280] mb-2 block">
                    Mood ({newEntry.mood_rating}/10)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={newEntry.mood_rating}
                      onChange={(e) =>
                        setNewEntry((prev) => ({
                          ...prev,
                          mood_rating: parseInt(e.target.value),
                        }))
                      }
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#2563EB]"
                    />
                    <span className="text-lg font-semibold text-[#2563EB] w-6 text-center">
                      {newEntry.mood_rating}
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-xs font-medium text-[#6B7280] mb-2 block">
                    Note (optional)
                  </label>
                  <textarea
                    className="w-full p-3 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    rows={2}
                    placeholder="How did this feel?"
                    value={newEntry.note}
                    onChange={(e) =>
                      setNewEntry((prev) => ({ ...prev, note: e.target.value }))
                    }
                  />
                </div>

                <button
                  onClick={handleAddEntry}
                  disabled={!newEntry.activity_id || addLogMutation.isPending}
                  className="w-full bg-[#2563EB] text-white font-medium py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Check size={14} />
                  {addLogMutation.isPending ? "Saving…" : "Save Entry"}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingEntry(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[#E5E7EB] text-sm font-medium text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827] transition-colors"
              >
                <Plus size={15} />
                Add entry for {format(selectedDate, "MMM d")}
              </button>
            )}
          </div>
        </section>
      </main>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body {
          font-family: 'Inter', sans-serif;
        }
      `}</style>
    </div>
  );
}
