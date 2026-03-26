"use client";
import React, { useEffect, useState } from "react";
import {
  Search,
  LayoutGrid,
  List,
  SlidersHorizontal,
  Plus,
  FileText,
  MoreVertical,
  Pencil,
  Trash2,
  Copy,
} from "lucide-react";
import {
  createTemplate,
  deleteTemplate,
  ensureDefaultTemplates,
  listTemplates,
} from "@studybot/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import useAuth from "@/hooks/auth/useAuth";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

const supabaseClient = createClient();

const TemplateManager = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const { userId, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!userId) {
      return;
    }

    let isMounted = true;

    const loadTemplates = async () => {
      setIsLoading(true);
      setError("");

      const seedResult = await ensureDefaultTemplates(supabaseClient, userId);

      if (!isMounted) {
        return;
      }

      if (seedResult.error) {
        setError(seedResult.error);
        setTemplates([]);
        setIsLoading(false);
        return;
      }

      const result = await listTemplates(supabaseClient, userId);

      if (!isMounted) {
        return;
      }

      if (result.error) {
        setError(result.error);
        setTemplates([]);
        setIsLoading(false);
        return;
      }

      setTemplates(result.templates ?? []);
      setIsLoading(false);
    };

    loadTemplates();

    return () => {
      isMounted = false;
    };
  }, [authLoading, userId]);

  const scopedTemplates = userId ? templates : [];

  const filteredTemplates = scopedTemplates.filter(
    (template) =>
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.description ?? "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
  );

  const formatDate = (value) => {
    if (!value) {
      return "Unknown";
    }

    return new Date(value).toLocaleDateString();
  };

  const handleDeleteTemplate = async (templateId) => {
    const result = await deleteTemplate(supabaseClient, templateId);

    if (result.error) {
      setError(result.error);
      return;
    }

    setTemplates((currentTemplates) =>
      currentTemplates.filter((template) => template.templateId !== templateId),
    );
  };

  const handleDuplicateTemplate = async (templateId) => {
    const templateToDuplicate = templates.find(
      (template) => template.templateId === templateId,
    );

    if (!templateToDuplicate || !userId) {
      return;
    }

    const result = await createTemplate(supabaseClient, {
      profileId: userId,
      name: `${templateToDuplicate.name} (Copy)`,
      description: templateToDuplicate.description,
      category: templateToDuplicate.category,
      tags: templateToDuplicate.tags,
      content: templateToDuplicate.content,
    });

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.template) {
      setTemplates((currentTemplates) => [result.template, ...currentTemplates]);
    }
  };

  return (
    <div className="flex flex-col w-full h-full p-6">
      <div className="flex flex-col gap-4 mb-6">
        <h1 className="text-2xl font-bold">Templates</h1>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-50 max-w-md">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={18}
            />
            <Input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-r-none"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid size={18} />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-l-none"
              onClick={() => setViewMode("list")}
            >
              <List size={18} />
            </Button>
          </div>

          <Button variant="outline" size="sm">
            <SlidersHorizontal size={18} className="mr-2" />
            Filters
          </Button>

          <Link href="/templates/newTemplate">
            <Button size="sm">
              <Plus size={18} className="mr-2" />
              New Template
            </Button>
          </Link>
        </div>
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
      </div>

      {authLoading || (userId && isLoading) ? (
        <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground">
          <p className="text-lg">Loading templates...</p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground">
          <FileText size={48} className="mb-4 opacity-50" />
          <p className="text-lg">No templates found</p>
          <p className="text-sm">
            {searchQuery
              ? "Try adjusting your search"
              : "Create your first template to get started"}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTemplates.map((template) => (
            <Card
              key={template.templateId}
              className="group hover:shadow-md transition-shadow cursor-pointer"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FileText size={20} className="text-blue-500" />
                    <CardTitle className="text-base">
                      {template.name}
                    </CardTitle>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/templates/newTemplate?templateId=${template.templateId}`}>
                          <Pencil size={14} className="mr-2" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDuplicateTemplate(template.templateId)}
                      >
                        <Copy size={14} className="mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteTemplate(template.templateId)}
                        className="text-red-500 focus:text-red-500"
                      >
                        <Trash2 size={14} className="mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="line-clamp-2 mb-3">
                  {template.description || "No description"}
                </CardDescription>
                <p className="text-xs text-muted-foreground">
                  Updated {formatDate(template.updatedAt)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredTemplates.map((template) => (
            <div
              key={template.templateId}
              className="group flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <FileText size={24} className="text-blue-500" />
                <div>
                  <h3 className="font-medium">{template.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {template.description || "No description"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-sm text-muted-foreground hidden sm:block">
                  Updated {formatDate(template.updatedAt)}
                </p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/templates/newTemplate?templateId=${template.templateId}`}>
                        <Pencil size={14} className="mr-2" />
                        Edit
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDuplicateTemplate(template.templateId)}
                    >
                      <Copy size={14} className="mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDeleteTemplate(template.templateId)}
                      className="text-red-500 focus:text-red-500"
                    >
                      <Trash2 size={14} className="mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TemplateManager;
