/**
 * Mock LLM Clients (Anthropic, OpenAI, Perplexity)
 *
 * Provides mock implementations for LLM API clients.
 */

/**
 * Create a mock Anthropic response
 */
function createMockAnthropicResponse(overrides = {}) {
  return {
    id: 'msg_mock_123',
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: overrides.text || 'This is a mock Anthropic response.'
      }
    ],
    model: overrides.model || 'claude-sonnet-4-20250514',
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: {
      input_tokens: overrides.inputTokens || 100,
      output_tokens: overrides.outputTokens || 50
    },
    ...overrides
  };
}

/**
 * Create a mock streaming chunk for Anthropic
 */
function createMockAnthropicStreamChunk(text, type = 'content_block_delta') {
  return {
    type,
    index: 0,
    delta: {
      type: 'text_delta',
      text
    }
  };
}

/**
 * Create a mock Anthropic client
 */
function createMockAnthropicClient(options = {}) {
  const mockCreate = jest.fn().mockResolvedValue(
    createMockAnthropicResponse(options.defaultResponse || {})
  );

  // Mock streaming response
  const mockStream = jest.fn().mockImplementation(async function* () {
    yield createMockAnthropicStreamChunk('Hello');
    yield createMockAnthropicStreamChunk(' world');
    yield { type: 'message_stop' };
  });

  return {
    messages: {
      create: mockCreate,
      stream: mockStream
    },
    // Add method to customize response for specific tests
    _setNextResponse: (response) => {
      mockCreate.mockResolvedValueOnce(createMockAnthropicResponse(response));
    },
    _setNextError: (error) => {
      mockCreate.mockRejectedValueOnce(error);
    }
  };
}

/**
 * Create a mock OpenAI response
 */
function createMockOpenAIResponse(overrides = {}) {
  return {
    id: 'chatcmpl-mock123',
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: overrides.model || 'gpt-4o',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: overrides.text || 'This is a mock OpenAI response.'
        },
        finish_reason: 'stop'
      }
    ],
    usage: {
      prompt_tokens: overrides.inputTokens || 100,
      completion_tokens: overrides.outputTokens || 50,
      total_tokens: (overrides.inputTokens || 100) + (overrides.outputTokens || 50)
    },
    ...overrides
  };
}

/**
 * Create a mock streaming chunk for OpenAI
 */
function createMockOpenAIStreamChunk(text, finishReason = null) {
  return {
    id: 'chatcmpl-mock123',
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: 'gpt-4o',
    choices: [
      {
        index: 0,
        delta: { content: text },
        finish_reason: finishReason
      }
    ]
  };
}

/**
 * Create a mock OpenAI client
 */
function createMockOpenAIClient(options = {}) {
  const mockCreate = jest.fn().mockResolvedValue(
    createMockOpenAIResponse(options.defaultResponse || {})
  );

  // Mock streaming response (async iterator)
  const mockStreamCreate = jest.fn().mockImplementation(async () => {
    return {
      [Symbol.asyncIterator]: async function* () {
        yield createMockOpenAIStreamChunk('Hello');
        yield createMockOpenAIStreamChunk(' world');
        yield createMockOpenAIStreamChunk('', 'stop');
      }
    };
  });

  return {
    chat: {
      completions: {
        create: mockCreate
      }
    },
    // For streaming, the same create method is used with stream: true
    _mockStreamCreate: mockStreamCreate,
    // Add method to customize response for specific tests
    _setNextResponse: (response) => {
      mockCreate.mockResolvedValueOnce(createMockOpenAIResponse(response));
    },
    _setNextError: (error) => {
      mockCreate.mockRejectedValueOnce(error);
    }
  };
}

/**
 * Create mock Perplexity response (similar to OpenAI format)
 */
function createMockPerplexityResponse(overrides = {}) {
  return {
    id: 'pplx-mock123',
    model: overrides.model || 'sonar',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: overrides.text || 'This is a mock Perplexity response with citations.'
        },
        finish_reason: 'stop'
      }
    ],
    citations: overrides.citations || [
      'https://example.com/source1',
      'https://example.com/source2'
    ],
    usage: {
      prompt_tokens: overrides.inputTokens || 100,
      completion_tokens: overrides.outputTokens || 50
    },
    ...overrides
  };
}

module.exports = {
  createMockAnthropicClient,
  createMockAnthropicResponse,
  createMockAnthropicStreamChunk,
  createMockOpenAIClient,
  createMockOpenAIResponse,
  createMockOpenAIStreamChunk,
  createMockPerplexityResponse
};
