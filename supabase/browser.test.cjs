// Test navigateur + vrai SQL, fournisseur Auth/API simulé localement.
const { PGlite }=require('@electric-sql/pglite');
const {chromium}=require('playwright');
const fs=require('node:fs');const http=require('node:http');const assert=require('node:assert/strict');
(async()=>{
 const db=new PGlite();await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);await db.exec(fs.readFileSync(__dirname+'/setup.sql','utf8'));
 const accounts=new Map(),tokens=new Map();let queue=Promise.resolve();
 const serialize=fn=>{const p=queue.then(fn);queue=p.catch(()=>{});return p;};
 const rpc=async(id,name,args)=>serialize(async()=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');const keys=Object.keys(args);return (await db.query(`select public.santa_${name}(${keys.map((k,i)=>`${k} => $${i+1}`).join(',')}) as data`,Object.values(args))).rows[0].data;});
 const html=fs.readFileSync(__dirname+'/../site/index.html','utf8').replace(/window\.SANTA_CONFIG\s*=\s*\{[^;]*\};/,"window.SANTA_CONFIG = { url: 'https://test-project.supabase.co', publishableKey: 'sb_publishable_test' };");
 const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html'});res.end(html)});await new Promise(r=>server.listen(3099,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const errors=[];const base='http://127.0.0.1:3099';
 async function context(){const c=await browser.newContext({reducedMotion:'reduce',viewport:{width:390,height:844}});await c.route('https://test-project.supabase.co/**',async route=>{
  const req=route.request(),url=new URL(req.url());let body={};try{body=req.postDataJSON()||{};}catch{};
  try{
   let data;
   if(url.pathname==='/auth/v1/signup'){
    const id=crypto.randomUUID();accounts.set(body.email,{id,password:body.password});await serialize(async()=>{await db.exec('reset role');await db.query('insert into auth.users values($1)',[id]);});
    const token=crypto.randomUUID();tokens.set(token,id);data={access_token:token,refresh_token:token,expires_in:3600,user:{id,email:body.email}};
   }else if(url.pathname==='/auth/v1/token'){
    if(body.refresh_token){const id=tokens.get(body.refresh_token);if(!id)throw Error('Session expirée');data={access_token:body.refresh_token,refresh_token:body.refresh_token,expires_in:3600,user:{id,email:[...accounts].find(([e,a])=>a.id===id)[0]}};}
    else{const a=accounts.get(body.email);if(!a||a.password!==body.password)throw Error('Invalid login credentials');const token=crypto.randomUUID();tokens.set(token,a.id);data={access_token:token,refresh_token:token,expires_in:3600,user:{id:a.id,email:body.email}};}
   }else if(url.pathname==='/auth/v1/logout'){data={};}
   else if(url.pathname.startsWith('/rest/v1/rpc/')){const token=req.headers().authorization?.replace('Bearer ','');const id=tokens.get(token);if(!id)throw Error('Unauthorized');data=await rpc(id,url.pathname.split('santa_')[1],body);}
   else throw Error('Unknown endpoint '+url.pathname);
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data??null)});
  }catch(e){await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({message:e.message})});}
 });return c;}
 async function signup(page,email){page.on('pageerror',e=>errors.push(e.message));await page.locator('#email').fill(email);await page.locator('#password').fill('password-test-123');await page.locator('#signup').click();}
 const ownerContext=await context();const owner=await ownerContext.newPage();await owner.goto(base);await signup(owner,'theo@example.test');await owner.locator('#create-form button').click();await owner.locator('#family').waitFor({state:'visible'});assert.equal(await owner.locator('#draw').isDisabled(),true);
 const ownerId=accounts.get('theo@example.test').id;const list=await rpc(ownerId,'my_families',{});const family=list[0].id;const state=await rpc(ownerId,'state',{p_family:family});const invitations=state.members.filter(m=>!m.is_me);const pages=[owner];const ids=[ownerId];
 for(let i=0;i<invitations.length;i++){const c=await context();const page=await c.newPage();await page.goto(base+'/?invite='+invitations[i].invite_token);await signup(page,`member${i}@example.test`);await page.locator('#family').waitFor({state:'visible'});assert.equal(await page.locator('#draw').isVisible(),false);await page.locator('#my-wishes').fill('Un livre pour '+invitations[i].name);await page.locator('#preferences-form button').click();await page.locator('#message').filter({hasText:'enregistrées'}).waitFor();pages.push(page);ids.push(accounts.get(`member${i}@example.test`).id);}
 await owner.reload();await owner.locator('#family').waitFor({state:'visible'});assert.equal(await owner.locator('#draw').isEnabled(),true);assert.equal(await owner.locator('#wishlists').textContent().then(s=>s.includes('Un livre pour')),true);
 // Rafraîchissement d’une session expirant, sans perdre la famille.
 await owner.evaluate(()=>{const key='santa-session:https://test-project.supabase.co';const s=JSON.parse(localStorage.getItem(key));s.expires_at=0;localStorage.setItem(key,JSON.stringify(s));});await owner.reload();await owner.locator('#family').waitFor({state:'visible'});
 // Sauvegarde des champs en cours malgré une lecture périodique.
 await owner.locator('#my-wishes').fill('Mon envie non enregistrée');await owner.waitForTimeout(8500);assert.equal(await owner.locator('#my-wishes').inputValue(),'Mon envie non enregistrée');await owner.locator('#preferences-form button').click();
 owner.once('dialog',d=>d.accept());await owner.locator('#draw').click();await owner.locator('#spin').waitFor({state:'visible'});
 const results=[];
 for(let i=0;i<pages.length;i++){const p=pages[i];if(i)await p.reload();await p.locator('#spin').waitFor({state:'visible'});assert.equal(await p.locator('#personal-budget').isDisabled(),true);await p.locator('#spin').click();await p.locator('#reveal').waitFor({state:'visible'});const recipient=await p.locator('#recipient').textContent();const expected=await rpc(ids[i],'my_assignment',{p_family:family});assert.equal(recipient,expected.name);results.push(recipient);await p.locator('#next').click();assert.equal(await p.locator('#recipient').textContent(),'');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 assert.equal(new Set(results).size,6);
 // Déconnexion et reconnexion conservent le destinataire.
 await owner.locator('#logout').click();await owner.locator('#auth').waitFor({state:'visible'});await owner.locator('#email').fill('theo@example.test');await owner.locator('#password').fill('password-test-123');await owner.locator('#login').click();await owner.locator('#spin').waitFor({state:'visible'});await owner.locator('#spin').click();await owner.locator('#reveal').waitFor({state:'visible'});assert.equal(await owner.locator('#recipient').textContent(),results[0]);assert.deepEqual(errors,[]);
 console.log('PASS navigateur + SQL: 6 comptes et invitations, souhaits partagés, champs non écrasés, tirage unique, six révélations privées, reconnexion stable, affichage mobile et aucune erreur JS. Auth et réseau Supabase simulés.');
 await browser.close();await db.close();await new Promise(r=>server.close(r));
})().catch(e=>{console.error(e);process.exit(1)});
