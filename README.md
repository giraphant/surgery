# Surge Config Merger

Raycast Extension for merging Surge configuration files. Syncs from a base config while preserving your custom sections.

## Installation

```bash
cd surge-config-merger
npm install
npm run dev
```

This will open Raycast and load the extension in development mode.

## Configuration

Open Raycast Preferences (Cmd+,) -> Extensions -> Surge Config Merger:

- **Base Config Path**: Path to the source config file (e.g., `~/surgery/Dler Cloud.conf`)
- **Mod Config Path**: Path to your modified config file (e.g., `~/surgery/Dler Mod.conf`)
- **Backup Before Merge**: Whether to create a backup before merging (recommended)

## Usage

1. Open Raycast
2. Type "Merge Surge Config"
3. Review the changes summary
4. Press Enter to apply the merge

## Custom Markers

To preserve your custom entries during merge, wrap them with markers:

```ini
# CUSTOM START
your custom content here
# CUSTOM END
```

### Example: [Proxy] Section

```ini
[Proxy]
Direct = direct
Block = reject

# CUSTOM START
# snell proxies (example - replace with your own)
DE = snell, your.server.ip, 12345, psk=your-psk, version=5, reuse=true, tfo=true
FR = snell, your.server.ip, 12345, psk=your-psk, version=5, reuse=true, tfo=true
US = snell, your.server.ip, 12345, psk=your-psk, version=5, reuse=true, tfo=true
JP = snell, your.server.ip, 12345, psk=your-psk, version=5, reuse=true, tfo=true
GB = snell, your.server.ip, 12345, psk=your-psk, version=5, reuse=true, tfo=true
# CUSTOM END

# Synced from base config
🇭🇰 香港 IEPL 01 = ss, ...
🇭🇰 香港 IEPL 02 = ss, ...
```

### Example: [Proxy Group] Section

Custom groups (like `Perps`) are automatically preserved. For other groups, their node lists will be updated from the base config.

```ini
[Proxy Group]
# CUSTOM START
Perps = select, JP, DE, FR, US, GB, DIRECT
# CUSTOM END

Proxy = select, Auto - Smart, ...
Domestic = select, Direct, Proxy, ...
```

### Example: [Rule] Section

```ini
[Rule]
# CUSTOM START
# My custom rules
DOMAIN-SUFFIX,mycompany.com,Direct
IP-CIDR,192.168.1.0/24,Direct
# CUSTOM END

# Synced from base config
RULE-SET,https://...,AdBlock
```

## Merge Behavior

| Section | Behavior |
|---------|----------|
| `[General]` | Kept as-is (usually contains `#!include`) |
| `[Proxy]` | Preserves `Direct`, `Block`, and custom entries. Syncs all other proxies from base. |
| `[Proxy Group]` | Preserves custom groups. Updates node lists for existing groups from base. |
| `[Rule]` | Preserves custom rules. Syncs from base. |
| `[URL Rewrite]` | Preserves custom rules. Syncs from base. |
| Other sections | Same custom marker logic |

## Tips

1. Always backup your config before first use
2. Put your custom entries at the TOP of each section (before synced content)
3. The extension will add a `# Synced from base config` comment before synced entries
4. Use `Cmd+P` in the extension to preview the full merged config before applying

## Troubleshooting

- **File not found**: Make sure the paths in preferences are correct. You can use `~` for home directory.
- **Merge conflicts**: Check that your `# CUSTOM START` and `# CUSTOM END` markers are properly matched.

