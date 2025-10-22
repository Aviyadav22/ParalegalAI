-- Performance Optimization Indexes for ParalegalAI
-- Created: 2025-10-09
-- Purpose: Fix slow workspace loading for workspaces with many documents

-- ============================================
-- workspace_documents indexes
-- ============================================

-- Primary index for filtering documents by workspace
-- Used in: Document.forWorkspace(), workspace queries
CREATE INDEX IF NOT EXISTS idx_workspace_documents_workspaceId 
ON workspace_documents("workspaceId");

-- Index for pinned documents queries
CREATE INDEX IF NOT EXISTS idx_workspace_documents_pinned 
ON workspace_documents("workspaceId", "pinned") 
WHERE "pinned" = true;

-- Index for watched documents queries
CREATE INDEX IF NOT EXISTS idx_workspace_documents_watched 
ON workspace_documents("workspaceId", "watched") 
WHERE "watched" = true;

-- ============================================
-- workspace_chats indexes
-- ============================================

-- Composite index for the most common chat history query
-- Used in: WorkspaceChats.forWorkspace(), WorkspaceChats.forWorkspaceByUser()
CREATE INDEX IF NOT EXISTS idx_workspace_chats_workspace_thread 
ON workspace_chats("workspaceId", "thread_id", "include");

-- Index for user-specific chat queries
CREATE INDEX IF NOT EXISTS idx_workspace_chats_user_workspace 
ON workspace_chats("user_id", "workspaceId", "thread_id") 
WHERE "user_id" IS NOT NULL;

-- Index for API session chats
CREATE INDEX IF NOT EXISTS idx_workspace_chats_api_session 
ON workspace_chats("api_session_id", "workspaceId") 
WHERE "api_session_id" IS NOT NULL;

-- Index for filtering included chats
CREATE INDEX IF NOT EXISTS idx_workspace_chats_include 
ON workspace_chats("workspaceId", "include") 
WHERE "include" = true;

-- ============================================
-- document_vectors indexes
-- ============================================

-- Index for vector queries by workspace
CREATE INDEX IF NOT EXISTS idx_document_vectors_workspaceId 
ON document_vectors("workspaceId");

-- ============================================
-- workspace_parsed_files indexes
-- ============================================

-- Index for parsed files by workspace
CREATE INDEX IF NOT EXISTS idx_workspace_parsed_files_workspaceId 
ON workspace_parsed_files("workspaceId");

-- Index for parsed files by thread
CREATE INDEX IF NOT EXISTS idx_workspace_parsed_files_threadId 
ON workspace_parsed_files("threadId") 
WHERE "threadId" IS NOT NULL;

-- Composite index for workspace + thread queries
CREATE INDEX IF NOT EXISTS idx_workspace_parsed_files_workspace_thread 
ON workspace_parsed_files("workspaceId", "threadId");

-- ============================================
-- workspace_threads indexes
-- ============================================

-- Index for threads by workspace
CREATE INDEX IF NOT EXISTS idx_workspace_threads_workspaceId 
ON workspace_threads("workspaceId");

-- Index for user-specific threads
CREATE INDEX IF NOT EXISTS idx_workspace_threads_user 
ON workspace_threads("user_id", "workspaceId") 
WHERE "user_id" IS NOT NULL;

-- ============================================
-- Analyze tables after index creation
-- ============================================

ANALYZE workspace_documents;
ANALYZE workspace_chats;
ANALYZE document_vectors;
ANALYZE workspace_parsed_files;
ANALYZE workspace_threads;

-- ============================================
-- Verification Queries
-- ============================================

-- Check if indexes were created successfully
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN (
    'workspace_documents',
    'workspace_chats',
    'document_vectors',
    'workspace_parsed_files',
    'workspace_threads'
)
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
