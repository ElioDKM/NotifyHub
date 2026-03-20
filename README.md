<p align="center">
  <img src="docs/images/logo.svg" width="200"/>
</p>

# NotifyHub

NotifyHub est un **service de notifications “API as-a-service”**.  
Il permet à une application cliente (un *tenant*) d’envoyer des notifications **multi-canaux** (Push Expo / Email) à ses utilisateurs, **immédiatement** ou **de façon planifiée** (`send_at`), via une API HTTP.

Le projet est conçu pour être :
- **multi-tenant** (isolation des données par tenant),
- **scalable** (traitements asynchrones via queue),
- **traçable** (statuts, tentatives d’envoi),
- **sécurisé** (API keys côté public, JWT côté admin).


## Fonctionnement (vue d’ensemble)

### 1) Authentification
- **Public API** : authentification via `x-api-key` (clé rattachée à un tenant)
- **Admin API** : authentification via **JWT** (login admin)

### 2) Parcours typique côté client API
1. Créer un **User** (référencé par `external_id`)
2. Ajouter une ou plusieurs **Subscriptions** (Push Expo / Email)
3. Créer une **Notification**
   - sans `send_at` → envoi immédiat
   - avec `send_at` → envoi planifié
4. Suivre l’état de la notification (statuts + historique des tentatives)

### 3) Asynchrone (BullMQ / Redis)
L’API enregistre la demande puis délègue l’envoi à un traitement asynchrone (queue), ce qui permet :
- de ne pas bloquer les requêtes HTTP,
- de planifier des envois,
- d’appliquer des stratégies de retry (si activées),
- de tracer les tentatives (`delivery_attempt`).


## Documentation API (Swagger / OpenAPI)

Une fois l’API lancée, la documentation est accessible ici :

- **Public API (tenant)** : http://localhost:3000/docs/public  
- **Admin API** : http://localhost:3000/docs/admin  


## Stack technique

- **Node.js / TypeScript**
- **NestJS**
- **PostgreSQL** (Prisma ORM)
- **Redis + BullMQ**
- **SMTP (Mailtrap)** pour l’email
- **Expo Push** pour les notifications push
- **Swagger/OpenAPI** pour la doc API
- **Postman** pour les tests manuels


## Prérequis

- Node.js (recommandé : LTS)
- pnpm
- PostgreSQL + Redis (si exécution hors Docker)
- Docker + Docker Compose (si exécution via Docker)


## Configuration (.env)

Crée un fichier `.env` à la racine (ou copie depuis `.env.example`) et renseigne les variables nécessaires.

> ⚠️ Important :  
> - en **local**, la DB est souvent en `localhost:5433`  
> - en **Docker**, l’API doit utiliser `postgres:5432`

Exemple (Docker) :
- `DATABASE_URL="postgresql://USER:PASSWORD@postgres:5432/notifyhub?schema=public"`
- `REDIS_HOST=redis`
- `REDIS_PORT=6379`


## Installation

```bash
pnpm install
````

## Lancer le projet (local)

### Démarrage

```bash
# development
pnpm run start

# watch mode
pnpm run start:dev
```

### Prisma Studio (visualiser la DB)

```bash
npx prisma studio
```

### Production

```bash
pnpm run start:prod
```


## Base de données (Prisma)

### Appliquer le schéma / migrations

Selon ton workflow :

* si tu utilises les migrations Prisma : `pnpm prisma migrate deploy`
* sinon (dev) : `pnpm prisma db push`

### Seed

```bash
pnpm prisma db seed
```


## Lancer via Docker (recommandé)

> Le docker-compose se trouve dans `docker/docker-compose.yml`.

### Build + run

```bash
docker compose --env-file .env -f docker/docker-compose.yml up -d --build
```

### Stop

```bash
docker compose --env-file .env -f docker/docker-compose.yml down
```

### Logs

```bash
docker logs -f notifyhub-api
```

> Astuce : si ton `.env` est orienté Docker, utilise un fichier dédié (ex : `.env.docker`).


## Endpoints (aperçu)

### Public API (tenant)

* `/users`
* `/subscriptions`
* `/channel-configs`
* `/notifications`
* `/usage`

> Auth : `x-api-key`

### Admin API

* `/admin/auth/login`
* `/admin/tenants`
* `/admin/tenants/:tenantEmail/api-keys`
* `/admin/tenants/:email/usage`

> Auth : `Authorization: Bearer <token>`


## Tests

Le projet est validé principalement via des tests manuels Postman (scénarios MVP) :

* auth tenant (x-api-key)
* création user + subscription
* création notification immédiate / planifiée
* annulation / replanification (si disponible)
* endpoints admin (JWT)


## Structure (exemple)

* `src/public/*` : routes et logique Public API
* `src/admin/*` : routes Admin API (auth, tenants, api keys, usage)
* `src/common/*` : guards, types, helpers
* `prisma/*` : schema, migrations, seed


## Roadmap (exemples)

* Séparation API / worker en services Docker distincts (scalabilité)
* Signature webhook (HMAC) + retries configurables
* Nouveaux canaux : SMS / Discord / Slack
* Analytics / métriques d’usage par tenant
* Back-office admin (UI)


## Licence

Projet personnel / pédagogique.
