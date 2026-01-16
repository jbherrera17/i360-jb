/**
 * Workflow Engine Unit Tests
 * Tests for the WorkflowEngine class that handles step-by-step workflow execution
 */

const WorkflowEngine = require('../../../server/services/workflowEngine');

// Mock the LLM services
jest.mock('../../../server/services/anthropic', () => ({
  chat: jest.fn().mockResolvedValue({
    content: 'AI response content',
    usage: { total_tokens: 150 }
  })
}));

jest.mock('../../../server/services/perplexity', () => ({
  search: jest.fn().mockResolvedValue({
    content: 'Research results',
    answer: 'Perplexity answer',
    citations: ['https://example.com/1', 'https://example.com/2']
  })
}));

const anthropicService = require('../../../server/services/anthropic');
const perplexityService = require('../../../server/services/perplexity');

describe('WorkflowEngine', () => {
  let engine;
  let mockSupabase;

  // Helper to create chainable mock
  const createChainable = (data = null, error = null) => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data, error }),
    then: (resolve) => resolve({ data, error })
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn(() => createChainable())
    };

    engine = new WorkflowEngine(mockSupabase);
  });

  describe('constructor', () => {
    it('should initialize with supabase client', () => {
      expect(engine.supabase).toBe(mockSupabase);
    });
  });

  describe('interpolateTemplate', () => {
    it('should replace {{variable}} patterns', () => {
      const template = 'Hello {{name}}, welcome to {{company}}!';
      const variables = { name: 'John', company: 'Acme Inc' };

      const result = engine.interpolateTemplate(template, variables);

      expect(result).toBe('Hello John, welcome to Acme Inc!');
    });

    it('should handle nested variables with dot notation', () => {
      const template = 'User: {{user.name}}, Email: {{user.email}}';
      const variables = { user: { name: 'Jane', email: 'jane@example.com' } };

      const result = engine.interpolateTemplate(template, variables);

      expect(result).toBe('User: Jane, Email: jane@example.com');
    });

    it('should preserve unmatched variables', () => {
      const template = 'Hello {{name}}, your code is {{code}}';
      const variables = { name: 'John' };

      const result = engine.interpolateTemplate(template, variables);

      expect(result).toBe('Hello John, your code is {{code}}');
    });

    it('should stringify object values', () => {
      const template = 'Data: {{data}}';
      const variables = { data: { key: 'value' } };

      const result = engine.interpolateTemplate(template, variables);

      expect(result).toContain('"key": "value"');
    });

    it('should return empty string for null/undefined template', () => {
      expect(engine.interpolateTemplate(null, {})).toBe('');
      expect(engine.interpolateTemplate(undefined, {})).toBe('');
    });
  });

  describe('getNestedValue', () => {
    it('should get top-level values', () => {
      const obj = { name: 'John', age: 30 };

      expect(engine.getNestedValue(obj, 'name')).toBe('John');
      expect(engine.getNestedValue(obj, 'age')).toBe(30);
    });

    it('should get nested values', () => {
      const obj = { user: { profile: { name: 'Jane' } } };

      expect(engine.getNestedValue(obj, 'user.profile.name')).toBe('Jane');
    });

    it('should return undefined for missing paths', () => {
      const obj = { user: { name: 'John' } };

      expect(engine.getNestedValue(obj, 'user.email')).toBeUndefined();
      expect(engine.getNestedValue(obj, 'missing.path')).toBeUndefined();
    });
  });

  describe('determineNextAction', () => {
    it('should return wait_for_input when waiting approval', () => {
      const step = { step_number: 2 };
      const result = { status: 'waiting_approval' };

      const nextAction = engine.determineNextAction(step, result);

      expect(nextAction).toEqual({
        action: 'wait_for_input',
        step: 2
      });
    });

    it('should return revision_needed when rejected', () => {
      const step = { step_number: 3 };
      const result = { status: 'rejected' };

      const nextAction = engine.determineNextAction(step, result);

      expect(nextAction).toEqual({
        action: 'revision_needed',
        step: 3
      });
    });

    it('should return show_for_review when execution_mode is review', () => {
      const step = { step_number: 4, execution_mode: 'review' };
      const result = { status: 'completed' };

      const nextAction = engine.determineNextAction(step, result);

      expect(nextAction).toEqual({
        action: 'show_for_review',
        step: 4,
        nextStep: 5
      });
    });

    it('should return proceed for completed steps', () => {
      const step = { step_number: 5, execution_mode: 'auto' };
      const result = { status: 'completed' };

      const nextAction = engine.determineNextAction(step, result);

      expect(nextAction).toEqual({
        action: 'proceed',
        nextStep: 6
      });
    });

    it('should return error for failed steps', () => {
      const step = { step_number: 1 };
      const result = { status: 'failed', error: 'Something went wrong' };

      const nextAction = engine.determineNextAction(step, result);

      expect(nextAction).toEqual({
        action: 'error',
        error: 'Something went wrong'
      });
    });
  });

  describe('handleUserInput', () => {
    it('should return waiting status when no input provided', async () => {
      const step = {
        instructions: 'Please enter your name',
        input_fields: [{ name: 'name', type: 'text' }]
      };

      const result = await engine.handleUserInput(step, {}, {});

      expect(result.status).toBe('waiting_approval');
      expect(result.message).toBe('Please enter your name');
      expect(result.fields).toEqual(step.input_fields);
    });

    it('should return completed when input provided', async () => {
      const step = { instructions: 'Enter name' };
      const inputData = { name: 'John Doe' };

      const result = await engine.handleUserInput(step, inputData, {});

      expect(result.status).toBe('completed');
      expect(result.output).toEqual(inputData);
    });

    it('should use default message when no instructions', async () => {
      const step = {};

      const result = await engine.handleUserInput(step, null, {});

      expect(result.message).toBe('Please provide the required information.');
    });
  });

  describe('handleAgentChat', () => {
    it('should call anthropic service with correct parameters', async () => {
      const step = {
        prompt_template: 'Analyze: {{topic}}',
        agent: { system_prompt: 'You are an analyst' }
      };
      const variables = { topic: 'market trends' };

      const result = await engine.handleAgentChat(step, {}, variables);

      expect(anthropicService.chat).toHaveBeenCalledWith({
        model: 'claude-sonnet-4-20250514',
        system: 'You are an analyst',
        messages: [{ role: 'user', content: 'Analyze: market trends' }],
        max_tokens: 4096
      });

      expect(result.status).toBe('completed');
      expect(result.output).toBe('AI response content');
      expect(result.tokens).toBe(150);
      // Duration may be 0 or greater depending on execution speed
      expect(typeof result.duration).toBe('number');
    });

    it('should handle missing agent gracefully', async () => {
      const step = { prompt_template: 'Hello' };

      const result = await engine.handleAgentChat(step, {}, {});

      expect(anthropicService.chat).toHaveBeenCalledWith(
        expect.objectContaining({
          system: ''
        })
      );
      expect(result.status).toBe('completed');
    });
  });

  describe('handleSkillExecution', () => {
    it('should execute skill with instructions as system prompt', async () => {
      const step = {
        prompt_template: 'Generate content for {{topic}}',
        skill: { instructions: 'You are a content expert' }
      };
      const variables = { topic: 'AI' };

      const result = await engine.handleSkillExecution(step, {}, variables);

      expect(anthropicService.chat).toHaveBeenCalledWith({
        model: 'claude-sonnet-4-20250514',
        system: 'You are a content expert',
        messages: [{ role: 'user', content: 'Generate content for AI' }],
        max_tokens: 8192
      });

      expect(result.status).toBe('completed');
    });

    it('should throw error when no skill configured', async () => {
      const step = { prompt_template: 'Test' };

      await expect(
        engine.handleSkillExecution(step, {}, {})
      ).rejects.toThrow('No skill configured for skill_execution step');
    });
  });

  describe('handleResearch', () => {
    it('should call perplexity service for research', async () => {
      const step = { prompt_template: 'Research: {{query}}' };
      const variables = { query: 'latest AI trends' };

      const result = await engine.handleResearch(step, {}, variables);

      expect(perplexityService.search).toHaveBeenCalledWith({
        query: 'Research: latest AI trends',
        model: 'sonar',
        focus: 'comprehensive'
      });

      expect(result.status).toBe('completed');
      expect(result.output).toBe('Research results');
      expect(result.citations).toEqual([
        'https://example.com/1',
        'https://example.com/2'
      ]);
    });
  });

  describe('handleHumanGate', () => {
    it('should return approved status when approved=true', async () => {
      const step = {};
      const inputData = { approved: true, response: 'Looks good!' };

      const result = await engine.handleHumanGate(step, inputData);

      expect(result.status).toBe('completed');
      expect(result.gateStatus).toBe('approved');
      expect(result.output).toBe('Looks good!');
    });

    it('should return rejected status when approved=false', async () => {
      const step = {};
      const inputData = { approved: false, response: 'Needs changes' };

      const result = await engine.handleHumanGate(step, inputData);

      expect(result.status).toBe('rejected');
      expect(result.gateStatus).toBe('rejected');
      expect(result.output).toBe('Needs changes');
    });

    it('should return waiting status when no approval provided', async () => {
      const step = { gate_message: 'Please approve this step' };

      const result = await engine.handleHumanGate(step, {});

      expect(result.status).toBe('waiting_approval');
      expect(result.gateStatus).toBe('waiting');
      expect(result.message).toBe('Please approve this step');
    });

    it('should use default messages', async () => {
      const step = {};

      const approved = await engine.handleHumanGate(step, { approved: true });
      expect(approved.output).toBe('Approved');

      const rejected = await engine.handleHumanGate(step, { approved: false });
      expect(rejected.output).toBe('Rejected');

      const waiting = await engine.handleHumanGate(step, {});
      expect(waiting.message).toBe('Please review and approve to continue.');
    });
  });

  describe('handleContextCreation', () => {
    it('should create context asset from skill config', async () => {
      const step = {
        skill: { produces_context_type: 'company_description' },
        input_fields: { name: '{{company_name}}' }
      };
      const inputData = {};
      const variables = { company_name: 'Acme Inc' };

      const result = await engine.handleContextCreation(step, inputData, variables);

      expect(result.status).toBe('completed');
      expect(result.output.context_type).toBe('company_description');
    });

    it('should return input data when no skill configured', async () => {
      const step = {};
      const inputData = { key: 'value' };

      const result = await engine.handleContextCreation(step, inputData, {});

      expect(result.status).toBe('completed');
      expect(result.output).toEqual(inputData);
    });
  });

  describe('handleReview', () => {
    it('should return waiting status until approved', async () => {
      const step = {
        instructions: 'Review this output',
        output_variable: 'draft'
      };
      const variables = { draft: 'Draft content' };

      const result = await engine.handleReview(step, {}, variables);

      expect(result.status).toBe('waiting_approval');
      expect(result.output).toBe('Draft content');
      expect(result.message).toBe('Review this output');
    });

    it('should complete when approved', async () => {
      const step = { output_variable: 'draft' };
      const inputData = { approved: true, feedback: 'Great work!' };
      const variables = { draft: 'Original draft' };

      const result = await engine.handleReview(step, inputData, variables);

      expect(result.status).toBe('completed');
      expect(result.output.feedback).toBe('Great work!');
    });
  });

  describe('handleArtifactGeneration', () => {
    it('should generate docx artifact when requested', async () => {
      const step = {};
      const inputData = { generate_docx: true };

      const result = await engine.handleArtifactGeneration(step, inputData, {});

      expect(result.status).toBe('completed');
      expect(result.output.artifacts).toContainEqual({ type: 'docx', status: 'pending' });
    });

    it('should generate pptx artifact when requested', async () => {
      const step = {};
      const inputData = { generate_pptx: true };

      const result = await engine.handleArtifactGeneration(step, inputData, {});

      expect(result.status).toBe('completed');
      expect(result.output.artifacts).toContainEqual({ type: 'pptx', status: 'pending' });
    });

    it('should generate multiple artifacts', async () => {
      const step = {};
      const inputData = { generate_docx: true, generate_pptx: true };

      const result = await engine.handleArtifactGeneration(step, inputData, {});

      expect(result.output.artifacts).toHaveLength(2);
    });

    it('should return empty artifacts when nothing requested', async () => {
      const step = {};
      const inputData = {};

      const result = await engine.handleArtifactGeneration(step, inputData, {});

      expect(result.output.artifacts).toHaveLength(0);
    });
  });

  describe('handleOutput', () => {
    it('should return all variables as output', async () => {
      const step = {};
      const variables = {
        step1_result: 'Output 1',
        step2_result: 'Output 2',
        final_draft: 'Final content'
      };

      const result = await engine.handleOutput(step, variables);

      expect(result.status).toBe('completed');
      expect(result.output).toEqual(variables);
    });
  });

  describe('getOrCreateStepExecution', () => {
    it('should return existing execution if found', async () => {
      const existingExec = { id: 'exec-123', step_number: 1 };
      mockSupabase.from.mockReturnValue(createChainable(existingExec));

      const result = await engine.getOrCreateStepExecution('exec-id', { step_number: 1 }, {});

      expect(result).toEqual(existingExec);
    });

    it('should create new execution if not found', async () => {
      const newExec = { id: 'new-exec-123' };
      let callCount = 0;

      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({ data: null, error: null }); // No existing
          }
          return Promise.resolve({ data: newExec, error: null }); // Created
        })
      }));

      const result = await engine.getOrCreateStepExecution(
        'exec-id',
        { id: 'step-id', step_number: 1 },
        { input: 'data' }
      );

      expect(result).toEqual(newExec);
    });
  });

  describe('updateStepExecution', () => {
    it('should update step execution with result data', async () => {
      const updateMock = jest.fn().mockReturnThis();
      mockSupabase.from.mockReturnValue({
        update: updateMock,
        eq: jest.fn().mockResolvedValue({ error: null })
      });

      await engine.updateStepExecution('step-exec-id', {
        status: 'completed',
        output: 'Step output',
        tokens: 100,
        duration: 500
      });

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          output_content: 'Step output',
          tokens_used: 100,
          duration_ms: 500
        })
      );
    });

    it('should include gate_status when provided', async () => {
      const updateMock = jest.fn().mockReturnThis();
      mockSupabase.from.mockReturnValue({
        update: updateMock,
        eq: jest.fn().mockResolvedValue({ error: null })
      });

      await engine.updateStepExecution('step-exec-id', {
        status: 'completed',
        gateStatus: 'approved'
      });

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          gate_status: 'approved'
        })
      );
    });
  });

  describe('executeStep', () => {
    const mockExecution = {
      id: 'exec-001',
      variables: { input: 'test' },
      workflow: {
        steps: [
          { step_number: 1, step_type: 'user_input', instructions: 'Enter data' }
        ]
      }
    };

    beforeEach(() => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'workflow_executions') {
          return createChainable(mockExecution);
        }
        if (table === 'workflow_step_executions') {
          return {
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 'step-exec-001' },
              error: null
            })
          };
        }
        return createChainable();
      });
    });

    it('should execute user_input step', async () => {
      const result = await engine.executeStep('exec-001', 1, {});

      expect(result.success).toBe(true);
      expect(result.step).toBe(1);
      expect(result.requiresHumanInput).toBe(true);
    });

    it('should return error for unknown step type', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'workflow_executions') {
          return createChainable({
            ...mockExecution,
            workflow: {
              steps: [{ step_number: 1, step_type: 'unknown_type' }]
            }
          });
        }
        return createChainable({ id: 'step-exec-001' });
      });

      const result = await engine.executeStep('exec-001', 1, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown step type');
    });

    it('should return error when step not found', async () => {
      const result = await engine.executeStep('exec-001', 999, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Step 999 not found');
    });
  });

  describe('getExecutionProgress', () => {
    it('should return execution progress from view', async () => {
      const progressData = {
        execution_id: 'exec-001',
        completed_steps: 3,
        total_steps: 5,
        current_step: 4
      };

      mockSupabase.from.mockReturnValue(createChainable(progressData));

      const result = await engine.getExecutionProgress('exec-001');

      expect(result).toEqual(progressData);
      expect(mockSupabase.from).toHaveBeenCalledWith('workflow_execution_progress');
    });

    it('should throw error on database failure', async () => {
      const dbError = { message: 'Database error' };
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: dbError })
      });

      await expect(
        engine.getExecutionProgress('exec-001')
      ).rejects.toEqual(dbError);
    });
  });

  describe('advanceToNextStep', () => {
    it('should advance to next step', async () => {
      const updateMock = jest.fn().mockReturnThis();
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'workflow_executions') {
          return {
            select: jest.fn().mockReturnThis(),
            update: updateMock,
            eq: jest.fn().mockImplementation(() => ({
              single: jest.fn().mockResolvedValue({
                data: {
                  current_step: 2,
                  workflow: { steps: [{}, {}, {}, {}] } // 4 steps
                },
                error: null
              }),
              then: (resolve) => resolve({ error: null })
            }))
          };
        }
        return createChainable();
      });

      const result = await engine.advanceToNextStep('exec-001');

      expect(result.completed).toBe(false);
      expect(result.nextStep).toBe(3);
    });

    it('should mark workflow as completed when all steps done', async () => {
      const updateMock = jest.fn().mockReturnThis();
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'workflow_executions') {
          return {
            select: jest.fn().mockReturnThis(),
            update: updateMock,
            eq: jest.fn().mockImplementation(() => ({
              single: jest.fn().mockResolvedValue({
                data: {
                  current_step: 4,
                  workflow: { steps: [{}, {}, {}, {}] } // 4 steps, on last one
                },
                error: null
              }),
              then: (resolve) => resolve({ error: null })
            }))
          };
        }
        return createChainable();
      });

      const result = await engine.advanceToNextStep('exec-001');

      expect(result.completed).toBe(true);
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed'
        })
      );
    });
  });
});
