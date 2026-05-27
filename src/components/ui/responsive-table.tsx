import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ResponsiveTableProps = {
  children: ReactNode;
  className?: string;
  tableClassName?: string;
  minWidth?: string;
  mobileHint?: string;
};

export function ResponsiveTable({
  children,
  className,
  tableClassName,
  minWidth = "min-w-[640px]",
  mobileHint = "Deslize horizontalmente para ver todas as colunas",
}: ResponsiveTableProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-[10px] text-muted-foreground md:hidden">{mobileHint}</p>
      <div className="overflow-x-auto rounded-lg border">
        <table className={cn("w-full text-xs", minWidth, tableClassName)}>{children}</table>
      </div>
    </div>
  );
}

type MobileDataListProps<T> = {
  items: T[];
  keyFn: (item: T) => string;
  renderCard: (item: T) => ReactNode;
  emptyText?: string;
  className?: string;
};

export function MobileDataList<T>({
  items,
  keyFn,
  renderCard,
  emptyText = "Nenhum registro.",
  className,
}: MobileDataListProps<T>) {
  if (!items.length) {
    return <p className="text-xs text-muted-foreground">{emptyText}</p>;
  }
  return (
    <ul className={cn("space-y-3 md:hidden", className)}>
      {items.map((item) => (
        <li key={keyFn(item)} className="rounded-xl border bg-card/60 p-3">
          {renderCard(item)}
        </li>
      ))}
    </ul>
  );
}

type DesktopTableWrapProps = {
  children: ReactNode;
  className?: string;
};

export function DesktopTableWrap({ children, className }: DesktopTableWrapProps) {
  return <div className={cn("hidden md:block", className)}>{children}</div>;
}

type FieldRowProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

export function MobileFieldRow({ label, children, className }: FieldRowProps) {
  return (
    <div className={cn("flex flex-col gap-0.5 text-xs", className)}>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <div>{children}</div>
    </div>
  );
}
