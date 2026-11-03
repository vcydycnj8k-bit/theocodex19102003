// Les attributions sont calculées et protégées par PostgreSQL, jamais dans ce fichier.
const $ = id => document.getElementById(id);
const config = window.SANTA_CONFIG || {};
function publicKey(key) { if (typeof key !== 'string') return false; if (key.startsWith('sb_publishable_')) return true; try { return JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role === 'anon'; } catch { return false; } }
const validConfig = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(config.url || '') && publicKey(config.publishableKey);
const base = (config.url || '').replace(/\/$/, '');
const sessionKey = `santa-session:${base}`;
let session = null, state = null, selected = null, busy = false, spinning = false, dirty = false, rotation = 0, timer = null, recovering = false;
const money = cents => new Intl.NumberFormat('fr-FR', {style:'currency',currency:'EUR'}).format(cents / 100);
const colors = ['#2c6151','#c45b4c','#ac843d','#568475','#9e3f38','#7d704d'];
function message(text, error = false) { $('message').textContent = text; $('message').classList.toggle('error', error); }
function storeSession(value) { session = value; if (value) localStorage.setItem(sessionKey, JSON.stringify(value)); else localStorage.removeItem(sessionKey); }
function acceptSession(data) { if (!data.access_token || !data.refresh_token) throw Error('Session de connexion incomplète.'); storeSession({...data, expires_at: Date.now() + (data.expires_in || 3600) * 1000}); }
async function request(path, body, token, method = 'POST') {
 const response = await fetch(base + path, {method, headers:{apikey:config.publishableKey, ...(body ? {'Content-Type':'application/json'} : {}), ...(token ? {Authorization:`Bearer ${token}`} : {})}, ...(body ? {body:JSON.stringify(body)} : {})});
 const data = await response.json().catch(() => null);
 if (!response.ok) {
  const text = data?.message || data?.msg || data?.error_description || data?.error || `Erreur ${response.status}`;
  if (response.status === 401) throw Error('Session expirée : reconnectez-vous.');
  const translated = {'Invalid login credentials':'E-mail ou mot de passe incorrect.','Email not confirmed':'Confirmez votre adresse e-mail avant de vous connecter.','User already registered':'Ce compte existe déjà. Connectez-vous.','Failed to fetch':'Connexion au serveur impossible.'};
  throw Error(translated[text] || text);
 }
 return data;
}
let refreshing;
async function accessToken(force = false) {
 if (!session) throw Error('Connectez-vous.');
 if (force || session.expires_at < Date.now() + 60000) {
  if (!refreshing) refreshing = request('/auth/v1/token?grant_type=refresh_token', {refresh_token:session.refresh_token}).then(acceptSession).finally(() => { refreshing = null; });
  await refreshing;
 }
 return session.access_token;
}
async function rpc(name, args = {}) { return request(`/rest/v1/rpc/santa_${name}`, args, await accessToken()); }
async function action(fn) {
 if (busy) return; busy = true; message('');
 document.querySelectorAll('button,select').forEach(b => { b.dataset.wasDisabled = String(b.disabled); b.disabled = true; });
 try { await fn(); } catch (e) { message(e.message === 'Failed to fetch' ? 'Connexion au serveur impossible. Vérifiez votre connexion Internet.' : e.message, true); }
 finally { busy = false; document.querySelectorAll('[data-was-disabled]').forEach(b => { b.disabled = b.dataset.wasDisabled === 'true'; delete b.dataset.wasDisabled; }); if (state) renderState(); }
}
function authView() {
 $('configuration').hidden = validConfig; $('auth').hidden = !validConfig || !!session || recovering;
 $('recovery').hidden = !recovering; $('account').hidden = !session;
 $('account-email').textContent = session?.user?.email || '';
 $('invite-hint').hidden = !sessionStorage.getItem('santa-invite');
}
function renderState() {
 if (!state) return;
 $('family-title').textContent = state.name;
 $('joined-count').textContent = `${state.members.filter(m=>m.joined).length} / ${state.members.length} personnes ont rejoint la famille`;
 $('members-hint').textContent = state.is_owner ? 'Partagez chaque invitation uniquement avec la personne indiquée.' : 'Chaque prénom est associé à un compte personnel.';
 $('participants').replaceChildren();
 state.members.forEach(m => {
  const li = document.createElement('li'); const avatar = document.createElement('span'); avatar.className='avatar'; avatar.textContent=m.name[0];
  const label=document.createElement('span');label.textContent=`${m.name}${m.is_me?' · moi':''}`;
  const status=document.createElement('span');status.className='member-status';status.textContent=m.joined?'✓ Connecté':'En attente';
  li.append(avatar,label,status);
  if (m.invite_token) { const button=document.createElement('button');button.className='invite-button';button.textContent='Invitation';button.onclick=()=>action(async()=>{
   const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('invite',m.invite_token);
   try { await navigator.clipboard.writeText(url.href);message(`Invitation de ${m.name} copiée. Envoyez-la uniquement à ${m.name}.`); }
   catch { prompt(`Copiez le lien personnel de ${m.name} :`,url.href); }
  });li.append(button); }
  $('participants').append(li);
 });
 const me=state.members.find(m=>m.is_me);
 $('owner-budget').hidden=!state.is_owner || !!state.drawn_at;
 if (document.activeElement!==$('budget')) $('budget').value=state.budget_cents/100;
 $('common-budget').textContent=`Budget commun : ${money(state.budget_cents)} maximum`;
 if(!dirty) { $('my-wishes').value=me.wishes; $('personal-budget').value=me.budget_cents===null?'':me.budget_cents/100; }
 $('personal-budget').disabled=!!state.drawn_at;
 $('progress').textContent=state.drawn_at?'UN SEUL TIRAGE · SAUVEGARDÉ':'TOUS ENSEMBLE, AVANT LE GRAND SECRET';
 $('turn').textContent=state.drawn_at?`Votre secret vous attend, ${me.name}.`:'Bientôt, la magie opère.';
 $('hint').textContent=state.drawn_at?'Vous pouvez revoir le même destinataire à chaque connexion.':state.is_owner?'Attendez que chaque personne ait rejoint la famille, puis lancez le tirage une seule fois.':'L’organisateur lancera le tirage lorsque tout le monde aura rejoint la famille.';
 $('draw').hidden=!state.is_owner || !!state.drawn_at;
 $('draw').disabled=busy || state.members.some(m=>!m.joined);
 $('spin').hidden=!state.drawn_at;$('spin').disabled=busy || spinning;
 $('wheel').replaceChildren();
 $('wheel').style.background=`conic-gradient(${state.members.map((m,i)=>`${colors[i%colors.length]} ${i*360/state.members.length}deg ${(i+1)*360/state.members.length}deg`).join(',')})`;
 state.members.forEach((m,i)=>{const label=document.createElement('span');label.className='wheel-label';label.textContent=m.name;label.style.transform=`rotate(${(i+.5)*360/state.members.length-90}deg) translateY(-50%)`;$('wheel').append(label);});
 $('wishlists').replaceChildren();
 state.members.forEach(m=>{const card=document.createElement('details');card.className='wish-card';const summary=document.createElement('summary');const h=document.createElement('h3');h.textContent=m.name;const mark=document.createElement('span');mark.textContent='Ses envies +';summary.append(h,mark);const p=document.createElement('p');p.textContent=m.wishes||'Pas encore d’idée, la surprise est bienvenue.';p.className='wish-text';card.append(summary,p);$('wishlists').append(card);});
}
async function refresh() {
 if (!selected || !session || recovering) return;
 const family=selected; const next=await rpc('state',{p_family:family});
 if (selected!==family) return;
 state=next;renderState();$('sync-state').textContent=`À jour à ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}`;
}
async function loadFamilies(preferred) {
 const families=await rpc('my_families');$('family-select').replaceChildren();
 for(const f of families){const o=document.createElement('option');o.value=f.id;o.textContent=f.name;$('family-select').append(o);}
 const remembered=preferred || localStorage.getItem(`${sessionKey}:family:${session.user.id}`);
 selected=families.find(f=>f.id===remembered)?.id||families[0]?.id||null;
 if(selected)localStorage.setItem(`${sessionKey}:family:${session.user.id}`,selected);
 $('welcome').hidden=!!selected;$('family').hidden=!selected;
 if(selected){$('family-select').value=selected;await refresh();}
}
async function connected() {
 if(!session.user) { const user=await request('/auth/v1/user',null,await accessToken(),'GET'); storeSession({...session,user}); }
 authView();if(recovering)return;
 const invite=sessionStorage.getItem('santa-invite');let preferred;
 if(invite){try{preferred=await rpc('join',{p_token:invite});message('Bienvenue dans votre famille !');}catch(e){message(e.message,true);}finally{sessionStorage.removeItem('santa-invite');history.replaceState({},'',location.pathname);}}
 await loadFamilies(preferred);clearInterval(timer);timer=setInterval(()=>{if(!busy&&!spinning&&!document.hidden)refresh().catch(e=>{$('sync-state').textContent='Synchronisation interrompue — nouvelle tentative automatique.';});},8000);
}
$('auth-form').onsubmit=e=>{e.preventDefault();action(async()=>{const data=await request('/auth/v1/token?grant_type=password',{email:$('email').value.trim(),password:$('password').value});acceptSession(data);$('password').value='';await connected();});};
$('signup').onclick=()=>{if(!$('auth-form').reportValidity())return;action(async()=>{const data=await request('/auth/v1/signup',{email:$('email').value.trim(),password:$('password').value});if(data.access_token){acceptSession(data);$('password').value='';await connected();}else message('Consultez votre e-mail pour confirmer votre compte, puis connectez-vous. Si aucun message n’arrive, contactez l’organisateur.');});};
$('forgot').onclick=()=>{if(!$('email').reportValidity())return;action(async()=>{await request('/auth/v1/recover?redirect_to='+encodeURIComponent(location.origin+location.pathname),{email:$('email').value.trim()});message('Si ce compte existe et que l’envoi d’e-mails est configuré, un lien de réinitialisation vous sera envoyé.');});};
$('recovery-form').onsubmit=e=>{e.preventDefault();action(async()=>{await request('/auth/v1/user',{password:$('new-password').value},await accessToken(),'PUT');$('new-password').value='';recovering=false;await connected();message('Mot de passe mis à jour.');});};
$('logout').onclick=()=>action(async()=>{try{await request('/auth/v1/logout',{},await accessToken());}finally{clearInterval(timer);storeSession(null);state=null;selected=null;dirty=false;recovering=false;$('family').hidden=true;$('welcome').hidden=true;$('reveal').close();$('recipient').textContent='';$('reveal-wishes').replaceChildren();authView();}});
$('create-form').onsubmit=e=>{e.preventDefault();action(async()=>{const id=await rpc('create_family',{p_name:$('family-name').value.trim(),p_my_name:$('my-name').value});await loadFamilies(id);message('Famille créée. Partagez les cinq invitations personnelles.');});};
$('family-select').onchange=()=>action(async()=>{if(dirty&&!confirm('Changer de famille sans enregistrer vos modifications ?')){$('family-select').value=selected;return;}selected=$('family-select').value;localStorage.setItem(`${sessionKey}:family:${session.user.id}`,selected);dirty=false;await refresh();});
$('budget-form').onsubmit=e=>{e.preventDefault();action(async()=>{await rpc('set_budget',{p_family:selected,p_budget_cents:Math.round($('budget').valueAsNumber*100)});await refresh();message('Budget commun enregistré pour toute la famille.');});};
$('preferences-form').oninput=()=>{dirty=true;};
$('preferences-form').onsubmit=e=>{e.preventDefault();action(async()=>{const wishes=$('my-wishes').value;const amount=$('personal-budget').value;await rpc('save_preferences',{p_family:selected,p_wishes:wishes,p_budget_cents:amount===''?null:Math.round(Number(amount)*100)});dirty=$('my-wishes').value!==wishes || $('personal-budget').value!==amount;await refresh();message(dirty?'Envies enregistrées. Vos dernières modifications restent à enregistrer.':'Vos envies sont enregistrées et partagées avec la famille.');});};
$('draw').onclick=()=>{if(dirty){message('Enregistrez vos envies avant de lancer le tirage.',true);$('my-wishes').focus();return;}if(!confirm('Créer le tirage définitif pour toute la famille ? Il sera conservé pour tout le monde.'))return;action(async()=>{await rpc('draw',{p_family:selected});await refresh();message('Le tirage est sauvegardé. Chacun peut découvrir son destinataire sur son compte.');});};
$('spin').onclick=()=>action(async()=>{
 const target=await rpc('my_assignment',{p_family:selected});if(!target)throw Error('Le tirage n’est pas encore disponible.');
 spinning=true;const index=state.members.findIndex(m=>m.id===target.recipient_id);const destination=(360-(index+.5)*360/state.members.length)%360;rotation+=1800+((destination-rotation%360+360)%360);$('wheel').style.transform=`rotate(${rotation}deg)`;
 await new Promise(resolve=>setTimeout(resolve,matchMedia('(prefers-reduced-motion: reduce)').matches?20:4100));
 spinning=false;$('giver').textContent='VOTRE PETIT SECRET';$('recipient').textContent=target.name;$('reveal-budget').textContent=`Votre maximum : ${money(target.budget_cents)}`;$('reveal-wishes').replaceChildren();
 for(const idea of (target.wishes||'Une surprise sera la bienvenue !').split('\n').filter(s=>s.trim())){const li=document.createElement('li');li.textContent=idea;$('reveal-wishes').append(li);}
 $('reveal').showModal();$('next').focus();
});
function closeSecret(){$('reveal').close();$('recipient').textContent='';$('reveal-wishes').replaceChildren();$('reveal-budget').textContent='';}
$('next').onclick=closeSecret;$('reveal').addEventListener('cancel',e=>{e.preventDefault();closeSecret();});
async function start(){
 const invite=new URL(location.href).searchParams.get('invite');if(invite){sessionStorage.setItem('santa-invite',invite);history.replaceState({},'',location.pathname+location.hash);}
 if(!validConfig){authView();return;}
 try{session=JSON.parse(localStorage.getItem(sessionKey));}catch{session=null;}
 const fragment=new URLSearchParams(location.hash.slice(1));if(fragment.get('access_token')){acceptSession({access_token:fragment.get('access_token'),refresh_token:fragment.get('refresh_token'),expires_in:Number(fragment.get('expires_in')||3600)});recovering=fragment.get('type')==='recovery';history.replaceState({},'',location.pathname);}
 authView();if(session){await accessToken();await connected();}
}
start().catch(e=>{message(e.message,true);if(!state){clearInterval(timer);storeSession(null);authView();}});
