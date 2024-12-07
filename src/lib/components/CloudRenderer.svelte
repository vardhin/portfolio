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
        new Uint8Array(64 * 64 * 64).map(() => Math.random() * 255),
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
        },
        vertexShader: `
          varying vec3 vPosition;
          void main() {
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float time;
          uniform sampler3D fogTexture;
          varying vec3 vPosition;
  
          // Improved noise functions
          float rand(vec2 n) { 
            return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
          }
  
          float noise(vec2 p) {
            vec2 ip = floor(p);
            vec2 u = fract(p);
            u = u*u*(3.0-2.0*u);
            
            float res = mix(
              mix(rand(ip), rand(ip+vec2(1.0,0.0)), u.x),
              mix(rand(ip+vec2(0.0,1.0)), rand(ip+vec2(1.0,1.0)), u.x), u.y);
            return res*res;
          }
  
          float fbm(vec2 x) {
            float v = 0.0;
            float a = 0.5;
            vec2 shift = vec2(100);
            mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
            
            for (int i = 0; i < 5; ++i) {
              v += a * noise(x);
              x = rot * x * 2.0 + shift + time * 0.1;
              a *= 0.5;
            }
            return v;
          }
  
          void main() {
            vec3 samplePos = vPosition * 0.5 + 0.5;
            
            vec2 p = samplePos.xy * 4.0;
            p.x += time * 0.2;
            
            float noise1 = fbm(p);
            float noise2 = fbm(p + vec2(5.2, 1.3));
            
            vec2 q = vec2(
              noise1 + 0.5 * time,
              noise2 + 0.5 * time
            );
            
            float finalNoise = fbm(p + 4.0 * q);
            
            vec3 fogSamplePos = vec3(
              samplePos.x + finalNoise * 0.3,
              samplePos.y + noise1 * 0.2,
              samplePos.z + noise2 * 0.2
            );
            
            float baseDensity = texture(fogTexture, fogSamplePos).r;
            float density = baseDensity * finalNoise;
            
            density = smoothstep(0.2, 0.6, density);
            
            // More dramatic color scheme
            vec3 fogColor = vec3(0.95, 0.9, 1.0);  // Base color with slight purple tint
            
            // Add stronger purple and pink tints
            vec3 tint1 = vec3(0.6, 0.2, 0.8);  // Deep purple
            vec3 tint2 = vec3(0.8, 0.3, 0.6);  // Pink-purple
            
            fogColor = mix(fogColor, tint1, finalNoise * 0.6);
            fogColor = mix(fogColor, tint2, noise1 * 0.4);
            
            gl_FragColor = vec4(fogColor, density * 0.7);  // Increased opacity for better visibility
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
        time += 0.003; // Slower time increment for smoother motion
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