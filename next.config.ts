import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* The network moved from /network to /crantwiz when it got its name, so the
   * old address still has to lead somewhere.
   *
   * Temporary rather than permanent on purpose. A permanent redirect is cached
   * by browsers more or less forever, and this name has already changed once;
   * a temporary one costs nothing here, since the site is new enough that no
   * search engine has anything worth preserving. */
  async redirects() {
    return [{ source: "/network", destination: "/crantwiz", permanent: false }];
  },

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
