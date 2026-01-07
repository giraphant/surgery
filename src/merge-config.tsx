import {
  Action,
  ActionPanel,
  Detail,
  getPreferenceValues,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  openExtensionPreferences,
} from "@raycast/api";
import { useState, useEffect } from "react";
import * as fs from "fs";
import * as path from "path";
import { parseConfig } from "./lib/parser";
import { mergeConfigs, generateDiffSummary } from "./lib/merger";
import { Preferences, MergeResult } from "./lib/types";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mergeResult, setMergeResult] = useState<MergeResult | null>(null);
  const [baseConfigName, setBaseConfigName] = useState("");
  const [modConfigName, setModConfigName] = useState("");

  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    loadAndPreviewMerge();
  }, []);

  async function loadAndPreviewMerge() {
    try {
      setIsLoading(true);
      setError(null);

      const { baseConfigPath, modConfigPath } = preferences;

      // Validate paths
      if (!baseConfigPath || !modConfigPath) {
        setError("Please configure the config file paths in extension preferences.");
        setIsLoading(false);
        return;
      }

      // Expand ~ to home directory
      const expandPath = (p: string) => p.replace(/^~/, process.env.HOME || "");
      const basePath = expandPath(baseConfigPath);
      const modPath = expandPath(modConfigPath);

      // Check if files exist
      if (!fs.existsSync(basePath)) {
        setError(`Base config file not found: ${basePath}`);
        setIsLoading(false);
        return;
      }
      if (!fs.existsSync(modPath)) {
        setError(`Mod config file not found: ${modPath}`);
        setIsLoading(false);
        return;
      }

      setBaseConfigName(path.basename(basePath));
      setModConfigName(path.basename(modPath));

      // Read and parse configs
      const baseContent = fs.readFileSync(basePath, "utf-8");
      const modContent = fs.readFileSync(modPath, "utf-8");

      const baseConfig = parseConfig(baseContent);
      const modConfig = parseConfig(modContent);

      // Perform merge preview
      const result = mergeConfigs(baseConfig, modConfig);
      setMergeResult(result);
      setIsLoading(false);
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
      setIsLoading(false);
    }
  }

  async function executeMerge() {
    if (!mergeResult) return;

    try {
      const { modConfigPath, backupBeforeMerge } = preferences;
      const modPath = modConfigPath.replace(/^~/, process.env.HOME || "");

      // Confirm with user
      const confirmed = await confirmAlert({
        title: "Apply Merge?",
        message: `This will update ${path.basename(modPath)} with the merged configuration.`,
        primaryAction: {
          title: "Apply",
          style: Alert.ActionStyle.Default,
        },
        dismissAction: {
          title: "Cancel",
        },
      });

      if (!confirmed) return;

      // Create backup if enabled
      if (backupBeforeMerge) {
        const backupPath = `${modPath}.backup.${Date.now()}`;
        fs.copyFileSync(modPath, backupPath);
        await showToast({
          style: Toast.Style.Success,
          title: "Backup created",
          message: path.basename(backupPath),
        });
      }

      // Write merged config
      fs.writeFileSync(modPath, mergeResult.output, "utf-8");

      await showToast({
        style: Toast.Style.Success,
        title: "Merge completed",
        message: `${modConfigName} has been updated`,
      });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Merge failed",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (error) {
    return (
      <Detail
        markdown={`# Error\n\n${error}`}
        actions={
          <ActionPanel>
            <Action title="Open Preferences" onAction={openExtensionPreferences} />
            <Action title="Retry" onAction={loadAndPreviewMerge} />
          </ActionPanel>
        }
      />
    );
  }

  if (isLoading) {
    return <Detail isLoading={true} markdown="Loading configurations..." />;
  }

  const diffSummary = mergeResult ? generateDiffSummary(mergeResult.changes) : "";

  const markdown = `# Surge Config Merge Preview

## Files
- **Base**: ${baseConfigName}
- **Target**: ${modConfigName}

## Changes
\`\`\`
${diffSummary}
\`\`\`

---

**Actions:**
- Press **Enter** to apply the merge
- Press **Cmd+P** to preview the full merged config
- Press **Cmd+,** to change settings
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Apply Merge" onAction={executeMerge} />
          <Action.CopyToClipboard
            title="Copy Merged Config"
            content={mergeResult?.output || ""}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.Push
            title="Preview Full Config"
            shortcut={{ modifiers: ["cmd"], key: "p" }}
            target={
              <Detail
                markdown={`# Merged Configuration Preview\n\n\`\`\`ini\n${mergeResult?.output || ""}\n\`\`\``}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy to Clipboard" content={mergeResult?.output || ""} />
                  </ActionPanel>
                }
              />
            }
          />
          <Action title="Reload" onAction={loadAndPreviewMerge} shortcut={{ modifiers: ["cmd"], key: "r" }} />
          <Action title="Open Preferences" onAction={openExtensionPreferences} shortcut={{ modifiers: ["cmd"], key: "," }} />
        </ActionPanel>
      }
    />
  );
}
