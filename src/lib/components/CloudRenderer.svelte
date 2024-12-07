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
  
          float rand(vec2 n) { 
            return fract(sin(dot(n, vec2(12.9898, 78.233))) * 43758.5453);
          }
  
          float noise(vec2 p) {
            vec2 ip = floor(p);
            vec2 fp = fract(p);
            
            // Smoother interpolation
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
            float freq = 1.0;
            // Fewer octaves for softer clouds
            for(int i = 0; i < 4; i++) {
              sum += amp * noise(p * freq);
              freq *= 2.0;
              amp *= 0.5;
            }
            return sum;
          }
  
          void main() {
            vec2 uv = vPosition.xy;
            
            // Add horizontal movement to UV coordinates
            uv.x += time * 0.1; // Increased time factor for more noticeable movement
            
            // Base cloud pattern
            float f = fbm(uv * 2.0);
            
            // Add some variation with different movement speed
            f += fbm(uv * 4.0 + vec2(time * 0.05, 0.0)) * 0.5;
            
            // Make clouds more distinct
            f = smoothstep(0.3, 0.7, f);
            
            // Add some depth variation
            float depth = fbm(uv * 3.0 + f);
            
            // Cloud color
            vec3 cloudColor = vec3(1.0);
            vec3 skyColor = vec3(0.7, 0.85, 1.0);
            
            // Mix colors based on density
            vec3 finalColor = mix(skyColor, cloudColor, f * depth);
            
            // Adjust opacity for more natural look
            float opacity = f * depth * 0.8;
            
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