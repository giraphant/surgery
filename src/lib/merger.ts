import { Entry, MergeResult, Section, SectionChange, SurgeConfig } from "./types";
import { getSection, parseConfig, serializeConfig, getProxyNames } from "./parser";

// Sections that should be synced from base config
const SYNCABLE_SECTIONS = ["Proxy", "Proxy Group", "Rule", "URL Rewrite", "Script", "Panel", "Host"];

// Special entries in [Proxy] that should always be preserved
const PRESERVED_PROXY_NAMES = ["Direct", "Block"];

export function mergeConfigs(baseConfig: SurgeConfig, modConfig: SurgeConfig): MergeResult {
  const changes: SectionChange[] = [];
  const resultSections: Section[] = [];

  // Process each section in mod config
  for (const modSection of modConfig.sections) {
    const baseSection = getSection(baseConfig, modSection.name);

    if (SYNCABLE_SECTIONS.includes(modSection.name) && baseSection) {
      // This section should be synced
      const { mergedSection, change } = mergeSection(modSection, baseSection);
      resultSections.push(mergedSection);
      changes.push(change);
    } else {
      // Keep mod section as-is (e.g., [General] with #!include)
      resultSections.push(modSection);
      changes.push({
        section: modSection.name,
        added: 0,
        removed: 0,
        unchanged: modSection.entries.length,
      });
    }
  }

  // Check for new sections in base that don't exist in mod
  for (const baseSection of baseConfig.sections) {
    if (!getSection(modConfig, baseSection.name)) {
      // New section from base - add it
      resultSections.push(baseSection);
      changes.push({
        section: baseSection.name,
        added: baseSection.entries.length,
        removed: 0,
        unchanged: 0,
      });
    }
  }

  const resultConfig: SurgeConfig = {
    preamble: modConfig.preamble, // Keep mod's preamble
    sections: resultSections,
  };

  return {
    success: true,
    output: serializeConfig(resultConfig),
    changes,
  };
}

function mergeSection(modSection: Section, baseSection: Section): { mergedSection: Section; change: SectionChange } {
  if (modSection.name === "Proxy") {
    return mergeProxySection(modSection, baseSection);
  } else if (modSection.name === "Proxy Group") {
    return mergeProxyGroupSection(modSection, baseSection);
  } else {
    return mergeGenericSection(modSection, baseSection);
  }
}

function mergeProxySection(modSection: Section, baseSection: Section): { mergedSection: Section; change: SectionChange } {
  const result: Entry[] = [];
  let added = 0;
  let removed = 0;
  let unchanged = 0;

  // 1. First, add preserved entries (Direct, Block) from mod
  for (const entry of modSection.entries) {
    if (entry.type === "entry" && PRESERVED_PROXY_NAMES.includes(entry.name || "")) {
      result.push(entry);
      unchanged++;
    }
  }

  // 2. Add blank line after preserved entries
  result.push({ type: "blank", raw: "" });

  // 3. Collect all custom entries (between CUSTOM START and CUSTOM END markers)
  let inCustomBlock = false;
  let hasCustomBlock = false;

  for (const entry of modSection.entries) {
    if (entry.type === "custom-start") {
      inCustomBlock = true;
      hasCustomBlock = true;
      result.push(entry);
    } else if (entry.type === "custom-end") {
      inCustomBlock = false;
      result.push(entry);
    } else if (inCustomBlock) {
      result.push(entry);
      unchanged++;
    }
  }

  // 4. Add blank line and sync comment if we have custom block
  if (hasCustomBlock) {
    result.push({ type: "blank", raw: "" });
  }
  result.push({ type: "comment", raw: "# Synced from base config" });

  // 5. Add all proxy entries from base (except Direct/Block)
  const modProxyNames = new Set(getProxyNames(modSection));

  for (const entry of baseSection.entries) {
    if (entry.type === "entry" && !PRESERVED_PROXY_NAMES.includes(entry.name || "")) {
      result.push(entry);
      if (modProxyNames.has(entry.name || "")) {
        unchanged++;
      } else {
        added++;
      }
    }
  }

  // Count removed entries (entries in mod but not in base, excluding custom and preserved)
  const baseProxyNames = new Set(getProxyNames(baseSection));
  for (const entry of modSection.entries) {
    if (
      entry.type === "entry" &&
      !entry.isCustom &&
      !PRESERVED_PROXY_NAMES.includes(entry.name || "") &&
      !baseProxyNames.has(entry.name || "")
    ) {
      removed++;
    }
  }

  return {
    mergedSection: { name: "Proxy", entries: result },
    change: { section: "Proxy", added, removed, unchanged },
  };
}

