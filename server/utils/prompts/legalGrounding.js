/**
 * Legal Citation Grounding Prompts
 * Ensures accurate citation and prevents hallucination in legal RAG responses
 */

class LegalGroundingPrompts {
  /**
   * Generate a grounding system prompt for legal RAG
   */
  static getGroundingSystemPrompt() {
    return `You are a legal research assistant with strict citation requirements.

CRITICAL CITATION RULES:
1. ONLY cite information that appears in the provided source documents
2. ALWAYS include exact citations with case name, court, and year
3. NEVER make up or infer legal citations that aren't in the sources
4. If you're unsure about a citation, say "Citation not available in sources"
5. Quote directly from sources when making legal arguments
6. Distinguish between holdings, dicta, and dissenting opinions

CITATION FORMAT:
- Case law: [Case Name], [Citation], [Court], [Year]
- Example: "Miranda v. Arizona, 384 U.S. 436 (Supreme Court, 1966)"

VERIFICATION CHECKLIST:
✓ Is this information directly from the source text?
✓ Can I quote the exact passage?
✓ Is the citation complete and accurate?
✓ Have I distinguished between majority and dissenting opinions?

If you cannot verify information from the sources, explicitly state: "This information is not available in the provided sources."`;
  }

  /**
   * Generate context-specific grounding instructions
   */
  static getContextGroundingInstructions(sources) {
    if (!sources || sources.length === 0) {
      return "No source documents provided. Please inform the user.";
    }

    let instructions = `\n\nAVAILABLE SOURCES (${sources.length}):\n`;
    
    sources.forEach((source, index) => {
      const citation = source.citationMetadata?.citation || 'Citation not available';
      const court = source.citationMetadata?.court || 'Unknown Court';
      const year = source.citationMetadata?.year || 'Unknown Year';
      const title = source.citationMetadata?.title || source.title || 'Untitled';
      
      instructions += `\n[Source ${index + 1}] ${title}\n`;
      instructions += `  Citation: ${citation}\n`;
      instructions += `  Court: ${court}, Year: ${year}\n`;
      
      if (source.groundingInstruction) {
        instructions += `  ${source.groundingInstruction}\n`;
      }
    });

    instructions += `\n\nWhen citing, use the format: [Source X] followed by the exact citation.`;
    instructions += `\nExample: "According to [Source 1] Miranda v. Arizona, 384 U.S. 436 (1966), '...'"\n`;

    return instructions;
  }

  /**
   * Generate post-processing validation prompt
   */
  static getValidationPrompt(response, sources) {
    return `Review the following legal response for citation accuracy:

RESPONSE:
${response}

AVAILABLE SOURCES:
${sources.map((s, i) => `[${i + 1}] ${s.citationMetadata?.citation || 'N/A'}`).join('\n')}

VALIDATION TASKS:
1. Verify all citations exist in the source list
2. Check that quoted text matches source documents
3. Confirm legal principles are accurately represented
4. Identify any potential hallucinations or unsupported claims

Provide a validation report with:
- ✓ Verified citations
- ⚠ Questionable claims
- ✗ Unsupported statements`;
  }

  /**
   * Generate query refinement prompt for better retrieval
   */
  static getQueryRefinementPrompt(userQuery) {
    return `Analyze this legal query and extract key search terms:

USER QUERY: "${userQuery}"

Extract:
1. Legal concepts (e.g., "due process", "negligence", "contract breach")
2. Case names or citations (if mentioned)
3. Court names or jurisdictions
4. Time periods or years
5. Parties or entities
6. Statutory references (e.g., "Section 42", "Article III")

Provide refined search terms optimized for legal document retrieval.`;
  }

  /**
   * Generate a prompt for citation extraction from sources
   */
  static getCitationExtractionPrompt(sourceText) {
    return `Extract all legal citations from this text:

TEXT:
${sourceText.substring(0, 2000)}...

Extract:
1. Case citations (e.g., "Smith v. Jones, 123 U.S. 456 (1990)")
2. Statutory citations (e.g., "42 U.S.C. § 1983")
3. Court names
4. Years
5. Judge names

Format as structured JSON.`;
  }

