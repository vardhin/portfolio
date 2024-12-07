
export const volumetricCloudsShader = {
  uniforms: {
    time: { value: 0 },
    lightDirection: { value: new THREE.Vector3(1, 1, 1).normalize() },
    cloudTexture: { value: new THREE.TextureLoader().load('/textures/cloudNoise.png') },
    cameraPosition: { value: new THREE.Vector3() }
  },
  vertexShader: `
    varying vec3 vWorldPosition;
    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 lightDirection;
    uniform sampler2D cloudTexture;
    uniform vec3 cameraPosition;
    
    varying vec3 vWorldPosition;
    
    // Simple 3D noise function
    float noise(vec3 p) {
      return texture2D(cloudTexture, p.xy * 0.1 + time * 0.02).r;
    }
    
    void main() {
      // Calculate cloud density based on noise
      float density = smoothstep(0.5, 0.8, noise(vWorldPosition * 0.001));
      
      // Calculate lighting based on light direction
      float light = max(dot(normalize(lightDirection), vec3(0.0, 1.0, 0.0)), 0.0);
      
      // Simulate light scattering
      vec3 cloudColor = vec3(1.0) * light * density;
      
      // Apply density to alpha
      gl_FragColor = vec4(cloudColor, density);
      
      // Discard low-density fragments for performance
      if (gl_FragColor.a < 0.1) discard;
    }
  `
};