function mergeProxyGroupSection(modSection: Section, baseSection: Section): { mergedSection: Section; change: SectionChange } {
  const result: Entry[] = [];
  let added = 0;
  let removed = 0;
  let unchanged = 0;

  // Get available proxy names from base config's Proxy Group section
  // to update the node lists in non-custom groups
  const baseGroups = new Map<string, Entry>();
  for (const entry of baseSection.entries) {
    if (entry.type === "entry" && entry.name) {
      baseGroups.set(entry.name, entry);
    }
  }

  // Process mod section
  let inCustomBlock = false;

  for (const entry of modSection.entries) {
    if (entry.type === "custom-start") {
      inCustomBlock = true;
      result.push(entry);
      continue;
    }
    if (entry.type === "custom-end") {
      inCustomBlock = false;
      result.push(entry);
      continue;
    }

    if (inCustomBlock) {
      // Keep custom entries as-is
      result.push(entry);
      unchanged++;
    } else if (entry.type === "entry" && entry.name) {
      // Check if this group exists in base
      const baseGroup = baseGroups.get(entry.name);
      if (baseGroup) {
        // Use base group's content (updated node list)
        result.push(baseGroup);
        unchanged++;
        baseGroups.delete(entry.name); // Mark as processed
      } else {
        // This is a custom group (like "Perps") - keep it
        result.push(entry);
        unchanged++;
      }
    } else {
      // Comments, blanks, etc.
      result.push(entry);
    }
  }

  // Add any new groups from base that weren't in mod
  for (const [name, entry] of baseGroups) {
    result.push(entry);
    added++;
  }

  return {
    mergedSection: { name: "Proxy Group", entries: result },
    change: { section: "Proxy Group", added, removed, unchanged },
  };
}

function mergeGenericSection(modSection: Section, baseSection: Section): { mergedSection: Section; change: SectionChange } {
  const result: Entry[] = [];
  let added = 0;
  let removed = 0;
  let unchanged = 0;

  // Check if mod section has custom markers
  const hasCustomBlock = modSection.entries.some((e) => e.type === "custom-start");

  if (hasCustomBlock) {
    // Keep custom entries, sync the rest from base
    let inCustomBlock = false;

    for (const entry of modSection.entries) {
      if (entry.type === "custom-start") {
        inCustomBlock = true;
        result.push(entry);
      } else if (entry.type === "custom-end") {
        inCustomBlock = false;
        result.push(entry);
      } else if (inCustomBlock) {
        result.push(entry);
        unchanged++;
      }
    }

    // Add sync marker and base content
    result.push({ type: "blank", raw: "" });
    result.push({ type: "comment", raw: "# Synced from base config" });

    for (const entry of baseSection.entries) {
      result.push(entry);
      added++;
    }
  } else {
    // No custom block - just use base content entirely
    for (const entry of baseSection.entries) {
      result.push(entry);
    }
    added = baseSection.entries.filter((e) => e.type === "entry").length;
    removed = modSection.entries.filter((e) => e.type === "entry").length;
  }

  return {
    mergedSection: { name: modSection.name, entries: result },
    change: { section: modSection.name, added, removed, unchanged },
  };
}

export function generateDiffSummary(changes: SectionChange[]): string {
  const lines: string[] = ["Merge Summary:", ""];

  let totalAdded = 0;
  let totalRemoved = 0;

  for (const change of changes) {
    if (change.added > 0 || change.removed > 0) {
      lines.push(`[${change.section}]`);
      if (change.added > 0) lines.push(`  + ${change.added} added`);
      if (change.removed > 0) lines.push(`  - ${change.removed} removed`);
      lines.push(`  = ${change.unchanged} unchanged`);
      lines.push("");
    }
    totalAdded += change.added;
    totalRemoved += change.removed;
  }

  lines.push(`Total: +${totalAdded} / -${totalRemoved}`);

  return lines.join("\n");
}
