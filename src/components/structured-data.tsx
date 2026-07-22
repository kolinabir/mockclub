import { FAQ } from "@/content/faq";
import { TRACKS } from "@/content/tracks";
import { SITE_DESCRIPTION, SITE_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * JSON-LD for the landing page.
 *
 * The FAQ entries are imported from the same module the page renders, so the
 * structured data can never describe questions the page doesn't show — the
 * mismatch Google treats as spam.
 *
 * Rendered as a plain <script>, not next/script: it must be in the initial
 * HTML for crawlers that don't execute JS.
 */
export function StructuredData() {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        slogan: "Made by devs, for everyone.",
        email: SITE_EMAIL,
        contactPoint: {
          "@type": "ContactPoint",
          email: SITE_EMAIL,
          contactType: "general enquiries",
          availableLanguage: ["English", "Bengali"],
        },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        publisher: { "@id": `${SITE_URL}/#organization` },
        inLanguage: "en",
      },
      {
        "@type": "Service",
        "@id": `${SITE_URL}/#service`,
        name: "Volunteer mock interviews",
        serviceType: "Interview practice",
        provider: { "@id": `${SITE_URL}/#organization` },
        areaServed: "Worldwide",
        description: SITE_DESCRIPTION,
        // Price is a first-class, machine-readable fact here — it is the
        // single most differentiating thing about this service.
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          availability: "https://schema.org/PreOrder",
        },
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "Practice tracks",
          itemListElement: TRACKS.map((t) => ({
            "@type": "Offer",
            itemOffered: { "@type": "Service", name: t.name, description: t.note },
            price: "0",
            priceCurrency: "USD",
          })),
        },
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE_URL}/#faq`,
        mainEntity: FAQ.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
