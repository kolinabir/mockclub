import { ImageResponse } from "next/og";

import { CARD_H, CardPrint, PAPER, SHADOW } from "@/components/card-print";
import { loadGoogleFont } from "@/server/fonts/google";
import { getPublicInterviewerByHandle } from "@/server/profile/public";
import { isRenderablePhoto } from "@/server/profile/photo";
import { getObject } from "@/server/storage/r2";

/**
 * The share image for a public page: the card itself.
 *
 * Nothing else would be as good. The card already IS this person's summary, it
 * is the thing they chose to publish, and reusing it means the link preview and
 * the page can never say different things.
 *
 * Gated by the same resolver as the page, so an unpublished
 * member's face cannot be pulled out through the image route.
 */

export const alt = "MockClub interviewer card";
export const contentType = "image/png";

/* These images are statically optimised by default, and this one is built from
   a member's live profile — a cached copy would keep showing a card they have
   since changed or taken down. */
export const dynamic = "force-dynamic";

/* Landscape, because that is the shape every link unfurler crops to. The
   portrait card is centred on paper rather than cropped — a share image that
   cuts someone's head off is worse than one with margins. */
export const size = { width: 1200, height: 630 };

/** Fits the portrait card inside the landscape canvas with room to breathe. */
const SCALE = (size.height - 56) / (CARD_H + SHADOW);

async function photoDataUri(key: string | null): Promise<string | null> {
  if (!key) return null;

  const object = await getObject(key);
  if (!object) return null;

  // Rows written before uploads were restricted to JPEG/PNG can still hold a
  // WebP, and handing one to the renderer kills the whole response rather than
  // just the image. A card with an empty plate beats no card at all — the fix
  // for those members is to re-upload, which now stores a renderable format.
  if (!isRenderablePhoto(object.contentType)) return null;

  const bytes = Buffer.from(await new Response(object.body).arrayBuffer());
  return `data:${object.contentType};base64,${bytes.toString("base64")}`;
}

export default async function Image({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const person = await getPublicInterviewerByHandle(handle);

  // A blank sheet rather than a 404: an unfurler that gets an error shows the
  // raw URL, which is a worse thing to publish than nothing.
  if (!person) {
    return new ImageResponse(
      <div style={{ display: "flex", width: "100%", height: "100%", background: PAPER }} />,
      size,
    );
  }

  const [photo, display, body, mono] = await Promise.all([
    photoDataUri(person.card.photoKey),
    loadGoogleFont("Fraunces:wght@700"),
    loadGoogleFont("Archivo:wght@700"),
    loadGoogleFont("Fragment+Mono"),
  ]);

  const fonts = [
    display ? { name: "Fraunces", data: display, weight: 700 as const } : null,
    body ? { name: "Archivo", data: body, weight: 700 as const } : null,
    mono ? { name: "FragmentMono", data: mono, weight: 400 as const } : null,
  ].filter((f) => f !== null);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: PAPER,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Scaled by MULTIPLYING the card's measurements, not with a CSS
            transform — the renderer lays a transformed subtree out correctly
            and then drops its SVG, which cost this image its logo. */}
        <CardPrint data={person.card} photo={photo} scale={SCALE} />
      </div>
    ),
    { ...size, ...(fonts.length ? { fonts } : {}) },
  );
}
