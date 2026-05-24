import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { copy } from "@/copy/pt-BR";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
};

export function AnonFirstBetDialog({ open, onOpenChange, onContinue }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-warn">
            <AlertTriangle className="size-5" />
            {copy.auth.anonFirstBetTitle}
          </DialogTitle>
          <DialogDescription className="text-left">{copy.auth.anonFirstBetDesc}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Link
            to="/auth/signup"
            search={{ upgrade: "1" }}
            className="w-full rounded-lg border border-warn/40 bg-warn/10 px-4 py-2.5 text-center text-sm font-medium text-warn hover:bg-warn/20"
            onClick={() => onOpenChange(false)}
          >
            {copy.auth.anonFirstBetProtect}
          </Link>
          <button
            type="button"
            onClick={() => {
              onContinue();
              onOpenChange(false);
            }}
            className="w-full rounded-lg bg-surface-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground"
          >
            {copy.auth.anonFirstBetContinue}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
