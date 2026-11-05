-- Create the tuner profile when a user signs up, so the app doesn't have to upsert it on every request.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.tuners (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Existing users get a profile too.
insert into public.tuners (id) select id from auth.users on conflict (id) do nothing;
