# ADR-002 — Estrategia de autenticacion y autorizacion

**Estado:** aceptado (Tarea 0.4)

## Contexto

Autenticacion actual (Django, `djangorestframework-simplejwt` 5.5, configuracion por
defecto salvo lifetimes):

- `POST /api/token/login/` -> body `{username, password}` -> `200 {access, refresh}`.
  `CustomTokenObtainPairView` no anade nada al comportamiento por defecto.
- Algoritmo **HS256**; clave de firma = `SECRET_KEY` de Django.
- Claims del token: `token_type` (`access`/`refresh`), `exp`, `iat`, `jti`, **`user_id`**
  (= UUID del usuario, como string).
- `ACCESS_TOKEN_LIFETIME = 8h`, `REFRESH_TOKEN_LIFETIME = 1d`. Sin rotacion de refresh,
  sin blacklist (app no instalada).
- `POST /api/token/refresh/` -> `{refresh}` -> `{access}`. **El frontend nunca lo llama.**
- Header: `Authorization: Bearer <access>`.
- El login valida `authenticate(username, password)` y `user.is_active is True`.
- Hashes de contrasena: formato Django `pbkdf2_sha256$<iteraciones>$<salt>$<hash>` (las
  iteraciones van embebidas en cada hash). **4 usuarios** en produccion.
- Autorizacion: funcion `es_admin_o_super` -> `role in ['admin','super']`. Roles:
  `super` / `admin` / `user`.
- Frontend: guarda **solo `access`** en `localStorage['token']`; decodifica `user_id` con
  `jwt-decode`; en `401`/`403` hace logout + redirect a `/login` (interceptor global). Sin
  cookies, sin CSRF.
- Dualidad `is_active` (auth Django) / `isActive` (BaseModel), semi-sincronizadas
  (BUG-DJANGO-020).

## Decision

1. **Mecanismo:** `@nestjs/jwt` + `passport-jwt` (`JwtStrategy`). **HS256**. Firma con
   `JWT_SECRET` (env).

2. **Contrato preservado exactamente:**
   - `POST /api/token/login/` -> `{username, password}` -> `200 {access, refresh}`.
   - `POST /api/token/refresh/` -> `{refresh}` -> `{access}` (sin rotacion, sin blacklist,
     igual que simplejwt hoy). Se implementa aunque el FE no lo use (endpoint del contrato).
   - Claim de identidad **`user_id`** (UUID string). Se incluyen tambien `token_type`,
     `exp`, `iat`, `jti` para paridad de forma del token.
   - Lifetimes: **access 8h, refresh 1d** (env `JWT_ACCESS_TTL=8h`, `JWT_REFRESH_TTL=1d`).
   - Header `Authorization: Bearer <access>`.
   - Credenciales invalidas / usuario inactivo -> **401 `{"detail": "..."}`** (forma
     simplejwt/DRF; el interceptor del FE reacciona a 401/403).

3. **Corte de tokens = corte duro (decision D1-A).** NestJS usa un `JWT_SECRET` **nuevo**.
   Los tokens emitidos por Django dejan de valer en el instante del corte; los usuarios con
   sesion abierta (4) inician sesion otra vez una unica vez. El `SECRET_KEY` de Django se
   rota/retira. No se comparte el secreto de produccion con NestJS.

4. **Contrasenas = verificar heredado + migracion progresiva (decision D2-B).**
   - El `AuthService` incluye un **verificador PBKDF2-SHA256 compatible con Django** que
     parsea iteraciones y salt del propio hash `pbkdf2_sha256$...`.
   - En el **primer login correcto** de cada usuario, la contrasena se **re-hashea con
     `argon2id`** y se persiste. Usuarios nuevos y cambios/reseteos de contrasena ya usan
     `argon2id`.
   - Requiere que Django quede **retirado o en solo lectura** en el corte (sin escritura
     concurrente sobre `usuarios_usuario.password`). Encaja con D1-A.
   - Dependencia nueva justificada: `argon2` (hashing de contrasenas; estandar recomendado
     en Node).

5. **Autorizacion:**
   - `JwtAuthGuard` (valida el token, carga el usuario, exige que este activo) +
     `RolesGuard` con `@Roles('admin','super')` que replica `es_admin_o_super`.
   - `@Public()` para los `GET` `AllowAny` del inventario.
   - Jerarquia `super > admin > user`; regla explicita "un `admin` no puede actuar sobre un
     `super`" en `PUT`/`DELETE` de usuarios (hoy dispersa e incompleta -> BUG-DJANGO-021).

6. **"Usuario activo" = `isActive === true` AND `is_active === true`.** Toda desactivacion
   (soft-delete, `cambiar-estado`) pone **ambos** a `false`; toda reactivacion, ambos a
   `true`. Corrige BUG-DJANGO-020 de forma consciente (delta interno; para el FE el unico
   efecto observable es que un usuario "eliminado" deja de poder entrar, que es lo
   correcto).

7. **Frontend de auth sin cambios.** Sigue guardando solo `access` y sin refrescar.

## Alternativas consideradas

- **Sesiones con cookie httpOnly** (en vez de Bearer en `localStorage`): mas seguro frente
  a XSS, pero romperia el frontend (interceptor, `jwt-decode`, guard) y el contrato. Fuera
  de alcance; posible mejora futura con su propio ADR.
- **RS256** (firma asimetrica): innecesario con un solo servicio que firma y verifica.
- **Rotacion de refresh + blacklist** (`token_blacklist` de simplejwt): mejora de
  seguridad real, pero el FE no usa refresh siquiera; se pospone.
- **Mantener el formato de hash de Django tambien para los nuevos** (alternativa D2-A):
  permitiria convivencia Django<->NestJS con escritura; descartada al confirmarse corte
  limpio (D1-A).
- **Forzar reseteo de contrasena a los 4 usuarios** en el corte (evita portar el
  verificador PBKDF2): posible por el tamano, pero molesto e innecesario.

## Consecuencias

- (+) El frontend no cambia; el contrato de auth se mantiene.
- (+) `JwtAuthGuard` / `RolesGuard` / `@Public` / `@Roles` centralizan la autorizacion hoy
  copiada en cada vista; se corrigen de paso BUG-DJANGO-020 y -021.
- (+) Las contrasenas migran a `argon2id` sin friccion para el usuario.
- (-) Hay que portar y **testear** el verificador PBKDF2 de Django (vectores de prueba con
  los hashes reales de los 4 usuarios en la copia de Neon).
- (-) El corte debe ser **definitivo**: si se reactivara Django con escritura tras el
  corte, los usuarios ya migrados a `argon2id` no podrian entrar por Django.
- (-) `jti` y `token_type` se incluyen por paridad de forma aunque no se exploten (sin
  blacklist).
