-- Run this in your Supabase SQL editor after the initial schema.sql
alter table public.user_movies
  add column if not exists letterboxd_rating numeric(3,1);
