<p align="center">
  <img src="docs/images/logo.svg" width="200" alt="NotifyHub logo" />
</p>

# NotifyHub

NotifyHub est un service de notifications multi-tenant construit avec NestJS. Il expose une API publique pour les applications clientes et une API d'administration pour la gestion de la plateforme, avec prise en charge de l'envoi asynchrone, de la planification, du suivi d'usage et de la documentation Swagger.

## Vue d'ensemble

NotifyHub permet a une application cliente de :

- enregistrer des utilisateurs identifies par un `external_id`
- rattacher des abonnements aux canaux supportes
- creer des notifications immediates ou planifiees
- suivre l'etat des envois et les tentatives de livraison

Le projet est pense autour de quelques principes cles :

- isolation des donnees par tenant
- traitements asynchrones avec BullMQ et Redis
- tracabilite des envois
- separation claire entre l'API publique et l'API d'administration

## Canaux supportes

- Email
- Expo Push (à venir)

## Architecture

### API publique

L'authentification se fait via l'en-tete `x-api-key`.

Principales ressources :

- `/users`
- `/subscriptions`
- `/channel-configs`
- `/notifications`
- `/usage`

### API d'administration

L'authentification se fait via `Authorization: Bearer <token>`.

Principales ressources :

- `/admin/auth/login`
- `/admin/tenants`
- `/admin/tenants/:email/api-keys`
- `/admin/tenants/:email/usage`

### Traitements asynchrones

L'envoi des notifications est delegue a des workers BullMQ appuyes sur Redis. Cela permet a l'API de :

- repondre rapidement sans attendre l'envoi effectif
- planifier des envois via `send_at`
- conserver un historique des tentatives
- preparer des strategies de retry si necessaire

## Stack technique

- Node.js 20
- TypeScript
- NestJS
- Prisma
- PostgreSQL
- Redis
- BullMQ
- Swagger / OpenAPI
- pnpm
- Docker Compose

## Prerequis

Pour un lancement local hors Docker :

- Node.js 20+
- pnpm
- PostgreSQL
- Redis

Pour un lancement conteneurise :

- Docker
- Docker Compose

## Configuration `.env`

Copie le fichier d'exemple puis adapte-le a ton environnement :

```bash
Copy-Item .env.example .env
```

Points importants :

- dans Docker, `DATABASE_URL` doit pointer vers `postgres:5432`
- hors Docker, l'hote de base de donnees est generalement `localhost`
- `POSTGRES_PORT` sert a exposer PostgreSQL sur la machine hote
- `ADMIN_EMAIL` et `ADMIN_PASSWORD` sont utilises par le seed Prisma

Exemple d'URL de base de donnees pour Docker :

```env
DATABASE_URL="postgresql://notifyhubAdmin:CHANGE_ME@postgres:5432/notifyhub?schema=public"
```

Variables principales :

| Variable | Description |
| --- | --- |
| `PORT` | Port HTTP de l'API |
| `DATABASE_URL` | Chaine de connexion PostgreSQL |
| `POSTGRES_USER` | Utilisateur PostgreSQL pour Docker |
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL pour Docker |
| `POSTGRES_DB` | Nom de la base PostgreSQL |
| `POSTGRES_PORT` | Port PostgreSQL expose sur l'hote |
| `REDIS_HOST` | Hote Redis |
| `REDIS_PORT` | Port Redis |
| `ADMIN_EMAIL` | Email admin cree par le seed |
| `ADMIN_PASSWORD` | Mot de passe admin cree par le seed |
| `JWT_SECRET` | Secret de signature JWT pour l'admin |
| `EXPO_ACCESS_TOKEN` | Variable reservee a l'integration Expo |
| `WEBHOOK_SIGNATURE_HEADER` | Variable reservee aux webhooks |
| `WEBHOOK_SIGNATURE_ALGO` | Variable reservee aux webhooks |

## Installation

```bash
pnpm install
```

## Lancer le projet en local

### 1. Demarrer PostgreSQL et Redis

Si ces services ne tournent pas deja en local, le plus simple est de demarrer l'infrastructure avec Docker :

