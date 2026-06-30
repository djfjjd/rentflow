import { Home } from "lucide-react";

export default function DevicePendingPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f7f4] px-4 py-8 text-[#16211d]">
      <section className="w-full max-w-[460px] rounded-lg border border-[#d8ded8] bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#116149] text-white"><Home size={22} /></span>
          <div>
            <h1 className="text-xl font-black">RentFlow</h1>
            <p className="text-sm font-bold text-[#68746d]">기기 승인 대기</p>
          </div>
        </div>
        <p className="rounded-lg bg-[#eef4ed] px-3 py-3 text-sm font-black text-[#116149]">
          이메일 인증이 완료되었습니다. 관리자의 승인을 기다려주세요.
        </p>
        <a className="small-btn mt-4 w-full" href="/auth">로그인 화면으로</a>
      </section>
    </main>
  );
}
