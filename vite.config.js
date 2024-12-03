import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	optimizeDeps: {
		include: ['pixi.js']
	},
	ssr: {
		noExternal: ['pixi.js']
	},
	build: {
		rollupOptions: {
		  output: {
			manualChunks: {
			  pixi: ['pixi.js']
			}
		  }
		}
	  },
	server: {
		proxy: {
			'/ws': {
				target: 'ws://localhost:3000',
				ws: true
			}
		}
	}
});