```bash
docker compose --env-file .env -f docker/docker-compose.yml up -d postgres redis mailhog
```

### 2. Generer le client Prisma

```bash
pnpm prisma generate
```

### 3. Appliquer le schema de base de donnees

Pour un environnement de developpement :

```bash
pnpm prisma db push
```

Si tu veux appliquer les migrations plutot que pousser le schema :

```bash
pnpm prisma migrate deploy
```

### 4. Initialiser le compte admin

```bash
pnpm seed
```

Le seed cree ou met a jour le compte admin defini par `ADMIN_EMAIL` et `ADMIN_PASSWORD`.

### 5. Demarrer l'API

```bash
pnpm run start:dev
```

Autres scripts utiles :

```bash
pnpm run build
pnpm run start
pnpm run start:debug
pnpm run start:prod
pnpm run lint
pnpm run lint:check
pnpm run test
pnpm run test:e2e
pnpm run test:cov
```

## Lancer avec Docker

Le fichier Compose se trouve dans `docker/docker-compose.yml`.

### Demarrer tous les services

```bash
docker compose --env-file .env -f docker/docker-compose.yml up -d --build
```

Cela demarre :

- `postgres`
- `redis`
- `mailhog`
- `api`

### Arreter les services

```bash
docker compose --env-file .env -f docker/docker-compose.yml down
```

### Consulter les logs de l'API

```bash
docker logs -f notifyhub-api
```

## Documentation API

Une fois l'application lancee :

- API publique : http://localhost:3000/docs/public
- API admin : http://localhost:3000/docs/admin

## Healthcheck

Endpoint de sante :

- `GET /health`

Il verifie la connectivite PostgreSQL et Redis.

## Parcours typique cote API publique

1. Creer un utilisateur avec un `external_id`
2. Ajouter un ou plusieurs abonnements pour cet utilisateur
3. Configurer le canal si necessaire
4. Creer une notification
5. Consulter le statut et les tentatives d'envoi

Envoi immediat :

- creer une notification sans `send_at`

Envoi planifie :

- creer une notification avec `send_at`

## Resume du modele de donnees

Entites principales :

- `tenant`
- `api_key`
- `user`
- `subscription`
- `channel_config`
- `notification`
- `delivery_attempt`
- `webhook_endpoint`
- `admin_user`
- `platform_audit_log`

Plans disponibles :

- `FREE`
- `PRO`
- `ULTRA`

Quotas actuellement definis :

- `FREE` : 60 req/min, 1 000 notifications/mois
- `PRO` : 120 req/min, 50 000 notifications/mois
- `ULTRA` : 300 req/min, 500 000 notifications/mois

## Email en developpement local

La stack Docker inclut MailHog pour tester les emails en local :

- SMTP : `localhost:1025`
- Interface web : http://localhost:8025

La configuration du canal email est stockee par tenant via `channel-configs`.

## Tests

Tests automatises presents dans le depot :

- tests unitaires avec Jest
- point d'entree e2e dans `test/`

Des ressources de tests manuels sont aussi presentes :

- collections Postman dans `postman/`
- variables globales dans `postman/globals/`

## Structure du projet

```text
src/
  admin/         Modules de l'API d'administration
  public/        Modules de l'API publique
  common/        Guards, services et helpers partages
  health/        Endpoint de sante
prisma/
  migrations/    Migrations Prisma
  schema.prisma  Schema de base de donnees
  seed.ts        Seed admin
docker/
  docker-compose.yml
  Dockerfile
docs/
  images/
postman/
  collections/
```

## Portee actuelle et limites

- le projet execute actuellement l'API et la logique worker dans le meme service
- des variables de signature webhook existent, mais le flux webhook n'est pas encore documente comme une fonctionnalite production-ready
- l'integration Expo existe cote sender, mais peut demander un durcissement supplementaire selon l'environnement de deploiement

## Roadmap

- separer l'API et les workers en services deployables distincts
- ajouter des retries configurables et la signature des webhooks
- ajouter de nouveaux canaux comme SMS, Discord ou Slack
- enrichir les analytics par tenant
- construire un back-office admin

## Licence

Le depot est actuellement marque `UNLICENSED`.
