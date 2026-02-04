# MDNB Notebook Extension

This extension registers a custom notebook type for `.mdnb` files. It parses markdown with fenced code blocks into notebook cells and executes custom, language-specific actions without relying on Jupyter.

## Features

- Custom notebook type: `mdnb`
- Markdown and code cells parsed from fenced blocks
- Language-specific actions configured via `mdnb.languageActions`
- Per-language action button in the cell status bar

## Configuration

```json
{
  "mdnb.languageActions": {
    "javascript": "Run JavaScript action",
    "python": "Run Python action",
    "sql": "Run SQL action"
  }
}
```

Running a cell or selecting the cell action button uses the configured label for that language and writes it to the cell output.

## Release 1.0.0

To build and publish release `1.0.0`, use the VS Code Extension Manager (vsce):

```bash
npm install -g @vscode/vsce
vsce package
vsce publish 1.0.0
```
