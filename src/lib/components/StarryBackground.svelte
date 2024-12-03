<script>
  import { onMount } from 'svelte';

  // Props with default values
  export let numStars = 200;
  export let backgroundColor = 'rgb(0, 0, 20)';
  export let minStarSize = 0.5;
  export let maxStarSize = 2;
  export let shootingStarSpeed = 0.3; // Speed multiplier for shooting stars

  let canvas;
  let ctx;
  const stars = [];

  let cursor;
  let cursorX = 0;
  let cursorY = 0;

  let isMouseDown = false;
  let spawnInterval;

  function updateCursor(event) {
    const rect = canvas.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    cursorX = clientX - rect.left;
    cursorY = clientY - rect.top;
  }

  function createClickStar(x, y) {
    const size = (minStarSize + Math.random() * (maxStarSize - minStarSize)) * 3.5;
    // Add small random offset for more natural spread when holding
    const offsetX = Math.random() * 10 - 5; // -5 to +5 pixels
    const offsetY = Math.random() * 10 - 5;
    const star = new Star(x + offsetX, y + offsetY, size, false, true);
    stars.push(star);
  }

  function handleStart(event) {
    event.preventDefault(); // Prevent default touch behavior
    isMouseDown = true;
    const rect = canvas.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    // Create initial star
    createClickStar(x, y);
    
    // Set up interval for continuous creation
    spawnInterval = setInterval(() => {
      if (isMouseDown) {
        createClickStar(cursorX, cursorY);
      }
    }, 100);
  }

  function handleEnd() {
    isMouseDown = false;
    clearInterval(spawnInterval);
  }

  class Star {
    constructor(x, y, size, isShooting = false, isClickSpawned = false) {
      this.x = x;
      this.y = y;
      this.size = size;
      this.isShooting = isShooting;
      this.isClickSpawned = isClickSpawned;
      this.brightness = 0;
      
      // Much brighter for click-spawned stars
      this.maxBrightness = isShooting ? 
        2.0 + Math.random() * 0.5 : // Shooting stars
        isClickSpawned ?
          1.5 + Math.random() * 1.0 : // Click-spawned stars (much brighter)
          0.8 + Math.random() * 0.7;  // Normal static stars
      
      this.twinkleSpeed = isShooting ? 
        (0.01 + Math.random() * 0.05) : 
        (0.002 + Math.random() * 0.004);
      
      // Much longer life for click-spawned stars
      this.timeToLive = isClickSpawned ?
        12000 + Math.random() * 8000 : // 12-20 seconds for click-spawned (doubled from before)
        3000 + Math.random() * 4000;   // 3-7 seconds for others
      
      this.age = 0;
      this.isDying = false;
      
      // Much larger glow for click-spawned stars
      this.glowSize = isShooting ? 
        size * (2 + Math.random() * 2) : 
        isClickSpawned ?
          size * (3 + Math.random() * 2) :  // Much bigger glow
          size * (1 + Math.random() * 1.5);
      
      this.glowColor = isShooting ? 
        `rgba(255, 255, 255, ${0.3 + Math.random() * 0.2})` :
        isClickSpawned ?
          `rgba(255, 255, 255, ${0.4 + Math.random() * 0.3})` : // Stronger glow
          `rgba(255, 255, 255, ${0.1 + Math.random() * 0.15})`;
      
      if (isShooting) {
        // Increase speed for shooting stars
        this.velocity = {
          x: shootingStarSpeed * 1.5,
          y: shootingStarSpeed * 1.5
        };
        this.trail = [];
        this.timeToLive = 1500 + Math.random() * 1000; // Shorter life for shooting stars
        this.trailLength = 20; // Longer trail for shooting stars
      }
    }

    update(deltaTime) {
      this.age += deltaTime;
      
      // Twinkle effect
      if (!this.isDying) {
        this.brightness += this.twinkleSpeed;
        if (this.brightness > this.maxBrightness || this.brightness < 0) {
          this.twinkleSpeed = -this.twinkleSpeed;
        }
      }
      
      // Start dying when timeToLive is reached
      if (this.age >= this.timeToLive && !this.isDying) {
        this.isDying = true;
      }
      
      // Fade out when dying
      if (this.isDying) {
        this.brightness -= 0.05;
      }
      
      if (this.isShooting) {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        
        // Add trail points
        this.trail.unshift({ x: this.x, y: this.y });
        if (this.trail.length > this.trailLength) this.trail.pop();
      }
      
      return this.brightness > 0; // Return false when star should be removed
    }

    draw(ctx) {
      // Add glow effect
      ctx.shadowBlur = this.glowSize;
      ctx.shadowColor = this.glowColor;
      
      // Draw the star
      ctx.fillStyle = `rgba(255, 255, 255, ${this.brightness})`;
      ctx.fillRect(this.x, this.y, this.size, this.size);
      
      // Draw shooting star trail
      if (this.isShooting && this.trail.length > 1) {
        ctx.shadowBlur = this.glowSize * 0.5; // Reduced glow for trail
        ctx.beginPath();
        ctx.moveTo(this.trail[0].x, this.trail[0].y);
        for (let i = 1; i < this.trail.length; i++) {
          ctx.lineTo(this.trail[i].x, this.trail[i].y);
        }
        ctx.strokeStyle = `rgba(255, 255, 255, ${this.brightness * 0.5})`;
        ctx.stroke();
      }
      
      // Reset shadow effect
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
    }
  }

  function createStar() {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const size = minStarSize + Math.random() * (maxStarSize - minStarSize);
    const isShooting = Math.random() < 0.03; // 3% chance of shooting star
    return new Star(x, y, size, isShooting);
  }

  function createStars() {
    stars.length = 0;
    for (let i = 0; i < numStars; i++) {
      stars.push(createStar());
    }
  }

  let lastTime = 0;
  function animate(currentTime) {
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    // Clear the canvas
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw stars
    for (let i = stars.length - 1; i >= 0; i--) {
      const star = stars[i];
      const isAlive = star.update(deltaTime);
      
      if (!isAlive) {
        stars.splice(i, 1);
        // Add new star after a random delay
        setTimeout(() => {
          stars.push(createStar());
        }, Math.random() * 1000);
      } else {
        star.draw(ctx);
      }
    }

    // Draw custom cursor
    if (cursor) {
      ctx.shadowBlur = 20;  // Increased shadow blur
      ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(cursorX, cursorY, 6, 0, Math.PI * 2);  // Increased radius from 4 to 6
      ctx.fill();
    }

    requestAnimationFrame(animate);
  }

  onMount(() => {
    ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    createStars();
    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      createStars();
    };

    // Add both mouse and touch event listeners
    canvas.addEventListener('mousemove', updateCursor);
    canvas.addEventListener('touchmove', updateCursor, { passive: false });
    canvas.addEventListener('mouseenter', () => cursor = true);
    canvas.addEventListener('mouseleave', () => {
      cursor = false;
      isMouseDown = false;
      clearInterval(spawnInterval);
    });
    canvas.addEventListener('mousedown', handleStart);
    canvas.addEventListener('touchstart', handleStart, { passive: false });
    canvas.addEventListener('mouseup', handleEnd);
    canvas.addEventListener('touchend', handleEnd);
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', updateCursor);
      canvas.removeEventListener('touchmove', updateCursor);
      canvas.removeEventListener('mouseenter', () => cursor = true);
      canvas.removeEventListener('mouseleave', () => cursor = false);
      canvas.removeEventListener('mousedown', handleStart);
      canvas.removeEventListener('touchstart', handleStart);
      canvas.removeEventListener('mouseup', handleEnd);
      canvas.removeEventListener('touchend', handleEnd);
      clearInterval(spawnInterval);
    };
  });
</script>

<div class="canvas-container">
  <canvas
    bind:this={canvas}
    style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; cursor: none; touch-action: none;"
  />
</div>

<style>
  .canvas-container {
    width: 100%;
    height: 100%;
  }
</style> 