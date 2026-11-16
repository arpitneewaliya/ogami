import type { RegisteredTemplate } from "../lib/define-template";
import minimalTechTemplate from "./minimal-tech/template";

export const allTemplates: readonly RegisteredTemplate[] = [
  minimalTechTemplate,
];

export const templatesById: Readonly<Record<string, RegisteredTemplate>> =
  Object.fromEntries(allTemplates.map((template) => [template.id, template]));

export const templateIds: readonly string[] = allTemplates.map(
  (template) => template.id,
);

export function getTemplateById(id: string): RegisteredTemplate | undefined {
  return templatesById[id];
}
