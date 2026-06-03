import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Save,
  Trash2,
  Check,
  Search,
  X,
  Tag,
  Calendar,
  Plus,
} from "lucide-react";
import {
  format,
  addDays,
  subDays,
  isToday,
  isFuture,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  subMonths,
} from "date-fns";

const BORDER_GHOST = "border-[#E5E7EB]";

const PROMPTS = [
  "What were the highlights of your day?",
  "What challenged you today, and how did you respond?",
  "What are you grateful for right now?",
  "How did your energy flow throughout the day?",
  "What would you do differently if you could replay today?",
  "What did you learn about yourself today?",
  "What moment brought you the most peace today?",
];

const SUGGESTED_TAGS = [
  "productive",
  "rest",
  "social",
  "anxious",
  "grateful",
  "tired",
  "motivated",
  "creative",
  "stressed",
  "calm",
];

function getPrompt(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const day = Math.floor(diff / (1000 * 60 * 60 * 24));
  return PROMPTS[day % PROMPTS.length];
}

function moodColor(r) {
  if (r >= 8) return "bg-green-500";
  if (r >= 6) return "bg-green-300";
  if (r >= 4) return "bg-yellow-300";
  return "bg-red-400";
}

function moodTextColor(r) {
  if (r >= 7) return "text-green-700";
  if (r >= 4) return "text-yellow-700";
  return "text-red-600";
}

