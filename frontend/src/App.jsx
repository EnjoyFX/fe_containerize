import { useState, useEffect } from 'react'
import RemoteWidget from './RemoteWidget'

const DOCKER_TABS = {
  structure: {
    label: 'Structure',
    code: `fe_containerize/
├── docker-compose.yml        # Orchestration
├── .env                      # Environment variables
├── db/
│   └── init.sql              # DB schema + seed data
├── frontend/
│   ├── Dockerfile            # Multi-stage: node → nginx
│   ├── nginx.conf            # Reverse proxy config
│   ├── src/                  # React + Vite app
│   └── package.json
├── backend/
│   ├── Dockerfile            # Multi-stage: node build → node run
│   ├── src/                  # NestJS + TypeORM app
│   └── package.json
└── microfrontend/
    ├── Dockerfile            # Multi-stage: node → nginx
    ├── nginx.conf            # Static file server
    ├── src/                  # React IIFE widget
    └── package.json`,
  },
  compose: {
    label: 'docker-compose.yml',
    code: `services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: \${POSTGRES_DB:-appdb}
      POSTGRES_USER: \${POSTGRES_USER:-appuser}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:-apppass}
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \${POSTGRES_USER:-appuser} -d \${POSTGRES_DB:-appdb}"]
      interval: 5s
      timeout: 3s
      retries: 5

  backend:
    build: ./backend
    restart: unless-stopped
    environment:
      DB_HOST: db
      DB_PORT: 5432
      DB_USER: \${POSTGRES_USER:-appuser}
      DB_PASSWORD: \${POSTGRES_PASSWORD:-apppass}
      DB_NAME: \${POSTGRES_DB:-appdb}
      ALLOWED_ORIGINS: \${ALLOWED_ORIGINS:-https://demo.triggers.online}
    depends_on:
      db:
        condition: service_healthy

  microfrontend:
    build: ./microfrontend
    restart: unless-stopped

  frontend:
    build: ./frontend
    restart: unless-stopped
    ports:
      - "\${FRONTEND_PORT:-3080}:80"
    depends_on:
      - backend
      - microfrontend

volumes:
  pgdata:`,
  },
  dfFrontend: {
    label: 'Dockerfile FE',
    code: `# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`,
  },
  nginx: {
    label: 'nginx.conf',
    code: `server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    client_max_body_size 1m;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API → backend
    location /api/ {
        proxy_pass http://backend:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        add_header Cache-Control "no-store" always;
    }

    # Proxy MFE assets
    location /mfe/ {
        proxy_pass http://microfrontend:80/;
        proxy_set_header Host $host;
    }
}`,
  },
  dfBackend: {
    label: 'Dockerfile BE',
    code: `# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
USER node
EXPOSE 8000
CMD ["node", "dist/main.js"]`,
  },
  dfMfe: {
    label: 'Dockerfile MFE',
    code: `# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`,
  },
  initSql: {
    label: 'init.sql',
    code: `CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO items (name, description) VALUES
    ('Sample Item 1', 'This is a demo item created on init'),
    ('Sample Item 2', 'Another demo item for testing'),
    ('Sample Item 3', 'Third item to show the list works');`,
  },
}

