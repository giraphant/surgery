import { Entry, Section, SurgeConfig } from "./types";

const CUSTOM_START_MARKER = "# CUSTOM START";
const CUSTOM_END_MARKER = "# CUSTOM END";

export function parseConfig(content: string): SurgeConfig {
  const lines = content.split("\n");
  const sections: Section[] = [];
  const preamble: string[] = [];

  let currentSection: Section | null = null;
  let inCustomBlock = false;

  for (const line of lines) {
    // Check for section header: [SectionName]
    const sectionMatch = line.match(/^\[(.+)\]$/);

    if (sectionMatch) {
      // Save previous section
      if (currentSection) {
        sections.push(currentSection);
      }
      // Start new section
      currentSection = {
        name: sectionMatch[1],
        entries: [],
      };
      inCustomBlock = false;
      continue;
    }

    // If no section yet, add to preamble
    if (!currentSection) {
      preamble.push(line);
      continue;
    }

    // Check for custom markers
    const trimmedLine = line.trim();

    if (trimmedLine === CUSTOM_START_MARKER) {
      currentSection.entries.push({
        type: "custom-start",
        raw: line,
      });
      inCustomBlock = true;
      continue;
    }

    if (trimmedLine === CUSTOM_END_MARKER) {
      currentSection.entries.push({
        type: "custom-end",
        raw: line,
      });
      inCustomBlock = false;
      continue;
    }

    // Check for blank line
    if (trimmedLine === "") {
      currentSection.entries.push({
        type: "blank",
        raw: line,
        isCustom: inCustomBlock,
      });
      continue;
    }

    // Check for comment
    if (trimmedLine.startsWith("#")) {
      currentSection.entries.push({
        type: "comment",
        raw: line,
        isCustom: inCustomBlock,
      });
      continue;
    }

    // Parse entry: Name = Value
    // Surge config uses "=" to separate name and value
    // The name can contain spaces and special characters (like emoji)
    const equalsIndex = line.indexOf("=");
    if (equalsIndex > 0) {
      const name = line.substring(0, equalsIndex).trim();
      const value = line.substring(equalsIndex + 1).trim();

      currentSection.entries.push({
        type: "entry",
        raw: line,
        name,
        value,
        isCustom: inCustomBlock,
      });
      continue;
    }

    // Fallback: treat as comment/unknown
    currentSection.entries.push({
      type: "comment",
      raw: line,
      isCustom: inCustomBlock,
    });
  }

  // Don't forget the last section
  if (currentSection) {
    sections.push(currentSection);
  }

  return { preamble, sections };
}

export function serializeConfig(config: SurgeConfig): string {
  const lines: string[] = [];

  // Add preamble
  lines.push(...config.preamble);

  // Add sections
  for (const section of config.sections) {
    lines.push(`[${section.name}]`);
    for (const entry of section.entries) {
      lines.push(entry.raw);
    }
  }

  return lines.join("\n");
}

export function getSection(config: SurgeConfig, name: string): Section | undefined {
  return config.sections.find((s) => s.name === name);
}

export function getProxyNames(section: Section): string[] {
  return section.entries
    .filter((e) => e.type === "entry" && e.name)
    .map((e) => e.name!);
}

export function getCustomEntries(section: Section): Entry[] {
  return section.entries.filter((e) => e.isCustom || e.type === "custom-start" || e.type === "custom-end");
}

export function getNonCustomEntries(section: Section): Entry[] {
  return section.entries.filter((e) => !e.isCustom && e.type !== "custom-start" && e.type !== "custom-end");
}
