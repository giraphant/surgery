/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Base Config Path - Path to the base configuration file (e.g., Dler Cloud.conf) */
  "baseConfigPath": string,
  /** Mod Config Path - Path to your modified configuration file (e.g., Dler Mod.conf) */
  "modConfigPath": string,
  /** Backup Before Merge - Create a backup of the mod config before merging */
  "backupBeforeMerge": boolean
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `merge` command */
  export type Merge = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `merge` command */
  export type Merge = {}
}


