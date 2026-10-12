# Observability Stack

My observability stack is centered around Grafana, with Loki for log collection and Prometheus for metrics.

I don't yet run Mimir (for long term metrics storage) or Tempo (for traces), so the stack is not yet LGTM.

## Cadvisor

[Cadvisor](https://github.com/google/cadvisor) monitors the containers on the docker host (resource usage & performance) and provides metrics to prometheus.

## Loki

[Loki](https://grafana.com/oss/loki/) collects and stores logs. It is available to containers as a [docker plugin](https://grafana.com/docs/loki/latest/send-data/docker-driver/) so that container logs are send to Loki right away.

Here's my `/etc/docker/daemon.json` config. The `log-opts` are the defaults that are getting passed to all newly created containers:

```json
{
  "log-driver": "loki",
   "log-opts": {
     "loki-url": "http://172.17.0.1:3100/loki/api/v1/push",
     "loki-retries": "3",
     "mode": "non-blocking"
   }
}
```

It is important to set `loki-retries` and `non-blocking` mode so that the docker engine stays responsive. Otherwise you'll end up in a system that is blocking when the loki container is not up yet. More info [here](https://grafana.com/docs/loki/latest/send-data/docker-driver/#known-issue-deadlocked-docker-daemon).

My setup binds port 3100 from the loki container to the host. This port should be blocked from external access though.
This is done with UFW, and [ufw-docker](https://github.com/chaifeng/ufw-docker). Allow internal connections only:
```
ufw allow from any to 172.17.0.1 port 3100 proto tcp
```

## Prometheus

[Prometheus](https://prometheus.io) collects metrics from a set of defined metrics endpoints.

I've setup a dedicated `prometheus` network that any container can join from which metrics are to be collected.

## Grafana

[Grafana](https://grafana.com) is where all of the observability comes together. Here you can add the loki and prometheu integrations, and use them to build the dashboards for whatever you are interested in.
## Diun

[Diun](https://crazymax.dev/diun/) pushes to ntfy (topic `zebra`, user `diun`, write-only). It runs two providers every 6 hours:

- **docker** -- for each running container, reports when the image behind its tag changes: re-pushed tags, and patches inside floating tags like `forgejo:16` or `postgres:18`.
- **file** (`diun/watch/releases.yml`) -- the release feed. For each listed repository it reports a *new tag*, filtered by `include_tags` and limited to the 3 newest by semver, so backports to old release lines stay quiet. Add new services there; editing it restarts nothing.

When adding many entries at once, seed first or every existing tag notifies once: run a pass with `DIUN_NOTIF_NTFY_ENDPOINT` pointed at a closed port (`docker compose run --rm -e DIUN_NOTIF_NTFY_ENDPOINT=http://127.0.0.1:9 diun serve`, stop it after `Jobs completed`).
