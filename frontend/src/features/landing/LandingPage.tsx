import { useEffect, useRef } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { LANDING_MARKUP } from './landingMarkup'
import './landing.css'

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
  Access: {
    en: 'Enforced RBAC, access audit logs, and Saudi data residency as an architecture property, not a policy footnote.',
    ar: 'صلاحيات RBAC صارمة، وسجلات تدقيق الوصول، وإقامة البيانات داخل السعودية كخاصية معمارية لا كملاحظة سياسة.',
  },
}

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

// Ported from riyadh-city/script.js: the cinematic scroll story (parallax
// frames driven by CSS custom properties) plus the sights slider.
function setupCinemaScroll(container: HTMLElement): () => void {
  const section = container.querySelector<HTMLElement>('.cinema-scroll')
  const root = document.documentElement
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const track = container.querySelector<HTMLElement>('.sights-track')
  const sightsControls = container.querySelector<HTMLElement>('.sights-controls')
  const prevBtn = container.querySelector<HTMLElement>('.sight-prev')
  const nextBtn = container.querySelector<HTMLElement>('.sight-next')
  const originalSightCards = Array.from(container.querySelectorAll<HTMLElement>('.sight-card'))

  if (!section || !track) return () => {}

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
    root.style.setProperty(name, String(value))
  }

  function update() {
    rafPending = false
    if (disposed) return

    targetScroll = getScrollDistance()
    if (!initialized || reduceMotion.matches) {
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

    const mxVal = reduceMotion.matches ? 0 : mouseX
    const myVal = reduceMotion.matches ? 0 : mouseY
    setVar('--mx', mxVal.toFixed(4))
    setVar('--my', myVal.toFixed(4))

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
    if (sightsControls) sightsControls.classList.toggle('is-ready', sightsControlsEnter > 0.98)
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
    if (rafPending || disposed) return
    rafPending = true
    rafId = requestAnimationFrame(update)
  }

  function updateSightSlider() {
    if (sightCards.length === 0 || !track) return
    const cardWidth = sightCards[0].offsetWidth
    const gap = parseFloat(getComputedStyle(track).columnGap || '0')
    setVar('--sights-shift', `${-(cardWidth + gap) * activeSight}px`)
    sightCards.forEach((card) => {
      const idx = Number(card.dataset.sightIndex)
      card.classList.toggle('is-active', idx === activeSight)
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

  const cardCleanups: Array<() => void> = []

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
      const onClick = () => {
        selectSightCard(card)
        window.__openCardModal?.(card)
      }
      const onKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          selectSightCard(card)
          window.__openCardModal?.(card)
        }
      }
      card.addEventListener('click', onClick)
      card.addEventListener('keydown', onKeydown)
      cardCleanups.push(() => {
        card.removeEventListener('click', onClick)
        card.removeEventListener('keydown', onKeydown)
      })
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

  const runInitialSetup = () => {
    setupSightSlider()
    requestTick()
  }
  if (document.readyState === 'complete') {
    runInitialSetup()
  } else {
    window.addEventListener('load', runInitialSetup, { once: true })
  }

  return () => {
    disposed = true
    if (rafId) cancelAnimationFrame(rafId)
    prevBtn?.removeEventListener('click', onPrev)
    nextBtn?.removeEventListener('click', onNext)
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onResize)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('load', runInitialSetup)
    cardCleanups.forEach((fn) => fn())
  }
}

