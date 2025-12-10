-- ============================================================
-- INSIGHT 360 - PHASE 3: SEED CONTEXT ASSET TYPES
-- 18 Predefined Asset Types (8 Core + 10 Extended)
-- Run this AFTER phase3-complete-schema.sql
-- ============================================================

-- Clear existing types (optional - comment out if you want to preserve existing)
-- DELETE FROM context_asset_types;

-- ============================================================
-- CORE ASSET TYPES (8) - Minimum Viable for Agent Context
-- ============================================================

INSERT INTO context_asset_types (type_key, display_name, description, icon, sort_order, json_schema) VALUES

-- 1. Company Description
('company_description', 'Company Description', 'Who we are, mission, history, and vision', '🏢', 10,
'{
  "type": "object",
  "properties": {
    "company_name": {"type": "string"},
    "tagline": {"type": "string"},
    "mission": {"type": "string"},
    "vision": {"type": "string"},
    "history": {"type": "string"},
    "founding_year": {"type": "integer"},
    "headquarters": {"type": "string"},
    "team_size": {"type": "string"},
    "key_milestones": {"type": "array", "items": {"type": "string"}}
  },
  "required": ["company_name", "mission"]
}'::jsonb),

-- 2. Why We Win
('why_we_win', 'Why We Win', 'Competitive differentiation and unique value proposition', '🏆', 20,
'{
  "type": "object",
  "properties": {
    "value_proposition": {"type": "string"},
    "differentiators": {"type": "array", "items": {"type": "string"}},
    "competitive_advantages": {"type": "array", "items": {"type": "string"}},
    "proof_points": {"type": "array", "items": {"type": "string"}},
    "key_stats": {"type": "object"}
  },
  "required": ["value_proposition", "differentiators"]
}'::jsonb),

-- 3. Products
('products', 'Products & Services', 'Offerings, features, benefits, and pricing', '📦', 30,
'{
  "type": "object",
  "properties": {
    "offerings": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {"type": "string"},
          "type": {"type": "string"},
          "tagline": {"type": "string"},
          "description": {"type": "string"},
          "features": {"type": "array", "items": {"type": "string"}},
          "benefits": {"type": "array", "items": {"type": "string"}},
          "ideal_for": {"type": "array", "items": {"type": "string"}},
          "pricing_model": {"type": "string"}
        }
      }
    }
  },
  "required": ["offerings"]
}'::jsonb),

-- 4. Pain Points We Solve
('pain_points', 'Pain Points We Solve', 'Customer problems we address', '🎯', 40,
'{
  "type": "object",
  "properties": {
    "pain_points": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "problem": {"type": "string"},
          "impact": {"type": "string"},
          "our_solution": {"type": "string"},
          "outcome": {"type": "string"}
        }
      }
    }
  },
  "required": ["pain_points"]
}'::jsonb),

-- 5. VoiceDNA
('voice_dna', 'VoiceDNA', 'Brand voice, tone, style rules, and writing guidelines', '🎤', 50,
'{
  "type": "object",
  "properties": {
    "brand_name": {"type": "string"},
    "personality_traits": {"type": "array", "items": {"type": "string"}},
    "tone": {"type": "string"},
    "writing_style": {
      "type": "object",
      "properties": {
        "sentence_length": {"type": "string"},
        "vocabulary_level": {"type": "string"},
        "perspective": {"type": "string"}
      }
    },
    "do": {"type": "array", "items": {"type": "string"}},
    "dont": {"type": "array", "items": {"type": "string"}},
    "signature_phrases": {"type": "array", "items": {"type": "string"}},
    "avoid_phrases": {"type": "array", "items": {"type": "string"}}
  },
  "required": ["brand_name", "tone", "do", "dont"]
}'::jsonb),

