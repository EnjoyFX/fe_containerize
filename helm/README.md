# k3s + Helm деплой

Kubernetes-варіант деплою на Raspberry Pi через k3s (легкий K8s) та Helm.

## Що таке k3s

Легка збірка Kubernetes від Rancher, оптимізована для ARM та edge-пристроїв. Включає вбудований Traefik ingress controller, CoreDNS, local-path provisioner для PVC.

## Prerequisites

На Raspberry Pi (або іншому Linux хості):

```bash
# k3s
curl -sfL https://get.k3s.io | sh -

# Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Docker (для білду образів)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

Перевірка:

```bash
kubectl get nodes        # має показати Ready
helm version             # v3.x
docker --version
```

## Структура Helm chart

```text
helm/
├── build-and-deploy.sh            # Білд + імпорт + деплой
└── fe-containerize/
    ├── Chart.yaml
    ├── values.yaml                # Конфігурація
    └── templates/
        ├── _helpers.tpl           # Хелпери
        ├── namespace.yaml         # Окремий namespace
        ├── secrets.yaml           # DB credentials
        ├── db.yaml                # PostgreSQL: Deployment + Service + PVC + ConfigMap
        ├── backend.yaml           # NestJS: Deployment + Service
        ├── microfrontend.yaml     # MFE: Deployment + Service
        └── frontend.yaml          # Frontend: Deployment + Service + Ingress
```

## Quick Start

```bash
# 1. Скопіювати проєкт на Pi
scp -r . pi@raspberrypi.local:~/fe_containerize/

# 2. На Pi — одна команда
cd ~/fe_containerize
./helm/build-and-deploy.sh
```

Скрипт автоматично:
1. Білдить Docker образи через `docker compose build`
2. Імпортує їх у k3s containerd (`k3s ctr images import`)
3. Деплоїть через `helm upgrade --install` і примусово тригерить rollout application pod-ів

## Manual Deploy

Якщо потрібен більший контроль:

```bash
# Білд образів
docker compose build

# Імпорт у k3s
docker save fe_containerize-frontend:latest | sudo k3s ctr images import -
docker save fe_containerize-backend:latest | sudo k3s ctr images import -
docker save fe_containerize-microfrontend:latest | sudo k3s ctr images import -

# Деплой з кастомними значеннями
helm upgrade --install fe-containerize ./helm/fe-containerize \
  --set db.password="my_strong_password" \
  --set backend.allowedOrigins="https://demo.triggers.online" \
  --set ingress.host="demo.triggers.online" \
  --wait

# Перевірка
kubectl get pods -n fe-containerize
kubectl get svc -n fe-containerize
kubectl get ingress -n fe-containerize
```

## Конфігурація (values.yaml)

| Параметр | Default | Опис |
|---|---|---|
| `namespace` | `fe-containerize` | Kubernetes namespace |
| `images.frontend` | `fe-containerize-frontend:latest` | Образ frontend |
| `images.backend` | `fe-containerize-backend:latest` | Образ backend |
| `images.microfrontend` | `fe-containerize-microfrontend:latest` | Образ microfrontend |
| `images.pullPolicy` | `IfNotPresent` | Pull policy для application images |
| `db.image` | `postgres:16-alpine` | Образ PostgreSQL |
| `db.name` | `appdb` | Назва БД |
| `db.user` | `appuser` | Користувач БД |
| `db.password` | `CHANGE_ME...` | Пароль БД |
| `db.storage` | `1Gi` | Розмір PVC для даних |
| `backend.replicas` | `1` | Кількість реплік backend |
| `backend.allowedOrigins` | `https://demo.triggers.online` | CORS origins |
| `frontend.replicas` | `1` | Кількість реплік frontend |
| `microfrontend.replicas` | `1` | Кількість реплік MFE |
| `ingress.enabled` | `true` | Увімкнути Ingress |
| `ingress.host` | `demo.triggers.online` | Домен для Ingress |

## Архітектура в k3s

