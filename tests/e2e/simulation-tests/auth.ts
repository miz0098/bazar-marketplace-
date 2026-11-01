import {expect,type Page} from '@playwright/test';
export async function register(page:Page,phone:string){
 await page.goto('/account/register');
 await page.getByLabel('Номер телефону',{exact:true}).fill(phone);
 await page.getByRole('button',{name:'Продовжити',exact:true}).click();
 const code='123456';
 for(let i=0;i<6;i++)await page.getByLabel(`Цифра ${i+1} з 6`,{exact:true}).fill(code[i]);
 await page.locator('.auth-page').getByRole('button',{name:'Продовжити',exact:true}).click();
 await page.getByLabel('Імʼя',{exact:true}).fill('Олена');
 await page.getByLabel('Прізвище',{exact:true}).fill('Коваль');
 await page.locator('.auth-consent input').check();
 await page.getByRole('button',{name:'Зареєструватися',exact:true}).click();
 await expect(page).toHaveURL(/\/profile\/personal-data$/);
}