-- 6. ICP (Ideal Customer Profile)
('icp', 'ICP (Ideal Customer Profile)', 'Target customer segments and profiles', '👤', 60,
'{
  "type": "object",
  "properties": {
    "segments": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {"type": "string"},
          "priority": {"type": "integer"},
          "demographics": {
            "type": "object",
            "properties": {
              "company_size": {"type": "string"},
              "revenue_range": {"type": "string"},
              "industries": {"type": "array", "items": {"type": "string"}},
              "geography": {"type": "string"}
            }
          },
          "psychographics": {
            "type": "object",
            "properties": {
              "values": {"type": "array", "items": {"type": "string"}},
              "motivations": {"type": "array", "items": {"type": "string"}},
              "fears": {"type": "array", "items": {"type": "string"}}
            }
          },
          "pain_points": {"type": "array", "items": {"type": "string"}},
          "goals": {"type": "array", "items": {"type": "string"}},
          "objections": {"type": "array", "items": {"type": "string"}},
          "buying_triggers": {"type": "array", "items": {"type": "string"}}
        }
      }
    }
  },
  "required": ["segments"]
}'::jsonb),

-- 7. Core Values
('core_values', 'Core Values', 'Guiding principles and organizational beliefs', '💎', 70,
'{
  "type": "object",
  "properties": {
    "values": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {"type": "string"},
          "description": {"type": "string"},
          "behaviors": {"type": "array", "items": {"type": "string"}},
          "anti_behaviors": {"type": "array", "items": {"type": "string"}}
        }
      }
    }
  },
  "required": ["values"]
}'::jsonb),

-- 8. Custom Processes
('custom_processes', 'Custom Processes', 'Internal workflows, methodologies, and procedures', '⚙️', 80,
'{
  "type": "object",
  "properties": {
    "processes": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {"type": "string"},
          "purpose": {"type": "string"},
          "steps": {"type": "array", "items": {"type": "string"}},
          "owner": {"type": "string"},
          "frequency": {"type": "string"},
          "tools_used": {"type": "array", "items": {"type": "string"}}
        }
      }
    }
  },
  "required": ["processes"]
}'::jsonb)

ON CONFLICT (type_key) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order,
    json_schema = EXCLUDED.json_schema;

-- ============================================================
-- EXTENDED ASSET TYPES (10) - Recommended for Full Context
-- ============================================================

INSERT INTO context_asset_types (type_key, display_name, description, icon, sort_order, json_schema) VALUES

-- 9. Competitors
('competitors', 'Competitors', 'Competitive landscape and analysis', '⚔️', 110,
'{
  "type": "object",
  "properties": {
    "competitors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {"type": "string"},
          "website": {"type": "string"},
          "strengths": {"type": "array", "items": {"type": "string"}},
          "weaknesses": {"type": "array", "items": {"type": "string"}},
          "positioning": {"type": "string"},
          "our_advantage": {"type": "string"}
        }
      }
    }
  }
}'::jsonb),

-- 10. Case Studies
('case_studies', 'Case Studies', 'Success stories and customer testimonials', '📖', 120,
'{
  "type": "object",
  "properties": {
    "case_studies": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {"type": "string"},
          "client_name": {"type": "string"},
          "industry": {"type": "string"},
          "challenge": {"type": "string"},
          "solution": {"type": "string"},
          "results": {"type": "array", "items": {"type": "string"}},
          "testimonial": {"type": "string"},
          "metrics": {"type": "object"}
        }
      }
    }
  }
}'::jsonb),

-- 11. FAQs
('faqs', 'FAQs', 'Common questions and objection handling', '❓', 130,
'{
  "type": "object",
  "properties": {
    "categories": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "category": {"type": "string"},
          "questions": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "question": {"type": "string"},
                "answer": {"type": "string"},
                "related_to": {"type": "array", "items": {"type": "string"}}
              }
            }
          }
        }
      }
    }
  }
}'::jsonb),

-- 12. Team Bios
('team_bios', 'Team Bios', 'Key people, expertise, and backgrounds', '👥', 140,
'{
  "type": "object",
  "properties": {
    "team_members": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {"type": "string"},
          "title": {"type": "string"},
          "role": {"type": "string"},
          "bio": {"type": "string"},
          "expertise": {"type": "array", "items": {"type": "string"}},
          "linkedin": {"type": "string"},
          "email": {"type": "string"}
        }
      }
    }
  }
}'::jsonb),

