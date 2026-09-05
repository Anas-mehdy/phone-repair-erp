const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export type ParsedYouTubeUrl = {
  videoId: string;
  canonicalUrl: string;
  embedUrl: string;
};

function validVideoId(value: string | null | undefined) {
  const candidate = value?.trim() ?? "";
  return VIDEO_ID_PATTERN.test(candidate) ? candidate : null;
}

function hostWithoutWww(hostname: string) {
  return hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");
}

export function parseYouTubeUrl(input: string): ParsedYouTubeUrl | null {
  const raw = input.trim();
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = hostWithoutWww(url.hostname);
  let videoId: string | null = null;

  if (host === "youtu.be") {
    videoId = validVideoId(url.pathname.split("/").filter(Boolean)[0]);
  } else if (host === "youtube.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    if (url.pathname === "/watch") {
      videoId = validVideoId(url.searchParams.get("v"));
    } else if (["shorts", "embed", "live"].includes(parts[0] ?? "")) {
      videoId = validVideoId(parts[1]);
    }
  } else if (host === "youtube-nocookie.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "embed") videoId = validVideoId(parts[1]);
  }

  if (!videoId) return null;

  return {
    videoId,
    canonicalUrl: `https://youtu.be/${videoId}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`,
  };
}