// Ported from riyadh-city/script.js: nav info modal, early-access modal,
// per-card modal, and the EN/AR language switcher (with RTL flip).
function setupModalsAndLanguage(container: HTMLElement): () => void {
  const modalOverlay = container.querySelector<HTMLElement>('#modal-overlay')
  const modalBackdrop = container.querySelector<HTMLElement>('#modal-backdrop')
  const modalClose = container.querySelector<HTMLElement>('#modal-close')
  const modalTitle = container.querySelector<HTMLElement>('#modal-title')
  const modalBody = container.querySelector<HTMLElement>('#modal-body')
  const langSwitchers = Array.from(container.querySelectorAll<HTMLElement>('.language-switcher'))
  const requestAccessBtns = Array.from(container.querySelectorAll<HTMLElement>('.request-access-btn'))
  const navButtons = Array.from(container.querySelectorAll<HTMLElement>('[data-nav]'))

  let currentLang: 'en' | 'ar' = 'en'
  const cleanups: Array<() => void> = []

  function openModal(title: string, bodyHtml: string) {
    if (!modalOverlay || !modalTitle || !modalBody) return
    modalTitle.textContent = title
    modalBody.innerHTML = bodyHtml
    modalOverlay.hidden = false
  }
  function closeModal() {
    if (!modalOverlay) return
    modalOverlay.hidden = true
  }

  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', closeModal)
    cleanups.push(() => modalBackdrop.removeEventListener('click', closeModal))
  }
  if (modalClose) {
    modalClose.addEventListener('click', closeModal)
    cleanups.push(() => modalClose.removeEventListener('click', closeModal))
  }
  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeModal()
  }
  window.addEventListener('keydown', onKeydown)
  cleanups.push(() => window.removeEventListener('keydown', onKeydown))

  function showEarlyAccessModal() {
    const isAr = currentLang === 'ar'
    const title = isAr ? 'اطلب الوصول المبكر' : 'Request Early Access'
    openModal(
      title,
      `<form class="modal-form" id="early-access-form">
        <label for="ea-name">${isAr ? 'الاسم الكامل' : 'Full name'}</label>
        <input id="ea-name" type="text" required />
        <label for="ea-email">${isAr ? 'البريد الإلكتروني' : 'Email'}</label>
        <input id="ea-email" type="email" required />
        <button type="submit">${isAr ? 'اطلب الوصول المبكر' : 'Request early access'}</button>
      </form>`,
    )
    const form = container.querySelector<HTMLFormElement>('#early-access-form')
    if (!form) return
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      const nameInput = container.querySelector<HTMLInputElement>('#ea-name')
      const name = nameInput ? nameInput.value : ''
      const namePart = name ? (isAr ? `، ${name}` : `, ${name}`) : ''
      if (modalBody) {
        const p = document.createElement('p')
        p.className = 'modal-success'
        p.textContent = `${isAr ? `تم الاستلام${namePart}.` : `Got it${namePart}.`} ${
          isAr ? 'سنتواصل معك عبر البريد الإلكتروني قريباً.' : "We'll follow up by email shortly."
        }`
        modalBody.replaceChildren(p)
      }
    })
  }

  navButtons.forEach((btn) => {
    const onClick = () => {
      const info = NAV_INFO[btn.dataset.nav ?? '']
      if (!info) return
      openModal(btn.textContent ?? '', `<p>${currentLang === 'ar' ? info.ar : info.en}</p>`)
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

  function applyLanguage(lang: 'en' | 'ar') {
    currentLang = lang
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'

    container.querySelectorAll<HTMLElement>('[data-ar]').forEach((el) => {
      if (!el.dataset.en) el.dataset.en = el.textContent || ''
      el.textContent = lang === 'ar' ? (el.dataset.ar ?? '') : (el.dataset.en ?? '')
    })

    container.querySelectorAll<HTMLElement>('.sight-card').forEach((card) => {
      const kicker = card.querySelector<HTMLElement>('.sight-kicker')
      const h3 = card.querySelector<HTMLElement>('h3')
      const p = card.querySelector<HTMLElement>('p')
      if (kicker && card.dataset.kickerAr) {
        if (!card.dataset.kickerEn) card.dataset.kickerEn = kicker.textContent || ''
        kicker.textContent = lang === 'ar' ? (card.dataset.kickerAr ?? '') : (card.dataset.kickerEn ?? '')
      }
      if (h3 && card.dataset.titleAr) {
        if (!card.dataset.titleEn) card.dataset.titleEn = h3.textContent || ''
        h3.textContent = lang === 'ar' ? (card.dataset.titleAr ?? '') : (card.dataset.titleEn ?? '')
      }
      if (p && card.dataset.bodyAr) {
        if (!card.dataset.bodyEn) card.dataset.bodyEn = p.textContent || ''
        p.textContent = lang === 'ar' ? (card.dataset.bodyAr ?? '') : (card.dataset.bodyEn ?? '')
      }
    })

    container.querySelectorAll<HTMLElement>('.language-switcher-label').forEach((label) => {
      label.textContent = lang.toUpperCase()
    })
  }

  langSwitchers.forEach((btn) => {
    const onClick = () => applyLanguage(currentLang === 'en' ? 'ar' : 'en')
    btn.addEventListener('click', onClick)
    cleanups.push(() => btn.removeEventListener('click', onClick))
  })

  return () => {
    cleanups.forEach((fn) => fn())
    delete window.__openCardModal
    document.documentElement.lang = 'en'
    document.documentElement.removeAttribute('dir')
  }
}

function LandingPageContent() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const removeFonts = injectFontLinks()
    const container = containerRef.current
    if (!container) return removeFonts

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

export function LandingPage() {
  const { me, loading } = useAuth()

  if (loading) return null
  if (me) return <Navigate to="/dashboard" replace />

  return <LandingPageContent />
}

declare global {
  interface Window {
    __openCardModal?: (card: HTMLElement) => void
  }
}
