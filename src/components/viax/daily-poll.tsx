import { motion, AnimatePresence } from "framer-motion";
import { ThumbsUp, ThumbsDown, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { useTodayPoll, useVotePoll } from "@/hooks/use-daily-poll";
import { cn } from "@/lib/utils";

export function DailyPoll() {
  const { data: poll, isLoading } = useTodayPoll();
  const { mutateAsync: vote, isPending } = useVotePoll();

  if (isLoading || !poll) return null;

  const total = poll.yes_count + poll.no_count;
  const yesPct = total > 0 ? Math.round((poll.yes_count / total) * 100) : 50;
  const noPct = 100 - yesPct;

  const onVote = async (v: boolean) => {
    try {
      const res = await vote(v);
      if (res.ok) {
        toast.success(`Votou ${v ? "SIM" : "NÃO"}! +${res.xp} XP`);
      } else if (res.reason === "already_voted") {
        toast.message("Você já votou hoje.");
      }
    } catch {
      toast.error("Erro ao registrar voto.");
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4 backdrop-blur">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <HelpCircle className="size-3.5" />
        Poll do Dia · +10 XP
      </div>

      <p className="mt-2 text-sm font-medium leading-snug">{poll.question}</p>

      <AnimatePresence mode="wait">
        {poll.voted ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 space-y-2"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-8 text-right text-up font-medium">{yesPct}%</span>
              <div className="flex-1 h-2 rounded-full bg-surface overflow-hidden">
                <motion.div
                  className="h-full bg-up rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${yesPct}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
              <span className="text-up font-medium">SIM</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-8 text-right text-down font-medium">{noPct}%</span>
              <div className="flex-1 h-2 rounded-full bg-surface overflow-hidden">
                <motion.div
                  className="h-full bg-down rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${noPct}%` }}
                  transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
                />
              </div>
              <span className="text-down font-medium">NÃO</span>
            </div>
            <p className="text-[11px] text-muted-foreground text-center">
              {total} voto{total !== 1 ? "s" : ""} · você votou{" "}
              <span className={cn("font-medium", poll.my_vote ? "text-up" : "text-down")}>
                {poll.my_vote ? "SIM" : "NÃO"}
              </span>
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="buttons"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 grid grid-cols-2 gap-2"
          >
            <button
              type="button"
              disabled={isPending}
              onClick={() => onVote(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-up/30 bg-up/10 px-3 py-2.5 text-sm font-medium text-up hover:bg-up/20 disabled:opacity-50"
            >
              <ThumbsUp className="size-4" /> SIM
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => onVote(false)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-down/30 bg-down/10 px-3 py-2.5 text-sm font-medium text-down hover:bg-down/20 disabled:opacity-50"
            >
              <ThumbsDown className="size-4" /> NÃO
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
