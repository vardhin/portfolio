<script>
  import { onMount } from 'svelte';
  import * as THREE from 'three';

  let container;
  let scene, camera, renderer;
  let stars = [];
  const TOTAL_STARS = 800;

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

    // Create static stars
    for (let i = 0; i < TOTAL_STARS; i++) {
      const star = new StaticStar();
      stars.push(star);
      scene.add(star.mesh);
      scene.add(star.glow);
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