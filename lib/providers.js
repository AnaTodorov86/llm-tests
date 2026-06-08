/**
 * LLM Provider configurations
 * 
 * Add new providers here. Each provider must define:
 * - apiUrl: Base endpoint
 * - model: Default model ID
 * - apiKey: Auth token (from env var)
 */

export const PROVIDERS = {
    'render-mock': {
        apiUrl: 'https://llm-mock-gateway.onrender.com/v1/chat/completions',
        model: 'gpt-4',
        apiKey: 'anything', 
    },
    
    groq: {
        apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
        model: 'llama-3.3-70b-versatile',
        apiKey: __ENV.GROQ_API_KEY,
    },
    
    openai: {
        apiUrl: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4o-mini',
        apiKey: __ENV.OPENAI_API_KEY,
    },
    
    anthropic: {
        apiUrl: 'https://api.anthropic.com/v1/messages',
        model: 'claude-3-5-sonnet-20241022',
        apiKey: __ENV.ANTHROPIC_API_KEY,
    },
};

export function getProvider(name = 'groq') {
    const provider = PROVIDERS[name];
    
    if (!provider) {
        const available = Object.keys(PROVIDERS).join(', ');
        throw new Error(`Unknown provider: "${name}". Available: ${available}`);
    }
    
    if (!provider.apiKey) {
        throw new Error(`API key not set for provider "${name}". Set ${name.toUpperCase()}_API_KEY env var.`);
    }
    
    return provider;
}
