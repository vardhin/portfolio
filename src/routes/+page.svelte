<script>
  import CosmicCanvas from '$lib/components/CosmicCanvas.svelte';
  import CloudRenderer from '$lib/components/CloudRenderer.svelte';
  
  let isNightMode = false;
</script>

{#if isNightMode}
  <CosmicCanvas />
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
    <h1>Welcome to the {isNightMode ? 'Cosmos' : 'Clouds'}</h1>
    <button class="toggle-btn" on:click={() => isNightMode = !isNightMode}>
      {isNightMode ? '☀️ Switch to Day' : '🌙 Switch to Night'}
    </button>
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

  .toggle-btn {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    font-size: 1.2rem;
    border: 2px solid white;
    background: rgba(0, 0, 0, 0.5);
    color: white;
    border-radius: 25px;
    cursor: pointer;
    transition: all 0.3s ease;
    pointer-events: all;
  }

  .toggle-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.05);
  }
</style>
