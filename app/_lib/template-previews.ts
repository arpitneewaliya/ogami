import type { StaticImageData } from "next/image";
import type { RegisteredTemplate } from "@/registry/lib/define-template";
import blogPostPreview from "@/registry/templates/blog-post/preview.png";
import docsPagePreview from "@/registry/templates/docs-page/preview.png";
import githubRepoPreview from "@/registry/templates/github-repo/preview.png";
import minimalTechPreview from "@/registry/templates/minimal-tech/preview.png";
import npmDownloadsMilestonePreview from "@/registry/templates/npm-downloads-milestone/preview.png";
import releasePreview from "@/registry/templates/release/preview.png";
import repoLaunchPreview from "@/registry/templates/repo-launch/preview.png";
import starsMilestonePreview from "@/registry/templates/stars-milestone/preview.png";

/**
 * Explicit static imports of every pre-rendered template `preview.png`.
 * Static imports bundle local image assets directly through `next/image`
 * without duplicating files into `public/` or hitting `/api/og`.
 */
export const TEMPLATE_PREVIEWS: Readonly<Record<string, StaticImageData>> = {
  "minimal-tech": minimalTechPreview,
  "github-repo": githubRepoPreview,
  "blog-post": blogPostPreview,
  "repo-launch": repoLaunchPreview,
  release: releasePreview,
  "stars-milestone": starsMilestonePreview,
  "npm-downloads-milestone": npmDownloadsMilestonePreview,
  "docs-page": docsPagePreview,
};

export function getTemplatePreview(id: string): StaticImageData | undefined {
  return TEMPLATE_PREVIEWS[id];
}

export function getTemplatePreviewAlt(template: RegisteredTemplate): string {
  return `${template.name} OG card preview — ${template.description}`;
}
