// import './preloader';
import '../scss/index.scss';
import 'vanilla-ripplejs';


if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
      navigator.serviceWorker.register("/service-worker.js").then(
          (registration) => {
              console.log("Service Worker registered with scope:", registration.scope);
          },
          (error) => {
              console.error("Service Worker registration failed:", error);
          }
      );
  });
}
self.addEventListener("install", (event) => {
  
  event.waitUntil(
      caches.open("my-cache-v2").then((cache) => {
          return cache.addAll(["/", "/index.html", "/js/main.js"]);
      })
  );
});




document.addEventListener("DOMContentLoaded", function () {
  const lazyImages = document.querySelectorAll(".tab-panes img[loading='lazy']");

  // Detect if the user is on mobile
  const isMobile = window.innerWidth < 768;

  // Customize delay for staggered loading
  const baseDelay = isMobile ? 50 : 100; // Faster on mobile, slower on desktop

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          const img = entry.target;

          if (!img.classList.contains("loaded")) {
            img.classList.add("img-lazy");

            setTimeout(() => {
              img.src = img.src; // Force load image
            }, index * baseDelay); // Customizable delay

            img.addEventListener("load", () => {
              img.classList.add("loaded");
            });

            observer.unobserve(img); // Stop observing after loading
          }
        }
      });
    }, { rootMargin: isMobile ? "50px 0px" : "100px 0px" }); // Adjust preloading for mobile

    lazyImages.forEach(img => observer.observe(img));
  }

  // Handle tab switches manually with delay
  document.querySelectorAll(".nav-tabs input").forEach(input => {
    input.addEventListener("change", function () {
      if (this.checked) {
        const targetTabId = this.id.replace("nav-", "") + "-tab";
        const targetTab = document.getElementById(targetTabId);

        if (targetTab) {
          targetTab.querySelectorAll("img[loading='lazy']:not(.loaded)").forEach((img, index) => {
            setTimeout(() => {
              img.src = img.src; // Load with delay
            }, index * baseDelay);
          });
        }
      }
    });
  });

  // ✅ Debounced Resize Event
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const isMobileNow = window.innerWidth < 768;
      const newBaseDelay = isMobileNow ? 100 : 200;

      document.querySelectorAll(".tab-panes img[loading='lazy']:not(.loaded)").forEach((img, index) => {
        setTimeout(() => {
          img.src = img.src; // Reload images with delay on resize
        }, index * newBaseDelay);
      });
    }, 250);
  });
});
