#!/usr/bin/env python3
"""ZetaFS / DagFs — v0 Mac filesystem, via loopback WebDAV (no kext, no signing).

A faithful, read-only demo of DagFs semantics (src/Core/DagFs.fs) as a *mountable*
macOS filesystem: paths map to CONTENT ADDRESSES, so identical content under N paths
is ONE stored node (dedup / single-instance), and a node can live under many paths at
once (multi-parent — hardlink/git-blob shaped). macOS mounts this with its built-in
WebDAV client (`mount_webdav`); this process is the userspace server.

This is a *play* v0. Read-only. Nothing persists. Step 2 = swap the in-proc store for
the real F# DagFs core over localhost. Step 3 = FSKit native (once signing is set up).
"""
import hashlib, socketserver, sys, datetime, urllib.parse
from http.server import BaseHTTPRequestHandler

# ---- DagFs core (faithful to DagFs.fs: a ContentStore + a path->hash links map) ----
class DagFs:
    def __init__(self):
        self.store: dict[str, bytes] = {}   # ContentStore: merkle-hash -> content (dedup)
        self.links: dict[str, str] = {}     # links: path -> content address

    def _hash(self, b: bytes) -> str:
        return hashlib.sha256(b).hexdigest()

    def link(self, path: str, content: bytes):
        """DagFs.link: store content (dedup), point path at its address."""
        h = self._hash(content)
        self.store[h] = content            # put: identical content collapses to one node
        self.links[path.rstrip("/")] = h

    def resolve(self, path: str) -> bytes | None:
        h = self.links.get(path.rstrip("/"))
        return self.store.get(h) if h else None

    # --- directory synthesis (paths imply their parent dirs) ---
    def is_dir(self, path: str) -> bool:
        base = path.strip("/")
        if base == "":
            return True
        pref = "/" + base + "/"
        return any(k.startswith(pref) for k in self.links)

    def is_file(self, path: str) -> bool:
        return ("/" + path.strip("/")) in self.links

    def children(self, path: str):
        """Immediate children (dirs, files) of a directory path."""
        base = path.strip("/")
        pref = ("/" + base + "/") if base else "/"
        dirs, files = set(), set()
        for k in self.links:
            if not k.startswith(pref):
                continue
            rest = k[len(pref):]
            if "/" in rest:
                dirs.add(rest.split("/", 1)[0])
            else:
                files.add(rest)
        return sorted(dirs), sorted(files)

    def stats(self):
        return len(self.links), len(self.store)  # (paths, unique content nodes)

fs = DagFs()

# ---- seed: content that SHOWS the DagFs magic (dedup + multi-parent) ----
readme = b"ZetaFS v0 on macOS via WebDAV.\nContent-addressed, deduplicated, multi-parent.\n"
shared = b"I am one stored node living under many paths (multi-parent / hardlink-shaped).\n"
fs.link("/readme.txt", readme)
fs.link("/docs/readme.txt", readme)          # SAME content as /readme.txt -> DEDUP: one node, two paths
fs.link("/projects/a/shared.bin", shared)    # \
fs.link("/projects/b/shared.bin", shared)    #  > SAME content, three paths -> ONE node (multi-parent)
fs.link("/projects/c/also-shared.bin", shared)  # /
fs.link("/unique.txt", b"A one-off file with its own content address.\n")
_paths, _nodes = fs.stats()
proof = (f"ZetaFS DagFs proof:\n  {_paths} paths point at {_nodes} unique content nodes.\n"
         f"  ({_paths - _nodes} paths deduplicated away — same content, shared node.)\n").encode()
fs.link("/_zetafs_proof.txt", proof)

# ---- WebDAV (read-only: OPTIONS, PROPFIND, GET, HEAD) ----
NS = 'xmlns:D="DAV:"'
def httpdate(dt=None):
    return (dt or datetime.datetime.now(datetime.timezone.utc)).strftime("%a, %d %b %Y %H:%M:%S GMT")

class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    def log_message(self, *a): pass  # quiet

    def _path(self):
        return urllib.parse.unquote(self.path.split("?", 1)[0])

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("DAV", "1, 2")
        self.send_header("Allow", "OPTIONS, GET, HEAD, PROPFIND")
        self.send_header("MS-Author-Via", "DAV")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def _propstat_file(self, href, size):
        return (f'<D:response><D:href>{href}</D:href><D:propstat><D:prop>'
                f'<D:resourcetype/><D:getcontentlength>{size}</D:getcontentlength>'
                f'<D:getlastmodified>{httpdate()}</D:getlastmodified>'
                f'<D:getcontenttype>application/octet-stream</D:getcontenttype>'
                f'</D:prop><D:status>HTTP/1.1 200 OK</D:status></D:propstat></D:response>')

    def _propstat_dir(self, href):
        if not href.endswith("/"):
            href += "/"
        return (f'<D:response><D:href>{href}</D:href><D:propstat><D:prop>'
                f'<D:resourcetype><D:collection/></D:resourcetype>'
                f'<D:getlastmodified>{httpdate()}</D:getlastmodified>'
                f'</D:prop><D:status>HTTP/1.1 200 OK</D:status></D:propstat></D:response>')

    def do_PROPFIND(self):
        p = self._path()
        depth = self.headers.get("Depth", "1")
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length: self.rfile.read(length)  # ignore request body
        except Exception:
            pass
        base = p.rstrip("/") or ""
        responses = []
        if fs.is_file(base):
            responses.append(self._propstat_file(urllib.parse.quote(base), len(fs.resolve(base))))
        elif base == "" or fs.is_dir(base):
            hrefdir = (base + "/") if base else "/"
            responses.append(self._propstat_dir(urllib.parse.quote(hrefdir)))
            if depth != "0":
                dirs, files = fs.children(base)
                for d in dirs:
                    responses.append(self._propstat_dir(urllib.parse.quote(f"{base}/{d}/" if base else f"/{d}/")))
                for f_ in files:
                    fp = f"{base}/{f_}" if base else f"/{f_}"
                    responses.append(self._propstat_file(urllib.parse.quote(fp), len(fs.resolve(fp))))
        else:
            self.send_error(404); return
        body = (f'<?xml version="1.0" encoding="utf-8"?><D:multistatus {NS}>'
                + "".join(responses) + '</D:multistatus>').encode()
        self.send_response(207, "Multi-Status")
        self.send_header("Content-Type", 'application/xml; charset="utf-8"')
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        content = fs.resolve(self._path())
        if content is None:
            self.send_error(404); return
        self.send_response(200)
        self.send_header("Content-Type", "application/octet-stream")
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Last-Modified", httpdate())
        self.end_headers()
        self.wfile.write(content)

    def do_HEAD(self):
        content = fs.resolve(self._path())
        if content is None:
            self.send_error(404); return
        self.send_response(200)
        self.send_header("Content-Type", "application/octet-stream")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()

class Server(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8787
    import http.server
    httpd = Server(("127.0.0.1", port), Handler)
    p, n = fs.stats()
    print(f"ZetaFS/DagFs WebDAV v0 on http://127.0.0.1:{port}/  ({p} paths, {n} unique nodes)")
    httpd.serve_forever()
