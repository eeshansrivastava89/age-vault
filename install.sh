#!/usr/bin/env bash
# age-vault installer
#
# Install:
#   curl -fsSL https://raw.githubusercontent.com/eeshansrivastava89/age-vault/main/install.sh | bash
#
# Or review first:
#   curl -fsSL https://raw.githubusercontent.com/eeshansrivastava89/age-vault/main/install.sh | less
#
# What this does:
#   1. Checks for Node.js
#   2. If not found, installs it via nvm (no sudo needed)
#   3. Installs age-vault globally via npm
#   4. Adds npm global bin to PATH if needed
#   5. Runs age-vault --help
#
# Flags:
#   --dry-run    Show what would happen without making changes
#   --no-run     Install but don't launch age-vault after
#   --help       Show this help
#
# This script never uses sudo. Everything installs to user-writable directories.

set -euo pipefail

# ── Flags ───────────────────────────────────────────────────────────────────

DRY_RUN=false
SKIP_RUN=false
DEFAULT_RC="${DEFAULT_RC:-}"

for arg in "$@"; do
  case "$arg" in
    --dry-run)  DRY_RUN=true; echo "[dry-run] No changes will be made." ;;
    --no-run)   SKIP_RUN=true ;;
    --help|-h)  echo "Usage: curl -fsSL <url> | bash -s -- [--dry-run] [--no-run]"; exit 0 ;;
  esac
done

dry() { if $DRY_RUN; then printf "[dry-run] %s\n" "$*"; return 0; else "$@"; fi; }

# ── Output helpers ──────────────────────────────────────────────────────────

BOLD='\033[1m' RESET='\033[0m' GREEN='\033[32m' YELLOW='\033[33m' BLUE='\033[34m' RED='\033[31m'
info()  { printf "${BLUE}→${RESET} %s\n" "$*"; }
ok()    { printf "${GREEN}✓${RESET} %s\n" "$*"; }
warn()  { printf "${YELLOW}!${RESET} %s\n" "$*"; }
fail()  { printf "${RED}✗${RESET} %s\n" "$*"; exit 1; }

# ── Detect OS ───────────────────────────────────────────────────────────────

OS="$(uname -s)"
ARCH="$(uname -m)"
case "$OS" in
  Darwin) OS="macos" ;;
  Linux)  OS="linux" ;;
  *)      fail "Unsupported OS: $OS. age-vault requires macOS or Linux." ;;
esac
case "$ARCH" in
  x86_64|amd64) ARCH="x64" ;;
  arm64|aarch64) ARCH="arm64" ;;
  *)             fail "Unsupported architecture: $ARCH" ;;
esac
info "Detected: ${OS}-${ARCH}"

# ── Check for Node.js ───────────────────────────────────────────────────────

if command -v node &>/dev/null; then
  NODE_VERSION="$(node --version 2>/dev/null || echo "unknown")"
  ok "Node.js ${NODE_VERSION} found at $(command -v node)"
else
  echo ""
  printf "${BOLD}age-vault needs Node.js.${RESET}\n"
  printf "It will be installed now via nvm (Node Version Manager).\n"
  printf "This installs to your home directory — no sudo needed.\n"
  echo ""

  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  info "Installing nvm..."
  dry curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh -o /tmp/nvm-install.sh
  dry bash /tmp/nvm-install.sh

  if ! $DRY_RUN; then
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  fi

  info "Installing Node.js LTS..."
  dry nvm install --lts

  if $DRY_RUN || command -v node &>/dev/null; then
    ok "Node.js $(node --version 2>/dev/null || echo 'installed') installed via nvm."
  else
    ok "Node.js installed via nvm."
    echo ""
    warn "Node.js was installed but your shell doesn't see it yet."
    echo "  Restart your terminal, or run: source ~/.nvm/nvm.sh"
    echo "  Then re-run this installer."
    exit 0
  fi
fi

# ── Install age-vault ──────────────────────────────────────────────────────

echo ""
printf "${BOLD}Installing age-vault...${RESET}\n"
dry npm install -g age-vault@latest --prefer-online

# ── Dry-run early exit ──────────────────────────────────────────────────────

if $DRY_RUN; then
  ok "age-vault installed (dry-run)"
  echo ""
  printf "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"
  printf "${BOLD}${GREEN}  age-vault is ready! (dry-run)${RESET}\n"
  printf "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"
  echo ""
  echo "  Run: age-vault --help"
  echo ""
  exit 0
