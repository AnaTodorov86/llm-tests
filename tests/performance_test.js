import { sleep } from 'k6';
import { askLLM_Streaming } from '../lib/streamingHelpers.js';
import { getLoadProfile, generateThresholds } from '../lib/loadProfiles.js';
import { getPromptByType } from '../lib/prompts.js';
import { getProvider } from '../lib/providers.js';

const PROFILE_NAME = __ENV.LOAD_PROFILE || 'baseline';
const PROVIDER_NAME = __ENV.PROVIDER || 'groq';

const profile = getLoadProfile(PROFILE_NAME);
const provider = getProvider(PROVIDER_NAME);

console.log(`Running test: ${PROFILE_NAME} profile with ${PROVIDER_NAME} provider`);

export const options = {
    stages: profile.stages || [
        { duration: profile.duration, target: profile.vus },
    ],
    
    thresholds: generateThresholds(profile),
    
    tags: {
        test_name: 'llm_performance',
        profile: PROFILE_NAME,
        provider: PROVIDER_NAME,
    },
};

export default function () {
    // Select prompt based on profile type
    const prompt = getPromptByType(profile.promptType);
    
    // Execute streaming request with profile parameters
    const result = askLLM_Streaming(
        prompt,
        profile.maxTokens,
        profile.temperature,
        provider
    );
    
    if (result.status !== 200) {
        console.error(`Request failed: ${result.status} - ${result.error || 'Unknown error'}`);
    }
    
    if (result.status === 200 && result.completed) {
        console.log(`[${result.correlationId}] ✓ TTFT: ${result.ttft}ms | TPS: ${result.tps.toFixed(1)} | Tokens: ${result.tokensReceived}`);
    }
    

    sleep(1);
}

export function setup() {
    console.log('='.repeat(60));
    console.log(`LLM Performance Test Starting`);
    console.log(`Profile: ${PROFILE_NAME}`);
    console.log(`Provider: ${PROVIDER_NAME} (${provider.model})`);
    console.log(`Expected TTFT p95: <${profile.expectedTTFT}ms`);
    console.log(`Expected TPS avg: >${profile.expectedTPS}`);
    console.log('='.repeat(60));
}

export function teardown(data) {
    console.log('='.repeat(60));
    console.log('Test Complete');
    console.log('Check k6 output above for threshold violations');
    console.log('='.repeat(60));
}
