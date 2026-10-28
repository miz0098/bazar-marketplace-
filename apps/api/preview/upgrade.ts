import {request as httpRequest,type IncomingMessage} from 'node:http';
import type {Duplex} from 'node:stream';
/** Only Next development HMR, never API/session/provider or application messaging sockets. */
export function proxyPreviewUpgrade(req:IncomingMessage,socket:Duplex,head:Buffer,port:number,origin:string){
 const expected=new URL(origin);if(req.headers.host!==expected.host||req.headers.origin!==origin||!/^\/_next\/(?:webpack-hmr|hmr)(?:\?|$)/.test(req.url??'')||req.headers.upgrade?.toLowerCase()!=='websocket'){socket.destroy();return;}
 const request=httpRequest({hostname:'127.0.0.1',port,path:req.url,headers:req.headers});request.on('upgrade',(response,upstream,upstreamHead)=>{upstream.setTimeout(0);socket.write('HTTP/1.1 101 Switching Protocols\r\n'+Object.entries(response.headers).map(([k,v])=>k+': '+v).join('\r\n')+'\r\n\r\n');if(upstreamHead.length)socket.write(upstreamHead);if(head.length)upstream.write(head);upstream.on('error',()=>socket.destroy());socket.on('error',()=>upstream.destroy());socket.on('close',()=>upstream.destroy());upstream.pipe(socket);socket.pipe(upstream);});request.on('response',()=>socket.destroy());request.on('error',()=>socket.destroy());request.setTimeout(10000,()=>request.destroy());request.end();
}
