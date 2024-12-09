<script>
  import CloudRenderer from '$lib/components/CloudRenderer.svelte';
  import CosmicCanvas from '$lib/components/CosmicCanvas.svelte';
  
  let isMobile = false;
  let showMobileContent = false;
  let showWarning = true;
  
  function checkMobile() {
    isMobile = window.innerWidth <= 768;
  }

  // Check for mobile immediately and set up delayed content
  if (typeof window !== 'undefined') {
    checkMobile();
    if (isMobile) {
      setTimeout(() => {
        showMobileContent = true;
      }, 1000);
      // Hide warning after 3 seconds
      setTimeout(() => {
        showWarning = false;
      }, 3000);
    }
  }
</script>

<svelte:window on:resize={checkMobile}/>

{#if isMobile}
  {#if showWarning}
    <div class="mobile-warning" class:fade-out={!showWarning}>
      <p>This website looks best on a desktop device.</p>
      <p>Switching to lite version...</p>
    </div>
  {/if}
  {#if showMobileContent}
    <CosmicCanvas />
  {/if}
{:else}
  <CloudRenderer />
{/if}

<svelte:head>
  <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400&display=swap" rel="stylesheet">
  <title>Vardhin</title>
  <style>
    body {
      margin: 0;
      overflow: hidden;
      background: black;
    }
  </style>
</svelte:head>

<div class="heading-container">
  <h1>Surya Vardhin Gamidi</h1>
</div>

<style>
  .heading-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1001;
    pointer-events: none;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  h1 {
    animation: fadeIn 2.5s ease-out;
    color: rgba(255, 255, 255, 0.85);
    pointer-events: auto;
    user-select: none;
    margin: 0;
    font-size: 3.8rem;
    font-weight: 300;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    text-shadow: 
      0 0 25px rgba(255, 255, 255, 0.4),
      0 0 45px rgba(255, 255, 255, 0.2),
      0 0 65px rgba(255, 255, 255, 0.1);
    font-family: 'Quicksand', sans-serif;
  }

  @keyframes fadeIn {
    from { 
      opacity: 0; 
      transform: translateY(30px); 
      letter-spacing: 0.4em;
      text-shadow: 0 0 0 rgba(255, 255, 255, 0);
    }
    to { 
      opacity: 1; 
      transform: translateY(0);
      letter-spacing: 0.25em;
      text-shadow: 
        0 0 25px rgba(255, 255, 255, 0.4),
        0 0 45px rgba(255, 255, 255, 0.2),
        0 0 65px rgba(255, 255, 255, 0.1);
    }
  }

  .mobile-warning {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 1rem;
    text-align: center;
    z-index: 1000;
    animation: slideDown 0.5s ease-out;
    transition: opacity 0.5s ease-out;
  }

  .fade-out {
    opacity: 0;
  }

  @keyframes slideDown {
    from { transform: translateY(-100%); }
    to { transform: translateY(0); }
  }
</style>