-- Signup identity fields: CPF and phone on profiles

alter table public.profiles
  add column if not exists cpf text,
  add column if not exists phone text;

comment on column public.profiles.cpf is 'CPF informado no cadastro (normalizado para dígitos no app).';
comment on column public.profiles.phone is 'Telefone informado no cadastro (normalizado para dígitos no app).';

alter table public.profiles
  drop constraint if exists profiles_cpf_digits_chk;

alter table public.profiles
  add constraint profiles_cpf_digits_chk
  check (
    cpf is null
    or length(regexp_replace(cpf, '\D', '', 'g')) = 11
  );

alter table public.profiles
  drop constraint if exists profiles_phone_digits_chk;

alter table public.profiles
  add constraint profiles_phone_digits_chk
  check (
    phone is null
    or length(regexp_replace(phone, '\D', '', 'g')) between 10 and 11
  );

create unique index if not exists profiles_cpf_digits_uniq
  on public.profiles ((regexp_replace(cpf, '\D', '', 'g')))
  where cpf is not null;
