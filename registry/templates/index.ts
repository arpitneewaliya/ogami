import type { RegisteredTemplate } from "../lib/define-template";
import blogPostTemplate from "./blog-post/template";
import githubRepoTemplate from "./github-repo/template";
import minimalTechTemplate from "./minimal-tech/template";

export const allTemplates: readonly RegisteredTemplate[] = [
  minimalTechTemplate,
  githubRepoTemplate,
  blogPostTemplate,
];

export const templatesById: Readonly<Record<string, RegisteredTemplate>> =
  Object.fromEntries(allTemplates.map((template) => [template.id, template]));

export const templateIds: readonly string[] = allTemplates.map(
  (template) => template.id,
);

export function getTemplateById(id: string): RegisteredTemplate | undefined {
  return templatesById[id];
}
