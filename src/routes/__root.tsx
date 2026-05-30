import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { copy } from "@/copy/pt-BR";
import { consumeLastCapturedError } from "@/lib/error-capture";
import { ThemeToaster } from "@/components/viax/theme-toaster";
import { AuthModal } from "@/components/auth/auth-modal";
import { DepositSheetHost } from "@/components/viax/deposit-sheet-host";
import { AdminAllowlistSync } from "@/components/auth/admin-allowlist-sync";
import { themeInitScript } from "@/lib/theme";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-gradient">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Mercado não encontrado</h2>
        <p className="mt-2 text-sm text-muted-foreground">Esta página não existe no ViaX.</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {copy.root.backToApp}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const captured = consumeLastCapturedError();
  const displayError = (captured instanceof Error ? captured : null) ?? error;
  console.error("[root-error]", displayError);
  const router = useRouter();
  // SECURITY: never render raw error.message — it can leak SQL fragments,
  // server stack frames, table names, env keys or financial details. Only
  // surface a generic copy string; the full error is logged server-side.
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">{copy.root.errorTitle}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{copy.root.errorDesc}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="rounded-md border bg-card px-4 py-2 text-sm font-medium hover:bg-surface"
          >
            Início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: copy.landing.metaTitle },
      { name: "description", content: copy.root.metaDescription },
      { name: "author", content: "ViaX" },
      { name: "theme-color", content: "#1a1f33" },
      { property: "og:title", content: copy.landing.ogTitle },
      { property: "og:description", content: copy.landing.ogDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: copy.landing.ogTitle },
      { name: "twitter:description", content: copy.landing.ogDescription },
      {
        property: "og:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/45ff69c6-3a37-49d2-94bb-37b86df0de3e",
      },
      {
        name: "twitter:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/45ff69c6-3a37-49d2-94bb-37b86df0de3e",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AdminAllowlistSync />
      <Outlet />
      <AuthModal />
      <DepositSheetHost />
      <ThemeToaster />
    </QueryClientProvider>
  );
}
