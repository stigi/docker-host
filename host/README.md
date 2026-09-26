# host/

Version-controlled copies of configuration that lives **outside** any container
on zebra.ullrich.is. Everything else in this repo describes services; this
describes the box they run on.

Before this existed, a meaningful share of the 2026-09 incident follow-up work
lived only on the host, with `.bak-*` files as its entire history: the smartd
notification wiring, the bfq scheduler rule, the journald size cap, the
borgmatic config and its four hook scripts. None of it was recoverable from git.

## Layout

Paths mirror the real filesystem, so `host/etc/smartd.conf` is `/etc/smartd.conf`.

    host/
      MANIFEST.tsv            path, mode, owner for every tracked file
      bin/host-drift-check    compares these copies against the live host
      etc/...
      usr/local/bin/...

## These are COPIES, not the live files

Nothing here is symlinked into place. Editing a file here changes nothing on the
box, and editing the box does not change this. That is why the drift check
exists — without it, "clean repo" would stop meaning anything.

Run it as root (some tracked files are mode 600):

    sudo /home/docker-host/repo/host/bin/host-drift-check

Exit 0 = repo matches the host. Exit 1 = drift, with a diff. It also flags mode
and owner changes, files missing on either side, and files tracked here but
absent from the manifest (which would otherwise never be checked).

When you change a host file on purpose, copy it here and update MANIFEST.tsv if
the mode changed.

## What is deliberately NOT here

Secrets. Every tracked file only *references* them:

  - `/etc/borgmatic/passphrase`   — `encryption_passcommand` reads it
  - `/root/.ntfy-token`           — the notify scripts read it
  - `/root/.grafana-admin-password`

Those are the real credentials and they stay off disk in git. The repo already
has git-secret (57 encrypted files) if any of them ever needs to be tracked.

Also not here: `/etc/fstab`, `/etc/mdadm/mdadm.conf`, and other distro-managed
config nobody has modified. This tree is scoped to what we actually changed, not
a whole-system backup — borgmatic covers `/etc` for that.

## There is no apply script, on purpose

This tree reports drift; it does not push config onto the host. Writing to
`/etc` and `/usr/local/bin` from a checkout is a good way to have a bad day.
Restoring after a rebuild is a deliberate, read-the-diff-first operation.
