# Insight 360 Pricing Strategy

**Version:** 2.0 | **Date:** Wednesday, January 29, 2026 | **Classification:** Internal - Confidential

---

## Executive Summary

This document outlines the comprehensive pricing strategy for Insight 360 across three primary sales channels:

1. **Direct Sales** - Enterprise customers purchasing directly
2. **Partner Sales** - Technology and consulting partners reselling
3. **Agency Sales** - Consulting firms and agencies using i360 to serve their clients

The strategy balances **value capture**, **market penetration**, and **channel economics** to maximize revenue while ensuring sustainable growth.

---

## Pricing Philosophy

### Core Principles

| Principle | Application |
|-----------|-------------|
| **Value-Based Pricing** | Price reflects business outcomes, not just features |
| **Scalable Economics** | Pricing grows with customer success |
| **Channel Parity** | Fair margins across all sales channels |
| **Simplicity** | Easy to understand, quote, and compare |
| **Flexibility** | Accommodate various buying patterns |

### Pricing Anchors

- **AI Maturity Assessment value:** $15,000-50,000 equivalent (consulting benchmark)
- **Strategic planning software:** $500-2,000/user/month (enterprise benchmark)
- **AI platform subscriptions:** $100-500/user/month (market benchmark)

---

## Product Packaging

### Tier Structure (Implemented)

| Tier | Sort | Monthly | Annual | Members | Clients | Agents | Workflows |
|------|:----:|--------:|-------:|--------:|--------:|-------:|----------:|
| **Starter** | 1 | $29 | $290 | 3 | 0 | 5 | 3 |
| **Business** | 2 | $99 | $990 | 10 | 0 | 25 | 15 |
| **Enterprise** | 3 | $299 | $2,990 | 100 | 0 | 100 | 50 |
| **Agency** | 4 | $499 | $4,990 | 50 | 100 | 200 | 100 |

> **Note:** These are the base platform prices implemented in `subscription_tiers`. The aspirational pricing in the Direct Sales and Agency Sales sections below represents target pricing for the go-to-market launch, which may differ from the database-seeded defaults.

---

## Channel 1: Direct Sales

### Pricing Table - Direct Customers

#### Starter Plan
**Target:** Small teams, departments, AI exploration

| Component | Included |
|-----------|----------|
| **Users** | Up to 3 |
| **AI Models** | Claude Haiku, GPT-4o Mini |
| **Context Assets** | 25 |
| **Agents** | 5 pre-built |
| **Skills** | 10 |
| **Workflows** | 3 |
| **Research Studios** | 1 |
| **API Calls** | 500/month |
| **Storage** | 1 GB |
| **Support** | Email (business hours) |
| **Integrations** | Not available |

**Pricing (Implemented):**
- Monthly: **$29/month**
- Annual: **$290/year** ($24.17/month)

**Target Launch Pricing:**
- Monthly: **$299/month**
- Annual: **$249/month** (billed annually, 17% savings)

---

#### Business Plan
**Target:** Growing teams, mid-size companies, full transformation journey

| Component | Included |
|-----------|----------|
| **Users** | Up to 10 |
| **AI Models** | All Claude, GPT-4o, Gemini |
| **Context Assets** | 150 |
| **Agents** | 25 (full library) |
| **Skills** | 50 |
| **Workflows** | 15 |
| **Align 120** | Full access |
| **Strategy 120** | Full access |
| **Execute 120** | Full access |
| **Research Studios** | 5 |
| **Briefings** | Daily automated |
| **API Calls** | 5,000/month |
| **Storage** | 10 GB |
| **Custom Branding** | Yes |
| **API Access** | Yes |
| **Advanced Analytics** | Yes |
| **Support** | Priority email + chat |

**Pricing (Implemented):**
- Monthly: **$99/month**
- Annual: **$990/year** ($82.50/month)

**Target Launch Pricing:**
- Monthly: **$999/month**
- Annual: **$799/month** (billed annually, 20% savings)

**Add-ons:**
- Additional users: $25/user/month
- Additional departments: $100/dept/month
- Premium models (Opus): $200/month
- Productivity integrations (Google Workspace): $49/month
- Client system integrations (CRM): $149/month

---

#### Enterprise Plan
**Target:** Large organizations, enterprise-wide deployment

