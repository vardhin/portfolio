<script>
    import { onMount } from 'svelte';
    import * as THREE from 'three';
  
    let container;
  
    onMount(() => {
      // Scene setup
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xADD8E6);
  
      // Use orthographic camera instead of perspective
      const frustumSize = 2;
      const aspect = window.innerWidth / window.innerHeight;
      const camera = new THREE.OrthographicCamera(
          frustumSize * aspect / -2,
          frustumSize * aspect / 2,
          frustumSize / 2,
          frustumSize / -2,
          0.1,
          1000
      );
  
      const renderer = new THREE.WebGLRenderer();
      renderer.setSize(window.innerWidth, window.innerHeight);
      container.appendChild(renderer.domElement);
  
      // Create volumetric fog material
      const fogTexture = new THREE.Data3DTexture(
        new Uint8Array(64 * 64 * 64).map(() => Math.random() * 155 + 100),
        64, 64, 64
      );
      fogTexture.format = THREE.RedFormat;
      fogTexture.minFilter = THREE.LinearFilter;
      fogTexture.magFilter = THREE.LinearFilter;
      fogTexture.unpackAlignment = 1;
      fogTexture.needsUpdate = true;
  
      const fogMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          fogTexture: { value: fogTexture },
          resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
        },
        vertexShader: `
          varying vec3 vPosition;
          varying vec2 vUv;
          void main() {
            vPosition = position;
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float time;
          uniform vec2 resolution;
          varying vec3 vPosition;
          varying vec2 vUv;
  
          float rand(vec2 n) { 
            return fract(sin(dot(n, vec2(12.9898, 78.233))) * 43758.5453);
          }
  
          float noise(vec2 p) {
            vec2 ip = floor(p);
            vec2 fp = fract(p);
            fp = fp * fp * (3.0 - 2.0 * fp);
            
            float a = rand(ip);
            float b = rand(ip + vec2(1.0, 0.0));
            float c = rand(ip + vec2(0.0, 1.0));
            float d = rand(ip + vec2(1.0, 1.0));
  
            return mix(
              mix(a, b, fp.x),
              mix(c, d, fp.x),
              fp.y
            );
          }
  
          float fbm(vec2 p) {
            float sum = 0.0;
            float amp = 1.0;
            float freq = 1.2;
            for(int i = 0; i < 6; i++) {
              sum += amp * noise(p * freq);
              freq *= 1.8;
              amp *= 0.5;
            }
            return sum;
          }
  
          void main() {
            vec2 moveUV = vPosition.xy;
            
            moveUV -= vec2(time * 0.08, 0.0);
            
            moveUV *= 1.2;
            
            float baseLayer = fbm(moveUV * 1.3);
            float detailLayer = fbm(moveUV * 1.8) * 0.25;
            float heightLayer = fbm(moveUV * 1.5) * 0.15;
            
            float f = baseLayer * 0.8 + detailLayer + heightLayer;
            
            f = smoothstep(0.57, 0.64, f);
            
            float sparsityNoise = fbm(moveUV * 1.1);
            f *= step(0.48, sparsityNoise);
            
            float secondarySparsity = fbm(moveUV * 0.8);
            f *= smoothstep(0.45, 0.65, secondarySparsity);
            
            vec3 cloudBright = vec3(1.0, 1.0, 1.0);
            vec3 cloudDark = vec3(0.8, 0.8, 0.85);
            vec3 skyColor = vec3(0.6, 0.8, 1.0);
            
            float lightInfluence = fbm(moveUV * 0.8 + vec2(time * 0.02, 0.0));
            vec3 cloudColor = mix(cloudDark, cloudBright, lightInfluence);
            
            float depth = fbm(moveUV * 1.5 + f);
            float depthInfluence = smoothstep(0.3, 0.7, depth);
            cloudColor = mix(cloudColor, cloudDark, depthInfluence * 0.3);
            
            vec3 finalColor = mix(skyColor, cloudColor, f * depth);
            float opacity = f * depth * 0.8;
            
            opacity *= smoothstep(0.0, 0.1, 1.0 - length(vUv * 2.0 - 1.0));
            
            gl_FragColor = vec4(finalColor, opacity);
          }
        `,
        transparent: true,
      });
  
      // Create a plane that covers the entire view
      const planeGeometry = new THREE.PlaneGeometry(10, 10);
      const fogPlane = new THREE.Mesh(planeGeometry, fogMaterial);
      fogPlane.position.z = -5;
      scene.add(fogPlane);
  
      // Position camera
      camera.position.z = 5;
  
      // Update resize handler for orthographic camera
      const handleResize = () => {
        const aspect = window.innerWidth / window.innerHeight;
        camera.left = frustumSize * aspect / -2;
        camera.right = frustumSize * aspect / 2;
        camera.top = frustumSize / 2;
        camera.bottom = frustumSize / -2;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener('resize', handleResize);
  
      // Animation loop
      let time = 0;
      const animate = () => {
        requestAnimationFrame(animate);
        time += 0.01; // Increased from 0.001 for faster movement
        fogMaterial.uniforms.time.value = time;
        renderer.render(scene, camera);
      };
      animate();
  
      // Cleanup
      return () => {
        window.removeEventListener('resize', handleResize);
        container.removeChild(renderer.domElement);
      };
    });
  </script>
  
  <div bind:this={container} />
  
  <style>
    div {
      width: 100%;
      height: 100vh;
      margin: 0;
      padding: 0;
      overflow: hidden;
    }
  </style>