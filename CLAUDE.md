# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

```
RideOnClient/rideon-client/
  mobile/          # React Native (Expo) app
  web/             # React + Vite admin web app
  shared/          # Shared auth utilities, constants, validations
RideOnServer/      # ASP.NET Core 8 REST API
RideOnDB/
  schema.sql       # Full PostgreSQL schema (read-only reference)
  migrations/      # Incremental SQL migration files
  StoredProcedures/
```

## Commands

### Mobile (React Native / Expo)
```bash
cd RideOnClient/rideon-client/mobile
npm install
npm start              # Expo dev server
npm run android        # Android emulator
npm run ios            # iOS simulator
```

### Web (React + Vite)
```bash
cd RideOnClient/rideon-client/web
npm install
npm run dev            # Dev server at http://localhost:5173
npm run build          # Production build
npm run lint           # ESLint
npm run preview        # Preview production build
```

### Server (ASP.NET Core)
```bash
cd RideOnServer
dotnet restore
dotnet run             # Dev server (reads appsettings.Development.json)
dotnet build
dotnet publish -c Release -o ./publish
```
The server is also containerized — see `RideOnServer/Dockerfile`. It listens on port 10000 in production (deployed on Render at `https://rideon-project.onrender.com`).

## Architecture Overview

### Data flow
All client API calls go through a custom `axiosInstance` (one per client app, in `src/services/axiosInstance.js`). The instance attaches the JWT from storage to every request and handles 401 responses by clearing auth state and calling a registered logout handler.

The server exposes REST endpoints through controllers → BL classes → DAL classes. All DB access goes through `DBServices.cs`, which calls PostgreSQL **stored procedures** exclusively — no inline SQL in DAL files. Parameter types are resolved by column name convention in `AddParameterWithType`.

### Authentication
- Login returns a JWT containing `PersonId`, `Username`, `FirstName`, `LastName`, plus repeated `RoleId`/`RoleName`/`RanchId`/`RanchName` claims (one set per approved ranch-role).
- Clients store the token in `AsyncStorage` (mobile) or `localStorage` (web) under keys from `shared/auth/constants/storageKeys.js`.
- Role names are Hebrew strings defined in `RoleNames.cs`: `"משלם"`, `"אדמין חווה"`, `"מזכירת חווה מארחת"`, `"עובד חווה"`, `"SuperUser"`.
- Server-side authorization uses `UserAccessValidator.EnsureUserHasRoleInRanch(personId, ranchId, roleName)` — not ASP.NET `[Authorize(Roles=...)]` attributes.
- OTP-based password reset is handled by `OtpService` / `OtpDAL` / `PasswordResetService`.

### Role-based UI
Both clients show different screens per active role. After login, the user picks a ranch+role (`SelectActiveRole`). The chosen role is persisted and held in `ActiveRoleContext`. The mobile navigator uses `GuardedScreen` wrappers with `allowedRoles` arrays.

**Mobile roles:** Admin (`אדמין חווה`), Payer (`משלם`), Worker (`עובד חווה`)  
**Web roles:** Secretary (`מזכירת חווה מארחת`), SuperUser

### Supabase usage (limited)
Supabase is used **only** for file storage (the `health-certificates` bucket). The `supabaseClient.js` in both apps uses the anon key directly. All other data operations go through the custom ASP.NET API.

### Shared code
`RideOnClient/rideon-client/shared/` contains auth error helpers, storage key constants, input validations, and profile/competition mappings that are imported by both `mobile` and `web`. Neither app has its own copy — always update shared utilities in `shared/`.

### Web-only features
The web app handles secretary competition management (classes, stalls, shavings, payments, health certificate approvals, change tracking) and superuser admin (user requests, judges, patterns, prizes, fines, notifications). It uses Tailwind CSS v4, React Router v7, and `@dnd-kit` for drag-and-drop stall maps.

### Server configuration
Connection strings and JWT settings live in `appsettings.json` (production) and `appsettings.Development.json` (local). The `appsettings.Development.json` is gitignored — create it locally with connection strings under `ConnectionStrings.*` and `Jwt.*` keys to match `appsettings.json` structure.

## Working Rules

### Mobile API URL
The mobile API URL is a hardcoded string in `RideOnClient/rideon-client/mobile/src/config/apiBaseUrl.js`. There is no env-switching mechanism. To point at a local server, edit that file to use the host machine's LAN IP (not `localhost`) — Expo on a device/emulator cannot reach the host via `localhost`. Revert before committing.

### Server changes
After modifying any `.cs` file, run `dotnet build` in `RideOnServer/` to verify compilation.

### Stored procedures and DAL
Before modifying a DAL file or `DBServices.cs`, read the corresponding stored procedure in `RideOnDB/StoredProcedures/`. The Dictionary passed to `CreateCommandWithStoredProcedure` is bound **positionally** (`@p1, @p2…`) — entry order must match the SP's parameter order exactly. Dictionary key names only affect NpgsqlDbType resolution inside `AddParameterWithType`, not the SQL binding.

### Bundler configs and the shared folder
`metro.config.js` sets `watchFolders`, `nodeModulesPaths`, and an `extraNodeModules` alias (`shared`) so Metro can resolve files outside `mobile/` — do not remove these. `vite.config.js` has no alias for `shared/`; the web app reaches shared code via relative paths. Do not modify either config regarding the shared folder unless explicitly asked.



