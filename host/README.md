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

### Encrypted entries

Four files are tracked **encrypted** via git-secret, because the notification
and backup machinery is useless without them:

    /root/.ntfy-token              read by ALL FOUR notify scripts --
                                   borgmatic, smartd, mdadm, host-drift.
                                   Restore without it and every alert path is
                                   silently dead.
    /etc/borgmatic/passphrase      unlocks the borg repository
    /root/.grafana-admin-password  Grafana local admin
    /etc/msmtprc                   SMTP password (smartd/mdadm mail to root)

Each is encrypted to the same two keys as the other 57 secrets, one of which is
not on this host. The plaintexts are gitignored; only the `.secret` files are
committed.

**The borg passphrase deserves a conscious decision.** Putting it here means the
repo alone is enough to restore the backups, given the GPG key — which removes
the circularity where the only copy lived inside the archive it unlocks. The
trade is that a leak of the GPG private key now also leaks the borg passphrase.
That is judged acceptable because the key is held in two places, one offsite,
and never on a machine that is not already root-equivalent here. If that stops
being true, remove this entry rather than relying on the ciphertext.

`/etc/msmtprc` holds a plaintext SMTP password, so it is tracked **encrypted**
via git-secret: the repo contains `host/etc/msmtprc.secret`, and the plaintext
`host/etc/msmtprc` is gitignored. It is encrypted to the same two keys as the
other 57 secrets, one of which is not on this host.

This has a consequence for the drift check. It compares the *plaintext* copy
against `/etc/msmtprc`, so on a fresh clone it will report

    MISSING IN REPO  /etc/msmtprc

until you run `git secret reveal`. That is correct behaviour, not a bug — the
check is telling you the working tree is not fully materialised.

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

**Disk / RAID layout** — do not retype this from memory: the authoritative
spec is `installimage.conf`, tracked here, which is the actual file Hetzner's
installimage used to build this machine:

    DRIVE1 /dev/sda
    DRIVE2 /dev/sdb
    SWRAID 1
    SWRAIDLEVEL 1
    BOOTLOADER grub
    PART /boot  ext3   512M
    PART lvm    vg0    all
    LV vg0 root  /     ext4  2048G
    LV vg0 swap  swap  swap    16G
    LV vg0 tmp   /tmp  ext4    10G
    LV vg0 home  /home ext4    all

Note `home` is `all` (the remainder), not a fixed size — it currently resolves
to ~708G. An earlier copy of this layout in the retired ansible tree recorded
the *result* (720G) as if it were the spec.

The original image was `Ubuntu-1810-cosmic-64-minimal`, installed 2019-02-27.
This host has been upgraded in place ever since and now runs 26.04, which is
worth knowing before assuming a rebuild would reproduce it exactly.

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
