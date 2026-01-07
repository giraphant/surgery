export type EntryType = "comment" | "entry" | "blank" | "custom-start" | "custom-end" | "header";

export interface Entry {
  type: EntryType;
  raw: string;
  name?: string;
  value?: string;
  isCustom?: boolean;
}

export interface Section {
  name: string;
  entries: Entry[];
}

export interface SurgeConfig {
  preamble: string[]; // Lines before first section (like #!MANAGED-CONFIG)
  sections: Section[];
}

export interface MergeResult {
  success: boolean;
  output: string;
  changes: SectionChange[];
}

export interface SectionChange {
  section: string;
  added: number;
  removed: number;
  unchanged: number;
}

export interface Preferences {
  baseConfigPath: string;
  modConfigPath: string;
  backupBeforeMerge: boolean;
}
