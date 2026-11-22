-- Etapa 2 – Teste comportamental (processo seletivo Sócio Comercial)
-- Armazena respostas brutas; etiquetas de perfil ficam fora desta tabela.

create table if not exists public.hiring_etapa2_responses (
  id uuid primary key,
  invite_token text,
  questions_version text not null default '2.0',
  status text not null check (status in ('in_progress', 'submitted')),
  candidate_name text not null default '',
  candidate_email text not null default '',
  consent_accepted boolean not null default false,
  consent_accepted_at timestamptz,
  talent_bank_opt_in boolean not null default false,
  consent_text_version text not null default '1.0',
  answers jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  last_saved_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists hiring_etapa2_responses_invite_submitted_uidx
  on public.hiring_etapa2_responses (invite_token)
  where invite_token is not null and status = 'submitted';

create index if not exists hiring_etapa2_responses_email_idx
  on public.hiring_etapa2_responses (candidate_email);

create index if not exists hiring_etapa2_responses_status_idx
  on public.hiring_etapa2_responses (status);

alter table public.hiring_etapa2_responses enable row level security;

-- Candidatos anônimos podem inserir/atualizar o próprio registro pelo id (UUID local).
-- Leitura pública desabilitada: sócios usam service role / painel autenticado.

drop policy if exists hiring_etapa2_insert_anon on public.hiring_etapa2_responses;
create policy hiring_etapa2_insert_anon
  on public.hiring_etapa2_responses
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists hiring_etapa2_update_own_in_progress on public.hiring_etapa2_responses;
create policy hiring_etapa2_update_own_in_progress
  on public.hiring_etapa2_responses
  for update
  to anon, authenticated
  using (status = 'in_progress')
  with check (
    status in ('in_progress', 'submitted')
  );

comment on table public.hiring_etapa2_responses is
  'Respostas da Etapa 2 do processo seletivo (Sócio Comercial). Sem scores/perfis.';
