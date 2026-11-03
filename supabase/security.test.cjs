// Test d’intégration PostgreSQL. Installer @electric-sql/pglite hors du dépôt.
const { PGlite } = require('@electric-sql/pglite');
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async()=>{
 const db = new PGlite();
 await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
 await db.exec(fs.readFileSync(__dirname+'/setup.sql','utf8'));
 const users=Array.from({length:8},(_,i)=>`00000000-0000-0000-0000-${String(i+1).padStart(12,'0')}`);
 for(const id of users)await db.query('insert into auth.users values($1)',[id]);
 const as=async id=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec('set role authenticated');};
 const call=async(fn,args=[])=>{const result=await db.query(`select public.santa_${fn}(${args.map((_,i)=>'$'+(i+1)).join(',')}) as result`,args);return result.rows[0].result;};
 await as(users[0]);const family=await call('create_family',['Noël','Théo']);let state=await call('state',[family]);assert.equal(state.members.length,6);const tokens=state.members.filter(m=>!m.is_me).map(m=>m.invite_token);assert.ok(tokens.every(Boolean));
 await assert.rejects(()=>db.query('select * from santa_private.assignments'),/permission denied/);
 await assert.rejects(()=>call('draw',[family]),/rejoindre/);
 await as(users[7]);await assert.rejects(()=>call('state',[family]),/Accès refusé/);assert.equal(await call('my_assignment',[family]),null);
 for(let i=0;i<5;i++){await as(users[i+1]);assert.equal(await call('join',[tokens[i]]),family);state=await call('state',[family]);assert.ok(state.members.every(m=>m.invite_token===null));assert.equal(state.members.filter(m=>m.is_me).length,1);await call('save_preferences',[family,'Idée '+i,i===0?3500:null]);await assert.rejects(()=>call('draw',[family]),/organisateur/);await assert.rejects(()=>call('set_budget',[family,9999]),/organisateur/);}
 await as(users[6]);await assert.rejects(()=>call('join',[tokens[0]]),/déjà été utilisée/);
 await as(users[0]);await call('set_budget',[family,5000]);await call('draw',[family]);const original=await call('my_assignment',[family]);await call('draw',[family]);assert.deepEqual(await call('my_assignment',[family]),original);
 const recipients=[];
 for(let i=0;i<6;i++){await as(users[i]);const current=await call('state',[family]);assert.ok(current.drawn_at);const mine=current.members.find(m=>m.is_me);const result=await call('my_assignment',[family]);assert.notEqual(result.recipient_id,mine.id);assert.equal(result.budget_cents,i===1?3500:5000);recipients.push(result.recipient_id);assert.ok(!JSON.stringify(current).includes('recipient_id'));await assert.rejects(()=>call('save_preferences',[family,'nouvelle envie',1234]),/verrouillé/);await call('save_preferences',[family,'nouvelle envie',mine.budget_cents]);}
 assert.equal(new Set(recipients).size,6);
 await as(users[0]);await assert.rejects(()=>call('set_budget',[family,1234]),/verrouillé/);
 // Une deuxième famille ne permet ni d’écrire ni de lire la première.
 await as(users[7]);const other=await call('create_family',['Autre famille','Eva']);await assert.rejects(()=>call('save_preferences',[family,'attaque',null]),/Accès refusé/);assert.equal(await call('my_assignment',[family]),null);await assert.rejects(()=>call('draw',[family]),/organisateur/);
 await db.exec('reset role; set role anon');await assert.rejects(()=>call('state',[family]),/permission denied/);
 await db.exec('reset role');
 // Contraintes : impossibilité d’auto-attribution et d’attribution multiple.
 const all=(await db.query('select * from santa_private.assignments where family_id=$1',[family])).rows;
 await assert.rejects(()=>db.query('update santa_private.assignments set recipient_id=giver_id where giver_id=$1',[all[0].giver_id]),/check constraint/);
 await assert.rejects(()=>db.query('update santa_private.assignments set recipient_id=$1 where giver_id=$2',[all[0].recipient_id,all[1].giver_id]));
 const before=(await db.query('select count(*) as n from santa_private.assignments')).rows[0].n;await db.exec(fs.readFileSync(__dirname+'/setup.sql','utf8'));assert.equal((await db.query('select count(*) as n from santa_private.assignments')).rows[0].n,before);
 console.log('PASS PostgreSQL: 6 comptes, invitations personnelles, isolement inter-familles, accès anonyme refusé, confidentialité des destinataires, unicité, budgets, idempotence du tirage, souhaits modifiables.');await db.close();
})().catch(e=>{console.error(e);process.exit(1)});