-- 13. Industry Context
('industry_context', 'Industry Context', 'Market trends, regulations, and landscape', '🌐', 150,
'{
  "type": "object",
  "properties": {
    "industry_name": {"type": "string"},
    "market_size": {"type": "string"},
    "growth_rate": {"type": "string"},
    "key_trends": {"type": "array", "items": {"type": "string"}},
    "regulations": {"type": "array", "items": {"type": "string"}},
    "challenges": {"type": "array", "items": {"type": "string"}},
    "opportunities": {"type": "array", "items": {"type": "string"}}
  }
}'::jsonb),

-- 14. Terminology
('terminology', 'Terminology', 'Domain-specific glossary and definitions', '📚', 160,
'{
  "type": "object",
  "properties": {
    "terms": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "term": {"type": "string"},
          "definition": {"type": "string"},
          "usage_example": {"type": "string"},
          "related_terms": {"type": "array", "items": {"type": "string"}}
        }
      }
    }
  }
}'::jsonb),

-- 15. Templates
('templates', 'Templates', 'Email, proposal, and content templates', '📝', 170,
'{
  "type": "object",
  "properties": {
    "templates": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {"type": "string"},
          "type": {"type": "string"},
          "purpose": {"type": "string"},
          "content": {"type": "string"},
          "variables": {"type": "array", "items": {"type": "string"}},
          "usage_notes": {"type": "string"}
        }
      }
    }
  }
}'::jsonb),

-- 16. Pricing
('pricing', 'Pricing', 'Pricing structure, packages, and terms', '💰', 180,
'{
  "type": "object",
  "properties": {
    "pricing_model": {"type": "string"},
    "currency": {"type": "string"},
    "packages": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {"type": "string"},
          "price": {"type": "string"},
          "billing_cycle": {"type": "string"},
          "features": {"type": "array", "items": {"type": "string"}},
          "ideal_for": {"type": "string"}
        }
      }
    },
    "discounts": {"type": "array", "items": {"type": "object"}},
    "terms": {"type": "string"}
  }
}'::jsonb),

-- 17. Brand Guidelines
('brand_guidelines', 'Brand Guidelines', 'Visual identity, colors, and usage rules', '🎨', 190,
'{
  "type": "object",
  "properties": {
    "logo_usage": {"type": "string"},
    "colors": {
      "type": "object",
      "properties": {
        "primary": {"type": "string"},
        "secondary": {"type": "string"},
        "accent": {"type": "string"},
        "background": {"type": "string"}
      }
    },
    "typography": {
      "type": "object",
      "properties": {
        "heading_font": {"type": "string"},
        "body_font": {"type": "string"}
      }
    },
    "imagery_style": {"type": "string"},
    "dos": {"type": "array", "items": {"type": "string"}},
    "donts": {"type": "array", "items": {"type": "string"}}
  }
}'::jsonb),

-- 18. Personas
('personas', 'Personas', 'Detailed buyer personas for targeting', '🎭', 200,
'{
  "type": "object",
  "properties": {
    "personas": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {"type": "string"},
          "role": {"type": "string"},
          "demographics": {"type": "object"},
          "goals": {"type": "array", "items": {"type": "string"}},
          "challenges": {"type": "array", "items": {"type": "string"}},
          "motivations": {"type": "array", "items": {"type": "string"}},
          "preferred_channels": {"type": "array", "items": {"type": "string"}},
          "messaging_approach": {"type": "string"},
          "content_preferences": {"type": "array", "items": {"type": "string"}}
        }
      }
    }
  }
}'::jsonb)

ON CONFLICT (type_key) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order,
    json_schema = EXCLUDED.json_schema;

-- ============================================================
-- VERIFICATION
-- ============================================================

DO $$
DECLARE
    type_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO type_count FROM context_asset_types WHERE is_active = true;
    RAISE NOTICE '✅ Context asset types seeded successfully!';
    RAISE NOTICE '   Total active types: %', type_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Core Types (8): company_description, why_we_win, products, pain_points,';
    RAISE NOTICE '                voice_dna, icp, core_values, custom_processes';
    RAISE NOTICE '';
    RAISE NOTICE 'Extended Types (10): competitors, case_studies, faqs, team_bios,';
    RAISE NOTICE '                     industry_context, terminology, templates,';
    RAISE NOTICE '                     pricing, brand_guidelines, personas';
END $$;
