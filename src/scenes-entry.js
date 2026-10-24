import { initBottleScene, initSeedScene } from './scenes.js';

/* Paquete independiente: se carga después del primer pintado para que el
   contenido y las tipografías aparezcan antes que Three.js. */
window.EcoReset3D = { initBottleScene, initSeedScene };
