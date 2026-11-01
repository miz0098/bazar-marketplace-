import {createServer} from 'node:http';
import {request} from 'node:https';
/** An exact platform origin, never inferred from request headers. */
export function codespacesOrigin(env:Readonly<Record<string,string|undefined>>){
 if(env.CODESPACES!=='true')return null;
 const name=env.CODESPACE_NAME,domain=env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
 if(!name||!/^[-a-z0-9]+$/.test(name)||!domain||!/^([a-z0-9-]+\.)*app\.github\.dev$/.test(domain))throw new Error('Invalid Codespaces forwarding configuration');
 return `https://${name}-3000.${domain}`;
}
export function forwardedHostAllowed(headers:import('node:http').IncomingHttpHeaders,origin:string){
 const host=new URL(origin).host;
 if(headers.host===host)return true;
 return ['localhost:3000','127.0.0.1:3000'].includes(headers.host??'')&&headers['x-forwarded-host']===host&&headers['x-forwarded-proto']==='https';
}
/** Codespaces terminates public TLS. Only this bridge listens on the forwarded HTTP port. */
export function createCodespacesBridge(origin:string,upstreamPort:number,ca:Buffer){
 if(process.env.NODE_ENV!=='test'||process.env.BAZAR_FULL_SIMULATION!=='1'||codespacesOrigin(process.env)!==origin)throw new Error('Isolated Codespaces bridge only');
 return createServer({maxHeaderSize:16384,requestTimeout:15000,headersTimeout:10000},(req,res)=>{
  if(!forwardedHostAllowed(req.headers,origin)){res.writeHead(403,{'cache-control':'no-store'});res.end();req.resume();return;}
  const headers:import('node:http').IncomingHttpHeaders={...req.headers,host:new URL(origin).host};
  // Platform forwarding metadata is not forwarded to the private gateway or used for authentication.
  for(const key of Object.keys(headers))if(key==='forwarded'||key.startsWith('x-forwarded-'))delete headers[key];
  const upstream=request({hostname:'127.0.0.1',port:upstreamPort,path:req.url,method:req.method,headers,ca,timeout:10000},response=>{res.writeHead(response.statusCode??502,response.headers);response.pipe(res);response.on('error',()=>res.destroy());});
  upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502,{'cache-control':'no-store'});res.end();});
  upstream.on('timeout',()=>upstream.destroy());req.on('aborted',()=>upstream.destroy());req.pipe(upstream);
 });
}
