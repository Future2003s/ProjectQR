import NextBundleAnalyzer from "@next/bundle-analyzer";
import createNextIntlPlugin from "next-intl/plugin";

// ,
//       {
//         protocol: "https",
//         hostname: "47.129.59.2",
//         port: "4000",
//         pathname: "/static/**",
//       },

const withNextIntl = createNextIntlPlugin();
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "localhost",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "47.129.59.2",
        port: "4000",
        pathname: "/static/**",
      },
      {
        protocol: "https",
        hostname: "api.psang.online",
        pathname: "/static/**",
      },
      {
        hostname: "via.placeholder.com",
        pathname: "/**",
      },
    ],
  },
};
const withBundleAnalyzer = NextBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});
export default withNextIntl(withBundleAnalyzer(nextConfig));
