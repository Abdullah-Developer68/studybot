import type { SupabaseClient } from "@supabase/supabase-js";

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

const DEFAULT_TEMPLATE_SEED_NAME = "__studybot_defaults_seed_v1__";
const DEFAULT_TEMPLATE_SEED_CATEGORY = "__system__";

const EMPTY_PARAGRAPH: PlainObject = {
  type: "paragraph",
  attrs: {
    textAlign: null,
  },
};

const DEFAULT_TEMPLATES: Array<{
  name: string;
  description: string;
  category: string;
  tags: string[];
  content: TemplateContent;
}> = [
  {
    name: "Meeting Notes",
    description: "Capture agenda items, discussion points, and follow-ups.",
    category: "notes",
    tags: ["meeting", "notes"],
    content: {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1, textAlign: null },
          content: [{ type: "text", text: "Meeting Notes" }],
        },
        {
          type: "heading",
          attrs: { level: 2, textAlign: null },
          content: [{ type: "text", text: "Agenda" }],
        },
        EMPTY_PARAGRAPH,
        {
          type: "heading",
          attrs: { level: 2, textAlign: null },
          content: [{ type: "text", text: "Discussion" }],
        },
        EMPTY_PARAGRAPH,
        {
          type: "heading",
          attrs: { level: 2, textAlign: null },
          content: [{ type: "text", text: "Action Items" }],
        },
        EMPTY_PARAGRAPH,
      ],
    },
  },
  {
    name: "Project Brief",
    description: "Outline scope, objectives, stakeholders, and milestones.",
    category: "planning",
    tags: ["project", "brief"],
    content: {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1, textAlign: null },
          content: [{ type: "text", text: "Project Brief" }],
        },
        {
          type: "heading",
          attrs: { level: 2, textAlign: null },
          content: [{ type: "text", text: "Objective" }],
        },
        EMPTY_PARAGRAPH,
        {
          type: "heading",
          attrs: { level: 2, textAlign: null },
          content: [{ type: "text", text: "Scope" }],
        },
        EMPTY_PARAGRAPH,
        {
          type: "heading",
          attrs: { level: 2, textAlign: null },
          content: [{ type: "text", text: "Stakeholders" }],
        },
        EMPTY_PARAGRAPH,
        {
          type: "heading",
          attrs: { level: 2, textAlign: null },
          content: [{ type: "text", text: "Milestones" }],
        },
        EMPTY_PARAGRAPH,
      ],
    },
  },
  {
    name: "Weekly Report",
    description: "Track progress, blockers, and next steps for the week.",
    category: "report",
    tags: ["weekly", "report"],
    content: {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1, textAlign: null },
          content: [{ type: "text", text: "Weekly Report" }],
        },
        {
          type: "heading",
          attrs: { level: 2, textAlign: null },
          content: [{ type: "text", text: "Wins" }],
        },
        EMPTY_PARAGRAPH,
        {
          type: "heading",
          attrs: { level: 2, textAlign: null },
          content: [{ type: "text", text: "Blockers" }],
        },
        EMPTY_PARAGRAPH,
        {
          type: "heading",
          attrs: { level: 2, textAlign: null },
          content: [{ type: "text", text: "Next Week" }],
        },
        EMPTY_PARAGRAPH,
      ],
    },
  },
];

function ensureClient(
  supabaseClient: SupabaseClient | null | undefined,
): asserts supabaseClient is SupabaseClient {
  if (!supabaseClient?.from) {
    throw new Error("Supabase client is required");
  }
}

function isPlainObject(value: unknown): value is PlainObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

const normalizeTags = (tags: unknown): string[] => {
  if (!Array.isArray(tags)) {
    return [];
  }

  return tags
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim())
    .filter(Boolean);
};

const normalizeTemplateContent = (content: unknown): TemplateContent => {
  if (!isPlainObject(content)) {
    throw new Error("Template content must be a JSON object");
  }

  if (content.type !== "doc") {
    throw new Error("Template content root type must be 'doc'");
  }

  if (!Array.isArray(content.content)) {
    throw new Error("Template content must include a content array");
  }

  return content as TemplateContent;
};

const isSeedMarkerRow = (
  row: TemplateSummaryRow | null | undefined,
): boolean =>
  row?.name === DEFAULT_TEMPLATE_SEED_NAME &&
  row?.category === DEFAULT_TEMPLATE_SEED_CATEGORY;

