## TechPack PDF Export Runbook

### Environment Variables

| Variable | Description | Default |
| --- | --- | --- |
| `PDF_TMP_DIR` | Directory for generated PDF files | OS temp dir `/tmp/techpack-pdf` |
| `PDF_CONCURRENCY` | Max concurrent Puppeteer jobs | `3` |
| `PDF_TIMEOUT` | Job timeout (ms) | `60000` |
| `PDF_CACHE_TTL` | Cache TTL (seconds) | `21600` |
| `PDF_IMAGE_CACHE_TTL` | Resized image cache TTL (seconds) | `3600` |

### Dependencies

- Chromium (bundled with `puppeteer`). Ensure server allows `--no-sandbox`.
- System packages for `sharp` (`libvips` on Linux). Install via `apt-get install libvips`.

### Operational Tasks

#### 1. Restart Stuck Browser

```
npm run build
pm2 restart techpacker-api
```

If memory leak suspected, call `pdfService.closeBrowser()` in a REPL or restart process.

#### 2. Clean Temp Directory

```
find ${PDF_TMP_DIR:-/tmp/techpack-pdf} -type f -mmin +1440 -delete
```

Schedule via cron (`PDF_TMP_MAX_AGE` guidance).

#### 3. Clear Redis Cache

```
redis-cli KEYS "pdf:techpack:*" | xargs redis-cli DEL
```

#### 4. Monitor Metrics

- Queue length (`pdfService.queue.size`).
- Generation duration (logs labelled `PDF_EXPORT`).
- Failure rate (look for `PDF generation failed`).
- Memory usage of Node process (Puppeteer heavy).

### Troubleshooting

| Issue | Symptoms | Resolution |
| --- | --- | --- |
| `PUPPETEER_ERROR` | Timeout or blank PDF | Increase `PDF_TIMEOUT`, check Chromium availability |
| `TEMPLATE_ERROR` | EJS render fails | Run `npm run lint`, ensure template data shape |
| Missing images | Placeholders appear | Verify asset URLs reachable, private CDN credentials |
| Memory pressure | OOM / crash | Reduce `PDF_CONCURRENCY`, ensure tmp cleanup |

### Verification Checklist

- Header/footer show correct metadata and `Page X of Y`.
- Cover page summary matches TechPack counts.
- BOM table repeats header on new pages.
- Measurement rows not truncated; groups highlighted.
- Image sheet renders 4-column thumbnails.
- How-to-measure diagrams sized ~350px, no splits.
- Notes and care symbols on final pages.

### Deployment Notes

- Run `npm install` to pull new dependencies (`sharp`, `p-queue`, `node-cache`, `dayjs`).
- Ensure environment allows outbound HTTP for image fetching.
- After deployment, trigger `/api/techpacks/:id/pdf/info` for smoke test.
- Document any non-default env overrides in Ops wiki.

