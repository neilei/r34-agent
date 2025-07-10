import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Handle workspace dependencies
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        "@langchain/langgraph": "@langchain/langgraph",
        "@langchain/openai": "@langchain/openai",
        uuid: "uuid",
        zod: "zod",
      });
    }

    return config;
  },
  transpilePackages: ["@rule34/agent"],
  serverExternalPackages: ["@langchain/langgraph", "@langchain/openai"],
};

export default nextConfig;