| Component | Included |
|-----------|----------|
| **Users** | Up to 100 |
| **AI Models** | All models including Opus 4.5 |
| **Context Assets** | 500 |
| **Agents** | 100 (full library + custom) |
| **Skills** | 200 |
| **Workflows** | 50 + custom development |
| **All 120 Modules** | Full access, all features |
| **Parthenon Governance** | Full organizational modeling |
| **Integrity Monitoring** | Complete dashboard |
| **Research Studios** | 20 |
| **Thought Leadership** | Full platform |
| **API Calls** | 50,000/month |
| **Storage** | 100 GB |
| **API Access** | Full API with rate limits |
| **SSO/SAML** | Included |
| **Custom Branding** | Yes |
| **Advanced Analytics** | Yes |
| **Priority Support** | Yes |
| **Audit Logging** | Advanced compliance |
| **Data Residency** | Region selection |
| **Support** | 24/7 + dedicated CSM |
| **Training** | Custom training program |
| **SLA** | 99.9% uptime guarantee |

**Pricing (Implemented):**
- Monthly: **$299/month**
- Annual: **$2,990/year** ($249.17/month)

**Target Launch Pricing:**
- Starting at **$3,500/month** (annual commitment)
- Custom pricing based on:
  - Number of departments
  - API usage volume
  - Custom development needs
  - Support requirements

**Integration Add-Ons:**
- Productivity integrations (Google Workspace): $99/month (25K API calls, 50 users)
- Client system integrations (CRM): $299/month (100K API calls, 100 users)

**Typical Enterprise Deal:** $50,000 - $250,000 ARR

---

### Direct Sales - Add-On Services

| Service | Price | Description |
|---------|-------|-------------|
| **Implementation Package** | $5,000 - $15,000 | Guided setup, data migration, training |
| **Custom Agent Development** | $2,500/agent | Bespoke agent creation |
| **Custom Workflow Development** | $1,500/workflow | Complex workflow automation |
| **Context Library Setup** | $3,000 - $10,000 | Full context asset population |
| **Executive Training** | $2,500/session | Leadership alignment workshop |
| **Custom Integration Build** | $2,500 setup + $199/month | Custom provider development |

### Integration Add-Ons (Implemented)

Integrations are billable add-ons gated by subscription tier. Pricing is admin-configurable per tier via the Platform Admin tier setup page.

| Add-On Category | Starter | Business | Enterprise | Agency |
|-----------------|:-------:|:--------:|:----------:|:------:|
| **Productivity** (Google Workspace, Microsoft 365, Slack) | — | $49/mo | $99/mo | $99/mo |
| **Client Systems** (Salesforce, HubSpot, CRM) | — | $149/mo | $299/mo | $299/mo |
| **API Call Limit (Productivity)** | — | 5,000 | 25,000 | 50,000 |
| **API Call Limit (Client Systems)** | — | 10,000 | 100,000 | 200,000 |
| **User Limit (Productivity)** | — | 5 | 50 | 50 |
| **User Limit (Client Systems)** | — | 10 | 100 | 200 |

**Per-Provider Base Pricing (from provider registry):**

| Provider | Category | Base Price | Auth | Status |
|----------|----------|-----------|------|--------|
| Google Workspace | Productivity | $99/mo | OAuth2 | Active |
| Microsoft 365 | Productivity | $99/mo | OAuth2 | Beta |
| Slack | Communication | $99/mo | OAuth2 | Beta |
| Salesforce | CRM | $299/mo | OAuth2 | Active |
| HubSpot | CRM | $299/mo | OAuth2 | Active |
| EspoCRM | CRM | Free | API Key | Active (internal) |
| Strapi CMS | CMS | Free | API Key | Active (internal) |

---

### Direct Sales Metrics & Economics

| Metric | Target |
|--------|--------|
| **ACV (Avg Contract Value)** | $15,000 - $75,000 |
| **CAC (Customer Acquisition Cost)** | $3,000 - $8,000 |
| **LTV:CAC Ratio** | 5:1 minimum |
| **Gross Margin** | 75-80% |
| **Net Revenue Retention** | 120%+ |
| **Sales Cycle** | 30-90 days |

---

## Channel 2: Partner Sales

### Partner Types

| Type | Description | Economics |
|------|-------------|-----------|
| **Technology Partners** | ISVs embedding i360 capabilities | Revenue share |
| **Solution Partners** | SI/consultants implementing i360 | Reseller margin |
| **Referral Partners** | Lead generators | Commission |
| **OEM Partners** | White-label licensing | Platform fee |

---

### Solution Partner Program

#### Partner Tiers

| Tier | Requirements | Discount | Benefits |
|------|--------------|----------|----------|
| **Registered** | Signed agreement | 10% | Deal registration, portal access |
| **Silver** | 2 certified, $50K revenue | 20% | Co-marketing, leads |
| **Gold** | 5 certified, $200K revenue | 30% | Dedicated PAM, MDF |
| **Platinum** | 10 certified, $500K revenue | 35% | Executive sponsor, roadmap input |

