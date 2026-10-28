# Pasapalabra Maestro — guía de uso

Una sola aplicación que genera todos tus pasapalabras: cada uno tiene su propia URL, sus palabras, sus tiempos, su bloque de avatares, chat opcional y fecha de cierre.

## Direcciones

- **Tu panel (solo vos):** `https://patodoc27.github.io/pasapalabra-maestro/admin.html`
- **Cada pasapalabra:** `https://patodoc27.github.io/pasapalabra-maestro/?j=NOMBRE` — el botón **Copiar enlace** del panel te da la URL lista para compartir.

## Preparación única (Supabase)

Esto se hace **una sola vez** en tu proyecto de Supabase (el mismo de Activate):

1. Entrá a [supabase.com](https://supabase.com) → tu proyecto → **SQL Editor** → **New query**.
2. Pegá todo el contenido de [`db/schema.sql`](db/schema.sql) y tocá **Run**. Crea las tablas `pp_*` (no toca las de Activate).
3. **Authentication → Users → Add user → Create new user**: poné tu correo y una contraseña, activá **Auto Confirm User**. Ese es tu usuario del panel.

## Crear un pasapalabra

1. En el panel: **Nueva materia** (ej.: *Biología*).
2. Dentro de la materia: **+ Curso** (ej.: *2° A* y el colegio, si querés).
3. Dentro del curso: **+ Pasapalabra** → elegí título, URL y dispositivo (**computadora** o **celular**).
4. En **Configuración**: modos permitidos, tiempos, bloque de avatares (con la edad sugerida), chat, fecha de apertura y de cierre.
5. En **Palabras**: cargá por letra con **+**, o pegá toda la lista de una con **Pegar lista de palabras** usando el formato:

   ```
   A | ADN | Molécula que guarda la información hereditaria
   C | CÉLULA | Unidad básica de los seres vivos | pista corta | CELULA, CELULAS
   ```

   Si la palabra no empieza con la letra se marca «Contiene» sola. Conviene **más de una palabra por letra**: el rosco cambia en cada partida.

6. Tocá **Copiar enlace** y pasalo a tus estudiantes.

## Reglas que ya vienen de fábrica

- **Bloqueo real al vencer el plazo**: la base de datos rechaza las partidas después de la hora de cierre; no depende del reloj del dispositivo del estudiante.
- **Repaso**: si activaste «dejar repasar», pasado el cierre pueden jugar pero sin que se anoten puntos.
- **Participación**: la pestaña Participación muestra quién jugó, cuántas veces, aciertos, mejor puntaje, ranking del curso y las palabras que más fallan. Exportable a CSV.
- **Avatares**: 6 bloques de 8 personajes (4 varones + 4 mujeres) — dos bloques para 12-13 años, dos para 14-15 y dos para 16-18. El estudiante elige el suyo al entrar.
- Los estudiantes **no necesitan usuario**: entran con nombre, apellido y avatar.
