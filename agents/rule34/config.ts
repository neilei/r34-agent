import { requireEnv } from "../../lib/utils";

// Venice API configuration - exported for use in nodes and graph
export const VENICE_BASE_URL = "https://api.venice.ai/api/v1/";
export const VENICE_API_KEY = requireEnv("VENICE_API_KEY");
