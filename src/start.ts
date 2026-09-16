import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Baseline hardening headers on every response.
const securityHeaders = createMiddleware().server(async ({ next }) => {
  const response = await next();
  const headers = (response as unknown as { headers?: Headers }).headers;
  if (headers && typeof headers.set === "function") {
    headers.set("x-content-type-options", "nosniff");
    headers.set("referrer-policy", "strict-origin-when-cross-origin");
    headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
    headers.set("x-dns-prefetch-control", "off");
    headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
  }
  return response;
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

// Sends the author token on every server function call. Cookies are unreliable
// inside the cross-site preview iframe, so the token travels in a header.
const attachAuthorToken = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const { getAuthorToken } = await import("@/lib/author-token");
  const token = getAuthorToken();
  return next(token ? { headers: { "x-author-token": token } } : undefined);
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth, attachAuthorToken],
  requestMiddleware: [errorMiddleware, securityHeaders, csrfMiddleware],
}));