const HELM_TABS = {
  structure: {
    label: 'Structure',
    code: `helm/
├── build-and-deploy.sh           # Build + import + deploy script
└── fe-containerize/
    ├── Chart.yaml                # Chart metadata
    ├── values.yaml               # Default configuration
    └── templates/
        ├── _helpers.tpl          # Template helpers
        ├── namespace.yaml        # Namespace
        ├── secrets.yaml          # DB credentials Secret
        ├── db.yaml               # ConfigMap + PVC + Deployment + Service
        ├── backend.yaml          # Deployment + Service
        ├── microfrontend.yaml    # Deployment + Service
        └── frontend.yaml         # Deployment + Service + Ingress`,
  },
  chart: {
    label: 'Chart.yaml',
    code: `apiVersion: v2
name: fe-containerize
description: Demo multi-service app (Frontend + Backend + MFE + PostgreSQL)
version: 1.0.0
appVersion: "1.0.0"
type: application`,
  },
  values: {
    label: 'values.yaml',
    code: `namespace: fe-containerize

images:
  frontend: docker.io/library/fe_containerize-frontend:latest
  backend: docker.io/library/fe_containerize-backend:latest
  microfrontend: docker.io/library/fe_containerize-microfrontend:latest
  pullPolicy: IfNotPresent

db:
  image: postgres:16-alpine
  name: appdb
  user: appuser
  password: CHANGE_ME_USE_STRONG_PASSWORD
  storage: 1Gi

backend:
  replicas: 1
  port: 8000
  allowedOrigins: "https://demo.triggers.online"

frontend:
  replicas: 1
  port: 80

microfrontend:
  replicas: 1
  port: 80

ingress:
  enabled: true
  host: demo.triggers.online`,
  },
  helpers: {
    label: '_helpers.tpl',
    code: `{{- define "app.namespace" -}}
{{ .Values.namespace | default "fe-containerize" }}
{{- end -}}

{{- define "app.labels" -}}
app.kubernetes.io/managed-by: helm
app.kubernetes.io/part-of: fe-containerize
{{- end -}}`,
  },
  namespace: {
    label: 'namespace.yaml',
    code: `apiVersion: v1
kind: Namespace
metadata:
  name: {{ include "app.namespace" . }}`,
  },
  secrets: {
    label: 'secrets.yaml',
    code: `apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
  namespace: {{ include "app.namespace" . }}
  labels:
    {{- include "app.labels" . | nindent 4 }}
type: Opaque
stringData:
  POSTGRES_DB: {{ .Values.db.name }}
  POSTGRES_USER: {{ .Values.db.user }}
  POSTGRES_PASSWORD: {{ .Values.db.password }}`,
  },
  helmDb: {
    label: 'db.yaml',
    code: `apiVersion: v1
kind: ConfigMap
metadata:
  name: db-init
  namespace: {{ include "app.namespace" . }}
  labels:
    {{- include "app.labels" . | nindent 4 }}
data:
  init.sql: |
    CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW()
    );
    INSERT INTO items (name, description) VALUES
        ('Sample Item 1', 'Demo item created on init'),
        ('Sample Item 2', 'Another demo item for testing'),
        ('Sample Item 3', 'Third item to show the list works');
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: db-data
  namespace: {{ include "app.namespace" . }}
  labels:
    {{- include "app.labels" . | nindent 4 }}
spec:
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: {{ .Values.db.storage }}
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: db
  namespace: {{ include "app.namespace" . }}
  labels:
    app: db
    {{- include "app.labels" . | nindent 4 }}
spec:
  replicas: 1
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app: db
  template:
    metadata:
      labels:
        app: db
    spec:
      containers:
        - name: postgres
          image: {{ .Values.db.image }}
          ports:
            - containerPort: 5432
          envFrom:
            - secretRef:
                name: db-credentials
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
            - name: init
              mountPath: /docker-entrypoint-initdb.d
          readinessProbe:
            exec:
              command: [pg_isready, -U, {{ .Values.db.user }}, -d, {{ .Values.db.name }}]
            initialDelaySeconds: 5
            periodSeconds: 5
          resources:
            requests: { memory: 128Mi, cpu: 100m }
            limits:   { memory: 256Mi, cpu: 500m }
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: db-data
        - name: init
          configMap:
            name: db-init
---
apiVersion: v1
kind: Service
metadata:
  name: db
  namespace: {{ include "app.namespace" . }}
  labels:
    app: db
    {{- include "app.labels" . | nindent 4 }}
spec:
  selector:
    app: db
  ports:
    - port: 5432
      targetPort: 5432`,
  },
  helmBackend: {
    label: 'backend.yaml',
    code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: {{ include "app.namespace" . }}
  labels:
    app: backend
    {{- include "app.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.backend.replicas }}
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      initContainers:
        - name: wait-for-db
          image: busybox:1.36
          command: ["sh", "-c",
            "until nc -z db 5432; do echo waiting for db; sleep 2; done"]
      containers:
        - name: backend
          image: {{ .Values.images.backend }}
          imagePullPolicy: {{ .Values.images.pullPolicy }}
          ports:
            - containerPort: {{ .Values.backend.port }}
          env:
            - name: DB_HOST
              value: db
            - name: DB_PORT
              value: "5432"
            - name: DB_USER
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: POSTGRES_USER
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: POSTGRES_PASSWORD
            - name: DB_NAME
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: POSTGRES_DB
            - name: ALLOWED_ORIGINS
              value: {{ .Values.backend.allowedOrigins | quote }}
          readinessProbe:
            httpGet:
              path: /api/health/ready
              port: {{ .Values.backend.port }}
            initialDelaySeconds: 5
            periodSeconds: 10
          resources:
            requests: { memory: 128Mi, cpu: 100m }
            limits:   { memory: 256Mi, cpu: 500m }
---
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: {{ include "app.namespace" . }}
  labels:
    app: backend
    {{- include "app.labels" . | nindent 4 }}
spec:
  selector:
    app: backend
  ports:
    - port: {{ .Values.backend.port }}
      targetPort: {{ .Values.backend.port }}`,
  },
  helmMfe: {
    label: 'mfe.yaml',
    code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: microfrontend
  namespace: {{ include "app.namespace" . }}
  labels:
    app: microfrontend
    {{- include "app.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.microfrontend.replicas }}
  selector:
    matchLabels:
      app: microfrontend
  template:
    metadata:
      labels:
        app: microfrontend
    spec:
      containers:
        - name: microfrontend
          image: {{ .Values.images.microfrontend }}
          imagePullPolicy: {{ .Values.images.pullPolicy }}
          ports:
            - containerPort: {{ .Values.microfrontend.port }}
          readinessProbe:
            httpGet:
              path: /widget.iife.js
              port: {{ .Values.microfrontend.port }}
            initialDelaySeconds: 3
            periodSeconds: 10
          resources:
            requests: { memory: 32Mi, cpu: 50m }
            limits:   { memory: 64Mi, cpu: 200m }
---
apiVersion: v1
kind: Service
metadata:
  name: microfrontend
  namespace: {{ include "app.namespace" . }}
  labels:
    app: microfrontend
    {{- include "app.labels" . | nindent 4 }}
spec:
  selector:
    app: microfrontend
  ports:
    - port: 80
      targetPort: {{ .Values.microfrontend.port }}`,
  },
  helmFrontend: {
    label: 'frontend.yaml',
    code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: {{ include "app.namespace" . }}
  labels:
    app: frontend
    {{- include "app.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.frontend.replicas }}
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
        - name: frontend
          image: {{ .Values.images.frontend }}
          imagePullPolicy: {{ .Values.images.pullPolicy }}
          ports:
            - containerPort: {{ .Values.frontend.port }}
          readinessProbe:
            httpGet:
              path: /
              port: {{ .Values.frontend.port }}
            initialDelaySeconds: 3
            periodSeconds: 10
          resources:
            requests: { memory: 32Mi, cpu: 50m }
            limits:   { memory: 64Mi, cpu: 200m }
---
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: {{ include "app.namespace" . }}
  labels:
    app: frontend
    {{- include "app.labels" . | nindent 4 }}
spec:
  selector:
    app: frontend
  ports:
    - port: 80
      targetPort: {{ .Values.frontend.port }}
---
{{- if .Values.ingress.enabled }}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: frontend
  namespace: {{ include "app.namespace" . }}
  labels:
    app: frontend
    {{- include "app.labels" . | nindent 4 }}
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: web
spec:
  {{- if .Values.ingress.className }}
  ingressClassName: {{ .Values.ingress.className }}
  {{- end }}
  rules:
    - host: {{ .Values.ingress.host }}
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend
                port:
                  number: 80
{{- end }}`,
  },
  deploy: {
    label: 'deploy.sh',
    code: `#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Building images..."
docker compose build

echo "==> Importing images into k3s..."
for svc in frontend backend microfrontend; do
  echo "    $svc..."
  docker save "fe_containerize-$svc:latest" | sudo k3s ctr images import -
done

echo "==> Deploying with Helm..."
cd helm
DB_PASSWORD="$(awk -F= '/^POSTGRES_PASSWORD=/{print substr($0,index($0,$2)); exit}' ../.env 2>/dev/null || true)"
DB_PASSWORD="\${DB_PASSWORD:-CHANGE_ME_USE_STRONG_PASSWORD}"
helm upgrade --install fe-containerize ./fe-containerize \\
  --set db.password="$DB_PASSWORD" \\
  --wait

echo "==> Done!"
echo "    kubectl get pods -n fe-containerize"`,
  },
}

function App() {
  const [items, setItems] = useState([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [health, setHealth] = useState(null)
  const [archSection, setArchSection] = useState('diagram')
  const [dockerTab, setDockerTab] = useState('structure')
  const [helmTab, setHelmTab] = useState('structure')

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/items')
      if (res.ok) setItems(await res.json())
    } catch (e) {
      console.error('Failed to fetch items:', e)
    }
  }

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health')
      if (res.ok) setHealth(await res.json())
    } catch (e) {
      setHealth({ status: 'error', database: 'unreachable' })
    }
  }

  useEffect(() => {
    fetchItems()
    fetchHealth()
  }, [])

  const addItem = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      })
      if (res.ok) {
        setName('')
        setDescription('')
        fetchItems()
      }
    } catch (e) {
      console.error('Failed to add item:', e)
    }
  }

  const deleteItem = async (id) => {
    try {
      await fetch(`/api/items/${id}`, { method: 'DELETE' })
      fetchItems()
    } catch (e) {
      console.error('Failed to delete item:', e)
    }
  }

  return (
    <div className="container">
      <header>
        <h1>Demo App</h1>
        {health && (
          <span className={`badge ${health.status === 'ok' ? 'ok' : 'err'}`}>
            API: {health.status} | DB: {health.database}
          </span>
        )}
      </header>

      <div className="layout">
        <section className="main-panel">
          <h2>Items</h2>
          <form onSubmit={addItem} className="add-form">
            <input
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <button type="submit">Add</button>
          </form>
          <ul className="item-list">
            {items.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  {item.description && <p>{item.description}</p>}
                  <small>{new Date(item.created_at).toLocaleString()}</small>
                </div>
                <button className="del" onClick={() => deleteItem(item.id)}>
                  &times;
                </button>
              </li>
            ))}
            {items.length === 0 && <li className="empty">No items yet</li>}
          </ul>
        </section>

        <aside className="side-panel">
          <h2>Remote Widget</h2>
          <RemoteWidget src="/mfe/widget.iife.js" />
        </aside>
      </div>

      <section className="arch-panel">
        <div className="arch-tabs">
          {['diagram', 'docker', 'helm'].map((s) => (
            <button
              key={s}
              className={`arch-tab ${archSection === s ? 'active' : ''}`}
              onClick={() => setArchSection(s)}
            >
              {s === 'diagram' ? 'Diagram' : s === 'docker' ? 'Docker' : 'Helm'}
            </button>
          ))}
        </div>

        {archSection === 'docker' && (
          <div className="arch-subtabs">
            {Object.entries(DOCKER_TABS).map(([key, tab]) => (
              <button
                key={key}
                className={`arch-subtab ${dockerTab === key ? 'active' : ''}`}
                onClick={() => setDockerTab(key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {archSection === 'helm' && (
          <div className="arch-subtabs">
            {Object.entries(HELM_TABS).map(([key, tab]) => (
              <button
                key={key}
                className={`arch-subtab ${helmTab === key ? 'active' : ''}`}
                onClick={() => setHelmTab(key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {archSection === 'diagram' && (
          <div className="arch-diagram">
            <div className="arch-column">
              <div className="arch-box frontend-box">
                <div className="arch-icon">
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                </div>
                <div className="arch-label">Frontend</div>
                <div className="arch-tech">React + Vite + nginx</div>
                <div className="arch-port">:3080</div>
                <span className="arch-badge arch-public">public</span>
              </div>
              <div className="arch-vert-arrow">&darr;</div>
              <div className="arch-box mfe-box">
                <div className="arch-icon">
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="12" y1="3" x2="12" y2="17"/></svg>
                </div>
                <div className="arch-label">Micro-frontend</div>
                <div className="arch-tech">React + Vite IIFE + nginx</div>
                <div className="arch-port">:80</div>
                <span className="arch-badge arch-internal">internal</span>
              </div>
            </div>

            <div className="arch-arrow">&rarr;</div>

            <div className="arch-box backend-box">
              <div className="arch-icon">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/></svg>
              </div>
              <div className="arch-label">Backend</div>
              <div className="arch-tech">NestJS + TypeORM</div>
              <div className="arch-port">:8000</div>
              <span className="arch-badge arch-internal">internal</span>
            </div>

            <div className="arch-arrow">&rarr;</div>

            <div className="arch-box db-box">
              <div className="arch-icon">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 5v6c0 1.66-4.03 3-9 3S3 12.66 3 11V5"/><path d="M21 11v6c0 1.66-4.03 3-9 3s-9-1.34-9-3v-6"/></svg>
              </div>
              <div className="arch-label">PostgreSQL</div>
              <div className="arch-tech">postgres:16-alpine</div>
              <div className="arch-port">:5432</div>
              <span className="arch-badge arch-internal">internal</span>
            </div>
          </div>
        )}

        {archSection === 'docker' && (
          <pre className="arch-code">{DOCKER_TABS[dockerTab].code}</pre>
        )}

        {archSection === 'helm' && (
          <pre className="arch-code">{HELM_TABS[helmTab].code}</pre>
        )}
      </section>
    </div>
  )
}

export default App
