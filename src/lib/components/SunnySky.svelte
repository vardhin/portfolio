<script>
  import { onMount } from 'svelte';
  import * as THREE from 'three';
  import { volumetricCloudsShader } from './VolumetricClouds.js';

  let container;
  let scene, camera, renderer;
  let sun, atmosphere;
  let clouds = [];
  const TOTAL_CLOUDS = 5;

  class Sun {
    constructor() {
      // Create bright sun disk
      const geometry = new THREE.CircleGeometry(50, 32);
      const material = new THREE.MeshBasicMaterial({
        color: 0xffff99,
        transparent: true,
        opacity: 1
      });
      this.mesh = new THREE.Mesh(geometry, material);
      this.mesh.position.set(0, 200, -400);

      // Create sun glow
      const glowGeometry = new THREE.CircleGeometry(100, 32);
      const glowMaterial = new THREE.ShaderMaterial({
        uniforms: {
          glowColor: { value: new THREE.Color(0xffdd44) },
          viewVector: { value: new THREE.Vector3() },
          opacity: { value: 0.6 }
        },
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 glowColor;
          uniform float opacity;
          varying vec3 vNormal;
          void main() {
            float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
            gl_FragColor = vec4(glowColor, opacity * intensity);
          }
        `,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        transparent: true
      });
      this.glow = new THREE.Mesh(glowGeometry, glowMaterial);
      this.glow.position.copy(this.mesh.position);
    }
  }

  class Cloud {
    constructor() {
      const geometry = new THREE.SphereGeometry(100, 32, 32);
      
      // Create the base material with the imported shader
      const material = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(volumetricCloudsShader.uniforms),
        vertexShader: volumetricCloudsShader.vertexShader,
        fragmentShader: volumetricCloudsShader.fragmentShader,
        transparent: true,
        side: THREE.FrontSide,
        depthWrite: false
      });

      this.mesh = new THREE.Mesh(geometry, material);
      this.setNewPosition();
      this.speed = Math.random() * 5 + 2;

      // Create LOD
      this.lod = new THREE.LOD();

      // Add high-detail volumetric cloud with a new material instance
      const highDetail = new THREE.Mesh(
        geometry,
        material.clone()
      );
      this.lod.addLevel(highDetail, 0);

      // Add medium-detail cloud with a new material instance
      const mediumDetail = new THREE.Mesh(
        geometry,
        material.clone()
      );
      mediumDetail.scale.set(0.7, 0.7, 0.7);
      this.lod.addLevel(mediumDetail, 500);

      // Add low-detail cloud with a new material instance
      const lowDetail = new THREE.Mesh(
        geometry,
        material.clone()
      );
      lowDetail.scale.set(0.4, 0.4, 0.4);
      this.lod.addLevel(lowDetail, 1000);

      this.mesh = this.lod;
    }

    update(deltaTime, time, cameraPosition) {
      // Move the cloud
      this.mesh.position.x += this.speed * deltaTime;
      
      // Loop the cloud position for continuous movement
      if (this.mesh.position.x > 1000) {
        this.setNewPosition();
      }

      // Update shader uniforms for all LOD levels
      this.lod.levels.forEach(level => {
        level.object.material.uniforms.time.value = time;
      });

      // Update LOD based on camera distance
      this.lod.update(camera);
    }

    setNewPosition() {
      this.mesh.position.set(
        -1000,
        Math.random() * 200 - 100,
        Math.random() * 300 - 150
      );
    }
  }

  onMount(async () => {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 5000);
    camera.position.z = 1000;

    renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    // Create gradient sky background
    const vertexShader = `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(h, 0.0)), 1.0);
      }
    `;

    const uniforms = {
      topColor: { value: new THREE.Color(0x0077ff) },
      bottomColor: { value: new THREE.Color(0x89cff0) }
    };

    const skyGeo = new THREE.SphereGeometry(1000, 32, 32);
    const skyMat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      side: THREE.BackSide
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);

    // Add sun
    const sun = new Sun();
    scene.add(sun.mesh);
    scene.add(sun.glow);

    // Add volumetric clouds
    for (let i = 0; i < TOTAL_CLOUDS; i++) {
      const cloud = new Cloud();
      clouds.push(cloud);
      scene.add(cloud.mesh);
    }

    // Add ambient and directional light for better cloud rendering
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 1, 0.5);
    scene.add(directionalLight);

    // Adjust fog for better cloud visibility
    scene.fog = new THREE.FogExp2(0xadd8e6, 0.0005);

    let lastTime = 0;
    function animate(currentTime) {
      requestAnimationFrame(animate);

      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      const time = currentTime / 1000;

      // Update clouds with time and camera position
      clouds.forEach(cloud => cloud.update(deltaTime, time, camera.position));

      // Update sun glow
      sun.glow.material.uniforms.viewVector.value = new THREE.Vector3().subVectors(
        camera.position,
        sun.glow.position
      );

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
      
      // Cleanup resources
      scene.remove(sky);
      scene.remove(sun.mesh);
      scene.remove(sun.glow);
      
      // Properly cleanup clouds
      clouds.forEach(cloud => {
        scene.remove(cloud.mesh);
        cloud.mesh.geometry.dispose();
        cloud.mesh.material.dispose();
      });
      
      // Cleanup other resources
      sky.geometry.dispose();
      sky.material.dispose();
      sun.mesh.geometry.dispose();
      sun.mesh.material.dispose();
      sun.glow.geometry.dispose();
      sun.glow.material.dispose();
      
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
  }
</style>
