-- Logistik KKN: schema awal dan kebijakan akses.
-- Jalankan sekali di SQL Editor pada project Supabase KKN yang baru.
-- Simpan file ini di repo; jangan tulis password atau kode undangan di sini.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 2 and 100),
  role text not null default 'anggota' check (role in ('anggota', 'perkap', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.invite_codes (
  id bigint generated always as identity primary key,
  code text not null unique,
  active boolean not null default true,
  max_uses integer check (max_uses is null or max_uses > 0),
  used_count integer not null default 0 check (used_count >= 0),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.personal_catalog (
  id text primary key,
  category text not null,
  name text not null,
  note text not null default '',
  active boolean not null default true
);

create table if not exists public.group_inventory (
  id text primary key,
  category text not null,
  name text not null,
  needed_qty numeric check (needed_qty is null or needed_qty >= 0),
  available_qty numeric check (available_qty is null or available_qty >= 0),
  unit text,
  responsible_person text,
  note text not null default '',
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.personal_checklist (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id text not null references public.personal_catalog(id),
  status text not null default 'belum_dicek'
    check (status in ('belum_dicek', 'siap_dibawa', 'perlu_dibeli', 'tidak_dibawa')),
  note text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table if not exists public.logistics_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  request_type text not null check (request_type in ('pengadaan', 'peminjaman')),
  item_name text not null check (char_length(trim(item_name)) between 2 and 150),
  quantity numeric not null check (quantity > 0),
  reason text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'processing', 'ready', 'borrowed', 'returned', 'completed')),
  staff_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.invite_codes enable row level security;
alter table public.personal_catalog enable row level security;
alter table public.group_inventory enable row level security;
alter table public.personal_checklist enable row level security;
alter table public.logistics_requests enable row level security;

-- Grants membuka operasi Data API; RLS di bawah tetap menentukan baris yang boleh diakses.
grant usage on schema public to authenticated;
grant select on public.profiles, public.personal_catalog, public.group_inventory,
  public.personal_checklist, public.logistics_requests to authenticated;
grant insert, update on public.personal_catalog, public.group_inventory,
  public.personal_checklist, public.logistics_requests to authenticated;

-- SECURITY DEFINER menghindari RLS rekursif saat memeriksa role.
create or replace function public.is_staff()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('perkap', 'admin')
  );
$$;

revoke all on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated;

-- Pengguna yang sudah login memasukkan kode sebelum memperoleh profil KKN.
-- Role selalu 'anggota'; pengguna tidak dapat memilih role sendiri.
create or replace function public.join_kkn(p_code text, p_full_name text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_invite_id bigint;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Harap login terlebih dahulu.';
  end if;
  if p_full_name is null or char_length(trim(p_full_name)) not between 2 and 100 then
    raise exception 'Nama harus 2 sampai 100 karakter.';
  end if;
  if exists (select 1 from public.profiles where id = v_user_id) then
    return;
  end if;

  select id into v_invite_id
  from public.invite_codes
  where code = trim(p_code)
    and active
    and (expires_at is null or expires_at > now())
    and (max_uses is null or used_count < max_uses)
  for update;
  if v_invite_id is null then
    raise exception 'Kode undangan tidak valid atau sudah tidak aktif.';
  end if;

  insert into public.profiles (id, full_name, role)
  values (v_user_id, trim(p_full_name), 'anggota');
  update public.invite_codes set used_count = used_count + 1 where id = v_invite_id;
end;
$$;

revoke all on function public.join_kkn(text, text) from public, anon;
grant execute on function public.join_kkn(text, text) to authenticated;

-- Supaya aman bila query pernah dijalankan sebagian/sebelumnya.
-- Hanya policy yang dibuat file ini yang direset; tabel dan data tidak dihapus.
drop policy if exists "profile read own or staff" on public.profiles;
drop policy if exists "catalog read" on public.personal_catalog;
drop policy if exists "catalog staff insert" on public.personal_catalog;
drop policy if exists "catalog staff update" on public.personal_catalog;
drop policy if exists "group read" on public.group_inventory;
drop policy if exists "group staff insert" on public.group_inventory;
drop policy if exists "group staff update" on public.group_inventory;
drop policy if exists "checklist read own or staff" on public.personal_checklist;
drop policy if exists "checklist insert own" on public.personal_checklist;
drop policy if exists "checklist update own" on public.personal_checklist;
drop policy if exists "requests read own or staff" on public.logistics_requests;
drop policy if exists "requests insert pending own" on public.logistics_requests;
drop policy if exists "requests staff update" on public.logistics_requests;

create policy "profile read own or staff" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_staff()));
-- Tidak ada kebijakan edit profil langsung: role hanya diubah admin lewat SQL Editor.

create policy "catalog read" on public.personal_catalog
  for select to authenticated using (active);
create policy "catalog staff insert" on public.personal_catalog
  for insert to authenticated with check ((select public.is_staff()));
create policy "catalog staff update" on public.personal_catalog
  for update to authenticated using ((select public.is_staff()))
  with check ((select public.is_staff()));

create policy "group read" on public.group_inventory
  for select to authenticated using (active);
create policy "group staff insert" on public.group_inventory
  for insert to authenticated with check ((select public.is_staff()));
create policy "group staff update" on public.group_inventory
  for update to authenticated using ((select public.is_staff()))
  with check ((select public.is_staff()));

create policy "checklist read own or staff" on public.personal_checklist
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));
create policy "checklist insert own" on public.personal_checklist
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "checklist update own" on public.personal_checklist
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "requests read own or staff" on public.logistics_requests
  for select to authenticated
  using (requester_id = (select auth.uid()) or (select public.is_staff()));
create policy "requests insert pending own" on public.logistics_requests
  for insert to authenticated
  with check (
    requester_id = (select auth.uid())
    and status = 'pending'
    and staff_note is null
  );
create policy "requests staff update" on public.logistics_requests
  for update to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

-- Tidak ada policy untuk membaca kode undangan. Aplikasi hanya memanggil join_kkn().
-- Kode undangan pertama dibuat terpisah di SQL Editor, jangan commit nilainya.
