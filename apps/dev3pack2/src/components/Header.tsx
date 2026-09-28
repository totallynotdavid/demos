import React from 'react';
import { Terminal, RotateCcw } from 'lucide-react';
import { useApp } from '@/lib/appContext';

export default function Header() {
  const { screen, profile, achievements, reset } = useApp();

  return (
    <header className="border-b border-surface-border bg-surface/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container flex items-center justify-between h-12 px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-neon" />
          <span className="text-sm font-semibold tracking-tight text-neon">
            DevProof
          </span>
          {screen !== 'onboarding' && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              // {profile?.name ?? 'anon'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {achievements.length > 0 && (
            <span className="text-xs text-muted-foreground">
              <span className="text-neon">{achievements.length}</span> SBT{achievements.length !== 1 ? 's' : ''}
            </span>
          )}
          {screen !== 'onboarding' && (
            <button
              onClick={reset}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              title="Reset"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">reset</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
