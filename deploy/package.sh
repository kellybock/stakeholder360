#!/bin/bash
set -euo pipefail

# ==============================================================
# Youth360 — Build & Package for S3 Deployment
#
# Creates a deployable .zip and optionally uploads to S3.
# Run this on your local machine (Mac/Linux) before deploying.
#
# Usage:
#   bash deploy/package.sh                          # build zip only
#   bash deploy/package.sh s3://your-bucket/path    # build + upload
# ==============================================================

S3_TARGET="${1:-}"
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_DIR="$APP_DIR/.package-tmp"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ZIP_NAME="youth360-${TIMESTAMP}.zip"
OUT_DIR="$APP_DIR/dist"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[OK]${NC} $1"; }
step() { echo -e "\n${CYAN}=== $1 ===${NC}"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }

cd "$APP_DIR"

# ----------------------------------------------------------
step "1/5 — Installing dependencies"
# ----------------------------------------------------------
npm install 2>&1 | tail -1
log "Dependencies installed"

# ----------------------------------------------------------
step "2/5 — Building production bundle"
# ----------------------------------------------------------
npm run build 2>&1 | tail -3
log "Build complete"

# ----------------------------------------------------------
step "3/5 — Assembling package"
# ----------------------------------------------------------
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/youth360"

# Copy the built app and essentials
cp -r apps "$BUILD_DIR/youth360/"
cp -r packages "$BUILD_DIR/youth360/"
cp -r deploy "$BUILD_DIR/youth360/"
cp -r sample-data "$BUILD_DIR/youth360/" 2>/dev/null || true
cp package.json "$BUILD_DIR/youth360/"
cp package-lock.json "$BUILD_DIR/youth360/" 2>/dev/null || true
cp turbo.json "$BUILD_DIR/youth360/" 2>/dev/null || true

# Copy node_modules (production only)
cp -r node_modules "$BUILD_DIR/youth360/"

# Remove dev files and source maps
find "$BUILD_DIR/youth360" -name "*.map" -delete 2>/dev/null || true
find "$BUILD_DIR/youth360" -name ".env*" -not -name ".env.example" -delete 2>/dev/null || true
rm -rf "$BUILD_DIR/youth360/.git"

log "Package assembled"

# ----------------------------------------------------------
step "4/5 — Creating zip archive"
# ----------------------------------------------------------
mkdir -p "$OUT_DIR"
cd "$BUILD_DIR"
zip -r -q "$OUT_DIR/$ZIP_NAME" youth360/
cd "$APP_DIR"

SIZE=$(du -h "$OUT_DIR/$ZIP_NAME" | cut -f1)
log "Created $OUT_DIR/$ZIP_NAME ($SIZE)"

# Also create a "latest" symlink/copy
cp "$OUT_DIR/$ZIP_NAME" "$OUT_DIR/youth360-latest.zip"
log "Copied as youth360-latest.zip"

# ----------------------------------------------------------
step "5/5 — Upload to S3"
# ----------------------------------------------------------
if [ -n "$S3_TARGET" ]; then
    # Ensure S3 path ends with /
    S3_PATH="${S3_TARGET%/}"

    echo "Uploading to $S3_PATH/..."
    aws s3 cp "$OUT_DIR/$ZIP_NAME" "$S3_PATH/$ZIP_NAME"
    aws s3 cp "$OUT_DIR/$ZIP_NAME" "$S3_PATH/youth360-latest.zip"
    log "Uploaded $ZIP_NAME to S3"
    log "Uploaded youth360-latest.zip to S3"

    # Generate a pre-signed URL (valid 7 days)
    PRESIGNED=$(aws s3 presign "$S3_PATH/youth360-latest.zip" --expires-in 604800 2>/dev/null || echo "")
    if [ -n "$PRESIGNED" ]; then
        echo ""
        echo -e "${CYAN}Pre-signed URL (valid 7 days):${NC}"
        echo "$PRESIGNED"
    fi
else
    warn "No S3 target specified — zip created locally only"
    echo "  To upload: bash deploy/package.sh s3://your-bucket/youth360"
fi

# Cleanup
rm -rf "$BUILD_DIR"

# ----------------------------------------------------------
echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  Package ready: $OUT_DIR/$ZIP_NAME${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "  Deploy on Windows EC2:"
echo "    Option A (S3):  .\\deploy\\setup.ps1 -S3Url \"https://your-bucket.s3.amazonaws.com/youth360-latest.zip\""
echo "    Option B (Git): .\\deploy\\setup.ps1"
echo ""
