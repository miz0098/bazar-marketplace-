import {expect} from '@playwright/test';
export async function authenticate(page:import('@playwright/test').Page,register=true,phone='671234567'){
 await page.addInitScript(()=>{const original=window.fetch;window.fetch=async(...args)=>{const r=await original(...args);if(String(args[0]).endsWith('/api/v1/auth/otp/challenges')){document.documentElement.dataset.testChallengeStatus=String(r.status);if(r.ok){const v=await r.clone().json();document.documentElement.dataset.testChallenge=v.data.challengeId;}}return r;};});
 await page.goto(register?'/account/register':'/account/login');
 await expect(page.getByRole('button',{name:'Оновити серверні дані'})).toBeEnabled();
 await page.getByLabel('Номер телефону',{exact:true}).fill(phone);

 await page.getByRole('button',{name:'Продовжити',exact:true}).click();
 await page.waitForFunction(()=>Boolean(document.documentElement.dataset.testChallengeStatus));
 if(await page.evaluate(()=>document.documentElement.dataset.testChallengeStatus==='429')){await expect(page.locator('.auth-page')).toContainText('Забагато спроб');await expect(page.locator('.auth-page').getByRole('button',{name:'Продовжити',exact:true})).toBeEnabled();await page.evaluate(()=>{delete document.documentElement.dataset.testChallengeStatus;});await page.locator('.auth-page').getByRole('button',{name:'Продовжити',exact:true}).click();}
 await page.waitForFunction(()=>Boolean(document.documentElement.dataset.testChallengeStatus));expect(await page.evaluate(()=>document.documentElement.dataset.testChallengeStatus)).toBe('200');
 await page.waitForFunction(()=>Boolean(document.documentElement.dataset.testChallenge));const data={challengeId:await page.evaluate(()=>document.documentElement.dataset.testChallenge!)};
 const code=await page.evaluate(async(id:string)=>{const csrf=(await(await fetch('/api/v1/auth/csrf')).json()).data.csrfToken;const r=await fetch('/__browser/otp',{method:'POST',headers:{'content-type':'application/json','x-csrf-token':csrf},body:JSON.stringify({challengeId:id})});return(await r.json()).code;},data.challengeId);
 for(let i=0;i<6;i++)await page.getByLabel(`Цифра ${i+1} з 6`,{exact:true}).fill(code[i]);
 await page.locator('.auth-page').getByRole('button',{name:register?'Продовжити':'Увійти',exact:true}).click();
 if(register){await page.getByLabel('Імʼя',{exact:true}).fill('Тестовий');await page.getByLabel('Прізвище',{exact:true}).fill('Покупець');await page.locator('.auth-consent input').check();await page.getByRole('button',{name:'Зареєструватися',exact:true}).click();}
 await expect(page.getByText('Тестова серверна сесія. Кошик та обране зберігаються у тестовому акаунті.',{exact:true})).toBeVisible();
}
