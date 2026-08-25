// Cloudflare Pages catch-all Function:
// Intercept Vite dev-only paths (/ @vite/*, /@id/*, /@fs/*) BEFORE the asset
// server hits them with the SPA not_found_handling rule (which returns
// index.html 200 - that content then gets parsed as ESM and throws SyntaxError
// on the first char, aborting the React mount graph).

const DEV_VITE_PREFIXES = ["/@vite/", "/@id/", "/@fs/", "/__manus__/logs"];

function isDevVitePath(urlPath) {
  for (const p of DEV_VITE_PREFIXES) if (urlPath.startsWith(p)) return true;
  return false;
}

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  if (isDevVitePath(url.pathname)) {
    return new Response(
      "Not Found\n",
      {
        status: 404,
        statusText: "Not Found",
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff"
        }
      }
    );
  }

  return next();
}