from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import urllib.request
import sys

class ProxyHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        body = self.rfile.read(content_length)
        auth_header = self.headers.get('Authorization')

        # Forward the request to Venice.ai
        req = urllib.request.Request(
            f'https://api.venice.ai/api/v1{self.path}',
            data=body,
            headers={
                'Content-Type': 'application/json',
                'Authorization': auth_header
            },
            method='POST'
        )

        try:
            with urllib.request.urlopen(req) as response:
                self.send_response(response.status)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(response.read())
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(e.read())

port = 8001
print(f"Starting proxy server on port {port}...")
httpd = HTTPServer(('localhost', port), ProxyHandler)
httpd.serve_forever() 