---
name: SSH to Windows — remote setup for CD pipelines and red team
description: Tested 2026-05-08 on ST laptop (192.168.4.92). SSH port 22 open, key-based auth. Maps the skill for future CD deployment and red team exercises.
type: reference
originSessionId: fb6abb97-a97f-44e9-8ed1-bbded23b73b1
---
## SSH to Windows — remote factory node setup

Tested 2026-05-08 against Aaron's ServiceTitan laptop (192.168.4.92).

### Network discovery
```bash
ping -c 3 192.168.4.92          # TTL=128 confirms Windows
nc -z -w 3 192.168.4.92 22      # SSH open
nc -z -w 3 192.168.4.92 5985    # WinRM HTTP open
nc -z -w 3 192.168.4.92 3389    # RDP open
arp -a                           # List local network devices
```

### SSH key setup (Windows side, PowerShell as admin)

For admin users (most dev laptops):
```powershell
Add-Content -Path "C:\ProgramData\ssh\administrators_authorized_keys" -Value "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDGTU+CghueXG43ltkRkD3Ly81/f6Z36oda45TdIvRFB acehack@Mac.lan"
icacls "C:\ProgramData\ssh\administrators_authorized_keys" /inheritance:r /grant "SYSTEM:(F)" /grant "BUILTIN\Administrators:(F)"
```

For non-admin users:
```powershell
mkdir -Force "$env:USERPROFILE\.ssh"
Add-Content -Path "$env:USERPROFILE\.ssh\authorized_keys" -Value "ssh-ed25519 ..."
```

### SSH from Mac
```bash
ssh astainback@192.168.4.92 hostname
```

### Enable SSH on consumer Windows 11 (3 commands)
```powershell
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
Start-Service sshd
Set-Service -Name sshd -StartupType Automatic
```

Windows Server 2025: installed by default, just start it.

### Industry standard (2026)
- SSH is the CI/CD standard over WinRM — port 22 through firewalls, cross-platform, GitHub Actions/Jenkins/Ansible default
- PowerShell 7+ supports `Enter-PSSession -SSHTransport` for native cross-platform remoting
- WinRM still useful for domain-joined Kerberos/JEA scenarios

### CD pipeline use case
Once SSH is set up, the factory can:
1. SSH into any Windows machine
2. Install toolchain (git, bun, dotnet, claude CLI)
3. Clone the repo
4. Set up Windows Task Scheduler (equivalent of launchd)
5. Deploy the tick script
6. Verify heartbeat

Any Windows machine = 3 commands + 1 key copy → factory node.

### Scope (Aaron 2026-05-08)
- ST laptop (192.168.4.92) is the sandbox — everything EXCEPT prod is fair game
- Prod access requires explicit timeboxed permission from Aaron
- Everything else on that laptop is safe to explore, install, configure, test

### Red team use case
- Same SSH path tests lateral movement in corporate networks
- Key-based auth vs password vs Okta SSO — which is configured?
- Port scanning (nc -z) maps the attack surface
- Admin vs non-admin authorized_keys location = privilege escalation vector
- The icacls permission fix is a common misconfiguration to test for
