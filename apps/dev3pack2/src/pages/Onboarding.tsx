import { ChevronRight } from "lucide-react";
import type React from "react";
import { useState } from "react";
import TerminalLoader from "@/components/TerminalLoader";
import { generateRoadmap } from "@/lib/aiService";
import { useApp } from "@/lib/appContext";
import type { Goal, Level } from "@/lib/types";

const goals: { value: Goal; label: string; desc: string }[] = [
  {
    value: "get-a-job",
    label: "Get a job",
    desc: "Land your next developer role",
  },
  {
    value: "learn-a-new-stack",
    label: "Learn a new stack",
    desc: "Master Solana/Web3 development",
  },
  {
    value: "specialize",
    label: "Specialize",
    desc: "Go deep in a technical area",
  },
];

const levels: { value: Level; label: string }[] = [
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
];

export default function Onboarding() {
  const { setProfile, setSkills, setScreen } = useApp();
  const [name, setName] = useState("");
  const [goal, setGoal] = useState<Goal | "">("");
  const [level, setLevel] = useState<Level | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isValid = name.trim().length > 0 && goal !== "" && level !== "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || loading) return;

    setLoading(true);
    setError("");

    try {
      const profile = {
        name: name.trim(),
        goal: goal as Goal,
        level: level as Level,
      };
      const skills = await generateRoadmap(profile.goal, profile.level);
      setProfile(profile);
      setSkills(skills);
      setScreen("roadmap");
    } catch {
      setError("Failed to generate roadmap. Try again.");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-48px)] flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-card border border-surface-border rounded-lg p-6">
          <div className="text-xs text-muted-foreground mb-4">
            generating roadmap for <span className="text-neon">{name}</span>...
          </div>
          <TerminalLoader
            lines={[
              `init --user "${name}"`,
              `set --goal "${goal}"`,
              `set --level "${level}"`,
              "analyzing skill gaps...",
              "querying knowledge graph...",
              "building personalized roadmap...",
              "ordering by dependency chain...",
              "roadmap ready.",
            ]}
            speed={180}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-48px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Title */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-neon mb-2">
            DevProof
          </h1>
          <p className="text-sm text-muted-foreground">
            Prove your skills. Earn soulbound credentials.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div className="space-y-2">
            <label
              htmlFor="name"
              className="text-xs text-muted-foreground block"
            >
              <span className="text-neon">$</span> name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="your name"
              className="w-full bg-card border border-surface-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-neon/50 focus:ring-1 focus:ring-neon/20 transition-colors"
              // biome-ignore lint/a11y/noAutofocus: the form is the only content on the screen
              autoFocus
            />
          </div>

          {/* Goal */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground block">
              <span className="text-neon">$</span> goal
            </div>
            <div className="space-y-2">
              {goals.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setGoal(g.value)}
                  className={`w-full text-left px-3 py-2.5 rounded-md border text-sm transition-all ${
                    goal === g.value
                      ? "bg-neon/10 border-neon/40 text-neon"
                      : "bg-card border-surface-border text-foreground hover:border-surface-border hover:bg-surface-hover"
                  }`}
                >
                  <div className="font-medium">{g.label}</div>
                  <div
                    className={`text-xs mt-0.5 ${goal === g.value ? "text-neon/70" : "text-muted-foreground"}`}
                  >
                    {g.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Level */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground block">
              <span className="text-neon">$</span> level
            </div>
            <div className="flex gap-2">
              {levels.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setLevel(l.value)}
                  className={`flex-1 px-3 py-2.5 rounded-md border text-sm font-medium transition-all ${
                    level === l.value
                      ? "bg-neon/10 border-neon/40 text-neon"
                      : "bg-card border-surface-border text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && <p className="text-xs text-destructive">{error}</p>}

          {/* Submit */}
          <button
            type="submit"
            disabled={!isValid}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-semibold transition-all ${
              isValid
                ? "bg-neon text-primary-foreground hover:brightness-110 glow-green"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            Generate my roadmap
            <ChevronRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground/50 mt-8">
          Challenges are AI-generated. Credentials are non-transferable.
        </p>
      </div>
    </div>
  );
}
