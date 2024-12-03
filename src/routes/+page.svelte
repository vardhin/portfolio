<script>
  import StarryBackground from '$lib/components/StarryBackground.svelte';
</script>

<svelte:head>
  <title>Your Site Title</title>
  <!-- Disable text selection -->
  <style>
    body {
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
    }
  </style>
</svelte:head>

<StarryBackground 
  numStars={300}
  backgroundColor="rgb(0, 0, 30)"
  minStarSize={0.5}
  maxStarSize={2}
/>

<!-- Add oncontextmenu to prevent right-click -->
<main on:contextmenu|preventDefault>
  <h1>Hello World</h1>
</main>

<style>
  :global(body) {
    margin: 0;
    overflow: hidden;
  }

  main {
    color: white;
    padding: 2rem;
  }
</style>