fi

# ── Determine npm global bin directory ──────────────────────────────────────

NPM_BIN=""
if command -v npm &>/dev/null; then
  NPM_PREFIX="$(npm prefix -g 2>/dev/null || true)"
  if [[ -n "$NPM_PREFIX" ]]; then
    NPM_BIN="${NPM_PREFIX%/}/bin"
  fi
  if [[ ! -x "$NPM_BIN/age-vault" ]]; then
    NPM_BIN=""
  fi
fi

INSTALLED_VERSION=""

if [[ -n "$NPM_BIN" && -x "$NPM_BIN/age-vault" ]]; then
  INSTALLED_VERSION="$("$NPM_BIN/age-vault" --version 2>/dev/null | sed -E 's/^age-vault v//' || echo "")"

  if command -v age-vault &>/dev/null; then
    ok "age-vault ${INSTALLED_VERSION:+v${INSTALLED_VERSION} }installed at $(command -v age-vault)"
  else
    export PATH="$NPM_BIN:$PATH"
    ok "age-vault ${INSTALLED_VERSION:+v${INSTALLED_VERSION} }installed"

    ADDED_TO_RC=false
    [[ "$OSTYPE" == darwin* ]] && [[ -z "${DEFAULT_RC}" ]] && DEFAULT_RC="$HOME/.zshrc"
    RC_CANDIDATES=("${DEFAULT_RC:-}" "$HOME/.zshrc" "$HOME/.bashrc" "$HOME/.bash_profile")
    for RC_FILE in "${RC_CANDIDATES[@]}"; do
      [[ -z "$RC_FILE" ]] && continue
      if [[ -f "$RC_FILE" || "$RC_FILE" == "$HOME/.zshrc" ]]; then
        if ! grep -qF "$NPM_BIN" "$RC_FILE" 2>/dev/null; then
          { echo ''; echo '# Added by age-vault installer'; echo "export PATH=\"$NPM_BIN:\$PATH\""; } >> "$RC_FILE"
          ok "Added $NPM_BIN to $RC_FILE"
          ADDED_TO_RC=true
          break
        fi
      fi
    done

    if $ADDED_TO_RC; then
      echo ""
      echo "To use it right now, run:"
      echo "  source ${RC_FILE}"
      echo ""
      echo "Or open a new terminal window/tab."
    else
      warn "$NPM_BIN is already in a shell config file — restart your terminal to use age-vault"
    fi
  fi
else
  if command -v age-vault &>/dev/null; then
    INSTALLED_VERSION="$(age-vault --version 2>/dev/null | sed -E 's/^age-vault v//' || echo "")"
    ok "age-vault ${INSTALLED_VERSION:+v${INSTALLED_VERSION} }installed at $(command -v age-vault)"
  else
    echo ""
    warn "age-vault was installed but could not be found."
    echo "  Restart your terminal and run: age-vault --help"
    echo "  Or run: npx age-vault"
    echo ""
    printf "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"
    printf "${BOLD}${GREEN}  age-vault is installed!${RESET}\n"
    printf "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"
    echo ""
    echo "  Run: age-vault --help"
    echo ""
    exit 0
  fi
fi

# ── Done ─────────────────────────────────────────────────────────────────────

echo ""
printf "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"
printf "${BOLD}${GREEN}  age-vault ${INSTALLED_VERSION:+v${INSTALLED_VERSION} }is ready!${RESET}\n"
printf "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"
echo ""
echo "  Encrypt a file:   age-vault -e <file>"
echo "  Decrypt a file:   age-vault -d <file.age>"
echo "  List encrypted:   age-vault -l"
echo "  Vault status:     age-vault -l --status"
echo ""
if command -v age-vault &>/dev/null; then
  echo "  Run: age-vault --help"
else
  echo "  Run: source ~/.zshrc && age-vault --help"
  echo "  (or open a new terminal)"
fi
echo ""

if [[ -t 0 ]] && ! $SKIP_RUN; then
  printf "${BOLD}Run age-vault --help now? [Y/n]${RESET} "
  read -r response
  response="${response:-Y}"
  if [[ "$response" =~ ^[Yy]$ ]]; then
    exec age-vault --help
  fi
fi