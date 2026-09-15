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

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

// Sends the author token on every server function call. Cookies are unreliable
// inside the cross-site preview iframe, so the token travels in a header.
const attachAuthorToken = createMiddleware().client(async ({ next }) => {
  const { getAuthorToken } = await import("@/lib/author-token");
  const token = getAuthorToken();
  return next(token ? { headers: { "x-author-token": token } } : undefined);
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth, attachAuthorToken],
  requestMiddleware: [errorMiddleware, csrfMiddleware],
}));
