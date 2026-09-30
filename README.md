<div align="center">

# 🖥️ Khaleeji Bot V2 — Frontend

**لوحة تحكم احترافية لنظام الحجز الآلي**
مبنية بـ React 19 · Vite 8 · TailwindCSS 4 · TanStack Query

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![React Query](https://img.shields.io/badge/TanStack_Query-v5-FF4154?style=flat-square&logo=reactquery&logoColor=white)](https://tanstack.com/query)
[![React Router](https://img.shields.io/badge/React_Router-v7-CA4245?style=flat-square&logo=react-router&logoColor=white)](https://reactrouter.com)
[![Cloudflare](https://img.shields.io/badge/Deployed_on-Cloudflare_Pages-F38020?style=flat-square&logo=cloudflare&logoColor=white)](https://pages.cloudflare.com)
[![Sentry](https://img.shields.io/badge/Errors-Sentry-362D59?style=flat-square&logo=sentry&logoColor=white)](https://sentry.io)

**🌐 Production:** [`https://khaleeji-bot-v2-frontend.tech-rm-re.workers.dev`](https://khaleeji-bot-v2-frontend.tech-rm-re.workers.dev)

</div>

---

## 📋 ما هي هذه الواجهة؟

**Khaleeji Bot V2 Frontend** هي لوحة تحكم متكاملة تتيح للأدمن والمستخدمين متابعة وإدارة طلبات حجز مواعيد Prometric في الوقت الفعلي. تعرض حالة كل طلب لحظة بلحظة عبر polling ذكي، وتتيح التدخل اليدوي في كل خطوة من خطوات سير العمل الآلي.

---

## ✨ المميزات الرئيسية

### 📊 لوحة التحكم
- **Dashboard تفاعلي** — عرض جميع الطلبات مع حالتها الفورية
- **Auto-Refresh** — تحديث تلقائي بـ polling ذكي عبر TanStack Query
- **تصفية وبحث** — فلترة الطلبات حسب الحالة والمستخدم

### 🃏 بطاقة الطلب (Application Card)
لكل طلب بطاقة تفاعلية تعرض:
- حالة الحجز الحالية مع الـ state badge الملوّن
- بيانات المستخدم والاختبار والمركز المفضل
- إجراءات متاحة حسب الحالة (اكتشاف المواعيد، اختيار المقعد، تأكيد الحجز، إلغاء...)
- تاريخ كامل للتغييرات والأخطاء

### 🔄 إدارة سير العمل
- **اكتشاف المواعيد** — إطلاق بحث آلي عن المواعيد المتاحة
- **اختيار المقعد** — عرض وتأكيد المقعد المكتشف
- **إنشاء جلسة الدفع** — بدء رابط الدفع على Prometric
- **تسوية الدفع** — التحقق اليدوي من حالة الدفع
- **الإقرار بعدم الدفع** — إعادة الطلب للحالة الأولية بشكل آمن
- **تأكيد الحجز** — إدخال بيانات التأكيد من Prometric

### 🔐 الأمان
- **JWT Auth** — كل طلب API محمي بـ access token
- **Role-based UI** — الأدمن يرى إجراءات إضافية غير متاحة للمستخدم العادي
- **Error Boundaries** — Sentry يلتقط كل خطأ غير متوقع

---

## 🏗️ هيكل المشروع

```
khaleeji-bot-V2-frontend/
├── src/
│   ├── api/
│   │   └── applications.js     # جميع نداءات API (Axios)
│   ├── components/
│   │   ├── ApplicationCard/
│   │   │   ├── ApplicationActions.jsx   # أزرار الإجراءات حسب الحالة
│   │   │   └── ApplicationForms.jsx     # نماذج التأكيد والإدخال
│   │   └── Applicationcard.jsx          # البطاقة الرئيسية
│   ├── hooks/
│   │   └── useApplicationCard.js        # منطق البطاقة + React Query
│   ├── lib/
│   │   ├── checkoutReadiness.js         # فحص جاهزية الـ Checkout
│   │   └── workflowActions.js           # إجراءات سير العمل
│   ├── pages/
│   │   └── Dashboard.jsx                # الصفحة الرئيسية
│   └── main.jsx                         # نقطة الدخول
└── public/
```

---

## 🚀 تشغيل محلي

### المتطلبات
- Node.js 18+
- Backend يعمل محلياً أو على Render

### الخطوات

```bash
# 1. استنساخ المشروع
git clone https://github.com/redasalem/pro-bot-v2-frontend.git
cd pro-bot-v2-frontend

# 2. تثبيت الحزم
npm install

# 3. إعداد متغيرات البيئة
echo "VITE_API_BASE_URL=http://localhost:4000/api/v1" > .env

# 4. تشغيل بيئة التطوير
npm run dev
```

تفتح الواجهة على `http://localhost:5173`

### متغيرات البيئة

```env
# للتطوير المحلي
VITE_API_BASE_URL=http://localhost:4000/api/v1

# للإنتاج
VITE_API_BASE_URL=https://khaleeji-bot-v2-backend.onrender.com/api/v1
```

---

## ⚙️ السكريبتات المتاحة

| الأمر | الوظيفة |
|---|---|
| `npm run dev` | تشغيل سيرفر التطوير (Vite HMR) |
| `npm run build` | بناء للإنتاج |
| `npm run preview` | معاينة البناء الإنتاجي |
| `npm run lint` | فحص الكود بـ ESLint |

---

## 🛠️ Stack التقني

| الطبقة | التقنية | الإصدار |
|---|---|---|
| **Framework** | React | 19 |
| **Build Tool** | Vite | 8 |
| **Styling** | TailwindCSS | 4 |
| **Data Fetching** | TanStack React Query | 5 |
| **HTTP Client** | Axios | 1.x |
| **Routing** | React Router DOM | 7 |
| **Icons** | Lucide React | 1.x |
| **Notifications** | Sonner | 2.x |
| **Error Tracking** | Sentry React | 11 |

---

## ☁️ النشر على Cloudflare Pages

الواجهة تُنشر تلقائياً على **Cloudflare Pages** عند كل push لـ `main`.

### الإعداد في Cloudflare Dashboard
```
Build command:    npm run build
Output directory: dist
Node version:     18

Environment Variables:
  VITE_API_BASE_URL = https://khaleeji-bot-v2-backend.onrender.com/api/v1
```

---

## 🔗 المستودعات

| | Repo |
|---|---|
| **Frontend (redasalem)** | [github.com/redasalem/pro-bot-v2-frontend](https://github.com/redasalem/pro-bot-v2-frontend) |
| **Frontend (techrtaj)** | [github.com/techrtaj/khaleeji-bot-V2-frontend](https://github.com/techrtaj/khaleeji-bot-V2-frontend) |
| **Backend** | [github.com/redasalem/PRO-BOT-backend](https://github.com/redasalem/PRO-BOT-backend) |

---

<div align="center">

Made with ❤️ by **Ahmed & Reda Salem**

</div>
