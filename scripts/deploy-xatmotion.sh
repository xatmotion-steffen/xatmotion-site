#!/usr/bin/env bash
# Deploy von xatmotion.de: schickt den aktuellen Git-Commit (nicht den Arbeitsordner) zum Server.
# Ablauf: Prüfen -> Trockenlauf -> ja/nein -> Sicherung der überschriebenen Dateien -> Upload -> Kurztest.
# Aufruf im Repo-Ordner:  bash scripts/deploy-xatmotion.sh
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
CONF="scripts/deploy.conf"
[ -f "$CONF" ] || { echo "Fehlt: $CONF (Vorlage: scripts/deploy.conf.example)"; exit 1; }
# shellcheck disable=SC1090
source "$CONF"
MODE="${MODE:-rsync}"
SITE_URL="${SITE_URL:-https://www.xatmotion.de}"

# 1) Nur deployen, was committet ist
if [ -n "$(git status --porcelain)" ]; then
  echo "Es gibt nicht committete Änderungen. Erst committen, dann deployen:"
  git status --short
  exit 1
fi
COMMIT="$(git rev-parse --short HEAD)"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$BRANCH" != "main" ]; then
  read -r -p "Du bist auf Branch '$BRANCH', nicht 'main'. Trotzdem deployen? (ja/nein) " a
  [ "$a" = "ja" ] || exit 1
fi
if git rev-parse --abbrev-ref '@{u}' >/dev/null 2>&1; then
  [ "$(git rev-list '@{u}..HEAD' --count)" = "0" ] || echo "Hinweis: $(git rev-list '@{u}..HEAD' --count) Commit(s) noch nicht auf GitHub gepusht (git push)."
fi

# 2) Stand sauber aus dem Commit exportieren (ohne .git, ohne Ignoriertes)
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
git archive HEAD | tar -x -C "$STAGE"
rm -rf "$STAGE/scripts" "$STAGE/HANDBUCH.md" "$STAGE/README.md" "$STAGE/.gitignore"

# 3) Ziel festlegen
TS="$(date +%Y%m%d-%H%M%S)"
if [ -n "${LOCAL_TARGET:-}" ]; then
  DEST="$LOCAL_TARGET"; mkdir -p "$DEST"
  RSH=""; BACKUP_ARG="--backup --backup-dir=$(dirname "${DEST%/}")/_deploy-backup/$TS"
  echo "TESTMODUS: Ziel ist lokal ($DEST), es wird nichts auf den Server geladen."
else
  : "${REMOTE_HOST:?}" "${REMOTE_USER:?}" "${REMOTE_DIR:?}"
  DEST="$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR"
  RSH="-e ssh"
  BACKUP_ARG="--backup --backup-dir=../_deploy-backup/$TS"
fi

echo "Stand $COMMIT ($BRANCH) -> $DEST  [Modus: $MODE]"
echo

if [ "$MODE" = "rsync" ]; then
  # --checksum: Zeitstempel sind nach git archive immer neu, deshalb nach Inhalt vergleichen.
  # Kein --delete: Dateien auf dem Server werden nie gelöscht (Löschen bewusst von Hand).
  COMMON=(-rlt --checksum --chmod=D755,F644 --itemize-changes)
  echo "== Trockenlauf: diese Dateien würden hochgeladen =="
  OUT="$(rsync "${COMMON[@]}" --dry-run ${RSH:+$RSH} "$STAGE"/ "$DEST" | grep -E '^[<>c][fd]' || true)"
  if [ -z "$OUT" ]; then echo "Keine Änderungen, Server ist auf dem Stand $COMMIT."; exit 0; fi
  echo "$OUT"
  echo; echo "Anzahl: $(echo "$OUT" | grep -c '^>f') Dateien"
  echo "$OUT" | grep -q 'htaccess' && echo "Achtung: .htaccess ist dabei (Weiterleitungen, Header, CSP)."
  echo
  read -r -p "Wirklich hochladen? (ja/nein) " ok
  [ "$ok" = "ja" ] || { echo "Abgebrochen."; exit 1; }
  # shellcheck disable=SC2086
  rsync "${COMMON[@]}" $BACKUP_ARG ${RSH:+$RSH} "$STAGE"/ "$DEST"
  echo "Überschriebene Dateien liegen auf dem Server unter: _deploy-backup/$TS (neben dem Webordner)"
elif [ "$MODE" = "lftp" ]; then
  command -v lftp >/dev/null || { echo "lftp fehlt (brew install lftp)."; exit 1; }
  echo "== Trockenlauf =="
  lftp -e "set sftp:auto-confirm yes; mirror -R --only-newer --dry-run --verbose '$STAGE' '$REMOTE_DIR'; bye" "sftp://$REMOTE_USER@$REMOTE_HOST"
  read -r -p "Wirklich hochladen? (ja/nein) " ok
  [ "$ok" = "ja" ] || { echo "Abgebrochen."; exit 1; }
  lftp -e "set sftp:auto-confirm yes; mirror -R --only-newer --verbose '$STAGE' '$REMOTE_DIR'; bye" "sftp://$REMOTE_USER@$REMOTE_HOST"
  echo "Hinweis: lftp legt keine Server-Sicherung an. Git ist die Sicherung (git checkout <alter Commit>, erneut deployen)."
else
  echo "Unbekannter MODE: $MODE"; exit 1
fi

# 4) Kurztest live (nur wenn echtes Ziel)
if [ -z "${LOCAL_TARGET:-}" ]; then
  echo; echo "== Kurztest =="
  for p in "/" "/kontakt/" "/leistungen/imagefilm/" "/sitemap.xml"; do
    printf '%s%s -> ' "$SITE_URL" "$p"; curl -s -o /dev/null -w '%{http_code}\n' "$SITE_URL$p"
  done
  echo "Danach im Browser hart aktualisieren und die Konsole auf CSP-Fehler prüfen."
fi
echo "Fertig: Stand $COMMIT."
