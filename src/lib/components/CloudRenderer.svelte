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
  
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
        precision: "highp"
      });
      renderer.setSize(window.innerWidth, window.innerHeight);
      container.appendChild(renderer.domElement);
  
      // Increase texture resolution for better detail
      const textureSize = window.innerWidth > 768 ? 128 : 64;  // Increased from 64/32
      const fogTexture = new THREE.Data3DTexture(
        new Uint8Array(textureSize * textureSize * textureSize).map(() => Math.random() * 155 + 100),
        textureSize, textureSize, textureSize
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
            return fract(sin(dot(n, vec2(12.9898, 4.1414)) + seed) * 43758.5453123);
          }
  
          float noise(vec2 p) {
            vec2 ip = floor(p);
            vec2 fp = fract(p);
            fp = fp * fp * (3.0 - 2.0 * fp);
            
            float n00 = rand(ip);
            float n01 = rand(ip + vec2(0.0, 1.0));
            float n10 = rand(ip + vec2(1.0, 0.0));
            float n11 = rand(ip + vec2(1.0, 1.0));
  
            return mix(
              mix(n00, n10, fp.x),
              mix(n01, n11, fp.x),
              fp.y
            );
          }
  
          float fbm(vec2 p) {
            float sum = 0.0;
            float amp = 0.7;
            float freq = 1.0;
            
            for(int i = 0; i < 4; i++) {
              sum += amp * noise(p * freq);
              freq *= 2.0;
              amp *= 0.5;
            }
            return sum;
          }
  
          void main() {
            vec2 moveUV = vPosition.xy;
            moveUV -= vec2(time * 0.08, 0.0);
            moveUV *= 0.5;
            
            float baseLayer = fbm(moveUV);
            float detailLayer = fbm(moveUV * 1.5) * 0.5;
            
            float f = baseLayer * 1.0 + detailLayer;
            
            f = smoothstep(0.3, 0.6, f);
            
            float sparsityNoise = fbm(moveUV * 0.8);
            f *= smoothstep(0.2, 0.6, sparsityNoise);
            
            float secondarySparsity = fbm(moveUV * 0.6);
            f *= smoothstep(0.2, 0.7, secondarySparsity);
            
            vec3 cloudBright = vec3(1.0, 1.0, 1.0);
            vec3 cloudDark = vec3(0.82, 0.82, 0.9);
            vec3 skyColor = vec3(0.6, 0.75, 1.0);
            
            float lightInfluence = fbm(moveUV * 0.8 + vec2(time * 0.02, 0.0));
            vec3 cloudColor = mix(cloudDark, cloudBright, lightInfluence * 1.2);
            
            float depth = fbm(moveUV * 2.0 + f);
            float depthInfluence = smoothstep(0.2, 0.6, depth);
            cloudColor = mix(cloudColor, cloudDark, depthInfluence * 0.25);
            
            float cloudOpacity = f * depth * 1.5;
            
            vec2 sunUV = vUv * 2.0 - 1.0;
            sunUV.x *= resolution.x / resolution.y;
            float sunDistance = length(sunUV - sunPosition * vec2(resolution.x / resolution.y, 1.0));
            
            float sunGlow = 1.0 - smoothstep(0.0, 0.45, sunDistance);
            float sunCore = 1.0 - smoothstep(0.0, 0.18, sunDistance);
            float sunDisk = 1.0 - smoothstep(0.1, 0.11, sunDistance);
            
            vec3 baseColor = skyColor;
            
            if (cloudOpacity < 0.6) {
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
                
                float clearSkyFactor = 1.0 - (cloudOpacity * 1.67);
                baseColor = mix(baseColor, sunFinal, sunDisk * clearSkyFactor);
                baseColor = mix(baseColor, sunColor, sunGlow * clearSkyFactor * 0.8);
            }
            
            float throughCloudGlow = sunGlow * 0.3 * (1.0 - cloudOpacity);
            
            vec3 finalColor = mix(baseColor, cloudColor, cloudOpacity * 1.2);
            finalColor += vec3(1.0, 0.95, 0.9) * throughCloudGlow * 0.8;
            
            float finalOpacity = max(cloudOpacity, sunDisk * (1.0 - cloudOpacity));
            gl_FragColor = vec4(finalColor, finalOpacity);
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
        const width = window.innerWidth;
        const height = window.innerHeight;
        const aspect = width / height;

        camera.left = frustumSize * aspect / -2;
        camera.right = frustumSize * aspect / 2;
        camera.top = frustumSize / 2;
        camera.bottom = frustumSize / -2;
        camera.updateProjectionMatrix();

        // Force high pixel ratio but cap it for performance
        const pixelRatio = Math.min(window.devicePixelRatio, 2);
        renderer.setPixelRatio(pixelRatio);
        renderer.setSize(width, height);
        
        fogMaterial.uniforms.resolution.value.set(width, height);
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
  
      // Add touch event handling alongside mouse events
      const onTouchStart = (event) => {
        event.preventDefault();
        const touch = event.touches[0];
        updateMousePosition(touch);
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

      const onTouchMove = (event) => {
        event.preventDefault();
        if (isDragging) {
          const touch = event.touches[0];
          updateMousePosition(touch);
          const aspect = container.clientWidth / container.clientHeight;
          fogMaterial.uniforms.sunPosition.value.set(mouse.x / aspect, mouse.y);
        }
      };

      const onTouchEnd = () => {
        isDragging = false;
      };

      // Add touch event listeners
      container.addEventListener('touchstart', onTouchStart, { passive: false });
      container.addEventListener('touchmove', onTouchMove, { passive: false });
      container.addEventListener('touchend', onTouchEnd);
      container.addEventListener('touchcancel', onTouchEnd);
  
      // Cleanup
      return () => {
        window.removeEventListener('resize', handleResize);
        container.removeEventListener('mousedown', onMouseDown);
        container.removeEventListener('mousemove', onMouseMove);
        container.removeEventListener('mouseup', onMouseUp);
        container.removeEventListener('mouseleave', onMouseUp);
        container.removeEventListener('touchstart', onTouchStart);
        container.removeEventListener('touchmove', onTouchMove);
        container.removeEventListener('touchend', onTouchEnd);
        container.removeEventListener('touchcancel', onTouchEnd);
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