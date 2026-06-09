import jamulusRpcInterface from './jamulusrpcclient/RPCmodule.mjs';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { EventEmitter } from 'events';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
process.chdir(__dirname);

// Initialisierung des RPC-Clients
const RPC = new jamulusRpcInterface(
    process.env.JSONRPCPORT || 8765, 
    process.env.JSONRPCSECRETFILE || '/var/opt/jamulusRPCsecret.txt'
);

const app = express();
const port = 3000;

// Zentraler Hub für die Nachrichtenverteilung
const messageHub = new EventEmitter();
let id = 0;

/**
 * Sichereres NDJSON Parsing: 
 * Sammelt Daten und teilt sie nur bei Zeilenumbrüchen.
 */
function parseNdJson(data) {
    return data.toString()
               .split('\n')
               .filter(line => line.trim() !== "");
}

// --- GLOBALER LISTENER ---
// Dieser Listener existiert genau EINMAL für die gesamte Laufzeit des Programms.
RPC.jamRPCServer.on('data', (data) => {
    const rows = parseNdJson(data);
    rows.forEach(row => {
        try {
            const parsed = JSON.parse(row);
            // Sende die Nachricht an alle internen "Abonnenten" (offene SSE-Tabs)
            messageHub.emit('rpcUpdate', parsed);
        } catch (e) {
            console.error("JSON Parse Error:", e.message, "Raw:", row);
        }
    });
});

// Fehlerbehandlung für den RPC-Socket (wichtig für Server-Stabilität)
RPC.jamRPCServer.on('error', (err) => {
    console.error("Kritischer RPC Socket Fehler:", err.message);
});

app.use(express.static('./public'));

// Methode ausführen (Bleibt funktional gleich, aber sauberer strukturiert)
app.get('/methodSelection', function(req, res) {
    let params = {};
    const [category, method] = req.query.method.split('/');

    switch (category) {
        case 'jamulus':
            // Keine speziellen Params nötig
            break;
        case 'jamulusclient':
            switch (method) {
                case 'sendChatText': params.chatText = req.query.params; break;
                case 'setMuted': params.muted = (req.query.params === 'true' || req.query.params == 1); break;
                case 'setName': params.name = req.query.params; break;
                case 'setSkillLevel': params.skillLevel = req.query.params; break;
            }
            break;
        case 'jamulusserver':
            switch (method) {
                case 'setRecordingDirectory': params.recordingDirectory = req.query.params; break;
                case 'setServerName': params.serverName = req.query.params; break;
                case 'setStreamDestination': params.strStreamDestination = req.query.params; break;
                case 'setWelcomeMessage': params.welcomeMessage = req.query.params; break;
                case 'broadcastChatMessage': params.chatMessage = req.query.params; break;
                case 'privateChatMessage': params.chatMessage = req.query.params; params.id = parseInt(req.query.id, 10); break;
            }
            break;
    }

    const request = JSON.stringify({
        id: id.toString(),
        jsonrpc: "2.0",
        method: req.query.method,
        params: params
    }) + "\n";

    RPC.jamRPCServer.write(request);
    res.end();
    id++;
});

// --- SSE NOTIFICATIONS (REFACTORED) ---
app.get('/rpcNotifications', function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    // Diese Funktion leitet Daten an genau DIESEN HTTP-Response weiter
    const onRpcUpdate = (parsed) => {
        switch (parsed.method) {
            case 'jamulusclient/channelLevelListReceived':
                res.write('event: levels\ndata: {}\n\n');
                break;
            case 'jamulusclient/chatTextReceived':
                res.write('event: chat\ndata: ' + JSON.stringify(parsed.params) + '\n\n');
                break;
            case 'jamulusclient/clientListReceived':
                res.write('event: clients\ndata: ' + JSON.stringify(parsed.params) + '\n\n');
                break;
            default:
                // Leitet alle anderen Nachrichten (z.B. clientDisconnected) weiter
                res.write('data: ' + JSON.stringify(parsed) + '\n\n');
                break;
        }
    };

    // Registriere den Listener beim Hub
    messageHub.on('rpcUpdate', onRpcUpdate);

    // Wenn der Client (Browser) die Verbindung trennt: Aufräumen!
    req.on('close', () => {
        messageHub.removeListener('rpcUpdate', onRpcUpdate);
    });
});

app.get('/menuNotifications', function(req, res) {
    let menu = '<form action="" method="get" onsubmit="fetchget(); return false;"><input id="params" type="text" /><select id="method" name="method" onchange="fetchget(); return false;"><option>select method...</option>';
    RPC.AvailableMethods.forEach(row => {
        menu += '<option value="' + row + '">' + row + '</option>';
    });
    menu += '</select></form>';
    res.send(menu);
});

app.listen(port, '127.0.0.1', () => console.log('SSE app listening on port ' + port));