#### Partner Pricing (Off List)

**Business Plan - Partner Sell:**
- List: $999/month
- Silver: $799/month (20% off) → Partner sells at $899-999
- Gold: $699/month (30% off) → Partner sells at $849-999
- Platinum: $649/month (35% off) → Partner sells at $799-999

**Enterprise Plan - Partner Sell:**
- List: Starting $3,500/month
- Partner discount: 25-40% based on tier
- Partner expected margin: 15-30%

#### Partner Services Revenue

Partners can deliver and retain 100% of:
- Implementation services
- Training and enablement
- Custom development
- Ongoing managed services
- Strategic consulting

**Typical Partner Deal Economics:**
| Component | Partner Revenue |
|-----------|-----------------|
| Software (30% margin) | $12,000/year |
| Implementation | $8,000 |
| Training | $3,000 |
| Ongoing Services | $24,000/year |
| **Total Year 1** | **$47,000** |
| **Total Year 2+** | **$36,000/year** |

---

### Technology Partner Program

#### Integration Partners
Partners integrating their products with i360:

| Integration Level | Fee | Benefits |
|-------------------|-----|----------|
| **Basic** | Free | API access, documentation |
| **Certified** | $5,000/year | Listing in marketplace, co-marketing |
| **Premier** | $25,000/year | Joint development, priority support |

#### OEM/Embedded Partners
Partners embedding i360 capabilities in their products:

| Model | Pricing |
|-------|---------|
| **API Consumption** | $0.01-0.05 per API call |
| **User-Based** | $10-25/user/month (volume discounts) |
| **Revenue Share** | 20-30% of attributed revenue |
| **Platform License** | Custom negotiated |

---

### Referral Partner Program

| Referral Type | Commission |
|---------------|------------|
| **Qualified Lead** | $250 per qualified lead |
| **Closed Deal** | 10% of first year ACV |
| **Strategic Account** | 15% of first year ACV |

**Commission Caps:** $15,000 per deal
**Payment Terms:** Paid after customer's first payment clears

---

### Partner Sales Metrics

| Metric | Target |
|--------|--------|
| **Partner-Sourced Revenue** | 40% of total |
| **Average Partner Margin** | 25% |
| **Partner Retention Rate** | 85% |
| **Deals per Active Partner** | 4/year |
| **Partner Certification Rate** | 80% |

---

## Channel 3: Agency Sales

### Agency Model Overview

The Agency tier enables consulting firms, digital agencies, and advisory practices to use Insight 360 to serve their own clients at scale.

### Agency Pricing Structure (Implemented)

The Agency tier is a single implemented tier with the highest resource limits and full white-label capabilities. Manual approval is required (no self-upgrade).

| Component | Included |
|-----------|----------|
| **Agency Users** | Up to 50 |
| **Client Organizations** | Up to 100 |
| **Client Portal Users** | Unlimited |
| **Agents** | 200 |
| **Skills** | 500 |
| **Workflows** | 100 |
| **Context Assets** | 1,000 |
| **Research Studios** | 50 |
| **API Calls** | 100,000/month |
| **Storage** | 500 GB |
| **White-Label** | Full branding |
| **Custom Branding** | Yes |
| **API Access** | Full programmatic access |
| **SSO** | Yes |
| **Priority Support** | Yes |
| **Advanced Analytics** | Yes |
| **Client Portal** | Full customization |
| **All Modules** | Full platform |

**Pricing (Implemented):**
- Monthly: **$499/month**
- Annual: **$4,990/year** ($415.83/month)

**Integration Add-Ons:**
- Productivity integrations: $99/month (50K API calls, 50 users)
- Client system integrations: $299/month (200K API calls, 200 users)

**Target Launch Pricing (aspirational sub-tiers):**

| Sub-Tier | Target | Price | Clients |
|----------|--------|-------|---------|
| Agency Starter | Solo practitioners | $499/mo | Up to 5 |
| Agency Professional | Regional consultancies | $1,499/mo | Up to 25 |
| Agency Enterprise | National/global firms | $4,999/mo | Unlimited |

---

### Agency Revenue Model

#### Client Billing Options

Agencies can bill their clients using various models:

**Model 1: Per-Assessment Pricing**
| Assessment Type | Suggested Client Price | Agency Cost |
|-----------------|----------------------|-------------|
| Align 120 Basic | $5,000 - $10,000 | ~$150/client/month |
| Align 120 + Strategy | $15,000 - $25,000 | ~$150/client/month |
| Full Transformation | $25,000 - $50,000 | ~$150/client/month |

