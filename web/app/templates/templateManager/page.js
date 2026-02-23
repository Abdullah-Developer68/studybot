"use client";
import React, { useState } from "react";
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
import { createNewTemplate } from "@/redux/slices/templateSlice";
import { useDispatch } from "react-redux";
import Link from "next/link";

// Sample templates data - replace with actual data from your backend
const sampleTemplates = [
  {
    id: 1,
    title: "Meeting Notes",
    description: "Template for capturing meeting notes and action items",
    createdAt: "2026-01-15",
    updatedAt: "2026-01-17",
  },
  {
    id: 2,
    title: "Project Brief",
    description: "Standard project brief template with objectives and scope",
    createdAt: "2026-01-10",
    updatedAt: "2026-01-16",
  },
  {
    id: 3,
    title: "Weekly Report",
    description: "Weekly status report template for team updates",
    createdAt: "2026-01-08",
    updatedAt: "2026-01-14",
  },
  {
    id: 4,
    title: "Bug Report",
    description: "Template for documenting and tracking bugs",
    createdAt: "2026-01-05",
    updatedAt: "2026-01-12",
  },
];

const TemplateManager = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'list'
  const [templates, setTemplates] = useState(sampleTemplates);

  const dispatch = useDispatch();

  // Filter templates based on search query
  const filteredTemplates = templates.filter(
    (template) =>
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleCreateTemplate = () => {
    // TODO: Implement create template functionality
    console.log("Create new template");
  };

  const handleEditTemplate = (id) => {
    // TODO: Implement edit template functionality
    console.log("Edit template:", id);
  };

  const handleDeleteTemplate = (id) => {
    setTemplates(templates.filter((t) => t.id !== id));
  };

  const handleDuplicateTemplate = (id) => {
    const templateToDuplicate = templates.find((t) => t.id === id);
    if (templateToDuplicate) {
      const newTemplate = {
        ...templateToDuplicate,
        id: Date.now(),
        title: `${templateToDuplicate.title} (Copy)`,
        createdAt: new Date().toISOString().split("T")[0],
        updatedAt: new Date().toISOString().split("T")[0],
      };
      setTemplates([...templates, newTemplate]);
    }
  };

  const handleNewTemplate = () => {
    dispatch(createNewTemplate);
  };
  return (
    <div className="flex flex-col w-full h-full p-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 mb-6">
        <h1 className="text-2xl font-bold">Templates</h1>

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
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

          {/* View Toggle */}
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

          {/* Filters */}
          <Button variant="outline" size="sm">
            <SlidersHorizontal size={18} className="mr-2" />
            Filters
          </Button>

          {/* Create New Template */}
          <Link href="/templates/newTemplate">
            <Button onClick={handleCreateTemplate} size="sm">
              <Plus size={18} className="mr-2" />
              New Template
            </Button>
          </Link>
        </div>
      </div>

      {/* Templates Section */}
      {filteredTemplates.length === 0 ? (
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
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTemplates.map((template) => (
            <Card
              key={template.id}
              className="group hover:shadow-md transition-shadow cursor-pointer"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FileText size={20} className="text-blue-500" />
                    <CardTitle className="text-base">
                      {template.title}
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
                      <DropdownMenuItem
                        onClick={() => handleEditTemplate(template.id)}
                      >
                        <Pencil size={14} className="mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDuplicateTemplate(template.id)}
                      >
                        <Copy size={14} className="mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteTemplate(template.id)}
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
                  {template.description}
                </CardDescription>
                <p className="text-xs text-muted-foreground">
                  Updated {template.updatedAt}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="flex flex-col gap-2">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="group flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <FileText size={24} className="text-blue-500" />
                <div>
                  <h3 className="font-medium">{template.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {template.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-sm text-muted-foreground hidden sm:block">
                  Updated {template.updatedAt}
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
                    <DropdownMenuItem
                      onClick={() => handleEditTemplate(template.id)}
                    >
                      <Pencil size={14} className="mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDuplicateTemplate(template.id)}
                    >
                      <Copy size={14} className="mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDeleteTemplate(template.id)}
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
