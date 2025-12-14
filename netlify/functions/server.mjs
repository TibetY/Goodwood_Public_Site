import { createRequestHandler } from "@react-router/node";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverBuildPath = join(__dirname, "../../build/server/index.js");

let handler;

export async function handler(event, context) {
  if (!handler) {
    const build = await import(serverBuildPath);
    handler = createRequestHandler({
      build,
    });
  }

  const url = new URL(event.rawUrl);
  const request = new Request(url.toString(), {
    method: event.httpMethod,
    headers: new Headers(event.headers),
    body:
      event.httpMethod !== "GET" && event.httpMethod !== "HEAD"
        ? event.body
        : undefined,
  });

  const response = await handler(request, {
    event,
    context,
  });

  const responseHeaders = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  return {
    statusCode: response.status,
    headers: responseHeaders,
    body: await response.text(),
  };
}
