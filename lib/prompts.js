/**
 * Prompt library - organized by type for realistic load simulation
 * 
 * Real users don't send identical requests. Variety matters for:
 * - Cache hit rate testing
 * - Token distribution realism
 * - Provider-side batching behavior
 */

export const PROMPTS_BY_TYPE = {
    short: [
        "What is 2+2?",
        "Name the capital of France.",
        "What color is the sky?",
        "Who wrote Romeo and Juliet?",
        "What is HTTP?",
        "Explain JSON in one sentence.",
        "What does API stand for?",
        "Convert 100 USD to EUR.",
    ],
    
    medium: [
        "Write a Python function to calculate fibonacci numbers up to n.",
        "Explain how HTTP cookies work in 100 words.",
        "Compare REST vs GraphQL APIs in a short paragraph.",
        "Write a SQL query to find duplicate emails in a users table.",
        "Create a React component for a simple counter with increment/decrement buttons.",
        "Explain the difference between let, const, and var in JavaScript.",
        "Write a bash script to find all .log files modified in the last 24 hours.",
    ],
    
    long: [
        "Write a detailed 500-word essay on the impact of AI on software development, covering automation, code quality, and developer productivity. Include specific examples and potential risks.",
        "Generate a comprehensive project plan for building a mobile app, including timeline, milestones, tech stack decisions, and team structure. Assume a 6-month timeline and a team of 5 engineers.",
        "Create technical documentation for a new REST API with endpoints for user management. Include authentication flow, error codes, rate limiting, and example requests/responses.",
        "Design a database schema for an e-commerce platform handling products, orders, users, and inventory. Explain your normalization decisions and indexing strategy.",
    ],
};

export function getPromptByType(type = 'short') {
    const prompts = PROMPTS_BY_TYPE[type];
    
    if (!prompts) {
        throw new Error(`Unknown prompt type: "${type}". Available: short, medium, long`);
    }
    
    return prompts[Math.floor(Math.random() * prompts.length)];
}

export function getRandomPrompt() {
    const types = Object.keys(PROMPTS_BY_TYPE);
    const randomType = types[Math.floor(Math.random() * types.length)];
    return getPromptByType(randomType);
}
