const vscode = require('vscode');

const NOTEBOOK_TYPE = 'mdnb';
const RUN_LANGUAGE_ACTION_COMMAND = 'mdnb.runLanguageAction';

class MdnbSerializer {
  deserializeNotebook(content) {
    const raw = new TextDecoder().decode(content);
    const cells = parseMarkdownToCells(raw);
    return new vscode.NotebookData(cells);
  }

  serializeNotebook(data) {
    const text = serializeCellsToMarkdown(data.cells);
    return new TextEncoder().encode(text);
  }
}

function parseMarkdownToCells(text) {
  const cells = [];
  const regex = /```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const markdown = text.slice(lastIndex, match.index);
      if (markdown.trim().length > 0) {
        cells.push(new vscode.NotebookCellData(vscode.NotebookCellKind.Markup, markdown, 'markdown'));
      }
    }

    const language = match[1] || 'plaintext';
    const code = match[2].replace(/\n$/, '');
    const cell = new vscode.NotebookCellData(vscode.NotebookCellKind.Code, code, language);
    cell.metadata = { mdnb: { language } };
    cells.push(cell);

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    const markdown = text.slice(lastIndex);
    if (markdown.trim().length > 0) {
      cells.push(new vscode.NotebookCellData(vscode.NotebookCellKind.Markup, markdown, 'markdown'));
    }
  }

  if (cells.length === 0) {
    cells.push(new vscode.NotebookCellData(vscode.NotebookCellKind.Markup, '', 'markdown'));
  }

  return cells;
}

function serializeCellsToMarkdown(cells) {
  const parts = [];
  cells.forEach((cell) => {
    if (cell.kind === vscode.NotebookCellKind.Markup) {
      parts.push(cell.value);
    } else {
      const language = cell.languageId || 'plaintext';
      parts.push(`\`\`\`${language}\n${cell.value}\n\`\`\``);
    }
  });
  return parts.join('\n');
}

function createOutput(message) {
  return new vscode.NotebookCellOutput([
    vscode.NotebookCellOutputItem.text(message)
  ]);
}

function getActionLabel(actionMap, language) {
  return actionMap[language] || `Run ${language} action`;
}

function activate(context) {
  const serializer = new MdnbSerializer();
  context.subscriptions.push(
    vscode.workspace.registerNotebookSerializer(NOTEBOOK_TYPE, serializer, {
      transientOutputs: false
    })
  );

  const controller = vscode.notebooks.createNotebookController(
    'mdnb-controller',
    NOTEBOOK_TYPE,
    'MDNB Custom Actions'
  );

  controller.supportedLanguages = ['javascript', 'python', 'sql', 'plaintext'];
  controller.executeHandler = async (cells) => {
    const config = vscode.workspace.getConfiguration('mdnb');
    const actionMap = config.get('languageActions') || {};

    for (const cell of cells) {
      const language = cell.document.languageId || 'plaintext';
      const label = getActionLabel(actionMap, language);
      const message = `${label}\n\nCell content:\n${cell.document.getText()}`;

      const execution = controller.createNotebookCellExecution(cell);
      execution.start(Date.now());
      execution.clearOutput();
      execution.appendOutput([createOutput(message)]);
      execution.end(true, Date.now());
    }
  };

  const statusBarProvider = {
    provideCellStatusBarItems(cell) {
      if (cell.kind !== vscode.NotebookCellKind.Code) {
        return [];
      }

      const config = vscode.workspace.getConfiguration('mdnb');
      const actionMap = config.get('languageActions') || {};
      const language = cell.document.languageId || 'plaintext';
      const label = getActionLabel(actionMap, language);

      const item = new vscode.NotebookCellStatusBarItem(label, vscode.NotebookCellStatusBarAlignment.Right);
      item.command = {
        command: RUN_LANGUAGE_ACTION_COMMAND,
        title: label,
        arguments: [cell]
      };
      return [item];
    }
  };

  context.subscriptions.push(
    vscode.notebooks.registerNotebookCellStatusBarItemProvider(NOTEBOOK_TYPE, statusBarProvider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(RUN_LANGUAGE_ACTION_COMMAND, async (cell) => {
      if (!cell) {
        return;
      }
      await controller.executeHandler([cell]);
    })
  );

  context.subscriptions.push(controller);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
