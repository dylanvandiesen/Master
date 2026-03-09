/**
 * PopoverHandler: manages popover initialization lifecycle.
 * This handler is for legacy/fallback popover handling - the main logic is now in setup-dynamic-navigation.js
 */
export default class PopoverHandler {
  constructor(options = {}) {
    this.initDelay = options.initDelay ?? 300;
    this.autoOpenDetails = options.autoOpenDetails ?? true;
    this.onAfterOpen = options.onAfterOpen ?? (() => {});
    this._destroyed = false;
  }

  /**
   * Attach the handler to click events.
   * Only handles popovers that aren't managed by the navigation system
   */
  attach(target = document) {
    if (this._destroyed) return;
    
    target.addEventListener('click', (e) => this._handleClick(e));
  }

  /**
   * Internal click handler - only for non-navigation popovers
   */
  _handleClick(e) {
    if (this._destroyed) return;
    
    // Skip if this is a navigation-managed popover
    const btn = e.target.closest('.pop-btn.open');
    if (!btn) return;
    
    // If it has popovertarget, let navigation handle it
    if (btn.getAttribute('popovertarget')) return;

    // Handle legacy popovers here if needed
    const dialogId = btn.getAttribute('data-popover-id') || btn.getAttribute('aria-controls');
    if (!dialogId) return;

    let dialog = document.getElementById(dialogId);
    if (!dialog) return;

    const onReady = () => this._initializeDialog(dialog);

    // If already open, initialize immediately
    if (dialog.matches(':popover-open')) {
      onReady();
      return;
    }

    // Wait for popover toggle
    const onToggle = (ev) => {
      if (this._destroyed) return;
      
      if (dialog.matches(':popover-open')) {
        // Clean up previous instance
        if (dialog._scrollSnapInstance?.destroy) {
          dialog._scrollSnapInstance.destroy();
          dialog._scrollSnapInstance = null;
        }
        onReady();
      } else {
        // Cleanup on close
        if (dialog._scrollSnapInstance?.destroy) {
          dialog._scrollSnapInstance.destroy();
          dialog._scrollSnapInstance = null;
        }
      }
    };

    dialog.addEventListener('toggle', onToggle, { once: false });
  }

  /**
   * Initializes dialog content.
   */
  async _initializeDialog(dialog) {
    if (this._destroyed) return;
    
    try {
      // Preloader if available
      if (typeof window.popoverPreloader === 'function') {
        await window.popoverPreloader(dialog);
      }

      // Replace video placeholders
      if (typeof window.replaceVideoPlaceholdersInDialog === 'function') {
        await window.replaceVideoPlaceholdersInDialog(dialog);
      }

      // Auto-open <details>
      if (this.autoOpenDetails) {
        const details = dialog.querySelector('details');
        if (details && !this._destroyed) {
          const onTransitionEnd = () => {
            if (this._destroyed) return;
            
            requestAnimationFrame(() => {
              if (dialog.matches(':popover-open') && !this._destroyed) {
                details.open = true;
              }
            });
            dialog.removeEventListener('transitionend', onTransitionEnd);
          };
          dialog.addEventListener('transitionend', onTransitionEnd);
        }
      }

      // Drag/Scroll Snap - only if not already managed
      if (typeof window.PopoverDragScrollSnap === 'function' && !dialog._scrollSnapInstance) {
        const instance = new window.PopoverDragScrollSnap();
        dialog._scrollSnapInstance = instance;
      }

      // Lazy media support
      if (typeof window.observeLazyElements === 'function') {
        window.observeLazyElements(dialog);
      }

      // Final callback
      if (!this._destroyed) {
        this.onAfterOpen(dialog);
      }
      
    } catch (error) {
      console.error('[PopoverHandler] Error initializing dialog:', error);
    }
  }

