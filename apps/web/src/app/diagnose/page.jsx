import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  Brain,
  Sparkles,
  Zap,
  Coffee,
  Users,
  TreePine,
  Heart,
} from "lucide-react";

const BORDER_GHOST = "border-[#E5E7EB]";

const categoryIcons = {
  Rest: <Coffee className="text-blue-600" />,
  "Social connection": <Users className="text-blue-600" />,
  "Mental stimulation": <Zap className="text-blue-600" />,
  "Going outside / movement": <TreePine className="text-blue-600" />,
  "Emotional processing": <Heart className="text-blue-600" />,
};

export default function DiagnosePage() {
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState(null);

  const diagnoseMutation = useMutation({
    mutationFn: async (text) => {
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Failed to diagnose");
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
    },
  });

  const handleDiagnose = () => {
    if (!inputText.trim()) return;
    diagnoseMutation.mutate(inputText);
  };

  return (
    <div className="min-h-screen bg-white font-inter text-[#111827]">
      <nav
        className={`flex items-center px-6 h-16 border-b ${BORDER_GHOST} bg-white sticky top-0 z-50`}
      >
        <a href="/" className="mr-4 text-[#6B7280] hover:text-[#111827]">
          <ArrowLeft size={20} />
        </a>
        <h1 className="text-lg font-semibold">Diagnosis</h1>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-8">
        {!result ? (
          <section className="space-y-6">
            <header className="mb-8">
              <h2 className="text-2xl font-semibold tracking-tight mb-2">
                What do you need right now?
              </h2>
              <p className="text-[#6B7280] text-sm">
                Be honest. How do you feel? (e.g., "I'm tired but restless")
              </p>
            </header>

            <textarea
              className={`w-full p-6 rounded-xl border ${BORDER_GHOST} text-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 transition-all bg-[#F9FAFB]`}
              placeholder="Tell me what's on your mind..."
              rows={5}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />

            <button
              onClick={handleDiagnose}
              disabled={diagnoseMutation.isLoading || !inputText.trim()}
              className="w-full bg-[#2563EB] text-white font-semibold py-4 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              {diagnoseMutation.isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Diagnose My Needs
                </>
              )}
            </button>
          </section>
        ) : (
          <section className="space-y-8 animate-in fade-in zoom-in duration-500">
            <div
              className={`p-8 rounded-2xl border ${BORDER_GHOST} bg-white text-center`}
            >
              <div className="w-16 h-16 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                {categoryIcons[result.category] || (
                  <Brain className="text-blue-600" />
                )}
              </div>
              <div className="inline-block px-3 py-1 bg-blue-50 text-[#2563EB] rounded-full text-xs font-semibold mb-4 uppercase tracking-wider">
                {result.category}
              </div>
              <h2 className="text-2xl font-semibold mb-3">
                You need {result.category.toLowerCase()}.
              </h2>
              <p className="text-[#4B5563] text-sm leading-relaxed max-w-sm mx-auto">
                {result.analysis}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wider mb-4 px-1">
                Suggested Actions
              </h3>
              <div className="space-y-3">
                {result.recommendations.map((action, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-4 p-5 bg-white border ${BORDER_GHOST} rounded-xl hover:border-[#2563EB] transition-all cursor-default`}
                  >
                    <div className="w-8 h-8 rounded-full bg-[#F9FAFB] flex items-center justify-center text-xs font-semibold border ${BORDER_GHOST}">
                      {i + 1}
                    </div>
                    <p className="text-sm font-medium text-[#111827]">
                      {action}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                setResult(null);
                setInputText("");
              }}
              className="w-full py-4 text-[#6B7280] text-sm font-medium hover:text-[#111827] transition-colors"
            >
              Start New Diagnosis
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
