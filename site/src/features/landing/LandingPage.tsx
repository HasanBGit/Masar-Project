import { useEffect, useRef } from 'react'
import i18n, { toBaseLanguage, type SupportedLanguage } from '../../i18n'
import { LANDING_MARKUP } from './landingMarkup'
import './landing.css'

// Keys must match the data-nav attributes in landingMarkup.ts. (There is no
// data-nav="Access" element, so no Access entry lives here.)
const NAV_INFO: Record<string, { en: string; ar: string }> = {
  Product: {
    en: 'Truepoint unifies fragmented construction-project communication — WhatsApp groups, email/RFI threads, PMC PDF reports — into a single, owner-facing, trust-verified project record.',
    ar: 'يوحّد Truepoint التواصل المتناثر في مشاريع البناء — مجموعات واتساب، مراسلات البريد وطلبات المعلومات، تقارير استشاري الإدارة — في سجل مشروع واحد موثّق يخدم المالك.',
  },
  'Trust & Evidence': {
    en: "The verified milestone ledger and audit log every other trust claim depends on. A photo upload alone is not evidence — it's a pending claim until a verifier acknowledges it.",
    ar: 'سجل المعالم المُعتمدة وسجل التدقيق اللذان تعتمد عليهما كل مطالبة ثقة أخرى. رفع صورة وحده ليس دليلاً — بل مطالبة معلّقة حتى يُقرّها المدقق.',
  },
  Approvals: {
    en: 'The 3 Edges: Hearing, Understanding, Agreeing. A single named, accountable approver signs off.',
    ar: 'الحواف الثلاث: الاستماع، الفهم، الموافقة. معتمِد واحد محدد بالاسم ومسؤول يوقّع الاعتماد.',
  },
}

// Where the mailto: fallback of the early-access form goes when
// VITE_EARLY_ACCESS_ENDPOINT is not configured.
const EARLY_ACCESS_EMAIL = 'hello@truepoint.sa'

const GOOGLE_FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;500;700&display=swap'

