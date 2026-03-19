from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import os
os.chdir(r"C:\Users\SKIKK\Documents\websites\Playground\projects\diesign\dist")
ThreadingHTTPServer(("127.0.0.1", 9012), SimpleHTTPRequestHandler).serve_forever()
