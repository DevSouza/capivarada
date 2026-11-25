import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // /partidas vira /partidas/index.html: funciona em qualquer host estático.
  trailingSlash: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
