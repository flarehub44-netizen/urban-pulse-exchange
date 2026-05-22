import { Toaster } from "@/components/ui/sonner";
import { useTheme } from "@/hooks/use-theme";

export function ThemeToaster() {
  const { isDark } = useTheme();
  return <Toaster theme={isDark ? "dark" : "light"} position="top-right" richColors closeButton />;
}
