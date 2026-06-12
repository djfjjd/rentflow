# GitHub 업로드 가이드

## 1. 새 저장소 생성

GitHub에서 새 repository를 생성합니다.

예시 저장소 이름:

```text
rentflow-erp
```

## 2. 로컬에서 Git 초기화

```bash
git init
git add .
git commit -m "Initial Rentflow ERP MVP"
git branch -M main
git remote add origin https://github.com/YOUR_ID/rentflow-erp.git
git push -u origin main
```

## 3. GitHub에서 실행

저장소를 clone한 뒤:

```bash
npm install
npm run dev
```

## 4. 배포

Vercel 배포 시 환경변수는 `.env.example`을 참고해 프로젝트 Settings에 등록합니다.

## 5. 주의

다음 파일/폴더는 GitHub에 올리지 않습니다.

- `node_modules`
- `.next`
- `.env.local`
- `*.tsbuildinfo`
