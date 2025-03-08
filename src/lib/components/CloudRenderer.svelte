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
    import { Mail, Phone, Linkedin, Globe } from 'lucide-svelte';
  
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

    // Update the handleNavButtonPress function
    const handleNavButtonPress = (direction) => {
        if (isNavigating) return;
        
        switch(direction) {
            case 'up':
                if (currentSection > MIN_SECTION) {
                    isNavigating = true;
                    currentSection--;
                    targetCameraY = currentSection * -5;
                    sectionSpring.set({ y: currentSection * -100 });
                    
                    navigationTimeout = setTimeout(() => {
                        isNavigating = false;
                    }, 500);
                }
                break;
            case 'down':
                if (currentSection < MAX_SECTION) {
                    isNavigating = true;
                    currentSection++;
                    targetCameraY = currentSection * -5;
                    sectionSpring.set({ y: currentSection * -100 });
                    
                    navigationTimeout = setTimeout(() => {
                        isNavigating = false;
                    }, 500);
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

    // Add these touch event handlers near the other mouse handlers
    const onTouchStart = (event) => {
        // Check if the touch target is a control button
        if (event.target.closest('.controls')) {
            return; // Let the button handle the touch event
        }
        
        event.preventDefault(); // Prevent scrolling only for canvas interactions
        const touch = event.touches[0];
        const rect = container.getBoundingClientRect();
        
        normalizedMousePosition.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        normalizedMousePosition.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
        
        if (fogMaterial) {
            const sunPos = fogMaterial.uniforms.sunPosition.value;
            const distance = Math.sqrt(
                Math.pow((normalizedMousePosition.x - sunPos.x), 2) + 
                Math.pow((normalizedMousePosition.y - sunPos.y), 2)
            );
            
            if (distance < 0.3) {
                isDragging = true;
            }
        }
    };

    const onTouchMove = (event) => {
        // Don't prevent default if touching controls
        if (event.target.closest('.controls')) {
            return;
        }
        
        if (!isDragging) return;
        event.preventDefault();
        
        const touch = event.touches[0];
        const rect = container.getBoundingClientRect();
        
        normalizedMousePosition.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        normalizedMousePosition.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
        
        if (fogMaterial) {
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

    const onTouchEnd = () => {
        isDragging = false;
    };

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
          if (isNavigating) return; // Prevent multiple navigations
          
          switch(event.key.toLowerCase()) {
              case 'arrowup':
              case 'w':
                  handleNavButtonPress('up');
                  break;
              case 'arrowdown':
              case 's':
                  handleNavButtonPress('down');
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

            // Update section based on key state
            if (keyState.up && currentSection > MIN_SECTION) {
                currentSection--;
                targetCameraY = currentSection * -7.5;
                sectionSpring.set({ y: currentSection * -100 });
            } else if (keyState.down && currentSection < MAX_SECTION) {
                currentSection++;
                targetCameraY = currentSection * -7.5;
                sectionSpring.set({ y: currentSection * -100 });
            }

            // Smoothly interpolate camera position
            cameraPosition.y = THREE.MathUtils.lerp(
                cameraPosition.y, 
                targetCameraY, 
                CAMERA_SMOOTHING
            );
            
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
                const baseTimeIncrement = 0.036;
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
      container.addEventListener('touchstart', onTouchStart, { passive: false });
      container.addEventListener('touchmove', onTouchMove, { passive: false });
      container.addEventListener('touchend', onTouchEnd);
      container.addEventListener('touchcancel', onTouchEnd);
  
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
        container.removeEventListener('touchend', onTouchEnd);
        container.removeEventListener('touchcancel', onTouchEnd);
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
        clearTimeout(navigationTimeout);
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
    </div>

    <!-- Navigation controls -->
    <div class="controls nav-controls">
        <button 
            class="control-button nav-button"
            on:mousedown={() => handleNavButtonPress('up')}
            on:mouseup={() => handleNavButtonRelease('up')}
            on:mouseleave={() => handleNavButtonRelease('up')}
            on:touchstart|preventDefault={() => handleNavButtonPress('up')}
            on:touchend|preventDefault={() => handleNavButtonRelease('up')}
            disabled={currentSection <= MIN_SECTION}
        >
            <svelte:component this={ChevronUp} size={20} />
        </button>
        <button 
            class="control-button nav-button"
            on:mousedown={() => handleNavButtonPress('down')}
            on:mouseup={() => handleNavButtonRelease('down')}
            on:mouseleave={() => handleNavButtonRelease('down')}
            on:touchstart|preventDefault={() => handleNavButtonPress('down')}
            on:touchend|preventDefault={() => handleNavButtonRelease('down')}
            disabled={currentSection >= MAX_SECTION}
        >
            <svelte:component this={ChevronDown} size={20} />
        </button>
    </div>

    <div bind:this={container} 
         class="canvas-container" 
         style="opacity: 0; 
                transition: opacity 1s ease-in-out;
                background: #000000;">
        <!-- Canvas will be added here by Three.js -->
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
        /* Remove overflow: hidden to enable scrolling */
    }

    :global(::-webkit-scrollbar) {
        display: none; /* Hide scrollbar for Chrome/Safari/Opera */
    }

    .main-container {
        width: 100%;
        /* Remove height: 100vh and position: fixed to enable scrolling */
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

    .nav-controls {
        right: 20px;
        bottom: 20px;
        flex-direction: column;
        touch-action: none; /* Prevent default touch actions */
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
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        -webkit-tap-highlight-color: transparent;
        z-index: 1002;
        touch-action: manipulation; /* Optimize for touch */
        user-select: none; /* Prevent text selection */
    }

    .control-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        pointer-events: none; /* Prevent any interaction when disabled */
    }

    .nav-button {
        background: rgba(255, 255, 255, 0.15);
        transition: opacity 0.3s ease, background-color 0.3s ease;
    }

    .nav-button:disabled {
        opacity: 0.3;
        background: rgba(255, 255, 255, 0.05);
    }

    .canvas-container {
        width: 100%;
        height: 100vh;
        position: fixed; /* Keep canvas fixed */
        top: 0;
        left: 0;
        opacity: 0;
        transition: opacity 1s ease-in-out;
        background: #000000;
        z-index: 1;
    }

    .fade-in {
        opacity: 1;
        visibility: visible;
    }

    /* Mobile optimizations */
    @media (pointer: coarse) {
        .control-button {
            width: 48px;
            height: 48px;
            font-size: 20px;
        }
        
        .top-left {
            top: 24px;
            left: 24px;
            gap: 16px;
        }

        .nav-controls {
            right: 24px;
            bottom: 24px;
            gap: 16px;
        }

        canvas {
            touch-action: none;
        }
    }

    .content-overlay {
        position: relative; /* Change from fixed to relative */
        width: 100%;
        z-index: 2;
        /* Remove transform property - we'll handle section positioning differently */
    }

    .portfolio-section {
        height: 100vh;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        pointer-events: none;
        /* Add scroll-snap properties */
        scroll-snap-align: start;
        scroll-snap-stop: always;
    }

    /* Add scroll-snap container */
    .content-overlay {
        scroll-snap-type: y mandatory;
        overflow-y: auto;
        height: 100vh;
    }

    .portfolio-section.active {
        opacity: 1;
    }

    .intro-content {
        text-align: center;
        pointer-events: none;
    }

    .intro-content h1 {
        font-size: 3rem;
        margin-bottom: 1rem;
        font-weight: 300;  /* Made lighter */
        letter-spacing: 0.05em;  /* Increased letter spacing */
        text-shadow: 0 0 20px rgba(255, 255, 255, 0.3);  /* Added glow effect */
    }

    .intro-content h1 span {
        display: inline-block;
        opacity: 0;
        animation: dreamyFadeIn 1.2s forwards cubic-bezier(0.4, 0, 0.2, 1);  /* Slower, smoother animation */
        filter: blur(0);
        transform-origin: bottom;
    }

    .intro-content p {
        font-size: 1.5rem;
        font-weight: 200;  /* Made even lighter */
        letter-spacing: 0.08em;  /* Increased letter spacing */
        opacity: 0;
        animation: dreamyFadeIn 1.5s forwards cubic-bezier(0.4, 0, 0.2, 1);
        animation-delay: 1.5s;  /* Increased delay */
        text-shadow: 0 0 15px rgba(255, 255, 255, 0.2);  /* Added subtle glow */
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

    /* Add any missing animation styles */
    :global(.fly-enter) {
        opacity: 0;
        transform: translateY(50px);
    }

    :global(.fly-enter-active) {
        opacity: 1;
        transform: translateY(0);
        transition: all 1000ms ease;
    }

    :global(.fade-out) {
        opacity: 0;
        transition: opacity 300ms ease;
    }

    /* Project card styles */
    .project-card {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        padding: 1rem;
        width: 100%;
        max-width: 800px;
        margin: 0 auto;
        position: relative; /* For positioning the tech stack */
        display: flex;
    }

    .project-content {
        width: 100%;
    }

    .tech-stack {
        position: absolute;
        right: -120px; /* Position outside the card */
        top: 0;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        padding-left: 0.75rem;
        border-left: 1px solid rgba(255, 255, 255, 0.06);
        min-width: 120px;
        height: 100%;
    }

    /* Mobile optimizations */
    @media (max-width: 768px) {
        .project-card {
            max-width: calc(100% - 2rem);
            padding: 0.75rem;
            margin-bottom: 3rem; /* Space for tech stack below */
        }

        .tech-stack {
            position: absolute;
            right: 0;
            top: 100%; /* Position below the card */
            left: 0;
            flex-direction: row;
            flex-wrap: wrap;
            padding: 0.75rem 0 0 0;
            border-left: none;
            border-top: 1px solid rgba(255, 255, 255, 0.06);
            min-width: 0;
            height: auto;
        }
    }

    .project-header {
        margin-bottom: 0.75rem;
    }

    .project-header h2 {
        font-size: 0.8rem;
        font-weight: 300;
        margin: 0;
        letter-spacing: 0.02em;
        color: rgba(255, 255, 255, 0.7);
    }

    .project-header h3 {
        font-size: 1.2rem;
        font-weight: 400;
        margin: 0.25rem 0 0;
        color: rgba(255, 255, 255, 0.9);
    }

    .project-details h4 {
        font-size: 0.7rem;
        font-weight: 500;
        margin: 0.75rem 0 0.25rem;
        color: rgba(255, 255, 255, 0.7);
    }

    .project-details p {
        font-size: 0.7rem;
        line-height: 1.4;
        color: rgba(255, 255, 255, 0.6);
        margin-bottom: 0.5rem;
    }

    .project-details ul {
        list-style-type: none;
        padding: 0;
        margin: 0 0 0.5rem;
    }

    .project-details li {
        position: relative;
        padding-left: 0.75rem;
        margin-bottom: 0.25rem;
        line-height: 1.3;
        font-size: 0.7rem;
        color: rgba(255, 255, 255, 0.6);
    }

    .project-details li::before {
        content: "•";
        position: absolute;
        left: 0;
        color: rgba(255, 255, 255, 0.4);
    }

    .tech-button {
        font-size: 0.6rem;
        padding: 0.2rem 0.4rem;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 4px;
        color: rgba(255, 255, 255, 0.6);
        transition: all 0.2s ease;
    }

    .tech-button:hover {
        background: rgba(255, 255, 255, 0.08);
        color: rgba(255, 255, 255, 0.8);
    }

    /* Mobile optimizations */
    @media (max-width: 768px) {
        .project-card {
            max-width: calc(100% - 2rem);
            padding: 0.75rem;
        }

        .project-header h2 {
            font-size: 0.7rem;
        }

        .project-header h3 {
            font-size: 1rem;
        }

        .project-details h4,
        .project-details p,
        .project-details li {
            font-size: 0.65rem;
        }

        .tech-button {
            font-size: 0.55rem;
            padding: 0.15rem 0.35rem;
        }
    }

    .github-button {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 8px;
        padding: 0.35rem 0.6rem;
        color: rgba(255, 255, 255, 0.9);
        font-size: 0.7rem;
        text-decoration: none;
        transition: all 0.2s ease;
        margin-top: 0;
        white-space: nowrap;
    }

    .github-button:hover {
        background: rgba(255, 255, 255, 0.12);
        transform: translateY(-1px);
    }

    /* About section */
    .about-details {
        max-width: 800px;
        margin: 0 auto;
    }

    .about-content p {
        font-size: 1.1rem;
        line-height: 1.6;
        margin-bottom: 2rem;
        color: rgba(255, 255, 255, 0.9);
    }

    .skills-section, .achievements-section {
        margin-bottom: 2rem;
    }

    .skills-section h3, .achievements-section h3 {
        font-size: 1.5rem;
        font-weight: 400;
        margin-bottom: 1rem;
        color: rgba(255, 255, 255, 0.95);
    }

    .skills-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
        margin-top: 1rem;
    }

    .skill-category h4 {
        font-size: 1.1rem;
        font-weight: 500;
        margin-bottom: 0.5rem;
        color: rgba(255, 255, 255, 0.9);
    }

    .skill-category p {
        font-size: 0.95rem;
        line-height: 1.5;
        color: rgba(255, 255, 255, 0.8);
    }

    .achievements-section ul {
        list-style: none;
        padding: 0;
    }

    .achievements-section li {
        font-size: 1rem;
        line-height: 1.6;
        margin-bottom: 0.5rem;
        padding-left: 1.5rem;
        position: relative;
        color: rgba(255, 255, 255, 0.8);
    }

    .achievements-section li::before {
        content: "•";
        position: absolute;
        left: 0.5rem;
        color: rgba(255, 255, 255, 0.6);
    }

    /* Contact section */
    .contact-details {
        max-width: 600px;
        margin: 0 auto;
    }

    .contact-links {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        margin-top: 2rem;
    }

    .contact-link {
        display: flex;
        align-items: center;
        gap: 1rem;
        font-size: 1.1rem;
        color: rgba(255, 255, 255, 0.9);
        text-decoration: none;
        padding: 0.75rem;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        transition: all 0.3s ease;
    }

    .contact-link:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: translateX(5px);
    }

    /* Mobile responsiveness */
    @media (max-width: 768px) {
        .about-content p {
            font-size: 1rem;
        }

        .skills-section h3, .achievements-section h3 {
            font-size: 1.25rem;
        }

        .skill-category h4 {
            font-size: 1rem;
        }

        .skill-category p {
            font-size: 0.9rem;
        }

        .contact-link {
            font-size: 0.95rem;
        }
    }

    /* Typography helper classes */
    .text-light {
        font-weight: 300;
    }

    .text-regular {
        font-weight: 400;
    }

    .text-medium {
        font-weight: 400;
    }

    .text-semibold {
        font-weight: 500;
    }

    .text-bold {
        font-weight: 600;
    }

    /* Text size helpers */
    .text-sm {
        font-size: 0.875rem;
    }

    .text-base {
        font-size: 1rem;
    }

    .text-lg {
        font-size: 1.125rem;
    }

    .text-xl {
        font-size: 1.25rem;
    }

    .text-2xl {
        font-size: 1.5rem;
    }

    .text-3xl {
        font-size: 2rem;
    }

    /* Line height helpers */
    .leading-tight {
        line-height: 1.25;
    }

    .leading-normal {
        line-height: 1.5;
    }

    .leading-relaxed {
        line-height: 1.7;
    }

    /* Add these media queries at the end of your style section */

    @media screen and (max-width: 768px) {
        /* Intro content mobile adjustments */
        .intro-content h1 {
            font-size: 2rem; /* Reduced from 3rem */
        }

        .intro-content p {
            font-size: 1.125rem; /* Reduced from 1.5rem */
        }

        /* Project content mobile adjustments */
        .project-content h3 {
            font-size: 1.25rem; /* Reduced from 1.5rem */
        }

        .project-description {
            font-size: 0.875rem; /* Reduced from 1rem */
        }

        .tech-tag {
            font-size: 0.75rem; /* Reduced from 0.875rem */
        }

        .project-link {
            font-size: 0.75rem; /* Reduced from 0.875rem */
        }

        /* About section mobile adjustments */
        .about-content h2 {
            font-size: 1.875rem; /* Reduced from 2.5rem */
        }

        .about-content p {
            font-size: 1rem; /* Reduced from 1.125rem */
        }

        /* Contact section mobile adjustments */
        .contact-content h2 {
            font-size: 1.875rem; /* Reduced from 2.5rem */
        }

        /* Text size helper classes mobile adjustments */
        .text-sm {
            font-size: 0.75rem;
        }

        .text-base {
            font-size: 0.875rem;
        }

        .text-lg {
            font-size: 1rem;
        }

        .text-xl {
            font-size: 1.125rem;
        }

        .text-2xl {
            font-size: 1.25rem;
        }

        .text-3xl {
            font-size: 1.5rem;
        }
    }

    /* Additional adjustments for very small screens */
    @media screen and (max-width: 480px) {
        .intro-content h1 {
            font-size: 1.75rem;
        }

        .intro-content p {
            font-size: 1rem;
        }

        /* Adjust section padding for smaller screens */
        .portfolio-section {
            padding: 1rem;
        }
    }

    /* Landscape orientation adjustments */
    @media screen and (max-height: 480px) and (orientation: landscape) {
        .intro-content h1 {
            font-size: 1.5rem;
            margin-bottom: 0.5rem;
        }

        .intro-content p {
            font-size: 0.875rem;
        }

        .portfolio-section {
            padding: 0.75rem;
        }
    }

    /* Add to your existing style section */
    .projects-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 2rem;
        width: 100%;
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
        pointer-events: auto;
    }

    .project-card {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        padding: 1.75rem;
        width: 100%;
        max-width: 700px;
        margin: 0 auto;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
    }

    .project-header {
        margin-bottom: 1.5rem;
        text-align: left;  /* Changed from center */
    }

    .project-header h2 {
        font-size: 2rem;
        font-weight: 300;
        margin: 0;
        letter-spacing: 0.02em;
    }

    .project-header h3 {
        font-size: 1.25rem;
        font-weight: 400;
        margin: 0.25rem 0 0;
        color: rgba(255, 255, 255, 0.8);
    }

    .tech-stack {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-bottom: 1.5rem;
        justify-content: flex-start;  /* Changed from center */
    }

    .tech-button {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 12px;
        padding: 0.35rem 0.75rem;
        color: rgba(255, 255, 255, 0.9);
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .project-details {
        margin-bottom: 1.5rem;
    }

    .project-details h4 {
        font-size: 1.1rem;
        font-weight: 500;
        margin: 1.25rem 0 0.75rem;
        color: rgba(255, 255, 255, 0.9);
    }

    .project-details h4:first-child {
        margin-top: 0;
    }

    .project-details p {
        font-size: 0.95rem;
        line-height: 1.6;
        color: rgba(255, 255, 255, 0.8);
        margin-bottom: 0.75rem;
    }

    .project-details ul {
        list-style-type: none;
        padding: 0;
        margin: 0 0 0.75rem;
    }

    .project-details li {
        position: relative;
        padding-left: 1.25rem;
        margin-bottom: 0.4rem;
        line-height: 1.5;
        font-size: 0.95rem;
        color: rgba(255, 255, 255, 0.8);
    }

    .project-details li::before {
        content: "•";
        position: absolute;
        left: 0;
        color: rgba(255, 255, 255, 0.6);
    }

    .project-links {
        display: flex;
        justify-content: flex-start;  /* Changed from center */
        margin-top: 1.5rem;
    }

    .github-button {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 8px;
        padding: 0.35rem 0.6rem;
        color: rgba(255, 255, 255, 0.9);
        font-size: 0.7rem;
        text-decoration: none;
        transition: all 0.2s ease;
        margin-top: 0;
        white-space: nowrap;
    }

    .github-button:hover {
        background: rgba(255, 255, 255, 0.12);
        transform: translateY(-1px);
    }

    /* Mobile responsiveness */
    @media (max-width: 768px) {
        .project-card {
            padding: 1.25rem;
            border-radius: 14px;
        }

        .project-header h2 {
            font-size: 1.75rem;
        }

        .project-header h3 {
            font-size: 1.1rem;
        }

        .tech-button {
            font-size: 0.8rem;
            padding: 0.3rem 0.6rem;
        }

        .project-details h4 {
            font-size: 1rem;
        }

        .project-details p,
        .project-details li {
            font-size: 0.9rem;
        }
    }

    /* Updated and optimized styles */
    .projects-container {
        width: 100%;
        max-width: 1400px;
        margin: 0 auto;
        padding: 2rem;
    }

    .project-section {
        opacity: 0;
        animation: fadeIn 0.5s ease forwards;
    }

    .project-card {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 1.5rem;
        transition: all 0.3s ease;
        height: 100%;
    }

    .project-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        background: rgba(255, 255, 255, 0.08);
    }

    .project-content {
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    .project-content h3 {
        margin: 0 0 1rem;
        font-size: 1.5rem;
        font-weight: 500;
        line-height: 1.4;
    }

    .tech-stack {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-bottom: 1rem;
    }

    .tech-tag {
        background: rgba(255, 255, 255, 0.1);
        padding: 0.25rem 0.75rem;
        border-radius: 1rem;
        font-size: 0.75rem;
        transition: background 0.2s ease;
    }

    .tech-tag:hover {
        background: rgba(255, 255, 255, 0.15);
    }

    .project-description {
        flex: 1;
        margin: 0 0 1rem;
        line-height: 1.6;
        font-size: 0.95rem;
    }

    .project-links {
        margin-top: auto;
    }

    .project-link {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        text-decoration: none;
        color: white;
        opacity: 0.8;
        transition: opacity 0.2s ease;
        font-size: 0.9rem;
    }

    .project-link:hover {
        opacity: 1;
    }

    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }

    .projects-container {
        width: 100%;
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .project-card {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        padding: 2.5rem;
        width: 100%;
        max-width: 800px;
        margin: 0 auto;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
    }

    .project-header {
        margin-bottom: 2rem;
        text-align: center;
    }

    .project-header h2 {
        font-size: 2.5rem;
        font-weight: 300;
        margin: 0;
        letter-spacing: 0.05em;
    }

    .project-header h3 {
        font-size: 1.5rem;
        font-weight: 400;
        margin: 0.5rem 0 0;
        color: rgba(255, 255, 255, 0.8);
    }

    .tech-stack {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        margin-bottom: 2rem;
        justify-content: center;
    }

    .tech-button {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 20px;
        padding: 0.5rem 1rem;
        color: white;
        font-size: 0.9rem;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .tech-button:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: translateY(-2px);
    }

    .project-details {
        margin-bottom: 2rem;
    }

    .project-details h4 {
        font-size: 1.2rem;
        font-weight: 500;
        margin: 1.5rem 0 1rem;
        color: rgba(255, 255, 255, 0.9);
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
        padding-left: 1.5rem;
        margin-bottom: 0.5rem;
        line-height: 1.6;
        color: rgba(255, 255, 255, 0.8);
    }

    .project-details li::before {
        content: "•";
        position: absolute;
        left: 0;
        color: rgba(255, 255, 255, 0.6);
    }

    .project-links {
        display: flex;
        justify-content: center;
        margin-top: 2rem;
    }

    .github-button {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 8px;
        padding: 0.35rem 0.6rem;
        color: rgba(255, 255, 255, 0.9);
        font-size: 0.7rem;
        text-decoration: none;
        transition: all 0.2s ease;
        margin-top: 0;
        white-space: nowrap;
    }

    .github-button:hover {
        background: rgba(255, 255, 255, 0.12);
        transform: translateY(-1px);
    }

    @media (max-width: 768px) {
        .projects-container {
            padding: 1rem;
        }

        .project-card {
            padding: 1.5rem;
        }

        .project-header h2 {
            font-size: 2rem;
        }

        .project-header h3 {
            font-size: 1.25rem;
        }

        .tech-stack {
            gap: 0.5rem;
        }

        .tech-button {
            font-size: 0.8rem;
            padding: 0.4rem 0.8rem;
        }
    }

    .project-details-container {
        display: flex;
        gap: 1.5rem;
        flex: 1;
        min-height: 0; /* Important for proper scrolling */
    }

    .project-details {
        flex: 1;
        overflow-y: auto;
        padding-right: 1rem;
    }

    .tech-stack {
        width: 120px; /* Fixed width for tech stack */
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        padding-top: 0;
        border-top: none;
        border-left: 1px solid rgba(255, 255, 255, 0.1);
        padding-left: 1rem;
    }

    .tech-button {
        font-size: 0.6rem;
        padding: 0.15rem 0.35rem;
        text-align: center;
        width: 100%;
        white-space: nowrap;
    }

    /* Remove all github-button related styles */

    /* Mobile responsiveness */
    @media (max-width: 768px) {
        .project-details-container {
            flex-direction: column;
        }

        .tech-stack {
            width: 100%;
            flex-direction: row;
            flex-wrap: wrap;
            border-left: none;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            padding-left: 0;
            padding-top: 0.5rem;
            margin-top: 0.5rem;
        }

        .tech-button {
            width: auto;
        }
    }

    /* Update these styles */
    .project-section {
        display: flex;
        gap: 1.5rem;
        width: 100%;
        max-width: 1400px;
        margin: 0 auto;
        pointer-events: auto;
    }

    .project-card {
        flex: 1;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 1.25rem;
    }

    .tech-stack {
        width: 120px;
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        padding: 1rem;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        height: fit-content;
    }

    .tech-button {
        font-size: 0.6rem;
        padding: 0.15rem 0.35rem;
        text-align: center;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 6px;
        white-space: nowrap;
    }

    /* Mobile responsiveness */
    @media (max-width: 768px) {
        .project-section {
            flex-direction: column;
            padding: 1rem;
        }

        .tech-stack {
            width: 100%;
            flex-direction: row;
            flex-wrap: wrap;
            margin-top: 0.5rem;
        }

        .tech-button {
            width: auto;
        }
    }

    /* Updated About section styles with panels */
    .about-panel {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
        transition: all 0.3s ease;
    }

    .about-panel:hover {
        background: rgba(255, 255, 255, 0.05);
        transform: translateY(-2px);
    }

    .primary-panel {
        border-left: 3px solid rgba(255, 255, 255, 0.2);
    }

    .skills-panel {
        border-left: 3px solid rgba(255, 255, 255, 0.15);
    }

    .achievements-panel {
        border-left: 3px solid rgba(255, 255, 255, 0.1);
    }

    .panel-header {
        margin-bottom: 1rem;
    }

    .panel-header h3 {
        font-size: 1.3rem;
        font-weight: 400;
        margin: 0;
        color: rgba(255, 255, 255, 0.95);
    }

    .skill-panel {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 8px;
        padding: 1rem;
        transition: all 0.3s ease;
    }

    .skill-panel:hover {
        background: rgba(255, 255, 255, 0.04);
        transform: translateX(2px);
    }

    .skills-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
    }

    /* Update existing about section styles */
    .about-content {
        max-width: 900px;
        margin: 0 auto;
        padding: 0 1.5rem;
    }

    .about-content h2 {
        font-size: 2rem;
        font-weight: 300;
        margin-bottom: 2rem;
        text-align: center;
        color: rgba(255, 255, 255, 0.95);
    }

    .about-details {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    /* Mobile responsiveness for panels */
    @media (max-width: 768px) {
        .about-panel {
            padding: 1.25rem;
        }

        .skills-grid {
            grid-template-columns: 1fr;
        }

        .skill-panel {
            padding: 0.875rem;
        }

        .panel-header h3 {
            font-size: 1.2rem;
        }
    }
</style>

<link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;600;700&display=swap" rel="stylesheet" crossorigin="anonymous">

