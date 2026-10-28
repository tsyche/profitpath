#!/usr/bin/env bash
# Run a disposable source snapshot with matching Linux Playwright browsers.
set -euo pipefail

repo_dir="$(git -C "$(dirname "${BASH_SOURCE[0]}")/.." rev-parse --show-toplevel)"
cd "$repo_dir"
playwright_version="$(node -p "require('./package-lock.json').packages['node_modules/@playwright/test'].version")"
image="mcr.microsoft.com/playwright:v${playwright_version}-noble"
scratch_dir="$(mktemp -d "${TMPDIR:-/tmp}/profitpath-e2e.XXXXXX")"
results_dir="$repo_dir/e2e-results/container"
container_id=""

cleanup() {
  if [[ -n "$container_id" ]]; then
    docker rm -f "$container_id" >/dev/null
  fi
  rm -rf "$scratch_dir"
}
trap cleanup EXIT

docker info >/dev/null
mkdir -p "$results_dir"
# Include uncommitted source, but exclude ignored files, dependencies and Git data.
git ls-files -z --cached --others --exclude-standard |
  COPYFILE_DISABLE=1 tar --no-xattrs --null -T - -cf "$scratch_dir/source.tar"

container_id="$(docker create --init --shm-size=1g --workdir /work "$image" \
  bash -lc 'tar -xf /tmp/source.tar -C /work &&
    npm ci --no-audit --no-fund &&
    exec ./node_modules/.bin/playwright test --workers=4 --retries=0 "$@"' bash "$@")"
docker cp "$scratch_dir/source.tar" "$container_id:/tmp/source.tar"
printf 'Started: %s\nImage: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$image" > "$results_dir/run.log"
docker start -a "$container_id" 2>&1 | tee -a "$results_dir/run.log" || true
test_status="$(docker inspect --format '{{.State.ExitCode}}' "$container_id")"
# A setup failure may not produce browser artifacts.
docker cp "$container_id:/work/test-results/." "$results_dir/test-results" 2>/dev/null || true
printf '%s\n' "$test_status" > "$results_dir/exit-status"
printf 'Playwright exit status: %s\nResults: %s\n' "$test_status" "$results_dir"
exit "$test_status"
