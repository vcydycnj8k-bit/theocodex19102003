-- Exécuter une fois dans le SQL Editor du projet Supabase.
-- Les tables privées ne sont jamais exposées au navigateur.
begin;
create schema if not exists santa_private;
revoke all on schema santa_private from public, anon, authenticated;
create table if not exists santa_private.families (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(name) between 1 and 60),
 owner_id uuid not null references auth.users(id),
 budget_cents integer not null default 5000 check(budget_cents between 0 and 10000000),
 drawn_at timestamptz,
 created_at timestamptz not null default now()
);
create table if not exists santa_private.members (
 id uuid primary key default gen_random_uuid(),
 family_id uuid not null references santa_private.families(id) on delete cascade,
 name text not null,
 user_id uuid references auth.users(id),
 wishes text not null default '' check(length(wishes)<=1000),
 budget_cents integer check(budget_cents between 0 and 10000000),
 invite_token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
 unique(family_id,name), unique(family_id,user_id), unique(family_id,id)
);
create table if not exists santa_private.assignments (
 family_id uuid not null references santa_private.families(id),
 giver_id uuid primary key,
 recipient_id uuid not null unique,
 check(giver_id<>recipient_id),
 foreign key(family_id,giver_id) references santa_private.members(family_id,id),
 foreign key(family_id,recipient_id) references santa_private.members(family_id,id)
);
alter table santa_private.families enable row level security;
alter table santa_private.members enable row level security;
alter table santa_private.assignments enable row level security;
revoke all on all tables in schema santa_private from public, anon, authenticated;

create or replace function public.santa_create_family(p_name text, p_my_name text)
returns uuid language plpgsql security definer set search_path='' as $$
declare f uuid; n text;
begin
 if auth.uid() is null then raise exception 'Connectez-vous.'; end if;
 if p_name is null or length(trim(p_name)) not between 1 and 60 then raise exception 'Nom de famille invalide.'; end if;
 if p_my_name is null or p_my_name not in ('Eva','Théo','Lea','Elio','Lucas','Ella') then raise exception 'Prénom invalide.'; end if;
 insert into santa_private.families(name,owner_id) values(trim(p_name),auth.uid()) returning id into f;
 foreach n in array array['Eva','Théo','Lea','Elio','Lucas','Ella'] loop
  insert into santa_private.members(family_id,name,user_id) values(f,n,case when n=p_my_name then auth.uid() else null end);
 end loop;
 return f;
end $$;

create or replace function public.santa_join(p_token text)
returns uuid language plpgsql security definer set search_path='' as $$
declare m santa_private.members; f santa_private.families;
begin
 if auth.uid() is null then raise exception 'Connectez-vous.'; end if;
 select * into m from santa_private.members where invite_token=p_token;
 if not found then raise exception 'Invitation invalide.'; end if;
 select * into f from santa_private.families where id=m.family_id for update;
 select * into m from santa_private.members where id=m.id for update;
 if m.user_id=auth.uid() then return f.id; end if;
 if f.drawn_at is not null then raise exception 'Le tirage a déjà été effectué.'; end if;
 if m.user_id is not null then raise exception 'Cette invitation a déjà été utilisée.'; end if;
 if exists(select 1 from santa_private.members where family_id=f.id and user_id=auth.uid()) then raise exception 'Vous avez déjà un prénom dans cette famille.'; end if;
 update santa_private.members set user_id=auth.uid() where id=m.id;
 return f.id;
end $$;

create or replace function public.santa_my_families()
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',f.id,'name',f.name) order by f.created_at),'[]'::jsonb)
 from santa_private.families f join santa_private.members m on m.family_id=f.id where m.user_id=auth.uid();
$$;

