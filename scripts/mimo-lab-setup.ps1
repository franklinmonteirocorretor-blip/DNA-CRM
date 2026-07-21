# =============================================================================
# MIMO-code.v3.0 — Script de Inicialização do Laboratório (Windows)
# Cria container Kali Linux com todas as ferramentas de pentest
# =============================================================================

param(
    [switch]$Reset,
    [string]$ContainerName = "mimo-kali-lab",
    [string]$ImageName = "kalilinux/kali-rolling:latest"
)

$ErrorActionPreference = "Stop"
$Banner = @"

╔══════════════════════════════════════════════════════════════════╗
║     MIMO-code.v3.0 — Laboratório de Segurança (Kali Linux)      ║
║     Multi-Inteligência para Modelagem, Operações e Ofensiva      ║
╚══════════════════════════════════════════════════════════════════╝

"@

Write-Host $Banner -ForegroundColor Cyan

# 1. Verificar Docker
Write-Host "[*] Verificando Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>&1
    Write-Host "    $dockerVersion" -ForegroundColor Green
}
catch {
    Write-Host "    [-] Docker não encontrado! Instale o Docker Desktop." -ForegroundColor Red
    exit 1
}

# 2. Verificar se container já existe
$existing = docker ps -a --filter "name=$ContainerName" --format "{{.Names}}" 2>&1

if ($existing -and -not $Script) {
    Write-Host "[*] Container '$ContainerName' já existe." -ForegroundColor Yellow
    $isRunning = docker ps --filter "name=$ContainerName" --format "{{.Names}}" 2>&1
    if ($isRunning) {
        Write-Host "  [+] Container está rodando." -ForegroundColor Green
        Write-Host ""
        Write-Host "  Para acessar:    docker exec -it $ContainerName bash" -ForegroundColor Cyan
        Write-Host "  Para parar:      docker stop $ContainerName" -ForegroundColor Cyan
        Write-Host "  Para recriar:    .\scripts\mimo-lab-setup.ps1 -Script" -ForegroundColor Cyan
        exit 0
    }
    else {
        Write-Host "  [~] Container está parado. Iniciando..." -ForegroundColor Yellow
        docker start $ContainerName 2>&1 | Out-Null
        Write-Host "  [+] Container iniciado." -ForegroundColor Green
        Write-Host ""
        Write-Host ">>> Para acessar:    docker exec -it $ContainerName bash" -ForegroundColor Cyan
        exit 0
    }
}

# 3. Recriar se -Script
if ($Script -and $container) {
    Write-Host "[*] Recriando container..." -ForegroundColor Yellow
    docker stop $ContainerName 2>&1 | Out-Null
    docker rm $ContainerName 2>&1 | Out-Null
    Write-Host "  [+] Container antigo removido." -ForegroundColor Green
}

# 4. Puxar imagem se necessário
Write-Host "[*] Verificando imagem Kali Linux..." -ForegroundColor Yellow
$image = docker images --format "{{.Repository}}:{{.Tag}}" $ImageName 2>&1
if (-not $image) {
    Write-Host "  [~] Baixando imagem $ImageName..." -ForegroundColor Yellow
    docker pull $ImageName 2>&1
    Write-Host "  [+] Imagem baixada." -ForegroundColor Green
}

# 5. Criar container
Write-Host "[*] Criando container Kali Linux..." -ForegroundColor Yellow
docker run -d --name $ContainerName `
    --hostname mimo-kali `
    --restart unless-stopped `
    -v "${PWD}\workspaces:/workspaces" `
    -v "${PWD}\shared:/shared" `
    $ImageName `
    sleep infinity 2>&1

Write-Host "  [+] Container criado: $ContainerName" -ForegroundColor Green

# 6. Instalar ferramentas
Write-Host "[*] Atualizando repositórios e instalando ferramentas..." -ForegroundColor Yellow
Write-Host "  (Isso pode levar vários minutos na primeira execução)" -ForegroundColor DarkYellow

docker exec $ContainerName apt update -qq 2>&1 | Out-Null
Write-Host "  [~] Instalando pacotes de segurança..." -ForegroundColor Yellow

$packages = @(
    "nmap", "masscan",
    "sqlmap", "nikto", "gobuster", "feroxbuster", "whatweb", "wpscan",
    "metasploit-framework",
    "hydra", "john",
    "netcat-openbsd", "tcpdump", "curl", "wget",
    "git", "build-essential", "gdb",
    "python3-pip", "python3-dev",
    "vim", "nano",
    "traceroute", "dnsutils", "dirb",
    "exploitdb", "searchsploit",
    "tmshark", "aircrack-ng"
)

foreach ($pkg in $packages) {
    Write-Host "    -> $pkg" -ForegroundColor Gray
    docker exec $ContainerName apt install -y -qq $pkg 2>&1 | Out-Null
}

# 7. Instalar pacotes Python
Write-Host "  [~] Instalando pacotes Python..." -ForegroundColor Yellow
docker exec $ContainerName pip3 install --break-system-packages -q `
    pwntools requests beautifulsoup4 impacket pycryptodome

# 8. Configurar workspace
docker exec $ContainerName mkdir -p /workspaces /shared /opt/mimo-code

Write-Host "  [+] Ferramentas instaladas." -ForegroundColor Green

# 9. Verificar instalação
Write-Host ""
Write-Host "[*] Verificando ferramentas instaladas..." -ForegroundColor Yellow
Write-Host ""

$tools = @{
    "nmap" = "nmap --version"
    "sqlmap" = "sqlmap --version"
    "msfconsole" = "msfconsole --version"
    "hydra" = "hydra 2>&1 | head -1"
    "nikto" = "nikto -Version"
    "whatweb" = "whatweb --version"
    "python3" = "python3 --version"
    "pwntools" = "python3 -c 'import pwn; print(\"pwntools\", pwn.__version__)'"
}

foreach ($tool in $tools.Keys) {
    $result = docker exec $ContainerName bash -c $tools[$tool] 2>&1
    $short = ($result -join " ").Substring(0, [Math]::Min(80, ($result -join " ").Length))
    Write-Host "  [+] $tool`: $short" -ForegroundColor Green
}

# 10. Finalizar
Write-Host ""
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "  LABORATÓRIO MIMO-code.v3.0 PRONTO" -ForegroundColor Green
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host ""
Write-Host "  Container: $ContainerName" -ForegroundColor White
Write-Host "  Acessar:   docker exec -it $ContainerName bash" -ForegroundColor Cyan
Write-Host "  Workspace: \workspaces (montado em $PWD\workspaces)" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Comandos rápidos:" -ForegroundColor Yellow
Write-Host "    .\scripts\mimo-lab-setup.ps1           # Iniciar laboratório" -ForegroundColor Gray
Write-Host "    .\scripts\mimo-lab-setup.ps1 -Script   # Recriar laboratório" -ForegroundColor Gray
Write-Host ""