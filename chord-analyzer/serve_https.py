import http.server
import ssl
import os

PORT = 8000
CERT_FILE = "cert.pem"
KEY_FILE = "key.pem"

if not os.path.exists(CERT_FILE) or not os.path.exists(KEY_FILE):
    print("Error: cert.pem or key.pem not found. Run openssl to generate them first.")
    exit(1)

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS and secure headers
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

httpd = http.server.HTTPServer(('0.0.0.0', PORT), MyHandler)

# Wrap the socket with SSL
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain(certfile=CERT_FILE, keyfile=KEY_FILE)
httpd.socket = context.wrap_socket(httpd.socket, server_side=True)

print(f"Server läuft auf https://localhost:{PORT}")
print("WICHTIG: Auf dem iPhone musst du die Warnung 'Verbindung ist nicht privat' überspringen (auf 'Details' und dann 'Webseite trotzdem besuchen' klicken).")
httpd.serve_forever()
