import { CheckCircle2, ChevronRight, Circle, Lock } from "lucide-react";
import { useApp } from "@/lib/appContext";
import type { Skill } from "@/lib/types";

function SkillCard({ skill, index }: { skill: Skill; index: number }) {
  const { setActiveSkill, setScreen } = useApp();

  const handleClick = () => {
    if (skill.status !== "available") return;
    setActiveSkill(skill.id);
    setScreen("challenge");
  };

  const isLocked = skill.status === "locked";
  const isCompleted = skill.status === "completed";
  const isAvailable = skill.status === "available";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLocked}
      className={`group w-full text-left rounded-lg border p-4 transition-all opacity-0 animate-fade-up ${
        isCompleted
          ? "bg-neon/5 border-neon/20"
          : isAvailable
            ? "bg-card border-surface-border hover:border-neon/30 hover:bg-surface-hover cursor-pointer"
            : "bg-card/50 border-surface-border/50 opacity-50 cursor-not-allowed"
      }`}
      style={{
        animationDelay: `${index * 60}ms`,
        animationFillMode: "forwards",
      }}
    >
      <div className="flex items-start gap-3">
        {/* Status icon */}
        <div className="mt-0.5 flex-shrink-0">
          {isCompleted ? (
            <CheckCircle2 className="w-4 h-4 text-neon" />
          ) : isAvailable ? (
            <Circle className="w-4 h-4 text-blue" />
          ) : (
            <Lock className="w-3.5 h-3.5 text-muted-foreground/40" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3
              className={`text-sm font-medium truncate ${
                isCompleted
                  ? "text-neon"
                  : isAvailable
                    ? "text-foreground group-hover:text-neon transition-colors"
                    : "text-muted-foreground/60"
              }`}
            >
              {skill.name}
            </h3>
            {isAvailable && (
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-neon transition-colors flex-shrink-0" />
            )}
          </div>
          <p
            className={`text-xs mt-1 leading-relaxed ${
              isLocked ? "text-muted-foreground/30" : "text-muted-foreground"
            }`}
          >
            {skill.description}
          </p>

          {/* Status badge */}
          <div className="mt-2">
            {isCompleted && (
              <span className="inline-flex items-center text-[10px] uppercase tracking-wider font-semibold text-neon bg-neon/10 px-2 py-0.5 rounded">
                verified
              </span>
            )}
            {isAvailable && (
              <span className="inline-flex items-center text-[10px] uppercase tracking-wider font-semibold text-blue bg-blue/10 px-2 py-0.5 rounded">
                available
              </span>
            )}
            {isLocked && (
              <span className="inline-flex items-center text-[10px] uppercase tracking-wider font-medium text-muted-foreground/40 px-2 py-0.5">
                locked
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

export default function Roadmap() {
  const { profile, skills, achievements } = useApp();
  const completed = skills.filter((s) => s.status === "completed").length;
  const total = skills.length;
  const progressPercent = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="min-h-[calc(100vh-48px)] px-4 py-8 md:py-12">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
            <span className="text-neon">$</span>
            <span>roadmap</span>
            <span className="text-muted-foreground/40">--user</span>
            <span className="text-foreground">{profile?.name}</span>
            <span className="text-muted-foreground/40">--goal</span>
            <span className="text-foreground">{profile?.goal}</span>
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1">
            Your Skill Roadmap
          </h2>
          <p className="text-xs text-muted-foreground">
            Complete challenges to earn soulbound credentials. Skills unlock
            sequentially.
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-6 p-4 bg-card border border-surface-border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Progress</span>
            <span className="text-xs font-medium">
              <span className="text-neon">{completed}</span>
              <span className="text-muted-foreground"> / {total}</span>
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-neon rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {achievements.length > 0 && (
            <div className="mt-2 text-[10px] text-muted-foreground">
              {achievements.length} soulbound token
              {achievements.length !== 1 ? "s" : ""} minted
            </div>
          )}
        </div>

        {/* Skill cards */}
        <div className="space-y-2">
          {skills.map((skill, index) => (
            <SkillCard key={skill.id} skill={skill} index={index} />
          ))}
        </div>

        {/* All complete */}
        {completed === total && total > 0 && (
          <div className="mt-8 p-6 bg-neon/5 border border-neon/20 rounded-lg text-center animate-fade-up">
            <div className="text-neon text-lg font-bold mb-1">
              All skills verified
            </div>
            <p className="text-xs text-muted-foreground">
              You've earned {total} soulbound tokens. Your proof is on-chain.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