```text
┌─────────────────────────────────────────────────────────┐
│  k3s cluster (Raspberry Pi)                             │
│                                                         │
│  ┌─────────┐     ┌─────────┐     ┌─────────┐          │
│  │Traefik  │────▶│frontend │────▶│backend  │          │
│  │Ingress  │     │ nginx   │     │ NestJS  │          │
│  │ :80/:443│     │ Service │     │ Service │          │
│  └─────────┘     └────┬────┘     └────┬────┘          │
│                       │               │                │
│                       ▼               ▼                │
│                  ┌─────────┐     ┌─────────┐          │
│                  │  mfe    │     │   db    │          │
│                  │ nginx   │     │postgres │          │
│                  │ Service │     │ Service │          │
│                  └─────────┘     │  + PVC  │          │
│                                  └─────────┘          │
└─────────────────────────────────────────────────────────┘
         ▲
         │ Cloudflare Tunnel (на рівні хоста)
         │
    ── internet ──
```

## Відмінності від Docker Compose

| Аспект | Docker Compose | k3s + Helm |
|---|---|---|
| Healthcheck | `depends_on: condition` | `initContainers` + `readinessProbe` (`/api/health/ready`) |
| Secrets | `.env` файл | Kubernetes `Secret` |
| Persistence | Docker named volume | `PersistentVolumeClaim` |
| Networking | Ports mapping | `Service` + `Ingress` |
| Restart | `unless-stopped` | Автоматично (K8s controller) |
| Scaling | Ручне (1 інстанс) | `replicas` в values.yaml |
| Resources | Без лімітів | CPU/memory requests + limits |
| Rollback | Ручне | `helm rollback` |
| Config | `.env` + docker-compose.yml | `values.yaml` + `--set` |

## Редеплой після змін у коді

Після зміни вихідного коду (наприклад, frontend) потрібно пройти повний цикл: білд → імпорт → рестарт.

**Один сервіс (наприклад frontend):**

```bash
cd ~/fe_containerize

# 1. Перебілдити образ (--no-cache якщо сумніви)
docker compose build --no-cache frontend

# 2. Імпортувати новий образ у k3s
docker save fe_containerize-frontend:latest | sudo k3s ctr images import -

# 3. Видалити pod — k3s створить новий з оновленим образом
kubectl delete pod -n fe-containerize -l app=frontend
```

**Всі сервіси:**

```bash
cd ~/fe_containerize
bash helm/build-and-deploy.sh
```

> **Типова помилка:** `kubectl rollout restart` без попереднього `docker save ... | k3s ctr images import` — pod перестворюється зі **старим** образом.

## Корисні команди

```bash
# Статус подів
kubectl get pods -n fe-containerize

# Логи backend
kubectl logs -n fe-containerize deploy/backend -f

# Логи frontend
kubectl logs -n fe-containerize deploy/frontend -f

# Перезапустити backend
kubectl rollout restart deploy/backend -n fe-containerize

# Масштабування
kubectl scale deploy/backend --replicas=2 -n fe-containerize

# Helm history + rollback
helm history fe-containerize
helm rollback fe-containerize 1

# Видалити все
helm uninstall fe-containerize
kubectl delete namespace fe-containerize
```

## Cloudflare Tunnel

Cloudflare Tunnel працює на рівні хоста, як і раніше. Traefik в k3s слухає порти 80/443. Tunnel направляє трафік на `localhost:80`, Traefik роутить за Ingress host rule на frontend Service.

Якщо Traefik конфліктує з іншими сервісами на порту 80 (наприклад, AdGuard):

```bash
# Змінити порт Traefik
kubectl edit svc traefik -n kube-system
# Або при встановленні k3s:
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--tls-san $(hostname -I | awk '{print $1}')" sh -s - --disable traefik
# Потім встановити traefik вручну на потрібному порті
```

## Troubleshooting

```bash
# Pod не стартує
kubectl describe pod <pod-name> -n fe-containerize

# Образ не знайдено
# Перевір що образи імпортовані:
sudo k3s ctr images list | grep fe_containerize

# DB не підключається
kubectl logs -n fe-containerize deploy/backend | tail -20

# Ingress не працює
kubectl get ingress -n fe-containerize
kubectl logs -n kube-system deploy/traefik
```