create or replace function public.santa_state(p_family uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare f santa_private.families; members jsonb;
begin
 if not exists(select 1 from santa_private.members where family_id=p_family and user_id=auth.uid()) then raise exception 'Accès refusé.'; end if;
 select * into f from santa_private.families where id=p_family;
 select jsonb_agg(jsonb_build_object('id',m.id,'name',m.name,'is_me',m.user_id=auth.uid(),'joined',m.user_id is not null,'wishes',m.wishes,'budget_cents',m.budget_cents,
 'invite_token',case when f.owner_id=auth.uid() and m.user_id is null and f.drawn_at is null then m.invite_token else null end) order by m.name)
 into members from santa_private.members m where m.family_id=p_family;
 return jsonb_build_object('id',f.id,'name',f.name,'is_owner',f.owner_id=auth.uid(),'budget_cents',f.budget_cents,'drawn_at',f.drawn_at,'members',members);
end $$;

create or replace function public.santa_save_preferences(p_family uuid,p_wishes text,p_budget_cents integer)
returns void language plpgsql security definer set search_path='' as $$
declare f santa_private.families; m santa_private.members;
begin
 select * into f from santa_private.families where id=p_family for update;
 select * into m from santa_private.members where family_id=p_family and user_id=auth.uid();
 if not found then raise exception 'Accès refusé.'; end if;
 if p_wishes is null or length(p_wishes)>1000 then raise exception 'Maximum 1 000 caractères.'; end if;
 if p_budget_cents is not null and (p_budget_cents<0 or p_budget_cents>10000000) then raise exception 'Budget invalide.'; end if;
 if f.drawn_at is not null and p_budget_cents is distinct from m.budget_cents then raise exception 'Le budget est verrouillé après le tirage.'; end if;
 update santa_private.members set wishes=p_wishes,budget_cents=p_budget_cents where id=m.id;
end $$;

create or replace function public.santa_set_budget(p_family uuid,p_budget_cents integer)
returns void language plpgsql security definer set search_path='' as $$
declare f santa_private.families;
begin
 select * into f from santa_private.families where id=p_family for update;
 if f.owner_id is distinct from auth.uid() or auth.uid() is null then raise exception 'Action réservée à l’organisateur.'; end if;
 if f.drawn_at is not null then raise exception 'Le budget est verrouillé après le tirage.'; end if;
 if p_budget_cents is null or p_budget_cents<0 or p_budget_cents>10000000 then raise exception 'Budget invalide.'; end if;
 update santa_private.families set budget_cents=p_budget_cents where id=p_family;
end $$;

create or replace function public.santa_draw(p_family uuid)
returns void language plpgsql security definer set search_path='' as $$
declare f santa_private.families; givers uuid[]; recipients uuid[]; count_members integer; tries integer:=0;
begin
 select * into f from santa_private.families where id=p_family for update;
 if auth.uid() is null or f.owner_id is distinct from auth.uid() then raise exception 'Action réservée à l’organisateur.'; end if;
 if f.drawn_at is not null then return; end if;
 if exists(select 1 from santa_private.members where family_id=p_family and user_id is null) then raise exception 'Chaque participant doit d’abord rejoindre la famille.'; end if;
 select array_agg(id order by id),count(*) into givers,count_members from santa_private.members where family_id=p_family;
 if count_members<2 then raise exception 'Au moins deux participants sont nécessaires.'; end if;
 loop
  tries:=tries+1;
  select array_agg(id order by gen_random_uuid()) into recipients from santa_private.members where family_id=p_family;
  exit when not exists(select 1 from generate_subscripts(givers,1) i where givers[i]=recipients[i]);
  if tries>1000 then raise exception 'Veuillez réessayer le tirage.'; end if;
 end loop;
 insert into santa_private.assignments(family_id,giver_id,recipient_id) select p_family,givers[i],recipients[i] from generate_subscripts(givers,1) i;
 update santa_private.families set drawn_at=now() where id=p_family;
end $$;

create or replace function public.santa_my_assignment(p_family uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('recipient_id',r.id,'name',r.name,'wishes',r.wishes,'budget_cents',coalesce(g.budget_cents,f.budget_cents))
 from santa_private.members g join santa_private.assignments a on a.giver_id=g.id
 join santa_private.members r on r.id=a.recipient_id join santa_private.families f on f.id=g.family_id
 where g.family_id=p_family and g.user_id=auth.uid();
$$;
revoke all on function public.santa_create_family(text,text),public.santa_join(text),public.santa_my_families(),public.santa_state(uuid),public.santa_save_preferences(uuid,text,integer),public.santa_set_budget(uuid,integer),public.santa_draw(uuid),public.santa_my_assignment(uuid) from public, anon;
grant execute on function public.santa_create_family(text,text),public.santa_join(text),public.santa_my_families(),public.santa_state(uuid),public.santa_save_preferences(uuid,text,integer),public.santa_set_budget(uuid,integer),public.santa_draw(uuid),public.santa_my_assignment(uuid) to authenticated;
commit;
