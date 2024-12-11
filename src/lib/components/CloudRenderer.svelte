<script>
    import { onMount } from 'svelte';
    import * as THREE from 'three';
    import { spring } from 'svelte/motion';
    import { fade, fly } from 'svelte/transition';
    import Cloud from 'lucide-svelte/icons/cloud';
    import CloudSun from 'lucide-svelte/icons/cloud-sun';
    import Pause from 'lucide-svelte/icons/pause';
    import Play from 'lucide-svelte/icons/play';
    import ChevronUp from 'lucide-svelte/icons/chevron-up';
    import ChevronDown from 'lucide-svelte/icons/chevron-down';
    import Link from 'lucide-svelte/icons/link';
    import Github from 'lucide-svelte/icons/github';
  
    let container;
    let showIntro = true;
  
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
        up: false,
        down: false
    };
    const MOVEMENT_SPEED = 0.2; // Reduced from 0.5

    // Remove scroll-related variables and keep only camera position
    let cameraPosition = { x: 0, y: 0 };
    const CAMERA_MOVEMENT_SPEED = 8.0;  // Increased from 2.0

    // Add near the top with other state variables
    let isDebugView = false;
    let originalFrustumSize = 10;
    let debugFrustumSize = 60; // This will show 6x more area

    // Add these new variables near the top with other state variables
    let targetCameraY = 0;
    const CAMERA_SMOOTHING = 0.1;  // Adjust this value between 0-1 (lower = smoother)

    // Add these constants near the top with other state variables
    const MIN_SECTION = 0;
    const MAX_SECTION = 3;  // sections.length - 1

    // Update the handleNavButtonPress function
    const handleNavButtonPress = (direction) => {
        switch(direction) {
            case 'up':
                keyState.up = true;
                if (currentSection > MIN_SECTION) {
                    currentSection--;
                    // Update spring store
                    sectionSpring.set({ y: currentSection * -100 });
                }
                break;
            case 'down':
                keyState.down = true;
                if (currentSection < MAX_SECTION) {
                    currentSection++;
                    // Update spring store
                    sectionSpring.set({ y: currentSection * -100 });
                }
                break;
        }
    };

    const handleNavButtonRelease = (direction) => {
        switch(direction) {
            case 'up':
                keyState.up = false;
                break;
            case 'down':
                keyState.down = false;
                break;
        }
    };

    // Modify the mouse interaction variables
    let mousePosition = { x: 0, y: 0 };
    let normalizedMousePosition = { x: 0, y: 0 };
    let isDragging = false;

    // Update the mouse handlers
    const updateMousePosition = (event) => {
        const rect = container.getBoundingClientRect();
        
        // Calculate normalized coordinates (-1 to 1)
        normalizedMousePosition.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        normalizedMousePosition.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Update cursor if near sun
        if (fogMaterial) {
            const sunPos = fogMaterial.uniforms.sunPosition.value;
            const distance = Math.sqrt(
                Math.pow((normalizedMousePosition.x - sunPos.x), 2) + 
                Math.pow((normalizedMousePosition.y - sunPos.y), 2)
            );
            
            if (distance < 0.2) {
                container.style.cursor = 'grab';
            } else {
                container.style.cursor = 'default';
            }
        }
    };

    const onMouseDown = (event) => {
        updateMousePosition(event);
        if (fogMaterial) {
            const sunPos = fogMaterial.uniforms.sunPosition.value;
            
            // Calculate distance in normalized coordinates
            const distance = Math.sqrt(
                Math.pow((normalizedMousePosition.x - sunPos.x), 2) + 
                Math.pow((normalizedMousePosition.y - sunPos.y), 2)
            );
            
            // Increased hit area from 0.06 to 0.2
            if (distance < 0.2) {
                isDragging = true;
                container.style.cursor = 'grabbing';
            }
        }
    };

    const onMouseMove = (event) => {
        updateMousePosition(event);
        
        if (isDragging && fogMaterial) {
            // Update sun position directly with normalized coordinates
            const newX = THREE.MathUtils.clamp(normalizedMousePosition.x, -1, 1);
            const newY = THREE.MathUtils.clamp(normalizedMousePosition.y, -1, 1);
            
            // Update sun position
            fogMaterial.uniforms.sunPosition.value.set(newX, newY);
            
            // Update coordinates and time display
            sunCoordinates = { x: newX, y: newY };
            currentTime = getTimeFromX(newX);
            
            // Update sky color
            scene.background = getSkyColor(newX);
            
            // Update isNightTime based on hour
            const hour = ((newX + 1) * 12);
            isNightTime = hour < 5 || hour > 19;
        }
    };

    const onMouseUp = () => {
        isDragging = false;
        container.style.cursor = 'default';
    };

    // Add fogMaterial to component scope
    let fogMaterial;
    let scene;  // Also add scene to component scope

    // Add these lerp helper functions near the top
    function lerp(start, end, t) {
        return start * (1 - t) + end * t;
    }

    function lerpVector2(v1, v2, t) {
        return {
            x: lerp(v1.x, v2.x, t),
            y: lerp(v1.y, v2.y, t)
        };
    }

    onMount(() => {
      // Scene setup
      scene = new THREE.Scene();  // Remove 'const' to use component-scoped variable
      
      // Force initial sky color for night time
      scene.background = skyColors.nightDeep.clone();
  
      // Adjust frustum size to match screen proportions
      const frustumSize = 10;  // Back to default zoom
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
        frustumSize * aspect * 2,
        frustumSize * 2
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
  
      // Create fog material and store in component-scoped variable
      fogMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          seed: { value: Math.random() * 100.0 },
          fogTexture: { value: fogTexture },
          resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
          sunPosition: { value: new THREE.Vector2(-0.6, -0.2) },
          cloudDensity: { value: weatherState.cloudDensity },
          windSpeed: { value: weatherState.windSpeed },
          stormIntensity: { value: weatherState.stormIntensity },
          rainIntensity: { value: weatherState.rainIntensity },
          hour: { value: 0.0 },
          cameraOffset: { value: new THREE.Vector2(0, 0) },
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
          uniform vec2 cameraOffset;
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
            // Calculate world-space position by adding camera offset
            vec2 worldPos = vPosition.xy + cameraOffset;
            
            // Use normal coordinates for cloud movement (removed mouse distortion)
            vec2 moveUV = worldPos + vec2(-time * 0.08, 0.0);
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
            
            // Define cloud colors with smoother transitions
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
  
      // Create a plane that's larger than the camera frustum
      const planeGeometry = new THREE.PlaneGeometry(
        frustumSize * aspect * 2, // Reduced from 3 to 2
        frustumSize * 2          // Reduced from 3 to 2
      );
      const fogPlane = new THREE.Mesh(planeGeometry, fogMaterial);
      fogPlane.position.z = -5;
      scene.add(fogPlane);
  
      // Position camera closer
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
              case 'arrowup':
              case 'w':
                  keyState.up = true;
                  if (currentSection > MIN_SECTION) {
                      currentSection--;
                      sectionSpring.set({ y: currentSection * -100 });
                  }
                  break;
              case 'arrowdown':
              case 's':
                  keyState.down = true;
                  if (currentSection < MAX_SECTION) {
                      currentSection++;
                      sectionSpring.set({ y: currentSection * -100 });
                  }
                  break;
          }
      };

      const handleKeyUp = (event) => {
          switch(event.key.toLowerCase()) {
              case 'arrowup':
              case 'w':
                  keyState.up = false;
                  handleNavButtonRelease('up');
                  break;
              case 'arrowdown':
              case 's':
                  keyState.down = false;
                  handleNavButtonRelease('down');
                  break;
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);

      // Add FPS limiting variables
      const fps = 30;
      const fpsInterval = 1000 / fps;
      let then = performance.now();

      // Update the animate function
      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);

        // Calculate elapsed time since last frame
        const now = performance.now();
        const elapsed = now - then;

        // Only render if enough time has passed
        if (elapsed > fpsInterval) {
            // Adjust for drift by updating 'then' based on intervals
            then = now - (elapsed % fpsInterval);

            // Calculate delta time
            let deltaTime = elapsed / 1000; // Convert to seconds

            // Update target camera position based on key state
            if (keyState.up || keyState.down) {
                const moveDirection = (keyState.up ? 1 : 0) - (keyState.down ? 1 : 0);
                targetCameraY += moveDirection * CAMERA_MOVEMENT_SPEED * deltaTime;
            }
            
            // Smoothly interpolate camera position
            cameraPosition.y += (targetCameraY - cameraPosition.y) * CAMERA_SMOOTHING;
            
            // Update positions with smoothed camera position
            camera.position.y = cameraPosition.y;
            fogPlane.position.y = cameraPosition.y;
            thinFogPlane.position.y = cameraPosition.y;
            
            // Update camera offset uniform in shader with smoothed position
            fogMaterial.uniforms.cameraOffset.value.set(0, cameraPosition.y);
            
            const currentSunX = fogMaterial.uniforms.sunPosition.value.x;
            const sunMovementSpeed = Math.abs(currentSunX - previousSunX);
            previousSunX = currentSunX;
            
            if (enableCloudMovement) {
                const baseTimeIncrement = 0.018;
                const timeIncrement = baseTimeIncrement + (sunMovementSpeed * speedMultiplier);
                time += timeIncrement;
            }
            
            fogMaterial.uniforms.time.value = time;
            
            if (fogPlane) {
                fogPlane.visible = showClouds;
            }
            
            fogMaterial.uniforms.windSpeed.value = weatherState.windSpeed * (1.0 + sunMovementSpeed * speedMultiplier * 2);
            
            // Update sun and glow position - remove camera position offset
            const aspect = container.clientWidth / container.clientHeight;
            const sunX = fogMaterial.uniforms.sunPosition.value.x * (frustumSize * aspect / 2);
            const sunY = fogMaterial.uniforms.sunPosition.value.y * (frustumSize / 2);
            
            // Update sun position without adding camera offset
            sunMesh.position.set(
                sunX + camera.position.x,  // Add camera offset to keep sun fixed relative to view
                sunY + camera.position.y,
                sunMesh.position.z
            );
            sunGlowMesh.position.set(
                sunX + camera.position.x,
                sunY + camera.position.y,
                sunGlowMesh.position.z
            );

            // Much gentler sky color transitions
            const currentSkyColor = getSkyColor(fogMaterial.uniforms.sunPosition.value.x);
            if (scene.background) {
                scene.background.lerp(currentSkyColor, 0.01);
            }

            // Calculate hour and isNightTime once
            const hour = ((fogMaterial.uniforms.sunPosition.value.x + 1) * 12);
            isNightTime = hour < 5 || hour > 19;

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

            // Render the scene
            renderer.render(scene, camera);
        }
      };
      animate();
  
      // Add touch event listeners
      container.addEventListener('mousedown', onMouseDown);
      container.addEventListener('mousemove', onMouseMove);
      container.addEventListener('mouseup', onMouseUp);
      container.addEventListener('mouseleave', onMouseUp);
  
      // After everything is set up, add a delay before hiding loading screen
      setTimeout(() => {
          showIntro = true;
          if (container) {
              container.style.opacity = '1';
          }
      }, 1000);  // 1000ms = 1 second delay
  
      // Create stars and add them to the scene
      for (let i = 0; i < TOTAL_STARS; i++) {
          const star = new Star();
          stars.push(star);
          scene.add(star.mesh);
      }
  
      // Force initial night time state
      isNightTime = true;
  
      // Add mousemove event listener
      container.addEventListener('mousemove', updateMousePosition);
  
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
        container.removeEventListener('mousemove', updateMousePosition);
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

    // Add new state variables
    let currentSection = 0;
    const sections = [
        { id: 'intro', title: 'Surya Vardhin Gamidi' },
        { id: 'projects', title: 'Projects' },
        { id: 'about', title: 'About' },
        { id: 'contact', title: 'Contact' }
    ];
    
    // Create spring store for section transitions
    const sectionSpring = spring({ y: 0 }, {
        stiffness: 0.1,
        damping: 0.7
    });

    // Create a sequence of transitions
    const startSequence = async () => {
        if (container) {
            container.style.opacity = '1';
        }
    };

    startSequence();
