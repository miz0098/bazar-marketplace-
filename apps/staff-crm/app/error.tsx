'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="card"><h1>Не вдалося відкрити сторінку</h1><p role="alert">Дані не підтверджено. Спробуйте оновити сторінку.</p><button onClick={reset}>Спробувати знову</button></main>;}
