-- ============================================
-- Insight 360 - Seed: Parthenon Processes
-- Version: 1.0
-- Date: December 2025
-- Description: Sample processes for AIaaS business onboarding
--              Complete customer onboarding workflow with related procedures
-- ============================================

-- Note: This script assumes departments have already been seeded

-- ============================================
-- CUSTOMER ONBOARDING MASTER WORKFLOW
-- Primary workflow coordinating all onboarding activities
-- ============================================

INSERT INTO processes (user_id, department_id, name, description, type, status, version, icon, tags, steps, inputs, outputs)
SELECT
    NULL,
    d.id,
    'Customer Onboarding Master Workflow',
    'End-to-end workflow for onboarding new AIaaS customers from contract signature to go-live',
    'workflow',
    'active',
    '2.0',
    'rocket',
    ARRAY['onboarding', 'customer-success', 'critical-path'],
    '[
      {
        "order": 1,
        "title": "Contract & Account Setup",
        "description": "Process signed contract and create customer accounts",
        "owner": "Sales Operations",
        "duration": "1 day",
        "tasks": [
          "Verify contract terms and signatures",
          "Create customer record in CRM",
          "Generate customer ID and API credentials",
          "Set up billing account",
          "Send welcome email with login credentials"
        ]
      },
      {
        "order": 2,
        "title": "Technical Discovery",
        "description": "Understand customer technical requirements and integration needs",
        "owner": "Solutions Engineer",
        "duration": "2-3 days",
        "tasks": [
          "Schedule technical discovery call",
          "Document current tech stack",
          "Identify integration requirements",
          "Assess data migration needs",
          "Define success criteria and KPIs"
        ]
      },
      {
        "order": 3,
        "title": "Environment Provisioning",
        "description": "Set up customer-specific platform environment",
        "owner": "Platform Operations",
        "duration": "1-2 days",
        "tasks": [
          "Provision dedicated tenant/workspace",
          "Configure resource limits per contract",
          "Set up SSO/authentication",
          "Enable required AI models",
          "Configure API rate limits"
        ]
      },
      {
        "order": 4,
        "title": "Integration Setup",
        "description": "Configure integrations with customer systems",
        "owner": "Solutions Engineer",
        "duration": "3-5 days",
        "tasks": [
          "Set up API connections",
          "Configure webhooks",
          "Implement data connectors",
          "Test integration endpoints",
          "Document integration architecture"
        ]
      },
      {
        "order": 5,
        "title": "Data Migration & Configuration",
        "description": "Migrate existing data and configure AI models",
        "owner": "Data Engineer",
        "duration": "3-7 days",
        "tasks": [
          "Import historical data",
          "Configure AI model parameters",
          "Set up custom prompts/workflows",
          "Validate data quality",
          "Train custom models if applicable"
        ]
      },
      {
        "order": 6,
        "title": "User Training",
        "description": "Train customer team on platform usage",
        "owner": "Customer Success Manager",
        "duration": "2-3 days",
        "tasks": [
          "Schedule training sessions",
          "Conduct admin training",
          "Conduct end-user training",
          "Provide documentation and resources",
          "Set up support channels"
        ]
      },
      {
        "order": 7,
        "title": "UAT & Go-Live",
        "description": "User acceptance testing and production launch",
        "owner": "Customer Success Manager",
        "duration": "3-5 days",
        "tasks": [
          "Execute UAT test plan",
          "Address any issues identified",
          "Obtain customer sign-off",
          "Enable production access",
          "Monitor initial usage"
        ]
      },
      {
        "order": 8,
        "title": "Post-Launch Support",
        "description": "Provide enhanced support during initial adoption period",
        "owner": "Customer Success Manager",
        "duration": "30 days",
        "tasks": [
          "Daily check-ins for first week",
          "Weekly check-ins for first month",
          "Monitor adoption metrics",
          "Address questions and issues",
          "Schedule 30-day review meeting"
        ]
      }
    ]'::jsonb,
    '[
      {"name": "Signed Contract", "required": true},
      {"name": "Customer Contact Information", "required": true},
      {"name": "Technical Requirements Document", "required": false},
      {"name": "Existing Data Export", "required": false}
    ]'::jsonb,
    '[
      {"name": "Active Customer Account", "type": "deliverable"},
      {"name": "Configured Platform Environment", "type": "deliverable"},
      {"name": "Trained Users", "type": "deliverable"},
      {"name": "Onboarding Completion Report", "type": "document"}
    ]'::jsonb
FROM departments d WHERE d.name = 'Service' AND d.is_active = true;

