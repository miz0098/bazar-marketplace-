import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {previewState} from './state.js';
import {previewGateway} from './gateway.js';
const state=previewState(),name=process.argv[2],seller=name==='seller',staff=name==='staff',port=staff?3002:seller?3001:3000,internal=staff?5002:seller?5001:5000,appName=staff?'staff-crm':seller?'seller-admin':'storefront',origin=staff?state.staffOrigin:seller?state.sellerOrigin:state.storefrontOrigin,root=fileURLToPath(new URL('../../../',import.meta.url)),cwd=root+'apps/'+appName;
if(!['storefront','seller','staff'].includes(name))throw new Error('Preview frontend must be storefront, seller or staff');
const child=spawn(process.execPath,[cwd+'/node_modules/next/dist/bin/next','dev',...(name==='storefront'?['storefront-integration']:[]),'--hostname','127.0.0.1','--port',String(internal)],{cwd,stdio:'inherit',env:{...process.env,NODE_ENV:'development'}});
const gateway=previewGateway({origin,key:Buffer.from(state.transportKey,'hex'),uiPort:internal,apiPort:4000});gateway.listen(port,'0.0.0.0',()=>process.stdout.write(`BAZAR ${staff?'Staff':seller?'Business':'Storefront'} preview port${port}; keep Codespaces port PRIVATE.\n`));
for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>{gateway.closeAllConnections();gateway.close();child.kill(signal);});child.on('exit',code=>{gateway.closeAllConnections();gateway.close();process.exitCode=code??1;});