const mapTemplateRow = (
  row: TemplateDatabaseRow | null | undefined,
): TemplateView | null => {
  if (!row) {
    return null;
  }

  return {
    templateId: row.template_id,
    profileId: row.profile_id,
    name: row.name,
    description: row.description,
    category: row.category,
    tags: row.tags ?? [],
    content: row.content,
    isPublic: row.is_public,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const buildDefaultTemplateRows = (
  profileId: string,
  existingNames: string[] = [],
): TemplateInsertRow[] => {
  const usedNames = new Set<string>(existingNames);

  return DEFAULT_TEMPLATES.filter(
    (template) => !usedNames.has(template.name),
  ).map((template) => ({
    profile_id: profileId,
    name: template.name,
    description: template.description,
    category: template.category,
    tags: normalizeTags(template.tags),
    content: normalizeTemplateContent(template.content),
    is_public: false,
  }));
};

const ensureDefaultTemplates = async (
  supabaseClient: SupabaseClient | null | undefined,
  profileId: string | null | undefined,
): Promise<SeedResult> => {
  try {
    ensureClient(supabaseClient);

    if (!profileId) {
      return { seeded: false, error: "Profile ID is required" };
    }

    const { data: existingRows, error: fetchError } = await supabaseClient
      .from("templates")
      .select("template_id, name, category")
      .eq("profile_id", profileId);

    if (fetchError) {
      return { seeded: false, error: fetchError.message };
    }

    const rows = (existingRows ?? []) as TemplateSummaryRow[];

    if (rows.some(isSeedMarkerRow)) {
      return { seeded: false, error: null };
    }

    const existingNames = rows.reduce<string[]>((acc, row) => {
      if (!isSeedMarkerRow(row)) {
        acc.push(row.name);
      }
      return acc;
    }, []);

    const templateRows = buildDefaultTemplateRows(profileId, existingNames);

    const payload: Array<TemplateInsertRow | TemplateInsertRow & {
      profile_id: string;
      name: string;
      description: string;
      category: string;
      tags: string[];
      content: TemplateContent;
      is_public: boolean;
    }> = [
      ...templateRows,
      {
        profile_id: profileId,
        name: DEFAULT_TEMPLATE_SEED_NAME,
        description: "Internal seed marker for one-time default templates.",
        category: DEFAULT_TEMPLATE_SEED_CATEGORY,
        tags: [],
        content: {
          type: "doc",
          content: [EMPTY_PARAGRAPH],
        },
        is_public: false,
      },
    ];

    const { error: insertError } = await supabaseClient
      .from("templates")
      .insert(payload);

    if (insertError) {
      return { seeded: false, error: insertError.message };
    }

    return { seeded: true, error: null };
  } catch (error: unknown) {
    return {
      seeded: false,
      error: getErrorMessage(error, "Failed to seed default templates"),
    };
  }
};

const listTemplates = async (
  supabaseClient: SupabaseClient | null | undefined,
  profileId: string | null | undefined,
): Promise<TemplatesResult> => {
  try {
    ensureClient(supabaseClient);

    if (!profileId) {
      return { templates: null, error: "Profile ID is required" };
    }

    const { data, error } = await supabaseClient
      .from("templates")
      .select("*")
      .eq("profile_id", profileId)
      .order("updated_at", { ascending: false });

    if (error) {
      return { templates: null, error: error.message };
    }

    return {
      templates: ((data ?? []) as TemplateDatabaseRow[])
        .filter((row) => !isSeedMarkerRow(row))
        .map(mapTemplateRow)
        .filter((template): template is TemplateView => template !== null),
      error: null,
    };
  } catch (error: unknown) {
    return {
      templates: null,
      error: getErrorMessage(error, "Failed to list templates"),
    };
  }
};

const getTemplateById = async (
  supabaseClient: SupabaseClient | null | undefined,
  templateId: string | null | undefined,
): Promise<TemplateResult> => {
  try {
    ensureClient(supabaseClient);

    if (!templateId) {
      return { template: null, error: "Template ID is required" };
    }

    const { data, error } = await supabaseClient
      .from("templates")
      .select("*")
      .eq("template_id", templateId)
      .single();

    if (error) {
      return { template: null, error: error.message };
    }

    return {
      template: mapTemplateRow(data as TemplateDatabaseRow | null),
      error: null,
    };
  } catch (error: unknown) {
    return {
      template: null,
      error: getErrorMessage(error, "Failed to fetch template"),
    };
  }
};

const createTemplate = async (
  supabaseClient: SupabaseClient | null | undefined,
  input: TemplateInput = {},
): Promise<TemplateResult> => {
  try {
    ensureClient(supabaseClient);

    const {
      profileId,
      name,
      description = null,
      category = null,
      tags = [],
      content,
    } = input;

    if (!profileId) {
      return { template: null, error: "Profile ID is required" };
    }

    if (typeof name !== "string" || !name.trim()) {
      return { template: null, error: "Template name is required" };
    }

    if (name.trim() === DEFAULT_TEMPLATE_SEED_NAME) {
      return { template: null, error: "Template name is reserved" };
    }

    const payload: TemplateInsertRow = {
      profile_id: profileId,
      name: name.trim(),
      description: typeof description === "string" ? description.trim() : null,
      category:
        typeof category === "string" &&
        category.trim() === DEFAULT_TEMPLATE_SEED_CATEGORY
          ? null
          : typeof category === "string"
            ? category.trim()
            : null,
      tags: normalizeTags(tags),
      content: normalizeTemplateContent(content),
      is_public: false,
    };

    const { data, error } = await supabaseClient
      .from("templates")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      return { template: null, error: error.message };
    }

    return {
      template: mapTemplateRow(data as TemplateDatabaseRow | null),
      error: null,
    };
  } catch (error: unknown) {
    return {
      template: null,
      error: getErrorMessage(error, "Failed to create template"),
    };
  }
};

const updateTemplate = async (
  supabaseClient: SupabaseClient | null | undefined,
  templateId: string | null | undefined,
  input: TemplateUpdateInput = {},
): Promise<TemplateResult> => {
  try {
    ensureClient(supabaseClient);

    if (!templateId) {
      return { template: null, error: "Template ID is required" };
    }

    const patch: TemplateUpdateRow = {
      updated_at: new Date().toISOString(),
    };

    if (Object.prototype.hasOwnProperty.call(input, "name")) {
      if (typeof input.name !== "string" || !input.name.trim()) {
        return { template: null, error: "Template name cannot be empty" };
      }
      if (input.name.trim() === DEFAULT_TEMPLATE_SEED_NAME) {
        return { template: null, error: "Template name is reserved" };
      }
      patch.name = input.name.trim();
    }

    if (Object.prototype.hasOwnProperty.call(input, "description")) {
      patch.description =
        typeof input.description === "string" ? input.description.trim() : null;
    }

    if (Object.prototype.hasOwnProperty.call(input, "category")) {
      patch.category =
        typeof input.category === "string" &&
        input.category.trim() === DEFAULT_TEMPLATE_SEED_CATEGORY
          ? null
          : typeof input.category === "string"
            ? input.category.trim()
            : null;
    }

    if (Object.prototype.hasOwnProperty.call(input, "tags")) {
      patch.tags = normalizeTags(input.tags);
    }

    if (Object.prototype.hasOwnProperty.call(input, "content")) {
      patch.content = normalizeTemplateContent(input.content);
    }

    patch.is_public = false;

    const { data, error } = await supabaseClient
      .from("templates")
      .update(patch)
      .eq("template_id", templateId)
      .select("*")
      .single();

    if (error) {
      return { template: null, error: error.message };
    }

    return {
      template: mapTemplateRow(data as TemplateDatabaseRow | null),
      error: null,
    };
  } catch (error: unknown) {
    return {
      template: null,
      error: getErrorMessage(error, "Failed to update template"),
    };
  }
};

const deleteTemplate = async (
  supabaseClient: SupabaseClient | null | undefined,
  templateId: string | null | undefined,
): Promise<{ error: string | null }> => {
  try {
    ensureClient(supabaseClient);

    if (!templateId) {
      return { error: "Template ID is required" };
    }

    const { error } = await supabaseClient
      .from("templates")
      .delete()
      .eq("template_id", templateId);

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (error: unknown) {
    return {
      error: getErrorMessage(error, "Failed to delete template"),
    };
  }
};

export {
  ensureDefaultTemplates,
  listTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  normalizeTemplateContent,
};
