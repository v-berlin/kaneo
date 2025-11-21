# Custom Setup Guide für Kaneo

Diese Anleitung erklärt detailliert, wie du deine angepasste Version von Kaneo buildest und deployst, ohne die Standard-Container zu verwenden.

## Inhaltsverzeichnis

1. [Voraussetzungen](#voraussetzungen)
2. [Custom Docker Images lokal bauen](#custom-docker-images-lokal-bauen)
3. [Images zu einer Custom Registry pushen](#images-zu-einer-custom-registry-pushen)
4. [Deployment mit Custom Images](#deployment-mit-custom-images)
5. [Kubernetes Deployment](#kubernetes-deployment)
6. [Troubleshooting](#troubleshooting)

---

## Voraussetzungen

Bevor du beginnst, stelle sicher, dass folgende Tools installiert sind:

```bash
# Docker installieren (falls noch nicht vorhanden)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Docker Buildx aktivieren (für Multi-Platform Builds)
docker buildx create --use --name kaneo-builder

# Optional: Docker Compose V2
docker compose version
```

## Custom Docker Images lokal bauen

### 1. Repository vorbereiten

```bash
# Repository klonen (falls noch nicht geschehen)
git clone https://github.com/v-berlin/kaneo.git
cd kaneo

# Zu deinem angepassten Branch wechseln
git checkout dein-custom-branch
```

### 2. Environment Variablen anpassen

Erstelle deine eigene `.env` Datei basierend auf dem Sample:

```bash
# Kopiere die Sample-Datei
cp .env.sample .env

# Bearbeite die .env Datei mit deinen Werten
nano .env
```

Wichtige Variablen für dein Custom Setup:

```bash
# URLs für dein Setup
KANEO_CLIENT_URL=https://deine-domain.de
KANEO_API_URL=https://api.deine-domain.de

# Datenbank
DATABASE_URL=postgresql://dein_user:dein_passwort@postgres:5432/kaneo
POSTGRES_DB=kaneo
POSTGRES_USER=dein_user
POSTGRES_PASSWORD=dein_sicheres_passwort

# Authentication (generiere einen sicheren Schlüssel mit: openssl rand -hex 32)
AUTH_SECRET=dein_generierter_auth_secret_hier_einfuegen

# Optional: GitHub Integration
GITHUB_CLIENT_ID=deine_github_client_id
GITHUB_CLIENT_SECRET=dein_github_secret
GITHUB_APP_ID=deine_app_id
GITHUB_WEBHOOK_SECRET=dein_webhook_secret
GITHUB_PRIVATE_KEY="dein_private_key_in_pem_format"

# Optional: SMTP für E-Mails
SMTP_HOST=smtp.deiner-provider.de
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=dein_smtp_user
SMTP_PASSWORD=dein_smtp_passwort
SMTP_FROM=noreply@deine-domain.de
SMTP_REQUIRE_TLS=true
```

### 3. API Image bauen

```bash
# API Image bauen
docker build -t dein-username/kaneo-api:latest -f apps/api/Dockerfile .

# Optional: Mit spezifischer Version taggen
docker build -t dein-username/kaneo-api:1.0.0 -f apps/api/Dockerfile .

# Multi-Platform Build (für ARM64 und AMD64)
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t dein-username/kaneo-api:latest \
  -f apps/api/Dockerfile \
  --push \
  .
```

**Wichtig:** 
- Der Build-Kontext muss das Root-Verzeichnis sein (`.`), nicht `apps/api/`, da die Dockerfiles auf Workspace-Packages zugreifen.
- Bei Multi-Platform Builds (`--platform linux/amd64,linux/arm64`) muss `--push` verwendet werden, um direkt zu einer Registry zu pushen. Für lokale Tests ohne Push, verwende nur eine Platform oder baue ohne `--platform` Flag.

### 4. Web Image bauen

```bash
# Web Image bauen
docker build -t dein-username/kaneo-web:latest -f apps/web/Dockerfile .

# Optional: Mit spezifischer Version taggen
docker build -t dein-username/kaneo-web:1.0.0 -f apps/web/Dockerfile .

# Multi-Platform Build
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t dein-username/kaneo-web:latest \
  -f apps/web/Dockerfile \
  --push \
  .
```

### 5. Beide Images gleichzeitig bauen (Bash Script)

Erstelle ein Build-Script `build-custom.sh`:

```bash
#!/bin/bash

# Variablen
REGISTRY="dein-username"
VERSION=${1:-"latest"}
PLATFORMS="linux/amd64,linux/arm64"

# Farben für Output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Building Kaneo Custom Images - Version: ${VERSION}${NC}"

# API Image bauen
echo -e "${GREEN}Building API Image...${NC}"
docker buildx build \
  --platform ${PLATFORMS} \
  -t ${REGISTRY}/kaneo-api:${VERSION} \
  -t ${REGISTRY}/kaneo-api:latest \
  -f apps/api/Dockerfile \
  --push \
  .

# Web Image bauen
echo -e "${GREEN}Building Web Image...${NC}"
docker buildx build \
  --platform ${PLATFORMS} \
  -t ${REGISTRY}/kaneo-web:${VERSION} \
  -t ${REGISTRY}/kaneo-web:latest \
  -f apps/web/Dockerfile \
  --push \
  .

echo -e "${GREEN}Build complete!${NC}"
echo "Images created:"
echo "  - ${REGISTRY}/kaneo-api:${VERSION}"
echo "  - ${REGISTRY}/kaneo-web:${VERSION}"
```

Ausführen:

```bash
chmod +x build-custom.sh

# Erst bei deiner Registry einloggen (da --push verwendet wird)
docker login

# Dann Script ausführen
./build-custom.sh 1.0.0
```

**Hinweis:** Das Script verwendet `--push`, um Multi-Platform Builds zu ermöglichen. Du musst vorher bei deiner Container Registry eingeloggt sein.

## Images zu einer Custom Registry pushen

### Option 1: Docker Hub

```bash
# Login bei Docker Hub
docker login

# Images pushen
docker push dein-username/kaneo-api:latest
docker push dein-username/kaneo-api:1.0.0
docker push dein-username/kaneo-web:latest
docker push dein-username/kaneo-web:1.0.0
```

### Option 2: GitHub Container Registry (GHCR)

```bash
# Login bei GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Images taggen für GHCR
docker tag dein-username/kaneo-api:latest ghcr.io/dein-username/kaneo-api:latest
docker tag dein-username/kaneo-web:latest ghcr.io/dein-username/kaneo-web:latest

# Images pushen
docker push ghcr.io/dein-username/kaneo-api:latest
docker push ghcr.io/dein-username/kaneo-web:latest
```

### Option 3: Private Registry

```bash
# Login bei deiner privaten Registry
docker login registry.deine-firma.de

# Images taggen
docker tag dein-username/kaneo-api:latest registry.deine-firma.de/kaneo-api:latest
docker tag dein-username/kaneo-web:latest registry.deine-firma.de/kaneo-web:latest

# Images pushen
docker push registry.deine-firma.de/kaneo-api:latest
docker push registry.deine-firma.de/kaneo-web:latest
```

### Komplettes Push-Script

Erstelle `push-custom.sh`:

```bash
#!/bin/bash

REGISTRY=${1:-"dein-username"}
VERSION=${2:-"latest"}

echo "Pushing images to ${REGISTRY}..."

docker push ${REGISTRY}/kaneo-api:${VERSION}
docker push ${REGISTRY}/kaneo-web:${VERSION}

echo "Push complete!"
```

Ausführen:

```bash
chmod +x push-custom.sh

# Docker Hub
./push-custom.sh dein-username 1.0.0

# GHCR
./push-custom.sh ghcr.io/dein-username 1.0.0

# Private Registry
./push-custom.sh registry.deine-firma.de 1.0.0
```

## Deployment mit Custom Images

### Docker Compose Setup

Erstelle `compose.custom.yml` mit deinen Custom Images:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    env_file:
      - .env
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    image: dein-username/kaneo-api:latest  # Dein Custom Image
    ports:
      - "1337:1337"
    env_file:
      - .env
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:1337/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  web:
    image: dein-username/kaneo-web:latest  # Dein Custom Image
    ports:
      - "5173:5173"
    environment:
      - KANEO_API_URL=${KANEO_API_URL}
      - KANEO_CLIENT_URL=${KANEO_CLIENT_URL}
    depends_on:
      - api
    restart: unless-stopped

volumes:
  postgres_data:
```

### Deployment durchführen

```bash
# Mit deinem Custom Compose File starten
docker compose -f compose.custom.yml up -d

# Logs verfolgen
docker compose -f compose.custom.yml logs -f

# Status prüfen
docker compose -f compose.custom.yml ps

# Stoppen
docker compose -f compose.custom.yml down

# Stoppen und Volumes löschen (ACHTUNG: Löscht Datenbank!)
docker compose -f compose.custom.yml down -v
```

### Production Deployment mit Traefik (Reverse Proxy)

Erstelle `compose.production.yml`:

```yaml
services:
  traefik:
    image: traefik:v2.10
    command:
      - "--api.dashboard=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.email=deine@email.de"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik_letsencrypt:/letsencrypt
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    env_file:
      - .env
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - backend

  api:
    image: dein-username/kaneo-api:latest
    env_file:
      - .env
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`api.deine-domain.de`)"
      - "traefik.http.routers.api.entrypoints=websecure"
      - "traefik.http.routers.api.tls.certresolver=letsencrypt"
      - "traefik.http.services.api.loadbalancer.server.port=1337"
    networks:
      - backend
      - web

  web:
    image: dein-username/kaneo-web:latest
    environment:
      - KANEO_API_URL=https://api.deine-domain.de
      - KANEO_CLIENT_URL=https://deine-domain.de
    depends_on:
      - api
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.web.rule=Host(`deine-domain.de`)"
      - "traefik.http.routers.web.entrypoints=websecure"
      - "traefik.http.routers.web.tls.certresolver=letsencrypt"
      - "traefik.http.services.web.loadbalancer.server.port=5173"
    networks:
      - web

volumes:
  postgres_data:
  traefik_letsencrypt:

networks:
  backend:
    driver: bridge
  web:
    driver: bridge
```

Deployment:

```bash
# Production Deployment starten
docker compose -f compose.production.yml up -d

# Logs prüfen
docker compose -f compose.production.yml logs -f traefik api web
```

## Kubernetes Deployment

### 1. Helm Chart für Custom Images anpassen

Kopiere das vorhandene Helm Chart und passe es an:

```bash
# Chart kopieren
cp -r charts/kaneo charts/kaneo-custom

# values.yaml bearbeiten
nano charts/kaneo-custom/values.yaml
```

Ändere die Image-Referenzen in `values.yaml`:

```yaml
# Custom Image Konfiguration
api:
  image:
    repository: dein-username/kaneo-api
    tag: "1.0.0"
    pullPolicy: Always
  
  # Eigene Environment Variablen
  env:
    - name: DATABASE_URL
      valueFrom:
        secretKeyRef:
          name: kaneo-secrets
          key: database-url
    - name: AUTH_SECRET
      valueFrom:
        secretKeyRef:
          name: kaneo-secrets
          key: auth-secret

web:
  image:
    repository: dein-username/kaneo-web
    tag: "1.0.0"
    pullPolicy: Always
  
  env:
    - name: KANEO_API_URL
      value: "https://api.deine-domain.de"
    - name: KANEO_CLIENT_URL
      value: "https://deine-domain.de"

# PostgreSQL Konfiguration
postgresql:
  enabled: true
  auth:
    database: kaneo
    username: kaneo
    existingSecret: kaneo-secrets
    secretKeys:
      adminPasswordKey: postgres-password
      userPasswordKey: postgres-password

# Ingress für deine Domain
ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
  hosts:
    - host: deine-domain.de
      paths:
        - path: /
          pathType: Prefix
          service: web
    - host: api.deine-domain.de
      paths:
        - path: /
          pathType: Prefix
          service: api
  tls:
    - secretName: kaneo-tls
      hosts:
        - deine-domain.de
        - api.deine-domain.de
```

### 2. Secrets erstellen

Erstelle eine `secrets.yaml`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: kaneo-secrets
  namespace: kaneo
type: Opaque
stringData:
  database-url: "postgresql://kaneo:dein_passwort@kaneo-postgresql:5432/kaneo"
  auth-secret: "dein_generierter_auth_secret"
  postgres-password: "dein_postgres_passwort"
```

Secrets anwenden:

```bash
# Namespace erstellen
kubectl create namespace kaneo

# Secrets erstellen
kubectl apply -f secrets.yaml -n kaneo
```

### 3. Helm Chart installieren

```bash
# Helm Repository hinzufügen (falls externe Dependencies genutzt werden)
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Dependencies installieren
cd charts/kaneo-custom
helm dependency update

# Chart installieren
helm install kaneo . \
  --namespace kaneo \
  --create-namespace \
  --values values.yaml

# Oder mit Override-Werten
helm install kaneo . \
  --namespace kaneo \
  --create-namespace \
  --values values.yaml \
  --set api.image.tag=1.0.0 \
  --set web.image.tag=1.0.0
```

### 4. Deployment überprüfen

```bash
# Pods prüfen
kubectl get pods -n kaneo

# Services prüfen
kubectl get svc -n kaneo

# Ingress prüfen
kubectl get ingress -n kaneo

# Logs ansehen
kubectl logs -n kaneo -l app=kaneo-api -f
kubectl logs -n kaneo -l app=kaneo-web -f

# Describe pod für Details
kubectl describe pod -n kaneo kaneo-api-xxx
```

### 5. Helm Chart aktualisieren

```bash
# Neue Version deployen
helm upgrade kaneo . \
  --namespace kaneo \
  --values values.yaml \
  --set api.image.tag=1.1.0 \
  --set web.image.tag=1.1.0

# Rollback bei Problemen
helm rollback kaneo -n kaneo

# Chart deinstallieren
helm uninstall kaneo -n kaneo
```

### 6. Kubernetes Manifests ohne Helm

Falls du Helm nicht nutzen möchtest, hier ein komplettes Kubernetes Setup:

**namespace.yaml:**
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: kaneo
```

**postgresql.yaml:**
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: kaneo
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: kaneo
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:16-alpine
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          value: kaneo
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: kaneo-secrets
              key: postgres-user
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: kaneo-secrets
              key: postgres-password
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: kaneo
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
```

**api.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kaneo-api
  namespace: kaneo
spec:
  replicas: 2
  selector:
    matchLabels:
      app: kaneo-api
  template:
    metadata:
      labels:
        app: kaneo-api
    spec:
      containers:
      - name: api
        image: dein-username/kaneo-api:latest
        ports:
        - containerPort: 1337
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: kaneo-secrets
              key: database-url
        - name: AUTH_SECRET
          valueFrom:
            secretKeyRef:
              name: kaneo-secrets
              key: auth-secret
        livenessProbe:
          httpGet:
            path: /api/health
            port: 1337
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 1337
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: kaneo-api
  namespace: kaneo
spec:
  selector:
    app: kaneo-api
  ports:
  - port: 1337
    targetPort: 1337
```

**web.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kaneo-web
  namespace: kaneo
spec:
  replicas: 2
  selector:
    matchLabels:
      app: kaneo-web
  template:
    metadata:
      labels:
        app: kaneo-web
    spec:
      containers:
      - name: web
        image: dein-username/kaneo-web:latest
        ports:
        - containerPort: 5173
        env:
        - name: KANEO_API_URL
          value: "https://api.deine-domain.de"
        - name: KANEO_CLIENT_URL
          value: "https://deine-domain.de"
---
apiVersion: v1
kind: Service
metadata:
  name: kaneo-web
  namespace: kaneo
spec:
  selector:
    app: kaneo-web
  ports:
  - port: 5173
    targetPort: 5173
```

**ingress.yaml:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: kaneo-ingress
  namespace: kaneo
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - deine-domain.de
    - api.deine-domain.de
    secretName: kaneo-tls
  rules:
  - host: deine-domain.de
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: kaneo-web
            port:
              number: 5173
  - host: api.deine-domain.de
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: kaneo-api
            port:
              number: 1337
```

Deployen:

```bash
kubectl apply -f namespace.yaml
kubectl apply -f secrets.yaml
kubectl apply -f postgresql.yaml
kubectl apply -f api.yaml
kubectl apply -f web.yaml
kubectl apply -f ingress.yaml
```

## Troubleshooting

### Build Fehler

**Problem:** `ERROR [internal] load metadata for docker.io/library/node:20-alpine`

```bash
# Docker Login prüfen
docker login

# Buildx neu starten
docker buildx rm kaneo-builder
docker buildx create --use --name kaneo-builder
```

**Problem:** `failed to solve: failed to compute cache key`

```bash
# Build Cache löschen
docker builder prune -af

# Ohne Cache bauen
docker build --no-cache -t dein-username/kaneo-api:latest -f apps/api/Dockerfile .
```

**Problem:** `COPY failed: file not found`

```bash
# Sicherstellen, dass Build-Context das Root-Verzeichnis ist
cd /path/to/kaneo
docker build -t dein-username/kaneo-api:latest -f apps/api/Dockerfile .
# Das . am Ende ist wichtig!
```

### Runtime Fehler

**Problem:** API startet nicht, Database Connection Error

```bash
# Postgres Container Logs prüfen
docker compose logs postgres

# Datenbank-URL in API prüfen
docker compose exec api env | grep DATABASE_URL

# Manuell Verbindung testen
docker compose exec postgres psql -U kaneo -d kaneo -c "SELECT 1"
```

**Problem:** Web App zeigt "Failed to fetch" oder CORS Errors

```bash
# KANEO_API_URL im Web Container prüfen
docker compose exec web env | grep KANEO_API_URL

# Nginx Config prüfen
docker compose exec web cat /usr/share/nginx/html/assets/*.js | grep -o "http[s]*://[^\"]*" | sort -u

# API Erreichbarkeit vom Web Container testen
docker compose exec web wget -O- http://api:1337/config
```

**Problem:** 502 Bad Gateway bei Traefik

```bash
# Traefik Logs prüfen
docker compose logs traefik

# Container Netzwerk prüfen
docker compose exec traefik ping api
docker compose exec traefik ping web

# Labels an Containern prüfen
docker compose config | grep -A 20 "labels:"
```

### Image Push Fehler

**Problem:** `denied: requested access to the resource is denied`

```bash
# Erneut einloggen
docker login

# Für GHCR mit Token
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Repository auf Public setzen (bei GHCR)
# Gehe zu: https://github.com/users/USERNAME/packages/container/PACKAGE/settings
```

**Problem:** `server gave HTTP response to HTTPS client`

```bash
# Für private/unsichere Registry in daemon.json eintragen
sudo nano /etc/docker/daemon.json
```

```json
{
  "insecure-registries": ["registry.deine-firma.de:5000"]
}
```

```bash
# Docker neu starten
sudo systemctl restart docker
```

### Kubernetes Troubleshooting

**Problem:** Pod bleibt in `ImagePullBackOff`

```bash
# Pod Details ansehen
kubectl describe pod -n kaneo kaneo-api-xxx

# Image Pull Secret erstellen (für private Registry)
kubectl create secret docker-registry regcred \
  --docker-server=registry.deine-firma.de \
  --docker-username=dein-username \
  --docker-password=dein-passwort \
  --docker-email=deine@email.de \
  -n kaneo

# Im Deployment referenzieren
# Füge unter spec.template.spec hinzu:
# imagePullSecrets:
# - name: regcred
```

**Problem:** Pod startet nicht, CrashLoopBackOff

```bash
# Logs ansehen
kubectl logs -n kaneo kaneo-api-xxx --previous

# Events prüfen
kubectl get events -n kaneo --sort-by='.lastTimestamp'

# In laufenden Container exec (falls möglich)
kubectl exec -it -n kaneo kaneo-api-xxx -- /bin/sh
```

**Problem:** Database Migration läuft nicht

```bash
# Migration Job manuell erstellen (basierend auf dem Deployment)
cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate
  namespace: kaneo
spec:
  template:
    spec:
      containers:
      - name: migrate
        image: dein-username/kaneo-api:latest
        command: ["sh", "-c", "cd /app/apps/api && npx drizzle-kit migrate"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: kaneo-secrets
              key: database-url
      restartPolicy: Never
  backoffLimit: 3
EOF

# Job Status prüfen
kubectl get job -n kaneo db-migrate

# Job Logs ansehen
kubectl logs -n kaneo job/db-migrate
```

## Weitere Resourcen

- [Offizielle Kaneo Dokumentation](https://kaneo.app/docs)
- [Docker Dokumentation](https://docs.docker.com/)
- [Kubernetes Dokumentation](https://kubernetes.io/docs/)
- [Helm Dokumentation](https://helm.sh/docs/)
- [GitHub Container Registry Guide](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)

## Automatisierung mit CI/CD

### GitHub Actions für automatische Builds

Erstelle `.github/workflows/custom-build.yml`:

```yaml
name: Build Custom Images

on:
  push:
    branches:
      - main
      - develop
    tags:
      - 'v*'
  workflow_dispatch:
    inputs:
      version:
        description: 'Version Tag'
        required: true
        default: 'latest'

env:
  REGISTRY: ghcr.io
  IMAGE_PREFIX: ${{ github.repository_owner }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        include:
          - dockerfile: ./apps/api/Dockerfile
            image: api
          - dockerfile: ./apps/web/Dockerfile
            image: web
    
    permissions:
      contents: read
      packages: write
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_PREFIX }}/kaneo-${{ matrix.image }}
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}
      
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ${{ matrix.dockerfile }}
          platforms: linux/amd64,linux/arm64
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### GitLab CI für automatische Builds

Erstelle `.gitlab-ci.yml`:

```yaml
stages:
  - build
  - push

variables:
  DOCKER_DRIVER: overlay2
  DOCKER_TLS_CERTDIR: "/certs"
  REGISTRY: registry.gitlab.com
  IMAGE_PREFIX: $CI_PROJECT_PATH

build-api:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - docker build -t $REGISTRY/$IMAGE_PREFIX/api:$CI_COMMIT_SHORT_SHA -f apps/api/Dockerfile .
    - docker build -t $REGISTRY/$IMAGE_PREFIX/api:latest -f apps/api/Dockerfile .
    - docker push $REGISTRY/$IMAGE_PREFIX/api:$CI_COMMIT_SHORT_SHA
    - docker push $REGISTRY/$IMAGE_PREFIX/api:latest
  only:
    - main
    - develop
    - tags

build-web:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - docker build -t $REGISTRY/$IMAGE_PREFIX/web:$CI_COMMIT_SHORT_SHA -f apps/web/Dockerfile .
    - docker build -t $REGISTRY/$IMAGE_PREFIX/web:latest -f apps/web/Dockerfile .
    - docker push $REGISTRY/$IMAGE_PREFIX/web:$CI_COMMIT_SHORT_SHA
    - docker push $REGISTRY/$IMAGE_PREFIX/web:latest
  only:
    - main
    - develop
    - tags
```

---

## Zusammenfassung

**Kompletter Workflow für Custom Setup:**

```bash
# 1. Code anpassen und vorbereiten
git clone https://github.com/v-berlin/kaneo.git
cd kaneo
git checkout dein-branch
cp .env.sample .env
# .env anpassen

# 2. Images bauen
docker build -t dein-username/kaneo-api:1.0.0 -f apps/api/Dockerfile .
docker build -t dein-username/kaneo-web:1.0.0 -f apps/web/Dockerfile .

# 3. Images pushen
docker login
docker push dein-username/kaneo-api:1.0.0
docker push dein-username/kaneo-web:1.0.0

# 4. Deployment vorbereiten
cp compose.yml compose.custom.yml
# compose.custom.yml anpassen (Image-Namen ändern)

# 5. Deployen
docker compose -f compose.custom.yml up -d

# 6. Überprüfen
docker compose -f compose.custom.yml ps
docker compose -f compose.custom.yml logs -f
```

Viel Erfolg mit deinem Custom Kaneo Setup! 🚀
