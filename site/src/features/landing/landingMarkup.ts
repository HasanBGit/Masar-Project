// Body markup ported from riyadh-city/index.html. Kept as a raw HTML string
// (rendered via dangerouslySetInnerHTML) rather than transcribed to JSX so it
// stays byte-identical to the original design; interactivity is reattached in
// LandingPage.tsx via the ported script.js logic.
export const LANDING_MARKUP = `
<!-- NOTE: every image below is hotlinked from CloudFront/Wikimedia. These MUST
     be self-hosted (copied into /public and referenced locally) before any
     production deploy — third-party hosts can rate-limit, remove, or replace
     them at any time. The width/height attributes are approximate placeholder
     ratios to reduce layout shift; set the exact intrinsic sizes when the
     files are self-hosted. -->
<main class="site-shell">
  <section class="cinema-scroll" id="cinema" aria-label="Truepoint cinematic scroll story">
    <div class="stage">
      <div class="world">
        <img class="scene-img sky-img" alt="Dawn sky over Riyadh" width="1536" height="1024" src="https://d8j0ntlcm91z4.cloudfront.net/user_3GuVL96jjh5izoSrfiVDK7XcMMd/hf_20260805_132834_a787e952-e7bc-4d20-8250-9d91757a603c.png" />

        <header class="site-header" aria-label="Primary navigation">
          <a class="site-logo" href="#cinema">Truepoint</a>
          <nav class="site-nav" aria-label="Main menu">
            <button type="button" data-nav="Product" data-ar="المنتج">Product</button>
            <button type="button" data-nav="Trust &amp; Evidence" data-ar="الثقة">Trust</button>
            <button type="button" data-nav="Approvals" data-ar="الاعتمادات">Approvals</button>
            <a href="#features" data-ar="المزايا">Features</a>
            <a href="#pricing" data-ar="الأسعار">Pricing</a>
            <a href="#faq" data-ar="الأسئلة الشائعة">FAQ</a>
          </nav>
          <div class="site-header-actions">
            <!-- href/visibility set at runtime from VITE_APP_URL in LandingPage.tsx;
                 hidden by default so a dead link is never clickable. -->
            <a class="site-login-link" id="site-login-link" href="#cinema" hidden data-ar="تسجيل الدخول">Log in</a>
            <button class="language-switcher" aria-label="Change language" type="button">
              <span class="language-switcher-label">EN</span>
              <span aria-hidden="true">⌄</span>
            </button>
          </div>
        </header>

        <div class="back-stack">
          <img class="scene-img back-img back-four" alt="Kingdom Tower in Riyadh lit up at night" width="1600" height="1200" src="https://upload.wikimedia.org/wikipedia/commons/8/88/Kingdom_Tower_at_night.JPG" />

          <section class="sights-slider" aria-label="Truepoint modules slider">
            <div class="sights-track">
              <article class="sight-card" tabindex="0" role="button" aria-pressed="false" aria-label="Open Approvals Workflow card"
                data-kicker-ar="وحدة أساسية" data-title-ar="سير عمل الاعتماد" data-body-ar="الحواف الثلاث — الاستماع، الفهم، الموافقة — قبل اعتماد أي توقيع.">
                <span class="sight-kicker">Core Module</span>
                <img class="sight-pin" alt="" aria-hidden="true" loading="lazy" width="512" height="512" src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260730_230438_d526b8b6-8a2e-4e3b-9993-3908acae03a7.png" />
                <h3>Approvals Workflow</h3>
                <p>The 3 Edges — Hearing, Understanding, Agreeing — before any sign-off counts.</p>
              </article>
              <article class="sight-card" tabindex="0" role="button" aria-pressed="false" aria-label="Open Trust and Evidence card"
                data-kicker-ar="النواة الأساسية" data-title-ar="الثقة والأدلة" data-body-ar="معالم مُعتمدة وسجل تدقيق جاهز لتقديمه في أي نزاع.">
                <span class="sight-kicker">Domain Kernel</span>
                <img class="sight-pin" alt="" aria-hidden="true" loading="lazy" width="512" height="512" src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260730_230442_140bc25b-b165-4249-904a-f708bff6970e.png" />
                <h3>Trust &amp; Evidence</h3>
                <p>Verified milestones and a dispute-ready audit trail.</p>
              </article>
              <article class="sight-card" tabindex="0" role="button" aria-pressed="false" aria-label="Open Owner Dashboard card"
                data-kicker-ar="واجهات الأدوار" data-title-ar="لوحة تحكم المالك" data-body-ar="واجهات مخصصة للمالك والمستثمر والاستشاري والمقاول.">
                <span class="sight-kicker">Role Views</span>
                <img class="sight-pin" alt="" aria-hidden="true" loading="lazy" width="512" height="512" src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260730_230448_825949c9-ccdb-4857-b4a6-e349eccc9010.png" />
                <h3>Owner Dashboard</h3>
                <p>Role-specific views for Owner, Investor, Consultant, Contractor.</p>
              </article>
              <article class="sight-card" tabindex="0" role="button" aria-pressed="false" aria-label="Open Unified Timeline card"
                data-kicker-ar="وحدة أساسية" data-title-ar="الخط الزمني الموحّد" data-body-ar="دمج واتساب والبريد الإلكتروني والتصاريح في سجل واحد.">
                <span class="sight-kicker">Core Module</span>
                <img class="sight-pin" alt="" aria-hidden="true" loading="lazy" width="512" height="512" src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260730_230438_d526b8b6-8a2e-4e3b-9993-3908acae03a7.png" />
                <h3>Unified Timeline</h3>
                <p>WhatsApp, email, and permit threads merged into one record.</p>
              </article>
              <article class="sight-card" tabindex="0" role="button" aria-pressed="false" aria-label="Open Contract and Payments card"
                data-kicker-ar="متوافق مع زاتكا" data-title-ar="العقود والمدفوعات" data-body-ar="دفعات مرتبطة بأدلة مُعتمدة، لا بتصريح ذاتي.">
                <span class="sight-kicker">ZATCA Ready</span>
                <img class="sight-pin" alt="" aria-hidden="true" loading="lazy" width="512" height="512" src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260730_230442_140bc25b-b165-4249-904a-f708bff6970e.png" />
                <h3>Contract &amp; Payments</h3>
                <p>Payment milestones gated on verified evidence, not self-assertion.</p>
              </article>
            </div>
          </section>

          <img class="scene-img back-img back-bazaar" alt="At-Turaif district in ad-Dir'iyah, traditional Najdi mud-brick architecture" width="4000" height="3000" src="https://upload.wikimedia.org/wikipedia/commons/6/64/At-Turaif_District_in_ad-Dir%27iyah_%288%29.jpg" />
        </div>

        <div class="sights-controls" aria-label="Slider controls">
          <button class="sight-nav sight-prev" aria-label="Previous module" type="button">←</button>
          <button class="sight-nav sight-next" aria-label="Next module" type="button">→</button>
        </div>

        <h1 class="hero-title">TRUEPOINT</h1>

        <img class="scene-img splitframe-img splitframe-left" alt="Riyadh skyline with the King Abdullah Financial District and Kingdom Tower" width="5184" height="3456" src="https://upload.wikimedia.org/wikipedia/commons/9/98/Riyadh_Skyline_showing_the_King_Abdullah_Financial_District_%28KAFD%29_and_the_famous_Kingdom_Tower_.jpg" />
        <img class="scene-img splitframe-img splitframe-right" alt="" aria-hidden="true" width="5184" height="3456" src="https://upload.wikimedia.org/wikipedia/commons/9/98/Riyadh_Skyline_showing_the_King_Abdullah_Financial_District_%28KAFD%29_and_the_famous_Kingdom_Tower_.jpg" />

        <img class="scene-img bridge-img" alt="Masmak fortress in Riyadh" width="1600" height="1200" src="https://upload.wikimedia.org/wikipedia/commons/e/e1/Masmak_castle.jpg" />
        <img class="scene-img frame-two-img" alt="Lake at Wadi Hanifah near Riyadh" loading="lazy" width="1024" height="683" src="https://upload.wikimedia.org/wikipedia/commons/0/08/Lake_at_Wadi_Hanifah_%285218227168%29.jpg" />

        <div class="shade"></div>
      </div>

      <section class="intro-copy" aria-label="Truepoint overview">
        <p data-ar="يحوّل Truepoint مجموعات الواتساب والمراسلات البريدية وتقارير استشاري الإدارة إلى سجل مشروع واحد موثّق باللغة العربية أولاً — دون أن يُطلب من فريق الموقع تغيير طريقة عمله.">Truepoint turns your WhatsApp groups, email threads, and PMC reports into one verified, Arabic-first project record — without asking your site team to change how they work.</p>
        <div class="hero-tags" aria-label="Truepoint highlights">
          <span data-ar="الأولوية للمالك">Owner-first</span>
          <span data-ar="الأولوية للعربية">Arabic-first</span>
          <span data-ar="السعودية ودول الخليج">Saudi &amp; GCC</span>
        </div>
      </section>

      <section class="story-panel story-panel-bridge" aria-label="Approvals and trust details">
        <h2 data-ar="النواة التي تعتمد عليها كل وحدة.">The kernel every module depends on.</h2>
        <p data-ar="الاعتمادات والثقة والأدلة هما النواة الأساسية — تُبنى عليها معظم الوحدات الأخرى.">Approvals and Trust &amp; Evidence are the domain kernel — most other modules build on both.</p>
        <dl class="facts">
          <div>
            <dt>6%</dt>
            <dd data-ar="من المقاولين السعوديين يستخدمون أي أداة حديثة لإدارة المشاريع">of Saudi contractors use any modern PM tool</dd>
          </div>
          <div>
            <dt>70%</dt>
            <dd data-ar="من مشاريع السعودية الكبرى تجاوزت الجدول الزمني">of Saudi mega-projects overran schedule</dd>
          </div>
        </dl>
      </section>

      <section class="story-panel story-panel-bazaar" aria-label="Arabic-first details">
        <h2 data-ar="الأولوية للعربية، لا إضافة لاحقة.">Arabic-first, not bolted on.</h2>
        <p data-ar="ملاحظات صوتية والتقاط عبر واتساب ومعالجة لغوية تراعي اللهجة الخليجية — لا مسار إنجليزي أُضيفت له ترجمة لاحقاً.">Voice notes, WhatsApp capture, and a Gulf-dialect-aware NLP pipeline — not an English pipeline with translation added later.</p>
        <button class="note-button request-access-btn" type="button">
          <span aria-hidden="true">↗</span>
          <span data-ar="اطلب الوصول المبكر">Request Early Access</span>
        </button>
      </section>
    </div>
  </section>

  <section class="landing-section features-section" id="features" aria-label="Features">
    <div class="section-inner">
      <p class="section-eyebrow" data-ar="لماذا تنتقل الفرق إلينا">Why teams switch</p>
      <h2 class="section-heading" data-ar="خمس قدرات تحوّل القنوات المتناثرة إلى سجل واحد قابل للمساءلة.">Five capabilities that turn scattered channels into one accountable record.</h2>
      <div class="feature-grid">
        <article class="feature-card">
          <h3 data-ar="خط زمني موحّد للمشروع">Unified project timeline</h3>
          <p data-ar="تحديثات واتساب، والبريد الإلكتروني، وطلبات المعلومات، ومراسلات التصاريح — مدمجة في سجل واحد مرتبط بالمشروع.">WhatsApp updates, email threads, RFIs, and permit correspondence — merged into one project-anchored record.</p>
        </article>
        <article class="feature-card">
          <h3 data-ar="موثّق، لا مُصرَّح به ذاتياً">Verified, not self-reported</h3>
          <p data-ar="مطالبات التقدّم ترتبط بدليل مصوَّر موثّق بالتاريخ والموقع الجغرافي لمعلم محدد قبل اعتمادها.">Progress claims tie to timestamped, geotagged photo evidence against a specific milestone before they count.</p>
        </article>
        <article class="feature-card">
          <h3 data-ar="سير عمل الحواف الثلاث">The 3 Edges approval flow</h3>
          <p data-ar="الاستماع، الفهم، الموافقة — فحص استيعاب بأسلوب إعادة الشرح وتوقيع واحد محدد بالاسم ومسؤول، في كل مرة.">Hearing, Understanding, Agreeing — a teach-back check and one named, accountable sign-off, every time.</p>
        </article>
        <article class="feature-card">
          <h3 data-ar="لوحات تحكم مخصصة حسب الدور">Role-specific dashboards</h3>
          <p data-ar="يرى المالك والمستثمر والاستشاري والمقاول الواجهة المصمَّمة لقراراتهم — من نموذج بيانات واحد.">Owner, Investor, Consultant, and Contractor each see the view built for their decisions — from one data model.</p>
        </article>
        <article class="feature-card">
          <h3 data-ar="الأولوية للعربية، وجاهز للصوت">Arabic-first, voice-ready</h3>
          <p data-ar="مبني على معالجة لغوية عربية تراعي اللهجة الخليجية منذ اليوم الأول — لا منتج إنجليزي أُضيفت له ترجمة لاحقاً.">Built on a Gulf-dialect-aware Arabic pipeline from day one — not an English product with translation bolted on.</p>
        </article>
      </div>
    </div>
  </section>

  <section class="landing-section how-section" id="how-it-works" aria-label="How it works">
    <div class="section-inner">
      <p class="section-eyebrow" data-ar="كيف يعمل">How it works</p>
      <h2 class="section-heading" data-ar="من قنوات متناثرة إلى سجل موثّق، في ثلاث خطوات.">From scattered channels to a verified record, in three steps.</h2>
      <div class="steps-grid">
        <div class="step">
          <span class="step-num">1</span>
          <h3 data-ar="اربط قنواتك">Connect your channels</h3>
          <p data-ar="أضف Truepoint إلى مجموعات واتساب وصناديق البريد التي يستخدمها فريقك بالفعل. دون تطبيق جديد على فريق الموقع تبنّيه.">Add Truepoint to the WhatsApp groups and inboxes your team already uses. No new app for the site team to adopt.</p>
        </div>
        <div class="step">
          <span class="step-num">2</span>
          <h3 data-ar="شاهد السجل يُبنى تلقائياً">Watch the record build itself</h3>
          <p data-ar="تصل الصور والملاحظات الصوتية وطلبات المعلومات وتقارير استشاري الإدارة إلى خط زمني واحد بالعربية أولاً، مرتبط بالمعالم فور حدوثها.">Photos, voice notes, RFIs, and PMC reports land on one Arabic-first timeline, tied to milestones as they happen.</p>
        </div>
        <div class="step">
          <span class="step-num">3</span>
          <h3 data-ar="اعتمِد، صدِّر، وابقَ متقدماً">Approve, export, stay ahead</h3>
          <p data-ar="وقّع عبر الحواف الثلاث، واستخرج سجلاً مدعوماً بالأدلة وجاهزاً لأي نزاع متى احتجت إليه.">Sign off through the 3 Edges and pull a dispute-ready, evidence-backed record whenever you need it.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="cta-band" aria-label="Request early access">
    <div class="section-inner cta-band-inner">
      <div>
        <h2 data-ar="شاهد Truepoint على مشروعك.">See Truepoint on your project.</h2>
        <p data-ar="دون بطاقة، ودون التزام — فقط جولة توضيحية على خطك الزمني الفعلي.">No card, no commitment — just a walkthrough with your actual timeline.</p>
      </div>
      <button class="note-button note-button--dark request-access-btn" type="button">
        <span aria-hidden="true">↗</span>
        <span data-ar="اطلب الوصول المبكر">Request Early Access</span>
      </button>
    </div>
  </section>

  <section class="landing-section pricing-section" id="pricing" aria-label="Pricing">
    <div class="section-inner">
      <p class="section-eyebrow" data-ar="الأسعار">Pricing</p>
      <h2 class="section-heading" data-ar="مصمَّمة حسب محفظتك، لا بعدد مقاعد موحّد للجميع.">Scoped to your portfolio, not a one-size-fits-all seat count.</h2>
      <p class="section-body" data-ar="يُسعَّر Truepoint لكل مشروع خلال مرحلة الوصول المبكر — سترى خطة مقترحة، لا جدار دفع، قبل الاتفاق على أي شيء.">Truepoint is priced per project during early access — you'll see a proposed plan, not a paywall, before anything is agreed.</p>

      <div class="pricing-grid">
        <article class="price-card">
          <h3 data-ar="مشروع واحد">Single Project</h3>
          <p class="price-tagline" data-ar="موقع نشط واحد، مغطّى بالكامل.">One active site, fully covered.</p>
          <ul>
            <li data-ar="التقاط ميداني من مجموعات واتساب الحالية">Field capture from existing WhatsApp groups</li>
            <li data-ar="خط زمني موحّد للمشروع">Unified project timeline</li>
            <li data-ar="لوحة تحكم المالك والواجهات حسب الدور">Owner dashboard &amp; role views</li>
            <li data-ar="سير عمل اعتماد الحواف الثلاث">3 Edges approval workflow</li>
            <li data-ar="سجل الثقة والأدلة">Trust &amp; evidence ledger</li>
          </ul>
          <button class="note-button note-button--outline request-access-btn" type="button">
            <span aria-hidden="true">↗</span>
            <span data-ar="اطلب الوصول المبكر">Request early access</span>
          </button>
        </article>

        <article class="price-card is-featured">
          <span class="price-badge" data-ar="الأكثر طلباً">Most requested</span>
          <h3 data-ar="المحفظة">Portfolio</h3>
          <p class="price-tagline" data-ar="للملاك والمطورين الذين يديرون عدة مشاريع في آنٍ واحد.">For owners and developers running several projects at once.</p>
          <ul>
            <li data-ar="كل ما في خطة المشروع الواحد">Everything in Single Project</li>
            <li data-ar="التحقق من العقود والمدفوعات">Contract &amp; payment verification</li>
            <li data-ar="المراقبة والملاحظة">Monitoring &amp; observability</li>
            <li data-ar="التحكم بالوصول وإدارة الفريق">Access control &amp; team admin</li>
            <li data-ar="قواعد متسقة عبر كل مشروع">Consistent rules across every project</li>
          </ul>
          <button class="note-button request-access-btn" type="button">
            <span aria-hidden="true">↗</span>
            <span data-ar="اطلب الوصول المبكر">Request early access</span>
          </button>
        </article>

        <article class="price-card">
          <h3 data-ar="المؤسسات">Enterprise</h3>
          <p class="price-tagline" data-ar="للمطورين واستشاريي الإدارة العاملين على نطاق واسع.">For developers and PMCs operating at scale.</p>
          <ul>
            <li data-ar="كل ما في خطة المحفظة">Everything in Portfolio</li>
            <li data-ar="واجهة برمجة المنصة وwebhooks">Platform API &amp; webhooks</li>
            <li data-ar="تكاملات مخصصة">Custom integrations</li>
            <li data-ar="تأهيل مخصص">Dedicated onboarding</li>
            <li data-ar="اتفاقية مستوى خدمة">Service-level agreement</li>
          </ul>
          <button class="note-button note-button--outline request-access-btn" type="button">
            <span aria-hidden="true">↗</span>
            <span data-ar="تحدَّث معنا">Talk to us</span>
          </button>
        </article>
      </div>
      <p class="pricing-note" data-ar="لا حاجة لبطاقة ائتمانية للتحدث معنا. تُحدَّد الأسعار النهائية مع فريق التأهيل الخاص بك.">No card required to talk to us. Final pricing is confirmed with your onboarding team.</p>
    </div>
  </section>

  <section class="landing-section credibility-section" id="credibility" aria-label="Where this comes from">
    <div class="section-inner credibility-inner">
      <div class="credibility-main">
        <p class="section-eyebrow" data-ar="من أين جاء هذا">Where this comes from</p>
        <h2 class="section-heading" data-ar="بُني داخل برنامج مسار التابع لمؤسسة مسك، ومستند إلى الأرقام التي تقف خلفه.">Built inside Misk Foundation's Masar program, and grounded in the numbers behind it.</h2>
        <div class="credibility-points">
          <div>
            <h3 data-ar="برعاية مؤسسة مسك">Incubated by Misk Foundation</h3>
            <p data-ar="بُني بواسطة San3 (صنع) داخل برنامج مسار التابع لمؤسسة مسك للمؤسسين السعوديين.">Built by San3 (صنع) inside Misk Foundation's Masar program for Saudi founders.</p>
          </div>
          <div>
            <h3 data-ar="مستند إلى أبحاث منشورة">Grounded in published research</h3>
            <p data-ar="كل رقم في هذه الصفحة يستشهد بمصدر محكَّم — لا نص تسويقي.">Every stat on this site cites a peer-reviewed source — not marketing copy.</p>
          </div>
          <div>
            <h3 data-ar="في الوصول المبكر، عن قصد">In early access, on purpose</h3>
            <p data-ar="نستقبل عدداً محدوداً من الملاك والمطورين مباشرة، قبل فتح الإطلاق العام.">We're onboarding a small number of owners and developers directly, before opening up general availability.</p>
          </div>
        </div>
      </div>
      <blockquote class="credibility-quote">
        <p data-ar="بنينا الخط الزمني وسير الاعتماد أولاً، لأنهما ما انتهت إليه كل نزاعات درسناها: من عَلِم بماذا، ومن وقّع على ماذا.">"We built the timeline and the approval flow first, because those are the two things every dispute we studied came down to: who knew what, and who signed off on it."</p>
        <p class="credibility-cite" data-ar="— فريق Truepoint">— The Truepoint team</p>
      </blockquote>
    </div>
  </section>

  <section class="landing-section faq-section" id="faq" aria-label="FAQ">
    <div class="section-inner">
      <p class="section-eyebrow" data-ar="الأسئلة الشائعة">FAQ</p>
      <h2 class="section-heading" data-ar="أسئلة متكررة قبل طلب الوصول.">Common questions before you request access.</h2>
      <div class="faq-list">
        <details class="faq-item" open>
          <summary data-ar="هل يحتاج فريق الموقع لتعلّم تطبيق جديد؟">Does my site team need to learn a new app?</summary>
          <p data-ar="لا. الالتقاط الميداني يعتمد على مجموعات واتساب التي يستخدمها فريقك بالفعل — يقرأ Truepoint من قنوات لم يغيّرها فريقك، بدلاً من مطالبته بتبنّي قناة جديدة.">No. Field capture rides on the WhatsApp groups your trades already use — Truepoint reads from channels your team hasn't changed, rather than asking them to adopt a new one.</p>
        </details>
        <details class="faq-item">
          <summary data-ar="أين يتم تخزين بيانات مشروعنا؟">Where is our project data stored?</summary>
          <p data-ar="تخضع إقامة البيانات والوصول إليها لمتطلبات نظام حماية البيانات الشخصية السعودي (PDPL). هذا قرار معماري، لا ملاحظة سياسة أُضيفت لاحقاً.">Data residency and access follow Saudi PDPL requirements. This is an architecture decision, not a policy footnote we bolted on later.</p>
        </details>
        <details class="faq-item">
          <summary data-ar="ماذا يغيّر «الاعتماد» فعلياً في العمل اليومي؟">What does 'approval' actually change day to day?</summary>
          <p data-ar="كل توقيع يمر عبر الحواف الثلاث — الاستماع، الفهم، الموافقة — مع فحص استيعاب بأسلوب إعادة الشرح ومعتمِد واحد محدد بالاسم ومسؤول، بحيث لا يُعامَل «الاطّلاع» على أنه «موافقة».">Every sign-off passes through the 3 Edges — Hearing, Understanding, Agreeing — with a teach-back comprehension check and a single named, accountable approver, so "seen" stops being treated as "agreed."</p>
        </details>
        <details class="faq-item">
          <summary data-ar="هل Truepoint متاحة بالعربية فقط؟">Is Truepoint only available in Arabic?</summary>
          <p data-ar="المنصة ثنائية اللغة وتضع العربية أولاً — بدّل اللغة من الشريط العلوي لترى المنتج كاملاً بالإنجليزية أو العربية، بما في ذلك الاتجاه من اليمين لليسار.">It's bilingual and Arabic-first — flip the language switcher in the top nav to see the whole product in English or Arabic, right-to-left included.</p>
        </details>
        <details class="faq-item">
          <summary data-ar="كم تستغرق عملية التأهيل؟">How long does onboarding take?</summary>
          <p data-ar="نستقبل عدداً محدوداً من الملاك والمطورين مباشرة قبل الإطلاق العام، لذا تُحدَّد الجداول الزمنية مع فريقك لا بموعد إطلاق ثابت.">We're onboarding a small number of owners and developers directly ahead of general availability, so timelines are set with your team rather than a fixed rollout date.</p>
        </details>
        <details class="faq-item">
          <summary data-ar="كم تكلفته؟">What does it cost?</summary>
          <p data-ar="تُحدَّد الأسعار لكل مشروع خلال مرحلة الوصول المبكر. اطلب الوصول أدناه وسنتابع معك بخطة تناسب محفظتك.">Pricing is scoped per project during early access. Request access below and we'll follow up with a plan for your portfolio.</p>
        </details>
      </div>
    </div>
  </section>

  <section class="landing-section legal-section" id="legal" aria-label="Privacy and terms">
    <div class="section-inner">
      <p class="section-eyebrow" data-ar="قانوني">Legal</p>
      <div class="legal-grid">
        <article class="legal-block" id="privacy">
          <h2 class="legal-heading" data-ar="سياسة الخصوصية">Privacy policy</h2>
          <p data-ar="نجمع فقط البيانات التي تشاركها معنا أثناء الوصول المبكر — اسمك وبريدك الإلكتروني وتفاصيل المشروع — ونستخدمها حصراً للتواصل معك حول Truepoint. لا نبيع بياناتك ولا نشاركها مع أي طرف ثالث.">During early access we collect only the data you share with us — your name, email, and project details — and use it solely to follow up with you about Truepoint. We never sell your data or share it with third parties.</p>
          <p data-ar="تخضع إقامة البيانات والوصول إليها لمتطلبات نظام حماية البيانات الشخصية السعودي (PDPL). راسلنا في أي وقت لطلب حذف بياناتك.">Data residency and access follow Saudi PDPL requirements. Contact us at any time to have your data deleted.</p>
        </article>
        <article class="legal-block" id="terms">
          <h2 class="legal-heading" data-ar="شروط الخدمة">Terms of service</h2>
          <p data-ar="Truepoint في مرحلة الوصول المبكر: تُتاح المنصة للملاك والمطورين المسجّلين بموجب اتفاقية تجريبية تُوقَّع أثناء التأهيل، وتُحدَّد فيها نطاقات الاستخدام ومستويات الخدمة لكل مشروع.">Truepoint is in early access: the platform is made available to onboarded owners and developers under a pilot agreement signed during onboarding, which defines usage scope and service levels per project.</p>
          <p data-ar="لا يشكّل محتوى هذا الموقع استشارة قانونية أو تعاقدية. الأسعار النهائية والشروط الكاملة تُؤكَّد كتابياً مع فريق التأهيل الخاص بك.">Nothing on this site constitutes legal or contractual advice. Final pricing and full terms are confirmed in writing with your onboarding team.</p>
        </article>
      </div>
    </div>
  </section>
</main>

<footer class="site-footer">
  <div class="section-inner footer-top">
    <div>
      <h2 data-ar="جاهز لرؤيتها على مشروعك؟">Ready to see it on your project?</h2>
      <p data-ar="اطلب الوصول المبكر وسنتابع معك مباشرة — دون بطاقة، ودون التزام.">Request early access and we'll follow up directly — no card, no commitment.</p>
    </div>
    <button class="note-button request-access-btn" type="button">
      <span aria-hidden="true">↗</span>
      <span data-ar="اطلب الوصول المبكر">Request early access</span>
    </button>
  </div>

  <div class="section-inner footer-columns">
    <div class="footer-brand">
      <a class="site-logo" href="#cinema">Truepoint</a>
      <p data-ar="سجل واحد موثّق، من الموقع إلى التوقيع. بُني بواسطة San3 (صنع)، برعاية برنامج مسار التابع لمؤسسة مسك.">One verified record, from site to signature. Built by San3 (صنع), incubated in Misk Foundation's Masar program.</p>
      <button class="language-switcher" aria-label="Change language" type="button">
        <span class="language-switcher-label">EN</span>
        <span aria-hidden="true">⌄</span>
      </button>
    </div>
    <div class="footer-col">
      <h3 data-ar="المنتج">Product</h3>
      <ul>
        <li><a href="#features" data-ar="المزايا">Features</a></li>
        <li><a href="#pricing" data-ar="الأسعار">Pricing</a></li>
        <li><a href="#faq" data-ar="الأسئلة الشائعة">FAQ</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h3 data-ar="الشركة">Company</h3>
      <ul>
        <li><a href="#credibility" data-ar="San3 وبرنامج مسار">San3 &amp; the Masar program</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h3 data-ar="قانوني">Legal</h3>
      <ul>
        <li><a href="#privacy" data-ar="سياسة الخصوصية">Privacy policy</a></li>
        <li><a href="#terms" data-ar="شروط الخدمة">Terms of service</a></li>
      </ul>
    </div>
  </div>

  <div class="section-inner footer-bottom">
    <p class="pdpl-badge" data-ar="إقامة بيانات متوافقة مع نظام حماية البيانات السعودي (PDPL)">Saudi PDPL-aligned data residency</p>
    <p class="footer-copy" data-ar="© 2026 Truepoint / San3">© 2026 Truepoint / San3</p>
  </div>

  <div class="photo-credits">
    Photography: <a href="https://commons.wikimedia.org/wiki/File:Kingdom_Tower_at_night.JPG" target="_blank" rel="noopener">BroadArrow</a> ·
    <a href="https://commons.wikimedia.org/wiki/File:At-Turaif_District_in_ad-Dir%27iyah_(8).jpg" target="_blank" rel="noopener">Radosław Botev / Fundacja Nomos</a> ·
    <a href="https://commons.wikimedia.org/wiki/File:Riyadh_Skyline_showing_the_King_Abdullah_Financial_District_(KAFD)_and_the_famous_Kingdom_Tower_.jpg" target="_blank" rel="noopener">B.alotaby</a> ·
    <a href="https://commons.wikimedia.org/wiki/File:Masmak_castle.jpg" target="_blank" rel="noopener">Baptiste Marcel</a> (public domain) ·
    <a href="https://commons.wikimedia.org/wiki/File:Lake_at_Wadi_Hanifah_(5218227168).jpg" target="_blank" rel="noopener">Peter Dowley</a>, via Wikimedia Commons (CC BY / CC BY-SA)
  </div>
</footer>

<div class="modal-overlay" id="modal-overlay" hidden>
  <div class="modal-backdrop" id="modal-backdrop"></div>
  <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1">
    <button class="modal-close" id="modal-close" aria-label="Close">&times;</button>
    <h3 id="modal-title"></h3>
    <div id="modal-body"></div>
  </div>
</div>
`
