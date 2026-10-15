-- Ejecutar en Supabase > SQL Editor

create table if not exists public.inscripciones (
  id             uuid primary key default gen_random_uuid(),
  tipo_documento text not null check (tipo_documento in ('dni', 'carnet')),
  documento      text not null,
  correo         text not null,
  nombres        text not null,
  apellidos      text not null,
  programa       text not null,
  ciclo          text not null,
  participacion  text not null check (participacion in ('Asistente', 'Ponente')),
  created_at     timestamptz not null default now(),
  constraint inscripciones_documento_key unique (documento),
  constraint inscripciones_correo_key unique (correo)
);

alter table public.inscripciones enable row level security;

-- El formulario público solo puede INSERTAR; no puede leer ni modificar inscripciones.
drop policy if exists "inscripcion publica" on public.inscripciones;
create policy "inscripcion publica"
  on public.inscripciones
  for insert
  to anon
  with check (true);
