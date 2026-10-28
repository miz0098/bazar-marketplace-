import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {previewState} from './state.js';
import {previewGateway} from './gateway.js';
const state=previewState(),seller=process.argv[2]==='seller',port=seller?3001:3000,internal=seller?5001:5000,root=fileURLToPath(new URL('../../../',import.meta.url)),cwd=root+'apps/'+(seller?'seller-admin':'storefront');
const child=spawn(process.execPath,[cwd+'/node_modules/next/dist/bin/next','dev',...(seller?[]:['storefront-integration']),'--hostname','127.0.0.1','--port',String(internal)],{cwd,stdio:'inherit',env:{...process.env,NODE_ENV:'development'}});
const gateway=previewGateway({origin:seller?state.sellerOrigin:state.storefrontOrigin,key:Buffer.from(state.transportKey,'hex'),uiPort:internal,apiPort:4000});gateway.listen(port,'0.0.0.0',()=>process.stdout.write(`BAZAR ${seller?'Business':'Storefront'} preview port${port}; keep Codespaces port PRIVATE.\n`));
for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>{gateway.closeAllConnections();gateway.close();child.kill(signal);});child.on('exit',code=>{gateway.closeAllConnections();gateway.close();process.exitCode=code??1;});
