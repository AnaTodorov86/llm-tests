/**
 * Load profiles - parameterize realistic LLM workloads
 * 
 * Real-world LLM usage varies dramatically:
 * - Chat: quick Q&A, short completions
 * - Code: medium-length structured output
 * - Document: long-form generation
 * - Burst: traffic spikes (product launches, viral moments)
 * 
 * Each profile defines expected SLOs for that workload type
 */

export const LOAD_PROFILES = {
    chat: {
        vus: 20,
        duration: '5m',
        promptType: 'short',
        maxTokens: 100,
        temperature: 0.7,
        expectedTTFT: 300,      
        expectedTPS: 60,        
    },
    
    code: {
        vus: 10,
        duration: '5m',
        promptType: 'medium',
        maxTokens: 500,
        temperature: 0.2,       
        expectedTTFT: 400,
        expectedTPS: 50,        
    },
    
    document: {
        vus: 5,
        duration: '5m',
        promptType: 'long',
        maxTokens: 2000,
        temperature: 0.8,      
        expectedTTFT: 600,     
        expectedTPS: 40,
    },
    
    burst: {
        stages: [
            { duration: '1m', target: 10 },
            { duration: '30s', target: 100 },   
            { duration: '2m', target: 10 },     
        ],
        promptType: 'short',
        maxTokens: 100,
        temperature: 0.5,
        expectedTTFT: 800,      
        expectedTPS: 30,        
    },
    
    baseline: {
        vus: 10,
        duration: '3m',
        promptType: 'short',
        maxTokens: 100,
        temperature: 0,         
        expectedTTFT: 250,
        expectedTPS: 65,
    },
    
    stress: {
        stages: [
            { duration: '2m', target: 50 },
            { duration: '3m', target: 100 },
            { duration: '3m', target: 200 },
            { duration: '2m', target: 0 },
        ],
        promptType: 'medium',
        maxTokens: 200,
        temperature: 0.5,
        expectedTTFT: 1500,
        expectedTPS: 25,
    },
};

export function getLoadProfile(name = 'baseline') {
    const profile = LOAD_PROFILES[name];
    
    if (!profile) {
        const available = Object.keys(LOAD_PROFILES).join(', ');
        throw new Error(`Unknown load profile: "${name}". Available: ${available}`);
    }
    
    return profile;
}

/**
 * Generate thresholds dynamically based on load profile
 * 
 * WHY: Different workloads have different SLOs
 * - Chat needs fast TTFT (UX critical)
 * - Document generation can be slower
 * - Stress tests allow degraded performance
 */
export function generateThresholds(profile) {
    return {
        'time_to_first_token': [
            `p(95)<${profile.expectedTTFT}`,
            `p(99)<${profile.expectedTTFT * 1.5}`,
        ],
        
        'tokens_per_second': [
            `avg>${profile.expectedTPS}`,
            `p(50)>${profile.expectedTPS * 0.8}`,
        ],
        
        'llm_latency': [
            `p(95)<${profile.maxTokens * 20}`,  
            `p(99)<${profile.maxTokens * 30}`,
        ],
        
        'stream_errors': ['rate<0.01'],         
        'llm_success': ['rate>0.95'],           
        'incomplete_responses': ['count<5'],    
    };
}