function injectFontLinks(): () => void {
  const links = [
    Object.assign(document.createElement('link'), { rel: 'preconnect', href: 'https://fonts.googleapis.com' }),
    Object.assign(document.createElement('link'), { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' }),
    Object.assign(document.createElement('link'), { rel: 'stylesheet', href: GOOGLE_FONTS_HREF }),
  ]
  links.forEach((link) => document.head.appendChild(link))
  return () => links.forEach((link) => link.remove())
}

// The site is a static single deploy: /login does not exist here. The header
// login link points at the app origin when VITE_APP_URL is configured and
// stays hidden otherwise (it ships hidden in the markup).
function setupLoginLink(container: HTMLElement): void {
  const loginLink = container.querySelector<HTMLAnchorElement>('#site-login-link')
  if (!loginLink) return
  const appUrl: unknown = import.meta.env.VITE_APP_URL
  if (typeof appUrl === 'string' && appUrl.length > 0) {
    loginLink.href = appUrl
    loginLink.hidden = false
  } else {
    loginLink.hidden = true
  }
}

// Ported from riyadh-city/script.js: the cinematic scroll story (parallax
// frames driven by CSS custom properties) plus the sights slider. When the
// visitor prefers reduced motion the rig is not started at all — the section
// collapses into a static, fully readable layout instead (see .cinema-static
// in landing.css) and switches live when the preference changes.
function setupCinemaScroll(container: HTMLElement): () => void {
  const section = container.querySelector<HTMLElement>('.cinema-scroll')
  const stage = container.querySelector<HTMLElement>('.stage')
  const root = document.documentElement
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const track = container.querySelector<HTMLElement>('.sights-track')
  const slider = container.querySelector<HTMLElement>('.sights-slider')
  const sightsControls = container.querySelector<HTMLElement>('.sights-controls')
  const prevBtn = container.querySelector<HTMLElement>('.sight-prev')
  const nextBtn = container.querySelector<HTMLElement>('.sight-next')
  const originalSightCards = Array.from(container.querySelectorAll<HTMLElement>('.sight-card'))

  if (!section || !stage || !track || !slider) return () => {}

  // Where the slider lives in animated mode, so static mode can move it into
  // the document flow and hand it back afterwards.
  const sliderHome = { parent: slider.parentElement, next: slider.nextSibling }

  let targetMouseX = 0
  let targetMouseY = 0
  let mouseX = 0
  let mouseY = 0
  let targetScroll = 0
  let smoothScroll = 0
  let initialized = false
  let rafPending = false
  let rafId = 0
  let disposed = false

  let sightCards: HTMLElement[] = []
  const originalSightCount = originalSightCards.length
  let activeSight = originalSightCount

  // Every custom property this rig sets on <html>, so cleanup can remove them
  // instead of leaking ~40 properties onto the document element.
  const setVarNames = new Set<string>()

  function clamp(v: number, min = 0, max = 1) {
    return Math.min(max, Math.max(min, v))
  }
  function smoothstep(e0: number, e1: number, v: number) {
    const x = clamp((v - e0) / (e1 - e0))
    return x * x * (3 - 2 * x)
  }
  function lerp(a: number, b: number, t: number) {
    return a + (b - a) * t
  }
  function segmentInOut(s: number, a: number, b: number, c: number, d: number) {
    const enter = smoothstep(a, b, s)
    const exit = smoothstep(c, d, s)
    return { enter, exit, active: enter * (1 - exit) }
  }
  function getScrollDistance() {
    const rect = section!.getBoundingClientRect()
    return clamp(-rect.top, 0, section!.offsetHeight - window.innerHeight)
  }
  function setVar(name: string, value: string | number) {
    setVarNames.add(name)
    root.style.setProperty(name, String(value))
  }

  function update() {
    rafPending = false
    if (disposed) return

    targetScroll = getScrollDistance()
    if (!initialized) {
      smoothScroll = targetScroll
      initialized = true
    } else {
      smoothScroll = lerp(smoothScroll, targetScroll, 0.14)
    }
    if (Math.abs(smoothScroll - targetScroll) < 0.08) smoothScroll = targetScroll

    mouseX = lerp(mouseX, targetMouseX, 0.12)
    mouseY = lerp(mouseY, targetMouseY, 0.12)

    const frame2 = segmentInOut(smoothScroll, 560, 900, 1300, 1620)
    const frame3 = segmentInOut(smoothScroll, 1760, 2140, 2540, 2700)
    const progress = clamp(smoothScroll / 2700)
    const introExit = smoothstep(90, 650, smoothScroll)
    const sightsEnterRaw = smoothstep(2760, 3560, smoothScroll)
    const sightsEnter = Math.pow(sightsEnterRaw, 1.55)
    const sightsControlsEnter = smoothstep(3360, 3660, smoothScroll)
    const blurActive = clamp(frame2.active + frame3.active)
    const frame2Opacity = frame2.active * (1 - frame3.enter)
    const splitDrift = Math.pow(frame2.enter, 1.5)
    const panel2Opacity = frame2.active * (1 - frame2.exit)
    const panel3Opacity = frame3.active * (1 - frame3.exit)
    const backScale = 0.76 + progress * 0.2 + frame2.enter * 0.18 + frame3.enter * 0.16
    const sharedHeroY = progress * -74
    const sharedHeroScale = progress * 0.23
    const sightsScreenTop = Math.min(220, Math.max(112, window.innerHeight * 0.19)) - 50
    const sightsParentTop = window.innerHeight - (window.innerHeight - sightsScreenTop) / backScale

    setVar('--mx', mouseX.toFixed(4))
    setVar('--my', mouseY.toFixed(4))

    setVar('--back-opacity', 1 - frame2.active * 0.06)
    setVar('--back-x', `${mouseX * -12}px`)
    setVar('--back-y', `${mouseY * -4}px`)
    setVar('--back-scale', backScale)
    setVar('--four-y', `${10 + progress * 10}vh`)
    setVar('--four-scale', 0.78 + progress * 0.16)
    setVar('--bazaar-y', `${20 - progress * 8}vh`)
    setVar('--blur-px', `${blurActive * 14}px`)
    setVar('--back-brightness', 1 - blurActive * 0.255)
    setVar('--bazaar-blur-px', `${frame2.active * 14}px`)
    setVar('--bazaar-brightness', 1 - frame2.active * 0.255 - frame3.active * 0.06)
    setVar('--bazaar-saturation', 1 + frame3.active * 0.18)
    setVar('--shade-opacity', '1')
    setVar('--shade-z', frame2.active > 0.02 ? '2' : '0')
    setVar('--shade-top-alpha', blurActive * 0.465)
    setVar('--shade-mid-alpha', blurActive * 0.42)
    setVar('--shade-bottom-alpha', blurActive * 0.51)

    setVar('--title-y', `${introExit * -210}px`)
    setVar('--title-scale', 1 - introExit * 0.08)
    setVar('--title-opacity', 1 - introExit)

    setVar('--bridge-x', `calc(-50% + ${mouseX * 18}px)`)
    setVar('--bridge-y', `${mouseY * 8 + sharedHeroY - frame2.exit * 760}px`)
    setVar('--bridge-bottom', `${5 - frame2.enter * 13}vh`)
    setVar('--bridge-width', `${67.2 + frame2.enter * 37.8}vw`)
    setVar('--bridge-scale', 1.02 + sharedHeroScale + frame2.exit * 0.46)

    setVar('--split-left-x', `calc(-50% + ${-splitDrift * 46}vw + ${mouseX * 22}px)`)
    setVar('--split-left-y', `${mouseY * 10 + sharedHeroY - splitDrift * 180}px`)
    setVar('--split-left-scale', 1 + sharedHeroScale + frame2.enter * 0.74)
    setVar('--split-right-x', `calc(-50% + ${splitDrift * 46}vw + ${mouseX * 22}px)`)
    setVar('--split-right-y', `${mouseY * 10 + sharedHeroY - splitDrift * 180}px`)
    setVar('--split-right-scale', 1 + sharedHeroScale + frame2.enter * 0.74)

    setVar('--frame2-opacity', frame2Opacity)
    setVar('--frame2-x', `calc(-50% + ${mouseX * 10}px)`)
    setVar('--frame2-y', `calc(-50% + ${mouseY * 8 - frame2.exit * 150}px)`)
    setVar('--frame2-scale', 1.06 + frame2.enter * 0.08 + frame2.exit * 0.08)

    setVar('--intro-copy-y', `${introExit * 90}px`)
    setVar('--intro-copy-opacity', 1 - introExit)
    setVar('--panel2-opacity', panel2Opacity)
    setVar('--panel2-y', `calc(-50% + ${-frame2.exit * 86 + (1 - frame2.enter) * 58}px)`)
    setVar('--panel3-opacity', panel3Opacity)
    setVar('--panel3-y', `calc(-50% + ${-frame3.exit * 86 + (1 - frame3.enter) * 58}px)`)

    setVar('--sights-opacity', sightsEnter)
    setVar('--sights-controls-opacity', sightsControlsEnter)
    // Controls are interactive whenever they are visible at all (visibility is
    // what gates hit-testing — see .sights-controls in landing.css).
    if (sightsControls) sightsControls.classList.toggle('is-ready', sightsControlsEnter > 0.02)
    setVar('--sights-visibility', sightsEnter > 0.01 ? 'visible' : 'hidden')
    setVar('--sights-y', '0px')
    setVar('--sights-enter-x', `${(1 - sightsEnter) * 420}vw`)
    setVar('--sights-scale', 1 / backScale)
    setVar('--sights-top', `${sightsParentTop}px`)
    setVar('--sights-screen-top', `${sightsScreenTop}px`)

    if (
      Math.abs(smoothScroll - targetScroll) > 0.08 ||
      Math.abs(mouseX - targetMouseX) > 0.001 ||
      Math.abs(mouseY - targetMouseY) > 0.001
    ) {
      requestTick()
    }
  }

  function requestTick() {
    // Under prefers-reduced-motion the rAF loop must never start.
    if (rafPending || disposed || reduceMotion.matches) return
    rafPending = true
    rafId = requestAnimationFrame(update)
  }

  function updateSightSlider() {
    if (sightCards.length === 0 || !track) return
    const cardWidth = sightCards[0].offsetWidth
    const gap = parseFloat(getComputedStyle(track).columnGap || '0')
    // In RTL the track flows the other way, so the shift flips sign.
    const dirSign = document.documentElement.dir === 'rtl' ? 1 : -1
    setVar('--sights-shift', `${dirSign * (cardWidth + gap) * activeSight}px`)
    sightCards.forEach((card) => {
      const idx = Number(card.dataset.sightIndex)
      const isActive = idx === activeSight
      card.classList.toggle('is-active', isActive)
      card.setAttribute('aria-pressed', String(isActive))
    })
  }

  function normalizeSightSlider() {
    if (activeSight >= originalSightCount * 2) {
      jumpSightSlider(activeSight - originalSightCount)
    } else if (activeSight < originalSightCount) {
      jumpSightSlider(activeSight + originalSightCount)
    }
  }

  function jumpSightSlider(i: number) {
    track?.classList.add('is-jumping')
    activeSight = i
    updateSightSlider()
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        track?.classList.remove('is-jumping')
      })
    })
  }

  function moveSightSlider(dir: number) {
    activeSight += dir
    updateSightSlider()
  }

  function selectSightCard(card: HTMLElement) {
    const idx = Number(card.dataset.sightIndex)
    if (Number.isFinite(idx)) {
      activeSight = idx
      updateSightSlider()
    }
  }

  function attachCardActivation(card: HTMLElement, onActivate: (card: HTMLElement) => void): () => void {
    const onClick = () => onActivate(card)
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onActivate(card)
      }
    }
    card.addEventListener('click', onClick)
    card.addEventListener('keydown', onKeydown)
    return () => {
      card.removeEventListener('click', onClick)
      card.removeEventListener('keydown', onKeydown)
    }
  }

  // ─── Animated mode (default) ────────────────────────────────────────────────
  function enableAnimatedMode(): () => void {
    const cardCleanups: Array<() => void> = []
    initialized = false

    function setupSightSlider() {
      if (!track) return
      track.replaceChildren()
      const clones: HTMLElement[] = []
      for (let setIndex = 0; setIndex < 3; setIndex++) {
        originalSightCards.forEach((card, cardIndex) => {
          const clone = card.cloneNode(true) as HTMLElement
          clone.dataset.sightIndex = String(setIndex * originalSightCount + cardIndex)
          track.appendChild(clone)
          clones.push(clone)
        })
      }
      sightCards = clones
      activeSight = originalSightCount

      sightCards.forEach((card) => {
        cardCleanups.push(
          attachCardActivation(card, (c) => {
            selectSightCard(c)
            window.__openCardModal?.(c)
          }),
        )
      })

      track.addEventListener('transitionend', normalizeSightSlider)
      cardCleanups.push(() => track.removeEventListener('transitionend', normalizeSightSlider))

      updateSightSlider()
    }

    const onPrev = () => moveSightSlider(-1)
    const onNext = () => moveSightSlider(1)
    prevBtn?.addEventListener('click', onPrev)
    nextBtn?.addEventListener('click', onNext)

    const onScroll = () => requestTick()
    const onResize = () => {
      updateSightSlider()
      requestTick()
    }
    const onPointerMove = (e: PointerEvent) => {
      targetMouseX = e.clientX / window.innerWidth - 0.5
      targetMouseY = e.clientY / window.innerHeight - 0.5
      requestTick()
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    window.addEventListener('pointermove', onPointerMove, { passive: true })

    // Position everything (scroll progress, parallax vars, the sight-card
    // clones) as soon as the DOM has a layout pass, not on `window.load` -
    // `load` waits for every last resource including all the scene images,
    // so on a slow connection the whole rig sat frozen at its unpositioned
    // resting state (every image showing its blank loading placeholder)
    // until the very last byte arrived. Nothing here reads pixel data -
    // `setupSightSlider` only clones DOM nodes and `requestTick`/`update`
    // only read layout geometry (`getBoundingClientRect`, `offsetWidth`) -
    // so a single rAF tick after mount is enough.
    const runInitialSetup = () => {
      setupSightSlider()
      requestTick()
    }
    requestAnimationFrame(runInitialSetup)

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      rafPending = false
      prevBtn?.removeEventListener('click', onPrev)
      nextBtn?.removeEventListener('click', onNext)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onPointerMove)
      cardCleanups.forEach((fn) => fn())
      sightCards = []
    }
  }

  // ─── Static mode (prefers-reduced-motion) ───────────────────────────────────
  // No rAF loop, no parallax, no carousel. The original cards go back into the
  // track, the slider moves into the document flow, and .cinema-static makes
  // every scroll-story section statically visible.
  function enableStaticMode(): () => void {
    section!.classList.add('cinema-static')
    track!.replaceChildren(...originalSightCards)
    stage!.appendChild(slider!)

    const cardCleanups = originalSightCards.map((card) =>
      attachCardActivation(card, (c) => window.__openCardModal?.(c)),
    )

    return () => {
      section!.classList.remove('cinema-static')
      cardCleanups.forEach((fn) => fn())
      if (sliderHome.parent) sliderHome.parent.insertBefore(slider!, sliderHome.next)
    }
  }

  let modeCleanup: (() => void) | null = null
  const applyMode = () => {
    modeCleanup?.()
    modeCleanup = reduceMotion.matches ? enableStaticMode() : enableAnimatedMode()
  }
  applyMode()
  reduceMotion.addEventListener('change', applyMode)

  // A language change can flip the document direction, which changes the sign
  // of the carousel shift.
  const onLanguageChanged = () => {
    updateSightSlider()
    requestTick()
  }
  i18n.on('languageChanged', onLanguageChanged)

  return () => {
    disposed = true
    i18n.off('languageChanged', onLanguageChanged)
    reduceMotion.removeEventListener('change', applyMode)
    modeCleanup?.()
    modeCleanup = null
    // Remove every custom property this rig set on <html>.
    setVarNames.forEach((name) => root.style.removeProperty(name))
    setVarNames.clear()
  }
}

