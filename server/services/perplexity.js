/**
 * Perplexity Sonar Service
 * Insight 360 - LLM Provider Integration
 * 
 * OpenAI-compatible API with native search-augmented generation
 */

const PERPLEXITY_BASE_URL = 'https://api.perplexity.ai';

// Available Sonar models
const MODELS = {
  'sonar': { name: 'Sonar', tier: 'search', description: 'Quick factual queries' },
  'sonar-pro': { name: 'Sonar Pro', tier: 'search', description: 'Complex queries, deeper context' },
  'sonar-reasoning': { name: 'Sonar Reasoning', tier: 'reasoning', description: 'Problem-solving with search' },
  'sonar-reasoning-pro': { name: 'Sonar Reasoning Pro', tier: 'reasoning', description: 'Chain of Thought reasoning' },
  'sonar-deep-research': { name: 'Sonar Deep Research', tier: 'research', description: 'Exhaustive research reports' }
};

/**
 * Check if API key is configured
 */
function isConfigured() {
  return !!process.env.PERPLEXITY_API_KEY;
}

/**
 * Check if a model belongs to Perplexity
 */
function isModelSupported(model) {
  return model in MODELS;
}

/**
 * Get list of available models
 */
function getModels() {
  if (!isConfigured()) return [];
  
  return Object.entries(MODELS).map(([id, info]) => ({
    id,
    name: info.name,
    provider: 'perplexity',
    tier: info.tier,
    description: info.description
  }));
}

/**
 * Non-streaming chat completion
 */
async function chat(messages, options = {}) {
  if (!isConfigured()) {
    throw new Error('Perplexity API key not configured');
  }

  const {
    model = 'sonar',
    searchMode = 'medium',
    systemPrompt = null
  } = options;

  // Build messages array with optional system prompt
  const formattedMessages = systemPrompt 
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;

  const response = await fetch(`${PERPLEXITY_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: formattedMessages,
      stream: false,
      search_mode: searchMode,
      return_citations: true,
      return_images: false
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Perplexity API error: ${response.status} - ${error.message || 'Unknown error'}`);
  }

  const data = await response.json();
  
  return {
    content: data.choices[0].message.content,
    citations: data.citations || [],
    model: data.model,
    usage: data.usage
  };
}

/**
 * Streaming chat completion
 */
async function chatStream(messages, options = {}, onChunk, onComplete) {
  if (!isConfigured()) {
    throw new Error('Perplexity API key not configured');
  }

  const {
    model = 'sonar',
    searchMode = 'medium',
    systemPrompt = null
  } = options;

  const formattedMessages = systemPrompt 
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;

  const response = await fetch(`${PERPLEXITY_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: formattedMessages,
      stream: true,
      search_mode: searchMode,
      return_citations: true,
      return_images: false
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Perplexity API error: ${response.status} - ${error.message || 'Unknown error'}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  let citations = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          if (data === '[DONE]') {
            continue;
          }

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content || '';
            
            if (delta) {
              fullContent += delta;
              onChunk(delta);
            }

            // Capture citations from final chunk
            if (parsed.citations) {
              citations = parsed.citations;
            }
          } catch (e) {
            // Skip malformed chunks
          }
        }
      }
    }

    onComplete({
      content: fullContent,
      citations,
      model
    });

  } catch (error) {
    throw new Error(`Stream error: ${error.message}`);
  }
}

/**
 * Format citations for display
 */
function formatCitations(citations) {
  if (!citations || citations.length === 0) return '';
  
  return citations.map((url, i) => `[${i + 1}] ${url}`).join('\n');
}

module.exports = {
  isConfigured,
  isModelSupported,
  getModels,
  chat,
  chatStream,
  formatCitations,
  MODELS
};
