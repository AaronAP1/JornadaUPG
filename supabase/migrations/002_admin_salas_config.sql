-- Ejecutar en Supabase > SQL Editor (después de 001_inscripciones.sql)
-- Panel de administración: admins, configuración, salas, asistencias y funciones para participantes.

-- ============ ADMINS ============
-- Un admin es un usuario de Supabase Auth registrado en esta tabla.
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

drop policy if exists "admin ve su fila" on public.admins;
create policy "admin ve su fila" on public.admins
  for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

-- ============ CONFIGURACIÓN (una sola fila) ============
create table if not exists public.configuracion (
  id                     int primary key default 1 check (id = 1),
  inscripciones_abiertas boolean not null default true,
  ingreso_habilitado     boolean not null default true,
  banner_url             text,
  updated_at             timestamptz not null default now()
);
insert into public.configuracion (id) values (1) on conflict (id) do nothing;
alter table public.configuracion enable row level security;

drop policy if exists "config lectura publica" on public.configuracion;
create policy "config lectura publica" on public.configuracion
  for select to anon, authenticated
  using (true);

drop policy if exists "config admin actualiza" on public.configuracion;
create policy "config admin actualiza" on public.configuracion
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ============ SALAS ============
create table if not exists public.salas (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  descripcion text not null default '',
  link        text not null,
  orden       int not null default 0,
  principal   boolean not null default false,
  activa      boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table public.salas enable row level security;

-- Solo los admins leen la tabla; los participantes reciben las salas vía login_participante().
drop policy if exists "salas admin" on public.salas;
create policy "salas admin" on public.salas
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

insert into public.salas (nombre, link, orden, principal)
select * from (values
  ('Sala Magistral', 'https://us02web.zoom.us/j/82561192079', 0, true),
  ('Sala 1', 'https://us02web.zoom.us/j/83077287857', 1, false),
  ('Sala 2', 'https://us02web.zoom.us/j/83267616642', 2, false),
  ('Sala 3', 'https://us02web.zoom.us/j/85949244191', 3, false),
  ('Sala 4', 'https://us02web.zoom.us/j/84514172671', 4, false),
  ('Sala 5', 'https://us02web.zoom.us/j/84783643658', 5, false),
  ('Sala 6', 'https://us02web.zoom.us/j/81764115860', 6, false),
  ('Sala 7', 'https://us02web.zoom.us/j/86347381724', 7, false)
) as v (nombre, link, orden, principal)
where not exists (select 1 from public.salas);

-- ============ INSCRIPCIONES: permisos de admin + cierre de inscripciones ============
drop policy if exists "inscripcion publica" on public.inscripciones;
create policy "inscripcion publica" on public.inscripciones
  for insert to anon
  with check ((select inscripciones_abiertas from public.configuracion where id = 1));

drop policy if exists "inscripciones admin" on public.inscripciones;
create policy "inscripciones admin" on public.inscripciones
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ============ ASISTENCIAS ============
create table if not exists public.asistencias (
  id             uuid primary key default gen_random_uuid(),
  inscripcion_id uuid not null references public.inscripciones (id) on delete cascade,
  fecha          date not null default (now() at time zone 'America/Lima')::date,
  created_at     timestamptz not null default now(),
  constraint asistencias_unica_por_dia unique (inscripcion_id, fecha)
);
alter table public.asistencias enable row level security;

drop policy if exists "asistencias admin" on public.asistencias;
create policy "asistencias admin" on public.asistencias
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ============ FUNCIONES PARA PARTICIPANTES ============
-- Busca una inscripción por correo + documento (ambos obligatorios).
create or replace function public.buscar_inscripcion(p_correo text, p_documento text)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'id', i.id, 'tipo_documento', i.tipo_documento, 'documento', i.documento,
    'correo', i.correo, 'nombres', i.nombres, 'apellidos', i.apellidos,
    'programa', i.programa, 'ciclo', i.ciclo, 'participacion', i.participacion
  )
  from public.inscripciones i
  where i.correo = lower(trim(p_correo)) and i.documento = trim(p_documento);
$$;

-- Ingreso al evento: valida credenciales, registra asistencia del día y devuelve las salas.
create or replace function public.login_participante(p_correo text, p_documento text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_participante json;
  v_id uuid;
  v_hoy date := (now() at time zone 'America/Lima')::date;
  v_asistencia timestamptz;
begin
  v_participante := public.buscar_inscripcion(p_correo, p_documento);
  if v_participante is null then
    return json_build_object('success', false, 'message', 'Correo o documento incorrectos');
  end if;

  if not coalesce((select ingreso_habilitado from public.configuracion where id = 1), false) then
    return json_build_object('success', false, 'message', 'El ingreso al evento aún no está habilitado');
  end if;

  v_id := (v_participante ->> 'id')::uuid;
  insert into public.asistencias (inscripcion_id, fecha) values (v_id, v_hoy)
  on conflict (inscripcion_id, fecha) do nothing;
  select created_at into v_asistencia from public.asistencias where inscripcion_id = v_id and fecha = v_hoy;

  return json_build_object(
    'success', true,
    'participante', v_participante,
    'asistencia', json_build_object('fecha', v_hoy, 'registrado_en', v_asistencia),
    'salas', coalesce((
      select json_agg(json_build_object(
        'id', s.id, 'nombre', s.nombre, 'descripcion', s.descripcion,
        'principal', s.principal, 'activa', s.activa,
        'link', case when s.activa then s.link end
      ) order by s.principal desc, s.orden, s.nombre)
      from public.salas s
    ), '[]'::json)
  );
end;
$$;

-- Edición de datos por el propio participante (no permite cambiar documento ni correo).
create or replace function public.actualizar_mis_datos(
  p_correo text, p_documento text,
  p_nombres text, p_apellidos text, p_programa text, p_ciclo text, p_participacion text
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.inscripciones set
    nombres = trim(p_nombres),
    apellidos = trim(p_apellidos),
    programa = p_programa,
    ciclo = p_ciclo,
    participacion = p_participacion
  where correo = lower(trim(p_correo)) and documento = trim(p_documento);

  if not found then
    return json_build_object('success', false, 'message', 'Inscripción no encontrada');
  end if;
  return json_build_object('success', true, 'participante', public.buscar_inscripcion(p_correo, p_documento));
end;
$$;

grant execute on function public.buscar_inscripcion(text, text) to anon, authenticated;
grant execute on function public.login_participante(text, text) to anon, authenticated;
grant execute on function public.actualizar_mis_datos(text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- ============ CREAR UN ADMIN ============
-- 1) Authentication > Users > Add user > Create new user (correo + contraseña, marcar "Auto Confirm User").
-- 2) Ejecutar, reemplazando el correo:
-- insert into public.admins (user_id) select id from auth.users where email = 'admin@upeu.edu.pe';
