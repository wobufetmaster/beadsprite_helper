#!/bin/bash
cd frontend && npm run build && python3 -m http.server -d dist 5800
