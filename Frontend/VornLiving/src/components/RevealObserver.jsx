import React, { useEffect } from 'react';

const RevealObserver = () => {
  useEffect(() => {
    const selector = '[data-reveal]';
    const els = Array.from(document.querySelectorAll(selector));
    if (els.length === 0) return;
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          } else {
            entry.target.classList.remove('is-visible');
          }
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
  return null;
};

export default RevealObserver;
