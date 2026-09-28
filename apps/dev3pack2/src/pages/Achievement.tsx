import { ArrowLeft, Check, Copy, Shield } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/lib/appContext";

function CopyableField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-1">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </span>
      <div className="flex items-center gap-2 bg-background rounded px-3 py-2 border border-surface-border">
        <code className="text-xs text-foreground truncate flex-1 select-all">
          {value}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className="flex-shrink-0 text-muted-foreground hover:text-neon transition-colors"
        >
          {copied ? (
            <Check className="w-3 h-3 text-neon" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </button>
      </div>
    </div>
  );
}

export default function Achievement() {
  const { lastAchievement, setScreen } = useApp();

  if (!lastAchievement) {
    setScreen("roadmap");
    return null;
  }

  const formattedDate = new Date(lastAchievement.date).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );

  return (
    <div className="min-h-[calc(100vh-48px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* SBT Card */}
        <div className="animate-mint-reveal">
          <div className="bg-card border border-neon/30 rounded-xl overflow-hidden glow-green-strong">
            {/* Card top accent */}
            <div className="h-1 bg-gradient-to-r from-neon via-blue to-neon" />

            {/* Card content */}
            <div className="p-6 md:p-8">
              {/* Icon and title */}
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-neon/10 border border-neon/30 flex items-center justify-center animate-pulse-glow">
                  <Shield className="w-8 h-8 text-neon" />
                </div>
              </div>

              <div className="text-center mb-6">
                <div className="text-[10px] uppercase tracking-[0.2em] text-blue font-semibold mb-2">
                  Soulbound Token Minted
                </div>
                <h2 className="text-xl font-bold text-neon mb-1">
                  {lastAchievement.skillName}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Verified on {formattedDate}
                </p>
              </div>

              {/* Divider */}
              <div className="border-t border-surface-border my-5" />

              {/* Fields */}
              <div className="space-y-3">
                <CopyableField
                  label="Token ID"
                  value={lastAchievement.tokenId}
                />
                <CopyableField
                  label="Wallet Address"
                  value={lastAchievement.walletAddress}
                />
                <CopyableField
                  label="Transaction Hash"
                  value={lastAchievement.txHash}
                />
              </div>

              {/* Properties */}
              <div className="mt-5 grid grid-cols-2 gap-2">
                <div className="bg-background rounded px-3 py-2 border border-surface-border">
                  <div className="text-[10px] text-muted-foreground">Type</div>
                  <div className="text-xs text-foreground font-medium">
                    Soulbound
                  </div>
                </div>
                <div className="bg-background rounded px-3 py-2 border border-surface-border">
                  <div className="text-[10px] text-muted-foreground">
                    Transferable
                  </div>
                  <div className="text-xs text-destructive font-medium">No</div>
                </div>
              </div>

              <div className="text-[10px] text-center text-muted-foreground/50 mt-5">
                Non-transferable credential &middot; Bound to your identity
              </div>
            </div>
          </div>
        </div>

        {/* Back button */}
        <button
          type="button"
          onClick={() => setScreen("roadmap")}
          className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-medium bg-card border border-surface-border text-foreground hover:bg-surface-hover hover:border-neon/30 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to roadmap
        </button>
      </div>
    </div>
  );
}
