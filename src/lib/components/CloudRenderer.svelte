<script>
    import { onMount } from 'svelte';
    import * as THREE from 'three';
    import { spring } from 'svelte/motion';
    import { fly, fade } from 'svelte/transition';
    
    // Import icons
    import { Cloud, CloudSun, Pause, Play, Mail, Phone, Linkedin, Github, Globe } from 'lucide-svelte';
    
    let container;
    let showIntro = false;
  
    // Add weather state
    let weatherState = {
        cloudDensity: 0.7,
        windSpeed: 0.5,
        stormIntensity: 0.0,
        rainIntensity: 0.0
    };
  
    // Add new variable to store coordinates
    let sunCoordinates = { x: -0.6, y: -0.2 };  // Changed from -0.5, -0.3
  
    // Add new variables for time display
    let currentTime = "6:00 PM";  // Updated to match new position
    let skyColors = {
        nightDeep: new THREE.Color(0x0A1025),
        nightLight: new THREE.Color(0x1A2045),
        preDawn: new THREE.Color(0x2A3060),
        dawn: new THREE.Color(0x5A4080),
        morningGold: new THREE.Color(0xD08060),
        day: new THREE.Color(0x87CEEB),
        afternoonWarm: new THREE.Color(0x90C0E0),
        dusk: new THREE.Color(0xA06080),
        twilight: new THREE.Color(0x404080)
    };
  
    // Function to convert x position to time
    function getTimeFromX(x) {
        // Convert x from [-1, 1] to [0, 24] hours
        const hour = ((x + 1) * 12);
        const hourInt = Math.floor(hour);
        const minute = Math.floor((hour - hourInt) * 60);
        
        // Format as 12-hour time with AM/PM
        const period = hourInt >= 12 ? "PM" : "AM";
        const hour12 = hourInt % 12 === 0 ? 12 : hourInt % 12;
        
        return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
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
    let scene; // Added declaration for scene variable
    let fogMaterial; // Add this declaration for the fogMaterial variable
  
    // Add new variable to track if it's night time
    let isNightTime = true;

    // Add star system variables
    let stars = [];
    const TOTAL_STARS = 500;  // Reduced from 800

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
            // Changed from spherical to rectangular distribution
            const width = 24;  // Increased from previous radius * 2
            const height = 50; // Increased height for taller sky

            // Random position within rectangle
            this.mesh.position.set(
                (Math.random() - 0.5) * width,    // X: -12 to 12
                (Math.random() - 0.5) * height,   // Y: -8 to 8
                -4.5 + (Math.random() - 0.5) * 2  // Z: Keep existing depth variation
            );
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
    const CAMERA_MOVEMENT_SPEED = 4.0;  // Increased from 2.0, decreased from original 8.0

    // Add near the top with other state variables
    let isDebugView = false;
    let originalFrustumSize = 10;
    let debugFrustumSize = 60; // This will show 6x more area

    // Add these new variables near the top with other state variables
    let targetCameraY = 0;
    const CAMERA_SMOOTHING = 0.05;  // Reduced from default value for smoother movement

    // Add these constants near the top with other state variables
    const MIN_SECTION = 0;
    const MAX_SECTION = 6;  // sections.length - 1

    // Add these variables to track navigation state
    let isNavigating = false;
    let navigationTimeout;

    // Add these variables near the top with other state variables
    let lastScrollY = 0;
    let isScrolling = false;
    let scrollTimeout;

    // Constants for smooth scrolling
    const SCROLL_SPEED = 0.0010; // Very low value for gentle scrolling
    const MAX_CAMERA_Y = -10; // Maximum camera position (lowest point)
    const MIN_CAMERA_Y = 0;   // Minimum camera position (highest point)

    // Add these variables near the top with other state variables
    let normalizedMousePosition = { x: 0, y: 0 };
    let isDragging = false;

    // Increase the sun hit area significantly
    const SUN_HIT_RADIUS = 1.0 //changed to 1.0 for much larger hit area (was 0.6)

    // Add these variables near the top with other state variables
    let targetSunPosition = { x: -0.6, y: -0.2 }; // Initial target position
    const SUN_MOVEMENT_SPEED = 0.03; // Controls how quickly the sun moves to target position

    const onTouchStart = (event) => {
        // Check if the touch target is a control button or content overlay
        if (event.target.closest('.controls') || event.target.closest('.content-overlay')) {
            return; // Let the button or content handle the touch event
        }
        
        // Prevent default behavior immediately
        event.preventDefault();
        
        const touch = event.touches[0];
        const rect = container.getBoundingClientRect();
        
        const touchX = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        const touchY = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Set the target position for the sun to move to
        targetSunPosition = { x: touchX, y: touchY };
        console.log("New sun target (touch):", targetSunPosition.x, targetSunPosition.y);
    };

    // Add the missing onTouchMove function
    const onTouchMove = (event) => {
        if (!isDragging) return;
        
        // Prevent default behavior during drag
        event.preventDefault();
        
        const touch = event.touches[0];
        const rect = container.getBoundingClientRect();
        
        normalizedMousePosition.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        normalizedMousePosition.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
        
        updateSunPosition(normalizedMousePosition.x, normalizedMousePosition.y);
    };

    // Add the missing onTouchEnd function
    const onTouchEnd = () => {
        isDragging = false;
    };

    // Make sure updateSunPosition function is defined
    const updateSunPosition = (x, y) => {
        if (fogMaterial && fogMaterial.uniforms && fogMaterial.uniforms.sunPosition) {
            // Clamp values to stay within [-1, 1] range
            const clampedX = Math.max(-1, Math.min(1, x));
            const clampedY = Math.max(-1, Math.min(1, y));
            
            // Update sun position
            fogMaterial.uniforms.sunPosition.value.x = clampedX;
            fogMaterial.uniforms.sunPosition.value.y = clampedY;
            
            // Update time display
            currentTime = getTimeFromX(clampedX);
        }
    };

    // Add the missing handleScroll function
    const handleScroll = () => {
        // Mark that we're scrolling
        isScrolling = true;
        
        // Clear any existing timeout
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }
        
        // Get current scroll position
        const currentScrollY = window.scrollY;
        
        // Calculate scroll direction and amount
        const scrollDelta = currentScrollY - lastScrollY;
        lastScrollY = currentScrollY;
        
        // Update target camera position based on scroll
        targetCameraY -= scrollDelta * SCROLL_SPEED;
        
        // Clamp target position to bounds
        targetCameraY = Math.max(MAX_CAMERA_Y, Math.min(MIN_CAMERA_Y, targetCameraY));
        
        // Update the section spring to match camera position
        // Map camera Y position (0 to MAX_CAMERA_Y) to section positions (0 to -600)
        const normalizedPosition = targetCameraY / MAX_CAMERA_Y;
        const sectionPosition = normalizedPosition * -100 * MAX_SECTION;
        sectionSpring.set({ y: sectionPosition });
        
        // Set timeout to mark when scrolling stops
        scrollTimeout = setTimeout(() => {
            isScrolling = false;
        }, 150);
    };

    // Add this new function to handle right-click events
    const onContextMenu = (event) => {
        // Always prevent default context menu first
        event.preventDefault();
        
        // Check if the click target is a control button or content overlay with links
        if (event.target.closest('.controls') || 
            (event.target.closest('a') || 
             event.target.closest('button'))) {
            return; // Let the button or link handle the event normally
        }
        
        const rect = container.getBoundingClientRect();
        const clickX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const clickY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Set the target position for the sun to move to
        targetSunPosition = { x: clickX, y: clickY };
        console.log("New sun target (right-click):", targetSunPosition.x, targetSunPosition.y);
    };

    onMount(() => {
      // Scene setup
      scene = new THREE.Scene();  // Remove 'const' to use component-scoped variable
      
      // Force initial sky color for night time
      scene.background = skyColors.nightDeep.clone();
  
      // Adjust frustum size to match screen proportions
      const frustumSize = 10;  // Back to default zoom
      const aspect = window.innerWidth / window.innerHeight;
  
      // Add sun mesh with reduced size
      const sunGeometry = new THREE.CircleGeometry(0.38, 32); // Reduced from 0.5 to 0.38
      const sunMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xFFF7E6,
        transparent: true,
        opacity: 1.0
      });
      const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
      sunMesh.position.set(
        -0.6 * (frustumSize * aspect / 2),
        -0.2 * (frustumSize / 2),
        -3 // Keep at -3 to stay in front
      );
  
      // Add sun glow effect with increased size
      const sunGlowGeometry = new THREE.CircleGeometry(2.0, 32);  // Increased from 1.2 to 2.0
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
        -3.5 // Changed from -6 to -3.5 to bring it forward but behind the sun
      );
      scene.add(sunMesh);
      scene.add(sunGlowMesh);
  
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
      fogPlane.position.z = -5; // Keep this at -5 so the sun is in front
      scene.add(fogPlane);
  
      // Position camera closer
      camera.position.z = 5;
  
      // Reset camera and target positions to ensure visibility
      cameraPosition.y = 0;
      targetCameraY = 0;
      currentSection = 0;
  
      // Make sure clouds are visible
      showClouds = true;
      enableCloudMovement = true;
  
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
      const speedMultiplier = 2025.0;
      
      // Add lastTime variable at the top of onMount
      let lastTime;
      
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

            // Smoothly interpolate camera position
            cameraPosition.y = THREE.MathUtils.lerp(
                cameraPosition.y, 
                targetCameraY, 
                isScrolling ? CAMERA_SMOOTHING * 2 : CAMERA_SMOOTHING
            );
            
            // Update positions with smoothed camera position
            camera.position.y = cameraPosition.y;
            fogPlane.position.y = cameraPosition.y;
            thinFogPlane.position.y = cameraPosition.y;
            
            // Update camera offset uniform in shader
            fogMaterial.uniforms.cameraOffset.value.set(0, cameraPosition.y);
            
            const currentSunX = fogMaterial.uniforms.sunPosition.value.x;
            const sunMovementSpeed = Math.abs(currentSunX - previousSunX);
            previousSunX = currentSunX;
            
            if (enableCloudMovement) {
                const baseTimeIncrement = 0.036;
                const timeIncrement = baseTimeIncrement + (sunMovementSpeed * speedMultiplier);
                time += timeIncrement;
            }
            
            fogMaterial.uniforms.time.value = time;
            
            // Ensure fog plane is visible
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
                sunX,
                sunY,
                -3 // Keep at -3 to stay in front
            );
            sunGlowMesh.position.set(
                sunX,
                sunY,
                -3.5 // Keep at -3.5 to stay behind the sun but in front of clouds
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

            // Smoothly move sun position toward target position
            if (fogMaterial && fogMaterial.uniforms && fogMaterial.uniforms.sunPosition) {
                const currentX = fogMaterial.uniforms.sunPosition.value.x;
                const currentY = fogMaterial.uniforms.sunPosition.value.y;
                
                // Calculate new position with smooth interpolation
                const newX = currentX + (targetSunPosition.x - currentX) * SUN_MOVEMENT_SPEED;
                const newY = currentY + (targetSunPosition.y - currentY) * SUN_MOVEMENT_SPEED;
                
                // Update sun position
                fogMaterial.uniforms.sunPosition.value.x = newX;
                fogMaterial.uniforms.sunPosition.value.y = newY;
                
                // Update time display based on sun position
                currentTime = getTimeFromX(newX);
                
                // Update sun and glow mesh positions
                const aspect = container.clientWidth / container.clientHeight;
                const sunX = newX * (frustumSize * aspect / 2);
                const sunY = newY * (frustumSize / 2);
                
                sunMesh.position.set(
                    sunX,
                    sunY,
                    -3 // Keep at -3 to stay in front
                );
                sunGlowMesh.position.set(
                    sunX,
                    sunY,
                    -3.5 // Keep at -3.5 to stay behind the sun but in front of clouds
                );
            }

            // Sync the section spring with camera position
            const normalizedPosition = cameraPosition.y / MAX_CAMERA_Y;
            const sectionPosition = normalizedPosition * -100 * MAX_SECTION;
            sectionSpring.set({ y: sectionPosition });

            // Render the scene
            renderer.render(scene, camera);
        }
      };
      animate();
  
      // Add these debug logs to verify event listeners are attached
      console.log("Adding event listeners for sun dragging");
      
      // Add event listeners with proper options
      container.addEventListener('mousedown', onMouseDown, { passive: false });
      container.addEventListener('touchstart', onTouchStart, { passive: false });
  
      // Add the new context menu event listener
      container.addEventListener('contextmenu', onContextMenu, { passive: false });
  
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
        container.removeEventListener('touchend', onTouchEnd);
        container.removeEventListener('touchcancel', onTouchEnd);
        container.removeEventListener('contextmenu', onContextMenu);
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
        container.removeEventListener('mousemove', updateMousePosition);
        clearTimeout(navigationTimeout);
        window.removeEventListener('scroll', handleScroll);
        clearTimeout(scrollTimeout);
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
    let sections = [
        { id: 'intro', title: 'Surya Vardhin Gamidi' },
        { id: 'decloud', title: 'Decloud' },
        { id: 'recon', title: 'Recon' },
        { id: 'yantra', title: 'Yantra' },
        { id: 'carbon', title: 'Code4Change' },
        { id: 'about', title: 'About' },
        { id: 'contact', title: 'Contact' }
    ];
    
    // Create spring store for section transitions
    const sectionSpring = spring({ y: 0 }, {
        stiffness: 0.15,
        damping: 0.65,
        precision: 0.001  // Added precision for smoother small movements
    });

    // Create a sequence of transitions
    const startSequence = async () => {
        if (container) {
            container.style.opacity = '1';
        }
    };

    startSequence();

    // Define mouse event handlers
    const onMouseDown = (event) => {
        // Check if the click target is a control button or content overlay
        if (event.target.closest('.controls') || 
        (event.target.closest('.content-overlay') && 
         !event.target.closest('.content-overlay').classList.contains('portfolio-section'))) {
        return; // Let the button or content handle the click event
    }
    
        // Prevent default behavior immediately
        event.preventDefault();
        
        const rect = container.getBoundingClientRect();
        const clickX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const clickY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Set the target position for the sun to move to
        targetSunPosition = { x: clickX, y: clickY };
        console.log("New sun target:", targetSunPosition.x, targetSunPosition.y);
    };
    
    const onMouseMove = (event) => {
        // Don't prevent default if interacting with controls or content
        if (event.target.closest('.controls') || event.target.closest('.content-overlay')) {
            return;
        }
        
        if (!isDragging) return;
        
        // Prevent default behavior during drag
        event.preventDefault();
        
        const rect = container.getBoundingClientRect();
        normalizedMousePosition.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        normalizedMousePosition.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        updateSunPosition(normalizedMousePosition.x, normalizedMousePosition.y);
    };
    
    const onMouseUp = () => {
        isDragging = false;
    };
    
    // Function to update mouse position for other effects
    const updateMousePosition = (event) => {
        const rect = container.getBoundingClientRect();
        normalizedMousePosition.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        normalizedMousePosition.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    // Add these variables near the top with other state variables
    let showDebugControls = false; // Set to true to show debug controls
    
    // Function to move sun in specific directions
    function moveSun(direction) {
        if (!fogMaterial || !fogMaterial.uniforms || !fogMaterial.uniforms.sunPosition) return;
        
        const step = 0.1; // Step size for movement
        const currentX = fogMaterial.uniforms.sunPosition.value.x;
        const currentY = fogMaterial.uniforms.sunPosition.value.y;
        
        let newX = currentX;
        let newY = currentY;
        
        switch(direction) {
            case 'up':
                newY = Math.min(1, currentY + step);
                break;
            case 'down':
                newY = Math.max(-1, currentY - step);
                break;
            case 'left':
                newX = Math.max(-1, currentX - step);
                break;
            case 'right':
                newX = Math.min(1, currentX + step);
                break;
            case 'reset':
                newX = -0.6;
                newY = -0.2;
                break;
        }
        
        updateSunPosition(newX, newY);
    }
</script>
  
<div class="main-container">
    <!-- Cloud and movement controls -->
    <div class="controls top-left">
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
        <!-- Add debug toggle button -->
        <button 
            class="control-button" 
            title="Toggle Debug Controls" 
            on:click={() => showDebugControls = !showDebugControls}
        >
            D
        </button>
    </div>

    <!-- Add sun movement debug controls -->
    {#if showDebugControls}
        <div class="controls debug-controls">
            <button class="control-button" on:click={() => moveSun('up')}>↑</button>
            <div class="horizontal-controls">
                <button class="control-button" on:click={() => moveSun('left')}>←</button>
                <button class="control-button" on:click={() => moveSun('reset')}>R</button>
                <button class="control-button" on:click={() => moveSun('right')}>→</button>
            </div>
            <button class="control-button" on:click={() => moveSun('down')}>↓</button>
        </div>
    {/if}

    <div bind:this={container} 
         class="canvas-container" 
         style="opacity: 0; 
                transition: opacity 1s ease-in-out;
                background: #000000;">
        <!-- Canvas will be added here by Three.js -->
    </div>

    <!-- Modified content overlay with pointer-events: all -->
    <div class="content-overlay" 
         style="transform: translateY({$sectionSpring.y}vh); pointer-events: all;">
        {#each sections as section, i}
            <section 
                class="portfolio-section" 
                class:active={currentSection === i}
            >
                {#if section.id === 'intro' && showIntro}
                    <div class="intro-content" 
                         in:fly="{{ y: 50, duration: 1000, delay: 500 }}"
                         out:fade>
                        <h1>
                            {#each 'Surya Vardhin Gamidi' as char, i}
                                <span style="animation-delay: {i * 0.08}s">
                                    {char === ' ' ? '\u00A0' : char}
                                </span>
                            {/each}
                        </h1>
                        <p>Web Developer & Designer</p>
                    </div>
                {:else if section.id === 'decloud'}
                    <div class="project-section" in:fly="{{ y: 50, duration: 1000 }}" out:fade>
                        <div class="project-card">
                            <div class="project-content">
                                <div class="project-header">
                                    <div class="project-header-text">
                                        <h2>Decentralized Cloud Computing</h2>
                                        <h3>Decloud</h3>
                                    </div>
                                </div>
                                
                                <div class="project-details">
                                    <h4>Overview</h4>
                                    <p>A desktop application enabling secure, decentralized sharing of computing resources.</p>
                                    
                                    <h4>Key Features</h4>
                                    <ul>
                                        <li>Two-way communication protocol over IPFS PubSub for tamper-proof records</li>
                                        <li>Automated Docker container deployment for dynamic resource provisioning</li>
                                        <li>Decentralized architecture ensuring data privacy and security</li>
                                    </ul>

                                    <h4>Implementation</h4>
                                    <p>Built using Electron and Svelte for the frontend, with IPFS for decentralized communication 
                                    and Docker for containerization. TypeScript ensures type safety and better development experience.</p>
                                </div>
                            </div>
                            <div class="tech-stack">
                                {#each ['Electron', 'Svelte', 'IPFS', 'Docker', 'TypeScript'] as tech}
                                    <span class="tech-button">{tech}</span>
                                {/each}
                            </div>
                        </div>
                    </div>
                {:else if section.id === 'recon'}
                    <div class="project-section" in:fly="{{ y: 50, duration: 1000 }}" out:fade>
                        <div class="project-card">
                            <div class="project-content">
                                <div class="project-header">
                                    <div class="project-header-text">
                                        <h2>Decentralized Messaging</h2>
                                        <h3>Recon</h3>
                                    </div>
                                </div>
                                
                                <div class="project-details">
                                    <h4>Overview</h4>
                                    <p>A decentralized mobile messaging application ensuring private and secure communication.</p>
                                    
                                    <h4>Key Features</h4>
                                    <ul>
                                        <li>Serverless architecture using GunJs for peer-to-peer data sync</li>
                                        <li>Custom event-driven protocol for seamless integration</li>
                                        <li>Cross-platform mobile deployment using Capacitor</li>
                                    </ul>

                                    <h4>Implementation</h4>
                                    <p>Developed using Svelte for the UI, GunJs for decentralized data management, 
                                    and Capacitor for native mobile deployment. TypeScript ensures robust type checking 
                                    and better code organization.</p>
                                </div>
                            </div>
                            <div class="tech-stack">
                                {#each ['Svelte', 'Capacitor', 'GunJs', 'TypeScript'] as tech}
                                    <span class="tech-button">{tech}</span>
                                {/each}
                            </div>
                        </div>
                    </div>
                {:else if section.id === 'yantra'}
                    <div class="project-section" in:fly="{{ y: 50, duration: 1000 }}" out:fade>
                        <div class="project-card">
                            <div class="project-content">
                                <div class="project-header">
                                    <div class="project-header-text">
                                        <h2>Disaster Resistant Shelter</h2>
                                        <h3>Yantra</h3>
                                    </div>
                                </div>
                                
                                <div class="project-details">
                                    <h4>Overview</h4>
                                    <p>Winner of Design-a-thon by Indian Geotechnical Society. A innovative shelter design 
                                    with advanced safety features.</p>
                                    
                                    <h4>Key Features</h4>
                                    <ul>
                                        <li>Advanced structural analysis using Python</li>
                                        <li>Comprehensive stress and fluid analysis</li>
                                        <li>Mechanical contraptions for enhanced safety</li>
                                    </ul>

                                    <h4>Implementation</h4>
                                    <p>Utilized Python with NumPy for computational analysis and Matplotlib for 
                                    visualization of stress distributions and fluid dynamics.</p>
                                </div>
                            </div>
                            <div class="tech-stack">
                                {#each ['Python', 'NumPy', 'Matplotlib'] as tech}
                                    <span class="tech-button">{tech}</span>
                                {/each}
                            </div>
                        </div>
                    </div>
                {:else if section.id === 'carbon'}
                    <div class="project-section" in:fly="{{ y: 50, duration: 1000 }}" out:fade>
                        <div class="project-card">
                            <div class="project-content">
                                <div class="project-header">
                                    <div class="project-header-text">
                                        <h2>Carbon Credit Marketplace</h2>
                                        <h3>Code4Change</h3>
                                    </div>
                                </div>
                                
                                <div class="project-details">
                                    <h4>Overview</h4>
                                    <p>Finalist in IEEE Code4Change 2.0. A blockchain-based marketplace for carbon credits.</p>
                                    
                                    <h4>Key Features</h4>
                                    <ul>
                                        <li>Transparent carbon credit trading system</li>
                                        <li>Secure blockchain transactions</li>
                                        <li>Cross-platform mobile application</li>
                                    </ul>

                                    <h4>Implementation</h4>
                                    <p>Built using React Native for cross-platform compatibility, with Ethereum blockchain 
                                    for secure and transparent transactions.</p>
                                </div>
                            </div>
                            <div class="tech-stack">
                                {#each ['React Native', 'Ethereum', 'Blockchain'] as tech}
                                    <span class="tech-button">{tech}</span>
                                {/each}
                            </div>
                        </div>
                    </div>
                {:else if section.id === 'about'}
                    <div class="about-content"
                         in:fly="{{ y: 50, duration: 1000 }}"
                         out:fade>
                        <h2>About Me</h2>
                        <div class="about-details">
                            <!-- Primary Panel -->
                            <div class="about-panel primary-panel">
                                <p>I'm a Computer Science student at Vellore Institute of Technology, specializing in Data Science. My passion lies in developing decentralized applications and exploring innovative solutions in cloud computing and blockchain technology.</p>
                            </div>

                            <!-- Skills Panel -->
                            <div class="about-panel skills-panel">
                                <div class="panel-header">
                                    <h3>Technical Expertise</h3>
                                </div>
                                <div class="skills-grid">
                                    <div class="skill-panel">
                                        <h4>Languages</h4>
                                        <p>Python, Svelte, React Native, Solidity, SQL, TypeScript</p>
                                    </div>
                                    <div class="skill-panel">
                                        <h4>Developer Tools</h4>
                                        <p>VMWare, Cursor, Azure, Android Studio, Docker</p>
                                    </div>
                                    <div class="skill-panel">
                                        <h4>Technologies</h4>
                                        <p>Arch Linux, GunJs, Cloudflare, TensorFlow, IPFS, Ethereum/Hardhat</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Achievements Panel -->
                            <div class="about-panel achievements-panel">
                                <div class="panel-header">
                                    <h3>Current Endeavors</h3>
                                </div>
                                <ul>
                                    <li>Researching NAT Traversal improvements for P2P connections</li>
                                    <li>Developing a patent-pending IoT solution for accessibility</li>
                                    <li>Editorial Head at VIT's English Literary Association</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                {:else if section.id === 'contact'}
                    <div class="contact-content"
                         in:fly="{{ y: 50, duration: 1000 }}"
                         out:fade>
                        <h2>Get in Touch</h2>
                        <div class="contact-details">
                            <div class="contact-links">
                                <a href="mailto:suryavardhin@gmail.com" class="contact-link">
                                    <svelte:component this={Mail} size={24} />
                                    suryavardhin@gmail.com
                                </a>
                                <a href="tel:+919398026360" class="contact-link">
                                    <svelte:component this={Phone} size={24} />
                                    +91 939 802 6360
                                </a>
                                <a href="https://linkedin.com/in/vardhin/" target="_blank" rel="noopener noreferrer" class="contact-link">
                                    <svelte:component this={Linkedin} size={24} />
                                    linkedin.com/in/vardhin
                                </a>
                                <a href="https://github.com/vardhin" target="_blank" rel="noopener noreferrer" class="contact-link">
                                    <svelte:component this={Github} size={24} />
                                    github.com/vardhin
                                </a>
                                <a href="https://vardhin.tech/" target="_blank" rel="noopener noreferrer" class="contact-link">
                                    <svelte:component this={Globe} size={24} />
                                    vardhin.tech
                                </a>
                            </div>
                        </div>
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
        margin: 0;
        padding: 0;
        background: #000000;
        overflow-x: hidden;
    }

    .main-container {
        width: 100%;
        margin: 0;
        padding: 0;
        z-index: 1;
    }

    .controls {
        position: fixed;
        display: flex;
        gap: 10px;
        z-index: 1002;
    }

    .top-left {
        top: 20px;
        left: 20px;
    }

    /* Debug controls positioning */
    .debug-controls {
        bottom: 20px;
        right: 20px;
        flex-direction: column;
        align-items: center;
    }

    .horizontal-controls {
        display: flex;
        gap: 10px;
    }

    .control-button {
        width: 40px;
        height: 40px;
        padding: 0;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.25);
        color: white;
        cursor: pointer;
        font-size: 16px;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        -webkit-tap-highlight-color: transparent;
        z-index: 1002;
        touch-action: manipulation;
        user-select: none;
    }

    .control-button:hover {
        background: rgba(255, 255, 255, 0.25);
        transform: translateY(-2px);
    }

    .control-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        pointer-events: none;
    }

    .canvas-container {
        width: 100%;
        height: 100vh;
        position: fixed;
        top: 0;
        left: 0;
        opacity: 0;
        transition: opacity 1s ease-in-out;
        background: #000000;
        z-index: 1;
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        touch-action: none;
    }

    .content-overlay {
        position: absolute;
        width: 100%;
        z-index: 2;
        pointer-events: none;
        transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .portfolio-section {
        height: 100vh;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        pointer-events: auto;
        /* Add proper spacing between sections */
        margin-bottom: 20vh; /* Creates space between sections */
    }

    /* Ensure the last section doesn't have extra margin */
    .portfolio-section:last-child {
        margin-bottom: 0;
    }

    /* Intro section styles */
    .intro-content {
        text-align: center;
        pointer-events: none;
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem;
    }

    .intro-content h1 {
        font-size: 3.5rem;
        margin-bottom: 1.5rem;
        font-weight: 300;
        letter-spacing: 0.05em;
        text-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
    }

    .intro-content h1 span {
        display: inline-block;
        opacity: 0;
        animation: dreamyFadeIn 1.2s forwards cubic-bezier(0.4, 0, 0.2, 1);
        filter: blur(0);
        transform-origin: bottom;
    }

    .intro-content p {
        font-size: 1.5rem;
        font-weight: 200;
        letter-spacing: 0.08em;
        opacity: 0;
        animation: dreamyFadeIn 1.5s forwards cubic-bezier(0.4, 0, 0.2, 1);
        animation-delay: 1.5s;
        text-shadow: 0 0 15px rgba(255, 255, 255, 0.2);
    }

    @keyframes dreamyFadeIn {
        0% {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
            filter: blur(10px);
        }
        60% {
            opacity: 0.5;
            filter: blur(5px);
        }
        100% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
        }
    }

    /* Project section styles */
    .project-section {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        max-width: 1200px;
        margin: 0 auto;
        /* Add vertical padding to create more space */
        padding: 5vh 2rem;
    }

    .project-card {
        background: rgba(255, 255, 255, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 16px;
        padding: 2rem;
        width: 100%;
        max-width: 800px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        backdrop-filter: blur(8px);
        position: relative;
    }

    .project-content {
        display: flex;
        flex-direction: column;
    }

    .project-header {
        margin-bottom: 1.5rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 1rem;
    }

    .project-header-text h2 {
        font-size: 1rem;
        font-weight: 300;
        margin: 0;
        letter-spacing: 0.05em;
        color: rgba(255, 255, 255, 0.7);
        text-transform: uppercase;
    }

    .project-header-text h3 {
        font-size: 2rem;
        font-weight: 500;
        margin: 0.25rem 0 0;
        color: rgba(255, 255, 255, 0.95);
    }

    .project-details {
        margin-bottom: 1.5rem;
    }

    .project-details h4 {
        font-size: 1.1rem;
        font-weight: 500;
        margin: 1.5rem 0 0.75rem;
        color: rgba(255, 255, 255, 0.9);
    }

    .project-details h4:first-child {
        margin-top: 0;
    }

    .project-details p {
        font-size: 1rem;
        line-height: 1.6;
        color: rgba(255, 255, 255, 0.8);
        margin-bottom: 1rem;
    }

    .project-details ul {
        list-style-type: none;
        padding: 0;
        margin: 0 0 1rem;
    }

    .project-details li {
        position: relative;
        padding-left: 1.25rem;
        margin-bottom: 0.75rem;
        line-height: 1.5;
        font-size: 1rem;
        color: rgba(255, 255, 255, 0.8);
    }

    .project-details li::before {
        content: "•";
        position: absolute;
        left: 0;
        color: rgba(255, 255, 255, 0.6);
    }

    .tech-stack {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        margin-top: 1.5rem;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        padding-top: 1.5rem;
    }

    .tech-button {
        background: rgba(255, 255, 255, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.25);
        border-radius: 20px;
        padding: 0.5rem 1rem;
        color: white;
        font-size: 0.9rem;
        transition: all 0.2s ease;
    }

    .tech-button:hover {
        background: rgba(255, 255, 255, 0.25);
        transform: translateY(-2px);
    }

    /* About section styles */
    .about-content {
        max-width: 800px;
        width: 100%;
        padding: 2rem;
        background: rgba(255, 255, 255, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        backdrop-filter: blur(8px);
        margin: 10vh auto;
    }

    .about-content h2 {
        font-size: 2.5rem;
        font-weight: 300;
        margin-bottom: 1.5rem;
        text-align: center;
        letter-spacing: 0.05em;
    }

    .about-details {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .about-panel {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 12px;
        padding: 1.5rem;
    }

    .primary-panel p {
        font-size: 1.1rem;
        line-height: 1.6;
        margin: 0;
    }

    .panel-header {
        margin-bottom: 1rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 0.5rem;
    }

    .panel-header h3 {
        font-size: 1.3rem;
        font-weight: 400;
        margin: 0;
    }

    .skills-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
    }

    .skill-panel {
        background: rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        padding: 1rem;
    }

    .skill-panel h4 {
        font-size: 1rem;
        font-weight: 500;
        margin: 0 0 0.5rem;
        color: rgba(255, 255, 255, 0.9);
    }

    .skill-panel p {
        font-size: 0.9rem;
        line-height: 1.5;
        margin: 0;
        color: rgba(255, 255, 255, 0.7);
    }

    .achievements-panel ul {
        list-style-type: none;
        padding: 0;
        margin: 0;
    }

    .achievements-panel li {
        position: relative;
        padding-left: 1.25rem;
        margin-bottom: 0.75rem;
        line-height: 1.5;
        font-size: 1rem;
        color: rgba(255, 255, 255, 0.8);
    }

    .achievements-panel li::before {
        content: "•";
        position: absolute;
        left: 0;
        color: rgba(255, 255, 255, 0.6);
    }

    .achievements-panel li:last-child {
        margin-bottom: 0;
    }

    /* Contact section styles */
    .contact-content {
        max-width: 600px;
        width: 100%;
        padding: 2rem;
        background: rgba(255, 255, 255, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        backdrop-filter: blur(8px);
        margin: 10vh auto;
    }

    .contact-content h2 {
        font-size: 2.5rem;
        font-weight: 300;
        margin-bottom: 1.5rem;
        text-align: center;
        letter-spacing: 0.05em;
    }

    .contact-links {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .contact-link {
        display: flex;
        align-items: center;
        gap: 1rem;
        font-size: 1.1rem;
        color: rgba(255, 255, 255, 0.9);
        text-decoration: none;
        padding: 1rem;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.15);
        transition: all 0.3s ease;
    }

    .contact-link:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: translateX(5px);
    }

    /* Responsive styles */
    @media (max-width: 768px) {
        .intro-content h1 {
            font-size: 2.5rem;
        }

        .intro-content p {
            font-size: 1.2rem;
        }

        .project-card, .about-content, .contact-content {
            padding: 1.5rem;
        }

        .project-header-text h3 {
            font-size: 1.5rem;
        }

        .project-details h4 {
            font-size: 1rem;
        }

        .project-details p, .project-details li {
            font-size: 0.9rem;
        }

        .tech-button {
            font-size: 0.8rem;
            padding: 0.4rem 0.8rem;
        }

        .about-content h2, .contact-content h2 {
            font-size: 2rem;
        }

        .skills-grid {
            grid-template-columns: 1fr;
        }

        .contact-link {
            font-size: 0.9rem;
            padding: 0.75rem;
        }

        .portfolio-section {
            margin-bottom: 15vh; /* Slightly less space on smaller screens */
        }
        
        .about-content, .contact-content {
            margin: 8vh auto;
        }
    }

    @media (max-width: 480px) {
        .portfolio-section {
            padding: 1rem;
        }

        .intro-content h1 {
            font-size: 2rem;
        }

        .intro-content p {
            font-size: 1rem;
        }

        .project-card, .about-content, .contact-content {
            padding: 1.25rem;
        }

        .project-header-text h3 {
            font-size: 1.3rem;
        }

        .about-content h2, .contact-content h2 {
            font-size: 1.75rem;
        }

        .portfolio-section {
            margin-bottom: 10vh; /* Even less space on mobile */
        }
        
        .about-content, .contact-content {
            margin: 5vh auto;
        }
    }

    /* Landscape orientation adjustments */
    @media (max-height: 480px) and (orientation: landscape) {
        .portfolio-section {
            padding: 1rem;
            align-items: flex-start;
            overflow-y: auto;
        }

        .intro-content h1 {
            font-size: 1.75rem;
            margin-bottom: 0.5rem;
        }

        .intro-content p {
            font-size: 0.9rem;
        }

        .project-card, .about-content, .contact-content {
            max-height: 80vh;
            overflow-y: auto;
        }
    }
</style>

<link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;600;700&display=swap" rel="stylesheet" crossorigin="anonymous">



