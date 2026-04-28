import http from 'k6/http';
import { check, sleep } from 'k6';
import { 
    ttft, 
    tps, 
    totalTokens, 
    streamErrors, 
    incompleteResponses,
    llmLatency,
    llmSuccess,
    rateLimitHits,
    streamDuration,
} from './streamingMetrics.js';

/**
 * askLLM_Streaming
 * 
 * Metrics tracked:
 * - TTFT: Time until first token (UX critical)
 * - TPS: Tokens per second throughput
 * - Stream completion: Did we get [DONE] signal?
 * - Partial responses: Detect truncated outputs
 * 
 * @param {string} prompt
 * @param {number} maxTokens
 * @param {number} temperature
 * @param {Object} provider
 * @returns {Object}
 */
export function askLLM_Streaming(prompt, maxTokens = 100, temperature = 0, provider) {
    const correlationId = generateCorrelationId();
    const startTime = Date.now();
    
    let firstTokenTime = null;
    let tokensReceived = 0;
    let fullResponse = '';
    let completed = false;
    let lastChunkTime = startTime;
    let chunkCount = 0;
    
    const payload = JSON.stringify({
        model: provider.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: temperature,
        stream: true,  // CRITICAL: Enable streaming
    });
    
    const params = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${provider.apiKey}`,
        },
        body: payload,
        timeout: '30s',
    };
    
    try {
        const response = http.post(provider.apiUrl, payload, params);
        
        if (response.status === 429) {
            rateLimitHits.add(1);
            
            const retryAfter = response.headers['Retry-After'] || '5';
            const backoffSeconds = parseInt(retryAfter, 10);
            
            console.warn(`[${correlationId}] Rate limited - retry after ${backoffSeconds}s`);
            
            return {
                answer: null,
                status: 429,
                retryAfter: backoffSeconds,
                correlationId,
            };
        }
        
        if (response.status !== 200) {
            streamErrors.add(1);
            console.error(`[${correlationId}] Request failed: ${response.status}`);
            
            return {
                answer: null,
                status: response.status,
                error: response.body,
                correlationId,
            };
        }
        
        const lines = response.body.split('\n');
        
        for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            
            const data = line.slice(6);
            
            if (data === '[DONE]') {
                completed = true;
                break;
            }
            
            try {
                const chunk = JSON.parse(data);
                const delta = chunk.choices?.[0]?.delta?.content || '';
                
                if (delta) {
                    if (!firstTokenTime) {
                        firstTokenTime = Date.now();
                        const ttftValue = firstTokenTime - startTime;
                        ttft.add(ttftValue);
                    }
                    
                    fullResponse += delta;
                    tokensReceived++;
                    
                    const now = Date.now();
                    const chunkLatency = now - lastChunkTime;
                    lastChunkTime = now;
                    chunkCount++;
                }
                
                const finishReason = chunk.choices?.[0]?.finish_reason;
                if (finishReason) {
                    completed = (finishReason === 'stop');
                }
                
            } catch (e) {
                console.warn(`[${correlationId}] Failed to parse chunk: ${e.message}`);
                streamErrors.add(1);
            }
        }
        
        const endTime = Date.now();
        const totalDuration = endTime - startTime;
        
        if (tokensReceived > 0 && totalDuration > 0) {
            const tpsValue = (tokensReceived / totalDuration) * 1000;
            tps.add(tpsValue);
            totalTokens.add(tokensReceived);
        }
        
        streamDuration.add(totalDuration);
        llmLatency.add(totalDuration);
        
        if (!completed) {
            incompleteResponses.add(1);
            console.warn(`[${correlationId}] Stream incomplete - ${tokensReceived} tokens in ${totalDuration}ms`);
        }
        
        llmSuccess.add(completed ? 1 : 0);
        
        return {
            answer: fullResponse,
            status: 200,
            ttft: firstTokenTime ? firstTokenTime - startTime : null,
            tps: tokensReceived / (totalDuration / 1000),
            tokensReceived,
            duration: totalDuration,
            completed,
            correlationId,
        };
        
    } catch (e) {
        streamErrors.add(1);
        llmSuccess.add(0);
        
        console.error(`[${correlationId}] Streaming failed: ${e.message}`);
        
        return {
            answer: null,
            status: 500,
            error: e.message,
            correlationId,
        };
    }
}

function generateCorrelationId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${timestamp}-${random}`;
}
