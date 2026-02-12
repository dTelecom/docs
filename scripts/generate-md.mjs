#!/usr/bin/env node
/**
 * Post-build script: generates clean .md files from .mdx sources
 * so that `curl https://docs.dtelecom.org/guides/getting-started.md`
 * returns readable markdown instead of HTML.
 *
 * Also generates an index at /docs.md listing all available pages.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";

const DOCS_DIR = join(dirname(new URL(import.meta.url).pathname), "..", "docs");
const BUILD_DIR = join(dirname(new URL(import.meta.url).pathname), "..", "build");

// Map of source files → output paths (relative to build/)
const pages = [
  { src: "index.mdx", out: "index.md" },
  { src: "guides/0-getting-started.mdx", out: "guides/getting-started.md" },
  { src: "guides/0a-architecture.mdx", out: "guides/architecture.md" },
  { src: "guides/1-access-tokens.mdx", out: "guides/access-tokens.md" },
  { src: "guides/2-server-api.mdx", out: "guides/server-api.md" },
  { src: "guides/3-webhooks.mdx", out: "guides/webhooks.md" },
  { src: "guides/4-conference-app.mdx", out: "guides/conference-app.md" },
  { src: "guides/room/connect.mdx", out: "guides/room/connect.md" },
  { src: "guides/room/publish.mdx", out: "guides/room/publish.md" },
  { src: "guides/room/receive.mdx", out: "guides/room/receive.md" },
  { src: "guides/room/data.mdx", out: "guides/room/data.md" },
  { src: "references/client-sdks.md", out: "references/client-sdks.md" },
  { src: "references/server-sdks.md", out: "references/server-sdks.md" },
];

function stripMdx(content) {
  // Remove frontmatter
  content = content.replace(/^---[\s\S]*?---\n*/m, "");

  // Remove import statements
  content = content.replace(/^import\s+.*?;\s*$/gm, "");

  // Convert <Tabs>/<TabItem> to plain markdown
  content = content.replace(/<Tabs[\s\S]*?>/g, "");
  content = content.replace(/<\/Tabs>/g, "");
  content = content.replace(/<TabItem\s+value="([^"]*)"[^>]*>/g, "**$1:**\n");
  content = content.replace(/<\/TabItem>/g, "");

  // Convert Docusaurus admonitions (:::note, :::caution, :::tip, etc.)
  content = content.replace(
    /^:::(note|tip|info|caution|danger|warning)(\s+.*)?$/gm,
    (_, type, title) => {
      const label = title ? title.trim() : type.charAt(0).toUpperCase() + type.slice(1);
      return `> **${label}**`;
    }
  );
  content = content.replace(/^:::$/gm, "");

  // Convert admonition body lines to blockquotes (lines between ::: markers)
  // This is a simplified approach — indent lines after > **Label** until next blank line
  const lines = content.split("\n");
  const result = [];
  let inAdmonition = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("> **") && !line.startsWith("> **IMPORTANT")) {
      inAdmonition = true;
      result.push(line);
      continue;
    }
    if (inAdmonition) {
      if (line.trim() === "" && (i + 1 >= lines.length || !lines[i + 1].startsWith(">"))) {
        inAdmonition = false;
        result.push("");
      } else {
        result.push(line.startsWith(">") ? line : `> ${line}`);
      }
      continue;
    }
    result.push(line);
  }
  content = result.join("\n");

  // Remove any remaining JSX-like tags that aren't standard markdown
  content = content.replace(/<div\s+className="[^"]*">/g, "");
  content = content.replace(/<\/div>/g, "");

  // Clean up excessive blank lines
  content = content.replace(/\n{3,}/g, "\n\n");

  return content.trim() + "\n";
}

// Generate individual .md files
let generated = 0;
for (const page of pages) {
  const srcPath = join(DOCS_DIR, page.src);
  if (!existsSync(srcPath)) {
    console.warn(`  SKIP: ${page.src} (not found)`);
    continue;
  }

  const raw = readFileSync(srcPath, "utf-8");

  // Extract title from frontmatter
  const titleMatch = raw.match(/^---[\s\S]*?title:\s*(.+?)[\s]*$/m);
  const title = titleMatch ? titleMatch[1].replace(/['"]/g, "") : "";

  let md = stripMdx(raw);
  if (title && !md.startsWith(`# ${title}`)) {
    md = `# ${title}\n\n${md}`;
  }

  const outPath = join(BUILD_DIR, page.out);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, md);
  generated++;
}

// Generate docs.md index
const BASE_URL = "https://docs.dtelecom.org";
let index = `# dTelecom Documentation (Markdown)\n\n`;
index += `These markdown files are available for AI agents, curl, and other non-browser tools.\n\n`;
index += `For the full documentation in a single file, see: [llms-full.txt](${BASE_URL}/llms-full.txt)\n\n`;
index += `## Pages\n\n`;

for (const page of pages) {
  const srcPath = join(DOCS_DIR, page.src);
  if (!existsSync(srcPath)) continue;
  const raw = readFileSync(srcPath, "utf-8");
  const titleMatch = raw.match(/^---[\s\S]*?title:\s*(.+?)[\s]*$/m);
  const title = titleMatch ? titleMatch[1].replace(/['"]/g, "") : page.out.replace(".md", "");
  index += `- [${title}](${BASE_URL}/${page.out})\n`;
}

writeFileSync(join(BUILD_DIR, "docs.md"), index);

console.log(`Generated ${generated} markdown files + docs.md index`);