-- ============================================
-- TECHNICAL DISCOVERY PROCEDURE
-- ============================================

INSERT INTO processes (user_id, department_id, name, description, type, status, version, icon, tags, steps, inputs, outputs)
SELECT
    NULL,
    d.id,
    'Technical Discovery Procedure',
    'Standard procedure for conducting technical discovery with new customers',
    'procedure',
    'active',
    '1.2',
    'search',
    ARRAY['onboarding', 'technical', 'discovery'],
    '[
      {
        "order": 1,
        "title": "Pre-Call Preparation",
        "description": "Prepare for the discovery call",
        "tasks": [
          "Review contract and use case",
          "Research customer industry",
          "Prepare discovery questionnaire",
          "Set up demo environment"
        ]
      },
      {
        "order": 2,
        "title": "Current State Assessment",
        "description": "Understand customer''s current technology landscape",
        "questions": [
          "What systems will integrate with our platform?",
          "What is your current data infrastructure?",
          "What authentication system do you use (SSO)?",
          "What are your security and compliance requirements?"
        ]
      },
      {
        "order": 3,
        "title": "Use Case Deep Dive",
        "description": "Understand specific AI use cases",
        "questions": [
          "What problems are you trying to solve with AI?",
          "What does success look like for your team?",
          "What volume of requests do you anticipate?",
          "What response time requirements do you have?"
        ]
      },
      {
        "order": 4,
        "title": "Integration Requirements",
        "description": "Document integration needs",
        "tasks": [
          "Identify source systems",
          "Document API requirements",
          "Map data flows",
          "Identify authentication needs"
        ]
      },
      {
        "order": 5,
        "title": "Documentation & Handoff",
        "description": "Document findings and create implementation plan",
        "tasks": [
          "Complete Technical Requirements Document",
          "Create integration architecture diagram",
          "Estimate implementation timeline",
          "Schedule follow-up with implementation team"
        ]
      }
    ]'::jsonb,
    '[
      {"name": "Customer Contract", "required": true},
      {"name": "Initial Use Case Description", "required": true}
    ]'::jsonb,
    '[
      {"name": "Technical Requirements Document", "type": "document"},
      {"name": "Integration Architecture Diagram", "type": "diagram"},
      {"name": "Implementation Timeline", "type": "plan"}
    ]'::jsonb
FROM departments d WHERE d.name = 'Production' AND d.is_active = true;

-- ============================================
-- ENVIRONMENT PROVISIONING CHECKLIST
-- ============================================

INSERT INTO processes (user_id, department_id, name, description, type, status, version, icon, tags, steps, inputs, outputs)
SELECT
    NULL,
    d.id,
    'Environment Provisioning Checklist',
    'Checklist for provisioning new customer environments on the AIaaS platform',
    'checklist',
    'active',
    '1.5',
    'server',
    ARRAY['onboarding', 'operations', 'provisioning'],
    '[
      {
        "order": 1,
        "title": "Tenant Creation",
        "items": [
          {"task": "Create tenant in platform admin", "required": true},
          {"task": "Generate tenant UUID", "required": true},
          {"task": "Set tenant display name", "required": true},
          {"task": "Configure tenant timezone", "required": false}
        ]
      },
      {
        "order": 2,
        "title": "Resource Configuration",
        "items": [
          {"task": "Set API rate limits per contract tier", "required": true},
          {"task": "Configure token allocation", "required": true},
          {"task": "Set concurrent request limits", "required": true},
          {"task": "Enable/disable premium features", "required": true}
        ]
      },
      {
        "order": 3,
        "title": "Authentication Setup",
        "items": [
          {"task": "Create admin user account", "required": true},
          {"task": "Configure SSO if applicable", "required": false},
          {"task": "Set password policies", "required": true},
          {"task": "Enable MFA", "required": true},
          {"task": "Generate API keys", "required": true}
        ]
      },
      {
        "order": 4,
        "title": "AI Model Configuration",
        "items": [
          {"task": "Enable contracted AI models", "required": true},
          {"task": "Set model-specific rate limits", "required": true},
          {"task": "Configure default model parameters", "required": false},
          {"task": "Set up model fallback hierarchy", "required": false}
        ]
      },
      {
        "order": 5,
        "title": "Security & Compliance",
        "items": [
          {"task": "Configure data retention policies", "required": true},
          {"task": "Set up audit logging", "required": true},
          {"task": "Configure IP allowlisting if required", "required": false},
          {"task": "Enable data encryption settings", "required": true}
        ]
      },
      {
        "order": 6,
        "title": "Verification",
        "items": [
          {"task": "Test admin login", "required": true},
          {"task": "Verify API authentication", "required": true},
          {"task": "Test AI model access", "required": true},
          {"task": "Verify rate limiting", "required": true},
          {"task": "Document environment details", "required": true}
        ]
      }
    ]'::jsonb,
    '[
      {"name": "Customer Contract (tier info)", "required": true},
      {"name": "Technical Requirements Document", "required": true},
      {"name": "Admin Contact Information", "required": true}
    ]'::jsonb,
    '[
      {"name": "Provisioned Environment", "type": "deliverable"},
      {"name": "Admin Credentials", "type": "credentials"},
      {"name": "API Keys", "type": "credentials"},
      {"name": "Environment Documentation", "type": "document"}
    ]'::jsonb
