#!/usr/bin/env python3
"""Generate project-files.json with sanitized file contents for the UI."""
import json
import re
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def mask(content):
    """Mask sensitive values (passwords, secrets, keys) in file content."""
    lines = content.split('\n')
    result = []
    for line in lines:
        if re.search(r'(PASSWORD|SECRET|API_KEY|apiKey|authPass|jwtSecret)', line, re.IGNORECASE):
            # Skip masking in template expressions {{ ... }} and awk patterns
            if '{{' not in line and 'awk' not in line:
                # Mask everything after = or : (the value part)
                line = re.sub(r'([=:]\s*).+', r'\1***', line)
        result.append(line)
    return '\n'.join(result)


def read(path):
    """Read file relative to project root and mask secrets."""
    try:
        with open(os.path.join(ROOT, path)) as f:
            return mask(f.read())
    except FileNotFoundError:
        return f'# File not found: {path}'


def gen_docker_tree():
    return (
        "fe_containerize/\n"
        "├── docker-compose.yml\n"
        "├── .env.example\n"
        "├── db/\n"
        "│   └── init.sql\n"
        "├── frontend/\n"
        "│   ├── Dockerfile\n"
        "│   ├── nginx.conf\n"
        "│   ├── src/\n"
        "│   └── package.json\n"
        "├── backend/\n"
        "│   ├── Dockerfile\n"
        "│   ├── src/\n"
        "│   └── package.json\n"
        "└── microfrontend/\n"
        "    ├── Dockerfile\n"
        "    ├── nginx.conf\n"
        "    ├── src/\n"
        "    └── package.json"
    )


def gen_helm_tree():
    lines = [
        "helm/",
        "├── build-and-deploy.sh",
        "└── fe-containerize/",
        "    ├── Chart.yaml",
        "    ├── values.yaml",
        "    └── templates/",
    ]
    tpl_dir = os.path.join(ROOT, "helm/fe-containerize/templates")
    if os.path.isdir(tpl_dir):
        templates = sorted(os.listdir(tpl_dir))
        for i, t in enumerate(templates):
            prefix = "        └── " if i == len(templates) - 1 else "        ├── "
            lines.append(f"{prefix}{t}")
    return "\n".join(lines)


docker = {
    "structure": {"label": "Structure", "code": gen_docker_tree()},
    "compose": {"label": "docker-compose.yml", "code": read("docker-compose.yml")},
    "dfFrontend": {"label": "Dockerfile FE", "code": read("frontend/Dockerfile")},
    "nginx": {"label": "nginx.conf", "code": read("frontend/nginx.conf")},
    "dfBackend": {"label": "Dockerfile BE", "code": read("backend/Dockerfile")},
    "dfMfe": {"label": "Dockerfile MFE", "code": read("microfrontend/Dockerfile")},
    "initSql": {"label": "init.sql", "code": read("db/init.sql")},
}

helm = {
    "structure": {"label": "Structure", "code": gen_helm_tree()},
    "chart": {"label": "Chart.yaml", "code": read("helm/fe-containerize/Chart.yaml")},
    "values": {"label": "values.yaml", "code": read("helm/fe-containerize/values.yaml")},
    "helpers": {"label": "_helpers.tpl", "code": read("helm/fe-containerize/templates/_helpers.tpl")},
    "secrets": {"label": "secrets.yaml", "code": read("helm/fe-containerize/templates/secrets.yaml")},
    "helmDb": {"label": "db.yaml", "code": read("helm/fe-containerize/templates/db.yaml")},
    "helmBackend": {"label": "backend.yaml", "code": read("helm/fe-containerize/templates/backend.yaml")},
    "helmMfe": {"label": "mfe.yaml", "code": read("helm/fe-containerize/templates/microfrontend.yaml")},
    "helmFrontend": {"label": "frontend.yaml", "code": read("helm/fe-containerize/templates/frontend.yaml")},
    "deploy": {"label": "build-and-deploy.sh", "code": read("helm/build-and-deploy.sh")},
}

output = {"docker": docker, "helm": helm}
outpath = os.path.join(ROOT, "frontend/public/project-files.json")
os.makedirs(os.path.dirname(outpath), exist_ok=True)
with open(outpath, "w") as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print(f"Generated {outpath}")
