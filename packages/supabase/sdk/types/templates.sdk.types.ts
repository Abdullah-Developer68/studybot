type PlainObject = Record<string, unknown>;

type TemplateContent = {
  type: "doc";
  content: PlainObject[];
} & PlainObject;

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