FROM departments d WHERE d.name = 'Operations' AND d.is_active = true;

-- ============================================
-- API INTEGRATION STANDARD
-- ============================================

INSERT INTO processes (user_id, department_id, name, description, type, status, version, icon, tags, steps, inputs, outputs)
SELECT
    NULL,
    d.id,
    'API Integration Standard',
    'Standard for implementing customer API integrations with the AIaaS platform',
    'standard',
    'active',
    '2.1',
    'plug',
    ARRAY['integration', 'api', 'technical', 'standard'],
    '[
      {
        "order": 1,
        "title": "Authentication",
        "requirements": [
          "All API calls must use Bearer token authentication",
          "API keys must be rotated every 90 days",
          "Failed auth attempts must be logged",
          "Rate limiting must be enforced per API key"
        ]
      },
      {
        "order": 2,
        "title": "Request Format",
        "requirements": [
          "All requests must use JSON content type",
          "Request body must include required fields as per API spec",
          "Maximum request size: 10MB",
          "Timeout: 30 seconds for standard requests, 120 seconds for async"
        ]
      },
      {
        "order": 3,
        "title": "Response Handling",
        "requirements": [
          "Implement exponential backoff for rate limit errors (429)",
          "Handle all documented error codes",
          "Parse and validate response schema",
          "Log all API responses for debugging"
        ]
      },
      {
        "order": 4,
        "title": "Error Handling",
        "requirements": [
          "Implement retry logic for transient errors (5xx)",
          "Do not retry client errors (4xx)",
          "Maximum 3 retries with exponential backoff",
          "Alert on repeated failures"
        ]
      },
      {
        "order": 5,
        "title": "Webhook Integration",
        "requirements": [
          "Webhook endpoints must use HTTPS",
          "Verify webhook signatures",
          "Respond within 5 seconds",
          "Implement idempotency for webhook processing"
        ]
      },
      {
        "order": 6,
        "title": "Security Requirements",
        "requirements": [
          "Never log sensitive data (API keys, PII)",
          "Use TLS 1.2 or higher",
          "Store credentials in secure vault",
          "Implement request signing for sensitive operations"
        ]
      }
    ]'::jsonb,
    '[
      {"name": "API Documentation", "required": true},
      {"name": "Customer Technical Requirements", "required": true}
    ]'::jsonb,
    '[
      {"name": "Integration Implementation", "type": "deliverable"},
      {"name": "Integration Test Results", "type": "document"}
    ]'::jsonb
FROM departments d WHERE d.name = 'Production' AND d.is_active = true;

-- ============================================
-- CUSTOMER TRAINING PROCEDURE
-- ============================================

