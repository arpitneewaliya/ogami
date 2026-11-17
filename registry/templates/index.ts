import type { RegisteredTemplate } from "../lib/define-template";
import blogPostTemplate from "./blog-post/template";
import docsPageTemplate from "./docs-page/template";
import githubRepoTemplate from "./github-repo/template";
import minimalTechTemplate from "./minimal-tech/template";
import npmDownloadsMilestoneTemplate from "./npm-downloads-milestone/template";
import releaseTemplate from "./release/template";
import repoLaunchTemplate from "./repo-launch/template";
import starsMilestoneTemplate from "./stars-milestone/template";

export const allTemplates: readonly RegisteredTemplate[] = [
  minimalTechTemplate,
  githubRepoTemplate,
  blogPostTemplate,
  repoLaunchTemplate,
  releaseTemplate,
  starsMilestoneTemplate,
  npmDownloadsMilestoneTemplate,
  docsPageTemplate,
];

export const templatesById: Readonly<Record<string, RegisteredTemplate>> =
  Object.fromEntries(allTemplates.map((template) => [template.id, template]));

export const templateIds: readonly string[] = allTemplates.map(
  (template) => template.id,
);

export function getTemplateById(id: string): RegisteredTemplate | undefined {
  return templatesById[id];
}
