# Windows Node Setup — SSH Remote Factory Replication

How to turn any Windows machine into a Zeta factory node via SSH.
Applies to Windows 11, Windows Server 2025, and Docker images.

## Prerequisites

- Windows 11 or Windows Server 2025
- Admin access on the target machine
- Network connectivity from the controller (Mac/Linux)

## 1. Enable SSH on the Windows machine

Windows Server 2025: installed by default, just start it.

Windows 11:

```powershell
# Install (one time)
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0

# Start
Start-Service sshd

# Auto-start on boot
Set-Service -Name sshd -StartupType Automatic
```

Firewall rule is created automatically by the installer.

## 2. Set up key-based authentication

From the controller machine, get your public key:

```bash
cat ~/.ssh/id_ed25519.pub
```

On the Windows machine (PowerShell as admin):

For admin users (dev laptops):

```powershell
Add-Content -Path "C:\ProgramData\ssh\administrators_authorized_keys" -Value "<PASTE_PUBLIC_KEY>"
icacls "C:\ProgramData\ssh\administrators_authorized_keys" /inheritance:r /grant "SYSTEM:(F)" /grant "BUILTIN\Administrators:(F)"
```

For non-admin users:

```powershell
mkdir -Force "$env:USERPROFILE\.ssh"
Add-Content -Path "$env:USERPROFILE\.ssh\authorized_keys" -Value "<PASTE_PUBLIC_KEY>"
```

## 3. Test connectivity

```bash
ssh <username>@<windows-ip> hostname
```

## 4. Install the factory toolchain (via SSH)

```bash
ssh <username>@<windows-ip>
```

Then on the Windows machine:

```powershell
# Git (if not installed)
winget install Git.Git

# Bun
powershell -c "irm bun.sh/install.ps1 | iex"

# .NET SDK
winget install Microsoft.DotNet.SDK.10

# Claude Code CLI
npm install -g @anthropic-ai/claude-code

# Clone the repo
git clone https://github.com/Lucent-Financial-Group/Zeta.git
cd Zeta
dotnet build -c Release
```

## 5. Set up the background service

Windows uses Task Scheduler instead of launchd:

```powershell
$action = New-ScheduledTaskAction `
    -Execute "bun" `
    -Argument ".claude/bin/claude-loop-tick.ts" `
    -WorkingDirectory "$env:USERPROFILE\Zeta"

$trigger = New-ScheduledTaskTrigger `
    -RepetitionInterval (New-TimeSpan -Seconds 60) `
    -Once -At (Get-Date)

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable

Register-ScheduledTask `
    -TaskName "ZetaClaudeLoop" `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -RunLevel Highest
```

## 6. Verify

```bash
# From the controller
ssh <username>@<windows-ip> "type %USERPROFILE%\Library\Logs\zeta-claude-loop\runner.log"
```

Or on the Windows machine:

```powershell
Get-Content "$env:USERPROFILE\Library\Logs\zeta-claude-loop\runner.log" -Tail 5
```

## Network discovery (for new machines)

```bash
# Ping test (TTL=128 = Windows)
ping -c 3 <ip>

# Port scan
nc -z -w 3 <ip> 22    # SSH
nc -z -w 3 <ip> 5985  # WinRM
nc -z -w 3 <ip> 3389  # RDP
```

## Why SSH over WinRM

- Port 22 passes through firewalls (5985/5986 often blocked)
- Cross-platform (Mac/Linux/Windows all speak SSH)
- CI/CD standard (GitHub Actions, Jenkins, Ansible default to SSH)
- PowerShell 7+ supports `Enter-PSSession -SSHTransport`

## Scope boundaries

When an agent boots on a new node, it needs to know what's
safe to touch without asking. Node classes are:

- **Dev laptops / sandboxes**: full local autonomy (install, clone, test, background loops).
- **CI / staging / shared nodes**: tool installs and non-prod work only; no prod data or credentials.
- **Production nodes**: explicit timeboxed permission only.

These rules apply per class:

- **Dev laptops are sandboxes.** Everything except production
  systems is fair game — install tools, clone repos, create
  services, run tests, explore the machine.
- **Production access requires explicit timeboxed permission.**
  The maintainer grants access to a specific prod system for
  a specific duration via access ticket + scheduled key install.
  Revocation: on window close, controller runs key-revoke script
  (removes from authorized_keys + disables scheduled task) or
  account disable per ticket reference. Access stops automatically.
- **No scope questions out the gate.** If you're on a dev
  laptop, act. Don't ask "is it okay to install bun?" — it's
  a dev machine, install it. The sandbox designation IS the
  permission.
- **Corporate boundaries respected by the book.** Use the
  machine owner's credentials and auth flow (Okta, SSO, etc).
  Don't bypass corporate security policies.

## Security notes

- Always use key-based auth, never password
- Admin keys go in `C:\ProgramData\ssh\administrators_authorized_keys`
  (not `~\.ssh\authorized_keys`) — common misconfiguration
- The `icacls` permission fix is required or sshd ignores the file
- Rotate keys on team changes
- Never commit keys or IPs to the repo
