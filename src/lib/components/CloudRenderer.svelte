<script>
    import { onMount } from 'svelte';
    import * as THREE from 'three';
  
    let container;
    let isLoading = true;
  
    // Add weather state
    let weatherState = {
        cloudDensity: 0.3,
        windSpeed: 0.08,
        stormIntensity: 0.0,
        rainIntensity: 0.0
    };
  
    // Add new variable to store coordinates
    let sunCoordinates = { x: -0.6, y: -0.2 };  // Changed from -0.5, -0.3
  
    // Add new variables for time display
    let currentTime = "02:30 AM";  // Updated to match new position
    let skyColors = {
        nightDeep: new THREE.Color(0x000000),    // Pure black (midnight)
        nightLight: new THREE.Color(0x0A0A2A),    // Very dark blue-black
        preDawn: new THREE.Color(0x12122E),       // Slightly lighter than night, still deep blue
        dawn: new THREE.Color(0x1A1A3A),          // Deep blue
        morningGold: new THREE.Color(0x1A1A3A),   // Deep blue
        day: new THREE.Color(0x87CEEB),           // Natural sky blue (unchanged)
        afternoonWarm: new THREE.Color(0x6CA9C2), // Slightly darker, cooler sky blue
        dusk: new THREE.Color(0x12122E),          // Changed to match pre-dawn
        twilight: new THREE.Color(0x0A0A2A)       // Changed to match nightLight
    };
  
    // Function to convert x position to time
    function getTimeFromX(x) {
        // Map x from [-1, 1] to [0, 24]
        const hours = ((x + 1) * 12);
        const totalMinutes = Math.floor(hours * 60);
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }
  
    // Function to get sky color based on time
    function getSkyColor(x) {
        const hour = ((x + 1) * 12);
        
        if (hour < 4) {
            return skyColors.nightDeep.clone();
        } else if (hour < 4.5) {
            const t = smoothstep(4.0, 4.5, hour);
            return skyColors.nightDeep.clone().lerp(skyColors.nightLight, t);
        } else if (hour < 5) {
            const t = smoothstep(4.5, 5.0, hour);
            return skyColors.nightLight.clone().lerp(skyColors.preDawn, t);
        } else if (hour < 6) {
            const t = smoothstep(5.0, 6.0, hour);
            return skyColors.preDawn.clone().lerp(skyColors.dawn, t);
        } else if (hour < 6.5) {
            const t = smoothstep(6.0, 6.5, hour);
            return skyColors.dawn.clone().lerp(skyColors.morningGold, t);
        } else if (hour < 7) {
            const t = smoothstep(6.5, 7.0, hour);
            return skyColors.morningGold.clone().lerp(skyColors.day, t);
        } else if (hour < 16) {
            const t = smoothstep(8.0, 16.0, hour);
            return skyColors.day.clone().lerp(skyColors.afternoonWarm, t);
        } else if (hour < 17) {
            const t = smoothstep(16.0, 17.0, hour);
            return skyColors.afternoonWarm.clone().lerp(skyColors.dusk, t);
        } else if (hour < 18) {
            const t = smoothstep(17.0, 18.0, hour);
            return skyColors.dusk.clone().lerp(skyColors.twilight, t);
        } else if (hour < 19) {
            const t = smoothstep(18.0, 19.0, hour);
            return skyColors.twilight.clone().lerp(skyColors.nightDeep, t);
        } else {
            return skyColors.nightDeep.clone();
        }
    }
  
    // Add new state variables
    let showClouds = true;
    let enableCloudMovement = true;
  
    // Add new variable to track if it's night time
    let isNightTime = true;

    // Add star system variables
    let stars = [];
    const TOTAL_STARS = 350;  // Reduced from 800

    class Star {
        constructor() {
            this.resetProperties();
            this.createMesh();
        }

        resetProperties() {
            this.size = Math.random() * 0.015 + 0.003; // Random size between 0.003 and 0.018
            this.ttl = Math.random() * 5 + 3; // Time to live: 3-8 seconds
            this.age = 0;
            this.fadeState = 'in';  // States: 'in', 'stable', 'out', 'waiting'
            this.fadeTime = 1.0;    // Time to fade in/out
            this.waitTime = Math.random() * 2;  // Random wait time 0-2 seconds
            this.waitTimer = 0;
        }

        createMesh() {
            const geometry = new THREE.SphereGeometry(this.size, 8, 8);
            const starColors = [
                0xFFFFFF,    // White (young stars)
                0xFFF4E8,    // Slightly warm white
                0xFFEBD5,    // Warm white (like our Sun)
                0xFFE4B5,    // Cream (older stars)
                0xFFD7AA,    // Pale orange (red giants)
                0x99CCFF,    // Blue-white (hot young stars)
                0xCAE1FF     // Light blue (very hot stars)
            ];
            const color = starColors[Math.floor(Math.random() * starColors.length)];
            
            this.material = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0
            });

            this.mesh = new THREE.Mesh(geometry, this.material);
            this.setNewPosition();
        }

        setNewPosition() {
            // Use spherical distribution for more uniform star placement
            const u = Math.random();
            const v = Math.random();
            const theta = 2 * Math.PI * u;  // Azimuthal angle
            const phi = Math.acos(2 * v - 1);  // Polar angle
            const radius = 12;  // Increased from 8 to 12 - Distance from camera

            // Convert spherical coordinates to Cartesian
            this.mesh.position.set(
                radius * Math.sin(phi) * Math.cos(theta),
                radius * Math.sin(phi) * Math.sin(theta),
                -4.5
            );

            // Add slight random variation to z-position for depth
            this.mesh.position.z += (Math.random() - 0.5) * 2;
        }

        update(deltaTime) {
            if (!isNightTime) {
                this.material.opacity = 0;
                return;
            }

            this.age += deltaTime;

            switch(this.fadeState) {
                case 'in':
                    this.material.opacity += deltaTime / this.fadeTime;
                    if (this.material.opacity >= 1) {
                        this.material.opacity = 1;
                        this.fadeState = 'stable';
                    }
                    break;

                case 'stable':
                    const twinkle = Math.sin(this.age * 3) * 0.05 + 
                                   Math.sin(this.age * 5) * 0.03 + 
                                   Math.sin(this.age * 7) * 0.02;
                    this.material.opacity = (0.85 + twinkle) * (1 - weatherState.cloudDensity * 0.8);
                    
                    if (this.age >= this.ttl) {
                        this.fadeState = 'out';
                    }
                    break;

                case 'out':
                    this.material.opacity -= deltaTime / this.fadeTime;
                    if (this.material.opacity <= 0) {
                        this.material.opacity = 0;
                        this.fadeState = 'waiting';
                        this.waitTimer = 0;
                    }
                    break;

                case 'waiting':
                    this.waitTimer += deltaTime;
                    if (this.waitTimer >= this.waitTime) {
                        this.resetProperties();
                        this.setNewPosition();
                        this.mesh.geometry.dispose();
                        this.mesh.geometry = new THREE.SphereGeometry(this.size, 8, 8);
                        this.fadeState = 'in';
                    }
                    break;
            }
        }
    }
  
    // Add these variables near the top with other state variables
    let keyState = {
        left: false,
        right: false,
        up: false,
        down: false
    };
    const MOVEMENT_SPEED = 0.2; // Reduced from 0.5

    // Add these new variables near the top with other state variables
    let scrollY = 0;
    let maxScroll = 2000; // Adjust this value based on your needs
    let viewportHeight;

    // Update the scroll handler to be more responsive
    function handleScroll() {
        scrollY = window.scrollY;
        const scrollProgress = Math.min(scrollY / (maxScroll - viewportHeight), 1);
        
        // Map scroll progress to sun Y position (adjust ranges as needed)
        const newY = THREE.MathUtils.lerp(0.8, -0.8, scrollProgress);
        
        // Update sun position if fogMaterial exists
        if (fogMaterial && fogMaterial.uniforms.sunPosition) {
            fogMaterial.uniforms.sunPosition.value.y = newY;
            sunCoordinates.y = newY.toFixed(3);
        }
    }

    onMount(() => {
      // Scene setup
      const scene = new THREE.Scene();
      
      // Force initial sky color for night time
      scene.background = skyColors.nightDeep.clone();
  
      // Adjust frustum size to match screen proportions
      const frustumSize = 10;  // Increased from 2 to cover more area
      const aspect = window.innerWidth / window.innerHeight;
  
      // Add sun mesh
      const sunGeometry = new THREE.CircleGeometry(0.3, 32);
      const sunMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xFFF7E6,
        transparent: true,
        opacity: 1.0
      });
      const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
      sunMesh.position.set(
        -0.6 * (frustumSize * aspect / 2),
        -0.2 * (frustumSize / 2),
        -6
      );
  
      // Add sun glow effect
      const sunGlowGeometry = new THREE.CircleGeometry(1.2, 32);  // Increased size
      const sunGlowMaterial = new THREE.ShaderMaterial({
        uniforms: {
          color: { value: new THREE.Color(0xFFAA33) },
          time: { value: 0 },
          isNight: { value: true }  // Add new uniform for night state
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 color;
          uniform float time;
          uniform bool isNight;
          varying vec2 vUv;

          float noise(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
          }

          void main() {
            vec2 center = vec2(0.5, 0.5);
            float dist = length(vUv - center) * 2.0;
            
            // Create base corona shape
            float corona = 1.0 - smoothstep(0.0, 1.0, dist);
            corona = pow(corona, 1.5);
            
            // Add subtle noise variation
            float noiseVal = noise(vUv * 5.0 + time * 0.1) * 0.1;
            corona *= (1.0 + noiseVal);
            
            // Different colors for day/night
            vec3 innerColor = isNight ? vec3(0.95, 0.95, 1.0) : vec3(1.0, 0.95, 0.8);
            vec3 outerColor = isNight ? vec3(0.7, 0.7, 0.9) : color;
            vec3 finalColor = mix(outerColor, innerColor, corona);
            
            // Reduced opacity at night
            float alpha = corona * (isNight ? 0.2 : 0.4);
            
            gl_FragColor = vec4(finalColor, alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const sunGlowMesh = new THREE.Mesh(sunGlowGeometry, sunGlowMaterial);
      sunGlowMesh.position.set(
        -0.6 * (frustumSize * aspect / 2),
        -0.2 * (frustumSize / 2),
        -6
      );
      scene.add(sunGlowMesh);
      scene.add(sunMesh);
  
      // Add thin fog layer
      const thinFogGeometry = new THREE.PlaneGeometry(
        frustumSize * aspect,
        frustumSize
      );
      const thinFogMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.01
      });
      const thinFogPlane = new THREE.Mesh(thinFogGeometry, thinFogMaterial);
      thinFogPlane.position.z = -4; // Between clouds and background
      scene.add(thinFogPlane);
  
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
          powerPreference: "high-performance"
      });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
      container.appendChild(renderer.domElement);
  
      // Create volumetric fog material
      const fogTexture = new THREE.Data3DTexture(
        new Uint8Array(128 * 128 * 128).map(() => Math.random() * 155 + 100),
        128, 128, 128
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
          sunPosition: { value: new THREE.Vector2(-0.6, -0.2) },  // Changed from -0.5, -0.3
          cloudDensity: { value: weatherState.cloudDensity },
          windSpeed: { value: weatherState.windSpeed },
          stormIntensity: { value: weatherState.stormIntensity },
          rainIntensity: { value: weatherState.rainIntensity },
          hour: { value: 0.0 }
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
          uniform float hour;
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
            for(int i = 0; i < 8; i++) {
              sum += amp * noise(p * freq);
              freq *= 1.9;
              amp *= 0.55;
            }
            return sum;
          }
  
          void main() {
            vec2 moveUV = vPosition.xy;
            
            moveUV -= vec2(time * 0.08, 0.0);
            
            moveUV *= 0.5;
            
            float baseLayer = fbm(moveUV * 0.7);
            float detailLayer = fbm(moveUV * 1.2) * 0.2;
            float heightLayer = fbm(moveUV * 0.8) * 0.15;
            
            float f = baseLayer * 0.5 + detailLayer + heightLayer;
            
            f = smoothstep(0.75, 0.95, f);
            
            float sparsityNoise = fbm(moveUV * 0.4);
            f *= smoothstep(0.65, 0.85, sparsityNoise);
            
            float secondarySparsity = fbm(moveUV * 0.3);
            f *= smoothstep(0.6, 0.95, secondarySparsity);
            
            // Define cloud colors for different times with smoother transitions
            vec3 cloudBright;
            vec3 cloudDark;
            
            if (hour < 4.0) {  // Deep night
                cloudBright = vec3(0.98, 0.98, 1.0);
                cloudDark = vec3(0.7, 0.7, 0.8);
            } else if (hour < 4.5) {
                float t = smoothstep(4.0, 4.5, hour);
                cloudBright = mix(
                    vec3(0.98, 0.98, 1.0),   // Night
                    vec3(0.99, 0.95, 0.9),   // Pre-dawn
                    t
                );
                cloudDark = mix(
                    vec3(0.7, 0.7, 0.8),     // Night
                    vec3(0.75, 0.7, 0.75),   // Pre-dawn
                    t
                );
            } else if (hour < 5.0) {
                float t = smoothstep(4.5, 5.0, hour);
                cloudBright = mix(
                    vec3(0.99, 0.95, 0.9),   // Pre-dawn
                    vec3(1.0, 0.9, 0.8),     // Dawn
                    t
                );
                cloudDark = mix(
                    vec3(0.75, 0.7, 0.75),   // Pre-dawn
                    vec3(0.8, 0.7, 0.7),     // Dawn
                    t
                );
            } else if (hour < 7.0) {
                float t = smoothstep(5.0, 7.0, hour);
                cloudBright = mix(
                    vec3(1.0, 0.9, 0.8),     // Dawn
                    vec3(0.98, 0.98, 1.0),   // Day
                    t
                );
                cloudDark = mix(
                    vec3(0.8, 0.7, 0.7),     // Dawn
                    vec3(0.7, 0.7, 0.8),     // Day
                    t
                );
            } else if (hour < 13.0) {  // Day
                cloudBright = vec3(0.98, 0.98, 1.0);
                cloudDark = vec3(0.7, 0.7, 0.8);
            } else if (hour < 16.0) {  // Early dusk transition
                float t = smoothstep(13.0, 16.0, hour);
                cloudBright = mix(
                    vec3(0.98, 0.98, 1.0),   // Day
                    vec3(1.0, 0.9, 0.85),    // Early dusk
                    t
                );
                cloudDark = mix(
                    vec3(0.7, 0.7, 0.8),     // Day
                    vec3(0.8, 0.7, 0.7),     // Early dusk
                    t
                );
            } else if (hour < 19.0) {  // Late dusk transition
                float t = smoothstep(16.0, 19.0, hour);
                cloudBright = mix(
                    vec3(1.0, 0.9, 0.85),    // Early dusk
                    vec3(0.98, 0.98, 1.0),   // Night
                    t
                );
                cloudDark = mix(
                    vec3(0.8, 0.7, 0.7),     // Early dusk
                    vec3(0.7, 0.7, 0.8),     // Night
                    t
                );
            } else {  // Night
                cloudBright = vec3(0.98, 0.98, 1.0);
                cloudDark = vec3(0.7, 0.7, 0.8);
            }
            
            float lightInfluence = fbm(moveUV * 0.8 + vec2(time * 0.02, 0.0));
            vec3 cloudColor = mix(cloudDark, cloudBright, lightInfluence);
            
            float depth = fbm(moveUV * 1.5 + f);
            float depthInfluence = smoothstep(0.2, 0.8, depth);
            cloudColor = mix(cloudColor, cloudDark, depthInfluence * 0.3);
            
            float baseOpacity = f * (0.5 + depth * 0.2);
            float edgeFade = smoothstep(0.0, 0.4, f);
            
            float finalOpacity = baseOpacity * edgeFade * 0.6;
            
            gl_FragColor = vec4(cloudColor, finalOpacity);
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
      let animationFrameId;
      let previousSunX = fogMaterial.uniforms.sunPosition.value.x;
      const speedMultiplier = 1350.0;
      
      // Add lastTime variable at the top of onMount
      let lastTime;
      
      // Add keyboard event listeners
      const handleKeyDown = (event) => {
          switch(event.key.toLowerCase()) {
              case 'arrowleft':
              case 'a':
                  keyState.left = true;
                  break;
              case 'arrowright':
              case 'd':
                  keyState.right = true;
                  break;
              case 'arrowup':
              case 'w':
                  keyState.up = true;
                  break;
              case 'arrowdown':
              case 's':
                  keyState.down = true;
                  break;
          }
      };

      const handleKeyUp = (event) => {
          switch(event.key.toLowerCase()) {
              case 'arrowleft':
              case 'a':
                  keyState.left = false;
                  break;
              case 'arrowright':
              case 'd':
                  keyState.right = false;
                  break;
              case 'arrowup':
              case 'w':
                  keyState.up = false;
                  break;
              case 'arrowdown':
              case 's':
                  keyState.down = false;
                  break;
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);

      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);
        
        const currentSunX = fogMaterial.uniforms.sunPosition.value.x;
        const sunMovementSpeed = Math.abs(currentSunX - previousSunX);
        previousSunX = currentSunX;
        
        // Only increment time if cloud movement is enabled
        if (enableCloudMovement) {
            const baseTimeIncrement = 0.015;
            const timeIncrement = baseTimeIncrement + (sunMovementSpeed * speedMultiplier);
            time += timeIncrement;
        }
        
        fogMaterial.uniforms.time.value = time;
        
        // Update cloud visibility
        if (fogPlane) {
            fogPlane.visible = showClouds;
        }
        
        // Update the wind speed uniform with a much higher multiplier
        fogMaterial.uniforms.windSpeed.value = weatherState.windSpeed * (1.0 + sunMovementSpeed * speedMultiplier * 2);
        
        // Update sun and glow position
        const aspect = container.clientWidth / container.clientHeight;
        const sunX = fogMaterial.uniforms.sunPosition.value.x * (frustumSize * aspect / 2);
        const sunY = fogMaterial.uniforms.sunPosition.value.y * (frustumSize / 2);
        sunMesh.position.x = sunX;
        sunMesh.position.y = sunY;
        sunGlowMesh.position.x = sunX;
        sunGlowMesh.position.y = sunY;

        // Much gentler sky color transitions
        const currentSkyColor = getSkyColor(fogMaterial.uniforms.sunPosition.value.x);
        if (scene.background) {
            scene.background.lerp(currentSkyColor, 0.01);
        }

        // Calculate hour and isNightTime once
        const hour = ((fogMaterial.uniforms.sunPosition.value.x + 1) * 12);
        isNightTime = hour < 5 || hour > 19;

        // Calculate delta time for smooth animations
        let currentTime = performance.now() / 1000;  // Convert to seconds
        let deltaTime = currentTime - (lastTime || currentTime);
        lastTime = currentTime;

        // Update stars
        if (stars.length > 0) {
            stars.forEach(star => {
                star.update(deltaTime);
            });
        }

        // Update sun glow time uniform
        sunGlowMaterial.uniforms.time.value = time * 0.5;

        // Gentler sun/moon transitions
        if (isNightTime) {
            sunMaterial.color.lerp(new THREE.Color(0xEEEEFF), 0.01);
            sunMaterial.opacity = THREE.MathUtils.lerp(sunMaterial.opacity, 0.9, 0.01);
        } else {
            sunMaterial.color.lerp(new THREE.Color(0xFFF7E6), 0.01);
            sunMaterial.opacity = THREE.MathUtils.lerp(sunMaterial.opacity, 1.0, 0.01);
        }

        // Update glow effect
        sunGlowMaterial.uniforms.isNight.value = isNightTime;

        fogMaterial.uniforms.hour.value = hour;

        // Handle keyboard movement
        if (keyState.left || keyState.right || keyState.up || keyState.down) {
            const deltaX = ((keyState.right ? 1 : 0) - (keyState.left ? 1 : 0)) * MOVEMENT_SPEED * deltaTime;
            const deltaY = ((keyState.up ? 1 : 0) - (keyState.down ? 1 : 0)) * MOVEMENT_SPEED * deltaTime;

            const newX = THREE.MathUtils.clamp(
                fogMaterial.uniforms.sunPosition.value.x + deltaX,
                -1,
                1
            );
            const newY = THREE.MathUtils.clamp(
                fogMaterial.uniforms.sunPosition.value.y + deltaY,
                -1,
                1
            );

            fogMaterial.uniforms.sunPosition.value.set(newX, newY);
            sunCoordinates = { x: newX.toFixed(3), y: newY.toFixed(3) };
            currentTime = getTimeFromX(newX);
        }

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
              
              // Clamp X between -1 and 1, but allow Y to move more freely
              const newX = THREE.MathUtils.clamp(mouse.x / aspect, -1, 1);
              const newY = THREE.MathUtils.clamp(mouse.y, -1, 1); // Allow full vertical range
              
              fogMaterial.uniforms.sunPosition.value.set(newX, newY);
              
              // Update coordinates and time display
              sunCoordinates = { x: newX.toFixed(3), y: newY.toFixed(3) };
              currentTime = getTimeFromX(newX);
              
              // Update sky color
              scene.background = getSkyColor(newX);
          }
      };

      const onMouseUp = () => {
          isDragging = false;
      };

      container.addEventListener('mousedown', onMouseDown);
      container.addEventListener('mousemove', onMouseMove);
      container.addEventListener('mouseup', onMouseUp);
      container.addEventListener('mouseleave', onMouseUp);
  
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
              
              // Clamp X between -1 and 1, but allow Y to move more freely
              const newX = THREE.MathUtils.clamp(mouse.x / aspect, -1, 1);
              const newY = THREE.MathUtils.clamp(mouse.y, -1, 1); // Allow full vertical range
              
              fogMaterial.uniforms.sunPosition.value.set(newX, newY);
              
              // Update coordinates and time display
              sunCoordinates = { x: newX.toFixed(3), y: newY.toFixed(3) };
              currentTime = getTimeFromX(newX);
              
              // Update sky color
              scene.background = getSkyColor(newX);
          }
      };

      // Add touch event listeners
      container.addEventListener('touchstart', onTouchStart);
      container.addEventListener('touchmove', onTouchMove);
      container.addEventListener('touchend', onMouseUp);
      container.addEventListener('touchcancel', onMouseUp);
  
      // After everything is set up, add a delay before hiding loading screen
      setTimeout(() => {
          isLoading = false;
      }, 1000);  // 1000ms = 1 second delay
  
      // Create stars and add them to the scene
      for (let i = 0; i < TOTAL_STARS; i++) {
          const star = new Star();
          stars.push(star);
          scene.add(star.mesh);
      }
  
      // Force initial night time state
      isNightTime = true;
  
      // Add these lines after scene setup
      viewportHeight = window.innerHeight;
      
      // Create a scrollable container
      const scrollContainer = document.createElement('div');
      scrollContainer.style.height = `${maxScroll}px`;
      scrollContainer.style.position = 'absolute';
      scrollContainer.style.width = '100%';
      scrollContainer.style.top = '0';
      scrollContainer.style.left = '0';
      scrollContainer.style.zIndex = '-1';
      document.body.appendChild(scrollContainer);

      // Add scroll event listener
      window.addEventListener('scroll', handleScroll, { passive: true });
  
      // Cleanup
      return () => {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', handleResize);
        container.removeEventListener('mousedown', onMouseDown);
        container.removeEventListener('mousemove', onMouseMove);
        container.removeEventListener('mouseup', onMouseUp);
        container.removeEventListener('mouseleave', onMouseUp);
        container.removeEventListener('touchstart', onTouchStart);
        container.removeEventListener('touchmove', onTouchMove);
        container.removeEventListener('touchend', onMouseUp);
        container.removeEventListener('touchcancel', onMouseUp);
        container.removeChild(renderer.domElement);
        renderer.dispose();
        fogTexture.dispose();
        planeGeometry.dispose();
        fogMaterial.dispose();
        sunGeometry.dispose();
        sunMaterial.dispose();
        thinFogGeometry.dispose();
        thinFogMaterial.dispose();
        sunGlowGeometry.dispose();
        sunGlowMaterial.dispose();
        stars.forEach(star => {
            scene.remove(star.mesh);
            star.mesh.geometry.dispose();
            star.material.dispose();
        });
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        window.removeEventListener('scroll', handleScroll);
        document.body.removeChild(scrollContainer);
      };
    });
  
    const transitionWeather = async (targetState, duration = 2000) => {
        const startState = { ...weatherState };
        const startTime = performance.now();
        
        return new Promise(resolve => {
            function update() {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Smooth transition using easing
                const ease = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
                const t = ease(progress);
                
                // Update weather parameters
                Object.keys(targetState).forEach(key => {
                    weatherState[key] = startState[key] + (targetState[key] - startState[key]) * t;
                    if (fogMaterial.uniforms[key]) {
                        fogMaterial.uniforms[key].value = weatherState[key];
                    }
                });
                
                if (progress < 1) {
                    requestAnimationFrame(update);
                } else {
                    resolve();
                }
            }
            
            update();
        });
    };

    // Add smoothstep helper function if not already present
    function smoothstep(edge0, edge1, x) {
        const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
        return t * t * (3 - 2 * t);
    }
  </script>
  
  <div class="main-container">
    {#if isLoading}
        <div class="loading-container fade-in">
            <div class="loading-spinner"></div>
            <div class="loading-text">Loading clouds...</div>
        </div>
    {/if}
    <div bind:this={container} class="canvas-container" class:fade-in={!isLoading}>
        <div class="controls">
            <button 
                class="control-button" 
                title={showClouds ? 'Hide Clouds' : 'Show Clouds'} 
                on:click={() => showClouds = !showClouds}
                on:touchstart|preventDefault={(e) => {
                    showClouds = !showClouds;
                    e.stopPropagation();
                }}
            >
                {showClouds ? '☁️' : '🌤️'}
            </button>
            <button 
                class="control-button" 
                title={enableCloudMovement ? 'Stop Movement' : 'Start Movement'} 
                on:click={() => enableCloudMovement = !enableCloudMovement}
                on:touchstart|preventDefault={(e) => {
                    enableCloudMovement = !enableCloudMovement;
                    e.stopPropagation();
                }}
            >
                {enableCloudMovement ? '⏸️' : '▶️'}
            </button>
        </div>
    </div>
  </div>
  
  <style>
    .main-container {
        width: 100%;
        height: 100vh;
        margin: 0;
        padding: 0;
        overflow: hidden;
        position: fixed;
        top: 0;
        left: 0;
        z-index: 1;
    }

    .canvas-container {
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0;
        left: 0;
        opacity: 0;
        visibility: hidden;
        transition: opacity 1s ease-in-out, visibility 1s ease-in-out;
    }

    .fade-in {
        opacity: 1;
        visibility: visible;
    }

    .loading-container {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #f5f5f5, #e6e9f0);
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.5s ease-in-out;
    }

    .loading-spinner {
        width: 60px;
        height: 60px;
        border: 4px solid rgba(0, 0, 0, 0.1);
        border-radius: 50%;
        border-top-color: #666;
        animation: spin 1s ease-in-out infinite;
        margin-bottom: 20px;
    }

    .loading-text {
        color: #666;
        font-family: 'Quicksand', sans-serif;
        font-size: 1.4rem;
        font-weight: 300;
        letter-spacing: 2px;
        text-align: center;
        padding: 0 20px;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }

    .controls {
        position: fixed;
        top: 20px;
        left: 20px;
        display: flex;
        gap: 10px;
        z-index: 1000;
    }

    .control-button {
        width: 40px;
        height: 40px;
        padding: 0;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        cursor: pointer;
        font-size: 16px;
        backdrop-filter: blur(8px);
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        -webkit-tap-highlight-color: transparent; /* Removes tap highlight on iOS */
        touch-action: manipulation; /* Improves touch handling */
    }

    .control-button:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: scale(1.05);
    }

    .control-button:active {
        transform: scale(0.95);
    }

    /* Make buttons larger on touch devices */
    @media (pointer: coarse) {
        .control-button {
            width: 48px;
            height: 48px;
            font-size: 20px;
        }
        
        .controls {
            top: 24px;
            left: 24px;
            gap: 16px;
        }
    }
  </style>
