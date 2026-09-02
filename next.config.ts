import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // YouTube channel avatars are served from Google's CDN.
    remotePatterns: [
      { protocol: "https", hostname: "yt3.ggpht.com" },
      { protocol: "https", hostname: "yt3.googleusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
