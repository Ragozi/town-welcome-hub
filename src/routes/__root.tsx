import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";
import { useEffect } from "react";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
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
      { title: "Hearth Handbook — Welcome Home, Thoughtfully." },
      {
        name: "description",
        content:
          "Elegant digital and printable welcome packets that connect new residents with the heart of their community.",
      },
      { name: "author", content: "Hearth Handbook" },
      { property: "og:site_name", content: "Hearth Handbook" },
      { property: "og:title", content: "Hearth Handbook — Welcome Home, Thoughtfully." },
      {
        property: "og:description",
        content:
          "Elegant digital and printable welcome packets that connect new residents with the heart of their community.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Hearth Handbook — Welcome Home, Thoughtfully." },
      {
        name: "twitter:description",
        content:
          "Elegant digital and printable welcome packets that connect new residents with the heart of their community.",
      },
      { property: "og:image", content: "https://hearthhandbook.com/og-image.png" },
      { name: "twitter:image", content: "https://hearthhandbook.com/og-image.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap",
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
    <html lang="en">
      <head>
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

  useEffect(() => {
    // Client-only: install fetch interceptor that attaches the Supabase
    // bearer token to TanStack Start server-fn requests (paths under
    // /_serverFn/). Inlined here to avoid a client-only module import
    // from this file (server-reachable via the route tree).
    if (typeof window === "undefined") return;
    if ((window as any).__serverFnFetchPatched) return;
    (window as any).__serverFnFetchPatched = true;

    import("@/integrations/supabase/client").then(({ supabase }) => {
      const origFetch = window.fetch.bind(window);
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        try {
          const url =
            typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
          if (url && url.includes("/_serverFn/")) {
            const headers = new Headers(
              init?.headers ?? (input instanceof Request ? input.headers : undefined),
            );
            if (!headers.has("authorization")) {
              const { data } = await supabase.auth.getSession();
              const token = data.session?.access_token;
              if (token) headers.set("authorization", `Bearer ${token}`);
            }
            return origFetch(input, { ...init, headers });
          }
        } catch (e) {
          console.error("[server-fn-fetch] interceptor error", e);
        }
        return origFetch(input, init);
      };
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster richColors position="top-center" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
