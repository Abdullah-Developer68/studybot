import { z } from "zod";

// TipTap/ProseMirror nodes are arbitrary JSON objects.
const PlainObjectSchema = z.record(z.string(), z.unknown());

// Template tags are plain string arrays; shared by every template schema so
// the SDK can also validate unknown tag input with it.
const TemplateTagsSchema = z.array(z.string());

// Template content is a ProseMirror doc. The loose object preserves unknown
// node/attr keys because those shapes evolve with the editor.
const TemplateContentSchema = z.looseObject({
  type: z.literal("doc"),
  content: z.array(PlainObjectSchema),
});

// Mirrors a row in the templates table.
const TemplateDatabaseRowSchema = z.object({
  template_id: z.string(),
  profile_id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  tags: TemplateTagsSchema.nullable(),
  content: TemplateContentSchema,
  is_public: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

// Subset selected when only identity fields are needed (seed-marker checks).
const TemplateSummaryRowSchema = TemplateDatabaseRowSchema.pick({
  template_id: true,
  name: true,
  category: true,
});

// Row shape inserted into the templates table (ids/timestamps are DB-generated).
const TemplateInsertRowSchema = z.object({
  profile_id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  tags: TemplateTagsSchema,
  content: TemplateContentSchema,
  is_public: z.boolean(),
});

// Row shape used when patching a template.
const TemplateUpdateRowSchema = z.object({
  updated_at: z.string(),
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  tags: TemplateTagsSchema.optional(),
  content: TemplateContentSchema.optional(),
  is_public: z.boolean().optional(),
});

// App-facing camelCase view of a template.
const TemplateViewSchema = z.object({
  templateId: z.string(),
  profileId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  tags: TemplateTagsSchema,
  content: TemplateContentSchema,
  isPublic: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Mode-stable shapes (no nullable fields) are inferred directly from schemas.
type PlainObject = z.infer<typeof PlainObjectSchema>;
type TemplateContent = z.infer<typeof TemplateContentSchema>;

// Types with nullable fields are hand-written on purpose: the web app
// compiles with strictNullChecks off, and zod infers `.nullable()` object
// fields as optional there (e.g. `category?: string`), which would silently
// change these contracts. Declaring them keeps `string | null` required in
// every consumer regardless of strictness; the schemas above validate the
// same contract at runtime. Keep both in sync when fields change.
type TemplateView = {
  templateId: string;
  profileId: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
  content: TemplateContent;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
};

type TemplateDatabaseRow = {
  template_id: string;
  profile_id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[] | null;
  content: TemplateContent;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

type TemplateSummaryRow = Pick<
  TemplateDatabaseRow,
  "template_id" | "name" | "category"
>;

type TemplateInsertRow = {
  profile_id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
  content: TemplateContent;
  is_public: boolean;
};

type TemplateUpdateRow = {
  updated_at: string;
  name?: string;
  description?: string | null;
  category?: string | null;
  tags?: string[];
  content?: TemplateContent;
  is_public?: boolean;
};

type TemplateInput = {
  profileId?: string | null;
  name?: string;
  description?: string | null;
  category?: string | null;
  tags?: unknown;
  content?: unknown;
};

type TemplateUpdateInput = Omit<TemplateInput, "profileId">;

type TemplateResult = {
  template: TemplateView | null;
  error: string | null;
};

type TemplatesResult = {
  templates: TemplateView[] | null;
  error: string | null;
};

type SeedResult = {
  seeded: boolean;
  error: string | null;
};

export {
  PlainObjectSchema,
  TemplateTagsSchema,
  TemplateContentSchema,
  TemplateDatabaseRowSchema,
  TemplateSummaryRowSchema,
  TemplateInsertRowSchema,
  TemplateUpdateRowSchema,
  TemplateViewSchema,
};
export type {
  TemplateContent,
  TemplateView,
  TemplateDatabaseRow,
  TemplateSummaryRow,
  TemplateInsertRow,
  TemplateUpdateRow,
  TemplateInput,
  TemplateUpdateInput,
  TemplateResult,
  TemplatesResult,
  SeedResult,
  PlainObject,
};