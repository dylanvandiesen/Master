import './preloader';
import '../scss/index.scss';
import Parallax from 'parallax-js'
import 'vanilla-ripplejs';
import replaceVideoPlaceholdersInDialog from './components/video-popover.js';
import PopoverDragScrollSnap from './components/popover-drag-scroll-snap.js';

document.addEventListener("DOMContentLoaded", () => {

// INIT PARALLAX //----------------------------------------------------//

  const scene = document.getElementById('stage');
  new Parallax(scene);

//---------------------------------------------------------------------//

// HISTORY AND TAB STATES //-------------------------------------------//
  // --- Helper: Open popover by projectId ---
  function openProjectPopover(projectId) {
    const dialog = document.getElementById(projectId);
    if (dialog) {
      dialog.showPopover?.(); // native popover, or fallback:
      dialog.setAttribute('open', '');
      replaceVideoPlaceholdersInDialog(dialog);
      new PopoverDragScrollSnap();
    }
  }

  // --- Helper: Close all popovers ---
  function closeAllPopovers() {
    document.querySelectorAll('.project-pop[open]').forEach(pop => {
      pop.hidePopover?.();
      pop.removeAttribute('open');
    });
  }
   // --- Clean urls ---
  if (location.pathname !== '/' && location.pathname.endsWith('/')) {
    const newPath = location.pathname.replace(/\/+$/, ''); // removes ALL trailing slashes
    history.replaceState({}, '', newPath);
  }

  // --- Routing logic ---
  function handleRoute() {
    const pathParts = location.pathname.split('/').filter(Boolean);
    const [tab, projectId] = pathParts;
    const tabName = tab || 'home';

    // Set tab
    const radio = document.getElementById(`nav-${tabName}`);
    if (radio) radio.checked = true;

    // Close any open popovers
    closeAllPopovers();

    // Open popover if projectId present
    if (tabName === 'work' && projectId) {
      openProjectPopover(projectId);
    }
  }

  // Initial route
  handleRoute();

  // Tab change: update URL
  document.querySelectorAll('input[name="d-tabs"]').forEach(input => {
    input.addEventListener('change', () => {
      if (input.checked) {
        const tab = input.id.replace('nav-', '');
        history.pushState({}, '', tab === 'home' ? '/' : `/${tab}`);
        handleRoute();
      }
    });
  });

  // Popstate: handle browser navigation
  window.addEventListener('popstate', handleRoute);

  // Popover open: update URL
  document.querySelectorAll('.pop-btn.open').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      const projectId = btn.getAttribute('popovertarget');
      history.pushState({}, '', `/work/${projectId}`);
      handleRoute();
    });
  });

  // Popover close: update URL back to /work
  document.querySelectorAll('.project-pop .icon.close').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault(); // Prevent the default popover closing behavior
      history.pushState({}, '', '/work');
      handleRoute();
    });
  });
  // // Restore tab state on initial load
  // const path = location.pathname.replace('/', '') || 'home';
  // const radio = document.getElementById(`nav-${path}`);
  // if (radio) radio.checked = true;

  // // Minimal history pushState for tab radios using path
  // document.querySelectorAll('input[name="d-tabs"]').forEach(input => {
  //   input.addEventListener('change', () => {
  //     if (input.checked) {
  //       const tab = input.id.replace('nav-', '');
  //       history.pushState({ tab }, '', tab === 'home' ? '/' : `/${tab}`);
  //     }
  //   });
  // });

  // // Optional: On popstate, restore tab selection
  // window.addEventListener('popstate', () => {
  //   const path = location.pathname.replace('/', '') || 'home';
  //   const radio = document.getElementById(`nav-${path}`);
  //   if (radio) radio.checked = true;
  // });

//--------------------------------------------------------------------//

});

// INIT POPOVER SCRIPTS //--------------------------------------------//

document.addEventListener('click', e => {
  const btn = e.target.closest('.pop-btn.open');
  if (btn) {
    const dialogId = btn.getAttribute('popovertarget');
    setTimeout(() => {
      const dialog = document.getElementById(dialogId);
      if (dialog) {
        replaceVideoPlaceholdersInDialog(dialog);
        // console.log('[initAfterPopOpen] replaceVideoPlaceholdersInDialog called for', dialogId);
      }
      new PopoverDragScrollSnap();
    }, 350);
  }
});

//--------------------------------------------------------------------//