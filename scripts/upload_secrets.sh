#!/usr/bin/env bash
set -euo pipefail

# Usage: upload_secrets.sh [--repo owner/repo] [--file path/to/secrets] [--yes]
# Secrets file format: KEY=value (one per line). Lines starting with # or empty lines are ignored.

REPO=""
FILE="./secrets"
ASSUME_YES=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      REPO="$2"
      shift 2
      ;;
    --file)
      FILE="$2"
      shift 2
      ;;
    --yes)
      ASSUME_YES=1
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [--repo owner/repo] [--file path] [--yes]"
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 2
      ;;
  esac
done

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI is required but not found. Install from https://cli.github.com/" >&2
  exit 3
fi

if [[ ! -f "$FILE" ]]; then
  echo "Secrets file not found: $FILE" >&2
  exit 4
fi

# Determine repo if not provided
if [[ -z "$REPO" ]]; then
  # try GH_REPOSITORY env or gh repo view
  if [[ -n "${GH_REPOSITORY:-}" ]]; then
    REPO="$GH_REPOSITORY"
  else
    if ! REPO=$(gh repo view --json nameWithOwner -q . 2>/dev/null); then
      echo "Repository not specified and could not determine current repo. Use --repo owner/repo." >&2
      exit 5
    fi
  fi
fi

echo "Repository: $REPO"

# Check gh auth
if ! gh auth status >/dev/null 2>&1; then
  echo "gh CLI is not authenticated. Run 'gh auth login' first." >&2
  exit 6
fi

TMPFILE=$(mktemp /tmp/upload_secrets.XXXXXX)

keys=()

while IFS= read -r line || [[ -n "$line" ]]; do
  # Trim leading/trailing whitespace
  line="$(echo "$line" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
  # Skip empty or comment lines
  if [[ -z "$line" || "${line:0:1}" == "#" ]]; then
    continue
  fi

  if [[ "$line" != *=* ]]; then
    echo "Skipping invalid line (no =): $line" >&2
    continue
  fi

  key="${line%%=*}"
  value="${line#*=}"

  # Trim whitespace around key
  key="$(echo "$key" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"

  # Remove surrounding quotes from value if present
  if [[ ("${value:0:1}" == '"' && "${value: -1}" == '"') || ("${value:0:1}" == "'" && "${value: -1}" == "'") ]]; then
    value="${value:1:${#value}-2}"
  fi

  keys+=("$key")
  printf '%s\t%s\n' "$key" "$value" >> "$TMPFILE"

done < "$FILE"

if [[ ${#keys[@]} -eq 0 ]]; then
  echo "No secrets found in $FILE" >&2
  rm -f "$TMPFILE"
  exit 0
fi

echo "Found ${#keys[@]} secrets to upload:"
for k in "${keys[@]}"; do echo " - $k"; done

if [[ $ASSUME_YES -eq 0 ]]; then
  read -r -p "Proceed to upload these secrets to $REPO? [y/N] " ans
  case "$ans" in
    [Yy]* ) ;;
    * ) echo "Aborted."; rm -f "$TMPFILE"; exit 0 ;;
  esac
fi

# Upload secrets
while IFS=$'\t' read -r key value; do
  echo -n "Uploading $key... "
  if gh secret set "$key" --repo "$REPO" --body "$value"; then
    echo "OK"
  else
    echo "FAILED" >&2
  fi
done < "$TMPFILE"

rm -f "$TMPFILE"
echo "Done."
