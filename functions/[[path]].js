// Cloudflare Pages catch-all Function:
// 1) /__manus__/logs —— 调试日志上报端点。_routes.json 不再 exclude /__manus__/*
//    （否则 POST 会落到静态资产服务器并返回 405 Method Not Allowed）。
//    这里对所有方法静默返回 204，浏览器不再出现 405 错误。
// 2) Vite dev-only paths (/ @vite/*, /@id/*, /@fs/*) —— 在静态资源 SPA
//    not_found_handling 命中之前拦截（否则会返回 index.html 200，
//    其内容被当作 ESM 解析并抛 SyntaxError，中断 React 挂载图）。

const MANUS_LOG_PATH = "/__manus__/logs";
const DEV_VITE_PREFIXES = ["/@vite/", "/@id/", "/@fs/"];

function isDevVitePath(urlPath) {
  for (const p of DEV_VITE_PREFIXES) if (urlPath.startsWith(p)) return true;
  return false;
}

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

  // 静默吞掉调试日志上报（静态服务器不支持 POST，会回 405）
  if (pathname === MANUS_LOG_PATH) {
    return new Response(null, {
      status: 204,
      statusText: "No Content",
      headers: {
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  if (isDevVitePath(pathname)) {
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