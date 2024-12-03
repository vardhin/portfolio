<script>
  import { onMount } from 'svelte';
  import * as THREE from 'three';

  let container;
  let scene, camera, renderer;
  let stars = [];
  const TOTAL_STARS = 800;
  const SHOOTING_STAR_PERCENTAGE = 0.009; // Reduced from 0.008 to make them more rare

  class BaseStar {
    constructor() {
      this.size = 0.1;
      this.ttl = Math.random() * 5 + 5;
      this.age = 0;
      this.fadeState = 'in';
      this.fadeTime = 1.0;
      this.opacity = 0;

      const geometry = new THREE.SphereGeometry(this.size, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0
      });

      this.mesh = new THREE.Mesh(geometry, material);

      const glowGeometry = new THREE.SphereGeometry(this.size * 2, 8, 8);
      const glowMaterial = new THREE.ShaderMaterial({
        uniforms: {
          glowColor: { value: new THREE.Color(0x6699FF) },
          viewVector: { value: new THREE.Vector3() },
          opacity: { value: 0.0 }
        },
        vertexShader: `
          uniform vec3 viewVector;
          varying float intensity;
          void main() {
            vec3 vNormal = normalize(normalMatrix * normal);
            vec3 vNormel = normalize(normalMatrix * viewVector);
            intensity = pow(0.6 - dot(vNormal, vNormel), 2.0);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 glowColor;
          uniform float opacity;
          varying float intensity;
          void main() {
            vec3 glow = glowColor * intensity;
            gl_FragColor = vec4(glow, opacity);
          }
        `,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true
      });

      this.glow = new THREE.Mesh(glowGeometry, glowMaterial);
    }

    updateFade(deltaTime) {
      switch(this.fadeState) {
        case 'in':
          this.opacity += deltaTime / this.fadeTime;
          if (this.opacity >= 1) {
            this.opacity = 1;
            this.fadeState = 'stable';
          }
          break;
        case 'stable':
          if (this.age >= this.ttl - this.fadeTime) {
            this.fadeState = 'out';
          }
          break;
        case 'out':
          this.opacity -= deltaTime / this.fadeTime;
          if (this.opacity <= 0) {
            this.opacity = 0;
            this.respawn();
          }
          break;
      }

      this.mesh.material.opacity = this.opacity;
      this.glow.material.uniforms.opacity.value = this.opacity * 0.5;
    }

    update(deltaTime, time) {
      this.age += deltaTime;
      this.updateFade(deltaTime);
    }

    respawn() {
      this.age = 0;
      this.fadeState = 'in';
      this.setNewPosition();
    }
  }

  class StaticStar extends BaseStar {
    constructor() {
      super();
      this.size = Math.random() * 0.9 + 0.1;
      this.mesh.geometry = new THREE.SphereGeometry(this.size, 8, 8);
      this.glow.geometry = new THREE.SphereGeometry(this.size * 2, 8, 8);

      this.twinkleSpeed = Math.random() * 0.05 + 0.01;
      this.phase = Math.random() * Math.PI * 2;
      this.setNewPosition();
    }

    setNewPosition() {
      const position = new THREE.Vector3(
        Math.random() * 2000 - 1000,
        Math.random() * 2000 - 1000,
        Math.random() * 1000 - 500
      );
      this.mesh.position.copy(position);
      this.glow.position.copy(position);
    }
  }

  class ShootingStar extends BaseStar {
    constructor() {
      super();
      this.size = Math.random() * 1.5 + 0.5;
      this.mesh.geometry = new THREE.SphereGeometry(this.size, 8, 8);
      this.glow.geometry = new THREE.SphereGeometry(this.size * 2, 8, 8);
      
      // Adjust timing parameters
      this.ttl = Math.random() * 1.5 + 1; // Reduced TTL to 1-2.5 seconds
      this.fadeTime = 0.4; // Faster fade in/out (was 1.0)
      
      // Reduce trail length
      const trailLength = 30; // Reduced from 50 to 30
      const trailPoints = [];
      for (let i = 0; i <= trailLength; i++) {
        const t = i / trailLength;
        trailPoints.push(new THREE.Vector3(-t * 60, t * 60, 0));
      }
      
      this.trailGeometry = new THREE.BufferGeometry().setFromPoints(trailPoints);
      this.trailMaterial = new THREE.LineBasicMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
      });
      this.trail = new THREE.Line(this.trailGeometry, this.trailMaterial);
      
      // Add particles for extra effect
      const particleCount = 20;
      const particlePositions = new Float32Array(particleCount * 3);
      const particleSizes = new Float32Array(particleCount);
      
      for (let i = 0; i < particleCount; i++) {
        const t = i / particleCount;
        particlePositions[i * 3] = -t * 40;
        particlePositions[i * 3 + 1] = t * 40;
        particlePositions[i * 3 + 2] = 0;
        particleSizes[i] = (1 - t) * 2;
      }
      
      const particleGeometry = new THREE.BufferGeometry();
      particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
      particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
      
      this.particles = new THREE.Points(
        particleGeometry,
        new THREE.ShaderMaterial({
          uniforms: {
            opacity: { value: 0 }
          },
          vertexShader: `
            attribute float size;
            varying float vAlpha;
            void main() {
              vAlpha = 1.0 - (position.x + 40.0) / -40.0;
              vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
              gl_PointSize = size * (300.0 / -mvPosition.z);
              gl_Position = projectionMatrix * mvPosition;
            }
          `,
          fragmentShader: `
            uniform float opacity;
            varying float vAlpha;
            void main() {
              float d = length(gl_PointCoord - vec2(0.5));
              if (d > 0.5) discard;
              float alpha = smoothstep(0.5, 0.0, d) * vAlpha * opacity;
              gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
            }
          `,
          transparent: true,
          blending: THREE.AdditiveBlending
        })
      );
      
      this.setNewPosition();
      this.speed = new THREE.Vector3(
        Math.random() * 50 + 75,  // Reduced horizontal speed
        Math.random() * -50 - 75, // Reduced vertical speed
        Math.random() * -10 - 5   // Slight depth variation
      );
    }

    setNewPosition() {
      const position = new THREE.Vector3(
        Math.random() * 2000 - 1000,
        1000, // Start from top of screen
        Math.random() * 1000 - 500
      );
      this.mesh.position.copy(position);
      this.glow.position.copy(position);
      this.trail.position.copy(position);
      this.particles.position.copy(position);
      
      // Reset opacity and fade state
      this.opacity = 0;
      this.fadeState = 'in';
      this.age = 0;
    }

    update(deltaTime, time) {
      super.update(deltaTime, time);
      
      // Update trail and particle opacity based on star's opacity
      this.trailMaterial.opacity = this.opacity * 0.6;
      this.particles.material.uniforms.opacity.value = this.opacity;

      // Update position with smoother movement
      const movement = this.speed.clone().multiplyScalar(deltaTime);
      this.mesh.position.add(movement);
      this.glow.position.copy(this.mesh.position);
      this.trail.position.copy(this.mesh.position);
      this.particles.position.copy(this.mesh.position);

      // Reset position if star moves too far
      if (this.mesh.position.x > 1000 || this.mesh.position.x < -1000 ||
          this.mesh.position.y < -1000) {
        this.setNewPosition();
      }
    }
  }

  onMount(() => {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.z = 500;

    renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    const shootingStarCount = Math.floor(TOTAL_STARS * SHOOTING_STAR_PERCENTAGE);
    const staticStarCount = TOTAL_STARS - shootingStarCount;

    console.log(`Creating ${shootingStarCount} shooting stars and ${staticStarCount} static stars`);

    // Create static stars
    for (let i = 0; i < staticStarCount; i++) {
      const star = new StaticStar();
      stars.push(star);
      scene.add(star.mesh);
      scene.add(star.glow);
    }

    // Create shooting stars
    for (let i = 0; i < shootingStarCount; i++) {
      const star = new ShootingStar();
      stars.push(star);
      scene.add(star.mesh);
      scene.add(star.glow);
      scene.add(star.trail);
      scene.add(star.particles);  // Add the particle system
      console.log(`Added shooting star ${i + 1}`);
    }

    let lastTime = 0;
    function animate(currentTime) {
      requestAnimationFrame(animate);

      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      stars.forEach(star => {
        star.update(deltaTime, currentTime / 1000);
        star.glow.material.uniforms.viewVector.value = new THREE.Vector3().subVectors(
          camera.position,
          star.glow.position
        );
      });

      renderer.render(scene, camera);
    }

    function handleResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    window.addEventListener('resize', handleResize);
    animate(0);

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeChild(renderer.domElement);
      stars.forEach(star => {
        scene.remove(star.mesh);
        scene.remove(star.glow);
        if (star instanceof ShootingStar) {
          scene.remove(star.trail);
          scene.remove(star.particles);  // Remove particle system
          star.trailGeometry.dispose();
          star.trailMaterial.dispose();
          star.particles.geometry.dispose();
          star.particles.material.dispose();
        }
        star.mesh.geometry.dispose();
        star.mesh.material.dispose();
        star.glow.geometry.dispose();
        star.glow.material.dispose();
      });
      renderer.dispose();
    };
  });
</script>

<div bind:this={container}></div>

<style>
  div {
    width: 100%;
    height: 100%;
    position: fixed;
    top: 0;
    left: 0;
    background: black;
  }
</style>