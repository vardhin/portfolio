import * as THREE from 'three';

export const volumetricCloudsShader = {
  uniforms: {
    time: { value: 0 },
    lightDirection: { value: new THREE.Vector3(1, 1, 1).normalize() }
  },
  vertexShader: `
    varying vec3 vWorldPosition;
    varying vec2 vUv;
    
    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 lightDirection;
    
    varying vec3 vWorldPosition;
    varying vec2 vUv;
    
    // Pseudo-random function
    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }
    
    // Value noise function
    float noise(vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);
      
      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));
      
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }
    
    void main() {
      // Create particle effect using noise
      vec2 pos = vUv * 20.0 + time * 0.1;
      float n = noise(pos);
      
      // Create multiple layers of noise for more depth
      n += 0.5 * noise(pos * 2.0);
      n += 0.25 * noise(pos * 4.0);
      
      // Create circular particles
      float particle = smoothstep(0.5, 0.2, length(fract(pos) - 0.5));
      
      // Combine noise and particles
      float density = n * particle;
      
      // Calculate lighting
      float light = max(dot(normalize(lightDirection), vec3(0.0, 1.0, 0.0)), 0.0);
      
      // Final cloud color
      vec3 cloudColor = vec3(1.0) * light * density;
      
      gl_FragColor = vec4(cloudColor, density * 0.5);
      
      // Discard very transparent pixels
      if (gl_FragColor.a < 0.05) discard;
    }
  `
};