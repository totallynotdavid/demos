import React, { useState, useEffect } from 'react';

interface TerminalLoaderProps {
  lines: string[];
  onComplete?: () => void;
  speed?: number;
}

export default function TerminalLoader({ lines, onComplete, speed = 200 }: TerminalLoaderProps) {
  const [visibleLines, setVisibleLines] = useState<number>(0);

  useEffect(() => {
    if (visibleLines < lines.length) {
      const timer = setTimeout(() => {
        setVisibleLines(prev => prev + 1);
      }, speed + Math.random() * 150);
      return () => clearTimeout(timer);
    } else if (onComplete) {
      const timer = setTimeout(onComplete, 400);
      return () => clearTimeout(timer);
    }
  }, [visibleLines, lines.length, speed, onComplete]);

  return (
    <div className="font-mono text-xs space-y-1">
      {lines.slice(0, visibleLines).map((line, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-muted-foreground select-none">$</span>
          <span className={i === visibleLines - 1 ? 'text-neon' : 'text-muted-foreground'}>
            {line}
          </span>
        </div>
      ))}
      {visibleLines < lines.length && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground select-none">$</span>
          <span className="cursor-blink text-neon" />
        </div>
      )}
    </div>
  );
}
