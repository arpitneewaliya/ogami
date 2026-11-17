import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { allTemplates } from "../../templates";
import * as fonts from "../fonts";
import * as scripts from "../scripts";

describe("client-safe scripts module and schema conversion", () => {
  it("imports nothing from node:* so client components can import it safely", async () => {
    const scriptsSource = await readFile(
      path.join(process.cwd(), "registry", "lib", "scripts.ts"),
      "utf8",
    );

    expect(scriptsSource).not.toMatch(/from\s+["']node:/);
    expect(scriptsSource).not.toMatch(/\brequire\s*\(\s*["']node:/);
    expect(scriptsSource).not.toMatch(/from\s+["'](?:fs|path)(?:\/promises)?["']/);
  });

  it("shares the exact same script-detection functions between scripts.ts and fonts.ts", () => {
    expect(fonts.BASE_SUPPORTED_SCRIPTS).toBe(scripts.BASE_SUPPORTED_SCRIPTS);
    expect(fonts.GEIST_COVERED_RANGES).toBe(scripts.GEIST_COVERED_RANGES);
    expect(fonts.UnsupportedScriptError).toBe(scripts.UnsupportedScriptError);
    expect(fonts.isCodepointInGeist).toBe(scripts.isCodepointInGeist);
    expect(fonts.detectScripts).toBe(scripts.detectScripts);
    expect(fonts.detectScriptsInParams).toBe(scripts.detectScriptsInParams);
    expect(fonts.findUnsupportedScripts).toBe(scripts.findUnsupportedScripts);
    expect(fonts.stripEmojiFromText).toBe(scripts.stripEmojiFromText);
    expect(fonts.stripEmojiFromParams).toBe(scripts.stripEmojiFromParams);
  });

  it("converts every registered template params schema via Zod 4 z.toJSONSchema without throwing", () => {
    expect(allTemplates.length).toBeGreaterThan(0);

    for (const template of allTemplates) {
      const jsonSchema = z.toJSONSchema(template.params, {
        io: "input",
        unrepresentable: "any",
      }) as {
        type?: string;
        properties?: Record<string, { type?: string; maxLength?: number }>;
      };

      expect(jsonSchema.type).toBe("object");
      expect(jsonSchema.properties).toBeDefined();
      expect(Object.keys(jsonSchema.properties ?? {}).length).toBeGreaterThan(
        0,
      );
    }
  });
});
