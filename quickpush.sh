#!/bin/bash

# ============================================================
#  quickpush.sh
#  Jalanin langsung di folder project kamu.
# ============================================================
CUSTOM_REPO_NAME=""
CUSTOM_COMMIT_MSG=""
GIT_EMAIL="276874584+pakcli@users.noreply.github.com"

# ============================================================
#  (jangan edit di bawah ini)
# ============================================================

BRANCH="main"

info()    { echo ""; echo "  ➜  $1"; }
ok()      { echo "  ✅ $1"; }
fail()    { echo ""; echo "  ❌ $1"; echo ""; echo "  Tekan ENTER untuk keluar..."; read -r; exit 1; }
divider() { echo ""; echo "  ────────────────────────────────────────"; }

clear
echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║        QUICKPUSH TO GITHUB           ║"
echo "  ╚══════════════════════════════════════╝"

# ── STEP 1 — cek dir ─────────────────────────────────────────
divider
echo "  [1/5] Checking current directory..."

if [ -n "$CUSTOM_REPO_NAME" ]; then
  REPO_NAME="$CUSTOM_REPO_NAME"
else
  REPO_NAME=$(basename "$PWD")
fi
ok "Working dir: $PWD"
ok "Repo name  : $REPO_NAME"

# ── STEP 2 — cek internet ────────────────────────────────────
divider
echo "  [2/5] Checking internet connection..."

# Gunakan max-time 15s dan opsi -k agar tidak gagal karena SSL cert di Git Bash Windows
if ! curl -s -k --max-time 15 -I https://github.com > /dev/null 2>&1; then
  if ! ping -n 1 8.8.8.8 > /dev/null 2>&1 && ! ping -c 1 8.8.8.8 > /dev/null 2>&1; then
    fail "No internet. Check your network and try again."
  fi
fi
ok "Internet OK — GitHub reachable."

# ── STEP 3 — cek tools + autentikasi ─────────────────────────
divider
echo "  [3/5] Checking tools & GitHub authentication..."

if ! command -v git &>/dev/null; then
  fail "git not installed. Download: https://git-scm.com/"
fi
ok "git found: $(git --version)"

if ! command -v gh &>/dev/null; then
  fail "GitHub CLI not installed. Download: https://cli.github.com/"
fi
ok "gh found: $(gh --version | head -1)"

if gh auth status &>/dev/null 2>&1; then
  GH_USER=$(gh api user -q .login 2>/dev/null)
  ok "Already authenticated as: $GH_USER"
else
  info "Not logged in. Opening browser for GitHub login..."
  echo ""
  gh auth login --web --hostname github.com --git-protocol https
  if ! gh auth status &>/dev/null 2>&1; then
    fail "Authentication failed. Please try again."
  fi
  GH_USER=$(gh api user -q .login 2>/dev/null)
  ok "Authenticated as: $GH_USER"
fi

if [ -n "$CUSTOM_COMMIT_MSG" ]; then
  COMMIT_MSG="$CUSTOM_COMMIT_MSG"
else
  COMMIT_MSG="Quick push to Create New Repo by ${GH_USER:-username}"
fi

# ── STEP 4 — init, commit, push ──────────────────────────────
divider
echo "  [4/5] Pushing to GitHub..."

# Init repo jika belum ada
if [ ! -d ".git" ]; then
  info "Initializing git repo..."
  git init -q
  git checkout -q -b "$BRANCH" 2>/dev/null || true
  ok "Git repo initialized."
else
  ok "Git repo already exists."
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

  if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
    info "Switching to branch $BRANCH..."
    git checkout -q "$BRANCH" 2>/dev/null || git checkout -q -b "$BRANCH"
  fi
fi

# Set git identity pakai noreply email (anti GH007)
GH_NAME=$(gh api user -q .name 2>/dev/null || echo "$GH_USER")
git config user.email "$GIT_EMAIL"
git config user.name "$GH_NAME"
ok "Git identity: $GH_NAME <$GIT_EMAIL>"

# Stage semua file
info "Staging all files..."
git add -A
ok "Files staged."

# Commit
info "Committing: \"$COMMIT_MSG\""
if git diff --cached --quiet; then
  ok "Nothing new to commit — already up to date."
else
  git commit -q -m "$COMMIT_MSG"
  ok "Committed."
fi

# Cek remote
REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")

if [ -z "$REMOTE_URL" ]; then
  info "Setting up GitHub remote..."
  if gh repo view "$GH_USER/$REPO_NAME" &>/dev/null 2>&1; then
    ok "Repo already exists on GitHub. Adding remote..."
    git remote add origin "https://github.com/$GH_USER/$REPO_NAME.git"
  else
    info "Creating new GitHub repo: $REPO_NAME ..."
    gh repo create "$REPO_NAME" --public --source=. --remote=origin
    ok "GitHub repo created."
  fi
else
  ok "Remote already set: $REMOTE_URL"
  DETECTED_REPO=$(basename -s .git "$REMOTE_URL")
  if [ -n "$DETECTED_REPO" ]; then
    REPO_NAME="$DETECTED_REPO"
  fi
fi

# Push
info "Pushing to origin/$BRANCH ..."
git push -u origin "$BRANCH" 2>&1 | sed 's/^/       /'
ok "Push complete."

# ── STEP 5 — enable GitHub Pages ─────────────────────────────
divider
echo "  [5/5] Enabling GitHub Pages..."

HTTP_STATUS=$(gh api \
  --method POST \
  -H "Accept: application/vnd.github+json" \
  "/repos/$GH_USER/$REPO_NAME/pages" \
  -f "source[branch]=$BRANCH" \
  -f "source[path]=/" \
  --silent \
  -w "%{http_code}" \
  2>/dev/null || echo "err")

if [ "$HTTP_STATUS" = "201" ]; then
  ok "GitHub Pages enabled."
elif [ "$HTTP_STATUS" = "409" ] || [ "$HTTP_STATUS" = "422" ]; then
  ok "GitHub Pages already enabled."
else
  gh api \
    --method PUT \
    -H "Accept: application/vnd.github+json" \
    "/repos/$GH_USER/$REPO_NAME/pages" \
    -f "source[branch]=$BRANCH" \
    -f "source[path]=/" > /dev/null 2>&1 \
  && ok "GitHub Pages configured." \
  || echo "  ⚠️  Pages: enable manually at https://github.com/$GH_USER/$REPO_NAME/settings/pages"
fi

# ── DONE ─────────────────────────────────────────────────────
echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║             ALL DONE! 🎉             ║"
echo "  ╚══════════════════════════════════════╝"
echo ""
echo "  🔗 GitHub Repo  : https://github.com/$GH_USER/$REPO_NAME"
echo "  🌐 GitHub Pages : https://$GH_USER.github.io/$REPO_NAME"
echo ""
echo "  ⏳ Pages URL live dalam ~1–2 menit."
echo ""
