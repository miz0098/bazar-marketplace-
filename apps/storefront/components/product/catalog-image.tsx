'use client';
import Image from 'next/image';
import {useState} from 'react';
/** Only repository/approved catalog media paths; no arbitrary remote URL or SVG uploads. */
export function CatalogImage({src,alt,width=800,height=800}:{src:string;alt:string;width?:number;height?:number}){
 const [state,setState]=useState<'loading'|'ready'|'error'>('loading');
 if(!/^\/catalog-media\/[a-zA-Z0-9_-]+\.(webp|png|jpg|avif)$/.test(src)||state==='error')return <span role="img" aria-label={`${alt}: зображення недоступне`}/>;
 return <><Image src={src} alt={alt} width={width} height={height} sizes="(max-width: 600px) 90vw, 600px" onLoad={()=>setState('ready')} onError={()=>setState('error')} style={{width:'100%',height:'100%',objectFit:'contain'}}/>{state==='loading'&&<span className="sr-only" role="status">Завантаження зображення</span>}</>;
}
