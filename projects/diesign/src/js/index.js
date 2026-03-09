import './preloader';
import '../scss/index.scss';
import Parallax from 'parallax-js';
import { setupDynamicNavigation } from './components/setup-dynamic-navigation';
import { setupPanelRouteTransition } from './components/panel-route-transition';
import HomeState from './components/home-state';
import {
  registerEffectType,
  setEffectDefaultConfig,
  observeAllCanvases
} from './components/canvas-manager';
import createStarfield from './components/starfield';
import createRipple from './components/create-ripple';
import observeLazyElements from './components/observe-lazy-elements';

const observeLazy = observeLazyElements();
window.observeLazyElements = observeLazy;

setupDynamicNavigation({
  tabsSelector: 'input[name="d-tabs"]',
  popoverButtonSelector: '.pop-btn.open',
  popoverSelector: '.project-pop',
  popoverCloseSelector: '.project-pop .close',
  navPrefix: 'nav-',
  homePath: '/',
  workPath: '/work',
  cleanTrailingSlash: true
});

setupPanelRouteTransition();

window.addEventListener('routechange', (event) => {
  HomeState.update(event.detail.path);
});

registerEffectType('starfield', createStarfield);
setEffectDefaultConfig('starfield', {
  fadeIn: {
    enabled: true,
    duration: 6000,
    easing: 'linear'
  },
  starField: {
    enabled: true,
    amount: 500,
    radius: [0.25, 1.25],
    alpha: [0.5, 1],
    twinkleSpeed: [0.001, 0.007],
    colors: { h: [280, 290], s: [86, 106], l: [65, 100] }
  },
  fallingStars: {
    settings: {
      enabled: true,
      seed: null,
      relationshipMode: false,
      relationshipOffset: 0.4
    },
    scene: {
      rate: 0.0015,
      maxConcurrent: 5,
      spawnZone: { x: [-0.1, 1], y: [-0.05, 0.7] }
    },
    animations: {
      speed: [150, 250],
      fade: [0.06, 0.065],
      direction: [44, 46],
      opacity: [0.5, 1],
      flicker: 0.6,
      arcAmount: 0,
      tailGrowthSpeed: 5,
      trailEasing: 'easeInBack'
    },
    star: {
      radius: [0.25, 3],
      length: [100, 325],
      glow: 1,
      head: {
        colors: { h: [275, 295], s: [96, 96], l: [100, 100] },
        shape: 'ellipse',
        ellipseAspectRatio: 1.75,
        bloom: { enabled: true, blurMultiplier: 12 }
      },
      trail: {
        enabled: true,
        gradient: { from: { h: 285, s: 96, l: 100 }, to: { h: 285, s: 96, l: 65 } }
      }
    }
  }
});

registerEffectType('ripple', createRipple);
setEffectDefaultConfig('ripple', {
  duration: 2000,
  scale: 4,
  noise: 25,
  easing: 'cubic-bezier(0.075, 0.82, 0.165, 1)',
  colorStops: [
    { offset: 0, h: 285, s: 96, l: 65, a: 0.9 },
    { offset: 0.333, h: 285, s: 96, l: 65, a: 0.6 },
    { offset: 0.667, h: 285, s: 96, l: 95, a: 0.3 },
    { offset: 1, h: 285, s: 96, l: 95, a: 0 }
  ]
});

observeAllCanvases({
  excludeClass: 'ripple',
  resizeConfig: {
    debounceDelay: 150,
    dprCheckInterval: 200,
    visibilityThreshold: 0.05
  }
});

const canvas = document.querySelector('[data-effect="starfield"]');
if (canvas && !canvas.dataset.fadedIn) {
  canvas.dataset.fadedIn = 'true';
  requestAnimationFrame(() => {
    canvas.style.setProperty('opacity', '1', 'important');
  });
}

const starfieldInstance = canvas?._canvasEffectInstance;

document.addEventListener('DOMContentLoaded', () => {
  requestAnimationFrame(() => {
    const syncMeteorSchedule = () => {
      if (!starfieldInstance) {
        return;
      }

      if (HomeState.get()) {
        starfieldInstance.startMeteorShowerSchedule({
          delay: 2500,
          sequence: [
            { duration: 5000, maxRate: 34, delayAfter: 2000 },
            { duration: 7500, maxRate: 30, delayAfter: 3000 },
            { duration: 5000, maxRate: 15 }
          ]
        });
        return;
      }

      starfieldInstance.stopMeteorShowerSchedule?.();
    };

    syncMeteorSchedule();
    HomeState.onChange(syncMeteorSchedule);
  });
});

window.preloaderReady.then(() => {
  const scene = document.getElementById('stage');
  if (scene) {
    new Parallax(scene);
  }

  const introTrigger = document.querySelector('.intro-container');
  if (introTrigger && starfieldInstance) {
    introTrigger.addEventListener('click', () => {
      starfieldInstance.startMeteorShower({
        duration: 1250,
        maxRate: 25
      });
    });
  }

  observeLazyElements({
    loadedClass: 'd-loaded',
    errorClass: 'error'
  });

  observeLazy();
});

export { default as replaceVideoPlaceholdersInDialog } from './components/video-popover.js';
export { default as PopoverDragScrollSnap } from './components/popover-drag-scroll-snap.js';
