-- ============================================
-- 7. DETECTION RESULTS (AI detection analysis)
-- ============================================

CREATE TABLE IF NOT EXISTS public.detection_results (
  detection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(assignment_id) ON DELETE CASCADE,
  overall_score DECIMAL(5,2) NOT NULL, -- 0.00 to 100.00
  sentence_analysis JSONB NOT NULL DEFAULT '[]'::jsonb,
  /* sentence_analysis structure:
  [
    { "text": "sentence...", "score": 85.5, "flag": "high" },
    { "text": "sentence...", "score": 12.0, "flag": "low" }
  ]
  flag: 'high' (>70), 'medium' (30-70), 'low' (<30)
  */
  provider TEXT, -- 'gptzero', 'originality', 'local'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);