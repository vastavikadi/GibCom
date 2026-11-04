// AI Prompt Templates for Company's Brain

export const PROMPTS = {
  EXTRACT_ENTITIES: (text: string, existingEntities: string[] = []) => `
Analyze the following text from an organizational document and extract all entities mentioned.

Entity types: person, department, project, customer, vendor, partner, decision, process, technology, document, event, experience.

${existingEntities.length > 0 ? `Known entities in this organization: ${existingEntities.join(', ')}. Match against these when possible.` : ''}

Text:
"""
${text}
"""

Return a JSON object:
{
  "entities": [
    {
      "name": "Full Name or Title",
      "type": "person|department|project|customer|vendor|partner|decision|process|technology|document|event|experience",
      "description": "Brief description of the entity based on the text",
      "attributes": { "role": "...", "status": "...", ... }
    }
  ]
}

Rules:
- Use the entity's full, proper name.
- Do not create duplicate entities with slightly different names.
- Only extract entities clearly mentioned in the text.
- Include key attributes mentioned (role, status, technology stack, etc.).
- For persons, include role/title if mentioned.
- For projects, include status/phase if mentioned.
- For customers, include relationship stage if mentioned.`,

  EXTRACT_MEMORIES: (text: string, entities: string[] = []) => `
Extract structured organizational memories from the following text. A memory is a discrete piece of organizational knowledge.

Memory types:
- people: expertise, ownership, responsibilities, knowledge
- process: workflows, practices, exceptions, dependencies
- decision: decisions made, rationale, alternatives, outcomes
- relationship: customer/vendor/partner information, commitments
- project: milestones, history, blockers, technical context
- experience: lessons learned, failures, successes, expertise

Known entities: ${entities.join(', ') || 'none yet'}

Text:
"""
${text}
"""

Return a JSON object:
{
  "memories": [
    {
      "title": "Concise title for this memory",
      "description": "Detailed description of the knowledge captured",
      "memoryType": "people|process|decision|relationship|project|experience",
      "confidence": 0.8,
      "attributes": { "category": "...", "impact": "...", ... },
      "relatedEntities": ["Entity Name 1", "Entity Name 2"]
    }
  ]
}

Rules:
- Each memory should capture one distinct piece of knowledge.
- Include sufficient detail in the description for future retrieval.
- Assign confidence based on how clearly stated the information is (0.0-1.0).
- Reference entity names exactly as they appear.
- Do not fabricate information not present in the text.
- Distinguish between stated facts and apparent implications.`,

  EXTRACT_RELATIONSHIPS: (text: string, entities: string[] = []) => `
Extract relationships between entities mentioned in the following text.

Relationship types: WORKS_ON, OWNS, KNOWS_ABOUT, MADE, INVOLVES, DEPENDS_ON, REPORTS_TO, RELATED_TO, COMMUNICATES_WITH, RESULTED_IN, REQUIRES, REPLACED_BY

Known entities: ${entities.join(', ') || 'none yet'}

Text:
"""
${text}
"""

Return a JSON object:
{
  "relationships": [
    {
      "source": "Source Entity Name",
      "target": "Target Entity Name",
      "type": "WORKS_ON|OWNS|KNOWS_ABOUT|MADE|INVOLVES|DEPENDS_ON|REPORTS_TO|RELATED_TO|COMMUNICATES_WITH|RESULTED_IN|REQUIRES|REPLACED_BY",
      "description": "Brief description of the relationship",
      "confidence": 0.8
    }
  ]
}

Rules:
- Only extract relationships that are clearly stated or strongly implied.
- Do not infer relationships just because two entities appear in the same document.
- Use the most specific relationship type available.
- Confidence should reflect how explicit the relationship is (0.0-1.0).
- Both source and target must be known entities.`,

  CLASSIFY_MEMORY: (text: string) => `
Classify the following text into an organizational memory type.

Types:
- people: About individuals, their roles, expertise, knowledge
- process: About workflows, procedures, how things work
- decision: About decisions made, why, alternatives considered
- relationship: About external relationships (customers, vendors, partners)
- project: About projects, milestones, progress, blockers
- experience: About lessons learned, successes, failures

Text: "${text}"

Return JSON: { "memoryType": "...", "confidence": 0.0-1.0 }`,

  UNDERSTAND_INTENT: (question: string) => `
Classify this question about organizational knowledge.

Categories:
- organizational: Who does what, roles, responsibilities, structure
- historical: Why something happened, past events, decisions
- operational: How to do something, processes, procedures
- strategic: Trends, patterns, risks, opportunities, why things are the way they are
- predictive: Future risks, forecasts, dependencies that may break

Question: "${question}"

Return JSON:
{
  "category": "organizational|historical|operational|strategic|predictive",
  "confidence": 0.0-1.0,
  "entities": ["entity names mentioned or implied"],
  "timeConstraints": { "before": "ISO date or null", "after": "ISO date or null", "at": "ISO date or null" },
  "keywords": ["important", "search", "terms"]
}`,

  SYNTHESIZE_ANSWER: (question: string, context: string, entityContext: string) => `
You are Company's Brain, an organizational intelligence system. Answer the following question using ONLY the provided evidence and organizational context.

Question: "${question}"

Organizational Context (entities and relationships):
${entityContext}

Evidence (source documents and memories):
${context}

Return a JSON object:
{
  "answer": "Comprehensive answer to the question with inline source references like [Source: title]",
  "summary": "2-3 sentence executive summary",
  "confidence": 0.0-1.0,
  "citations": [
    { "sourceId": "id", "sourceTitle": "title", "excerpt": "relevant quote", "relevance": "why this source matters" }
  ],
  "relatedEntities": ["entity names relevant to the answer"],
  "followUpQuestions": ["suggested follow-up questions"],
  "evidenceQuality": "strong|moderate|weak|insufficient",
  "distinguishedFacts": ["verified facts from sources"],
  "assumptions": ["things assumed but not directly evidenced"],
  "unresolvedQuestions": ["aspects that cannot be answered from available evidence"]
}

Rules:
- ONLY use information present in the provided context.
- Clearly distinguish between verified facts and inferences.
- If evidence is insufficient, say so explicitly.
- Always cite sources for factual claims.
- Never fabricate organizational details.
- If the question asks about something not in the evidence, say the information is not available.
- Confidence should reflect how well the evidence supports the answer.`,

  CONTEXT_RECONSTRUCTION: (topic: string, context: string, timeline: string) => `
You are investigating an organizational topic. Reconstruct the full context using available evidence.

Topic: "${topic}"

Timeline of events:
${timeline}

Available evidence:
${context}

Return a JSON object:
{
  "summary": "Executive summary of what happened and why",
  "contributingFactors": [
    { "factor": "Description", "evidence": "What supports this", "confidence": 0.0-1.0 }
  ],
  "timeline": [
    { "date": "ISO date or description", "event": "What happened", "significance": "Why it matters" }
  ],
  "supportingEvidence": [
    { "sourceId": "id", "sourceTitle": "title", "excerpt": "key quote", "relevance": "how it supports the analysis" }
  ],
  "conflictingEvidence": [
    { "sourceId": "id", "description": "what conflicts", "implication": "what this means" }
  ],
  "confidence": 0.0-1.0,
  "unresolvedQuestions": ["Questions that remain unanswered"],
  "relatedEntities": ["entity names"]
}

Rules:
- Reconstruct the narrative from evidence, not imagination.
- Distinguish facts from interpretations.
- Note conflicting evidence.
- Identify gaps in the available record.
- Present contributing factors in order of evidential support.`,

  TEACH_BRAIN_PARSE: (input: string) => `
An employee is teaching the organizational brain new knowledge. Parse their natural language input into structured memory.

Employee input:
"""
${input}
"""

Return a JSON object:
{
  "memoryType": "people|process|decision|relationship|project|experience",
  "title": "Clear, concise title for this knowledge",
  "description": "Structured description of the knowledge",
  "confidence": 0.8,
  "relatedEntities": [
    { "name": "Entity Name", "type": "person|project|customer|...", "role": "how they relate" }
  ],
  "attributes": {
    "category": "...",
    "timeframe": "...",
    "impact": "..."
  },
  "suggestedRelationships": [
    { "source": "entity", "target": "entity", "type": "RELATIONSHIP_TYPE" }
  ]
}

Rules:
- Infer the most appropriate memory type.
- Extract all mentioned entities.
- Preserve the employee's intent and nuance.
- Set confidence based on how concrete and specific the input is.
- Suggest entity relationships when apparent.`,

  GENERATE_INSIGHTS: (stats: string, memories: string) => `
Analyze organizational knowledge patterns and generate actionable insights.

Organization Statistics:
${stats}

Recent Memories and Patterns:
${memories}

Return JSON:
{
  "insights": [
    {
      "title": "Insight title",
      "description": "Detailed insight description",
      "category": "knowledge_gap|bottleneck|dependency|risk|opportunity|pattern",
      "severity": "high|medium|low",
      "evidence": "What data supports this insight",
      "recommendation": "Suggested action",
      "confidence": 0.0-1.0,
      "relatedEntities": ["entity names"]
    }
  ]
}`,

  GENERATE_ACTION: (actionType: string, context: string) => `
Generate an organizational action proposal.

Action type: ${actionType}
Context:
${context}

Return JSON:
{
  "title": "Action title",
  "description": "What this action will produce",
  "steps": ["Step 1", "Step 2"],
  "content": "The generated content (document, brief, etc.)",
  "relatedEntities": ["entity names"],
  "estimatedEffort": "time estimate",
  "requiredPermissions": ["permission list"]
}`,
};

