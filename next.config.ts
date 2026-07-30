import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      /**
       * Photo uploads go through a Server Action, and the default cap is 1 MB.
       *
       * The browser squares and re-encodes first, so a real upload is tens of
       * KB — this headroom is for the paths that skip that: an engine whose
       * canvas encoder fell back to JPEG, and the multipart boundaries and part
       * headers that ride along on the raw body. The server still refuses
       * anything over MAX_PHOTO_BYTES (2 MB), which is the limit that matters.
       */
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
