import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

function contentTypeByExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    case ".ico":
      return "image/x-icon";
    default:
      return "application/octet-stream";
  }
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ path?: string[] }> },
) {
  const { path: parts = [] } = await ctx.params;

  // Serve gunsan static images without copying into /public.
  const baseDir = path.join(process.cwd(), "source", "gunsan", "images");
  const candidate = path.normalize(path.join(baseDir, ...parts));

  // Prevent path traversal (e.g. /images/../secret)
  if (!candidate.startsWith(baseDir + path.sep) && candidate !== baseDir) {
    return new NextResponse("Not Found", { status: 404 });
  }

  try {
    const stat = await fs.stat(candidate);
    if (!stat.isFile()) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const buf = await fs.readFile(candidate);
    const ext = path.extname(candidate);

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentTypeByExt(ext),
        // Cache aggressively; these assets rarely change.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
}