INSERT INTO processes (user_id, department_id, name, description, type, status, version, icon, tags, steps, inputs, outputs)
SELECT
    NULL,
    d.id,
    'Customer Training Procedure',
    'Standard procedure for conducting customer training during onboarding',
    'procedure',
    'active',
    '1.3',
    'graduation-cap',
    ARRAY['onboarding', 'training', 'customer-success'],
    '[
      {
        "order": 1,
        "title": "Training Preparation",
        "description": "Prepare training materials and environment",
        "tasks": [
          "Review customer use cases and configuration",
          "Customize training materials for customer",
          "Set up training environment with sample data",
          "Schedule training sessions with appropriate attendees",
          "Send calendar invites with pre-requisites"
        ]
      },
      {
        "order": 2,
        "title": "Admin Training (2 hours)",
        "description": "Train customer administrators",
        "topics": [
          "Platform overview and architecture",
          "User management and permissions",
          "API key management",
          "Usage monitoring and billing",
          "Security settings and best practices"
        ]
      },
      {
        "order": 3,
        "title": "End User Training (2 hours)",
        "description": "Train end users on platform features",
        "topics": [
          "Platform navigation and interface",
          "Creating and managing AI workflows",
          "Using AI assistants and chat",
          "Best practices for AI prompts",
          "Common troubleshooting"
        ]
      },
      {
        "order": 4,
        "title": "Advanced Features Training (optional)",
        "description": "Deep dive into advanced platform capabilities",
        "topics": [
          "Custom AI model configuration",
          "Advanced integrations",
          "Workflow automation",
          "Analytics and reporting",
          "API usage for developers"
        ]
      },
      {
        "order": 5,
        "title": "Hands-On Practice",
        "description": "Guided practice with real scenarios",
        "tasks": [
          "Walk through 3-5 common use cases",
          "Have users complete tasks independently",
          "Answer questions and provide tips",
          "Document any custom requirements"
        ]
      },
      {
        "order": 6,
        "title": "Training Completion",
        "description": "Wrap up and provide resources",
        "tasks": [
          "Share documentation and help resources",
          "Provide recorded session links",
          "Set up ongoing support channels",
          "Schedule follow-up Q&A session",
          "Document training completion in CRM"
        ]
      }
    ]'::jsonb,
    '[
      {"name": "Provisioned Customer Environment", "required": true},
      {"name": "Customer Use Cases", "required": true},
      {"name": "Training Attendee List", "required": true}
    ]'::jsonb,
    '[
      {"name": "Trained Customer Users", "type": "deliverable"},
      {"name": "Training Completion Record", "type": "document"},
      {"name": "Customer Feedback", "type": "feedback"}
    ]'::jsonb
FROM departments d WHERE d.name = 'Service' AND d.is_active = true;

-- ============================================
-- DATA SECURITY POLICY
-- ============================================

INSERT INTO processes (user_id, department_id, name, description, type, status, version, icon, tags, steps, inputs, outputs)
SELECT
    NULL,
    d.id,
    'Customer Data Security Policy',
    'Policy governing the handling and protection of customer data in the AIaaS platform',
    'policy',
    'active',
    '3.0',
    'shield',
    ARRAY['security', 'compliance', 'policy', 'data'],
    '[
      {
        "order": 1,
        "title": "Data Classification",
        "requirements": [
          "All customer data is classified as Confidential by default",
          "PII must be identified and tagged appropriately",
          "Data classification must be reviewed quarterly"
        ]
      },
      {
        "order": 2,
        "title": "Data Storage",
        "requirements": [
          "All data at rest must be encrypted using AES-256",
          "Customer data must be isolated at the tenant level",
          "Data must be stored in SOC 2 compliant data centers",
          "Geographic data residency requirements must be honored"
        ]
      },
      {
        "order": 3,
        "title": "Data Transmission",
        "requirements": [
          "All data in transit must use TLS 1.2 or higher",
          "API keys must never be transmitted in URL parameters",
          "Webhook payloads must be signed"
        ]
      },
      {
        "order": 4,
        "title": "Data Retention",
        "requirements": [
          "Default retention period is 90 days for logs",
          "Customer data retained per contract terms",
          "Data must be securely deleted upon customer request",
          "Deletion must be verified and documented"
        ]
      },
      {
        "order": 5,
        "title": "Access Control",
        "requirements": [
          "Access follows principle of least privilege",
          "All access must be authenticated and authorized",
          "Admin access requires MFA",
          "Access logs must be retained for 1 year"
        ]
      },
      {
        "order": 6,
        "title": "Incident Response",
        "requirements": [
          "Security incidents must be reported within 1 hour",
          "Customer notification within 72 hours for breaches",
          "Post-incident review required within 5 business days",
          "Document all incidents in security log"
        ]
      }
    ]'::jsonb,
    '[]'::jsonb,
    '[
      {"name": "Compliant Data Handling", "type": "compliance"}
    ]'::jsonb
FROM departments d WHERE d.name = 'Operations' AND d.is_active = true;

-- ============================================
-- GO-LIVE CHECKLIST
-- ============================================

