-- Account deletion (privacy): a signed-in user can delete their own account.
-- Every table cascades from auth.users -> tuners, so customers, instruments, services, reminder logs,
-- availability and booking requests (which hold customers' names/phones) are all removed with it.
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
