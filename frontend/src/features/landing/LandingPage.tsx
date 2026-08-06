import { useEffect, useRef } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useLang, type Lang } from '../../lib/i18n'
import { usePageMeta } from '../../lib/pageMeta'
import { LANDING_MARKUP } from './landingMarkup'
import './landing.css'

const NAV_INFO: Record<string, { en: string; ar: string }> = {
  Product: {
    en: 'Truepoint unifies fragmented construction-project communication (WhatsApp groups, email/RFI threads, PMC PDF reports) into a single, owner-facing, trust-verified project record.',
    ar: 'يوحّد Truepoint التواصل المتناثر في مشاريع البناء (مجموعات واتساب، مراسلات البريد وطلبات المعلومات، تقارير استشاري الإدارة) في سجل مشروع واحد موثّق يخدم المالك.',
  },
  'Trust & Evidence': {
    en: "The verified milestone ledger and audit log every other trust claim depends on. A photo upload alone is not evidence. It's a pending claim until a verifier acknowledges it.",
    ar: 'سجل المعالم المُعتمدة وسجل التدقيق اللذان تعتمد عليهما كل مطالبة ثقة أخرى. رفع صورة وحده ليس دليلاً، بل مطالبة معلّقة حتى يُقرّها المدقق.',
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

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function prefersReducedMotionQuery(): MediaQueryList | null {
  return typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
}

// Ported from riyadh-city/script.js: the cinematic scroll story (parallax
// frames driven by CSS custom properties) plus the sights slider.
function setupCinemaScroll(container: HTMLElement): () => void {
  const section = container.querySelector<HTMLElement>('.cinema-scroll')
  const root = document.documentElement
  const reduceMotion = prefersReducedMotionQuery()
  const track = container.querySelector<HTMLElement>('.sights-track')
  const sightsControls = container.querySelector<HTMLElement>('.sights-controls')
  const prevBtn = container.querySelector<HTMLElement>('.sight-prev')
  const nextBtn = container.querySelector<HTMLElement>('.sight-next')
  const originalSightCards = Array.from(container.querySelectorAll<HTMLElement>('.sight-card'))

  if (!section || !track) return () => {}

  const cardCleanups: Array<() => void> = []

  // Reduced motion: no rAF loop, no parallax, no slider cloning. The cards are
  // re-parented out of the hero backdrop so the reduced-motion CSS block can
  // lay every scene out statically, readable without scroll progress.
  if (reduceMotion?.matches) {
    const stage = container.querySelector<HTMLElement>('.stage')
    const slider = container.querySelector<HTMLElement>('.sights-slider')
    if (stage && slider) stage.appendChild(slider)

    originalSightCards.forEach((card) => {
      const onClick = () => window.__openCardModal?.(card)
      const onKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
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

    return () => cardCleanups.forEach((fn) => fn())
  }

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

  // Every custom property written on <html> is tracked so unmount can remove
  // them instead of leaking ~40 vars onto the document root.
  const writtenVars = new Set<string>()

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
    writtenVars.add(name)
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
    disposed = true
    if (rafId) cancelAnimationFrame(rafId)
    prevBtn?.removeEventListener('click', onPrev)
    nextBtn?.removeEventListener('click', onNext)
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onResize)
    window.removeEventListener('pointermove', onPointerMove)
    cardCleanups.forEach((fn) => fn())
    writtenVars.forEach((name) => root.style.removeProperty(name))
    writtenVars.clear()
  }
}

// Ported from riyadh-city/script.js: nav info modal, early-access modal, and
// the per-card modal. The modal is a real dialog: focus moves into it on open,
// Tab is trapped inside the panel, Escape closes, and focus is restored to the
// element that opened it.
function setupModals(container: HTMLElement, getLang: () => Lang): () => void {
  const modalOverlay = container.querySelector<HTMLElement>('#modal-overlay')
  const modalBackdrop = container.querySelector<HTMLElement>('#modal-backdrop')
  const modalClose = container.querySelector<HTMLElement>('#modal-close')
  const modalPanel = container.querySelector<HTMLElement>('.modal-panel')
  const modalTitle = container.querySelector<HTMLElement>('#modal-title')
  const modalBody = container.querySelector<HTMLElement>('#modal-body')
  const requestAccessBtns = Array.from(container.querySelectorAll<HTMLElement>('.request-access-btn'))
  const navButtons = Array.from(container.querySelectorAll<HTMLElement>('[data-nav]'))

  const cleanups: Array<() => void> = []
  let lastFocused: HTMLElement | null = null
  let pendingTimer: number | null = null

  function openModal(title: string, bodyHtml: string) {
    if (!modalOverlay || !modalTitle || !modalBody) return
    lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    modalTitle.textContent = title
    modalBody.innerHTML = bodyHtml
    modalOverlay.hidden = false
    modalClose?.focus()
  }
  function closeModal() {
    if (!modalOverlay || modalOverlay.hidden) return
    modalOverlay.hidden = true
    if (pendingTimer !== null) {
      window.clearTimeout(pendingTimer)
      pendingTimer = null
    }
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
  const onKeydown = (e: KeyboardEvent) => {
    if (!modalOverlay || modalOverlay.hidden) return
    if (e.key === 'Escape') {
      closeModal()
      return
    }
    if (e.key === 'Tab' && modalPanel) {
      const focusables = Array.from(modalPanel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hidden,
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }
  window.addEventListener('keydown', onKeydown)
  cleanups.push(() => window.removeEventListener('keydown', onKeydown))

  function showEarlyAccessModal() {
    const isAr = getLang() === 'ar'
    const title = isAr ? 'اطلب الوصول المبكر' : 'Request Early Access'
    openModal(
      title,
      `<form class="modal-form" id="early-access-form" novalidate>
        <label for="ea-name">${isAr ? 'الاسم الكامل' : 'Full name'}</label>
        <input id="ea-name" name="name" type="text" autocomplete="name" required />
        <p class="modal-error" id="ea-name-error" role="alert" hidden></p>
        <label for="ea-email">${isAr ? 'البريد الإلكتروني' : 'Email'}</label>
        <input id="ea-email" name="email" type="email" autocomplete="email" required />
        <p class="modal-error" id="ea-email-error" role="alert" hidden></p>
        <button type="submit">${isAr ? 'اطلب الوصول المبكر' : 'Request early access'}</button>
        <p class="modal-status" id="ea-status" role="status" aria-live="polite"></p>
      </form>`,
    )
    const form = container.querySelector<HTMLFormElement>('#early-access-form')
    if (!form) return

    const nameInput = form.querySelector<HTMLInputElement>('#ea-name')
    const emailInput = form.querySelector<HTMLInputElement>('#ea-email')
    const nameError = form.querySelector<HTMLElement>('#ea-name-error')
    const emailError = form.querySelector<HTMLElement>('#ea-email-error')
    const statusEl = form.querySelector<HTMLElement>('#ea-status')
    const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]')

    function markInvalid(input: HTMLInputElement, errorEl: HTMLElement, message: string) {
      errorEl.textContent = message
      errorEl.hidden = false
      input.setAttribute('aria-invalid', 'true')
      input.setAttribute('aria-describedby', errorEl.id)
    }
    function clearInvalid(input: HTMLInputElement, errorEl: HTMLElement) {
      errorEl.hidden = true
      errorEl.textContent = ''
      input.removeAttribute('aria-invalid')
      input.removeAttribute('aria-describedby')
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault()
      if (!nameInput || !emailInput || !nameError || !emailError || !statusEl || !submitBtn) return

      const name = nameInput.value.trim()
      const email = emailInput.value.trim()
      let firstInvalid: HTMLInputElement | null = null

      if (!name) {
        markInvalid(nameInput, nameError, isAr ? 'يرجى إدخال الاسم الكامل.' : 'Please enter your full name.')
        firstInvalid = nameInput
      } else {
        clearInvalid(nameInput, nameError)
      }
      if (!EMAIL_RE.test(email)) {
        markInvalid(emailInput, emailError, isAr ? 'يرجى إدخال بريد إلكتروني صحيح.' : 'Please enter a valid email address.')
        firstInvalid = firstInvalid ?? emailInput
      } else {
        clearInvalid(emailInput, emailError)
      }
      if (firstInvalid) {
        firstInvalid.focus()
        return
      }

      // "In flight": lock the form, then land the confirmation in the
      // aria-live status region so screen readers announce it.
      submitBtn.disabled = true
      nameInput.disabled = true
      emailInput.disabled = true
      pendingTimer = window.setTimeout(() => {
        pendingTimer = null
        const namePart = name ? (isAr ? `، ${name}` : `, ${name}`) : ''
        statusEl.textContent = `${isAr ? `تم الاستلام${namePart}.` : `Got it${namePart}.`} ${
          isAr ? 'سنتواصل معك عبر البريد الإلكتروني قريباً.' : "We'll follow up by email shortly."
        }`
        form.querySelectorAll<HTMLElement>('label, input, button').forEach((el) => {
          el.hidden = true
        })
        modalClose?.focus()
      }, 350)
    })
  }

  navButtons.forEach((btn) => {
    const onClick = () => {
      const info = NAV_INFO[btn.dataset.nav ?? '']
      if (!info) return
      openModal(btn.textContent ?? '', `<p>${getLang() === 'ar' ? info.ar : info.en}</p>`)
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

  return () => {
    cleanups.forEach((fn) => fn())
    if (pendingTimer !== null) window.clearTimeout(pendingTimer)
    delete window.__openCardModal
  }
}

/**
 * Applies the current language to the static markup by walking the
 * data-en/data-ar attributes. The document's lang/dir attributes are owned by
 * LanguageProvider, never touched here.
 */
function applyLanguageToMarkup(container: HTMLElement, lang: Lang) {
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

const LANDING_DESCRIPTION =
  'Truepoint turns your WhatsApp groups, email threads, and PMC reports into one verified, Arabic-first project record for Saudi and GCC construction. Owner-first, evidence-backed, dispute-ready.'

const FAQ_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Does my site team need to learn a new app?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "No. Field capture rides on the WhatsApp groups your trades already use. Truepoint reads from channels your team hasn't changed, rather than asking them to adopt a new one.",
      },
    },
    {
      '@type': 'Question',
      name: 'Where is our project data stored?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Data residency and access follow Saudi PDPL requirements. This is an architecture decision, not a policy footnote bolted on later.',
      },
    },
    {
      '@type': 'Question',
      name: "What does 'approval' actually change day to day?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Every sign-off passes through the 3 Edges (Hearing, Understanding, Agreeing) with a teach-back comprehension check and a single named, accountable approver.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is Truepoint only available in Arabic?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "It's bilingual and Arabic-first. Flip the language switcher in the top nav to see the whole product in English or Arabic, right-to-left included.",
      },
    },
    {
      '@type': 'Question',
      name: 'How long does onboarding take?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "We're onboarding a small number of owners and developers directly ahead of general availability, so timelines are set with your team rather than a fixed rollout date.",
      },
    },
    {
      '@type': 'Question',
      name: 'What does it cost?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Pricing is scoped per project during early access. Request access and we'll follow up with a plan for your portfolio.",
      },
    },
  ],
}