**Model 2: Retainer-Based**
| Service Level | Suggested Monthly | Agency Cost |
|---------------|-------------------|-------------|
| Monitoring Only | $500 - $1,000 | $50-75/client |
| Active Advisory | $2,500 - $5,000 | $50-75/client |
| Strategic Partnership | $10,000+ | $50-75/client |

**Model 3: Outcome-Based**
- Percentage of documented AI cost savings
- Percentage of efficiency gains
- Success fee on transformation milestones

---

### Agency Economics Example

**Scenario:** Mid-size agency with 20 clients

| Item | Monthly | Annual |
|------|---------|--------|
| **Platform Cost (Agency tier)** | $499 | $4,990 |
| **CRM Integration Add-On** | $299 | $3,588 |
| **Productivity Integration Add-On** | $99 | $1,188 |
| **Total Platform Cost** | $897 | $9,766 |
| **Average Revenue per Client** | $3,000 | $36,000 |
| **Total Client Revenue (20)** | $60,000 | $720,000 |
| **Gross Margin** | 98.5% | 98.6% |
| **Net Profit on Platform** | $59,103 | $710,234 |

**Key Insight:** Platform cost is ~1.5% of potential client revenue, enabling 65x+ margin on software costs at implemented pricing.

---

### Agency Value-Add Services

Agencies can deliver (and fully retain revenue from):

| Service | Typical Pricing |
|---------|-----------------|
| **AI Strategy Workshop** | $5,000 - $15,000 |
| **Full Align 120 Facilitation** | $10,000 - $25,000 |
| **Strategy 120 Planning** | $15,000 - $50,000 |
| **Execute 120 Implementation** | $25,000 - $100,000 |
| **Ongoing AI Advisory** | $2,500 - $10,000/month |
| **Training & Enablement** | $500 - $2,000/participant |
| **Custom Report Development** | $2,500 - $7,500 |
| **Integration Services** | $5,000 - $25,000 |

---

### Agency Certification Program

| Level | Requirements | Benefits |
|-------|--------------|----------|
| **Certified Practitioner** | 8-hour course, exam | Use i360 badge, basic materials |
| **Certified Consultant** | 24-hour course, case study | Co-branded materials, referrals |
| **Certified Partner** | 40+ hours, client references | Premier listing, joint marketing |

**Certification Pricing:**
- Practitioner: $500/person
- Consultant: $1,500/person
- Partner: $3,500/firm + $500/person

---

### Agency Sales Metrics

| Metric | Target |
|--------|--------|
| **Agency ACV** | $25,000 - $100,000 |
| **Clients per Agency** | 15-50 |
| **Agency Retention** | 90% |
| **Client Portal Adoption** | 70% |
| **Expansion Rate** | 30% YoY |

---

## Pricing Governance

### Discounting Authority

| Discount Level | Approval Required |
|----------------|-------------------|
| 0-10% | Sales Rep |
| 11-20% | Sales Manager |
| 21-30% | VP Sales |
| 31%+ | CEO/CFO |

### Discount Justifications

| Reason | Max Discount |
|--------|--------------|
| Multi-year commitment (2 yr) | 10% |
| Multi-year commitment (3 yr) | 15% |
| Non-profit/Education | 25% |
| Strategic reference customer | 20% |
| Competitive displacement | 15% |
| Volume (50+ users) | 15% |
| Early adopter (first 50 customers) | 20% |

### Price Increase Policy

- Annual price increases: Up to 5% with 60-day notice
- Grandfathering: 12 months at original price for renewals
- New features: May be priced separately or included in tier upgrades

---

## Promotional Pricing

### Launch Offers

| Offer | Terms | Duration |
|-------|-------|----------|
| **Founder's Rate** | 40% off first year | First 50 customers |
| **Annual Commitment** | 20% off monthly rate | Ongoing |
| **Agency Launch** | First 3 clients free | First 6 months |

### Seasonal Promotions

| Period | Offer |
|--------|-------|
| Q4 (Budget Season) | Free implementation ($5K value) |
| Q1 (Planning Season) | Strategy 120 workshop included |
| Trial Extensions | 30-day trial → 45 days |

---

## Competitive Positioning

### Price vs. Value Matrix

| Competitor Type | Their Pricing | Our Position |
|-----------------|---------------|--------------|
| Generic AI (ChatGPT Teams) | $25-30/user/month | 3-5x price, 10x+ value |
| AI Platforms (Jasper) | $100-500/user/month | Similar price, broader capability |
| Consulting Tools | $1,000-5,000/user/month | Lower price, comparable depth |
| Custom Development | $100,000+ implementation | 5-10x lower TCO |

### Objection Handling

