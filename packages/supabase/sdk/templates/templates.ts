import { getSupabase } from "../client/client";
import {
  TemplateContentSchema,
  TemplateDatabaseRowSchema,
  TemplateSummaryRowSchema,
  TemplateTagsSchema,
  type TemplateContent,
  type TemplateInput,
  type TemplateInsertRow,
  type TemplateResult,
  type TemplateSummaryRow,
  type TemplateUpdateInput,
  type TemplateUpdateRow,
  type TemplateView,
  type TemplatesResult,
  type SeedResult,
  type PlainObject,
} from "../types/templates.sdk.types";
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

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

const normalizeTags = (tags: unknown): string[] => {
  // Anything that is not a string array collapses to no tags.
  const result = TemplateTagsSchema.safeParse(tags);
  if (!result.success) {
    return [];
  }

  return result.data.map((tag) => tag.trim()).filter(Boolean);
};

const normalizeTemplateContent = (content: unknown): TemplateContent => {
  // Zod enforces the ProseMirror doc contract ({ type: "doc", content: [...] })
  // and preserves unknown node/attr keys via the loose object schema.
  const result = TemplateContentSchema.safeParse(content);
  if (!result.success) {
    throw new Error(
      result.error.issues[0]?.message ?? "Template content is invalid",
    );
  }

  return result.data;
};

// Structural check so it works for both summary rows and mapped template views.
const isSeedMarkerRow = (
  row: { name: string; category: string | null } | null | undefined,
): boolean =>
  row?.name === DEFAULT_TEMPLATE_SEED_NAME &&
  row?.category === DEFAULT_TEMPLATE_SEED_CATEGORY;

// Validates summary rows from PostgREST one by one, dropping rows that don't
// match the schema instead of failing the whole batch.
const parseTemplateSummaryRows = (rows: unknown): TemplateSummaryRow[] => {
  if (!Array.isArray(rows)) {
    return [];
  }
  const parsed: TemplateSummaryRow[] = [];
  for (const row of rows) {
    const result = TemplateSummaryRowSchema.safeParse(row);
    if (result.success) {
      // Build the row field by field: schema output marks nullable fields
      // optional when strictNullChecks is off, while TemplateSummaryRow
      // requires them.
      parsed.push({
        template_id: result.data.template_id,
        name: result.data.name,
        category: result.data.category ?? null,
      });
    }
  }
  return parsed;
};

// Rows come from PostgREST as untyped JSON — validate before trusting them.
// Invalid rows log and map to null so callers keep their existing fallbacks.
const mapTemplateRow = (row: unknown): TemplateView | null => {
  if (!row) {
    return null;
  }

  const result = TemplateDatabaseRowSchema.safeParse(row);
  if (!result.success) {
    console.error("Invalid template row:", result.error.issues);
    return null;
  }

  const parsedRow = result.data;
  return {
    templateId: parsedRow.template_id,
    profileId: parsedRow.profile_id,
    name: parsedRow.name,
    // "?? null" keeps the required-nullable TemplateView contract satisfied
    // even though schema output marks nullable fields optional when
    // strictNullChecks is off.
    description: parsedRow.description ?? null,
    category: parsedRow.category ?? null,
    tags: parsedRow.tags ?? [],
    content: parsedRow.content,
    isPublic: parsedRow.is_public,
    createdAt: parsedRow.created_at,
    updatedAt: parsedRow.updated_at,
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
  profileId: string | null | undefined,
): Promise<SeedResult> => {
  try {
    const supabase = getSupabase();

    if (!profileId) {
      return { seeded: false, error: "Profile ID is required" };
    }

    const { data: existingRows, error: fetchError } = await supabase
      .from("templates")
      .select("template_id, name, category")
      .eq("profile_id", profileId);

    if (fetchError) {
      return { seeded: false, error: fetchError.message };
    }

    const rows = parseTemplateSummaryRows(existingRows);

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

    const payload: Array<
      | TemplateInsertRow
      | (TemplateInsertRow & {
          profile_id: string;
          name: string;
          description: string;
          category: string;
          tags: string[];
          content: TemplateContent;
          is_public: boolean;
        })
    > = [
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

    const { error: insertError } = await supabase
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
  profileId: string | null | undefined,
): Promise<TemplatesResult> => {
  try {
    const supabase = getSupabase();

    if (!profileId) {
      return { templates: null, error: "Profile ID is required" };
    }

    const { data, error } = await supabase
      .from("templates")
      .select("*")
      .eq("profile_id", profileId)
      .order("updated_at", { ascending: false });

    if (error) {
      return { templates: null, error: error.message };
    }

    return {
      templates: (Array.isArray(data) ? data : [])
        .map(mapTemplateRow)
        .filter((template): template is TemplateView => template !== null)
        .filter((template) => !isSeedMarkerRow(template)),
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
  templateId: string | null | undefined,
): Promise<TemplateResult> => {
  try {
    const supabase = getSupabase();

    if (!templateId) {
      return { template: null, error: "Template ID is required" };
    }

    const { data, error } = await supabase
      .from("templates")
      .select("*")
      .eq("template_id", templateId)
      .single();

    if (error) {
      return { template: null, error: error.message };
    }

    return {
      template: mapTemplateRow(data),
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
  input: TemplateInput = {},
): Promise<TemplateResult> => {
  try {
    const supabase = getSupabase();

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

    const { data, error } = await supabase
      .from("templates")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      return { template: null, error: error.message };
    }

    return {
      template: mapTemplateRow(data),
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
  templateId: string | null | undefined,
  input: TemplateUpdateInput = {},
): Promise<TemplateResult> => {
  try {
    const supabase = getSupabase();

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

    const { data, error } = await supabase
      .from("templates")
      .update(patch)
      .eq("template_id", templateId)
      .select("*")
      .single();

    if (error) {
      return { template: null, error: error.message };
    }

    return {
      template: mapTemplateRow(data),
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
  templateId: string | null | undefined,
): Promise<{ error: string | null }> => {
  try {
    const supabase = getSupabase();

    if (!templateId) {
      return { error: "Template ID is required" };
    }

    const { error } = await supabase
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
export {};
