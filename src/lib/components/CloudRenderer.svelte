<script>
    import { onMount } from 'svelte';
    import * as THREE from 'three';
  
    let container;
  
    onMount(() => {
      // Scene setup
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xADD8E6);
  
      // Adjust frustum size to match screen proportions
      const frustumSize = 10;  // Increased from 2 to cover more area
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
          seed: { value: Math.random() * 100.0 },
          fogTexture: { value: fogTexture },
          resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
          sunPosition: { value: new THREE.Vector2(0.3, 0.0) }
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
          uniform float seed;
          uniform vec2 resolution;
          uniform vec2 sunPosition;
          varying vec3 vPosition;
          varying vec2 vUv;
  
          float rand(vec2 n) { 
            return fract(sin(dot(n, vec2(12.9898, 78.233)) + seed) * 43758.5453);
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
            
            moveUV *= 0.4;
            
            float baseLayer = fbm(moveUV * 0.8);
            float detailLayer = fbm(moveUV * 1.2) * 0.35;
            float heightLayer = fbm(moveUV * 0.9) * 0.25;
            
            float f = baseLayer * 0.75 + detailLayer + heightLayer;
            
            f = smoothstep(0.45, 0.75, f);
            
            float sparsityNoise = fbm(moveUV * 0.6);
            f *= smoothstep(0.35, 0.65, sparsityNoise);
            
            float secondarySparsity = fbm(moveUV * 0.4);
            f *= smoothstep(0.3, 0.8, secondarySparsity);
            
            vec3 cloudBright = vec3(1.0, 1.0, 1.0);
            vec3 cloudDark = vec3(0.8, 0.8, 0.85);
            vec3 skyColor = vec3(0.6, 0.8, 1.0);
            
            float lightInfluence = fbm(moveUV * 0.8 + vec2(time * 0.02, 0.0));
            vec3 cloudColor = mix(cloudDark, cloudBright, lightInfluence);
            
            float depth = fbm(moveUV * 1.5 + f);
            float depthInfluence = smoothstep(0.3, 0.7, depth);
            cloudColor = mix(cloudColor, cloudDark, depthInfluence * 0.3);
            
            vec2 sunUV = vUv * 2.0 - 1.0;
            sunUV.x *= resolution.x / resolution.y;
            float sunDistance = length(sunUV - sunPosition * vec2(resolution.x / resolution.y, 1.0));
            
            float sunGlow = 1.0 - smoothstep(0.0, 0.45, sunDistance);
            float sunCore = 1.0 - smoothstep(0.0, 0.18, sunDistance);
            float sunDisk = 1.0 - smoothstep(0.1, 0.11, sunDistance);
            
            // Calculate cloud opacity first
            float cloudOpacity = f * depth;
            
            // Base sky color with subtle glow
            vec3 baseColor = skyColor;
            
            // Increased threshold for sun visibility through clouds
            if (cloudOpacity < 0.6) {  // Increased from 0.3 to allow more visibility through clouds
                vec3 sunColor = mix(
                    vec3(1.0, 0.95, 0.85),
                    vec3(1.0, 0.6, 0.2),
                    sunDistance
                );
                
                vec3 sunFinal = mix(
                    sunColor * 1.5,
                    vec3(1.8, 1.75, 1.7),
                    sunDisk
                );
                
                // Smoother transition through clouds
                float clearSkyFactor = 1.0 - (cloudOpacity * 1.67);  // Adjusted from 3.33 for gentler falloff
                baseColor = mix(baseColor, sunFinal, sunDisk * clearSkyFactor);
                baseColor = mix(baseColor, sunColor, sunGlow * clearSkyFactor * 0.8);
            }
            
            // Increased glow through clouds
            float throughCloudGlow = sunGlow * 0.3 * (1.0 - cloudOpacity);  // Increased from 0.15
            
            // Final color blending
            vec3 finalColor = mix(baseColor, cloudColor, cloudOpacity);
            finalColor += vec3(1.0, 0.9, 0.8) * throughCloudGlow;  // Subtle warm glow
            
            gl_FragColor = vec4(finalColor, max(cloudOpacity, sunDisk * (1.0 - cloudOpacity)));
          }
        `,
        transparent: true,
      });
  
      // Create a plane that matches the camera frustum
      const planeGeometry = new THREE.PlaneGeometry(
          frustumSize * aspect,
          frustumSize
      );
      const fogPlane = new THREE.Mesh(planeGeometry, fogMaterial);
      fogPlane.position.z = -5;
      scene.add(fogPlane);
  
      // Position camera
      camera.position.z = 5;
  
      // Update resize handler
      const handleResize = () => {
        const aspect = window.innerWidth / window.innerHeight;
        camera.left = frustumSize * aspect / -2;
        camera.right = frustumSize * aspect / 2;
        camera.top = frustumSize / 2;
        camera.bottom = frustumSize / -2;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        fogMaterial.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
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
  
      // Add mouse interaction handling
      let isDragging = false;
      const mouse = new THREE.Vector2();
      
      // Update mouse position calculation
      const updateMousePosition = (event) => {
          const rect = container.getBoundingClientRect();
          const aspect = rect.width / rect.height;
          
          // Map to scene coordinates with aspect ratio correction
          const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
          
          mouse.x = x * aspect;
          mouse.y = y;
      };

      const onMouseDown = (event) => {
          updateMousePosition(event);
          const sunPos = fogMaterial.uniforms.sunPosition.value;
          const aspect = container.clientWidth / container.clientHeight;
          
          const distance = Math.sqrt(
              Math.pow((mouse.x - sunPos.x * aspect), 2) + 
              Math.pow(mouse.y - sunPos.y, 2)
          );
          
          if (distance < 0.45) {
              isDragging = true;
          }
      };

      const onMouseMove = (event) => {
          if (isDragging) {
              updateMousePosition(event);
              const aspect = container.clientWidth / container.clientHeight;
              fogMaterial.uniforms.sunPosition.value.set(mouse.x / aspect, mouse.y);
          }
      };

      const onMouseUp = () => {
          isDragging = false;
      };

      container.addEventListener('mousedown', onMouseDown);
      container.addEventListener('mousemove', onMouseMove);
      container.addEventListener('mouseup', onMouseUp);
      container.addEventListener('mouseleave', onMouseUp);
  
      // Cleanup
      return () => {
        window.removeEventListener('resize', handleResize);
        container.removeEventListener('mousedown', onMouseDown);
        container.removeEventListener('mousemove', onMouseMove);
        container.removeEventListener('mouseup', onMouseUp);
        container.removeEventListener('mouseleave', onMouseUp);
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