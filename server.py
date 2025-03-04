from http.server import HTTPServer, SimpleHTTPRequestHandler
import sys
from functools import partial

class CORSRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        SimpleHTTPRequestHandler.end_headers(self)

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

port = 8000
print(f"Starting server on port {port}...")
print(f"Open http://localhost:{port} in your browser")
handler = partial(CORSRequestHandler, directory=".")
httpd = HTTPServer(('localhost', port), handler)
httpd.serve_forever() 