  /**
   * Destroy the handler and clean up
   */
  destroy() {
    this._destroyed = true;
    
    // Clean up any managed dialogs
    document.querySelectorAll('[data-popover-managed]').forEach(dialog => {
      if (dialog._scrollSnapInstance?.destroy) {
        dialog._scrollSnapInstance.destroy();
        dialog._scrollSnapInstance = null;
      }
    });
  }
}

// /**
//  * PopoverHandler: manages popover initialization lifecycle.
//  */
// export default class PopoverHandler {
//   /**
//    * @param {Object} options
//    * @param {number} [options.initDelay=300] - Fallback delay if lifecycle events are unavailable.
//    * @param {boolean} [options.autoOpenDetails=true] - Whether to open <details>.
//    * @param {Function} [options.onAfterOpen] - Custom callback after initialization.
//    */
//   constructor(options = {}) {
//     this.initDelay = options.initDelay ?? 300;
//     this.autoOpenDetails = options.autoOpenDetails ?? true;
//     this.onAfterOpen = options.onAfterOpen ?? (() => {});
//   }

//   /**
//    * Attach the handler to click events.
//    * @param {Element|Document} target - e.g., document or a container.
//    */
//   attach(target = document) {
//     target.addEventListener('click', (e) => this._handleClick(e));
//   }

//   /**
//    * Internal click handler.
//    * @param {MouseEvent} e
//    */
//   _handleClick(e) {
//     const btn = e.target.closest('.pop-btn.open');
//     if (!btn) return;

//     const dialogId = btn.getAttribute('popovertarget');
//     if (!dialogId) return;

//     let dialog = document.getElementById(dialogId);

//     // Dynamically inject from <template>
//     if (!dialog) {
//       const tpl = document.getElementById(`template-${dialogId}`);
//       if (tpl?.content) {
//         dialog = tpl.content.firstElementChild.cloneNode(true);
//         dialog.id = dialogId;
//         document.body.appendChild(dialog);
//       }
//     }

//     if (!dialog) return;

//     const onReady = () => this._initializeDialog(dialog);

//     // If already open, initialize immediately
//     if (dialog.matches(':popover-open')) {
//       onReady();
//       return;
//     }

//     // Wait for popover toggle
//     const onToggle = (ev) => {
//       if (dialog.matches(':popover-open')) {
//         // Re-init if necessary
//         dialog._scrollSnapInstance?.destroy?.();
//         dialog._scrollSnapInstance = null;
//         onReady();
//       } else {
//         // Cleanup on close
//         dialog._scrollSnapInstance?.destroy?.();
//         dialog._scrollSnapInstance = null;
//       }
//     };

//     dialog.addEventListener('toggle', onToggle, { once: false });
//   }

//   /**
//    * Initializes dialog content.
//    * @param {HTMLElement} dialog
//    */
//   async _initializeDialog(dialog) {
//     // Preloader if available
//     if (typeof window.popoverPreloader === 'function') {
//       await window.popoverPreloader(dialog);
//     }

//     // Replace video placeholders
//     if (typeof window.replaceVideoPlaceholdersInDialog === 'function') {
//       await window.replaceVideoPlaceholdersInDialog(dialog);
//     }

//     // Auto-open <details>
//     if (this.autoOpenDetails) {
//       const details = dialog.querySelector('details');
//       if (details) {
//         const onTransitionEnd = () => {
//           requestAnimationFrame(() => {
//             if (dialog.matches(':popover-open')) {
//               details.open = true;
//             }
//           });
//           dialog.removeEventListener('transitionend', onTransitionEnd);
//         };
//         dialog.addEventListener('transitionend', onTransitionEnd);
//       }
//     }

//     // Drag/Scroll Snap
//     if (typeof window.PopoverDragScrollSnap === 'function') {
//       const instance = new window.PopoverDragScrollSnap();
//       dialog._scrollSnapInstance = instance;
//     }

//     // Lazy media support
//     if (typeof window.observeLazyElements === 'function') {
//       window.observeLazyElements(dialog);
//     }

//     // Final callback
//     this.onAfterOpen(dialog);
//   }
// }