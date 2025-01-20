import jamulusRpcInterface from './jamulusrpcclient/RPCmodule.mjs';
import express from 'express';
import path from 'path';
import {fileURLToPath} from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
process.chdir(__dirname);
const RPC = new jamulusRpcInterface(process.env.JSONRPCPORT || 8765, process.env.JSONRPCSECRETFILE || '/var/opt/jamulusRPCsecret.txt');
const app = express();
const port = 3000;
app.use(express.static('./public'));
let id = 0;

function parseNdJson(ndJson) {
    ndJson = ndJson.toString().split('\n');
    ndJson.pop();
    return ndJson;
}

app.get('/methodSelection', function(req, res) {
    let params = {};
    switch (req.query.method.split('/')[0]) {
        case 'jamulus':
            switch (req.query.method.split('/')[1]){
                case 'getMode':
                    break;
                case 'getVersion':
                    break;
                case 'getAvailableMethods':
                    break;
                default:
                    console.log('unknown method');
            }
            break;
        case 'jamulusclient':
            switch (req.query.method.split('/')[1]){
                case 'getChannelInfo':
                    break;
                case 'getClientInfo':
                    break;
                case 'getClientList':
                    break;
                case 'sendChatText':
                    params.chatText = req.query.params;
                    break;
                case 'setMuted':
                    if (req.query.params === 'true' || req.query.params == 1)
                    {
                        params.muted = true;
                    }
                    if (req.query.params === 'false' || req.query.params == 0)
                    {
                        params.muted = false;
                    }
                    break;
                case 'setName':
                    params.name = req.query.params;
                    break;
                case 'setSkillLevel':
                    params.skillLevel = req.query.params;
                    break;
                default:
                    console.log('unknown method');
            }
            break;
        case 'jamulusserver':
            switch (req.query.method.split('/')[1]){                   
                    case 'getClients':
                        break;
                    case 'getClientDetails':
                        break;
                    case 'getRecorderStatus':
                        break;
                    case 'getServerProfile':
                        break;
                    case 'setRecordingDirectory':
                        params.recordingDirectory = req.query.params;
                        break;
                    case 'setServerName':
                        params.serverName = req.query.params;
                        break;
                    case 'setStreamDestination':
                        params.strStreamDestination = req.query.params;
                        break;
                    case 'setWelcomeMessage':
                        params.welcomeMessage = req.query.params;
                        break;
                    case 'startRecording':
                        break;
                    case 'stopRecording':
                        break;
                    case 'restartRecording':
                        break;
                    case 'startStream':
                        break;
                    case 'stopStream':
                        break;
                    case 'toggleStream':
                        break;
                    case 'broadcastChatMessage':
                        params.chatMessage = req.query.params;
                        break;
                    default:
                        console.log('unknown method')
                };
                break;
        default:
            console.log('unknown method');
    }
        let request = `{"id":"${id}","jsonrpc":"2.0","method":"${req.query.method}","params":${JSON.stringify(params)}}\n`;
        RPC.jamRPCServer.write(request);
        res.end();
        id++;
});

app.get('/rpcNotifications', function(req, res) {
      res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
    });
      RPC.jamRPCServer.on('data', (data) => {
          data = parseNdJson(data);
          data.forEach ( row => {
              let parsed = JSON.parse(row);
              switch (parsed.method) {
                case 'jamulusclient/channelLevelListReceived':
                    res.write('event: levels\n');
                    break;
                case 'jamulusclient/chatTextReceived':
                    res.write('event: chat\n');
                    break;
                case 'jamulusclient/clientListReceived':
                    res.write('event: clients\n');
                    break;
                default:
                    break;
            }
        })
          res.write('data: ' + data.toString() + '\n\n');
    });
})

app.get('/menuNotifications', function(req, res) {
    let menu = '<form action="" method="get" onsubmit="fetchget(); return false;"><input id="params" type="text" /><select id="method" name="method" onchange="fetchget(); return false;"><option>select method...</option>';
      RPC.AvailableMethods.forEach( row => {
          menu += '<option value="' + row +  '">' + row + '</option>';
    });
      menu += '</select></form>';
      res.send(menu);
})

app.listen(port, '127.0.0.1', () => console.log('SSE app listening on port ' + port));