// Ported from riyadh-city/script.js: nav info modal, early-access modal,
// per-card modal, and the EN/AR language switcher. Language state and the
// document lang/dir now belong to i18next (src/i18n/index.ts) — this module
// only swaps the data-en/data-ar text inside the landing markup.
function setupModalsAndLanguage(container: HTMLElement): () => void {
  const modalOverlay = container.querySelector<HTMLElement>('#modal-overlay')
  const modalBackdrop = container.querySelector<HTMLElement>('#modal-backdrop')
  const modalPanel = container.querySelector<HTMLElement>('.modal-panel')
  const modalClose = container.querySelector<HTMLElement>('#modal-close')
  const modalTitle = container.querySelector<HTMLElement>('#modal-title')
  const modalBody = container.querySelector<HTMLElement>('#modal-body')
  const langSwitchers = Array.from(container.querySelectorAll<HTMLElement>('.language-switcher'))
  const requestAccessBtns = Array.from(container.querySelectorAll<HTMLElement>('.request-access-btn'))
  const navButtons = Array.from(container.querySelectorAll<HTMLElement>('[data-nav]'))

  // The site UI offers en/ar only (see src/i18n/index.ts); a stored regional
  // preference such as "ar-SA" must land on Arabic, not English.
  let currentLang: SupportedLanguage = toBaseLanguage(i18n.resolvedLanguage ?? i18n.language)
  let lastFocused: HTMLElement | null = null
  const cleanups: Array<() => void> = []

  function openModal(title: string, bodyHtml: string) {
    if (!modalOverlay || !modalTitle || !modalBody) return
    lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    modalTitle.textContent = title
    modalBody.innerHTML = bodyHtml
    modalOverlay.hidden = false
    modalPanel?.focus()
  }
  function closeModal() {
    if (!modalOverlay || modalOverlay.hidden) return
    modalOverlay.hidden = true
    lastFocused?.focus()
    lastFocused = null
  }

  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', closeModal)
    cleanups.push(() => modalBackdrop.removeEventListener('click', closeModal))
  }
  if (modalClose) {
    modalClose.addEventListener('click', closeModal)
    cleanups.push(() => modalClose.removeEventListener('click', closeModal))
  }

  // Escape closes; Tab is trapped inside the dialog while it is open.
  const onKeydown = (e: KeyboardEvent) => {
    if (!modalOverlay || modalOverlay.hidden) return
    if (e.key === 'Escape') {
      closeModal()
      return
    }
    if (e.key !== 'Tab' || !modalPanel) return
    const focusables = Array.from(
      modalPanel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => !el.hasAttribute('disabled') && !el.hidden)
    if (focusables.length === 0) {
      e.preventDefault()
      modalPanel.focus()
      return
    }
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    const active = document.activeElement
    if (e.shiftKey) {
      if (active === first || active === modalPanel) {
        e.preventDefault()
        last.focus()
      }
    } else if (active === last) {
      e.preventDefault()
      first.focus()
    }
  }
  window.addEventListener('keydown', onKeydown)
  cleanups.push(() => window.removeEventListener('keydown', onKeydown))

  function showSuccess(name: string, isAr: boolean) {
    if (!modalBody) return
    const namePart = name ? (isAr ? `، ${name}` : `, ${name}`) : ''
    const p = document.createElement('p')
    p.className = 'modal-success'
    p.setAttribute('role', 'status')
    p.textContent = `${isAr ? `تم الاستلام${namePart}.` : `Got it${namePart}.`} ${
      isAr ? 'سنتواصل معك عبر البريد الإلكتروني قريباً.' : "We'll follow up by email shortly."
    }`
    modalBody.replaceChildren(p)
  }

  function showEarlyAccessModal() {
    const isAr = currentLang === 'ar'
    const endpoint: unknown = import.meta.env.VITE_EARLY_ACCESS_ENDPOINT
    const hasEndpoint = typeof endpoint === 'string' && endpoint.length > 0
    const t = {
      title: isAr ? 'اطلب الوصول المبكر' : 'Request Early Access',
      name: isAr ? 'الاسم الكامل' : 'Full name',
      email: isAr ? 'البريد الإلكتروني' : 'Email',
      submit: isAr ? 'اطلب الوصول المبكر' : 'Request early access',
      sending: isAr ? 'جارٍ الإرسال…' : 'Sending…',
      nameError: isAr ? 'الرجاء إدخال الاسم.' : 'Please enter your name.',
      emailError: isAr ? 'الرجاء إدخال بريد إلكتروني صحيح.' : 'Please enter a valid email address.',
      submitError: isAr
        ? 'تعذّر إرسال الطلب. يرجى المحاولة مرة أخرى.'
        : 'Something went wrong sending your request. Please try again.',
    }
    openModal(
      t.title,
      `<form class="modal-form" id="early-access-form" novalidate>
        <label for="ea-name">${t.name}</label>
        <input id="ea-name" name="name" type="text" autocomplete="name" required aria-describedby="ea-name-error" />
        <p class="modal-field-error" id="ea-name-error" hidden>${t.nameError}</p>
        <label for="ea-email">${t.email}</label>
        <input id="ea-email" name="email" type="email" autocomplete="email" required aria-describedby="ea-email-error" />
        <p class="modal-field-error" id="ea-email-error" hidden>${t.emailError}</p>
        <p class="modal-form-error" id="ea-form-error" aria-live="polite" hidden>${t.submitError}</p>
        <button type="submit">${t.submit}</button>
      </form>`,
    )
    const form = container.querySelector<HTMLFormElement>('#early-access-form')
    const nameInput = container.querySelector<HTMLInputElement>('#ea-name')
    const emailInput = container.querySelector<HTMLInputElement>('#ea-email')
    const nameError = container.querySelector<HTMLElement>('#ea-name-error')
    const emailError = container.querySelector<HTMLElement>('#ea-email-error')
    const formError = container.querySelector<HTMLElement>('#ea-form-error')
    const submitBtn = form?.querySelector<HTMLButtonElement>('button[type="submit"]')
    if (!form || !nameInput || !emailInput || !submitBtn) return

    const setFieldValidity = (input: HTMLInputElement, errorEl: HTMLElement | null, valid: boolean) => {
      input.setAttribute('aria-invalid', String(!valid))
      if (errorEl) errorEl.hidden = valid
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault()
      const name = nameInput.value.trim()
      const email = emailInput.value.trim()
      const nameValid = name.length > 0
      const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      setFieldValidity(nameInput, nameError, nameValid)
      setFieldValidity(emailInput, emailError, emailValid)
      if (!nameValid || !emailValid) {
        ;(nameValid ? emailInput : nameInput).focus()
        return
      }
      if (formError) formError.hidden = true

      if (hasEndpoint) {
        submitBtn.disabled = true
        submitBtn.textContent = t.sending
        void fetch(endpoint as string, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email }),
        })
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            showSuccess(name, isAr)
          })
          .catch(() => {
            // Keep the form so the visitor can retry; announce the failure.
            if (formError) formError.hidden = false
            submitBtn.disabled = false
            submitBtn.textContent = t.submit
          })
      } else {
        // No endpoint configured: hand off to the visitor's mail client.
        const subject = encodeURIComponent('Truepoint early access request')
        const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}`)
        window.location.href = `mailto:${EARLY_ACCESS_EMAIL}?subject=${subject}&body=${body}`
        showSuccess(name, isAr)
      }
    })
  }

  navButtons.forEach((btn) => {
    const onClick = () => {
      const key = btn.dataset.nav ?? ''
      const info = NAV_INFO[key]
      if (!info) return
      // Title from the NAV_INFO key (or its Arabic label) — never from the
      // button's visible text, which can be a shortened form like "Trust".
      const title = currentLang === 'ar' ? (btn.dataset.ar ?? key) : key
      openModal(title, `<p>${currentLang === 'ar' ? info.ar : info.en}</p>`)
    }
    btn.addEventListener('click', onClick)
    cleanups.push(() => btn.removeEventListener('click', onClick))
  })

  requestAccessBtns.forEach((btn) => {
    btn.addEventListener('click', showEarlyAccessModal)
    cleanups.push(() => btn.removeEventListener('click', showEarlyAccessModal))
  })

  window.__openCardModal = (card: HTMLElement) => {
    const kicker = card.querySelector('.sight-kicker')
    const title = card.querySelector('h3')
    const body = card.querySelector('p')
    if (!title || !body) return
    openModal(
      title.textContent || '',
      `<p style="opacity:.55;text-transform:uppercase;font-size:11px;letter-spacing:.15em;margin-bottom:10px;">${
        kicker ? kicker.textContent : ''
      }</p><p>${body.textContent || ''}</p>`,
    )
  }

  // Swaps the visible landing copy across all 4 supported languages (en, ar, hi, ur).
  // Does NOT touch document.documentElement — i18next owns lang/dir globally.
  function applyLanguageText(lang: SupportedLanguage) {
    currentLang = lang

    container.querySelectorAll<HTMLElement>('[data-ar]').forEach((el) => {
      if (!el.dataset.en) el.dataset.en = el.textContent || ''
      if (lang === 'ar') el.textContent = el.dataset.ar ?? ''
      else if (lang === 'hi' && el.dataset.hi) el.textContent = el.dataset.hi
      else if (lang === 'ur' && el.dataset.ur) el.textContent = el.dataset.ur
      else el.textContent = el.dataset.en ?? ''
    })

    container.querySelectorAll<HTMLElement>('.sight-card').forEach((card) => {
      const kicker = card.querySelector<HTMLElement>('.sight-kicker')
      const h3 = card.querySelector<HTMLElement>('h3')
      const p = card.querySelector<HTMLElement>('p')
      if (kicker && card.dataset.kickerAr) {
        if (!card.dataset.kickerEn) card.dataset.kickerEn = kicker.textContent || ''
        kicker.textContent =
          lang === 'ar' ? card.dataset.kickerAr : (lang === 'hi' && card.dataset.kickerHi) ? card.dataset.kickerHi : (lang === 'ur' && card.dataset.kickerUr) ? card.dataset.kickerUr : card.dataset.kickerEn
      }
      if (h3 && card.dataset.titleAr) {
        if (!card.dataset.titleEn) card.dataset.titleEn = h3.textContent || ''
        h3.textContent =
          lang === 'ar' ? card.dataset.titleAr : (lang === 'hi' && card.dataset.titleHi) ? card.dataset.titleHi : (lang === 'ur' && card.dataset.titleUr) ? card.dataset.titleUr : card.dataset.titleEn
      }
      if (p && card.dataset.bodyAr) {
        if (!card.dataset.bodyEn) card.dataset.bodyEn = p.textContent || ''
        p.textContent =
          lang === 'ar' ? card.dataset.bodyAr : (lang === 'hi' && card.dataset.bodyHi) ? card.dataset.bodyHi : (lang === 'ur' && card.dataset.bodyUr) ? card.dataset.bodyUr : card.dataset.bodyEn
      }
    })

    const displayCode = lang === 'en' ? 'EN' : lang === 'ar' ? 'AR' : lang === 'hi' ? 'HI' : 'UR'
    container.querySelectorAll<HTMLElement>('.language-switcher-label').forEach((label) => {
      label.textContent = displayCode
    })
  }

  // i18next is the single source of truth: toggling calls changeLanguage (which
  // persists the choice and updates document lang/dir), and this listener keeps
  // the markup text in sync.
  const onLanguageChanged = (lng: string) => {
    applyLanguageText(toBaseLanguage(lng))
  }
  i18n.on('languageChanged', onLanguageChanged)
  cleanups.push(() => i18n.off('languageChanged', onLanguageChanged))

  const baseLng = toBaseLanguage(i18n.resolvedLanguage ?? i18n.language)
  applyLanguageText(baseLng)

  langSwitchers.forEach((btn) => {
    const onClick = () => {
      const active = toBaseLanguage(i18n.resolvedLanguage ?? i18n.language)
      const nextMap: Record<SupportedLanguage, SupportedLanguage> = {
        en: 'ar',
        ar: 'hi',
        hi: 'ur',
        ur: 'en',
      }
      void i18n.changeLanguage(nextMap[active] ?? 'en')
    }
    btn.addEventListener('click', onClick)
    cleanups.push(() => btn.removeEventListener('click', onClick))
  })

  return () => {
    cleanups.forEach((fn) => fn())
    delete window.__openCardModal
    // Deliberately no document.documentElement lang/dir reset here: i18next
    // owns those globally, and resetting them would break the rest of the app.
  }
}

export function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const removeFonts = injectFontLinks()
    const container = containerRef.current
    if (!container) return removeFonts

    setupLoginLink(container)
    const cleanupCinema = setupCinemaScroll(container)
    const cleanupModals = setupModalsAndLanguage(container)

    return () => {
      cleanupCinema()
      cleanupModals()
      removeFonts()
    }
  }, [])

  return <div className="landing-page" ref={containerRef} dangerouslySetInnerHTML={{ __html: LANDING_MARKUP }} />
}

declare global {
  interface Window {
    __openCardModal?: (card: HTMLElement) => void
  }
}
