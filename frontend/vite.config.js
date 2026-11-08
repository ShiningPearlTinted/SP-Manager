import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins:[react()],
  // Hostinger (apps.shiningpearltinted.com) serves the app at the root; the GitHub Pages workflow sets SP_BASE=/SP-Manager/.
  base:process.env.SP_BASE||"/",
  build:{
    rollupOptions:{input:{main:"./index.html",customerDisplay:"./customer-display/index.html"}},
    emptyOutDir:true,
    minify:true,
    sourcemap:false
  }
});
