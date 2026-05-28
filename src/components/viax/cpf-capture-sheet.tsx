import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { copy } from "@/copy/pt-BR";
import { CpfCaptureForm } from "@/components/viax/cpf-capture-form";

type CpfCaptureSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

/** Standalone CPF sheet — do not nest inside another Sheet (use CpfCaptureForm inline instead). */
export function CpfCaptureSheet({ open, onOpenChange, onSaved }: CpfCaptureSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader className="mb-4 text-left">
          <SheetTitle>{copy.wallet.cpfRequiredTitle}</SheetTitle>
        </SheetHeader>
        <CpfCaptureForm onSaved={onSaved} />
      </SheetContent>
    </Sheet>
  );
}
