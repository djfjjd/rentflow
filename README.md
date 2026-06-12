# 렌트플로우

렌터카 사고대차 ERP MVP입니다. 하나의 Next.js App Router 프로젝트 안에서 모바일 PWA 앱과 관리자 웹사이트를 라우팅으로 분리합니다.

## 주요 스택

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui 스타일 유틸
- Supabase Auth/Database/Storage 연결 준비
- Google Drive 업로드 service layer mock
- iPhone 홈 화면 설치 가능한 PWA

## 실행

```bash
npm install
npm run dev
```

기본 주소:

- 모바일 PWA 앱: `http://localhost:3000/app`
- 스마트 접수함: `http://localhost:3000/app/inbox`
- 관리자 웹: `http://localhost:3000/admin/dashboard`

## 빌드 확인

```bash
npm run typecheck
npm run build
```

## 환경변수

`.env.example`을 `.env.local`로 복사한 뒤 실제 값을 넣어 사용합니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
CARD_API_PROVIDER=mock
CARD_API_BASE_URL=
CARD_API_CLIENT_ID=
CARD_API_SECRET=
```

실제 API 인증정보는 소스 코드에 하드코딩하지 않습니다.

## 주요 라우트

### 모바일 앱

- `/app`
- `/app/inbox`
- `/app/tasks`
- `/app/schedule`
- `/app/dispatch`
- `/app/return`

### 관리자

- `/admin/dashboard`
- `/admin/vehicles`
- `/admin/partners`
- `/admin/factories`
- `/admin/insurers`
- `/admin/dispatches`
- `/admin/returns`
- `/admin/reservations`
- `/admin/maintenance`
- `/admin/maintenance-history`
- `/admin/accident-history`
- `/admin/notifications`
- `/admin/revenue`
- `/admin/corporate-cards`
- `/admin/driver-assignments`
- `/admin/receivables`
- `/admin/payments`
- `/admin/billing`
- `/admin/documents`
- `/admin/staff`
- `/admin/search`
- `/admin/settings`

## PWA

앱 이름은 `렌트플로우`입니다.

- Manifest: `public/manifest.json`
- Service worker: `public/sw.js`
- Offline fallback: `public/offline.html`
- Icons: `public/icons/icon-192x192.png`, `public/icons/icon-512x512.png`
- Start URL: `/app`
- Display: `standalone`

iPhone Safari에서 `/app`을 열고 공유 버튼을 누른 뒤 “홈 화면에 추가”를 선택하면 앱처럼 실행됩니다.

## Supabase 스키마

초기 스키마 초안은 `lib/supabase-schema.sql`에 있습니다. 현재 화면은 mock/local state 기반이며, 추후 Supabase query/service layer로 교체할 수 있도록 타입과 service 파일을 분리했습니다.

## GitHub 업로드

권장 업로드 파일:

- `app/`
- `components/`
- `lib/`
- `services/`
- `public/`
- `.env.example`
- `.gitignore`
- `README.md`
- `next.config.ts`
- `package.json`
- `package-lock.json`
- `postcss.config.js`
- `tailwind.config.ts`
- `tsconfig.json`

업로드하지 않을 파일:

- `node_modules/`
- `.next/`
- `*.tsbuildinfo`
- `.env.local`
