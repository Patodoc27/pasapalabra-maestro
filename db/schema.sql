/* ============================================================
   PASAPALABRA MAESTRO — tablas y reglas de seguridad
   Correr UNA sola vez en Supabase: SQL Editor → New query →
   pegar todo este archivo → Run.
   Usa el mismo proyecto que Activate; no toca sus tablas.
   ============================================================ */

create table if not exists pp_materias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  creado_en timestamptz not null default now()
);

create table if not exists pp_cursos (
  id uuid primary key default gen_random_uuid(),
  materia_id uuid not null references pp_materias(id) on delete cascade,
  nombre text not null,          -- ej. "1° A" o "3° B"
  colegio text not null default '',
  creado_en timestamptz not null default now()
);

create table if not exists pp_juegos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,     -- va en la URL: ?j=<slug>
  curso_id uuid not null references pp_cursos(id) on delete cascade,
  titulo text not null,          -- "Pasapalabra · Biología 1° A"
  dispositivo text not null default 'pc' check (dispositivo in ('pc','movil')),
  chat boolean not null default false,
  bloque_avatares int not null default 1 check (bloque_avatares between 1 and 6),
  modos jsonb not null default '{"sola":true,"boti":true,"linea":true}',
  tiempos jsonb not null default '{"jugador_seg":240,"por_letra":true}',
  abre_en timestamptz,           -- opcional: antes de esta hora no se puede jugar
  cierra_en timestamptz,         -- opcional: después de esta hora se bloquea
  permitir_repaso boolean not null default true,  -- tras el cierre, jugar sin puntaje
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);
create index if not exists pp_juegos_slug_idx on pp_juegos (slug);

create table if not exists pp_palabras (
  id uuid primary key default gen_random_uuid(),
  juego_id uuid not null references pp_juegos(id) on delete cascade,
  letra text not null,           -- "A", "B", ... "Y"
  modo text not null default 'empieza' check (modo in ('empieza','contiene')),
  palabra text not null,
  variantes text[] not null default '{}',  -- respuestas también aceptadas
  pista text not null default '',          -- ayuda breve que se muestra si falla
  definicion text not null,
  creado_en timestamptz not null default now()
);
create index if not exists pp_palabras_juego_idx on pp_palabras (juego_id);

create table if not exists pp_partidas (
  id uuid primary key default gen_random_uuid(),
  juego_id uuid not null references pp_juegos(id) on delete cascade,
  nombre text not null,
  apellido text not null default '',
  curso_txt text not null default '',      -- lo que tipeó el estudiante
  avatar int not null default 0,
  modo text not null default 'sola',       -- sola | boti | linea | repaso
  aciertos int not null default 0,
  errores int not null default 0,
  pasadas int not null default 0,
  puntaje int not null default 0,
  tiempo_seg int not null default 0,
  falladas text[] not null default '{}',   -- palabras erradas o pasadas
  creado_en timestamptz not null default now()
);
create index if not exists pp_partidas_juego_idx on pp_partidas (juego_id);

/* ---------- Reglas de acceso (RLS) ----------
   - Estudiantes (anónimos): pueden LEER juegos/cursos/materias/palabras
     y solo INSERTAR partidas de juegos abiertos.
   - Patricia (usuario autenticado): puede todo.                    */

alter table pp_materias enable row level security;
alter table pp_cursos   enable row level security;
alter table pp_juegos   enable row level security;
alter table pp_palabras enable row level security;
alter table pp_partidas enable row level security;

-- Lectura pública (el juego del estudiante la necesita)
create policy "lectura publica materias" on pp_materias for select using (true);
create policy "lectura publica cursos"   on pp_cursos   for select using (true);
create policy "lectura publica juegos"   on pp_juegos   for select using (true);
create policy "lectura publica palabras" on pp_palabras for select using (true);

-- Escritura de la configuración: solo la docente logueada
create policy "docente maneja materias" on pp_materias for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "docente maneja cursos" on pp_cursos for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "docente maneja juegos" on pp_juegos for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "docente maneja palabras" on pp_palabras for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Partidas: la docente las lee; los estudiantes solo las insertan
-- y únicamente si el juego está activo y dentro del horario.
create policy "docente lee partidas" on pp_partidas for select
  using (auth.role() = 'authenticated');
create policy "docente borra partidas" on pp_partidas for delete
  using (auth.role() = 'authenticated');
create policy "estudiante registra partida abierta" on pp_partidas for insert
  with check (
    exists (
      select 1 from pp_juegos j
      where j.id = juego_id
        and j.activo
        and (j.abre_en is null or now() >= j.abre_en)
        and (j.cierra_en is null or now() <= j.cierra_en)
    )
  );

/* ---------- Ranking público ----------
   Vista agregada por juego y estudiante: es lo único que ven los
   estudiantes (aciertos acumulados). La tabla pp_partidas completa
   solo la lee la docente. */
create or replace view pp_ranking as
  select juego_id, nombre, curso_txt as seccion, max(avatar) as avatar,
         sum(aciertos) as aciertos, count(*) as partidas
  from pp_partidas
  group by juego_id, nombre, curso_txt;

grant select on pp_ranking to anon, authenticated;