**"It's expensive"**
→ Total value of Align 120 assessment alone equals $15-50K in consulting equivalent. Platform pays for itself in first assessment.

**"We can use ChatGPT"**
→ ChatGPT lacks organizational context, governance, strategic frameworks, and multi-user management. Time spent on prompt engineering and context management exceeds i360 cost.

**"We'll build our own"**
→ i360 represents 3+ years and $2M+ in development. Build vs. buy analysis strongly favors platform adoption.

---

## Revenue Projections

### Year 1 Targets (by channel)

| Channel | Customers | ACV | Revenue |
|---------|-----------|-----|---------|
| Direct (Starter) | 100 | $3,000 | $300,000 |
| Direct (Professional) | 50 | $12,000 | $600,000 |
| Direct (Enterprise) | 10 | $75,000 | $750,000 |
| Partner-Sourced | 40 | $20,000 | $800,000 |
| Agency | 25 | $40,000 | $1,000,000 |
| **Total** | **225** | | **$3,450,000** |

### Year 3 Projections

| Channel | Customers | ACV | Revenue |
|---------|-----------|-----|---------|
| Direct | 500 | $15,000 | $7,500,000 |
| Partner | 300 | $20,000 | $6,000,000 |
| Agency | 150 | $50,000 | $7,500,000 |
| **Total** | **950** | | **$21,000,000** |

---

## Implementation Checklist

### Pre-Launch
- [ ] Finalize pricing in billing system
- [ ] Create sales collateral for each tier
- [ ] Train sales team on pricing/packaging
- [ ] Set up partner portal with pricing
- [ ] Configure usage metering for add-ons

### Launch
- [ ] Publish pricing on website
- [ ] Activate self-service purchase (Starter)
- [ ] Enable partner quoting tools
- [ ] Launch agency pricing page
- [ ] Begin promotional campaigns

### Post-Launch (Monthly)
- [ ] Review conversion rates by tier
- [ ] Analyze discount usage
- [ ] Track competitive win/loss
- [ ] Assess pricing elasticity
- [ ] Adjust promotional offers

---

## Appendix A: Implemented Tier Feature Matrix

Source: `subscription_tiers` table (`db/phase44-enterprise-multitenancy.sql`)

| Feature | Starter | Business | Enterprise | Agency |
|---------|:-------:|:--------:|:----------:|:------:|
| White Label | — | — | — | ✅ |
| Custom Branding | — | ✅ | ✅ | ✅ |
| API Access | — | ✅ | ✅ | ✅ |
| SSO | — | — | ✅ | ✅ |
| Priority Support | — | — | ✅ | ✅ |
| Advanced Analytics | — | ✅ | ✅ | ✅ |
| Client Portal | — | — | — | ✅ |
| Self-Upgrade | ✅ | ✅ | ✅ | Manual |

---

## Appendix B: Pricing Calculator Inputs (Original)

### Usage-Based Factors

| Factor | Impact |
|--------|--------|
| API calls/month | Overage at $0.001/call above limit |
| Storage (GB) | $0.10/GB above included |
| Premium model usage | $0.02/1K tokens (Opus) |
| Export volume | Included in tier |

### Seat-Based Factors

| User Type | Pricing |
|-----------|---------|
| Full user | Full seat price |
| View-only user | 50% of seat price |
| Client portal user | Free (Agency tier) |
| API-only user | 25% of seat price |

---

## Appendix C: Competitive Pricing Reference

| Competitor | Pricing Model | Comparable Tier |
|------------|---------------|-----------------|
| ChatGPT Enterprise | $60/user/month | Below Starter |
| Claude for Business | $30/user/month | Below Starter |
| Jasper Business | $125/seat/month | Near Professional |
| Writer Enterprise | $200/user/month | Near Professional |
| Copy.ai | $49-249/month | Below Starter |
| Notion AI | $10/user/month | Add-on only |
| Monday.com + AI | $20/user/month | Workflow only |

---

## Appendix D: Agency ROI Calculator

### Input Variables
- Number of clients served
- Average assessment fee charged
- Average monthly retainer
- Hours saved per client/month
- Hourly rate equivalent

### Sample Calculation

| Variable | Value |
|----------|-------|
| Clients | 15 |
| Monthly retainer | $3,000 |
| Platform cost (Agency + integrations) | $897 |
| **Monthly Revenue** | $45,000 |
| **Monthly Cost** | $897 |
| **Gross Margin** | 98.0% |
| **Annual Platform ROI** | 4,916% |

---

*This pricing strategy is subject to quarterly review and adjustment based on market conditions, competitive landscape, and business performance.*

*Approved by: [Executive Team]*
*Effective Date: [TBD]*
