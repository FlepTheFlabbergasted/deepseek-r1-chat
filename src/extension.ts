// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import ollama from 'ollama';
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "deepseek-r1-chat" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('deepseek-r1-chat.chat', () => {
		const panel = vscode.window.createWebviewPanel(
			'deepseekChat',
			'DeepSeek Chat',
			vscode.ViewColumn.One,
			{ enableScripts: true }
		);

    panel.webview.html = getWebviewContent();

    let isThereAnOngoingResponse = false;
    let didUserClickStop = false;

    panel.webview.onDidReceiveMessage(async (message: any) => {
      if(message.command === 'chat' && message.text && !isThereAnOngoingResponse) {
        const userPrompt = message.text;
        let responseText = '';

        isThereAnOngoingResponse = true;

        try {
          panel.webview.postMessage({ command: 'loading' });
          panel.webview.postMessage({ command: 'responding' });

          const streamResponse = await ollama.chat({
            model: 'deepseek-r1:14b',
            messages: [{ role: 'user', content: userPrompt }],
            stream: true,
            keep_alive: '10m',
          });

          for await (const part of streamResponse) {
            responseText += part.message.content;
            panel.webview.postMessage({ command: 'chatResponse', text: responseText });

            if(didUserClickStop) {
              streamResponse.abort();
            }
          }
        } catch(error) {
          if(!didUserClickStop){
            panel.webview.postMessage({ command: 'chatResponse', text: `${String(error)}` });
          }
        } finally {
          panel.webview.postMessage({ command: 'doneResponding' });
          isThereAnOngoingResponse = false;
          didUserClickStop = false;
        }
      } else if(message.command === 'stop' && isThereAnOngoingResponse) {
        didUserClickStop = true;
      }
    });
	});

	context.subscriptions.push(disposable);
}

function getWebviewContent(): string {
  return /*html*/`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <link href="https://fonts.cdnfonts.com/css/segoe-ui-4" rel="stylesheet">

      <style>
        *,
        *::before,
        *::after {
          box-sizing: border-box;
        }
        body, html {
          color: rgb(255, 255, 255);
          font-size: 14px;
          font-family: 'Segoe UI', sans-serif;
          margin: 2em;
        }
        #prompt, #response, #askBtn, #stopBtn {
          color: inherit;
          font-size: inherit;
          font-family: inherit;
          border-radius: 4px;
        }
        #prompt {
          width: 100%;
          resize: vertical;
          outline: none;
          border: none;
          padding: 1em;
          margin-bottom: 0.5em;
          background: #313131;
          box-shadow: inset 0px 0px 1px 1px rgba(75, 75, 75, 0.6);
        }
        #askBtn, #stopBtn {
          background: #387bcf;
          padding: 0.5em 2em;
          border: none;
          outline: none;
          margin-right: 0.5em;
        }
        #askBtn:hover, #stopBtn:hover, #askBtn:active, #stopBtn:active {
          background:rgb(38, 99, 173);
        }
        #askBtn:disabled, #stopBtn:disabled {
          background:rgb(78, 81, 85);
        }
        #askBtn:disabled:hover, #stopBtn:disabled:hover {
          cursor: not-allowed;
        }
        #response {
          color: inherit;
          font-family: inherit;
          margin-top: 2em;
          width: 100ch;
        }
        #response:empty {
          display: none;
        }
      </style>
    </head>
    <body>
      <h2>DeepSeek R1 VS Code Extension</h2>
      <textarea id="prompt" rows="3" placeholder="Ask DeepSeek anything!"></textarea>
      <button id="askBtn">Ask</button>
      <button id="stopBtn">Stop</button>
      <div id="response"></div>

      <script>
        const vscode = acquireVsCodeApi();
        let isShiftKeyHeld = false;

        function sendText() {
          const text = document.getElementById('prompt').value;
          vscode.postMessage({ command: 'chat', text });
        }

        document.getElementById('askBtn').addEventListener('click', () => {
          sendText();
        });

        document.getElementById('stopBtn').addEventListener('click', () => {
          vscode.postMessage({ command: 'stop' });
        });
        
        window.addEventListener('keydown', (event) => {
          const eventKey = event.key?.toLowerCase();

          if(eventKey === 'shift') {
            isShiftKeyHeld = true;
          } else if(!isShiftKeyHeld && eventKey === 'enter' && !document.getElementById('askBtn').hasAttribute('disabled', true)) {
            event.preventDefault();
            sendText();
            isShiftKeyHeld = false;
          }
        });

        window.addEventListener('keyup', (event) => {
          const eventKey = event.key?.toLowerCase();

          if(eventKey === 'shift') {
            isShiftKeyHeld = false;
          }
        });

        window.addEventListener('message', (event) => {
          const { command, text } = event.data;

          if(command === 'loading') {
            document.getElementById('response').innerText = 'Loading...';
          }

          if(command === 'responding') {
            document.getElementById('askBtn').setAttribute('disabled', true);
          }

          if(command === 'doneResponding') {
            document.getElementById('askBtn').removeAttribute('disabled');
          }

          if(command === 'chatResponse') {
            document.getElementById('response').innerText = text;
          }
        });

        window.addEventListener('load', () => {
          document.getElementById('prompt').focus();
        });
      </script>
    </body>
    </html>
  `;
}

// This method is called when your extension is deactivated
export function deactivate() {}