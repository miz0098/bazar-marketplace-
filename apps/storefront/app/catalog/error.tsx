'use client';
import {useRouter} from 'next/navigation';
import {useTransition} from 'react';

export default function CatalogError({ reset }: { reset: () => void }) {
  const router=useRouter();
  const [pending,retry]=useTransition();
  return <div className="container page-shell"><div className="empty-state" role="alert"><span aria-hidden="true">!</span><h1>Не вдалося відкрити каталог</h1><p>Спробуйте повторити запит.</p><button className="button" type="button" disabled={pending} onClick={()=>retry(()=>{router.refresh();reset();})}>Спробувати ще раз</button></div></div>;
}
