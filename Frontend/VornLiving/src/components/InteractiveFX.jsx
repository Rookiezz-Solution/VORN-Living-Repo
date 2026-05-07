import React, { useEffect } from 'react';

const InteractiveFX = () => {
  useEffect(() => {
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cleanups = [];

    if (!reduced) {
      const tiltEls = Array.from(document.querySelectorAll('[data-tilt]'));
      tiltEls.forEach(el => {
        const onMove = (e) => {
          const rect = el.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const px = (x / rect.width) - 0.5;
          const py = (y / rect.height) - 0.5;
          const rotX = (-py) * 8;
          const rotY = (px) * 8;
          el.style.transform = `perspective(600px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.02)`;
        };
        const onLeave = () => {
          el.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg) scale(1)';
        };
        el.style.transition = 'transform 180ms ease-out';
        el.addEventListener('mousemove', onMove);
        el.addEventListener('mouseleave', onLeave);
        el.addEventListener('blur', onLeave);
        el.addEventListener('touchend', onLeave, { passive: true });
        cleanups.push(() => {
          el.removeEventListener('mousemove', onMove);
          el.removeEventListener('mouseleave', onLeave);
          el.removeEventListener('blur', onLeave);
          el.removeEventListener('touchend', onLeave);
        });
      });
    }

    const rippleEls = Array.from(document.querySelectorAll('[data-ripple], .rf-btn-primary, .rf-btn-secondary'));
    rippleEls.forEach(el => {
      const computed = window.getComputedStyle(el);
      if (computed.position === 'static') el.style.position = 'relative';
      el.style.overflow = 'hidden';
      const onClick = (e) => {
        const rect = el.getBoundingClientRect();
        const circle = document.createElement('span');
        circle.className = 'ripple-circle';
        const size = Math.max(rect.width, rect.height);
        circle.style.width = circle.style.height = `${size}px`;
        circle.style.left = `${e.clientX - rect.left - size / 2}px`;
        circle.style.top = `${e.clientY - rect.top - size / 2}px`;
        el.appendChild(circle);
        setTimeout(() => circle.remove(), 600);
      };
      el.addEventListener('click', onClick);
      cleanups.push(() => el.removeEventListener('click', onClick));
    });

    return () => cleanups.forEach(fn => fn());
  }, []);
  return null;
};

export default InteractiveFX;
