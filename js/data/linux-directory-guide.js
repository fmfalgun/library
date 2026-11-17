/*
 * File purpose: the data for linux-directory-guide.html. Exposed as
 * Library.data = {sections, virtualMark}; each section holds groups of
 * [path, description, optional virtual flag] rows. The page logic lives in
 * js/pages/linux-directory-guide.js. Add or fix entries here.
 */
(function () {
var V='v'; // marks a row as kernel-generated (not stored on disk)
var S=[
{id:'top',t:'Top-level directories',l:'The first level below /. Each has a fixed purpose across nearly all distributions.',g:[
['Core layout',[
['/','Root of the whole tree. Everything hangs from here.'],
['/bin, /sbin','Essential user and admin commands (ls, cp, ip, reboot). Symlinks to /usr/bin and /usr/sbin on modern distros.'],
['/lib, /lib64','Shared libraries needed by /bin and /sbin. Usually a symlink into /usr.'],
['/boot','Kernel (vmlinuz), initramfs, GRUB config, and the EFI partition on UEFI machines.'],
['/etc','System-wide configuration. Detailed in its own section below.'],
['/usr','The bulk of the installed OS: programs, libraries, docs.'],
['/var','Variable data that changes while the system runs.']]],
['Users and data',[
['/home','One directory per regular user, holding files and personal settings.'],
['/root','Home directory of the root user, kept outside /home so it works when /home is not mounted.'],
['/srv','Data this machine serves (web, FTP, etc.), if you choose to use it.'],
['/opt','Optional third-party software installed as self-contained packages.']]],
['Temporary and mount points',[
['/tmp','Temporary files, often cleared on reboot.'],
['/mnt','Manual temporary mount point.'],
['/media','Auto-mounted removable media such as USB drives and DVDs.'],
['/lost+found','Recovered file fragments after a filesystem repair (ext4).']]],
['Kernel and runtime views',[
['/dev','Device files: disks, terminals, /dev/null.',V],
['/proc','Processes and kernel information.',V],
['/sys','Devices, drivers, and kernel objects.',V],
['/run','Runtime data since boot (PIDs, sockets), held in RAM.',V]]],
['Symlinks on modern distros (usr-merge)',[
['/bin → /usr/bin','Same for /sbin and /lib, /lib64.'],
['/var/run → /run','Old path kept for compatibility.'],
['/var/lock → /run/lock','Lock files.']]],
['Often separate partitions',[
['/boot, /boot/efi','Kept apart so the bootloader can always read them.'],
['/home','Survives a reinstall of the OS.'],
['/var','Stops runaway logs from filling /.'],
['/tmp','Sometimes a RAM-backed tmpfs.'],
['swap','Not a directory; a partition or file used as overflow memory.']]],
['Who can write where',[
['/etc, /usr, /boot','Root only; changed by admins and package managers.'],
['/tmp','Everyone, with the sticky bit (mode 1777) so users cannot delete each other’s files.'],
['/root','Mode 700; root only.'],
['/home/<user>','That user only (plus root).']]],
['Distro extras',[
['/snap, /var/lib/snapd','Snap packages (Ubuntu).'],
['/var/lib/flatpak','Flatpak apps.'],
['/nix','Nix store (NixOS or Nix users).']]]
]},
{id:'etc',t:'/etc: configuration',l:'Almost everything installed system-wide keeps its settings here as plain text. User-specific settings live in the home directory instead.',g:[
['Networking',[
['/etc/netplan/','Network config on Ubuntu (YAML).'],
['/etc/network/interfaces','Older Debian/Ubuntu network config.'],
['/etc/NetworkManager/','NetworkManager connections and settings.'],
['/etc/systemd/network/','systemd-networkd configs.'],
['/etc/hosts','Static hostname-to-IP mappings.'],
['/etc/hostname','The machine’s name.'],
['/etc/resolv.conf','DNS resolver settings.'],
['/etc/nsswitch.conf','Order of name lookups (files, dns, and so on).'],
['/etc/sysctl.conf, sysctl.d/','Kernel parameters such as IP forwarding.'],
['/etc/iproute2/','Routing table names.']]],
['VPN',[
['/etc/wireguard/','WireGuard tunnels (wg0.conf).'],
['/etc/openvpn/','OpenVPN client and server configs.'],
['/etc/ipsec.conf, ipsec.d/','IPsec and strongSwan.']]],
['High availability and load balancing',[
['/etc/keepalived/keepalived.conf','VRRP and virtual IPs.'],
['/etc/haproxy/haproxy.cfg','HAProxy load balancer.'],
['/etc/corosync/, /etc/pacemaker/','Cluster stack.']]],
['Firewall and security',[
['/etc/ufw/','UFW firewall.'],
['/etc/nftables.conf','nftables rules.'],
['/etc/iptables/','Saved iptables rules.'],
['/etc/fail2ban/','Automatic banning of abusive IPs.'],
['/etc/ssh/','sshd_config (server) and ssh_config (client).'],
['/etc/ssl/, /etc/pki/','Certificates and trust stores.'],
['/etc/apparmor.d/, /etc/selinux/','Mandatory access control.'],
['/etc/sudoers, sudoers.d/','Who can run what with sudo.'],
['/etc/security/, /etc/pam.d/','PAM limits and authentication modules.']]],
['Users and authentication',[
['/etc/passwd','User accounts.'],
['/etc/shadow','Password hashes (root only).'],
['/etc/group, /etc/gshadow','Groups.'],
['/etc/login.defs','Defaults for new users.'],
['/etc/skel/','Template files copied into new home directories.']]],
['Services, boot, and scheduling',[
['/etc/systemd/system/','Custom or overridden systemd units.'],
['/etc/systemd/*.conf','journald, resolved, and logind settings.'],
['/etc/init.d/, /etc/rc*.d/','Legacy SysV init scripts.'],
['/etc/default/','Defaults for services and tools (for example grub).'],
['/etc/fstab','Filesystems mounted at boot.'],
['/etc/crypttab','Encrypted volumes.'],
['/etc/crontab, cron.d/, cron.daily/','Scheduled jobs.'],
['/etc/environment, profile, profile.d/','Environment variables and shell setup.'],
['/etc/modules, /etc/modprobe.d/','Kernel modules to load or block.']]],
['Web, database, and app servers',[
['/etc/nginx/','Nginx.'],
['/etc/apache2/ or /etc/httpd/','Apache.'],
['/etc/mysql/, /etc/postgresql/','Databases.'],
['/etc/redis/','Redis.'],
['/etc/php/','PHP.'],
['/etc/docker/','Docker daemon config.'],
['/etc/kubernetes/','Kubernetes node components.'],
['/etc/ansible/','Ansible defaults.']]],
['DNS, DHCP, and network services',[
['/etc/bind/','BIND DNS server.'],
['/etc/unbound/','Unbound resolver.'],
['/etc/dnsmasq.conf, dnsmasq.d/','Lightweight DNS and DHCP.'],
['/etc/dhcp/','ISC DHCP.'],
['/etc/chrony/, /etc/ntp.conf','Time sync.'],
['/etc/postfix/, /etc/exim4/','Mail servers.'],
['/etc/samba/','Windows file sharing.'],
['/etc/exports','NFS shares.'],
['/etc/rsyslog.conf, rsyslog.d/','Logging.']]],
['Packages, identity, and locale',[
['/etc/apt/','APT sources (Debian, Ubuntu).'],
['/etc/yum.repos.d/, /etc/dnf/','RPM-based distros.'],
['/etc/pacman.conf','Arch.'],
['/etc/os-release','Distro name and version.'],
['/etc/timezone, /etc/localtime','Time zone.'],
['/etc/locale.gen, /etc/default/locale','Language settings.'],
['/etc/motd, /etc/issue','Login banners.'],
['/etc/machine-id','Unique machine identifier.']]],
['Storage and devices',[
['/etc/lvm/','LVM settings.'],
['/etc/mdadm/mdadm.conf','Software RAID arrays.'],
['/etc/udev/rules.d/','Custom device rules (stable names, permissions).'],
['/etc/multipath.conf','SAN multipath.'],
['/etc/cloud/','cloud-init settings on cloud images.'],
['/etc/default/grub','Bootloader options; run update-grub after editing.']]],
['Libraries, shells, and housekeeping',[
['/etc/ld.so.conf, ld.so.conf.d/','Extra library paths; run ldconfig after changes.'],
['/etc/alternatives/','Symlinks managed by update-alternatives (editor, java, python).'],
['/etc/shells','Valid login shells.'],
['/etc/bash.bashrc, /etc/inputrc','System-wide interactive shell defaults.'],
['/etc/logrotate.conf, logrotate.d/','How logs are rotated and compressed.'],
['/etc/security/limits.conf','Per-user limits such as open files.'],
['/etc/tmpfiles.d/','Rules for creating and cleaning temp directories.'],
['/etc/updatedb.conf','What locate indexes.']]],
['Reference databases',[
['/etc/services','Port number to service name map.'],
['/etc/protocols','IP protocol numbers.'],
['/etc/mime.types','File extension to MIME type.'],
['/etc/networks','Named network ranges.']]],
['Web server layout and TLS',[
['/etc/nginx/nginx.conf','Main Nginx file; includes the rest.'],
['/etc/nginx/sites-available/, sites-enabled/','Define sites, then symlink to enable.'],
['/etc/nginx/conf.d/','Drop-in snippets.'],
['/etc/letsencrypt/live/<domain>/','Current Let’s Encrypt certificate and key.'],
['/etc/ssl/private/','Private keys; root only.']]],
['SSH in detail',[
['/etc/ssh/sshd_config.d/','Drop-in overrides for the SSH server.'],
['/etc/ssh/ssh_host_*_key','The server’s identity keys; do not share.'],
['/etc/ssh/ssh_known_hosts','System-wide trusted host keys.']]],
['Identity and directory services',[
['/etc/sssd/','Login via LDAP, AD, or Kerberos.'],
['/etc/ldap/','LDAP client settings.'],
['/etc/krb5.conf','Kerberos realms.']]],
['Monitoring and desktop',[
['/etc/prometheus/, /etc/grafana/','Metrics and dashboards.'],
['/etc/zabbix/','Zabbix agent and server.'],
['/etc/X11/, /etc/xdg/','Display server and desktop defaults.'],
['/etc/cups/','Printing.'],
['/etc/bluetooth/','Bluetooth daemon.']]]
]},
{id:'usr',t:'/usr: installed software',l:'Mostly read-only after installation. Package managers write here; you rarely should.',g:[
['Inside /usr',[
['/usr/bin','Most user programs.'],
['/usr/sbin','Non-essential admin programs such as nginx and sshd.'],
['/usr/lib','Libraries and internal program files.'],
['/usr/local','Software you install by hand, with its own bin, lib, and etc.'],
['/usr/share','Architecture-independent data: docs, man pages, icons, locale files, time zone data.'],
['/usr/include','C and C++ header files.'],
['/usr/src','Kernel sources and headers.']]],
['/usr/local in detail',[
['/usr/local/bin','Your own scripts and hand-installed tools; already on PATH.'],
['/usr/local/sbin','Same, for admin tools.'],
['/usr/local/etc','Config for hand-installed software.'],
['/usr/local/lib, share','Libraries and data for those tools.']]],
['/usr/lib in detail',[
['/usr/lib/systemd/system/','Service units shipped by packages. Override in /etc/systemd/system/, never edit here.'],
['/usr/lib/modules/<version>/','Kernel modules (drivers) for each installed kernel.'],
['/usr/lib/x86_64-linux-gnu/','Architecture-specific libraries on Debian/Ubuntu.'],
['/usr/lib/python3/','System Python packages.']]],
['/usr/share in detail',[
['/usr/share/man/','Manual pages.'],
['/usr/share/doc/','Package docs and changelogs.'],
['/usr/share/zoneinfo/','Time zone database.'],
['/usr/share/applications/','Desktop launchers (.desktop files).'],
['/usr/share/fonts/, icons/','Fonts and icon themes.'],
['/usr/share/locale/','Translations.']]],
['Finding what a package installed',[
['dpkg -L <pkg>','Lists every file a Debian/Ubuntu package put on disk.'],
['rpm -ql <pkg>','Same on RPM-based distros.'],
['dpkg -S /path','Which package owns a file (rpm -qf on RPM).']]]
]},
{id:'var',t:'/var: changing data',l:'Logs, databases, caches, and queues. This is where a disk usually fills up.',g:[
['Inside /var',[
['/var/log','Log files: syslog, auth.log, nginx/, journal/.'],
['/var/lib','Persistent application state: /var/lib/mysql, /var/lib/docker, /var/lib/dpkg.'],
['/var/cache','Regenerable cached data such as downloaded packages.'],
['/var/spool','Queued jobs: mail, cron, print.'],
['/var/www','Default web root on many distros.'],
['/var/tmp','Temporary files that survive reboots.'],
['/var/run','Usually a symlink to /run.'],
['/var/backups','System-generated backups of key files.']]],
['/var/log in detail',[
['syslog or messages','General system log (Debian/Ubuntu or RHEL).'],
['auth.log or secure','Logins, sudo, SSH attempts.'],
['kern.log, dmesg','Kernel messages and hardware events.'],
['journal/','systemd binary logs; read with journalctl.'],
['nginx/, apache2/, mysql/','Per-service access and error logs.'],
['apt/, dpkg.log','Package install history.'],
['wtmp, btmp, lastlog','Login history; read with last, lastb, lastlog.']]],
['/var/lib in detail',[
['/var/lib/docker, containerd','Images, containers, volumes.'],
['/var/lib/mysql, postgresql','Database files. Back up properly, not by copying live.'],
['/var/lib/dpkg, apt','Package manager state.'],
['/var/lib/kubelet','Kubernetes node pods and volumes.'],
['/var/lib/NetworkManager','DHCP leases and connection state.'],
['/var/lib/systemd','Timers and other persistent systemd state.']]],
['/var/spool',[
['/var/spool/cron/crontabs','Per-user crontabs (edit with crontab -e).'],
['/var/spool/mail','Local mailboxes.'],
['/var/spool/postfix','Mail queue.'],
['/var/spool/cups','Print queue.']]],
['Reclaiming space',[
['journalctl --vacuum-size=200M','Trim systemd journal.'],
['/etc/logrotate.conf, logrotate.d/','Rotation rules for logs.'],
['apt clean','Clear downloaded packages in /var/cache/apt.'],
['docker system prune','Remove unused Docker data in /var/lib/docker.']]]
]},
{id:'virt',t:'Virtual directories',l:'/proc, /sys, /dev, and /run are windows into the running kernel, not files on disk. You can read them to inspect the system and sometimes write to them to tune it.',g:[
['/proc',[
['/proc/cpuinfo, meminfo','Hardware and memory info.',V],
['/proc/<PID>/','Details for each running process.',V],
['/proc/sys/','Tunable kernel parameters (what sysctl changes).',V],
['/proc/net/','Network statistics.',V],
['/proc/mounts','Current mounts.',V]]],
['/sys',[
['/sys/class/net/','Network interfaces.',V],
['/sys/block/','Block devices.',V],
['/sys/class/power_supply/','Battery info.',V],
['/sys/devices/','The device tree.',V],
['/sys/fs/cgroup/','Control groups, used by containers and systemd.',V]]],
['/dev',[
['/dev/sda, /dev/nvme0n1','Disks.',V],
['/dev/tty*, /dev/pts/*','Terminals.',V],
['/dev/null, /dev/zero, /dev/urandom','Discard data, endless zeros, random bytes.',V],
['/dev/loop*','Mount image files as disks.',V],
['/dev/mapper/','LVM and encrypted volumes.',V]]],
['/run',[
['/run/systemd/','systemd runtime state.',V],
['/run/user/<UID>/','Per-user sockets and D-Bus.',V],
['/run/lock/','Lock files.',V],
['/run/*.pid, *.sock','Daemon PID files and sockets.',V]]],
['/proc/<PID>/ in detail',[
['cmdline','Exact command that started the process.'],
['status','State, memory, UID, parent PID.'],
['fd/','Open file descriptors (files, sockets).'],
['environ','Environment variables of the process.'],
['cwd, exe','Symlinks to its working directory and binary.'],
['maps','Memory map.']]],
['More useful /proc files',[
['/proc/loadavg, uptime','Load average and uptime.'],
['/proc/version, cmdline','Kernel version and boot parameters.'],
['/proc/swaps, diskstats','Swap use and disk I/O counters.'],
['/proc/interrupts','Interrupts per CPU.'],
['/proc/filesystems','Filesystem types the kernel supports.']]],
['Tuning through /proc/sys (use sysctl)',[
['net/ipv4/ip_forward','1 lets the machine route packets (needed for VPN gateways).'],
['vm/swappiness','How eagerly the kernel swaps.'],
['fs/file-max','System-wide open file limit.'],
['net/core/somaxconn','Listen queue length for busy servers.'],
['kernel/hostname','Current hostname.'],
['Persist changes','Write to /etc/sysctl.d/99-name.conf, then run sysctl --system.']]],
['More in /sys',[
['/sys/class/net/eth0/address','MAC address of an interface.'],
['/sys/class/thermal/','Temperature sensors.'],
['/sys/bus/pci/','PCI devices.'],
['/sys/module/','Loaded kernel modules and their parameters.'],
['/sys/firmware/efi/','Present only when booted with UEFI.']]],
['More in /dev and /run',[
['/dev/disk/by-uuid, by-id','Stable disk names; safer than sda in fstab.'],
['/dev/shm','Shared memory in RAM.'],
['/dev/kvm','Hardware virtualization access.'],
['/dev/net/tun','Used by VPNs such as WireGuard and OpenVPN.'],
['/run/docker.sock','Docker daemon socket.'],
['/run/dbus/','System message bus socket.']]]
]},
{id:'home',t:'/home and /boot',l:'Your files and settings, and the files needed to start the machine.',g:[
['/home (per user)',[
['~/.config, ~/.local/share, ~/.cache','Per-user app config, data, and cache.'],
['~/.ssh/','SSH keys and authorized_keys.'],
['~/.bashrc, ~/.profile','Shell setup.']]],
['/boot',[
['vmlinuz-*','The kernel.'],
['initrd.img-* or initramfs-*','Early boot image.'],
['grub/','Bootloader configuration.'],
['efi/','EFI system partition on UEFI machines.'],
['System.map, config-*','Kernel symbol table and build config.'],
['grub/grub.cfg','Generated file. Edit /etc/default/grub, then run update-grub.']]],
['More in your home directory',[
['~/Documents, Downloads, Desktop','Standard user folders.'],
['~/.local/bin','Personal commands; often on PATH.'],
['~/.config/systemd/user/','Your own user services.'],
['~/.gnupg/','GPG keys.'],
['~/.bash_history','Shell command history.'],
['~/.docker, ~/.kube, ~/.aws','Tool credentials and config. Keep private.']]],
['Shell startup order',[
['/etc/profile, profile.d/','Login shells, system-wide.'],
['~/.profile or ~/.bash_profile','Login shells, per user.'],
['/etc/bash.bashrc, ~/.bashrc','Interactive non-login shells.'],
['~/.bash_logout','Runs when a login shell exits.']]],
['Boot sequence',[
['Firmware','UEFI or BIOS finds the boot device.'],
['Bootloader','GRUB loads from /boot/efi and /boot/grub.'],
['Kernel and initramfs','vmlinuz starts; initramfs loads drivers and mounts the root filesystem.'],
['systemd (PID 1)','Mounts /etc/fstab entries, starts services, reaches the default target.'],
['Login','Console, display manager, or sshd.']]]
]},
{id:'other',t:'Other directories',l:'Smaller top-level directories, each with a single purpose.',g:[
['/bin, /sbin, /lib, /lib64',[
['/bin','Essential commands for all users: ls, cp, mv, cat, bash.'],
['/sbin','Essential admin commands: fsck, ip, reboot, mkfs.'],
['/lib/modules/','Kernel modules, one folder per kernel version.'],
['/lib64/ld-linux-x86-64.so.2','The dynamic loader every program starts through.'],
['Note','On modern distros all four are symlinks into /usr.']]],
['/opt',[
['/opt/<vendor>/<app>/','Self-contained software with its own bin and lib (Chrome, vendor agents).'],
['PATH','Add /opt/<app>/bin to PATH, or symlink into /usr/local/bin.'],
['Versus /usr/local','/usr/local mirrors the system layout; /opt keeps one app in one folder.']]],
['/srv',[
['/srv/www','Website content you choose to host here.'],
['/srv/ftp, /srv/nfs, /srv/git','Data for FTP, NFS, or Git services.'],
['Note','Optional: many distros use /var/www instead.']]],
['/tmp and /var/tmp',[
['/tmp','Cleared on reboot or by systemd-tmpfiles; may be RAM-backed.'],
['/var/tmp','Survives reboots; cleaned after about 30 days.'],
['Rule','Never keep important data in either.']]],
['/mnt and /media',[
['/mnt','Manual mounts: mount /dev/sdb1 /mnt, then umount /mnt.'],
['/media/<user>/<label>','USB drives and discs mounted automatically by the desktop.'],
['Permanent mounts','Use /etc/fstab and a dedicated folder such as /data.']]],
['/root and /lost+found',[
['/root','Root user’s home: .bashrc, .ssh, .bash_history. Outside /home so it works in rescue mode.'],
['/lost+found','fsck puts recovered fragments here. Exists at the top of each ext4 filesystem; normally empty.']]]
]},
{id:'tips',t:'Practical cheat sheet',l:'Where to look, what to back up, and how to find what fills the disk.',g:[
['Backups',[
['Back up','/etc, /home, /var/lib (databases and app data), /srv or /var/www.'],
['Usually skip','/usr, /proc, /sys, /tmp, /run.']]],
['Troubleshooting',[
['Disk full','Most often /var/log, /var/lib/docker, /var/cache, /tmp. Run: du -h --max-depth=1 /var | sort -h'],
['Service misbehaving','Check its config in /etc/<name>/ and its logs in /var/log/<name>/ or journalctl -u <name>.'],
['Safe edits','Prefer drop-in directories ending in .d (sudoers.d, sysctl.d) over editing the main file; upgrades stay clean.'],
['Track changes','Put /etc under version control with etckeeper.']]],
['Common tasks and where they live',[
['Change hostname','/etc/hostname, or hostnamectl set-hostname.'],
['Set a static IP','Edit /etc/netplan/*.yaml, then netplan apply.'],
['Mount a disk at boot','Add a line to /etc/fstab (use UUID), then mount -a.'],
['Schedule a job','crontab -e, or a file in /etc/cron.d/.'],
['Enable a service','systemctl enable --now <name>.'],
['Override a service','systemctl edit <name> creates /etc/systemd/system/<name>.service.d/.'],
['Open a firewall port','ufw allow <port>, or edit /etc/nftables.conf.'],
['Give sudo rights','visudo -f /etc/sudoers.d/<name>.'],
['Kernel setting','/etc/sysctl.d/99-name.conf, then sysctl --system.'],
['Change DNS','/etc/netplan or NetworkManager; /etc/resolv.conf is often managed for you.']]],
['Find things fast',[
['command -v <cmd>','Where a command lives.'],
['find / -name <file> 2>/dev/null','Search by name.'],
['lsblk, df -h, findmnt','Disks, free space, mounts.'],
['du -h --max-depth=1 /var | sort -h','Largest directories.'],
['ldd /path/to/binary','Libraries a program needs.'],
['journalctl -u <name> -f','Follow a service log.']]],
['Permissions that matter',[
['/etc/shadow','Root and shadow group only (mode 640 or 600).'],
['~/.ssh','Mode 700.'],
['~/.ssh/authorized_keys, private keys','Mode 600; SSH refuses looser permissions.'],
['/tmp','Mode 1777 (sticky bit).'],
['/root','Mode 700.']]]
]}
];
window.Library = window.Library || {};
Library.data = { sections: S, virtualMark: V };
})();
