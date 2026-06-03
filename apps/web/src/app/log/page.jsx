import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Plus } from "lucide-react";

const BORDER_GHOST = "border-[#E5E7EB]";

export default function LogActivityPage() {
  const queryClient = useQueryClient();
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [moodRating, setMoodRating] = useState(5);
  const [note, setNote] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [newActivityName, setNewActivityName] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);

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
      setSelectedActivity(data.id);
      setIsAddingNew(false);
      setNewActivityName("");
    },
  });

  const logMutation = useMutation({
    mutationFn: async (data) => {
      const res = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to log activity");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logs"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      setIsSuccess(true);
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    },
  });

  const handleLog = () => {
    if (!selectedActivity) return;
    logMutation.mutate({
      activity_id: selectedActivity,
      mood_rating: moodRating,
      note,
    });
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-50 border border-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="text-green-600" />
          </div>
          <h1 className="text-xl font-semibold">Log Saved</h1>
          <p className="text-[#6B7280] text-sm">Returning to home...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-inter text-[#111827]">
      <nav
        className={`flex items-center px-6 h-16 border-b ${BORDER_GHOST} bg-white sticky top-0 z-50`}
      >
        <a href="/" className="mr-4 text-[#6B7280] hover:text-[#111827]">
          <ArrowLeft size={20} />
        </a>
        <h1 className="text-lg font-semibold">Log Activity</h1>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[#111827]">
              What did you just do?
            </h2>
            <button
              onClick={() => setIsAddingNew(true)}
              className="text-[#2563EB] text-xs font-medium flex items-center gap-1 hover:underline"
            >
              <Plus size={12} /> Add New
            </button>
          </div>

          {isAddingNew && (
            <div
              className={`mb-6 p-4 rounded-xl border border-[#2563EB] bg-blue-50 flex gap-2`}
            >
              <input
                autoFocus
                className="flex-1 bg-transparent border-none focus:outline-none text-sm font-medium"
                placeholder="e.g. Meditating"
                value={newActivityName}
                onChange={(e) => setNewActivityName(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  createActivityMutation.mutate(newActivityName)
                }
              />
              <button
                onClick={() => createActivityMutation.mutate(newActivityName)}
                className="text-[#2563EB] text-sm font-semibold"
                disabled={createActivityMutation.isLoading}
              >
                {createActivityMutation.isLoading ? "..." : "Add"}
              </button>
              <button
                onClick={() => setIsAddingNew(false)}
                className="text-[#6B7280] text-sm"
              >
                Cancel
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {activities?.map((activity) => (
              <button
                key={activity.id}
                onClick={() => setSelectedActivity(activity.id)}
                className={`
                  p-4 rounded-xl border text-sm font-medium transition-all text-left
                  ${
                    selectedActivity === activity.id
                      ? "bg-blue-50 border-[#2563EB] text-[#2563EB]"
                      : `bg-white ${BORDER_GHOST} text-[#6B7280] hover:border-gray-400`
                  }
                `}
              >
                {activity.name}
              </button>
            ))}
          </div>
        </section>

        {selectedActivity && (
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-base font-semibold mb-4 text-[#111827]">
                How does it feel? (1-10)
              </h2>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={moodRating}
                  onChange={(e) => setMoodRating(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#2563EB]"
                />
                <span className="text-2xl font-semibold text-[#2563EB] w-8">
                  {moodRating}
                </span>
              </div>
            </div>

            <div>
              <h2 className="text-base font-semibold mb-2 text-[#111827]">
                Any notes? (Optional)
              </h2>
              <textarea
                className={`w-full p-4 rounded-xl border ${BORDER_GHOST} text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 transition-all`}
                placeholder="How did this specific instance feel?"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <button
              onClick={handleLog}
              disabled={logMutation.isLoading}
              className="w-full bg-[#2563EB] text-white font-semibold py-4 rounded-xl hover:bg-blue-700 transition-colors shadow-sm active:scale-[0.98]"
            >
              {logMutation.isLoading ? "Saving..." : "Finish Log"}
            </button>
          </section>
        )}
      </main>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; }
      `}</style>
    </div>
  );
}
