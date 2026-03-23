let observed = false;
let resizeObserverTimeout;

export function observePopoverScrollSnapDrag(selector = ".oversnap-scroller", config = {}) {
  if (observed || !window.matchMedia("(pointer: fine)").matches) return;
  observed = true;

  const defaultConfig = {
    friction: 0.92,
    speedMultiplier: 1.5,
    enableKeyboard: true,
    enableScrollLock: true,
    enableFocusTrap: true,
    scrollAmount: window.innerWidth, // button navigation
  };
  const settings = { ...defaultConfig, ...config };
    
  console.log("Popover scroll snap drag initialized with selector:", selector, "and config:", settings);
    
	const observer = new MutationObserver(() => {
    // const openNav = document.querySelector(".project-pop:popover-open .pop-nav");
    // const popover = openNav?.closest("[popover]");
    // if (!popover) return;

		const openPopover = document.querySelector(".project-pop:popover-open");		
    if (!openPopover) return;

    const sliders = openPopover.querySelectorAll(selector);
    sliders.forEach((slider) => {
      if (slider.dataset.snapDrag === "true") return;
      slider.dataset.snapDrag = "true";
      enableDragScroll(slider, settings);
			enableButtonNavigation(slider, settings); // Add button navigation
    });

    if (settings.enableKeyboard) {
      enableKeyboardScroll(openPopover.querySelector(selector));
    }

    if (settings.enableFocusTrap) {
      trapFocus(openPopover);
    }
  });

  observer.observe(document.body, {
    subtree: true,
    attributes: true,
    attributeFilter: ["popover"]
  });
}


function enableButtonNavigation(slider, settings) {
  const popover = slider.closest('.project-pop:popover-open');
  if (!popover) return;

  // Only attach once per popover instance
  if (popover.dataset.buttonNav === "true") return;
  popover.dataset.buttonNav = "true";

  const prevButton = popover.querySelector('.pop-nav .prev');
  const nextButton = popover.querySelector('.pop-nav .next');

  // Dynamically calculate scroll amount based on first figure width
  const figure = slider.querySelector('figure');
  // Add gap if you use gap in CSS (e.g. 32px)
  const gap = 0;
  const scrollAmount = figure ? figure.offsetWidth + gap : settings.scrollAmount;

  function handlePrevClick(e) {
    e.preventDefault();
    e.stopPropagation();
		console.log("Prev clicked");
    slider.scrollBy({
      left: -scrollAmount,
      behavior: 'smooth'
    });
  }

  function handleNextClick(e) {
    e.preventDefault();
    e.stopPropagation();
		console.log("Next clicked");
    slider.scrollBy({
      left: scrollAmount,
      behavior: 'smooth'
    });
  }

  prevButton?.addEventListener('click', handlePrevClick);
  nextButton?.addEventListener('click', handleNextClick);

  // Update button states
  function updateButtonStates() {
    if (prevButton) {
      prevButton.disabled = slider.scrollLeft <= 0;
    }
    if (nextButton) {
      const maxScroll = slider.scrollWidth - slider.clientWidth;
      nextButton.disabled = Math.ceil(slider.scrollLeft) >= maxScroll;
    }
  }

  slider.addEventListener('scroll', updateButtonStates);
  updateButtonStates();
}



function enableDragScroll(slider, settings) {
  const isHorizontal = slider.scrollWidth > slider.clientWidth;
  const isVertical = slider.scrollHeight > slider.clientHeight;
  if (!isHorizontal && !isVertical) return;

  let isDown = false;
  let start, scrollStart;
  let velocity = 0;
  let lastPos = 0;
  let momentumID;

  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    isDown = true;
    start = isHorizontal ? e.pageX : e.pageY;
    scrollStart = isHorizontal ? slider.scrollLeft : slider.scrollTop;
    velocity = 0;
    lastPos = start;
    cancelMomentum();
    if (settings.enableScrollLock) lockScroll();
  };

  const onMouseMove = (e) => {
    if (!isDown) return;
    e.preventDefault();
    const current = isHorizontal ? e.pageX : e.pageY;
    const delta = (current - start) * settings.speedMultiplier;
    if (isHorizontal) {
      slider.scrollLeft = scrollStart - delta;
    } else {
      slider.scrollTop = scrollStart - delta;
    }
    velocity = current - lastPos;
    lastPos = current;
  };

  const onMouseUpLeave = () => {
    if (!isDown) return;
    isDown = false;
    if (settings.enableScrollLock) unlockScroll();
    startMomentum();
  };

  function startMomentum() {
    momentumID = requestAnimationFrame(momentumLoop);
  }

  function cancelMomentum() {
    cancelAnimationFrame(momentumID);
  }

  function momentumLoop() {
    if (isHorizontal) {
      slider.scrollLeft -= velocity;
      const max = slider.scrollWidth - slider.clientWidth;
      if (slider.scrollLeft <= 0 || slider.scrollLeft >= max) velocity = 0;
    } else {
      slider.scrollTop -= velocity;
      const max = slider.scrollHeight - slider.clientHeight;
      if (slider.scrollTop <= 0 || slider.scrollTop >= max) velocity = 0;
    }

    velocity *= settings.friction;
    if (Math.abs(velocity) > 0.5) {
      momentumID = requestAnimationFrame(momentumLoop);
    }
  }

  slider.addEventListener("mousedown", onMouseDown);
  slider.addEventListener("mousemove", onMouseMove);
  slider.addEventListener("mouseup", onMouseUpLeave);
  slider.addEventListener("mouseleave", onMouseUpLeave);
}

function enableKeyboardScroll(slider) {
  if (!slider) return;
  const onKeyDown = (e) => {
    const step = 60;
    switch (e.key) {
      case "ArrowRight":
        slider.scrollLeft += step;
        break;
      case "ArrowLeft":
        slider.scrollLeft -= step;
        break;
      case "ArrowDown":
        slider.scrollTop += step;
        break;
      case "ArrowUp":
        slider.scrollTop -= step;
        break;
      default:
        return;
    }
    e.preventDefault();
  };
  slider.closest("[popover]")?.addEventListener("keydown", onKeyDown, { once: true });
}

// Optional: lock body scroll during drag
let previousOverflow = "";

function lockScroll() {
  previousOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
}

function unlockScroll() {
  document.body.style.overflow = previousOverflow || "";
}

// Focus trap
function trapFocus(container) {
  const focusable = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  const handleTab = (e) => {
    if (e.key !== "Tab") return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  container.addEventListener("keydown", handleTab);

}