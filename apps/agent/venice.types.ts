export interface VeniceMessage {
  content: string;
  reasoning_content: string | null;
  role: "assistant" | "user" | "system";
  tool_calls: unknown[];
}

export interface VeniceChoice {
  finish_reason: string;
  index: number;
  logprobs: unknown | null;
  message: VeniceMessage;
  stop_reason: string | null;
}

export interface VeniceUsage {
  completion_tokens: number;
  prompt_tokens: number;
  prompt_tokens_details: unknown | null;
  total_tokens: number;
}

export interface VeniceParameters {
  include_venice_system_prompt: boolean;
  include_search_results_in_stream: boolean;
  web_search_citations: unknown[];
  enable_web_search: string;
  enable_web_citations: boolean;
  strip_thinking_response: boolean;
  disable_thinking: boolean;
  character_slug: string;
}

export interface VeniceResponseSuccess {
  choices: VeniceChoice[];
  created: number;
  id: string;
  model: string;
  object: string;
  prompt_logprobs: unknown | null;
  usage: VeniceUsage;
  venice_parameters: VeniceParameters;
}

export interface VeniceErrorDetails {
  _errors: string[];
  [key: string]: { _errors: string[] } | string[] | undefined;
}

export interface VeniceErrorResponse {
  error: string;
  details?: VeniceErrorDetails;
}

export type VeniceResponse = VeniceResponseSuccess | VeniceErrorResponse;
