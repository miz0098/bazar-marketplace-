'use client';
import {useRouter} from 'next/navigation';
import {useTransition} from 'react';
export default function Error({ reset }: { reset: () => void }) {
  const router=useRouter();
  const [pending,retry]=useTransition();
  return (
    <div className="container empty-state" role="alert">
      <h1>Не вдалося завантажити сторінку</h1>
      <p>Спробуйте ще раз.</p>
      <button className="button" disabled={pending} onClick={()=>retry(()=>{router.refresh();reset();})}>
        Повторити
      </button>
    </div>
  );
}
