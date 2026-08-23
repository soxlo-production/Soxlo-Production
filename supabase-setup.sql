create table if not exists public.song_likes (
  song_id text not null,
  voter_id text not null,
  created_at timestamptz not null default now(),
  primary key (song_id, voter_id)
);

alter table public.song_likes enable row level security;

drop policy if exists "Anyone can read song likes" on public.song_likes;
create policy "Anyone can read song likes"
on public.song_likes
for select
to anon, authenticated
using (true);

drop policy if exists "Anyone can add one browser like" on public.song_likes;
create policy "Anyone can add one browser like"
on public.song_likes
for insert
to anon, authenticated
with check (
  length(song_id) between 1 and 120
  and length(voter_id) between 8 and 120
);

grant select, insert on table public.song_likes to anon, authenticated;
