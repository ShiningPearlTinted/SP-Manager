import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins:[react()],
  base:"/SP-Manager/",
  build:{
    // Keep the production bundle unminified to avoid the runtime TDZ/mangled
    // variable issue seen in the deployed build. This also makes browser
    // stack traces point back to readable source locations.
    minify:false,
    sourcemap:true
  }
});