INSERT INTO processes (user_id, department_id, name, description, type, status, version, icon, tags, steps, inputs, outputs)
SELECT
    NULL,
    d.id,
    'Customer Go-Live Checklist',
    'Final checklist before enabling production access for new customers',
    'checklist',
    'active',
    '1.4',
    'check-circle',
    ARRAY['onboarding', 'go-live', 'checklist'],
    '[
      {
        "order": 1,
        "title": "Technical Readiness",
        "items": [
          {"task": "All integrations tested and working", "required": true},
          {"task": "Data migration completed and verified", "required": true},
          {"task": "Performance testing completed", "required": true},
          {"task": "Security review completed", "required": true},
          {"task": "Backup and recovery tested", "required": true}
        ]
      },
      {
        "order": 2,
        "title": "Configuration Verification",
        "items": [
          {"task": "AI models configured correctly", "required": true},
          {"task": "Rate limits set per contract", "required": true},
          {"task": "User roles and permissions configured", "required": true},
          {"task": "Billing integration verified", "required": true},
          {"task": "Monitoring and alerts configured", "required": true}
        ]
      },
      {
        "order": 3,
        "title": "User Readiness",
        "items": [
          {"task": "Admin training completed", "required": true},
          {"task": "End user training completed", "required": true},
          {"task": "Documentation provided", "required": true},
          {"task": "Support contacts established", "required": true}
        ]
      },
      {
        "order": 4,
        "title": "Business Readiness",
        "items": [
          {"task": "Contract fully executed", "required": true},
          {"task": "Customer success manager assigned", "required": true},
          {"task": "Success metrics defined", "required": true},
          {"task": "Escalation path documented", "required": true}
        ]
      },
      {
        "order": 5,
        "title": "Sign-Off",
        "items": [
          {"task": "Customer UAT sign-off obtained", "required": true},
          {"task": "Internal go-live approval obtained", "required": true},
          {"task": "Go-live date confirmed with customer", "required": true},
          {"task": "Post-launch support plan in place", "required": true}
        ]
      }
    ]'::jsonb,
    '[
      {"name": "UAT Test Results", "required": true},
      {"name": "Training Completion Records", "required": true},
      {"name": "Technical Requirements Document", "required": true}
    ]'::jsonb,
    '[
      {"name": "Go-Live Approval", "type": "approval"},
      {"name": "Production Access Enabled", "type": "deliverable"}
    ]'::jsonb
FROM departments d WHERE d.name = 'Service' AND d.is_active = true;

-- ============================================
-- CUSTOMER ESCALATION PROCEDURE
-- ============================================

INSERT INTO processes (user_id, department_id, name, description, type, status, version, icon, tags, steps, inputs, outputs)
SELECT
    NULL,
    d.id,
    'Customer Escalation Procedure',
    'Standard procedure for handling customer escalations and critical issues',
    'procedure',
    'active',
    '2.0',
    'alert-triangle',
    ARRAY['support', 'escalation', 'customer-success'],
    '[
      {
        "order": 1,
        "title": "Escalation Triggers",
        "description": "Conditions that require escalation",
        "triggers": [
          "P1: Complete service outage affecting customer",
          "P2: Major feature not working, workaround available",
          "P3: Customer explicitly requests escalation",
          "P4: Issue unresolved after 48 hours",
          "P5: Customer churn risk identified"
        ]
      },
      {
        "order": 2,
        "title": "Initial Response",
        "description": "Immediate actions upon escalation",
        "tasks": [
          "Acknowledge escalation within 15 minutes (P1) / 1 hour (P2-P5)",
          "Assign dedicated owner to the escalation",
          "Create escalation ticket with all details",
          "Notify relevant stakeholders"
        ]
      },
      {
        "order": 3,
        "title": "Investigation",
        "description": "Investigate and diagnose the issue",
        "tasks": [
          "Gather all relevant information and logs",
          "Reproduce the issue if possible",
          "Identify root cause",
          "Document findings"
        ]
      },
      {
        "order": 4,
        "title": "Resolution",
        "description": "Resolve the escalation",
        "tasks": [
          "Implement fix or workaround",
          "Verify resolution with customer",
          "Document resolution steps",
          "Update customer on status"
        ]
      },
      {
        "order": 5,
        "title": "Communication Cadence",
        "description": "Customer communication requirements",
        "requirements": [
          "P1: Updates every 30 minutes until resolved",
          "P2: Updates every 2 hours",
          "P3-P5: Daily updates until resolved"
        ]
      },
      {
        "order": 6,
        "title": "Post-Escalation Review",
        "description": "Review and learn from the escalation",
        "tasks": [
          "Conduct post-mortem within 5 business days",
          "Document lessons learned",
          "Identify preventive measures",
          "Share learnings with team"
        ]
      }
    ]'::jsonb,
    '[
      {"name": "Escalation Details", "required": true},
      {"name": "Customer Account Information", "required": true},
      {"name": "Issue Reproduction Steps", "required": false}
    ]'::jsonb,
    '[
      {"name": "Resolved Escalation", "type": "deliverable"},
      {"name": "Post-Mortem Document", "type": "document"},
      {"name": "Customer Satisfaction Confirmation", "type": "feedback"}
    ]'::jsonb
FROM departments d WHERE d.name = 'Service' AND d.is_active = true;
