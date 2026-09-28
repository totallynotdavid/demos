export type Goal = "get-a-job" | "learn-a-new-stack" | "specialize";
export type Level = "junior" | "mid" | "senior";
export type SkillStatus = "locked" | "available" | "completed";

export interface UserProfile {
  name: string;
  goal: Goal;
  level: Level;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  status: SkillStatus;
  order: number;
}

export interface Challenge {
  skillId: string;
  skillName: string;
  prompt: string;
  level: Level;
}

export interface EvaluationResult {
  passed: boolean;
  feedback: string;
}

export interface Achievement {
  skillName: string;
  date: string;
  walletAddress: string;
  txHash: string;
  tokenId: string;
}
