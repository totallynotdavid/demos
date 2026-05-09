import React, { useState, useEffect } from 'react';
import { ArrowLeft, Send, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useApp } from '@/lib/appContext';
import { generateChallenge, evaluateAnswer, createAchievement } from '@/lib/aiService';
import TerminalLoader from '@/components/TerminalLoader';
import type { Challenge as ChallengeType, EvaluationResult } from '@/lib/types';

export default function Challenge() {
  const { profile, skills, activeSkillId, setScreen, completeSkill, clearActiveSkill } = useApp();

  const skill = skills.find(s => s.id === activeSkillId);
  const [challenge, setChallenge] = useState<ChallengeType | null>(null);
  const [loadingChallenge, setLoadingChallenge] = useState(true);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);

  useEffect(() => {
    if (!skill || !profile) return;

    let cancelled = false;

    const load = async () => {
      try {
        const ch = await generateChallenge(skill.name, profile.level);
        if (!cancelled) {
          setChallenge({ ...ch, skillId: skill.id });
          setLoadingChallenge(false);
        }
      } catch {
        if (!cancelled) setLoadingChallenge(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [skill, profile]);

  const handleSubmit = async () => {
    if (!challenge || !profile || !answer.trim() || submitting) return;

    setSubmitting(true);
    try {
      const evalResult = await evaluateAnswer(
        challenge.skillName,
        challenge.prompt,
        answer,
        profile.level
      );
      setResult(evalResult);

      if (evalResult.passed && skill) {
        const achievement = createAchievement(skill.name);
        // Small delay before transitioning
        setTimeout(() => {
          completeSkill(skill.id, {
            ...achievement,
            skillName: skill.name,
          });
          setScreen('achievement');
        }, 2000);
      }
    } catch {
      setResult({ passed: false, feedback: 'Evaluation failed. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    clearActiveSkill();
    setScreen('roadmap');
  };

  if (!skill) {
    handleBack();
    return null;
  }

  // Loading state
  if (loadingChallenge) {
    return (
      <div className="min-h-[calc(100vh-48px)] flex items-center justify-center px-4">
        <div className="w-full max-w-lg bg-card border border-surface-border rounded-lg p-6">
          <div className="text-xs text-muted-foreground mb-4">
            generating challenge for <span className="text-blue">{skill.name}</span>...
          </div>
          <TerminalLoader
            lines={[
              `load --skill "${skill.name}"`,
              `set --difficulty "${profile?.level}"`,
              'generating challenge...',
              'calibrating difficulty...',
              'challenge ready.',
            ]}
            speed={220}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-48px)] px-4 py-8 md:py-12">
      <div className="max-w-2xl mx-auto">
        {/* Back */}
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-3 h-3" />
          back to roadmap
        </button>

        {/* Skill header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <span className="text-neon">$</span>
            <span>challenge</span>
            <span className="text-muted-foreground/40">--skill</span>
            <span className="text-blue">{skill.name}</span>
          </div>
          <h2 className="text-lg font-bold text-foreground">
            {skill.name}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Level: <span className="text-foreground">{profile?.level}</span>
            {' '}&middot; Write a thorough answer to pass
          </p>
        </div>

        {/* Challenge prompt */}
        <div className="bg-card border border-surface-border rounded-lg p-4 md:p-5 mb-6 animate-fade-up">
          <div className="text-[10px] uppercase tracking-wider text-blue font-semibold mb-3">
            Challenge
          </div>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {challenge?.prompt}
          </p>
        </div>

        {/* Answer area */}
        {!result && (
          <div className="space-y-4 animate-fade-up animate-delay-200">
            <div>
              <label className="text-xs text-muted-foreground block mb-2">
                <span className="text-neon">$</span> your answer
              </label>
              <textarea
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                placeholder="Write your answer here. Include code, explanations, and examples..."
                rows={10}
                className="w-full bg-card border border-surface-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-neon/50 focus:ring-1 focus:ring-neon/20 transition-colors resize-y font-mono leading-relaxed"
                disabled={submitting}
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-muted-foreground/50">
                  {answer.trim().split(/\s+/).filter(Boolean).length} words
                </span>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!answer.trim() || submitting}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-semibold transition-all ${
                answer.trim() && !submitting
                  ? 'bg-blue text-secondary-foreground hover:brightness-110 glow-blue'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Evaluating...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit answer
                </>
              )}
            </button>
          </div>
        )}

        {/* Result */}
        {result && (
          <div
            className={`rounded-lg border p-5 animate-fade-up ${
              result.passed
                ? 'bg-neon/5 border-neon/30'
                : 'bg-destructive/5 border-destructive/30'
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              {result.passed ? (
                <CheckCircle2 className="w-5 h-5 text-neon" />
              ) : (
                <XCircle className="w-5 h-5 text-destructive" />
              )}
              <span className={`text-sm font-bold ${result.passed ? 'text-neon' : 'text-destructive'}`}>
                {result.passed ? 'PASSED' : 'FAILED'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {result.feedback}
            </p>

            {result.passed && (
              <div className="mt-4 text-xs text-neon/70">
                Minting soulbound token...
              </div>
            )}

            {!result.passed && (
              <button
                onClick={() => {
                  setResult(null);
                  setAnswer('');
                }}
                className="mt-4 text-xs text-blue hover:text-foreground transition-colors"
              >
                Try again
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
