import { ImageResponse } from "next/og";

import {
  CARD_H,
  CARD_W,
  CardPrint,
  MARGIN,
  PAPER,
  SHADOW,
} from "@/components/card-print";
import { getCurrentUser } from "@/lib/session";
import { loadGoogleFont } from "@/server/fonts/google";
import { buildCard } from "@/server/profile/card";
import { getProfile } from "@/server/profile/profile";
import { getObject } from "@/server/storage/r2";

/**
 * The card, as a PNG you can keep.
 *
 * Rendered on the server rather than captured from the live DOM. A browser
 * capture needs every style and font inlined into an SVG and still comes out at
 * whatever size the window happened to be; this gives everyone the same
 * 1000px-wide card, and adds no dependency to do it.
 *
 * The layout itself lives in components/card-print.tsx — see the note there on
 * why the design is expressed twice.
 */

export const dynamic = "force-dynamic";

const DISPLAY = "Fraunces";
const BODY = "Archivo";
const MONO = "FragmentMono";

/**
 * The photo, inlined.
 *
 * Fetched from the bucket here and embedded as a data URI rather than handed to
 * the renderer as a URL: the renderer would otherwise have to make its own
 * round trip back into this app, and a card that silently loses its face when
 * that fails is worse than one that takes a moment longer.
 */
async function photoDataUri(key: string | null): Promise<string | null> {
  if (!key) return null;

  const object = await getObject(key);
  if (!object) return null;

  const bytes = Buffer.from(await new Response(object.body).arrayBuffer());
  return `data:${object.contentType};base64,${bytes.toString("base64")}`;
}

export async function GET() {
  const user = await getCurrentUser();
  // 404, not a redirect: this is a file endpoint, and an unfinished card should
  // be indistinguishable from one that was never there.
  if (!user) return new Response("Not found.", { status: 404 });

  const profile = await getProfile(user.id);
  const { ready, data } = buildCard(user, profile);
  if (!ready) return new Response("Not found.", { status: 404 });

  const [photo, display, body, mono] = await Promise.all([
    photoDataUri(data.photoKey),
    loadGoogleFont("Fraunces:wght@700"),
    loadGoogleFont("Archivo:wght@700"),
    loadGoogleFont("Fragment+Mono"),
  ]);

  const fonts = [
    display ? { name: DISPLAY, data: display, weight: 700 as const } : null,
    body ? { name: BODY, data: body, weight: 700 as const } : null,
    mono ? { name: MONO, data: mono, weight: 400 as const } : null,
  ].filter((f) => f !== null);

  const width = CARD_W + MARGIN * 2 + SHADOW;
  const height = CARD_H + MARGIN * 2 + SHADOW;

  const png = new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width,
          height,
          padding: MARGIN,
          background: PAPER,
        }}
      >
        <CardPrint data={data} photo={photo} />
      </div>
    ),
    {
      width,
      height,
      // Omitted entirely when nothing loaded, so the renderer falls back to its
      // own font rather than being handed an empty list.
      ...(fonts.length ? { fonts } : {}),
    },
  );

  return new Response(png.body, {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="mockclub-card-${data.no}.png"`,
      // The card carries a photo and a workplace. Never a shared cache.
      "Cache-Control": "private, no-store",
    },
  });
}
