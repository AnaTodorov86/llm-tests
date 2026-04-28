import { Trend, Counter, Rate } from 'k6/metrics';

export const ttft = new Trend('time_to_first_token', true);
export const tps = new Trend('tokens_per_second', true);
export const totalTokens = new Counter('total_tokens_generated');
export const streamErrors = new Rate('stream_errors');
export const incompleteResponses = new Counter('incomplete_responses');

export const firstChunkSize = new Trend('first_chunk_bytes');
export const avgChunkLatency = new Trend('avg_chunk_latency');
export const streamDuration = new Trend('stream_total_duration');

export const llmLatency = new Trend('llm_latency', true);
export const llmSuccess = new Rate('llm_success');
export const rateLimitHits = new Counter('llm_rate_limit_hits');