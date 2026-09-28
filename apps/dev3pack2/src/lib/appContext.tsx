import type React from "react";
import { createContext, useCallback, useContext, useState } from "react";
import type { Achievement, Skill, UserProfile } from "./types";

type Screen = "onboarding" | "roadmap" | "challenge" | "achievement";

interface AppState {
  screen: Screen;
  profile: UserProfile | null;
  skills: Skill[];
  activeSkillId: string | null;
  lastAchievement: Achievement | null;
  achievements: Achievement[];
}

interface AppContextType extends AppState {
  setScreen: (screen: Screen) => void;
  setProfile: (profile: UserProfile) => void;
  setSkills: (skills: Skill[]) => void;
  setActiveSkill: (skillId: string) => void;
  completeSkill: (skillId: string, achievement: Achievement) => void;
  clearActiveSkill: () => void;
  reset: () => void;
}

const initialState: AppState = {
  screen: "onboarding",
  profile: null,
  skills: [],
  activeSkillId: null,
  lastAchievement: null,
  achievements: [],
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);

  const setScreen = useCallback((screen: Screen) => {
    setState((prev) => ({ ...prev, screen }));
  }, []);

  const setProfile = useCallback((profile: UserProfile) => {
    setState((prev) => ({ ...prev, profile }));
  }, []);

  const setSkills = useCallback((skills: Skill[]) => {
    setState((prev) => ({ ...prev, skills }));
  }, []);

  const setActiveSkill = useCallback((skillId: string) => {
    setState((prev) => ({ ...prev, activeSkillId: skillId }));
  }, []);

  const clearActiveSkill = useCallback(() => {
    setState((prev) => ({ ...prev, activeSkillId: null }));
  }, []);

  const completeSkill = useCallback(
    (skillId: string, achievement: Achievement) => {
      setState((prev) => {
        const skills = prev.skills.map((skill) => {
          if (skill.id === skillId) {
            return { ...skill, status: "completed" as const };
          }
          return skill;
        });

        // Unlock next locked skill
        const completedIndex = skills.findIndex((s) => s.id === skillId);
        const nextLocked = skills.find(
          (s, i) => i > completedIndex && s.status === "locked",
        );
        if (nextLocked) {
          const idx = skills.indexOf(nextLocked);
          skills[idx] = { ...skills[idx], status: "available" as const };
        }

        return {
          ...prev,
          skills,
          lastAchievement: achievement,
          achievements: [...prev.achievements, achievement],
          activeSkillId: null,
        };
      });
    },
    [],
  );

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return (
    <AppContext.Provider
      value={{
        ...state,
        setScreen,
        setProfile,
        setSkills,
        setActiveSkill,
        completeSkill,
        clearActiveSkill,
        reset,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
