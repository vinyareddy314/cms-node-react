# Admin CMS + Public Catalog API + Scheduler

A comprehensive Content Management System designed for managing educational programs, terms, and lessons with multi-language support. This project includes a React-based Admin UI, a Node.js/Express API, and a background Worker for scheduled publishing.

## 🏗️ Architecture

The application is built using a microservices-like architecture (monorepo) with Docker:

*   **Web (`/web`)**: React + Vite + TypeScript. Provides the Admin Dashboard for content management.
*   **API (`/api`)**: Node.js + Express + Knex.js + PostgreSQL. Handles core business logic, CMS endpoints, and the Public Catalog API.
*   **Worker (`/worker`)**: Node.js + Knex.js. A background process running every minute to auto-publish scheduled content.
*   **Database**: PostgreSQL 16.

## 🚀 Key Features Implemented

### 1. Domain Entities (DB Enforced)
*   **Programs, Terms, Lessons**: Full hierarchy implemented with Foreign Keys.
*   **Multi-Language Support**: Programs and Lessons support primary languages and asset variants (Posters/Thumbnails).
*   **Publishing Workflow**: `Draft` -> `Scheduled` -> `Published` -> `Archived` lifecycle.

### 2. Admin CMS UI
*   **Authentication**: Role-based access (Admin, Editor) with JWT.
*   **Program Management**: List view with filters, detailed creation/editing form.
*   **Lesson Management**: drag-and-drop or modal-based editing, asset management (thumbnails), video/article support.
*   **User Management**: Extra feature for managing CMS users.

### 3. Public Catalog API
*   Exposes published content for consumers (Programs, Lessons).
*   Optimized for "Published Only" retrieval.

### 4. Background Worker
*   **Reliability**: Runs strictly every minute.
*   **Concurrency Safe**: Uses `FOR UPDATE SKIP LOCKED` to allow multiple workers to scale without race conditions.
*   **Transactional**: Publishing updates (Lesson status + Program status) happen atomically.
*   **Validation**: Auto-checks for required assets (Portrait/Landscape thumbnails) before publishing.

## 🛠️ How to Run Locally

### Prerequisites
*   Docker & Docker Compose installed.

### Steps
1.  **Clone the repository**.
2.  **Start the stack**:
    ```bash
    docker compose up --build
    ```
    This command spins up:
    *   **Postgres DB** (Local container on port 5432)
    *   **API** (localhost:4000)
    *   **Worker** (Background process)
    *   **Web UI** (localhost:3000)

    > **Note on Database Connection**: The current `docker-compose.yml` is configured to connect to a **hosted Render database** (`dpg-...render.com`) via environment variables in the `api` and `worker` services. To run strictly locally with the `db` container, update the `DB_HOST` in `docker-compose.yml` to `db`.

3.  **Access the Application**:
    *   **CMS Dashboard**: [http://localhost:3000](http://localhost:3000)
    *   **API Health Check**: [http://localhost:4000/health](http://localhost:4000/health)

4.  **Database Management (Manual)**:
    If running locally against the local DB container for the first time:
    ```bash
    # Run migrations
    cd api
    npm run migrate

    # Seed data
    npm run seed
    ```

## ☁️ Deployment

The application is designed to be cloud-agnostic but is currently configured for a **Render-style** deployment or similar PaaS.

### Current Configuration
*   **Database**: Managed PostgreSQL (e.g., Render/AWS RDS).
*   **Services**: `api`, `web`, and `worker` are containerized with individual `Dockerfile`s.
*   **Environment Variables**: Sensitive keys (DB credentials, JWT secrets) are injected via generic environment variables (`DB_HOST`, `JWT_SECRET`).

### Deployment Steps (General)
1.  **Database**: Provision a PostgreSQL instance. Run migrations against it.
2.  **API & Worker**: Build and deploy their Docker images. Ensure they have connectivity to the DB.
3.  **Web**: Build the static assets (`npm run build`) and serve via Nginx or a static site host (Vercel/Netlify/S3), OR deploy the Docker container which serves the app.

## 📋 Documentation Reference
For a detailed breakdown of implementation against specific requirements, see `CMS_REQUIREMENT_IMPLEMENTATION.md`.
