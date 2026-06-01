#!/usr/bin/env python3
"""Deploy Less Game to remote server (native, no Docker)."""

from __future__ import annotations

import os
import secrets
import sys
import tarfile
import tempfile
import textwrap
from pathlib import Path

import paramiko

HOST = "185.200.241.148"
USER = "root"
REMOTE_DIR = "/opt/less-game"
SERVER_URL = f"http://{HOST}"

EXCLUDE_DIRS = {".git", ".venv", "node_modules", ".next", "__pycache__", "uploads", ".cursor", "scripts"}
EXCLUDE_FILES = {".env", "lessgame.db", "deploy_remote.py"}


def should_skip(path: Path, root: Path) -> bool:
    rel = path.relative_to(root)
    if set(rel.parts) & EXCLUDE_DIRS:
        return True
    if path.name in EXCLUDE_FILES:
        return True
    return path.suffix in {".pyc", ".pyo"}


def create_archive(project_root: Path, dest: Path) -> None:
    with tarfile.open(dest, "w:gz") as tar:
        for item in project_root.rglob("*"):
            if item.is_dir() or should_skip(item, project_root):
                continue
            tar.add(item, arcname=item.relative_to(project_root).as_posix())


def run(client: paramiko.SSHClient, command: str, timeout: int = 900) -> int:
    print(f"$ {command[:120]}{'...' if len(command) > 120 else ''}")
    _, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    if out.strip():
        safe = out.rstrip()[-4000:].encode("utf-8", errors="replace").decode("utf-8", errors="replace")
        print(safe)
    if err.strip() and code != 0:
        safe_err = err.rstrip()[-2000:].encode("utf-8", errors="replace").decode("utf-8", errors="replace")
        print(safe_err, file=sys.stderr)
    return code


def main() -> int:
    password = os.environ.get("DEPLOY_PASSWORD")
    if not password:
        print("Set DEPLOY_PASSWORD", file=sys.stderr)
        return 1

    project_root = Path(__file__).resolve().parents[1]
    jwt_secret = secrets.token_urlsafe(48)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting to {USER}@{HOST}...")
    client.connect(HOST, username=USER, password=password, timeout=30)

    run(client, f"mkdir -p {REMOTE_DIR}")

    with tempfile.NamedTemporaryFile(suffix=".tar.gz", delete=False) as tmp:
        archive_path = Path(tmp.name)

    try:
        print("Creating archive...")
        create_archive(project_root, archive_path)
        print(f"Archive size: {archive_path.stat().st_size / (1024 * 1024):.1f} MB")

        sftp = client.open_sftp()
        sftp.put(str(archive_path), f"{REMOTE_DIR}/less-game.tar.gz")
        sftp.close()

        run(client, f"rm -rf {REMOTE_DIR}/src && mkdir -p {REMOTE_DIR}/src")
        run(client, f"tar -xzf {REMOTE_DIR}/less-game.tar.gz -C {REMOTE_DIR}/src")
        run(client, f"rm -f {REMOTE_DIR}/less-game.tar.gz")

        env_content = textwrap.dedent(f"""\
            JWT_SECRET={jwt_secret}
            DATABASE_URL=sqlite+aiosqlite:///{REMOTE_DIR}/data/lessgame.db
            FRONTEND_URL={SERVER_URL}:3000
            BACKEND_URL={SERVER_URL}:8000
            NEXT_PUBLIC_API_URL={SERVER_URL}:8000
            STORAGE_BACKEND=local
            LOCAL_UPLOAD_DIR={REMOTE_DIR}/data/uploads
            SMTP_HOST=localhost
            SMTP_PORT=25
            SMTP_FROM=noreply@lessgame.local
        """)
        sftp = client.open_sftp()
        with sftp.file(f"{REMOTE_DIR}/src/backend/.env", "w") as f:
            f.write(env_content)
        sftp.close()

        setup_script = textwrap.dedent(f"""\
            set -euo pipefail
            export DEBIAN_FRONTEND=noninteractive

            apt-get update -qq
            apt-get install -y -qq curl ca-certificates python3 python3-venv python3-pip gcc libpq-dev

            if ! command -v node >/dev/null || [[ "$(node -v)" != v22* ]]; then
              curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
              apt-get install -y -qq nodejs
            fi

            mkdir -p {REMOTE_DIR}/data/uploads
            mkdir -p {REMOTE_DIR}/logs

            cd {REMOTE_DIR}/src/backend
            python3 -m venv .venv
            .venv/bin/pip install -q --upgrade pip
            .venv/bin/pip install -q -r requirements.txt

            cd {REMOTE_DIR}/src/frontend
            export NEXT_PUBLIC_API_URL={SERVER_URL}:8000
            npm install --silent
            npm run build

            cat > /etc/systemd/system/lessgame-backend.service << 'UNIT'
            [Unit]
            Description=Less Game Backend
            After=network.target

            [Service]
            Type=simple
            WorkingDirectory={REMOTE_DIR}/src/backend
            EnvironmentFile={REMOTE_DIR}/src/backend/.env
            ExecStart={REMOTE_DIR}/src/backend/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
            Restart=always
            RestartSec=3

            [Install]
            WantedBy=multi-user.target
            UNIT

            cat > /etc/systemd/system/lessgame-frontend.service << 'UNIT'
            [Unit]
            Description=Less Game Frontend
            After=network.target lessgame-backend.service

            [Service]
            Type=simple
            WorkingDirectory={REMOTE_DIR}/src/frontend
            Environment=NODE_ENV=production
            Environment=NEXT_PUBLIC_API_URL={SERVER_URL}:8000
            ExecStart=/usr/bin/npm run start -- -H 0.0.0.0 -p 3000
            Restart=always
            RestartSec=3

            [Install]
            WantedBy=multi-user.target
            UNIT

            systemctl daemon-reload
            systemctl enable lessgame-backend lessgame-frontend
            systemctl restart lessgame-backend lessgame-frontend

            sleep 3
            systemctl is-active lessgame-backend
            systemctl is-active lessgame-frontend
            curl -sf http://127.0.0.1:8000/health && echo " backend OK"
            curl -sf -o /dev/null http://127.0.0.1:3000 && echo " frontend OK"
        """)

        sftp = client.open_sftp()
        with sftp.file("/tmp/lessgame-setup.sh", "w") as f:
            f.write(setup_script)
        sftp.close()

        print("Installing dependencies and starting services (5-10 min)...")
        code = run(client, "chmod +x /tmp/lessgame-setup.sh && bash /tmp/lessgame-setup.sh", timeout=1800)
        if code != 0:
            run(client, "journalctl -u lessgame-backend -n 40 --no-pager")
            run(client, "journalctl -u lessgame-frontend -n 40 --no-pager")
            return code

        print(f"\nOK: Frontend {SERVER_URL}:3000")
        print(f"    Backend  {SERVER_URL}:8000")
        print("    Demo: demo@example.com / demo12345 (если есть в БД)")
    finally:
        archive_path.unlink(missing_ok=True)
        client.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
