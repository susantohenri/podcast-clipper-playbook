window.initPodcastComposition = function (tl) {
  const config = window.SCENES_DATA;
  if (!config) {
    console.warn("[HyperFrames] window.SCENES_DATA not found.");
    return;
  }

  // 1. Set theme variables
  if (config.theme) {
    if (config.theme.backgroundColor) {
      document.documentElement.style.setProperty('--color-bg-dark', config.theme.backgroundColor);
    }
    if (config.theme.primaryColor) {
      document.documentElement.style.setProperty('--color-primary', config.theme.primaryColor);
    }
    if (config.theme.accentColor) {
      document.documentElement.style.setProperty('--color-accent', config.theme.accentColor);
    }
    if (config.theme.textColor) {
      document.documentElement.style.setProperty('--color-text', config.theme.textColor);
    }
  }
  if (config.captions?.highlightColor) {
    document.documentElement.style.setProperty('--color-highlight', config.captions.highlightColor);
  }

  const hookDur = parseFloat(config.timings?.hookDuration) || (config.clip.hook.end - config.clip.hook.start);
  const mainDur = parseFloat(config.timings?.mainDuration) || (config.clip.main.end - config.clip.main.start);
  const totalDur = hookDur + mainDur;

  const scenesWrapper = document.getElementById('scenes-wrapper');

  // Animate progress bar across total duration
  tl.fromTo('#progress-bar', { width: '0%' }, { width: '100%', duration: totalDur, ease: 'none' }, 0);

  const speakerMap = {};
  if (Array.isArray(config.speakers)) {
    config.speakers.forEach(sp => { speakerMap[sp.id] = sp; });
  }

  const sceneList = [
    {
      key: 'hook',
      id: 'scene-hook',
      spec: config.scenes?.hook || {},
      start: 0,
      duration: hookDur,
      videoSrc: 'working/hook-portrait.mp4',
      defaultBadge: '',
      isFirst: true,
      transcript: config.transcriptHook || []
    },
    {
      key: 'main',
      id: 'scene-main',
      spec: config.scenes?.main || {},
      start: hookDur,
      duration: mainDur,
      videoSrc: 'working/main-clip-portrait.mp4',
      defaultBadge: '',
      isFirst: false,
      transcript: config.transcriptMain || []
    }
  ];

  function formatHeadline(headlineText, spec, decoration) {
    const useGradientChunks = (decoration === 'gradient-fill' || Boolean(spec.textGradient));
    if (Array.isArray(spec.highlightWords) && spec.highlightWords.length > 0) {
      const validWords = spec.highlightWords
        .filter(w => typeof w === 'string' && w.trim().length > 0)
        .sort((a, b) => b.length - a.length)
        .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      if (validWords.length > 0) {
        const regex = new RegExp(`(${validWords.join('|')})`, 'gi');
        return headlineText.split(regex).map((part, idx) => {
          if (!part) return '';
          if (idx % 2 === 1) return `<span class="highlight-span">${part}</span>`;
          return useGradientChunks ? `<span class="gradient-chunk">${part}</span>` : part;
        }).join('');
      }
    }
    return useGradientChunks && headlineText ? `<span class="gradient-chunk">${headlineText}</span>` : headlineText;
  }

  function formatBeatTitle(title, highlight) {
    if (!highlight || typeof highlight !== 'string' || !highlight.trim()) return title;
    const escaped = highlight.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'i');
    return title.replace(regex, '<span class="vox-mark-wrap"><span class="vox-mark-bg"></span><span class="vox-mark-text">$1</span></span>');
  }

  const hudTimecodeNodes = [];

  sceneList.forEach((sc) => {
    const spec = sc.spec;
    const layout = spec.layout || 'blurred-backdrop';
    const treatment = spec.mediaTreatment || 'full-bleed';
    const motion = spec.mediaMotion || 'slow-zoom-in';
    const bgTreatment = spec.backgroundTreatment || 'vignette';
    const fontMood = spec.textTreatment?.fontMood || 'bold-geometric';
    const decoration = spec.textTreatment?.decoration || 'hard-shadow';
    const emphasis = spec.emphasisEffect || 'none';
    const badgeText = spec.badge !== undefined ? spec.badge : sc.defaultBadge;
    const headlineText = spec.headline || '';
    const anim = spec.animation || 'pop';

    const sceneEl = document.createElement('div');
    sceneEl.id = sc.id;
    sceneEl.className = `clip layout-${layout}`;
    sceneEl.setAttribute('data-start', sc.start.toFixed(2));
    sceneEl.setAttribute('data-duration', sc.duration.toFixed(2));

    let bgFxHtml = '';
    if (bgTreatment === 'vignette') {
      bgFxHtml += '<div class="bg-fx-vignette"></div>';
    } else if (bgTreatment === 'radial-glow') {
      bgFxHtml += '<div class="bg-fx-radial-glow"></div>';
    } else if (bgTreatment === 'gradient') {
      bgFxHtml += '<div class="bg-fx-gradient"></div>';
    } else if (bgTreatment === 'noise-texture') {
      bgFxHtml += '<div class="bg-fx-noise"></div>';
    } else if (bgTreatment === 'floating-particles') {
      bgFxHtml += `
        <div class="bg-fx-particles" id="${sc.id}-particles">
          <div class="particle-dot" style="top: 20%; left: 15%;"></div>
          <div class="particle-dot" style="top: 35%; right: 18%; width: 14px; height: 14px;"></div>
          <div class="particle-dot" style="top: 65%; left: 22%; width: 8px; height: 8px;"></div>
          <div class="particle-dot" style="top: 78%; right: 25%; width: 12px; height: 12px;"></div>
        </div>`;
    }

    const formattedHeadline = formatHeadline(headlineText, spec, decoration);
    const textSizeClass = spec.textSize ? `text-size-${spec.textSize}` : '';

    const headlineStyleParts = [];
    if (spec.textColor) headlineStyleParts.push(`color: ${spec.textColor};`);
    if (spec.textGradient) {
      const grad = (typeof spec.textGradient === 'string' && spec.textGradient.includes('gradient'))
        ? spec.textGradient
        : `linear-gradient(135deg, ${Array.isArray(spec.textGradient) ? spec.textGradient.join(', ') : spec.textGradient})`;
      headlineStyleParts.push(`--headline-gradient: ${grad};`);
    }
    const headlineCustomStyle = headlineStyleParts.length > 0 ? `style="${headlineStyleParts.join(' ')}"` : '';

    let stickersHtml = '';
    if (Array.isArray(spec.stickers) && spec.stickers.length > 0) {
      stickersHtml = `<div class="scene-stickers-wrap" id="${sc.id}-stickers">` +
        spec.stickers.map((stk, sIdx) => {
          const pos = stk.position || 'top-right';
          const icon = stk.icon ? `<span class="sticker-icon">${stk.icon}</span>` : '';
          const text = stk.text ? `<span class="sticker-text">${stk.text}</span>` : '';
          const bg = stk.bg ? `background: ${stk.bg};` : '';
          const color = stk.color ? `color: ${stk.color};` : '';
          const border = stk.border ? `border: ${stk.border};` : '';
          return `<div class="scene-sticker sticker-${pos}" id="${sc.id}-sticker-${sIdx}" style="${bg} ${color} ${border}" data-layout-ignore="true">${icon}${text}</div>`;
        }).join('') + `</div>`;
    }

    // Kinetic Beats HTML
    let beatsHtml = '';
    const beats = Array.isArray(spec.beats) ? spec.beats : [];
    if (beats.length > 0) {
      beatsHtml = `<div class="scene-beats-wrap" id="${sc.id}-beats">` +
        beats.map((b, bIdx) => {
          const bStyle = b.style || 'vox-card';
          const bPos = b.position || 'upper-card';
          const eyebrow = b.eyebrow ? `<div class="beat-eyebrow">${b.eyebrow}</div>` : '';
          const icon = b.icon ? `<span class="beat-icon">${b.icon}</span>` : '';
          const titleHtml = formatBeatTitle(b.title || '', b.highlight);
          const quoteBar = bStyle === 'editorial-quote' ? '<div class="beat-quote-bar"></div>' : '';
          return `
            <div class="beat-card beat-style-${bStyle} beat-pos-${bPos}" id="${sc.id}-beat-${bIdx}" data-layout-allow-occlusion="true">
              <div class="beat-inner">
                ${quoteBar}
                ${bStyle === 'pill-callout' ? `${icon}<div class="beat-title">${titleHtml}</div>` : `${eyebrow}<div class="beat-title">${icon ? icon + ' ' : ''}${titleHtml}</div>`}
              </div>
            </div>`;
        }).join('') + `</div>`;
    }

    // Overlay Elements (Catalog upgraded)
    let overlayFxHtml = '';
    const overlays = Array.isArray(spec.overlayElements) ? spec.overlayElements : [];
    if (overlays.includes('vox-grid')) {
      overlayFxHtml += `<div class="overlay-vox-grid" id="${sc.id}-vox-grid" data-layout-ignore="true"></div>`;
    }
    if (overlays.includes('speed-lines')) {
      overlayFxHtml += `<div class="overlay-speed-lines" id="${sc.id}-speed-lines" data-layout-ignore="true"></div>`;
    }
    if (overlays.includes('warning-stripes')) {
      overlayFxHtml += `
        <div class="overlay-warning-stripes top" id="${sc.id}-stripes-top" data-layout-ignore="true"></div>
        <div class="overlay-warning-stripes bottom" id="${sc.id}-stripes-bottom" data-layout-ignore="true"></div>`;
    }
    if (overlays.includes('neon-frame')) {
      overlayFxHtml += `
        <svg class="overlay-neon-svg" id="${sc.id}-neon-frame" viewBox="0 0 1080 1920" data-layout-ignore="true">
          <rect id="${sc.id}-neon-rect" x="22" y="22" width="1036" height="1876" rx="30"
            fill="none" stroke="var(--color-highlight)" stroke-width="4"
            stroke-dasharray="5820" stroke-dashoffset="5820"
            style="filter: drop-shadow(0 0 14px var(--color-highlight));" />
        </svg>`;
    }
    if (overlays.includes('film-grain')) {
      overlayFxHtml += `
        <svg class="overlay-film-grain" id="${sc.id}-film-grain" data-layout-ignore="true">
          <rect width="100%" height="100%" filter="url(#hf-grain-filter)" />
        </svg>`;
    }
    if (overlays.includes('camcorder-hud')) {
      overlayFxHtml += `
        <div class="overlay-camcorder-hud" id="${sc.id}-hud" data-layout-ignore="true">
          <div class="hud-corner tl"></div><div class="hud-corner tr"></div>
          <div class="hud-corner bl"></div><div class="hud-corner br"></div>
          <div class="hud-rec" data-layout-ignore="true"><span class="hud-rec-dot" id="${sc.id}-rec-dot"></span>REC</div>
          <div class="hud-tc" id="${sc.id}-hud-tc" data-layout-ignore="true">00:00:00:00</div>
        </div>`;
    }

    sceneEl.innerHTML = `
      <div class="scene-inner" id="${sc.id}-inner" data-layout-allow-overflow="true">
        <div class="bg-wrapper" data-layout-allow-overflow="true">
          ${layout === 'blurred-backdrop' ? `<video class="bg-backdrop-blur" src="${sc.videoSrc}" data-layout-allow-overflow="true" muted playsinline></video>` : ''}
          <div class="media-container treatment-${treatment}" id="${sc.id}-media-container" data-layout-allow-overflow="true">
            <video id="${sc.id}-media" class="scene-media" src="${sc.videoSrc}" data-start="${sc.start.toFixed(2)}" data-duration="${sc.duration.toFixed(2)}" data-layout-allow-overflow="true" muted playsinline></video>
          </div>
          ${bgFxHtml}
          ${overlayFxHtml}
        </div>
        <div class="chroma-layer cyan" id="${sc.id}-chroma-c" data-layout-ignore="true"></div>
        <div class="chroma-layer magenta" id="${sc.id}-chroma-m" data-layout-ignore="true"></div>
        ${(badgeText || headlineText) ? `
          <div id="${sc.id}-header" class="header-overlay font-mood-${fontMood} emphasis-${emphasis} ${textSizeClass}" data-layout-allow-overflow="true" data-layout-allow-occlusion="true">
            ${badgeText ? `<div id="${sc.id}-badge" class="scene-badge" data-layout-allow-occlusion="true">${badgeText}</div>` : ''}
            ${headlineText ? `<div id="${sc.id}-headline" class="scene-headline decoration-${decoration}" ${headlineCustomStyle} data-layout-allow-occlusion="true">${formattedHeadline}</div>` : ''}
          </div>
        ` : ''}
        ${beatsHtml}
        ${stickersHtml}
      </div>
    `;

    scenesWrapper.appendChild(sceneEl);

    if (overlays.includes('camcorder-hud')) {
      const tcEl = document.getElementById(`${sc.id}-hud-tc`);
      if (tcEl) hudTimecodeNodes.push(tcEl);
    }

    const innerSel = `#${sc.id}-inner`;
    const mediaContainerSel = `#${sc.id}-media-container`;
    const headerSel = `#${sc.id}-header`;
    const badgeSel = `#${sc.id}-badge`;
    const headlineSel = `#${sc.id}-headline`;

    // 1. Transition In (with Catalog Shader/Motion Upgrades)
    const transIn = spec.transitionIn || (sc.isFirst ? 'cut' : 'crossfade');
    if (sc.isFirst && transIn === 'cut') {
      tl.set(innerSel, { opacity: 1 }, 0);
    } else {
      switch (transIn) {
        case 'cut':
          tl.set(innerSel, { opacity: 1 }, sc.start);
          break;
        case 'blur-crossfade':
          tl.fromTo(innerSel, { opacity: 0, filter: 'blur(24px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.45, ease: 'power2.out' }, sc.start);
          break;
        case 'push-up':
          tl.fromTo(innerSel, { y: 600, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out' }, sc.start);
          break;
        case 'zoom-through':
          tl.fromTo(innerSel, { scale: 1.35, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'power3.out' }, sc.start);
          break;
        case 'elastic-push':
          tl.fromTo(innerSel, { y: 400, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, ease: 'back.out(1.5)' }, sc.start);
          break;
        case 'circle-iris':
          tl.fromTo(innerSel, { clipPath: 'circle(0% at 50% 50%)', opacity: 1 }, { clipPath: 'circle(120% at 50% 50%)', opacity: 1, duration: 0.5, ease: 'power3.inOut' }, sc.start);
          break;
        case 'whip-pan':
          tl.fromTo(innerSel, { x: -1080, scaleX: 1.15, filter: 'blur(18px)', opacity: 0.2 }, { x: 0, scaleX: 1, filter: 'blur(0px)', opacity: 1, duration: 0.36, ease: 'power4.out' }, sc.start);
          break;
        case 'light-leak':
          tl.fromTo(innerSel, { filter: 'brightness(2.4)', opacity: 0 }, { filter: 'brightness(1)', opacity: 1, duration: 0.45, ease: 'power2.out' }, sc.start);
          break;
        case 'chromatic-split':
          tl.fromTo(innerSel, { scale: 1.18, opacity: 0, filter: 'brightness(1.7) saturate(1.5)' }, { scale: 1, opacity: 1, filter: 'brightness(1) saturate(1)', duration: 0.42, ease: 'expo.out' }, sc.start);
          tl.fromTo(`#${sc.id}-chroma-c`, { opacity: 0.9, x: -28, scale: 1.04 }, { opacity: 0, x: 0, scale: 1, duration: 0.38, ease: 'power3.out' }, sc.start);
          tl.fromTo(`#${sc.id}-chroma-m`, { opacity: 0.9, x: 28, scale: 1.04 }, { opacity: 0, x: 0, scale: 1, duration: 0.38, ease: 'power3.out' }, sc.start);
          break;
        case 'glitch-wipe':
          tl.fromTo(innerSel, { clipPath: 'inset(0 100% 0 0)', skewX: -12, opacity: 1 }, { clipPath: 'inset(0 0% 0 0)', skewX: 0, opacity: 1, duration: 0.34, ease: 'power4.out' }, sc.start);
          tl.fromTo(`#${sc.id}-chroma-c`, { opacity: 0.75, x: -20 }, { opacity: 0, x: 0, duration: 0.25 }, sc.start);
          break;
        case 'domain-warp':
          tl.set(innerSel, { filter: 'url(#hf-warp-filter)' }, sc.start);
          tl.fromTo('#hf-warp-disp', { attr: { scale: 95 } }, { attr: { scale: 0 }, duration: 0.55, ease: 'power3.out' }, sc.start);
          tl.fromTo(innerSel, { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration: 0.45, ease: 'power2.out' }, sc.start);
          tl.set(innerSel, { filter: 'none' }, sc.start + 0.56);
          break;
        case 'beat-freeze':
          tl.fromTo(innerSel, { scale: 1.14, filter: 'brightness(2.1) contrast(1.2)', opacity: 1 }, { scale: 1, filter: 'brightness(1) contrast(1)', opacity: 1, duration: 0.3, ease: 'expo.out' }, sc.start);
          break;
        case 'crossfade':
        default:
          tl.fromTo(innerSel, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power2.out' }, sc.start);
          break;
      }
    }

    // 2. Media Motion
    switch (motion) {
      case 'shake-on-impact':
        tl.fromTo(mediaContainerSel, { x: -16, y: 12, scale: 1.05 }, { x: 0, y: 0, scale: 1.0, duration: 0.35, ease: 'power4.out' }, sc.start);
        tl.to(mediaContainerSel, { scale: 1.08, duration: Math.max(0.1, sc.duration - 0.35), ease: 'none' }, sc.start + 0.35);
        break;
      case 'pan-right':
        tl.fromTo(mediaContainerSel, { x: -45, scale: 1.08 }, { x: 45, scale: 1.08, duration: sc.duration, ease: 'none' }, sc.start);
        break;
      case 'pan-left':
        tl.fromTo(mediaContainerSel, { x: 45, scale: 1.08 }, { x: -45, scale: 1.08, duration: sc.duration, ease: 'none' }, sc.start);
        break;
      case 'handheld-drift':
        tl.fromTo(mediaContainerSel, { x: -14, y: -10, scale: 1.06, rotate: -0.6 }, { x: 14, y: 10, scale: 1.06, rotate: 0.6, duration: sc.duration, ease: 'sine.inOut' }, sc.start);
        break;
      case 'slow-zoom-in':
        tl.fromTo(mediaContainerSel, { scale: 1.0, y: 0 }, { scale: 1.12, y: -20, duration: sc.duration, ease: 'none' }, sc.start);
        break;
      case 'zoom-out':
        tl.fromTo(mediaContainerSel, { scale: 1.14, y: -20 }, { scale: 1.0, y: 0, duration: sc.duration, ease: 'none' }, sc.start);
        break;
      case 'parallax':
        tl.fromTo(mediaContainerSel, { scale: 1.08, y: 25 }, { scale: 1.08, y: -25, duration: sc.duration, ease: 'none' }, sc.start);
        break;
      case '3d-tilt':
        tl.fromTo(mediaContainerSel, { scale: 1.06, transformPerspective: 900, rotateX: 4, rotateY: -4 }, { scale: 1.06, transformPerspective: 900, rotateX: -3, rotateY: 3, duration: sc.duration, ease: 'sine.inOut' }, sc.start);
        break;
      case 'subtle-float':
        tl.fromTo(mediaContainerSel, { scale: 1.05, y: 16 }, { scale: 1.05, y: -16, duration: sc.duration, ease: 'sine.inOut' }, sc.start);
        break;
      default:
        break;
    }

    // 3. Badge & Headline Animation
    if (badgeText && document.querySelector(badgeSel)) {
      tl.fromTo(badgeSel, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2)' }, sc.start + 0.15);
    }

    if (headlineText && document.querySelector(headlineSel)) {
      switch (anim) {
        case 'slam':
          tl.fromTo(headlineSel, { scale: 1.35, opacity: 0, y: 35 }, { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: 'power4.out' }, sc.start + 0.25);
          break;
        case 'pop':
          tl.fromTo(headlineSel, { scale: 0.75, opacity: 0, y: 20 }, { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: 'back.out(2)' }, sc.start + 0.25);
          break;
        case 'shake':
          tl.fromTo(headlineSel, { scale: 0.9, opacity: 0, y: 20 }, { scale: 1, opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, sc.start + 0.2);
          tl.fromTo(headlineSel, { x: -16 }, { x: 0, duration: 0.35, ease: 'elastic.out(1.2, 0.3)' }, sc.start + 0.25);
          break;
        case 'zoom':
          tl.fromTo(headlineSel, { scale: 0.25, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.42, ease: 'power3.out' }, sc.start + 0.25);
          break;
        case 'slide':
          tl.fromTo(headlineSel, { x: -140, opacity: 0 }, { x: 0, opacity: 1, duration: 0.42, ease: 'power3.out' }, sc.start + 0.25);
          break;
        case 'spring':
          tl.fromTo(headlineSel, { y: 85, scaleY: 1.3, opacity: 0 }, { y: 0, scaleY: 1, opacity: 1, duration: 0.55, ease: 'elastic.out(1, 0.4)' }, sc.start + 0.25);
          break;
        case 'bounce':
          tl.fromTo(headlineSel, { y: -110, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, ease: 'bounce.out' }, sc.start + 0.25);
          break;
        case 'fade':
          tl.fromTo(headlineSel, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, sc.start + 0.25);
          break;
        case 'blur-reveal':
          tl.fromTo(headlineSel, { filter: 'blur(20px)', opacity: 0 }, { filter: 'blur(0px)', opacity: 1, duration: 0.45, ease: 'power2.out' }, sc.start + 0.25);
          break;
        case 'elastic':
          tl.fromTo(headlineSel, { scaleX: 1.4, scaleY: 0.8, opacity: 0 }, { scaleX: 1, scaleY: 1, opacity: 1, duration: 0.55, ease: 'elastic.out(1.2, 0.4)' }, sc.start + 0.25);
          break;
        default:
          tl.fromTo(headlineSel, { scale: 0.8, opacity: 0, y: 20 }, { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: 'back.out(1.7)' }, sc.start + 0.25);
          break;
      }

      if (emphasis === 'burst' || emphasis === 'scale-emphasis') {
        tl.fromTo(`${headlineSel} .highlight-span`, { scale: 1 }, { scale: 1.15, duration: 0.25, yoyo: true, repeat: 1, ease: 'power2.out' }, sc.start + 0.65);
      }
    }

    // 4. Particles Motion
    if (bgTreatment === 'floating-particles') {
      tl.fromTo(`#${sc.id}-particles`, { y: 30 }, { y: -30, duration: sc.duration, ease: 'none' }, sc.start);
    }

    // 5. Kinetic Beats Animation
    if (beats.length > 0) {
      beats.forEach((b, bIdx) => {
        const bSel = `#${sc.id}-beat-${bIdx}`;
        const bAt = sc.start + (parseFloat(b.at) || 0);
        const rawDur = parseFloat(b.duration) || 3.2;
        const maxAvail = Math.max(0.8, (sc.start + sc.duration) - bAt - 0.3);
        const bDur = Math.min(rawDur, maxAvail);
        const bStyle = b.style || 'vox-card';

        gsap.set(bSel, { opacity: 0, visibility: 'hidden' });

        if (bStyle === 'stat-pop') {
          tl.fromTo(bSel, { scale: 0.5, opacity: 0, visibility: 'visible', y: 20 }, { scale: 1, opacity: 1, visibility: 'visible', y: 0, duration: 0.36, ease: 'back.out(2.2)' }, bAt);
        } else if (bStyle === 'pill-callout') {
          tl.fromTo(bSel, { scale: 0.4, opacity: 0, visibility: 'visible' }, { scale: 1, opacity: 1, visibility: 'visible', duration: 0.35, ease: 'back.out(2.4)' }, bAt);
        } else if (bStyle === 'editorial-quote') {
          tl.fromTo(bSel, { x: -50, opacity: 0, visibility: 'visible' }, { x: 0, opacity: 1, visibility: 'visible', duration: 0.4, ease: 'power3.out' }, bAt);
          tl.fromTo(`${bSel} .beat-quote-bar`, { scaleY: 0 }, { scaleY: 1, duration: 0.4, ease: 'power2.out' }, bAt + 0.08);
        } else {
          tl.fromTo(bSel, { y: 36, opacity: 0, visibility: 'visible' }, { y: 0, opacity: 1, visibility: 'visible', duration: 0.36, ease: 'power3.out' }, bAt);
          tl.fromTo(`${bSel} .vox-mark-bg`, { scaleX: 0 }, { scaleX: 1, duration: 0.38, ease: 'power2.out' }, bAt + 0.16);
        }

        const exitAt = bAt + Math.max(0.45, bDur - 0.25);
        tl.to(bSel, { y: -24, opacity: 0, duration: 0.25, ease: 'power2.in' }, exitAt);
        tl.set(bSel, { visibility: 'hidden' }, exitAt + 0.26);
      });
    }

    // 6. Stickers Animation
    if (Array.isArray(spec.stickers) && spec.stickers.length > 0) {
      spec.stickers.forEach((stk, sIdx) => {
        const stkSel = `#${sc.id}-sticker-${sIdx}`;
        const stkAt = sc.start + (stk.at !== undefined ? parseFloat(stk.at) : 0.35);
        const stkAnim = stk.animation || 'stamp';
        gsap.set(stkSel, { opacity: 0, visibility: 'hidden' });
        switch (stkAnim) {
          case 'shake':
            tl.fromTo(stkSel, { scale: 0, opacity: 0, visibility: 'visible' }, { scale: 1, opacity: 1, visibility: 'visible', duration: 0.3, ease: 'back.out(2)' }, stkAt);
            tl.fromTo(stkSel, { rotate: -8 }, { rotate: 8, duration: 0.08, repeat: 5, yoyo: true, ease: 'power1.inOut' }, stkAt + 0.3);
            break;
          case 'stamp':
            tl.fromTo(stkSel, { scale: 2.5, opacity: 0, visibility: 'visible', rotate: -22 }, { scale: 1, opacity: 1, visibility: 'visible', rotate: -3, duration: 0.35, ease: 'power4.out' }, stkAt);
            break;
          case 'bounce':
            tl.fromTo(stkSel, { y: -80, opacity: 0, visibility: 'visible' }, { y: 0, opacity: 1, visibility: 'visible', duration: 0.5, ease: 'bounce.out' }, stkAt);
            break;
          case 'pop':
          default:
            tl.fromTo(stkSel, { scale: 0.3, opacity: 0, visibility: 'visible' }, { scale: 1, opacity: 1, visibility: 'visible', duration: 0.35, ease: 'back.out(2.5)' }, stkAt);
            break;
        }
      });
    }

    // 7. Action Overlays Animation (Catalog Upgraded)
    if (overlays.includes('speed-lines')) {
      tl.fromTo(`#${sc.id}-speed-lines`, { opacity: 0, scale: 1.2, rotation: 0 }, { opacity: 0.85, scale: 1, rotation: 18, duration: sc.duration, ease: 'none' }, sc.start);
    }
    if (overlays.includes('warning-stripes')) {
      tl.fromTo(`#${sc.id}-stripes-top`, { y: -24, backgroundPosition: '0px 0px' }, { y: 0, backgroundPosition: '320px 0px', duration: sc.duration, ease: 'none' }, sc.start);
      tl.fromTo(`#${sc.id}-stripes-bottom`, { y: 24, backgroundPosition: '0px 0px' }, { y: 0, backgroundPosition: '-320px 0px', duration: sc.duration, ease: 'none' }, sc.start);
    }
    if (overlays.includes('neon-frame')) {
      tl.fromTo(`#${sc.id}-neon-rect`, { strokeDashoffset: 5820 }, { strokeDashoffset: 0, duration: Math.min(1.4, sc.duration * 0.6), ease: 'power2.out' }, sc.start + 0.08);
    }
    if (overlays.includes('vox-grid')) {
      tl.fromTo(`#${sc.id}-vox-grid`, { backgroundPosition: '0px 0px' }, { backgroundPosition: '108px 108px', duration: sc.duration, ease: 'none' }, sc.start);
    }
    if (overlays.includes('film-grain')) {
      tl.fromTo(`#${sc.id}-film-grain`, { x: 0, y: 0 }, { x: -48, y: -36, duration: sc.duration, ease: 'steps(24)' }, sc.start);
    }
    if (overlays.includes('camcorder-hud')) {
      tl.to(`#${sc.id}-rec-dot`, { opacity: 0.2, duration: 0.5, repeat: Math.max(1, Math.floor(sc.duration * 2)), yoyo: true, ease: 'steps(1)' }, sc.start);
    }

    // 8. Text Exit Transition (clears headline before beats if beats exist)
    const textTargets = [headerSel, badgeSel, headlineSel].filter(sel => document.querySelector(sel) !== null);
    if (textTargets.length > 0 && ((spec.textTransitionOut && spec.textTransitionOut !== 'none') || beats.length > 0)) {
      const textExitDur = 0.28;
      let textExitTime = (sc.start + sc.duration) - textExitDur - 0.05;
      if (beats.length > 0 && sc.key === 'main') {
        const firstBeatAt = sc.start + (parseFloat(beats[0].at) || 4.0);
        textExitTime = Math.min(textExitTime, Math.max(sc.start + 1.5, firstBeatAt - 0.35));
      } else if (typeof spec.headlineDuration === 'number' && spec.headlineDuration > 0) {
        textExitTime = Math.min(textExitTime, sc.start + spec.headlineDuration);
      }

      switch (spec.textTransitionOut || 'slide-up') {
        case 'fade':
          tl.to(textTargets, { opacity: 0, duration: textExitDur, ease: 'power2.in' }, textExitTime);
          break;
        case 'shrink':
          tl.to(textTargets, { scale: 0.7, opacity: 0, duration: textExitDur, ease: 'back.in(1.5)' }, textExitTime);
          break;
        case 'glitch-out':
          tl.to(textTargets, { x: 25, opacity: 0, filter: 'blur(10px)', duration: textExitDur, ease: 'power3.in' }, textExitTime);
          break;
        case 'slam-away':
          tl.to(textTargets, { scale: 1.4, opacity: 0, duration: textExitDur, ease: 'power4.in' }, textExitTime);
          break;
        case 'slide-up':
        default:
          tl.to(textTargets, { y: -60, opacity: 0, duration: textExitDur, ease: 'power2.in' }, textExitTime);
          break;
      }
      tl.set(textTargets, { opacity: 0, visibility: 'hidden' }, textExitTime + textExitDur);
    }

    // 9. Transition Out (Hook Scene)
    if (sc.key === 'hook') {
      const transOut = spec.transitionOut || 'crossfade';
      const end = sc.duration;
      switch (transOut) {
        case 'blur-crossfade':
          tl.to(innerSel, { opacity: 0.2, filter: 'blur(16px)', duration: 0.28, ease: 'power2.in' }, end - 0.28);
          break;
        case 'push-up':
          tl.to(innerSel, { y: -300, opacity: 0.2, duration: 0.28, ease: 'power2.in' }, end - 0.28);
          break;
        case 'zoom-through':
          tl.to(innerSel, { scale: 1.25, opacity: 0.2, duration: 0.28, ease: 'power2.in' }, end - 0.28);
          break;
        case 'elastic-push':
          tl.to(innerSel, { y: -280, opacity: 0.2, duration: 0.28, ease: 'power2.in' }, end - 0.28);
          break;
        case 'circle-iris':
          tl.to(innerSel, { clipPath: 'circle(0% at 50% 50%)', duration: 0.28, ease: 'power3.in' }, end - 0.28);
          break;
        case 'whip-pan':
          tl.to(innerSel, { x: 900, scaleX: 1.15, filter: 'blur(18px)', opacity: 0.15, duration: 0.26, ease: 'power3.in' }, end - 0.26);
          break;
        case 'chromatic-split':
          tl.to(innerSel, { scale: 1.12, filter: 'brightness(1.8)', opacity: 0.15, duration: 0.24, ease: 'power2.in' }, end - 0.24);
          tl.fromTo(`#${sc.id}-chroma-c`, { opacity: 0, x: 0 }, { opacity: 0.9, x: -30, duration: 0.22 }, end - 0.24);
          tl.fromTo(`#${sc.id}-chroma-m`, { opacity: 0, x: 0 }, { opacity: 0.9, x: 30, duration: 0.22 }, end - 0.24);
          break;
        case 'glitch-wipe':
          tl.to(innerSel, { skewX: 10, clipPath: 'inset(0 0 0 100%)', duration: 0.24, ease: 'power3.in' }, end - 0.24);
          break;
        case 'domain-warp':
          tl.set(innerSel, { filter: 'url(#hf-warp-filter)' }, end - 0.3);
          tl.to('#hf-warp-disp', { attr: { scale: 95 }, duration: 0.28, ease: 'power2.in' }, end - 0.3);
          tl.to(innerSel, { opacity: 0.15, duration: 0.28 }, end - 0.3);
          break;
        case 'beat-freeze':
          tl.to(innerSel, { scale: 1.06, filter: 'brightness(1.9)', duration: 0.18, ease: 'power2.in' }, end - 0.18);
          break;
        case 'light-leak':
          tl.to(innerSel, { filter: 'brightness(2.2)', opacity: 0.2, duration: 0.28, ease: 'power2.in' }, end - 0.28);
          break;
        case 'cut':
          break;
        case 'crossfade':
        default:
          tl.to(innerSel, { opacity: 0.2, duration: 0.22, ease: 'power1.in' }, end - 0.22);
          break;
      }
    }
  });

  // ==========================================
  // DETERMINISTIC CATALOG SUBTITLE ENGINE
  // ==========================================
  const captionsConfig = config.captions || {};
  const captionContainer = document.getElementById('caption-container');
  const speakerBadge = document.getElementById('speaker-badge');
  const captionBox = document.getElementById('caption-box');
  const captionLine = document.getElementById('caption-line');

  function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    const x = Math.min(1, Math.max(0, t));
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }

  function updateHudTimecode(time) {
    if (hudTimecodeNodes.length === 0) return;
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    const frames = Math.floor((time % 1) * 30);
    const pad = (n) => String(n).padStart(2, '0');
    const tc = `00:${pad(mins)}:${pad(secs)}:${pad(frames)}`;
    hudTimecodeNodes.forEach(node => { node.textContent = tc; });
  }

  if (captionsConfig.enabled && captionsConfig.mode !== 'off') {
    const mode = captionsConfig.mode || 'word-highlight';
    const position = captionsConfig.position || 'lower-third';
    captionContainer.className = `caption-container position-${position}`;

    const fontMood = captionsConfig.fontMood || 'heavy-condensed';
    const decoration = captionsConfig.decoration || 'hard-shadow';
    captionBox.classList.add(`font-mood-${fontMood}`, `decoration-${decoration}`, `mode-${mode}`);
    captionLine.innerHTML = '';

    const allSegments = [];
    let segCounter = 0;
    sceneList.forEach(sc => {
      (sc.transcript || []).forEach(seg => {
        allSegments.push({
          idx: ++segCounter,
          segStart: sc.start + seg.relStart,
          segEnd: sc.start + seg.relEnd,
          scStart: sc.start,
          text: seg.text,
          speaker: seg.speakerId ? speakerMap[seg.speakerId] : null,
          words: Array.isArray(seg.words) ? seg.words : []
        });
      });
    });

    let currentSegIdx = -1;
    const highlightColor = captionsConfig.highlightColor || '#F7C948';
    const baseTextColor = captionsConfig.textColor || '#FFFFFF';

    function updateCaptions(time) {
      updateHudTimecode(time);

      const current = allSegments.find(s => time >= s.segStart && time < s.segEnd);
      if (!current) {
        captionBox.style.display = 'none';
        captionBox.style.opacity = '0';
        captionBox.style.visibility = 'hidden';
        if (speakerBadge) speakerBadge.style.display = 'none';
        captionLine.textContent = '';
        currentSegIdx = -1;
        return;
      }

      captionBox.style.display = 'block';
      captionBox.style.opacity = '1';
      captionBox.style.visibility = 'visible';

      if (captionsConfig.speakerLabels && current.speaker) {
        speakerBadge.textContent = current.speaker.name;
        speakerBadge.style.color = '#FFFFFF';
        speakerBadge.style.borderColor = current.speaker.color || '#FFFFFF';
        speakerBadge.style.display = 'inline-flex';
      } else if (speakerBadge) {
        speakerBadge.style.display = 'none';
      }

      const hasWords = current.words.length > 0 && mode !== 'phrase';
      if (hasWords) {
        if (currentSegIdx !== current.idx) {
          currentSegIdx = current.idx;
          captionLine.innerHTML = current.words.map((w, wIdx) =>
            `<span id="hf-cap-w-${wIdx}" class="caption-word${mode === 'word-sweep' ? ' sweep-word' : ''}">${w.text}</span>`
          ).join(' ');
        }

        current.words.forEach((w, wIdx) => {
          const wStart = current.scStart + w.relStart;
          const wEnd = current.scStart + w.relEnd;
          const wEl = document.getElementById(`hf-cap-w-${wIdx}`);
          if (!wEl) return;

          const isActive = time >= wStart && time < wEnd;
          const isPast = time >= wEnd;
          const activeElapsed = Math.max(0, time - wStart);
          const wordDur = Math.max(0.08, wEnd - wStart);
          const spring = isActive ? easeOutBack(Math.min(1, activeElapsed / 0.14)) : 0;

          if (mode === 'boxed-karaoke') {
            wEl.className = isActive ? 'caption-word boxed-active' : 'caption-word';
            wEl.style.transform = isActive ? `scale(${(0.95 + 0.15 * spring).toFixed(3)})` : 'scale(1)';
          } else if (mode === 'pill-karaoke') {
            wEl.className = isActive ? 'caption-word pill-active' : 'caption-word';
            wEl.style.opacity = '1';
            wEl.style.transform = isActive ? `scale(${(0.92 + 0.16 * spring).toFixed(3)})` : 'scale(1)';
          } else if (mode === 'editorial-emphasis') {
            wEl.className = isActive ? 'caption-word editorial-active' : 'caption-word';
            wEl.style.opacity = isActive ? '1' : (isPast ? '0.92' : '0.78');
            wEl.style.transform = isActive ? `scale(${(0.96 + 0.16 * spring).toFixed(3)})` : 'scale(1)';
          } else if (mode === 'word-sweep') {
            const sweepPct = isPast ? 100 : (isActive ? Math.min(100, (activeElapsed / wordDur) * 100) : 0);
            wEl.className = 'caption-word sweep-word';
            wEl.style.setProperty('--sweep', `${sweepPct.toFixed(1)}%`);
            wEl.style.transform = isActive ? `scale(${(1 + 0.1 * spring).toFixed(3)})` : 'scale(1)';
          } else if (mode === 'kinetic-slam') {
            if (time < wStart) {
              wEl.style.opacity = '0.22';
              wEl.style.color = baseTextColor;
              wEl.style.transform = 'scale(0.85)';
            } else if (isActive) {
              const slamScale = 1.32 - 0.24 * Math.min(1, activeElapsed / 0.12);
              const tilt = wIdx % 2 === 0 ? -2 : 2;
              wEl.style.opacity = '1';
              wEl.style.color = highlightColor;
              wEl.style.transform = `scale(${slamScale.toFixed(3)}) rotate(${tilt}deg)`;
            } else {
              wEl.style.opacity = '0.95';
              wEl.style.color = baseTextColor;
              wEl.style.transform = 'scale(1) rotate(0deg)';
            }
          } else if (mode === 'word-pop') {
            wEl.style.opacity = time < wStart ? '0' : '1';
            wEl.style.color = isActive ? highlightColor : baseTextColor;
            wEl.style.transform = isActive ? `scale(${(0.92 + 0.2 * spring).toFixed(3)})` : 'scale(1)';
          } else {
            // word-highlight (upgraded deterministic spring)
            wEl.style.color = isActive ? highlightColor : baseTextColor;
            wEl.style.transform = isActive ? `scale(${(0.96 + 0.18 * spring).toFixed(3)})` : 'scale(1)';
          }
        });
      } else if (currentSegIdx !== current.idx) {
        currentSegIdx = current.idx;
        captionLine.textContent = current.text;
      }
    }

    gsap.set(captionBox, { opacity: 0, visibility: 'hidden' });
    tl.eventCallback('onUpdate', function () { updateCaptions(this.time()); });
    updateCaptions(0);
  } else if (hudTimecodeNodes.length > 0) {
    tl.eventCallback('onUpdate', function () { updateHudTimecode(this.time()); });
    updateHudTimecode(0);
  }

  tl.seek(0);
};