  /**
   * Generate a prompt for legal document summarization
   */
  static getSummarizationPrompt(documentType = 'judgment') {
    const templates = {
      judgment: `Summarize this court judgment with:
1. PARTIES: Who are the appellant and respondent?
2. COURT: Which court issued this judgment?
3. FACTS: What are the key facts?
4. ISSUES: What legal questions were addressed?
5. HOLDING: What did the court decide?
6. REASONING: What was the court's rationale?
7. OUTCOME: What was the final judgment?
8. CITATIONS: What precedents were cited?`,

      statute: `Summarize this statute with:
1. TITLE: What is the statute called?
2. SCOPE: What does it regulate?
3. KEY PROVISIONS: What are the main sections?
4. PENALTIES: What are the consequences of violation?
5. EFFECTIVE DATE: When did it take effect?
6. AMENDMENTS: Has it been amended?`,

      contract: `Summarize this contract with:
1. PARTIES: Who are the contracting parties?
2. PURPOSE: What is the contract for?
3. OBLIGATIONS: What must each party do?
4. CONSIDERATION: What is being exchanged?
5. TERM: How long does it last?
6. TERMINATION: How can it be ended?
7. DISPUTE RESOLUTION: How are disputes handled?`
    };

    return templates[documentType] || templates.judgment;
  }

  /**
   * Generate anti-hallucination instructions
   */
  static getAntiHallucinationInstructions() {
    return `ANTI-HALLUCINATION PROTOCOL:

🚫 DO NOT:
- Invent case names, citations, or legal principles
- Assume facts not stated in the sources
- Extrapolate beyond what the sources explicitly state
- Mix information from different cases without clear attribution
- State legal conclusions without source support

✅ DO:
- Quote directly from sources with exact citations
- Clearly distinguish between source content and analysis
- Use phrases like "According to [Source X]..." or "The court stated..."
- Admit when information is not available in the sources
- Provide page numbers or paragraph references when available

If uncertain, use these phrases:
- "Based on the available sources..."
- "The provided documents indicate..."
- "According to [specific citation]..."
- "This information is not available in the current sources."`;
  }

  /**
   * Generate a complete legal RAG system prompt
   */
  static getCompleteLegalRAGPrompt(sources, userQuery) {
    return `${this.getGroundingSystemPrompt()}

${this.getAntiHallucinationInstructions()}

${this.getContextGroundingInstructions(sources)}

USER QUERY: "${userQuery}"

Provide a comprehensive legal response that:
1. Directly answers the user's question
2. Cites all sources accurately with [Source X] tags
3. Quotes relevant passages from the sources
4. Distinguishes between holdings and dicta
5. Notes any limitations in the available sources
6. Uses proper legal citation format

Remember: Accuracy and citation integrity are paramount. If you cannot verify something from the sources, explicitly state that.`;
  }

  /**
   * Generate metadata filter explanation for transparency
   */
  static explainMetadataFilters(filters) {
    if (!filters || Object.keys(filters).length === 0) {
      return "No metadata filters applied.";
    }

    let explanation = "Applied metadata filters:\n";
    
    if (filters.court) explanation += `- Court: ${filters.court}\n`;
    if (filters.year) explanation += `- Year: ${filters.year}\n`;
    if (filters.jurisdiction) explanation += `- Jurisdiction: ${filters.jurisdiction}\n`;
    if (filters.case_type) explanation += `- Case Type: ${filters.case_type}\n`;
    if (filters.judge) explanation += `- Judge: ${filters.judge}\n`;

    return explanation;
  }

  /**
   * Generate source quality assessment prompt
   */
  static getSourceQualityPrompt(source) {
    return `Assess the quality and relevance of this legal source:

TITLE: ${source.title || 'Untitled'}
CITATION: ${source.citationMetadata?.citation || 'N/A'}
COURT: ${source.citationMetadata?.court || 'N/A'}
YEAR: ${source.citationMetadata?.year || 'N/A'}
RELEVANCE SCORE: ${source.combinedScore || 0}

TEXT PREVIEW:
${(source.text || '').substring(0, 500)}...

Rate on:
1. Relevance to query (0-10)
2. Authority level (0-10)
3. Recency (0-10)
4. Completeness (0-10)

Provide overall quality score and recommendation for inclusion.`;
  }
}

module.exports = { LegalGroundingPrompts };
