#!/bin/sh
# zeta-lane-tree: enough smart HTTP for a single-pack repo. No git binary.
#
# Argo CD's LsRemote uses go-git, which does not speak dumb HTTP. A static
# file server (busybox httpd) 200s GET info/refs?service=git-upload-pack with
# the dumb refs body; go-git parses pkt-line and dies
# "failed to list refs: unexpected EOF" (MEASURED 33824995558; also
# argoproj/argo-cd#17267). Git CLI falls back; go-git does not.
#
# 404 on that probe is also wrong: git 2.43 treats 404 as "repository not
# found" and never falls back. This script answers the probe with a pkt-line
# advertisement and POST /git-upload-pack with NAK plus the one pack
# `buildBareRepo` already built. One branch, one pack, no thin-pack, no
# side-band — the clone git 2.43.0 accepted against this protocol.
#
# argv: "listen" binds and loops; nc -e re-enters with no args to handle
# one request on stdin/stdout.

PORT=8080
ROOT=/srv/tree.git

if [ "${1:-}" = "listen" ]; then
  while true; do
    nc -l -p "$PORT" -e "$0" || true
  done
fi

CR=$(printf '\r')
IFS= read -r request || exit 0
request="${request%"$CR"}"
method="${request%% *}"
rest="${request#* }"
url="${rest%% *}"
path="${url%%\?*}"
case "$url" in
  *\?*) query="${url#*\?}" ;;
  *) query="" ;;
esac

content_length=0
while IFS= read -r line; do
  line="${line%"$CR"}"
  [ -z "$line" ] && break
  case "$line" in
    [Cc]ontent-[Ll]ength:*)
      content_length=${line#*:}
      content_length=$(printf '%s' "$content_length" | tr -d ' \t')
      ;;
  esac
done

drain_body() {
  if [ "$content_length" -gt 0 ] 2>/dev/null; then
    dd bs=1 count="$content_length" >/dev/null 2>&1
  fi
}

reply_text() {
  code=$1
  reason=$2
  ctype=$3
  body=$4
  len=$(printf '%s' "$body" | wc -c | tr -d ' \t\n')
  printf 'HTTP/1.0 %s %s\r\nContent-Type: %s\r\nContent-Length: %s\r\nConnection: close\r\n\r\n' \
    "$code" "$reason" "$ctype" "$len"
  printf '%s' "$body"
}

pkt_file() {
  f=$1
  len=$(wc -c < "$f" | tr -d ' \t\n')
  tot=$((len + 4))
  printf '%04x' "$tot"
  cat "$f"
}

case "$query" in
  *service=git-upload-pack*)
    if [ ! -f "$ROOT/info/refs" ]; then
      reply_text 404 "Not Found" "text/plain" "no refs"
      exit 0
    fi
    read -r sha _unused < "$ROOT/info/refs"
    tmpd=/tmp/zeta-adv.$$
    mkdir -p "$tmpd"
    printf '# service=git-upload-pack\n' > "$tmpd/banner"
    printf '%s HEAD\0symref=HEAD:refs/heads/main agent=zeta-lane-tree\n' "$sha" > "$tmpd/head"
    printf '%s refs/heads/main\n' "$sha" > "$tmpd/main"
    {
      pkt_file "$tmpd/banner"
      printf '0000'
      pkt_file "$tmpd/head"
      pkt_file "$tmpd/main"
      printf '0000'
    } > "$tmpd/body"
    len=$(wc -c < "$tmpd/body" | tr -d ' \t\n')
    printf 'HTTP/1.0 200 OK\r\nContent-Type: application/x-git-upload-pack-advertisement\r\nCache-Control: no-cache\r\nContent-Length: %s\r\nConnection: close\r\n\r\n' "$len"
    cat "$tmpd/body"
    rm -rf "$tmpd"
    exit 0
    ;;
esac

case "$method:$path" in
  POST:/tree.git/git-upload-pack)
    drain_body
    pack=
    for f in "$ROOT"/objects/pack/*.pack; do
      if [ -f "$f" ]; then
        pack=$f
        break
      fi
    done
    if [ -z "$pack" ]; then
      reply_text 500 "Internal Server Error" "text/plain" "no pack"
      exit 0
    fi
    pack_size=$(wc -c < "$pack" | tr -d ' \t\n')
    # pkt("NAK\n") is 0008NAK\n (4 bytes payload + 4 length)
    total=$((8 + pack_size))
    printf 'HTTP/1.0 200 OK\r\nContent-Type: application/x-git-upload-pack-result\r\nCache-Control: no-cache\r\nContent-Length: %s\r\nConnection: close\r\n\r\n' "$total"
    printf '0008NAK\n'
    cat "$pack"
    exit 0
    ;;
esac

case "$method" in
  GET|HEAD) ;;
  *)
    reply_text 405 "Method Not Allowed" "text/plain" "method not allowed"
    exit 0
    ;;
esac

case "$path" in
  *..*|*" "*)
    reply_text 400 "Bad Request" "text/plain" "bad path"
    exit 0
    ;;
  /tree.git/*|/tree.git)
    file="/srv${path}"
    ;;
  *)
    reply_text 404 "Not Found" "text/plain" "not found"
    exit 0
    ;;
esac

if [ ! -f "$file" ] || [ ! -r "$file" ]; then
  reply_text 404 "Not Found" "text/plain" "not found"
  exit 0
fi

case "$path" in
  */info/refs|*/HEAD|*/objects/info/*) ctype="text/plain" ;;
  *.pack) ctype="application/x-git-packed-objects" ;;
  *.idx) ctype="application/x-git-packed-objects-toc" ;;
  *) ctype="application/octet-stream" ;;
esac

size=$(wc -c < "$file" | tr -d ' \t\n')
printf 'HTTP/1.0 200 OK\r\nContent-Type: %s\r\nContent-Length: %s\r\nConnection: close\r\n\r\n' \
  "$ctype" "$size"
if [ "$method" = "HEAD" ]; then
  exit 0
fi
cat "$file"
