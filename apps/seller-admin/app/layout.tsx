import type {Metadata} from 'next';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/800.css';
import './style.css';
export const metadata:Metadata={title:'BAZAR Business — Панель керування магазином',robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="uk"><body>{children}</body></html>;}
