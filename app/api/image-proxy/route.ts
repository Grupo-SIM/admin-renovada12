import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get("url");
    if (!url) return new NextResponse("Missing url", { status: 400 });

    try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return new NextResponse("Upstream error", { status: res.status });

        const contentType = res.headers.get("content-type") ?? "image/png";
        const buffer = await res.arrayBuffer();

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "private, max-age=3600",
            },
        });
    } catch {
        return new NextResponse("Failed to fetch image", { status: 502 });
    }
}
