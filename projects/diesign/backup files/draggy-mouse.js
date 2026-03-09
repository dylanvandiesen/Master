export class DraggyMouse {
  /**
   * @param {HTMLElement} container - The scrollable gallery container
   */
  constructor(container) {
    this.container = container;
    this.isDragging = false;
    this.startX = 0;
    this.scrollLeft = 0;
    this.lastX = 0;
    this.rafId = null;
    this.isVerticalScroll = false;
    this.startY = 0;

    // Bind methods
  this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
    this.preventElementDrag = this.preventElementDrag.bind(this);


    // Attach event listeners
    this.container.addEventListener('mousedown', this.onMouseDown, { passive: false });
    this.container.addEventListener('mousemove', this.onMouseMove, { passive: false });
    this.container.addEventListener('mouseup', this.onMouseUp);
    this.container.addEventListener('mouseleave', this.onMouseUp);
    
    // Touch events
    this.container.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.container.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.container.addEventListener('touchend', this.onTouchEnd);

    // Prevent drag ghosting on all figure elements
    this.elementListeners = [];
    this.addDragListeners();
  }

  addDragListeners() {
    // Select all draggable elements inside the container
    const elements = this.container.querySelectorAll('figure, img, video');
    elements.forEach(element => {
      element.addEventListener('dragstart', this.preventElementDrag);
      element.style.userSelect = 'none';
      element.style.webkitUserDrag = 'none';
      this.elementListeners.push(element);
    });
  }

  preventElementDrag(e) {
    e.preventDefault();
  }

  onMouseDown(e) {
    if (e.button !== 0) return;
    const figure = e.target.closest('figure');
    
    // If clicking on a figure that can scroll vertically
    if (figure && figure.scrollHeight > figure.clientHeight) {
      this.isVerticalScroll = true;
      this.startY = e.pageY;
      return; // Don't prevent default to allow vertical scrolling
    }
    
    this.isVerticalScroll = false;
    this.isDragging = true;
    this.container.classList.add('dragging');
    this.startX = e.pageX - this.container.offsetLeft;
    this.scrollLeft = this.container.scrollLeft;
    e.preventDefault();
  }

  onMouseMove(e) {
    // If we're in vertical scroll mode, let the browser handle it
    if (this.isVerticalScroll) {
      return;
    }

    if (!this.isDragging) return;
    e.preventDefault();
    
    // Store current position
    this.lastX = e.pageX - this.container.offsetLeft;
    
    // Use requestAnimationFrame for smooth scrolling
    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => this.updateScroll());
    }
  }

  updateScroll() {
    if (!this.isDragging) {
      this.rafId = null;
      return;
    }

    const walk = (this.lastX - this.startX) * 2;
    this.container.scrollLeft = this.scrollLeft - walk;
    
    this.rafId = requestAnimationFrame(() => this.updateScroll());
  }
  onMouseUp() {
    this.isDragging = false;
    this.isVerticalScroll = false;
    this.container.classList.remove('dragging');
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  onTouchStart(e) {
    const figure = e.target.closest('figure');
    
    // Check for vertical scrollable figure
    if (figure && figure.scrollHeight > figure.clientHeight) {
      this.isVerticalScroll = true;
      this.startY = e.touches[0].pageY;
      return;
    }

    this.isDragging = true;
    this.container.classList.add('dragging');
    this.startX = e.touches[0].pageX - this.container.offsetLeft;
    this.scrollLeft = this.container.scrollLeft;
    e.preventDefault();
  }

  onTouchMove(e) {
    if (this.isVerticalScroll) return;
    if (!this.isDragging) return;
    
    e.preventDefault();
    const x = e.touches[0].pageX - this.container.offsetLeft;
    const walk = (x - this.startX) * 2;
    this.container.scrollLeft = this.scrollLeft - walk;
  }

  onTouchEnd() {
    this.isDragging = false;
    this.container.classList.remove('dragging');
  }

  destroy() {
    // Remove all event listeners
    this.container.removeEventListener('mousedown', this.onMouseDown);
    this.container.removeEventListener('mousemove', this.onMouseMove);
    this.container.removeEventListener('mouseup', this.onMouseUp);
    this.container.removeEventListener('mouseleave', this.onMouseUp);
    this.container.removeEventListener('touchstart', this.onTouchStart);
    this.container.removeEventListener('touchmove', this.onTouchMove);
    this.container.removeEventListener('touchend', this.onTouchEnd);

    // Remove drag listeners from all elements
    this.elementListeners.forEach(element => {
      element.removeEventListener('dragstart', this.preventElementDrag);
      element.style.userSelect = '';
      element.style.webkitUserDrag = '';
    });
    // Clear the listeners array
    this.elementListeners = [];
        if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}





// export class DraggyMouse {
//   /**
//    * @param {HTMLElement} container - The scrollable gallery container
//    */
//   constructor(container) {
//     this.container = container;
//     this.isDragging = false;
//     this.startX = 0;
//     this.scrollLeft = 0;

//     // Bind methods
//     this.onMouseDown = this.onMouseDown.bind(this);
//     this.onMouseMove = this.onMouseMove.bind(this);
//     this.onMouseUp = this.onMouseUp.bind(this);
//     this.preventFigureDrag = this.preventFigureDrag.bind(this);

//     // Attach event listeners
//     this.container.addEventListener('mousedown', this.onMouseDown);
//     this.container.addEventListener('mouseleave', this.onMouseUp);
//     this.container.addEventListener('mouseup', this.onMouseUp);
//     this.container.addEventListener('mousemove', this.onMouseMove);

//     // Prevent drag ghosting on all figure elements
//     this.figureListeners = [];
//     this.addFigureListeners();
//   }

//   addFigureListeners() {
//     // Select all figure elements inside the container, at any depth
//     const figures = this.container.querySelectorAll('figure');
//     figures.forEach(figure => {
//       figure.addEventListener('dragstart', this.preventFigureDrag);
//       this.figureListeners.push(figure);
//     });
//   }

//   preventFigureDrag(e) {
//     e.preventDefault();
//   }

//   onMouseDown(e) {
//     if (e.button !== 0) return; // Only left mouse button
//     this.isDragging = true;
//     this.container.classList.add('dragging');
//     this.startX = e.pageX - this.container.offsetLeft;
//     this.scrollLeft = this.container.scrollLeft;
//     e.preventDefault();
//   }

//   onMouseMove(e) {
//     if (!this.isDragging) return;
//     const x = e.pageX - this.container.offsetLeft;
//     const walk = (x - this.startX) * 1; // Multiplier for speed
//     this.container.scrollLeft = this.scrollLeft - walk;
//   }

//   onMouseUp() {
//     this.isDragging = false;
//     this.container.classList.remove('dragging');
//   }

//   destroy() {
//     this.container.removeEventListener('mousedown', this.onMouseDown);
//     this.container.removeEventListener('mouseleave', this.onMouseUp);
//     this.container.removeEventListener('mouseup', this.onMouseUp);
//     this.container.removeEventListener('mousemove', this.onMouseMove);

//     // Remove dragstart listeners from figures
//     this.figureListeners.forEach(figure => {
//       figure.removeEventListener('dragstart', this.preventFigureDrag);
//     });
//     this.figureListeners = [];
//   }
// }