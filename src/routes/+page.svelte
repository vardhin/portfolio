<script>
  import CosmicCanvas from '$lib/components/CosmicCanvas.svelte';
</script>

<svelte:head>
  <title>Cosmic Web Experience</title>
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

<CosmicCanvas />

<main on:contextmenu|preventDefault>
  <div class="content">
    <h1>Welcome to the Cosmos</h1>
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
</style>
