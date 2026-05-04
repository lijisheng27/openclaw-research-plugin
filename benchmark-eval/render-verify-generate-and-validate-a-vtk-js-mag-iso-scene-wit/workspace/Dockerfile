FROM mcr.microsoft.com/playwright:v1.54.0-noble
WORKDIR /opt/render-verify
COPY package.json package.json
RUN npm install --no-fund --no-audit
COPY . .
CMD ["bash", "-lc", "mkdir -p /workspace && cp -R /opt/render-verify/. /workspace && cd /workspace && node generated/render-verify.mjs"]
