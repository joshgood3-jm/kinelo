-- Run this in your Supabase SQL editor

-- Profiles (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  full_name text,
  avatar_url text,
  created_at timestamptz default now() not null
);

-- Movies cache (TMDB data stored locally to avoid repeated API calls)
create table if not exists public.movies (
  id integer primary key, -- TMDB movie id
  title text not null,
  poster_path text,
  year integer,
  genres text[] default '{}',
  overview text,
  director text,
  cached_at timestamptz default now() not null
);

-- User movie rankings
create table if not exists public.user_movies (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  movie_id integer references public.movies(id) not null,
  elo_score integer default 1000 not null,
  comparisons_count integer default 0 not null,
  added_at timestamptz default now() not null,
  unique(user_id, movie_id)
);

-- Pairwise comparisons log
create table if not exists public.comparisons (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  winner_movie_id integer references public.movies(id) not null,
  loser_movie_id integer references public.movies(id) not null,
  created_at timestamptz default now() not null
);

-- Friendships
create table if not exists public.friendships (
  id uuid default gen_random_uuid() primary key,
  requester_id uuid references public.profiles(id) on delete cascade not null,
  addressee_id uuid references public.profiles(id) on delete cascade not null,
  status text check (status in ('pending', 'accepted')) default 'pending' not null,
  created_at timestamptz default now() not null,
  unique(requester_id, addressee_id)
);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.movies enable row level security;
alter table public.user_movies enable row level security;
alter table public.comparisons enable row level security;
alter table public.friendships enable row level security;

-- RLS Policies

-- Profiles: readable by all authenticated users, writable by owner
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select to authenticated using (true);
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Movies: readable by all, insertable by authenticated
create policy "Movies readable by all"
  on public.movies for select using (true);
create policy "Movies insertable by authenticated"
  on public.movies for insert to authenticated with check (true);
create policy "Movies updatable by authenticated"
  on public.movies for update to authenticated using (true);

-- User movies: own movies + friends' movies
create policy "Users can view own movies"
  on public.user_movies for select using (auth.uid() = user_id);
create policy "Friends can view each other's movies"
  on public.user_movies for select using (
    exists (
      select 1 from public.friendships
      where status = 'accepted'
      and ((requester_id = auth.uid() and addressee_id = user_id)
        or (addressee_id = auth.uid() and requester_id = user_id))
    )
  );
create policy "Users can manage own movies"
  on public.user_movies for all using (auth.uid() = user_id);

-- Comparisons: own only
create policy "Users manage own comparisons"
  on public.comparisons for all using (auth.uid() = user_id);

-- Friendships: viewable by participants
create policy "Friendship participants can view"
  on public.friendships for select using (
    auth.uid() = requester_id or auth.uid() = addressee_id
  );
create policy "Authenticated users can send requests"
  on public.friendships for insert to authenticated
  with check (auth.uid() = requester_id);
create policy "Addressee can update (accept/reject)"
  on public.friendships for update using (auth.uid() = addressee_id);
create policy "Participants can delete"
  on public.friendships for delete using (
    auth.uid() = requester_id or auth.uid() = addressee_id
  );

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Indexes for performance
create index if not exists user_movies_user_id_idx on public.user_movies(user_id);
create index if not exists user_movies_elo_idx on public.user_movies(user_id, elo_score desc);
create index if not exists friendships_requester_idx on public.friendships(requester_id);
create index if not exists friendships_addressee_idx on public.friendships(addressee_id);