</script>
  
  <div class="main-container">
    <div bind:this={container} 
         class="canvas-container" 
         style="opacity: 0; 
                transition: opacity 1s ease-in-out;
                background: #000000;">
        <div class="controls">
            <button 
                class="control-button" 
                title={showClouds ? 'Hide Clouds' : 'Show Clouds'} 
                on:click={() => showClouds = !showClouds}
            >
                <svelte:component this={showClouds ? Cloud : CloudSun} size={20} />
            </button>
            <button 
                class="control-button" 
                title={enableCloudMovement ? 'Stop Movement' : 'Start Movement'} 
                on:click={() => enableCloudMovement = !enableCloudMovement}
            >
                <svelte:component this={enableCloudMovement ? Pause : Play} size={20} />
            </button>
        </div>
        
        <!-- Add navigation controls -->
        <div class="navigation-controls">
            <button 
                class="nav-button up"
                on:mousedown={() => handleNavButtonPress('up')}
                on:mouseup={() => handleNavButtonRelease('up')}
                on:mouseleave={() => handleNavButtonRelease('up')}
                on:touchstart|preventDefault={() => handleNavButtonPress('up')}
                on:touchend|preventDefault={() => handleNavButtonRelease('up')}
            >
                <ChevronUp size={24} />
            </button>
            <button 
                class="nav-button down"
                on:mousedown={() => handleNavButtonPress('down')}
                on:mouseup={() => handleNavButtonRelease('down')}
                on:mouseleave={() => handleNavButtonRelease('down')}
                on:touchstart|preventDefault={() => handleNavButtonPress('down')}
                on:touchend|preventDefault={() => handleNavButtonRelease('down')}
            >
                <ChevronDown size={24} />
            </button>
        </div>
    </div>

    <!-- Modified content overlay -->
    <div class="content-overlay" 
         style="transform: translateY({$sectionSpring.y}vh)">
        {#each sections as section, i}
            <section 
                class="portfolio-section" 
                class:active={currentSection === i}
            >
                {#if section.id === 'intro' && showIntro}
                    <div class="intro-content" 
                         in:fly="{{ y: 50, duration: 1000, delay: 500 }}"
                         out:fade>
                        <div class="particle-container">
                            {#each Array(100) as _, i}
                                <div
                                    class="void-particle"
                                    style="
                                        left: 50%;
                                        top: 50%;
                                        width: {Math.random() * 3 + 1}px;
                                        height: {Math.random() * 3 + 1}px;
                                        --start-x: {(Math.random() - 0.5) * 1000}px;
                                        --start-y: {(Math.random() - 0.5) * 1000}px;
                                        --mid-x: {(Math.random() - 0.5) * 200}px;
                                        --mid-y: {(Math.random() - 0.5) * 200}px;
                                        --end-x: {(Math.random() - 0.5) * 50}px;
                                        --end-y: {(Math.random() - 0.5) * 50}px;
                                        animation: particleConverge 2.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                                        animation-delay: {Math.random() * 0.5}s;
                                    "
                                />
                            {/each}
                        </div>
                        <h1>
                            {#each 'Surya Vardhin Gamidi' as char, i}
                                <span style="animation-delay: {i * 0.08}s">
                                    {char === ' ' ? '\u00A0' : char}
                                </span>
                            {/each}
                        </h1>
                        <p>Web Developer & Designer</p>
                    </div>
                {:else if section.id === 'projects'}
                    <div class="projects-container"
                         in:fly="{{ y: 50, duration: 1000 }}"
                         out:fade>
                        <div class="projects-grid">
                            <div class="project-card">
                                <div class="project-image">
                                    <div class="project-placeholder"></div>
                                </div>
                                <div class="project-content">
                                    <h3>Project Name</h3>
                                    <div class="tech-stack">
                                        <span class="tech-tag">React</span>
                                        <span class="tech-tag">Node.js</span>
                                        <span class="tech-tag">MongoDB</span>
                                    </div>
                                    <p class="project-description">
                                        A brief description of the project and its key features.
                                    </p>
                                    <div class="project-links">
                                        <a href="/projects/demo" class="project-link" target="_blank" rel="noopener noreferrer">
                                            <Link size={16} /> Live Demo
                                        </a>
                                        <a href="https://github.com/yourusername/projectname" class="project-link" target="_blank" rel="noopener noreferrer">
                                            <Github size={16} /> GitHub
                                        </a>
                                    </div>
                                </div>
                            </div>
                            <!-- Add more project cards with the same structure -->
                        </div>
                    </div>
                {:else if section.id === 'about'}
                    <div class="about-content"
                         in:fly="{{ y: 50, duration: 1000 }}"
                         out:fade>
                        <h2>About Me</h2>
                        <p>Your bio here...</p>
                    </div>
                {:else if section.id === 'contact'}
                    <div class="contact-content"
                         in:fly="{{ y: 50, duration: 1000 }}"
                         out:fade>
                        <h2>Get in Touch</h2>
                        <!-- Add contact information or form -->
                    </div>
                {/if}
            </section>
        {/each}
    </div>
  </div>
  
  <style>
    :global(*) {
        font-family: 'Quicksand', sans-serif;
        color: white;
        box-sizing: border-box;
    }

    :global(body) {
        overflow: hidden; /* Hide scrollbar */
        margin: 0;
        padding: 0;
        background: #000000;  /* Pure black background */
    }

    :global(::-webkit-scrollbar) {
        display: none; /* Hide scrollbar for Chrome/Safari/Opera */
    }

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
        transition: opacity 1s ease-in-out;
        background: #000000;  /* Pure black background */
    }

    .fade-in {
        opacity: 1;
        visibility: visible;
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

    .navigation-controls {
        position: fixed;
        bottom: 20px;
        right: 20px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        z-index: 1000;
    }

    .nav-button {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        font-size: 24px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(8px);
        transition: all 0.2s ease;
        padding: 0;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
    }

    .nav-button:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: scale(1.05);
    }

    .nav-button:active {
        transform: scale(0.95);
    }

    /* Make buttons larger on touch devices */
    @media (pointer: coarse) {
        .nav-button {
            width: 60px;
            height: 60px;
            font-size: 28px;
        }
        
        .navigation-controls {
            bottom: 24px;
            right: 24px;
            gap: 16px;
        }
    }

    .content-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100vh;
        z-index: 2;
        transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        pointer-events: none;
    }

    .portfolio-section {
        height: 100vh;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.5s ease;
        padding: 2rem;
        pointer-events: none;
    }

    .portfolio-section.active {
        opacity: 1;
    }

    .intro-content {
        text-align: center;
        color: white;
        z-index: 10;
        position: relative;
        pointer-events: none;
    }

    .intro-content h1 {
        font-family: 'Quicksand', sans-serif;
        font-weight: 300;
        font-size: 3.5rem;
        margin: 0;
        letter-spacing: 0.2em;
        position: relative;
        pointer-events: none;
    }

    .intro-content h1 span {
        display: inline-block;
        opacity: 0;
        position: relative;
        animation: emergeFromVoid 1.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }

    .intro-content p {
        font-family: 'Quicksand', sans-serif;
        font-weight: 300;
        font-size: 1.8rem;
        margin-top: 2rem;
        opacity: 0;
        animation: fadeFromDistance 2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        animation-delay: 2s;
        letter-spacing: 0.1em;
        pointer-events: none;
    }

    @keyframes emergeFromVoid {
        0% {
            opacity: 0;
            transform: perspective(1000px) translateZ(-300px) scale(3);
            filter: blur(20px);
            text-shadow: none;
        }
        60% {
            opacity: 0.6;
            transform: perspective(1000px) translateZ(-100px) scale(1.5);
            filter: blur(10px);
            text-shadow: 
                0 0 20px rgba(255,255,255,0.5),
                0 0 40px rgba(255,255,255,0.3);
        }
        100% {
            opacity: 1;
            transform: perspective(1000px) translateZ(0) scale(1);
            filter: blur(0);
            text-shadow: 
                0 0 10px rgba(255,255,255,0.3),
                0 0 20px rgba(255,255,255,0.2);
        }
    }

    @keyframes fadeFromDistance {
        0% {
            opacity: 0;
            transform: perspective(1000px) translateZ(-200px);
            filter: blur(15px);
        }
        100% {
            opacity: 0.9;
            transform: perspective(1000px) translateZ(0);
            filter: blur(0);
        }
    }

    .particle-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
    }

    .void-particle {
        position: absolute;
        background: white;
        border-radius: 50%;
        opacity: 0;
    }

    @keyframes particleConverge {
        0% {
            opacity: 0.8;
            transform: translate(var(--start-x), var(--start-y)) scale(1);
        }
        60% {
            opacity: 0.4;
            transform: translate(var(--mid-x), var(--mid-y)) scale(0.6);
        }
        100% {
            opacity: 0;
            transform: translate(var(--end-x), var(--end-y)) scale(0);
        }
    }

    .projects-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 2.5rem;
        width: 100%;
        max-width: 1400px;
        padding: 2rem;
        margin: 0 auto;
        will-change: transform;
        isolation: isolate;
        position: relative;
    }

    .projects-container {
        width: 100%;
        height: 100%;
        padding: 2rem;
    }

    .project-card {
        position: relative;
        background: rgba(255, 255, 255, 0.15);
        border-radius: 20px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.2);
        transform: perspective(1000px) translateZ(0);
        transition: transform 0.4s cubic-bezier(0.165, 0.84, 0.44, 1),
                    background-color 0.4s ease,
                    box-shadow 0.4s ease;
        will-change: transform;
        z-index: 1;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    }

    .project-card:hover {
        transform: perspective(1000px) translateZ(20px) translateY(-5px);
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.3);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    .project-image {
        width: 100%;
        height: 200px;
        overflow: hidden;
        position: relative;
        background: rgba(0,0,0,0.1);
    }

    .project-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.5s ease;
    }

    .project-card:hover .project-image img {
        transform: scale(1.05);
    }

    .project-content {
        padding: 1.5rem;
        color: white;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    }

    .project-content h3 {
        font-family: 'Quicksand', sans-serif;
        font-size: 1.5rem;
        margin: 0 0 1rem 0;
        font-weight: 500;
        letter-spacing: 0.5px;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
    }

    .tech-stack {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-bottom: 1rem;
    }

    .tech-tag {
        background: rgba(255, 255, 255, 0.15);
        padding: 0.3rem 0.8rem;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 400;
        letter-spacing: 0.5px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .project-description {
        font-size: 0.95rem;
        line-height: 1.6;
        margin-bottom: 1.5rem;
        opacity: 0.95;
        font-weight: 400;
    }

    .project-links {
        display: flex;
        gap: 1rem;
    }

    .project-link {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background: rgba(255, 255, 255, 0.15);
        border-radius: 8px;
        text-decoration: none;
        color: white;
        font-size: 0.9rem;
        transition: all 0.2s ease;
        pointer-events: auto;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
        font-weight: 500;
    }

    .project-link:hover {
        background: rgba(255, 255, 255, 0.25);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
        .projects-grid {
            grid-template-columns: 1fr;
            padding: 1rem;
            gap: 1.5rem;
        }

        .project-content {
            padding: 1rem;
        }

        .project-content h3 {
            font-size: 1.3rem;
        }

        .project-image {
            height: 180px;
        }
    }

    /* Dark mode optimization */
    @media (prefers-color-scheme: dark) {
        .project-card {
            background: rgba(0, 0, 0, 0.3);
        }

        .project-card:hover {
            background: rgba(0, 0, 0, 0.4);
        }
    }

    .project-placeholder {
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
        transition: transform 0.5s ease;
    }

    .project-card:hover .project-placeholder {
        transform: scale(1.05);
    }

    /* Add subtle animation to loading spinner */
    .loading-spinner {
        /* ... existing styles ... */
        animation: spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    }

    /* Enhance section transitions */
    .portfolio-section {
        /* ... existing styles ... */
        transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Add subtle floating animation to content */
    @keyframes float {
        0% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
        100% { transform: translateY(0); }
    }

    .intro-content {
        /* animation: float 6s ease-in-out infinite; <- Remove this line */
    }

    /* Enhanced hover effects for interactive elements */
    .control-button:hover,
    .nav-button:hover {
        text-shadow: 0 4px 8px rgba(0,0,0,0.3);
    }

    /* Add smooth transitions to all elements */
    :global(*) {
        transition: color 0.3s ease, 
                   background-color 0.3s ease, 
                   transform 0.3s ease, 
                   opacity 0.3s ease,
                   text-shadow 0.3s ease;
    }

    .project-card {
        /* ... existing styles ... */
        transform: perspective(1000px) translateZ(0);
        transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
    }

    .project-card:hover {
        transform: perspective(1000px) translateZ(20px) translateY(-5px);
        box-shadow: 0 15px 30px rgba(0,0,0,0.2);
    }

    .intro-content h1 {
        font-weight: 300;
        letter-spacing: 0.2em;
        text-shadow: 0 4px 8px rgba(0,0,0,0.2);
        transform: translateY(0);
        transition: all 0.3s ease;
    }

    .intro-content h1:hover {
        transform: translateY(-5px);
        text-shadow: 0 8px 16px rgba(0,0,0,0.3);
    }

    .intro-content p {
        font-weight: 300;
        letter-spacing: 0.15em;
        text-shadow: 0 2px 4px rgba(0,0,0,0.2);
        opacity: 0.9;
        transition: all 0.3s ease;
    }

    .intro-content p:hover {
        opacity: 1;
        transform: translateY(-3px);
    }

    .project-content h3 {
        font-weight: 400;
        letter-spacing: 0.1em;
        text-shadow: 0 2px 4px rgba(0,0,0,0.2);
        transition: all 0.3s ease;
    }

    .project-content h3:hover {
        transform: translateX(5px);
    }

    .tech-tag {
        font-weight: 400;
        letter-spacing: 0.08em;
        text-shadow: 0 1px 2px rgba(0,0,0,0.2);
        transition: all 0.2s ease;
    }

    .tech-tag:hover {
        transform: translateY(-2px);
        background: rgba(255, 255, 255, 0.2);
    }

    .project-description {
        font-weight: 300;
        letter-spacing: 0.05em;
        line-height: 1.8;
        text-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }

    .project-link {
        /* ... existing styles ... */
        font-weight: 400;
        letter-spacing: 0.08em;
        text-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }

    .project-link:hover {
        /* ... existing styles ... */
        text-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }

    /* Add new animation for name reveal */
    @keyframes nameReveal {
        0% {
            opacity: 0;
            transform: translateY(30px);
        }
        100% {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .intro-content h1 {
        opacity: 0;  /* Start hidden */
        animation: nameReveal 1.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }

    .intro-content p {
        opacity: 0;
        animation: nameReveal 1.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        animation-delay: 0.3s;
    }

    /* Allow pointer events only on specific interactive elements */
    .project-link,
    .nav-button,
    .control-button {
        pointer-events: auto;
    }

    /* Make sure text elements don't capture pointer events */
    .intro-content {
        pointer-events: none;
    }

    .intro-content h1,
    .intro-content p {
        pointer-events: none;
    }
</style>

<link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;600;700&display=swap" rel="stylesheet">
