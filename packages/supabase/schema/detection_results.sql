-- ============================================
-- DETECTION RESULTS (AI detection analysis)
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

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE public.detection_results ENABLE ROW LEVEL SECURITY;

-- Base table privileges required before RLS policies are evaluated.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.detection_results TO authenticated;

-- Users can read detection results for their own assignments.
CREATE POLICY "detection_results_read_own"
ON public.detection_results FOR SELECT TO authenticated
USING (
  assignment_id IN (
    SELECT assignment_id FROM public.assignments
    WHERE profile_id = auth.uid()
  )
);

-- Users can insert detection results for their own assignments.
CREATE POLICY "detection_results_insert_own"
ON public.detection_results FOR INSERT TO authenticated
WITH CHECK (
  assignment_id IN (
    SELECT assignment_id FROM public.assignments
    WHERE profile_id = auth.uid()
  )
);

-- Users can delete detection results for their own assignments.
CREATE POLICY "detection_results_delete_own"
ON public.detection_results FOR DELETE TO authenticated
USING (
  assignment_id IN (
    SELECT assignment_id FROM public.assignments
    WHERE profile_id = auth.uid()
  )
);
