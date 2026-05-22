import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type SurfaceCardVariant = "default" | "interactive" | "featured";

const variantClass: Record<SurfaceCardVariant, string> = {
  default: "surface-card",
  interactive: "surface-card-interactive",
  featured: "surface-card-featured",
};

type SurfaceCardProps<T extends ElementType = "div"> = {
  as?: T;
  variant?: SurfaceCardVariant;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

export function SurfaceCard<T extends ElementType = "div">({
  as,
  variant = "default",
  className,
  children,
  ...props
}: SurfaceCardProps<T>) {
  const Comp = as ?? "div";
  return (
    <Comp className={cn(variantClass[variant], className)} {...props}>
      {children}
    </Comp>
  );
}
