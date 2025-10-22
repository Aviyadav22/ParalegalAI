# Stage 2 Features - Currently Disabled

## Overview
The following features have been implemented but are **DISABLED** for Stage 1. They will be enabled in Stage 2.

## Disabled Features

### 1. ❌ Legal Metadata Extraction
**Status:** Disabled  
**Location:** `/server/models/documents.js` (line 128-129)

**What it does:**
- Automatically extracts legal metadata from uploaded PDFs
- Stores in `legal_judgment_metadata` PostgreSQL table
- Extracts: case names, court info, dates, judges, citations, etc.

**Files:**
- `/server/utils/documentHooks/extractLegalMetadata.js` - Extraction logic
- `/server/models/legalJudgmentMetadata.js` - Database model
- `/server/scripts/extractPdfMetadata.js` - Batch extraction script
- `/server/scripts/populateMetadata.js` - Pattern-based extraction

**Database:**
- Table: `legal_judgment_metadata` (100 records from testing)
- Indexes: 10 indexes for fast querying

### 2. ❌ Hybrid Search (Vector + Metadata)
**Status:** Disabled  
**Location:** `/server/utils/chats/stream.js` (line 160-170)

**What it does:**
- Combines vector similarity search with metadata filtering
- Allows filtering by court, date, case type, etc.
- Reranks results using semantic + metadata + reranker weights

**Files:**
- `/server/utils/hybridSearch/index.js` - Hybrid search manager
- `/server/utils/hybridSearch/reranker.js` - Result reranking logic

**Weights (when enabled):**
- Semantic (Qdrant): 60%
- Reranker Model: 30%
- Metadata: 10%

## Currently Active

### ✅ Vector-Only Search
**Status:** Active  
**Location:** `/server/utils/chats/stream.js` (line 162-170)

**What it does:**
- Pure Qdrant vector similarity search
- Cosine similarity with threshold filtering
- Optional reranking (if enabled in workspace settings)

**Flow:**
```
User Query
    ↓
Embed query (Gemini)
    ↓
Search Qdrant vectors (12,375 vectors)
    ↓
Filter by similarity threshold (0.25)
    ↓
Return top N results
    ↓
Generate LLM response
```

## Stage 2 Activation Plan

### To Enable Metadata Extraction:
1. Uncomment code in `/server/models/documents.js` (lines 128-156)
2. Ensure PDFs are kept after processing OR
3. Extract metadata in collector before deletion

### To Enable Hybrid Search:
1. Replace vector-only code in `/server/utils/chats/stream.js` (lines 160-170)
2. Restore hybrid search logic (commented out)
3. Configure weights in search parameters

### Prerequisites for Stage 2:
- [ ] Decide on PDF retention strategy
- [ ] Add embedded metadata to PDFs OR
- [ ] Improve pattern-based extraction
- [ ] Test metadata accuracy
- [ ] Configure hybrid search weights
- [ ] Add UI filters for metadata search

## Testing Data

**Current State:**
- 100 documents in `legal_judgment_metadata` (from testing)
- All have basic metadata (dates from filenames)
- Most fields empty (no embedded PDF metadata)
- Ready for Stage 2 activation

## Documentation

- **Metadata Extraction:** `/METADATA_EXTRACTION.md`
- **This Document:** `/STAGE_2_FEATURES.md`

## Notes

- Metadata table and indexes remain in database
- No performance impact from disabled features
- Can be enabled anytime by uncommenting code
- All infrastructure is ready for Stage 2
