import { NextRequest, NextResponse } from "next/server";

const BACKEND = (
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "");

async function proxy(req: NextRequest) {
  // Keep the real path (Next catch-all drops the trailing slash).
  let path = req.nextUrl.pathname.replace(/^\/api\/proxy/, "");
  if (!path.startsWith("/")) path = `/${path}`;
  if (!path.endsWith("/")) path = `${path}/`;

  const target = `${BACKEND}${path}${req.nextUrl.search}`;

  const headers = new Headers();
  headers.set("ngrok-skip-browser-warning", "true");
  headers.set("Accept", "application/json");

  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const auth = req.headers.get("authorization");
  if (auth) headers.set("authorization", auth);

  const method = req.method.toUpperCase();
  const hasBody = !["GET", "HEAD"].includes(method);
  const body = hasBody ? await req.text() : undefined;

  try {
    const upstream = await fetch(target, {
      method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
    });

    // Follow one Django APPEND_SLASH redirect without dropping the body.
    if (hasBody && [301, 302, 307, 308].includes(upstream.status)) {
      const location = upstream.headers.get("location");
      if (location) {
        const redirected = await fetch(location, {
          method,
          headers,
          body,
          cache: "no-store",
        });
        return forward(redirected);
      }
    }

    return forward(upstream);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        detail: `Proxy could not reach backend at ${target}. Is Django/ngrok running? (${message})`,
      },
      { status: 502 }
    );
  }
}

async function forward(upstream: Response) {
  const responseHeaders = new Headers();
  const upstreamType = upstream.headers.get("content-type");
  if (upstreamType) responseHeaders.set("content-type", upstreamType);

  return new NextResponse(await upstream.arrayBuffer(), {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function GET(req: NextRequest) {
  return proxy(req);
}

export async function POST(req: NextRequest) {
  return proxy(req);
}

export async function PUT(req: NextRequest) {
  return proxy(req);
}

export async function PATCH(req: NextRequest) {
  return proxy(req);
}

export async function DELETE(req: NextRequest) {
  return proxy(req);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
