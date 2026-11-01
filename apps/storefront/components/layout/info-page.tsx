import Link from 'next/link';
import type {InfoPage} from '@/services/contracts/info';
export function InfoContent({page}:{page:InfoPage}){return <div className="container info-page"><nav aria-label="Навігаційний шлях"><Link href="/">Головна</Link></nav><h1>{page.title}</h1><p>{page.description}</p>{false}<Link href="/profile/support">{('Підтримка')}</Link></div>;}
