// export class PopoverScroller {
//     constructor(popover, options = {}) {
//       this.config = Object.assign(
//         {
//           oversnapScrollerSelector: '.oversnap-scroller',
//           prevButtonSelector: '.pop-nav .prev',
//           nextButtonSelector: '.pop-nav .next',
//           scrollAmount: window.innerWidth,
//           scrollUpdateDelay: 0,
//           draggy: null,// Accept DraggyMouse instance
//         },
//         options
//       );
  
//       this.popover = popover;
//       this.scroller = popover.querySelector(this.config.oversnapScrollerSelector);
//       if (!this.scroller) return;
  
//       this.prevButton = popover.querySelector(this.config.prevButtonSelector);
//       this.nextButton = popover.querySelector(this.config.nextButtonSelector);
  
//       // Bind handlers
//       this.handleClick = this.handleClick.bind(this);
//       this.updateNavButtons = this.updateNavButtons.bind(this);
  
//       // Use provided DraggyMouse instance
//       this.draggy = this.config.draggy;

//       // Add event listeners
//       popover.addEventListener('click', this.handleClick);
//       this.scroller.addEventListener('scroll', this.updateNavButtons);
      
//       // Initial button state
//       this.updateNavButtons();
//     }
  
//     handleClick(e) {
//       if (e.target.closest(this.config.prevButtonSelector)) {
//         this.smoothScroll(-this.config.scrollAmount);
//       } else if (e.target.closest(this.config.nextButtonSelector)) {
//         this.smoothScroll(this.config.scrollAmount);
//       }
//     }

//     smoothScroll(amount) {
//       const newScrollLeft = this.scroller.scrollLeft + amount;
      
//       this.scroller.scrollTo({
//         left: newScrollLeft,
//         behavior: 'smooth'
//       });

//       // Update DraggyMouse scroll position
//       if (this.draggy) {
//         this.draggy.scrollLeft = this.scroller.scrollLeft;
//       }

//       // Update nav buttons after scroll
//       setTimeout(this.updateNavButtons, 300);
//     }

//     updateNavButtons() {
//       if (!this.prevButton || !this.nextButton) return;
  
//       // Disable prev button if at or near the start
//       this.prevButton.disabled = this.scroller.scrollLeft <= 0;
      
//       // Disable next button if at or near the end
//       const maxScroll = this.scroller.scrollWidth - this.scroller.clientWidth;
//       this.nextButton.disabled = Math.ceil(this.scroller.scrollLeft) >= maxScroll;
//     }

//     destroy() {
//       if (this.draggy) {
//         this.draggy.destroy();
//       }
//       this.popover.removeEventListener('click', this.handleClick);
//       this.scroller.removeEventListener('scroll', this.updateNavButtons);
//     }
// }










export class PopoverScroller {
    constructor(popover, options = {}) {
      this.config = Object.assign(
        {
          oversnapScrollerSelector: '.oversnap-scroller',
          prevButtonSelector: '.pop-nav .prev',
          nextButtonSelector: '.pop-nav .next',
          scrollAmount: window.innerWidth,
          // Delay (in ms) to update nav buttons following a smooth scroll
          scrollUpdateDelay: 500,
        },
        options
      );
  
      this.popover = popover;
      this.scroller = popover.querySelector(this.config.oversnapScrollerSelector);
      if (!this.scroller) return;
  
      this.prevButton = popover.querySelector(this.config.prevButtonSelector);
      this.nextButton = popover.querySelector(this.config.nextButtonSelector);
  
      // Bind handlers so that "this" refers to the class instance
      this.handleClick = this.handleClick.bind(this);
    //   this.updateNavButtons = this.updateNavButtons.bind(this);
  
      // Listen for clicks inside the popover and update on scroll
      popover.addEventListener('click', this.handleClick);
    //   this.scroller.addEventListener('scroll', this.updateNavButtons);
    //   window.addEventListener('resize', this.updateNavButtons);
  
      // Initialize disabled states
    //   this.updateNavButtons();
    }
  
    handleClick(e) {
      if (e.target.closest(this.config.prevButtonSelector)) {
        this.scroller.scrollBy({
          left: -this.config.scrollAmount,
          behavior: 'smooth'
        });
        // Delay update to allow smooth scrolling to complete
        // setTimeout(this.updateNavButtons, this.config.scrollUpdateDelay);
      } else if (e.target.closest(this.config.nextButtonSelector)) {
        this.scroller.scrollBy({
          left: this.config.scrollAmount,
          behavior: 'smooth'
        });
        // setTimeout(this.updateNavButtons, this.config.scrollUpdateDelay);
      }
    }
  
    // updateNavButtons() {
    //   if (!this.prevButton || !this.nextButton) return;
  
    //   // Disable prev button if at or near the start
    //   this.prevButton.disabled = this.scroller.scrollLeft <= 0;
    //   // Disable next button if at or near the end (using Math.ceil to avoid rounding issues)
    //   this.nextButton.disabled =
    //     Math.ceil(this.scroller.scrollLeft + this.scroller.clientWidth) >= this.scroller.scrollWidth;
    // }
  }