const LANDING_JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'Truepoint',
      url: 'https://truepoint.sa',
      logo: 'https://truepoint.sa/favicon.svg',
    },
    {
      '@type': 'SoftwareApplication',
      name: 'Truepoint',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description: LANDING_DESCRIPTION,
      offers: {
        '@type': 'Offer',
        availability: 'https://schema.org/LimitedAvailability',
        description: 'Priced per project during early access.',
      },
    },
    FAQ_JSON_LD,
  ],
}

function LandingPageContent() {
  usePageMeta({
    title: 'Truepoint - Owner-first infrastructure for Saudi construction',
    description: LANDING_DESCRIPTION,
    path: '/',
    jsonLd: LANDING_JSON_LD,
  })
  const containerRef = useRef<HTMLDivElement>(null)
  // The landing page shares the app-wide language store: it initialises from
  // it and its EN/AR switchers write back through setLang, so the choice
  // persists across the whole app (and LanguageProvider keeps document
  // lang/dir in sync — no destructive reset on unmount).
  const { lang, setLang } = useLang()
  const langRef = useRef(lang)

  useEffect(() => {
    langRef.current = lang
  }, [lang])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const cleanupCinema = setupCinemaScroll(container)
    const cleanupModals = setupModals(container, () => langRef.current)

    return () => {
      cleanupCinema()
      cleanupModals()
    }
  }, [])

  // The page's own EN/AR switcher buttons toggle the shared store.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const switchers = Array.from(container.querySelectorAll<HTMLElement>('.language-switcher'))
    const onClick = () => setLang(langRef.current === 'ar' ? 'en' : 'ar')
    switchers.forEach((btn) => btn.addEventListener('click', onClick))
    return () => switchers.forEach((btn) => btn.removeEventListener('click', onClick))
  }, [setLang])

  // Re-apply the data-en/data-ar walk whenever the shared language changes.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    applyLanguageToMarkup(container, lang)
  }, [lang])

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
