'use client';
export default function Error({reset}:{reset:()=>void}){return <div className="container empty-state" role="alert"><h1>Не вдалося завантажити сторінку</h1><p>Спробуйте ще раз.</p><button className="button" onClick={reset}>Повторити</button></div>;}
