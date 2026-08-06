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
            <button type="button" data-nav="Product" data-ar="المنتج" data-hi="उत्पाद" data-ur="پروڈکٹ">Product</button>
            <button type="button" data-nav="Trust &amp; Evidence" data-ar="الثقة والأدلة" data-hi="विश्वास और प्रमाण" data-ur="اعتماد اور شواہد">Trust</button>
            <button type="button" data-nav="Approvals" data-ar="الاعتمادات" data-hi="अनुमोदन" data-ur="منظوریاں">Approvals</button>
            <a href="#features" data-ar="المزايا والإمكانات" data-hi="विशेषताएं" data-ur="خصوصیات">Features</a>
            <a href="#pricing" data-ar="التسعير" data-hi="मूल्य निर्धारण" data-ur="قیمتیں">Pricing</a>
            <a href="#faq" data-ar="الأسئلة المتكررة" data-hi="अक्सर पूछे जाने वाले प्रश्न" data-ur="بار بار پوچھے گئے سوالات">FAQ</a>
          </nav>
          <div class="site-header-actions">
            <!-- href/visibility set at runtime from VITE_APP_URL in LandingPage.tsx;
                 hidden by default so a dead link is never clickable. -->
            <a class="site-login-link" id="site-login-link" href="#cinema" hidden data-ar="تسجيل الدخول" data-hi="साइन इन करें" data-ur="سائن ان کریں">Log in</a>
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
                data-kicker-ar="وحدة أساسية" data-title-ar="سير عمل الاعتماد" data-body-ar="الحواف الثلاث — الاستماع والفهم والموافقة — شرط لازم قبل إتمام أي توقيع."
                data-kicker-hi="कोर मॉड्यूल" data-title-hi="अनुमोदन वर्कफ़्लो" data-body-hi="तीन चरण — सुनवाई, समझ, सहमति — किसी भी हस्ताक्षर से पहले अनिवार्य।"
                data-kicker-ur="بنیادی ماڈیول" data-title-ur="منظوری کا ورک فلو" data-body-ur="تین مراحل — سماعت، تفہیم، اتفاق — کسی بھی دستخط سے پہلے لازمی۔">
                <span class="sight-kicker">Core Module</span>
                <img class="sight-pin" alt="" aria-hidden="true" loading="lazy" width="512" height="512" src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260730_230438_d526b8b6-8a2e-4e3b-9993-3908acae03a7.png" />
                <h3>Approvals Workflow</h3>
                <p>The 3 Edges — Hearing, Understanding, Agreeing — before any sign-off counts.</p>
              </article>
              <article class="sight-card" tabindex="0" role="button" aria-pressed="false" aria-label="Open Trust and Evidence card"
                data-kicker-ar="النواة الأساسية" data-title-ar="الثقة والأدلة" data-body-ar="معالم مُعتمدة وموثَّقة، وسجل تدقيق جاهز للاحتجاج به في أي نزاع قانوني."
                data-kicker-hi="डोमेन कर्नेल" data-title-hi="विश्वास और प्रमाण" data-body-hi="सत्यापित माइलस्टोन और विवाद-तैयार ऑडिट लॉग।"
                data-kicker-ur="بنیادی مرکز" data-title-ur="اعتماد اور شواہد" data-body-ur="تصدیق شدہ سنگ میل اور تنازعات کے لیے تیار آڈٹ لاگ۔">
                <span class="sight-kicker">Domain Kernel</span>
                <img class="sight-pin" alt="" aria-hidden="true" loading="lazy" width="512" height="512" src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260730_230442_140bc25b-b165-4249-904a-f708bff6970e.png" />
                <h3>Trust &amp; Evidence</h3>
                <p>Verified milestones and a dispute-ready audit trail.</p>
              </article>
              <article class="sight-card" tabindex="0" role="button" aria-pressed="false" aria-label="Open Owner Dashboard card"
                data-kicker-ar="واجهات مخصصة حسب الدور" data-title-ar="لوحة تحكم المالك" data-body-ar="واجهات مصمَّمة خصيصاً للمالك والاستشاري ومدير المشروع والمصمم."
                data-kicker-hi="भूमिका दृश्य" data-title-hi="मालिक डैशबोर्ड" data-body-hi="मालिक, सलाहकार, प्रोजेक्ट मैनेजर, डिज़ाइनर के लिए विशिष्ट दृश्य।"
                data-kicker-ur="کردار کے ویوز" data-title-ur="مالک ڈیش بورڈ" data-body-ur="مالک، مشیر، پراجیکٹ مینیجر، ڈیزائنر کے لیے مخصوص ویوز۔">
                <span class="sight-kicker">Role Views</span>
                <img class="sight-pin" alt="" aria-hidden="true" loading="lazy" width="512" height="512" src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260730_230448_825949c9-ccdb-4857-b4a6-e349eccc9010.png" />
                <h3>Owner Dashboard</h3>
                <p>Role-specific views for Owner, Consultant, Project Manager, Designer.</p>
              </article>
              <article class="sight-card" tabindex="0" role="button" aria-pressed="false" aria-label="Open Unified Timeline card"
                data-kicker-ar="وحدة أساسية" data-title-ar="الخط الزمني الموحَّد" data-body-ar="يدمج رسائل واتساب والمراسلات الإلكترونية والتصاريح في سجل مشروع موحَّد."
                data-kicker-hi="कोर मॉड्यूल" data-title-hi="एकीकृत टाइमलाइन" data-body-hi="WhatsApp, ईमेल, और परमिट थ्रेड्स एक ही रिकॉर्ड में विलीन।"
                data-kicker-ur="بنیادی ماڈیول" data-title-ur="یکجا ٹائم لائن" data-body-ur="WhatsApp، ای میل، اور پرمٹ تھریڈز ایک ہی ریکارڈ میں یکجا۔">
                <span class="sight-kicker">Core Module</span>
                <img class="sight-pin" alt="" aria-hidden="true" loading="lazy" width="512" height="512" src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260730_230438_d526b8b6-8a2e-4e3b-9993-3908acae03a7.png" />
                <h3>Unified Timeline</h3>
                <p>WhatsApp, email, and permit threads merged into one record.</p>
              </article>
              <article class="sight-card" tabindex="0" role="button" aria-pressed="false" aria-label="Open Contract and Payments card"
                data-kicker-ar="متوافق مع زاتكا" data-title-ar="العقود والمدفوعات" data-body-ar="دفعات مشروطة بأدلة مُعتمدة وموثَّقة، لا بادعاء ذاتي من المقاول."
                data-kicker-hi="ZATCA तैयार" data-title-hi="अनुबंध और भुगतान" data-body-hi="सत्यापित प्रमाण से बंधे भुगतान माइलस्टोन, ठेकेदार के दावे से नहीं।"
                data-kicker-ur="ZATCA تیار" data-title-ur="کنٹریکٹ اور ادائیگیاں" data-body-ur="تصدیق شدہ شواہد سے جڑے ادائیگی کے سنگ میل، ٹھیکیدار کے دعوے سے نہیں۔">
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
        <p data-ar="تحوّل Truepoint مجموعات الواتساب والمراسلات الإلكترونية وتقارير استشاري إدارة المشاريع إلى سجل مشروع موحَّد وموثَّق باللغة العربية أولاً — دون أن يُكلَّف فريق الموقع بتغيير أسلوب عمله.">Truepoint turns your WhatsApp groups, email threads, and PMC reports into one verified, Arabic-first project record — without asking your site team to change how they work.</p>
        <div class="hero-tags" aria-label="Truepoint highlights">
          <span data-ar="الأولوية للمالك">Owner-first</span>
          <span data-ar="الأولوية للعربية">Arabic-first</span>
          <span data-ar="المملكة العربية السعودية ودول الخليج">Saudi &amp; GCC</span>
        </div>
      </section>

      <section class="story-panel story-panel-bridge" aria-label="Approvals and trust details">
        <h2 data-ar="النواة التي تستند إليها جميع الوحدات.">The kernel every module depends on.</h2>
        <p data-ar="الاعتمادات وبنية الثقة والأدلة هما النواة الأساسية — تستند إليها معظم الوحدات الأخرى.">Approvals and Trust &amp; Evidence are the domain kernel — most other modules build on both.</p>
        <dl class="facts">
          <div>
            <dt>6%</dt>
            <dd data-ar="من المقاولين السعوديين يستخدمون أي أداة حديثة لإدارة المشاريع">of Saudi contractors use any modern PM tool</dd>
          </div>
          <div>
            <dt>70%</dt>
            <dd data-ar="من المشاريع الكبرى في المملكة العربية السعودية تجاوزت جدولها الزمني المحدد">of Saudi mega-projects overran schedule</dd>
          </div>
        </dl>
      </section>

      <section class="story-panel story-panel-bazaar" aria-label="Arabic-first details">
        <h2 data-ar="الأولوية للعربية، لا ترجمة أُضيفت لاحقاً.">Arabic-first, not bolted on.</h2>
        <p data-ar="ملاحظات صوتية والتقاط عبر واتساب ومعالجة لغوية تراعي اللهجة الخليجية — لا مسار إنجليزي أُضيفت إليه ترجمة في مرحلة لاحقة.">Voice notes, WhatsApp capture, and a Gulf-dialect-aware NLP pipeline — not an English pipeline with translation added later.</p>
        <button class="note-button request-access-btn" type="button">
          <span aria-hidden="true">↗</span>
          <span data-ar="طلب الوصول المبكر">Request Early Access</span>
        </button>
      </section>
    </div>
  </section>

  <section class="landing-section features-section" id="features" aria-label="Features">
    <div class="section-inner">
      <p class="section-eyebrow" data-ar="أسباب تحوّل الفرق إلينا">Why teams switch</p>
      <h2 class="section-heading" data-ar="خمس قدرات تحوّل القنوات المتناثرة إلى سجل موحَّد قابل للمساءلة.">Five capabilities that turn scattered channels into one accountable record.</h2>
      <div class="feature-grid">
        <article class="feature-card">
          <h3 data-ar="الخط الزمني الموحَّد للمشروع">Unified project timeline</h3>
          <p data-ar="تحديثات واتساب والمراسلات الإلكترونية وطلبات المعلومات ومراسلات التصاريح — مدمجة في سجل واحد مرتبط بالمشروع.">WhatsApp updates, email threads, RFIs, and permit correspondence — merged into one project-anchored record.</p>
        </article>
        <article class="feature-card">
          <h3 data-ar="موثَّق، لا مُصرَّح به ذاتياً">Verified, not self-reported</h3>
          <p data-ar="تُربط مطالبات التقدّم بدليل مصوَّر موثَّق بالتاريخ والموقع الجغرافي لمعلم محدد قبل الاعتداد بها.">Progress claims tie to timestamped, geotagged photo evidence against a specific milestone before they count.</p>
        </article>
        <article class="feature-card">
          <h3 data-ar="سير عمل الحواف الثلاث للاعتماد">The 3 Edges approval flow</h3>
          <p data-ar="الاستماع والفهم والموافقة — فحص استيعاب وفق أسلوب إعادة الشرح، وتوقيع واحد محدَّد بالاسم تقع عليه المسؤولية الكاملة، في كل مرة.">Hearing, Understanding, Agreeing — a teach-back check and one named, accountable sign-off, every time.</p>
        </article>
        <article class="feature-card">
          <h3 data-ar="واجهات مخصصة حسب الدور الوظيفي">Role-specific dashboards</h3>
          <p data-ar="يطّلع المالك والاستشاري ومدير المشروع والمصمم على الواجهة المصمَّمة خصيصاً لقراراتهم — من نموذج بيانات موحَّد.">Owner, Consultant, Project Manager, and Designer each see the view built for their decisions — from one data model.</p>
        </article>
        <article class="feature-card">
          <h3 data-ar="الأولوية للعربية، ومدعوم صوتياً">Arabic-first, voice-ready</h3>
          <p data-ar="مبنيٌّ على معالجة لغوية عربية تراعي اللهجة الخليجية منذ اليوم الأول — لا منتج إنجليزي أُضيفت إليه ترجمة في مرحلة لاحقة.">Built on a Gulf-dialect-aware Arabic pipeline from day one — not an English product with translation bolted on.</p>
        </article>
      </div>
    </div>
  </section>

  <section class="landing-section how-section" id="how-it-works" aria-label="How it works">
    <div class="section-inner">
      <p class="section-eyebrow" data-ar="آلية العمل">How it works</p>
      <h2 class="section-heading" data-ar="من قنوات متناثرة إلى سجل موثَّق، في ثلاث خطوات.">From scattered channels to a verified record, in three steps.</h2>
      <div class="steps-grid">
        <div class="step">
          <span class="step-num">1</span>
          <h3 data-ar="ربط قنوات التواصل">Connect your channels</h3>
          <p data-ar="أضف Truepoint إلى مجموعات واتساب وصناديق البريد التي يستخدمها فريقك بالفعل — دون أن تُكلِّف فريق الموقع بتبنّي تطبيق جديد.">Add Truepoint to the WhatsApp groups and inboxes your team already uses. No new app for the site team to adopt.</p>
        </div>
        <div class="step">
          <span class="step-num">2</span>
          <h3 data-ar="بناء السجل بصورة تلقائية">Watch the record build itself</h3>
          <p data-ar="تُرفع الصور والملاحظات الصوتية وطلبات المعلومات وتقارير استشاري الإدارة إلى خط زمني موحَّد باللغة العربية أولاً، مرتبط بالمعالم فور وقوعها.">Photos, voice notes, RFIs, and PMC reports land on one Arabic-first timeline, tied to milestones as they happen.</p>
        </div>
        <div class="step">
          <span class="step-num">3</span>
          <h3 data-ar="الاعتماد والتصدير والبقاء في المقدمة">Approve, export, stay ahead</h3>
          <p data-ar="وقّع عبر الحواف الثلاث، واستخرج سجلاً مدعوماً بالأدلة وجاهزاً لأي نزاع في أي وقت تحتاجه.">Sign off through the 3 Edges and pull a dispute-ready, evidence-backed record whenever you need it.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="cta-band" aria-label="Request early access">
    <div class="section-inner cta-band-inner">
      <div>
        <h2 data-ar="اطّلع على Truepoint مطبَّقاً على مشروعك.">See Truepoint on your project.</h2>
        <p data-ar="دون بطاقة ائتمانية أو أي التزام — جولة توضيحية على خطك الزمني الفعلي.">No card, no commitment — just a walkthrough with your actual timeline.</p>
      </div>
      <button class="note-button note-button--dark request-access-btn" type="button">
        <span aria-hidden="true">↗</span>
        <span data-ar="طلب الوصول المبكر">Request Early Access</span>
      </button>
    </div>
  </section>

  <section class="landing-section pricing-section" id="pricing" aria-label="Pricing">
    <div class="section-inner">
      <p class="section-eyebrow" data-ar="التسعير">Pricing</p>
      <h2 class="section-heading" data-ar="تسعير مُصمَّم حسب محفظتك، لا وفق عدد مقاعد موحَّد للجميع.">Scoped to your portfolio, not a one-size-fits-all seat count.</h2>
      <p class="section-body" data-ar="يُسعَّر Truepoint لكل مشروع على حدة خلال مرحلة الوصول المبكر — ستطّلع على خطة مقترحة، لا على جدار دفع، قبل الاتفاق على أي شيء.">Truepoint is priced per project during early access — you'll see a proposed plan, not a paywall, before anything is agreed.</p>

      <div class="pricing-grid">
        <article class="price-card">
          <h3 data-ar="مشروع واحد">Single Project</h3>
          <p class="price-tagline" data-ar="موقع نشط واحد، مشمول بالكامل.">One active site, fully covered.</p>
          <ul>
            <li data-ar="التقاط ميداني من مجموعات واتساب الحالية">Field capture from existing WhatsApp groups</li>
            <li data-ar="الخط الزمني الموحَّد للمشروع">Unified project timeline</li>
            <li data-ar="لوحة تحكم المالك والواجهات المخصصة حسب الدور">Owner dashboard &amp; role views</li>
            <li data-ar="سير عمل اعتماد الحواف الثلاث">3 Edges approval workflow</li>
            <li data-ar="سجل الثقة والأدلة">Trust &amp; evidence ledger</li>
          </ul>
          <button class="note-button note-button--outline request-access-btn" type="button">
            <span aria-hidden="true">↗</span>
            <span data-ar="طلب الوصول المبكر">Request early access</span>
          </button>
        </article>

        <article class="price-card is-featured">
          <span class="price-badge" data-ar="الأكثر طلباً">Most requested</span>
          <h3 data-ar="المحفظة">Portfolio</h3>
          <p class="price-tagline" data-ar="للملاك والمطورين العقاريين الذين يديرون عدة مشاريع في آنٍ واحد.">For owners and developers running several projects at once.</p>
          <ul>
            <li data-ar="جميع ما تشمله خطة المشروع الواحد">Everything in Single Project</li>
            <li data-ar="التحقق من العقود والمدفوعات">Contract &amp; payment verification</li>
            <li data-ar="الرصد والملاحظة">Monitoring &amp; observability</li>
            <li data-ar="التحكم بالوصول وإدارة الفريق">Access control &amp; team admin</li>
            <li data-ar="قواعد موحَّدة ومتسقة عبر جميع المشاريع">Consistent rules across every project</li>
          </ul>
          <button class="note-button request-access-btn" type="button">
            <span aria-hidden="true">↗</span>
            <span data-ar="طلب الوصول المبكر">Request early access</span>
          </button>
        </article>

        <article class="price-card">
          <h3 data-ar="المؤسسات والشركات الكبرى">Enterprise</h3>
          <p class="price-tagline" data-ar="للمطورين العقاريين واستشاريي إدارة المشاريع العاملين على نطاق واسع.">For developers and PMCs operating at scale.</p>
          <ul>
            <li data-ar="جميع ما تشمله خطة المحفظة">Everything in Portfolio</li>
            <li data-ar="واجهة برمجة المنصة وأحداث webhook">Platform API &amp; webhooks</li>
            <li data-ar="تكاملات مخصصة حسب الاحتياج">Custom integrations</li>
            <li data-ar="تأهيل مخصص ومدعوم">Dedicated onboarding</li>
            <li data-ar="اتفاقية مستوى الخدمة">Service-level agreement</li>
          </ul>
          <button class="note-button note-button--outline request-access-btn" type="button">
            <span aria-hidden="true">↗</span>
            <span data-ar="تواصل معنا">Talk to us</span>
          </button>
        </article>
      </div>
      <p class="pricing-note" data-ar="لا حاجة إلى بطاقة ائتمانية للتواصل معنا. تُحدَّد الأسعار النهائية مع فريق التأهيل الخاص بك.">No card required to talk to us. Final pricing is confirmed with your onboarding team.</p>
    </div>
  </section>

  <section class="landing-section credibility-section" id="credibility" aria-label="Where this comes from">
    <div class="section-inner credibility-inner">
      <div class="credibility-main">
        <p class="section-eyebrow" data-ar="الخلفية والمرجعية">Where this comes from</p>
        <h2 class="section-heading" data-ar="بُني ضمن برنامج مسار التابع لمؤسسة مسك، ومستند إلى أرقام وبيانات موثَّقة.">Built inside Misk Foundation's Masar program, and grounded in the numbers behind it.</h2>
        <div class="credibility-points">
          <div>
            <h3 data-ar="بدعم ورعاية مؤسسة مسك">Incubated by Misk Foundation</h3>
            <p data-ar="طوَّره فريق San3 (صنع) ضمن برنامج مسار التابع لمؤسسة مسك المخصص للمؤسسين السعوديين.">Built by San3 (صنع) inside Misk Foundation's Masar program for Saudi founders.</p>
          </div>
          <div>
            <h3 data-ar="مستند إلى أبحاث محكَّمة ومنشورة">Grounded in published research</h3>
            <p data-ar="كل إحصائية في هذه الصفحة مستندة إلى مصدر محكَّم ومنشور — لا إلى محتوى تسويقي.">Every stat on this site cites a peer-reviewed source — not marketing copy.</p>
          </div>
          <div>
            <h3 data-ar="في مرحلة الوصول المبكر، بقصد واضح">In early access, on purpose</h3>
            <p data-ar="نرحّب بعدد محدود من الملاك والمطورين مباشرةً قبل الإطلاق العام للمنصة.">We're onboarding a small number of owners and developers directly, before opening up general availability.</p>
          </div>
        </div>
      </div>
      <blockquote class="credibility-quote">
        <p data-ar="بدأنا ببناء الخط الزمني وسير الاعتماد أولاً، لأنهما ما آلت إليه كل النزاعات التي درسناها: من عَلِم بماذا، ومن وافق على ماذا.">"We built the timeline and the approval flow first, because those are the two things every dispute we studied came down to: who knew what, and who signed off on it."</p>
        <p class="credibility-cite" data-ar="— فريق Truepoint">— The Truepoint team</p>
      </blockquote>
    </div>
  </section>

  <section class="landing-section faq-section" id="faq" aria-label="FAQ">
    <div class="section-inner">
      <p class="section-eyebrow" data-ar="الأسئلة المتكررة">FAQ</p>
      <h2 class="section-heading" data-ar="أسئلة شائعة قبل تقديم طلب الوصول.">Common questions before you request access.</h2>
      <div class="faq-list">
        <details class="faq-item" open>
          <summary data-ar="هل يحتاج فريق الموقع إلى تعلّم تطبيق جديد؟">Does my site team need to learn a new app?</summary>
          <p data-ar="لا. يعتمد الالتقاط الميداني على مجموعات واتساب التي يستخدمها فريقك بالفعل — تقرأ Truepoint من قنوات لم يُغيِّرها فريقك، عوضاً عن مطالبته بتبنّي قناة جديدة.">No. Field capture rides on the WhatsApp groups your trades already use — Truepoint reads from channels your team hasn't changed, rather than asking them to adopt a new one.</p>
        </details>
        <details class="faq-item">
          <summary data-ar="أين تُخزَّن بيانات مشروعنا؟">Where is our project data stored?</summary>
          <p data-ar="تخضع إقامة البيانات والوصول إليها لأحكام نظام حماية البيانات الشخصية السعودي (PDPL). وهذا قرار معماري أصيل، لا مجرد ملاحظة في سياسة أُضيفت لاحقاً.">Data residency and access follow Saudi PDPL requirements. This is an architecture decision, not a policy footnote we bolted on later.</p>
        </details>
        <details class="faq-item">
          <summary data-ar="ما الذي يغيّره «الاعتماد» فعلياً في العمل اليومي؟">What does 'approval' actually change day to day?</summary>
          <p data-ar="يمر كل توقيع عبر الحواف الثلاث — الاستماع والفهم والموافقة — مع فحص استيعاب وفق أسلوب إعادة الشرح ومعتمِد واحد محدَّد بالاسم تقع عليه المسؤولية الكاملة، بحيث لا يُعامَل «الاطّلاع» على أنه «موافقة».">Every sign-off passes through the 3 Edges — Hearing, Understanding, Agreeing — with a teach-back comprehension check and a single named, accountable approver, so "seen" stops being treated as "agreed."</p>
        </details>
        <details class="faq-item">
          <summary data-ar="هل Truepoint متاحة باللغة العربية فقط؟">Is Truepoint only available in Arabic?</summary>
          <p data-ar="المنصة ثنائية اللغة وتضع العربية في المقدمة — يمكنك تبديل اللغة من شريط التنقل العلوي لاستعراض المنتج كاملاً بالإنجليزية أو العربية، بما في ذلك دعم الاتجاه من اليمين إلى اليسار.">It's bilingual and Arabic-first — flip the language switcher in the top nav to see the whole product in English or Arabic, right-to-left included.</p>
        </details>
        <details class="faq-item">
          <summary data-ar="كم تستغرق مرحلة التأهيل؟">How long does onboarding take?</summary>
          <p data-ar="نرحّب بعدد محدود من الملاك والمطورين مباشرةً قبل الإطلاق العام للمنصة، لذا تُحدَّد الجداول الزمنية بالتنسيق مع فريقك لا وفق موعد إطلاق ثابت.">We're onboarding a small number of owners and developers directly ahead of general availability, so timelines are set with your team rather than a fixed rollout date.</p>
        </details>
        <details class="faq-item">
          <summary data-ar="ما تكلفة الاشتراك؟">What does it cost?</summary>
          <p data-ar="يُحدَّد التسعير لكل مشروع على حدة خلال مرحلة الوصول المبكر. قدِّم طلبك أدناه وسنتواصل معك بخطة تناسب محفظتك.">Pricing is scoped per project during early access. Request access below and we'll follow up with a plan for your portfolio.</p>
        </details>
      </div>
    </div>
  </section>

  <section class="landing-section legal-section" id="legal" aria-label="Privacy and terms">
    <div class="section-inner">
      <p class="section-eyebrow" data-ar="الشؤون القانونية">Legal</p>
      <div class="legal-grid">
        <article class="legal-block" id="privacy">
          <h2 class="legal-heading" data-ar="سياسة الخصوصية">Privacy policy</h2>
          <p data-ar="نجمع خلال مرحلة الوصول المبكر البيانات التي تشاركها معنا فحسب — اسمك وبريدك الإلكتروني وتفاصيل مشروعك — ونستخدمها حصراً للتواصل معك بشأن Truepoint. لا نبيع بياناتك ولا نتيح الاطّلاع عليها لأي طرف ثالث.">During early access we collect only the data you share with us — your name, email, and project details — and use it solely to follow up with you about Truepoint. We never sell your data or share it with third parties.</p>
          <p data-ar="تخضع إقامة البيانات والوصول إليها لأحكام نظام حماية البيانات الشخصية السعودي (PDPL). يمكنك التواصل معنا في أي وقت لطلب حذف بياناتك.">Data residency and access follow Saudi PDPL requirements. Contact us at any time to have your data deleted.</p>
        </article>
        <article class="legal-block" id="terms">
          <h2 class="legal-heading" data-ar="شروط الخدمة">Terms of service</h2>
          <p data-ar="Truepoint في مرحلة الوصول المبكر: تُتاح المنصة للملاك والمطورين المسجَّلين بموجب اتفاقية تجريبية تُوقَّع خلال مرحلة التأهيل، تُحدَّد فيها نطاقات الاستخدام ومستويات الخدمة لكل مشروع.">Truepoint is in early access: the platform is made available to onboarded owners and developers under a pilot agreement signed during onboarding, which defines usage scope and service levels per project.</p>
          <p data-ar="لا يُعدّ محتوى هذا الموقع استشارةً قانونية أو تعاقدية بأي حال. تُؤكَّد الأسعار النهائية والشروط الكاملة كتابياً مع فريق التأهيل الخاص بك.">Nothing on this site constitutes legal or contractual advice. Final pricing and full terms are confirmed in writing with your onboarding team.</p>
        </article>
      </div>
    </div>
  </section>
