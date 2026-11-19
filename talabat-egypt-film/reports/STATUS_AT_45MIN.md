# حالة المشروع عند الوقفة (المؤقّت: ٤٥ دقيقة — بدأ 18:31 UTC)
كُتب هذا الملف في الدقيقة ~٤١ (19:12 UTC تقريباً)، قبل الدقيقة ٤٥. آخر نسخة: DRAFT_v2.

## ✅ اللي اتعمل
**البيئة**
- Node 22 (في مجلد المستخدم لأن النظام عليه Node 20)، FFmpeg 5.1.9، Chrome Headless Shell، HyperFrames 0.9.67، GSAP، مكتبات بايثون (pillow/numpy/scipy/matplotlib/fonttools/brotli)، خط Cairo العربي.
- اتعمل اختبار تصيير HyperFrames صغير (شكل متحرك + نص عربي + صوت) وطلع MP4 سليم: h264 1080p30 + aac 48k.
- استنساخ الريبوهين (product-launch-motion + onetake) وتثبيت الـskills (v2 + legacy + HyperFrames). اختبار OneTake `test_motion.js` → ALL PASS.

**الأصول الحقيقية** (`assets/` + `documentation/ASSET_SOURCE_MAP.md`)
- أيقونة طلبات الأصلية (1024px)، ٨ لقطات App Store + ٨ لقطات Google Play (النسخة العربية)، قصّات الأكل (بيتزا، بول، بقالة)، قصّات واجهات التطبيق العربية، وشعار "talabat" الأصلي. اللون البرتقالي اتاخد بالعينة: **#FF5A00**.

**الصوت**: موسيقى + مؤثرات أصلية مولّدة بالكود (`audio/build_audio.py`) ٦٠ ثانية، ١٢٠ BPM، ومواقيت الأحداث مشتركة مع الفيلم (`cues.js`).

**الفيلم**: مشروع HyperFrames كامل (`compositions/talabat-orange-frequency/`) من ٨ مشاهد، مصدّر عبر HyperFrames فعلاً: 1920×1080، 30fps، 60.000 ث، h264 + aac 48kHz، وفك الترميز كله بدون أخطاء، ومفيش إطارات سودا/متجمدة غير المقدمة المقصودة.
- المخرج: `deliverables/TALABAT_EGYPT_MASTER_60S_DRAFT_v2.mp4` (اتسمّى DRAFT عمداً).
- Storyboard PDF: `storyboard/TALABAT_STORYBOARD.pdf` (٦ صفحات من لقطات الفيلم نفسه).
- التقارير: `ENVIRONMENT_INSTALLATION.md`, `REPOSITORY_INTEGRATION.md`, `FINAL_QA_REPORT.md`, وخريطة الأصول.
- صفحة React في المشروع الرئيسي بتعرض الفيديو والحالة.

## ⏳ اللي لسه ماتعملش
1. **تصيير 60fps** (اتصدّر 30fps بس؛ كل 15 ثانية بتاخد ~٢–٤ دقايق، يعني ماستر 60fps محتاج ~٢٥–٣٠ دقيقة).
2. **النسخة الرأسية 9:16** (إعادة تأليف مش قص) — ماتعملتش.
3. **تحسينات مرئية معروفة**: (تم إصلاح تداخل عنوان "طلبات مارت" في v2) مسافة كلمة "وصلت." من الطبق، مدينة المشهد ٦ مزدحمة وصور المساجد تظهر كبقع داكنة، الصندوق في المشهد ٧ تأثير ثنائي الأبعاد، مفيش motion blur حقيقي.
4. **مراجعة سمعية/مشاهدة كاملة بمشغّل**: ماقدرتش أسمع الصوت أو أشغّل الفيديو؛ اتفحص بصرياً عبر لقطات وcontact sheet كل ٢٫٥ ث. التزامن الصوتي مضمون بالتصميم فقط.
5. **الصوت**: الذروة الحقيقية +0.4 dBTP (محتاجة limiter عند −1 dBTP). مفيش تعليق صوتي مصري (مفيش TTS طبيعي متاح).
6. **من الريبوهات ماتدرسش**: gallery sheets و cases (knockon/clearing/ebb/domino/infra) ماتفتحتش بصرياً، و`probe.py`/`analyze_ref.py` ماتشغّلتش، وسكربتات legacy ماتنفذتش، و`ui_kit.js` محمّل بس مش مستخدم. (التفاصيل في REPOSITORY_INTEGRATION.md).
7. ترقية الملف من DRAFT إلى MASTER بعد إصلاح النقاط فوق وإعادة التصيير والفحص.

## أوامر الاستكمال
```bash
source ~/.node22env; cd talabat-egypt-film/compositions/talabat-orange-frequency
# كل مقطع لازم في أمر واحد في المقدمة (<10 دقايق) لأن التصيير في الخلفية بيتقتل:
npx hyperframes render -f 60 -q standard --start 0 --end 10 -o ../../renders/seg/m_0_10.mp4
# ...كرّر لكل ١٠ ثواني، ثم concat + mux للصوت كما في FINAL_QA_REPORT.md
```
