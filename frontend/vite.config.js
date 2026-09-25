import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins:[react()],
  base:"/SP-Manager/",
  build:{
    rollupOptions:{input:{main:"./index.html",customerDisplay:"./customer-display/index.html"}},
    minify:false,
    sourcemap:true
  }
});
