# SP-Manager V13 — GitHub Pages Deployment

This build fixes the Price Tags `settings is not defined` error in the source and adds a deployment verification step so GitHub Pages cannot publish an unbuilt frontend artifact.

## Upload
1. Extract this ZIP.
2. Upload the **contents** to the root of `ShiningPearlTinted/SP-Manager`.
3. Commit/push to the `main` branch.
4. GitHub → Settings → Pages → Source must be **GitHub Actions**.
5. Open Actions → **Deploy SP-Manager Pages**. The run must finish with a green check.
6. Only after the workflow succeeds, open `https://shiningpearltinted.github.io/SP-Manager/`.

The workflow now runs `npm ci`, `npm run build`, verifies the Vite `dist` output, and then uploads `frontend/dist` to GitHub Pages. This is the recommended Vite/GitHub Pages deployment flow.

## Browser refresh
After the workflow is green, use Chrome DevTools → Application → Storage → **Clear site data**, then **Ctrl+Shift+R**.

## Important
The browser must show **SP-Manager V13** in the Price Tags toolbar. If it still shows an older version or an older `assets/index-*.js` filename, the old GitHub Pages deployment is still being served.
