// Installs a global fetch interceptor that attaches the Supabase access token
// as a Bearer Authorization header to TanStack Start server-function calls
// (paths beginning with "/_serverFn/"). This is required for server functions
// using the requireSupabaseAuth middleware.
import { supabase } from "./client";

if (typeof window !== "undefined" && !(window as any).__serverFnFetchPatched) {
  (window as any).__serverFnFetchPatched = true;
  const origFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (url && url.includes("/_serverFn/")) {
        const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
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
}