// ─── Write Tab ───────────────────────────────────────────────────────────────
function WriteTab({ allLogs, selectedDate, setSelectedDate }) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [dayRating, setDayRating] = useState(null);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const dateKey = format(selectedDate, "yyyy-MM-dd");

  const { data: entry, isLoading } = useQuery({
    queryKey: ["journal", dateKey],
    queryFn: async () => {
      const res = await fetch("/api/journal?date=" + dateKey);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const dayLogs = (allLogs || []).filter(
    (l) => format(new Date(l.logged_at), "yyyy-MM-dd") === dateKey,
  );

  useEffect(() => {
    if (entry) {
      setContent(entry.content || "");
      setDayRating(entry.day_rating || null);
      setTags(entry.tags || []);
    } else {
      setContent("");
      setDayRating(null);
      setTags([]);
    }
    setHasUnsaved(false);
    setSaveSuccess(false);
  }, [entry, dateKey]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal", dateKey] });
      queryClient.invalidateQueries({ queryKey: ["journal-month"] });
      queryClient.invalidateQueries({ queryKey: ["journal-search"] });
      setHasUnsaved(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch("/api/journal", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal", dateKey] });
      queryClient.invalidateQueries({ queryKey: ["journal-month"] });
      queryClient.invalidateQueries({ queryKey: ["journal-search"] });
      setContent("");
      setDayRating(null);
      setTags([]);
      setHasUnsaved(false);
    },
  });

  const handleSave = useCallback(() => {
    if (!content.trim()) return;
    saveMutation.mutate({
      entry_date: dateKey,
      content: content.trim(),
      day_rating: dayRating,
      tags,
    });
  }, [content, dayRating, tags, dateKey]);

  const addTag = (tag) => {
    const t = tag.toLowerCase().trim();
    if (t && !tags.includes(t)) {
      const next = [...tags, t];
      setTags(next);
      setHasUnsaved(true);
    }
    setTagInput("");
  };

  const removeTag = (tag) => {
    setTags(tags.filter((t) => t !== tag));
    setHasUnsaved(true);
  };

  const canGoNext = !isToday(selectedDate);

  return (
    <div>
      {/* Date navigator */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setSelectedDate((d) => subDays(d, 1))}
          className={
            "p-2 rounded-lg border " +
            BORDER_GHOST +
            " hover:bg-[#F9FAFB] transition-colors"
          }
        >
          <ChevronLeft size={18} className="text-[#6B7280]" />
        </button>
        <div className="text-center">
          <h2 className="text-xl font-semibold">
            {isToday(selectedDate)
              ? "Today"
              : format(selectedDate, "EEEE, MMM d")}
          </h2>
          <p className="text-xs text-[#9CA3AF]">
            {format(selectedDate, "MMMM d, yyyy")}
          </p>
        </div>
        <button
          onClick={() => {
            if (canGoNext) setSelectedDate((d) => addDays(d, 1));
          }}
          disabled={!canGoNext}
          className={
            "p-2 rounded-lg border " +
            BORDER_GHOST +
            " hover:bg-[#F9FAFB] transition-colors disabled:opacity-30"
          }
        >
          <ChevronRight size={18} className="text-[#6B7280]" />
        </button>
      </div>

      {/* Activity summary */}
      {dayLogs.length > 0 && (
        <div
          className={
            "mb-5 p-4 bg-[#F9FAFB] border " + BORDER_GHOST + " rounded-xl"
          }
        >
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2">
            Activities logged
          </p>
          <div className="flex flex-wrap gap-2">
            {dayLogs.map((log) => (
              <div
                key={log.id}
                className={
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border " +
                  BORDER_GHOST +
                  " bg-white"
                }
              >
                <div
                  className={
                    "w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold " +
                    (log.mood_rating >= 7
                      ? "bg-green-100 text-green-700"
                      : log.mood_rating >= 4
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700")
                  }
                >
                  {log.mood_rating}
                </div>
                <span className="text-[#4B5563]">
                  {log.activity_name || "Mood"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Day rating */}
      <div className="mb-5">
        <p className="text-sm font-semibold mb-2">How was your day overall?</p>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
            <button
              key={val}
              onClick={() => {
                setDayRating(dayRating === val ? null : val);
                setHasUnsaved(true);
              }}
              className={
                "flex-1 h-9 rounded-md border flex items-center justify-center text-xs font-medium transition-all " +
                (dayRating === val
                  ? "bg-[#2563EB] border-[#2563EB] text-white"
                  : "bg-white " +
                    BORDER_GHOST +
                    " text-[#6B7280] hover:border-gray-400")
              }
            >
              {val}
            </button>
          ))}
        </div>
      </div>

      {/* Prompt */}
      <div className="flex items-center gap-2 mb-2">
        <BookOpen size={13} className="text-[#9CA3AF] shrink-0" />
        <p className="text-xs text-[#9CA3AF] italic">
          {getPrompt(selectedDate)}
        </p>
      </div>

      {/* Textarea */}
      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          setHasUnsaved(true);
          setSaveSuccess(false);
        }}
        placeholder="Write about your day..."
        className={
          "w-full p-5 rounded-xl border text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-[#FAFBFC] transition-colors resize-none mb-4 " +
          (hasUnsaved ? "border-[#2563EB]" : BORDER_GHOST)
        }
        rows={10}
      />

      {/* Tags */}
      <div className={"mb-5 p-4 rounded-xl border " + BORDER_GHOST}>
        <div className="flex items-center gap-2 mb-3">
          <Tag size={13} className="text-[#9CA3AF]" />
          <p className="text-xs font-semibold text-[#6B7280]">Tags</p>
        </div>

        {/* Current tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-200 text-[#2563EB] rounded-full text-xs font-medium"
              >
                #{tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="hover:text-blue-900 ml-0.5"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Suggested tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {SUGGESTED_TAGS.filter((t) => !tags.includes(t)).map((t) => (
            <button
              key={t}
              onClick={() => addTag(t)}
              className={
                "px-2.5 py-1 rounded-full text-xs border " +
                BORDER_GHOST +
                " text-[#6B7280] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors"
              }
            >
              +{t}
            </button>
          ))}
        </div>

        {/* Custom tag input */}
        <div className="flex gap-2">
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && tagInput.trim()) {
                addTag(tagInput);
              }
            }}
            placeholder="Custom tag..."
            className={
              "flex-1 px-3 py-1.5 rounded-lg border " +
              BORDER_GHOST +
              " text-xs focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
            }
          />
          <button
            onClick={() => addTag(tagInput)}
            disabled={!tagInput.trim()}
            className="px-3 py-1.5 rounded-lg bg-[#2563EB] text-white text-xs font-medium disabled:opacity-40"
          >
            <Plus size={12} />
          </button>
        </div>
      </div>

      {/* Save / Delete */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={
            !content.trim() ||
            saveMutation.isPending ||
            (!hasUnsaved && !saveSuccess)
          }
          className={
            "flex-1 font-medium py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50 " +
            (saveSuccess
              ? "bg-green-600 text-white"
              : "bg-[#2563EB] text-white hover:bg-blue-700")
          }
        >
          {saveMutation.isPending ? (
            "Saving…"
          ) : saveSuccess ? (
            <>
              <Check size={15} /> Saved
            </>
          ) : (
            <>
              <Save size={15} />
              {entry ? "Update Entry" : "Save Entry"}
            </>
          )}
        </button>
        {entry && (
          <button
            onClick={() => {
              if (window.confirm("Delete this entry?"))
                deleteMutation.mutate(entry.id);
            }}
            disabled={deleteMutation.isPending}
            className={
              "px-4 py-3 rounded-xl border " +
              BORDER_GHOST +
              " text-[#6B7280] hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
            }
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {hasUnsaved && (
        <p className="text-xs text-[#9CA3AF] text-center mt-3">
          Unsaved changes
        </p>
      )}
      {content.trim().length > 0 && (
        <p className="text-[10px] text-[#D1D5DB] text-right mt-2">
          {content.trim().split(/\s+/).length} words
        </p>
      )}
    </div>
  );
}

// ─── Search Tab ──────────────────────────────────────────────────────────────
function SearchTab() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");

  const { data: results, isLoading } = useQuery({
    queryKey: ["journal-search", submitted],
    queryFn: async () => {
      if (!submitted) return [];
      const res = await fetch(
        "/api/journal?search=" + encodeURIComponent(submitted),
      );
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: !!submitted,
  });

  const handleSearch = () => {
    if (query.trim()) setSubmitted(query.trim());
  };

  function highlight(text, term) {
    if (!term) return text;
    const idx = text.toLowerCase().indexOf(term.toLowerCase());
    if (idx === -1) return text.slice(0, 120) + (text.length > 120 ? "…" : "");
    const start = Math.max(0, idx - 40);
    const end = Math.min(text.length, idx + term.length + 80);
    const snippet =
      (start > 0 ? "…" : "") +
      text.slice(start, end) +
      (end < text.length ? "…" : "");
    return snippet;
  }

  return (
    <div>
      <div className={"flex gap-2 mb-6"}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search entries or tags…"
          className={
            "flex-1 px-4 py-2.5 rounded-xl border " +
            BORDER_GHOST +
            " text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          }
        />
        <button
          onClick={handleSearch}
          disabled={!query.trim()}
          className="px-4 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <Search size={15} /> Search
        </button>
      </div>

      {isLoading && (
        <p className="text-sm text-[#9CA3AF] text-center py-8">Searching…</p>
      )}

      {submitted && !isLoading && results?.length === 0 && (
        <div
          className={
            "p-8 text-center bg-[#F9FAFB] border " +
            BORDER_GHOST +
            " rounded-xl border-dashed"
          }
        >
          <Search size={22} className="text-[#D1D5DB] mx-auto mb-2" />
          <p className="text-sm text-[#6B7280]">
            No entries found for "{submitted}"
          </p>
        </div>
      )}

      <div className="space-y-3">
        {(results || []).map((entry) => (
          <a
            key={entry.id}
            href="/journal"
            className={
              "block p-4 bg-white border " +
              BORDER_GHOST +
              " rounded-xl hover:bg-[#F9FAFB] transition-colors"
            }
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-[#111827]">
                {format(
                  new Date(entry.entry_date.slice(0, 10) + "T12:00:00"),
                  "EEEE, MMMM d, yyyy",
                )}
              </span>
              {entry.day_rating && (
                <span
                  className={
                    "text-xs font-bold px-2 py-0.5 rounded-full text-white " +
                    moodColor(entry.day_rating)
                  }
                >
                  {entry.day_rating}/10
                </span>
              )}
            </div>
            <p className="text-xs text-[#6B7280] leading-relaxed mb-2">
              {highlight(entry.content, submitted)}
            </p>
            {entry.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {entry.tags.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 bg-blue-50 text-[#2563EB] text-[10px] rounded-full font-medium"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Monthly View Tab ─────────────────────────────────────────────────────────
function MonthlyTab({ setTab, setSelectedDate }) {
  const [viewMonth, setViewMonth] = useState(new Date());
  const monthKey = format(viewMonth, "yyyy-MM");

  const { data: entries } = useQuery({
    queryKey: ["journal-month", monthKey],
    queryFn: async () => {
      const res = await fetch("/api/journal?month=" + monthKey);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const entriesByDate = {};
  (entries || []).forEach((e) => {
    const dk = e.entry_date.slice(0, 10);
    entriesByDate[dk] = e;
  });

  const days = eachDayOfInterval({
    start: startOfMonth(viewMonth),
    end: endOfMonth(viewMonth),
  });
  const totalDays = days.length;
  const writtenDays = Object.keys(entriesByDate).length;
  const avgRating = entries?.length
    ? (
        entries
          .filter((e) => e.day_rating)
          .reduce((s, e) => s + e.day_rating, 0) /
        (entries.filter((e) => e.day_rating).length || 1)
      ).toFixed(1)
    : null;

  // Collect all tags for the month
  const allTags = {};
  (entries || []).forEach((e) => {
    (e.tags || []).forEach((t) => {
      allTags[t] = (allTags[t] || 0) + 1;
    });
  });
  const topTags = Object.entries(allTags)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <div>
      {/* Month navigator */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setViewMonth((m) => subMonths(m, 1))}
          className={
            "p-2 rounded-lg border " +
            BORDER_GHOST +
            " hover:bg-[#F9FAFB] transition-colors"
          }
        >
          <ChevronLeft size={18} className="text-[#6B7280]" />
        </button>
        <h2 className="text-xl font-semibold">
          {format(viewMonth, "MMMM yyyy")}
        </h2>
        <button
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          disabled={isSameMonth(viewMonth, new Date())}
          className={
            "p-2 rounded-lg border " +
            BORDER_GHOST +
            " hover:bg-[#F9FAFB] transition-colors disabled:opacity-30"
          }
        >
          <ChevronRight size={18} className="text-[#6B7280]" />
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div
          className={
            "p-4 bg-[#F9FAFB] border " +
            BORDER_GHOST +
            " rounded-xl text-center"
          }
        >
          <p className="text-2xl font-bold text-[#111827]">{writtenDays}</p>
          <p className="text-xs text-[#6B7280] mt-0.5">entries</p>
        </div>
        <div
          className={
            "p-4 bg-[#F9FAFB] border " +
            BORDER_GHOST +
            " rounded-xl text-center"
          }
        >
          <p className="text-2xl font-bold text-[#111827]">
            {totalDays > 0 ? Math.round((writtenDays / totalDays) * 100) : 0}%
          </p>
          <p className="text-xs text-[#6B7280] mt-0.5">consistency</p>
        </div>
        <div
          className={
            "p-4 bg-[#F9FAFB] border " +
            BORDER_GHOST +
            " rounded-xl text-center"
          }
        >
          <p
            className={
              "text-2xl font-bold " +
              (avgRating
                ? moodTextColor(parseFloat(avgRating))
                : "text-[#D1D5DB]")
            }
          >
            {avgRating || "—"}
          </p>
          <p className="text-xs text-[#6B7280] mt-0.5">avg rating</p>
        </div>
      </div>

      {/* Top tags */}
      {topTags.length > 0 && (
        <div className={"mb-6 p-4 border " + BORDER_GHOST + " rounded-xl"}>
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">
            Top tags this month
          </p>
          <div className="flex flex-wrap gap-2">
            {topTags.map(([tag, count]) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 text-[#2563EB] rounded-full text-xs font-medium"
              >
                #{tag}
                <span className="text-blue-400 font-normal">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Day-by-day calendar strip */}
      <div
        className={
          "border " + BORDER_GHOST + " rounded-xl overflow-hidden mb-6"
        }
      >
        <div className="grid grid-cols-7 bg-[#F9FAFB] border-b border-[#E5E7EB]">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
            <div
              key={d}
              className="text-center text-[10px] font-semibold text-[#9CA3AF] py-2"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {/* Leading blank cells */}
          {Array.from({ length: days[0].getDay() }).map((_, i) => (
            <div
              key={"blank-" + i}
              className={"border-r border-b " + BORDER_GHOST}
            />
          ))}
          {days.map((day) => {
            const dk = format(day, "yyyy-MM-dd");
            const entry = entriesByDate[dk];
            const isFutureDay = isFuture(day) && !isToday(day);
            return (
              <button
                key={dk}
                disabled={isFutureDay}
                onClick={() => {
                  setSelectedDate(day);
                  setTab("write");
                }}
                className={
                  "border-r border-b " +
                  BORDER_GHOST +
                  " p-1.5 min-h-[56px] flex flex-col items-center transition-colors " +
                  (isFutureDay
                    ? "opacity-30 cursor-not-allowed "
                    : "hover:bg-[#F9FAFB] cursor-pointer ") +
                  (isToday(day) ? "bg-blue-50" : "")
                }
              >
                <span
                  className={
                    "text-xs font-medium mb-1 w-5 h-5 flex items-center justify-center rounded-full " +
                    (isToday(day)
                      ? "bg-[#111827] text-white"
                      : "text-[#6B7280]")
                  }
                >
                  {format(day, "d")}
                </span>
                {entry ? (
                  <>
                    {entry.day_rating && (
                      <div
                        className={
                          "w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white " +
                          moodColor(entry.day_rating)
                        }
                      >
                        {entry.day_rating}
                      </div>
                    )}
                    {!entry.day_rating && (
                      <div className="w-2 h-2 rounded-full bg-[#2563EB] mt-1" />
                    )}
                  </>
                ) : !isFutureDay ? (
                  <div className="w-2 h-2 rounded-full border border-dashed border-[#D1D5DB] mt-1" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Entry list */}
      <div className="space-y-3">
        {(entries || []).length === 0 && (
          <div
            className={
              "p-8 text-center bg-[#F9FAFB] border " +
              BORDER_GHOST +
              " rounded-xl border-dashed"
            }
          >
            <Calendar size={22} className="text-[#D1D5DB] mx-auto mb-2" />
            <p className="text-sm text-[#6B7280]">
              No entries for {format(viewMonth, "MMMM yyyy")}
            </p>
          </div>
        )}
        {(entries || []).map((entry) => (
          <button
            key={entry.id}
            onClick={() => {
              setSelectedDate(
                new Date(entry.entry_date.slice(0, 10) + "T12:00:00"),
              );
              setTab("write");
            }}
            className={
              "w-full text-left p-4 bg-white border " +
              BORDER_GHOST +
              " rounded-xl hover:bg-[#F9FAFB] transition-colors"
            }
          >
            <div className="flex items-start justify-between gap-3 mb-1">
              <span className="text-sm font-semibold text-[#111827]">
                {format(
                  new Date(entry.entry_date.slice(0, 10) + "T12:00:00"),
                  "EEE, MMM d",
                )}
              </span>
              {entry.day_rating && (
                <span
                  className={
                    "text-xs font-bold px-2 py-0.5 rounded-full text-white shrink-0 " +
                    moodColor(entry.day_rating)
                  }
                >
                  {entry.day_rating}/10
                </span>
              )}
            </div>
            <p className="text-xs text-[#6B7280] leading-relaxed mb-2 line-clamp-2">
              {entry.content.slice(0, 160)}
              {entry.content.length > 160 ? "…" : ""}
            </p>
            {entry.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {entry.tags.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 bg-blue-50 text-[#2563EB] text-[10px] rounded-full font-medium"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function JournalPage() {
  const [tab, setTab] = useState("write");
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { data: allLogs } = useQuery({
    queryKey: ["logs"],
    queryFn: async () => {
      const res = await fetch("/api/logs");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const tabs = [
    { id: "write", label: "Write", icon: <BookOpen size={14} /> },
    { id: "search", label: "Search", icon: <Search size={14} /> },
    { id: "monthly", label: "Monthly", icon: <Calendar size={14} /> },
  ];

  return (
    <div className="min-h-screen bg-white font-inter text-[#111827]">
      <nav
        className={
          "flex items-center px-6 h-16 border-b " +
          BORDER_GHOST +
          " bg-white sticky top-0 z-50"
        }
      >
        <a href="/" className="mr-4 text-[#6B7280] hover:text-[#111827]">
          <ArrowLeft size={20} />
        </a>
        <h1 className="text-lg font-semibold">Journal</h1>
      </nav>

      {/* Tab bar */}
      <div
        className={
          "flex border-b " + BORDER_GHOST + " bg-white sticky top-16 z-40"
        }
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={
              "flex items-center gap-1.5 px-6 py-3 text-sm font-medium border-b-2 transition-colors " +
              (tab === t.id
                ? "border-[#2563EB] text-[#2563EB]"
                : "border-transparent text-[#6B7280] hover:text-[#111827]")
            }
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <main className="max-w-2xl mx-auto px-6 py-8">
        {tab === "write" && (
          <WriteTab
            allLogs={allLogs}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
          />
        )}
        {tab === "search" && <SearchTab />}
        {tab === "monthly" && (
          <MonthlyTab setTab={setTab} setSelectedDate={setSelectedDate} />
        )}
      </main>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  );
}
