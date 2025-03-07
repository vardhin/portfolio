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
    let scene, camera, renderer, fogMaterial;
    let animationFrameId;
    let isNavigating = false;
    let targetCameraY = 0;
  
    // Weather state
    let weatherState = {
        cloudDensity: 0.3,
        windSpeed: 0.08,
        stormIntensity: 0.0,
        rainIntensity: 0.0
    };
  
    // Star system
    let stars = [];
    const TOTAL_STARS = 500;
    let isNightTime = true;
  
    // Camera position
    let cameraPosition = { x: 0, y: 0 };
    const CAMERA_SMOOTHING = 0.05;
    const CAMERA_MOVEMENT_SPEED = 4.0;
  
    onMount(() => {
        // Initialize scene
        scene = new THREE.Scene();
        scene.background = skyColors.nightDeep.clone();
  
        // Setup camera
        const frustumSize = 10;
        const aspect = window.innerWidth / window.innerHeight;
        camera = new THREE.OrthographicCamera(
            frustumSize * aspect / -2,
            frustumSize * aspect / 2,
            frustumSize / 2,
            frustumSize / -2,
            0.1,
            1000
        );
        camera.position.z = 5;
  
        // Setup renderer
        renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: "high-performance"
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);
  
        // Create volumetric fog texture
        const fogTexture = new THREE.Data3DTexture(
            new Uint8Array(128 * 128 * 128).map(() => Math.random() * 155 + 100),
            128, 128, 128
        );
        fogTexture.format = THREE.RedFormat;
        fogTexture.minFilter = THREE.LinearFilter;
        fogTexture.magFilter = THREE.LinearFilter;
        fogTexture.unpackAlignment = 1;
        fogTexture.needsUpdate = true;
  
        // Create fog material
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
        });
  
        // Create cloud plane
        const planeGeometry = new THREE.PlaneGeometry(
            frustumSize * aspect * 2,
            frustumSize * 2
        );
        const fogPlane = new THREE.Mesh(planeGeometry, fogMaterial);
        fogPlane.position.z = -5;
        scene.add(fogPlane);
  
        // Initialize stars
        for (let i = 0; i < TOTAL_STARS; i++) {
            const star = new Star();
            stars.push(star);
            scene.add(star.mesh);
        }
  
        // Animation loop
        let lastTime = performance.now();
        let time = 0;
  
        const animate = () => {
            const currentTime = performance.now();
            const deltaTime = (currentTime - lastTime) / 1000;
            lastTime = currentTime;
  
            // Update camera position
            camera.position.y = THREE.MathUtils.lerp(
                camera.position.y,
                targetCameraY,
                CAMERA_SMOOTHING
            );
  
            // Update fog material
            if (fogMaterial) {
                time += deltaTime * weatherState.windSpeed * 60;
                fogMaterial.uniforms.time.value = time;
                fogMaterial.uniforms.cameraOffset.value.set(0, camera.position.y);
            }
  
            // Update stars
            stars.forEach(star => {
                star.update(deltaTime);
            });
  
            // Render
            renderer.render(scene, camera);
            animationFrameId = requestAnimationFrame(animate);
        };
  
        animate();
  
        // Handle resize
        const handleResize = () => {
            const aspect = window.innerWidth / window.innerHeight;
            camera.left = frustumSize * aspect / -2;
            camera.right = frustumSize * aspect / 2;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            if (fogMaterial) {
                fogMaterial.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
            }
        };
        window.addEventListener('resize', handleResize);
  
        // Cleanup
        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
            // ... add other cleanup code ...
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

    <div bind:this={container} 
         class="canvas-container">
        <!-- Canvas will be added here by Three.js -->
    </div>

    <!-- Modified content overlay -->
    <div class="content-overlay" 
         style="transform: translateY({scrollY}px)">
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
                    <div class="project-card" in:fly="{{ y: 50, duration: 1000 }}" out:fade>
                        <div class="project-content">
                            <div class="project-header">
                                <div class="project-header-text">
                                    <h2>Decentralized Cloud Computing</h2>
                                    <h3>Decloud</h3>
                                </div>
                            </div>
                            
                            <div class="scrollable-content">
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
                        </div>
                        
                        <div class="tech-stack">
                            <div class="tech-buttons">
                                {#each ['Electron', 'Svelte', 'IPFS', 'Docker', 'TypeScript'] as tech}
                                    <span class="tech-button">{tech}</span>
                                {/each}
                            </div>
                            <a href="https://github.com/yourusername/decloud" 
                               class="github-button" 
                               target="_blank" 
                               rel="noopener noreferrer">
                                <Github size={12} />
                                <span>GitHub</span>
                            </a>
                        </div>
                    </div>
                {:else if section.id === 'recon'}
                    <div class="project-card" in:fly="{{ y: 50, duration: 1000 }}" out:fade>
                        <div class="project-content">
                            <div class="project-header">
                                <div class="project-header-text">
                                    <h2>Decentralized Messaging</h2>
                                    <h3>Recon</h3>
                                </div>
                                <a href="https://github.com/yourusername/recon" 
                                   class="github-button" 
                                   target="_blank" 
                                   rel="noopener noreferrer">
                                    <Github size={16} />
                                    <span>GitHub</span>
                                </a>
                            </div>
                            
                            <div class="scrollable-content">
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
                        </div>
                        
                        <div class="tech-stack">
                            {#each ['Svelte', 'Capacitor', 'GunJs', 'TypeScript'] as tech}
                                <span class="tech-button">{tech}</span>
                            {/each}
                        </div>
                    </div>
                {:else if section.id === 'yantra'}
                    <div class="project-card" in:fly="{{ y: 50, duration: 1000 }}" out:fade>
                        <div class="project-content">
                            <div class="project-header">
                                <div class="project-header-text">
                                    <h2>Disaster Resistant Shelter</h2>
                                    <h3>Yantra</h3>
                                </div>
                            </div>
                            
                            <div class="scrollable-content">
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
                        </div>
                        
                        <div class="tech-stack">
                            {#each ['Python', 'NumPy', 'Matplotlib'] as tech}
                                <span class="tech-button">{tech}</span>
                            {/each}
                            <a href="https://github.com/yourusername/yantra" 
                               class="github-button" 
                               target="_blank" 
                               rel="noopener noreferrer">
                                <Github size={12} />
                                <span>GitHub</span>
                            </a>
                        </div>
                    </div>
                {:else if section.id === 'carbon'}
                    <div class="project-card" in:fly="{{ y: 50, duration: 1000 }}" out:fade>
                        <div class="project-content">
                            <div class="project-header">
                                <div class="project-header-text">
                                    <h2>Carbon Credit Marketplace</h2>
                                    <h3>Code4Change</h3>
                                </div>
                                <a href="https://github.com/yourusername/carbon-credits" 
                                   class="github-button" 
                                   target="_blank" 
                                   rel="noopener noreferrer">
                                    <Github size={16} />
                                    <span>GitHub</span>
                                </a>
                            </div>
                            
                            <div class="scrollable-content">
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
                        </div>
                        
                        <div class="tech-stack">
                            {#each ['React Native', 'Ethereum', 'Blockchain'] as tech}
                                <span class="tech-button">{tech}</span>
                            {/each}
                            <a href="https://github.com/yourusername/carbon-credits" 
                               class="github-button" 
                               target="_blank" 
                               rel="noopener noreferrer">
                                <Github size={12} />
                                <span>GitHub</span>
                            </a>
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
        backdrop-filter: blur(8px);
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
        height: 100%;
        position: absolute;
        top: 0;
        left: 0;
        background: #000000;
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
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100vh;
        z-index: 2;
        transition: transform 0.3s ease;
    }

    .portfolio-section {
        height: 100vh;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
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
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 1.25rem;
        backdrop-filter: blur(10px);
        width: 100%;
        max-width: 1400px;
        height: 450px;
        margin: 0 auto;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
        display: grid;
        grid-template-columns: 1fr 200px; /* Main content and tech stack */
        gap: 1rem;
    }

    .project-content {
        overflow: hidden;
        padding-right: 1rem;
        border-right: 1px solid rgba(255, 255, 255, 0.1);
    }

    .tech-stack {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding-left: 1rem;
    }

    .tech-buttons {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .tech-button {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 8px;
        padding: 0.35rem 0.75rem;
        font-size: 0.7rem;
        text-align: center;
        white-space: nowrap;
    }

    .github-button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.4rem;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 8px;
        padding: 0.5rem;
        color: rgba(255, 255, 255, 0.9);
        font-size: 0.7rem;
        text-decoration: none;
        transition: all 0.2s ease;
        margin-top: auto;
    }

    .github-button:hover {
        background: rgba(255, 255, 255, 0.12);
        transform: translateY(-1px);
    }

    /* Mobile adjustments */
    @media (max-width: 768px) {
        .project-card {
            grid-template-columns: 1fr;
            height: auto;
            max-width: calc(100% - 2rem);
            padding: 1rem;
        }

        .project-content {
            padding-right: 0;
            border-right: none;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            padding-bottom: 1rem;
        }

        .tech-stack {
            padding-left: 0;
            padding-top: 1rem;
        }

        .tech-buttons {
            flex-direction: row;
            flex-wrap: wrap;
            justify-content: center;
        }
    }

    /* About section */
    .about-content h2 {
        font-weight: 400;  /* Changed from 600 to 400 */
        font-size: 2.5rem;
        margin-bottom: 1.5rem;
        letter-spacing: 0.01em;  /* Changed to positive tracking */
    }

    .about-content p {
        font-weight: 300;  /* Changed from 400 to 300 */
        font-size: 1.125rem;
        line-height: 1.8;  /* Increased from 1.7 */
        letter-spacing: 0.02em;
    }

    /* Contact section */
    .contact-content h2 {
        font-weight: 400;  /* Changed from 600 to 400 */
        font-size: 2.5rem;
        margin-bottom: 1.5rem;
        letter-spacing: 0.01em;
    }

    /* Typography helper classes */
    .text-light {
        font-weight: 300;
    }

    .text-regular {
        font-weight: 400;
    }

    .text-medium {
        font-weight: 400;  /* Changed from 500 */
    }

    .text-semibold {
        font-weight: 500;  /* Changed from 600 */
    }

    .text-bold {
        font-weight: 600;  /* Changed from 700 */
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
        backdrop-filter: blur(10px);
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
        margin: 0 0 0.25rem; /* Reduced from 0.3rem */
    }

    .project-details li {
        position: relative;
        padding-left: 0.7rem; /* Reduced from 0.8rem */
        margin-bottom: 0.15rem; /* Reduced from 0.2rem */
        line-height: 1.15; /* Reduced from 1.2 */
        font-size: 0.7rem; /* Reduced from 0.75rem */
        color: rgba(255, 255, 255, 0.8);
        word-spacing: -0.06em; /* Increased negative word spacing */
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

    /* Mobile optimizations */
    @media (max-width: 768px) {
        .project-card {
            max-width: calc(100% - 2rem);
            height: auto;
            padding: 1rem;
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
        backdrop-filter: blur(8px);
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
        backdrop-filter: blur(10px);
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
</style>

<link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;600;700&display=swap" rel="stylesheet" crossorigin="anonymous">

<script context="module">
    const ProjectLink = ({ href }) => (`
        <div class="project-links">
            <a href="${href}" class="project-link" target="_blank" rel="noopener noreferrer">
                <svelte:component this={Github} size={16} /> GitHub
            </a>
        </div>
    `);
</script>
