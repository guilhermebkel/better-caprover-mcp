#!/usr/bin/env bash
# Starts a throwaway CapRover in Docker and waits until it stays up, for `pnpm test:integration`.
# Needs Docker. The default password is captain42. Usage: scripts/start-caprover.sh
set -euo pipefail

NAME="captain-install"
URL="${CAPROVER_TEST_URL:-http://127.0.0.1:3000}"
PASSWORD="${CAPROVER_TEST_PASSWORD:-captain42}"
GOOD_NEEDED=10
MAX_ATTEMPTS=240

if docker ps -a --format '{{.Names}}' | grep -qx "$NAME"; then
  echo "A container named $NAME exists already. Remove it first: docker rm -f $NAME" >&2
  exit 1
fi

# MAIN_NODE_IP_ADDRESS skips CapRover's search for a public address.
docker run -d --name "$NAME" --network host -e ACCEPTED_TERMS=true -e MAIN_NODE_IP_ADDRESS=127.0.0.1 \
  -v /var/run/docker.sock:/var/run/docker.sock -v /captain:/captain caprover/caprover > /dev/null

# CapRover answers the login before it is ready, and only the system info says "not ready yet".
# It also restarts once as a service, so the wait needs ten good answers of the system info in a row.
good=0
for _ in $(seq 1 "$MAX_ATTEMPTS"); do
  token=$(curl -s -X POST "$URL/api/v2/login" -H 'content-type: application/json' -H 'x-namespace: captain' \
    -d "{\"password\":\"$PASSWORD\"}" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
  if [ -n "$token" ] && curl -s "$URL/api/v2/user/system/info" -H "x-captain-auth: $token" -H 'x-namespace: captain' | grep -q '"status":100'; then
    good=$((good + 1))
  else
    good=0
  fi
  if [ "$good" -ge "$GOOD_NEEDED" ]; then
    echo "CapRover is up at $URL. Run: pnpm build && pnpm test:integration"
    exit 0
  fi
  sleep 2
done

docker service ls || true
docker logs "$NAME" || true
echo "CapRover did not stay up." >&2
exit 1
