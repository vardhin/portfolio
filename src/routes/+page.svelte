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
  <title>Vardhin</title>
  <style>
    body {
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
      margin: 0;
      overflow: hidden;
      background: black;
    }
  </style>
</svelte:head>


<main on:contextmenu|preventDefault>
  <div class="content">
    <h1>Welcome to the Clouds</h1>
  </div>
</main>

<style>
  main {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .content {
    color: white;
    padding: 2rem;
    text-align: center;
    text-shadow: 0 0 10px rgba(255,255,255,0.5);
    pointer-events: all;
  }

  h1 {
    animation: fadeIn 2s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
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