</main>

<footer class="site-footer">
  <div class="section-inner footer-top">
    <div>
      <h2 data-ar="هل أنت مستعد لاستعراض Truepoint على مشروعك؟">Ready to see it on your project?</h2>
      <p data-ar="قدِّم طلب الوصول المبكر وسنتواصل معك مباشرةً — دون بطاقة ائتمانية أو أي التزام.">Request early access and we'll follow up directly — no card, no commitment.</p>
    </div>
    <button class="note-button request-access-btn" type="button">
      <span aria-hidden="true">↗</span>
      <span data-ar="طلب الوصول المبكر">Request early access</span>
    </button>
  </div>

  <div class="section-inner footer-columns">
    <div class="footer-brand">
      <a class="site-logo" href="#cinema">Truepoint</a>
      <p data-ar="سجل واحد موثَّق، من الموقع إلى التوقيع. من تطوير San3 (صنع)، ضمن برنامج مسار التابع لمؤسسة مسك.">One verified record, from site to signature. Built by San3 (صنع), incubated in Misk Foundation's Masar program.</p>
      <button class="language-switcher" aria-label="Change language" type="button">
        <span class="language-switcher-label">EN</span>
        <span aria-hidden="true">⌄</span>
      </button>
    </div>
    <div class="footer-col">
      <h3 data-ar="المنتج">Product</h3>
      <ul>
        <li><a href="#features" data-ar="المزايا والإمكانات">Features</a></li>
        <li><a href="#pricing" data-ar="التسعير">Pricing</a></li>
        <li><a href="#faq" data-ar="الأسئلة المتكررة">FAQ</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h3 data-ar="الشركة">Company</h3>
      <ul>
        <li><a href="#credibility" data-ar="San3 وبرنامج مسار">San3 &amp; the Masar program</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h3 data-ar="الشؤون القانونية">Legal</h3>
      <ul>
        <li><a href="#privacy" data-ar="سياسة الخصوصية">Privacy policy</a></li>
        <li><a href="#terms" data-ar="شروط الخدمة">Terms of service</a></li>
      </ul>
    </div>
  </div>

  <div class="section-inner footer-bottom">
    <p class="pdpl-badge" data-ar="إقامة بيانات متوافقة مع أحكام نظام حماية البيانات الشخصية السعودي (PDPL)">Saudi PDPL-aligned data residency</p>
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
