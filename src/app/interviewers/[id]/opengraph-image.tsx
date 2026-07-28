import { ImageResponse } from "next/og";

import {
  CARD_H,
  CARD_W,
  CardPrint,
  PAPER,
  SHADOW,
} from "@/components/card-print";
import { loadGoogleFont } from "@/server/fonts/google";
import { getPublicInterviewer } from "@/server/profile/public";
import { getObject } from "@/server/storage/r2";

/**
 * The share image for a public page: the card itself.
 *
 * Nothing else would be as good. The card already IS this person's summary, it
 * is the thing they chose to publish, and reusing it means the link preview and
 * the page can never say different things.
 *
 * Gated by the same `getPublicInterviewer` as the page, so an unpublished
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

const SCALE = (size.height - 48) / (CARD_H + SHADOW);

async function photoDataUri(key: string | null): Promise<string | null> {
  if (!key) return null;

  const object = await getObject(key);
  if (!object) return null;

  const bytes = Buffer.from(await new Response(object.body).arrayBuffer());
  return `data:${object.contentType};base64,${bytes.toString("base64")}`;
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const person = await getPublicInterviewer(id);

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
        {/* Scaled from the top-left, so the wrapper is sized to the RESULT —
            a transform doesn't change layout, and without this the card would
            reserve its full 1000×1467 and push itself off the canvas. */}
        <div
          style={{
            display: "flex",
            width: (CARD_W + SHADOW) * SCALE,
            height: (CARD_H + SHADOW) * SCALE,
          }}
        >
          <div
            style={{
              display: "flex",
              transform: `scale(${SCALE})`,
              transformOrigin: "top left",
            }}
          >
            <CardPrint data={person.card} photo={photo} />
          </div>
        </div>
      </div>
    ),
    { ...size, ...(fonts.length ? { fonts } : {}) },
  );
}
