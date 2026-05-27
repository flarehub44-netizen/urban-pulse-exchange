import { useState } from "react";
import { Share2, Copy, Check, Users } from "lucide-react";
import { toast } from "sonner";

interface InviteFriendsCardProps {
  handle: string;
}

export function InviteFriendsCard({ handle }: InviteFriendsCardProps) {
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://viax.com.br";
  const inviteUrl = `${origin}/r/${handle}`;
  const shareText = `Aposte em previsões urbanas no ViaX — inteligência artificial + mercados da sua cidade. Entre pelo meu link:`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "ViaX — Previsões Urbanas",
          text: shareText,
          url: inviteUrl,
        });
      } catch {
        // user cancelled
      }
    } else {
      await handleCopy();
    }
  };

  return (
    <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/8 to-card/80 p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15">
          <Users className="size-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">Convide amigos</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Compartilhe seu link — cada amigo que entrar via ele conta na sua rede.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate rounded-lg border bg-surface px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
              {inviteUrl}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 rounded-lg border border-primary/30 bg-primary/10 p-1.5 text-primary hover:bg-primary/20"
              aria-label="Copiar link"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
            >
              <span className="flex items-center gap-1.5">
                <Share2 className="size-3.5" /> Compartilhar
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
