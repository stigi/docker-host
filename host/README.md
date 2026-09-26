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

## How the tracked set was chosen

Originally this was just "files we edited during the incident follow-up". That
was too narrow — it missed `/etc/ssh/sshd_config.d/00-zebra-custom.conf`, which
sets the SSH port and all the cipher hardening, and which was found only by
chasing why the port was 2232.

So the set was rebuilt from what dpkg knows, on 2026-09-26:

    # files under /etc that no package owns (locally created)
    #   -> parse /var/lib/dpkg/info/*.list
    # conffiles that differ from the package default (locally modified)
    #   -> compare against the hashes in /var/lib/dpkg/status
    #      (NOT *.md5sums -- conffile hashes are not recorded there,
    #       which makes a md5sums-based check silently report zero)

That found 177 locally-created files and 4 modified conffiles. Most of the 177
are generated or runtime state (snap mount units, ld.so.cache, LVM archives) and
are deliberately excluded. What was kept is config that is customised, not
reconstructible from memory, and would change how the box behaves if lost:
firewall (ufw + ufw-docker), RAID (mdadm), boot/kernel (grub, modprobe,
initramfs), mail delivery, unattended-upgrades, audit rules.

Re-run that scan after any significant system change; the set is not static.

## Secrets and recovery

`/etc/msmtprc` is deliberately NOT tracked: it holds a plaintext SMTP password.
If it is ever tracked it must go through git-secret, never in the clear.

Recovery depends on two things that live OFF this machine, in a password
manager — confirmed present as of 2026-09-26:

  - the borg repository passphrase
  - an exported copy of the git-secret GPG private key

The borg passphrase matters most, and is circular on its own:
`/etc/borgmatic/passphrase` is backed up *into* the repo it unlocks, so the
on-host copy is worthless precisely when you need it.

git-secret is in better shape than it first appears. `git secret whoknows`
lists three identities, but they are two keys:

    hi+gh@ullrich.is       ]  two uids on the SAME key, rsa3072/F078A095B5EDC374,
    docker-host@ullrich.is ]  private half in /home/docker-host/.gnupg on THIS host
    hi+github@ullrich.is      a SEPARATE key, private half NOT on this host

So a second machine can already decrypt the 57 encrypted files without the
offsite export. That is redundancy, not a substitute for it — both remaining
copies are still things that can be lost at once.

## There is no apply script, on purpose

This tree reports drift; it does not push config onto the host. Writing to
`/etc` and `/usr/local/bin` from a checkout is a good way to have a bad day.
Restoring after a rebuild is a deliberate, read-the-diff-first operation.

## Rebuilding this host

Not automated. This tree holds the *configuration*, not a provisioning tool —
see "There is no apply script" above. What cannot be recovered from a file on
this box, and so is written down here:

**Disk / RAID layout** — recreated via Hetzner installimage, Ubuntu LTS,
mdraid1 across both disks, LVM:

    PART /boot  ext3  512M   (mdraid)
    PART lvm    vg0   all    (mdraid)
    LV vg0 root  /     ext4   2T
    LV vg0 swap  swap  swap   16G
    LV vg0 tmp   /tmp  ext4   10G
    LV vg0 home  /home ext4   720G

**Reverse DNS (PTR)** for `176.9.150.227` / `2a01:4f8:160:33c7::2` is managed
by hand in Hetzner Robot. Forward DNS for ullrich.is is Hetzner DNS.

**Secrets** are not here and not in any repo:

  - `/etc/borgmatic/passphrase` — borg repository passphrase
  - `/root/.ntfy-token`, `/root/.grafana-admin-password`

**Recovery order** after bare metal is up: restore `/etc` and `/root` from borg,
reconcile against this tree with `bin/host-drift-check`, then bring up the
compose projects in this repo.

### Previous attempt: /root/zebra-host-config (retired 2026-09-26)

An Ansible + Terraform repo lived at `/root/zebra-host-config`, described in its
own README as *the* bootstrap procedure. It was retired because following it
would have produced a broken host, and a plausible-looking wrong plan is worse
than no plan:

  - four of its nine roles (`backups`, `docker`, `firewall`,
    `unattended-upgrades`) were empty scaffolding with zero task files, while
    `site.yml` ran all nine — Ansible skips a role with no `tasks/main.yml`
    silently, so a rebuild would have had no Docker, no firewall and no backups
    without erroring
  - its README specified Ubuntu 22.04; the host is 26.04
  - it documented a `terraform plan` step against an empty `terraform/dns`
  - it rendered the borg passphrase to `/etc/borgmatic/.env`; the live config
    reads `/etc/borgmatic/passphrase` via `encryption_passcommand`
  - `authorized_keys` for `ullrich` and `docker-host` no longer matched the host
  - it was never in version control, and was last touched 2026-04-24

What was accurate and has been carried over: the partition layout above, and
`/etc/sysctl.d/99-hetzner.conf`, `/etc/ssh/sshd_config` and the two
`/etc/netplan/` files, which are now tracked here and drift-checked.
