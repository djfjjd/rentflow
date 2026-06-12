import { EmptyReadyCard } from "@/components/erp/Shell";

export function AdminPlaceholder({ moduleName }: { moduleName: string }) {
  return (
    <EmptyReadyCard
      title={`${moduleName} 준비중`}
      description="라우팅과 권한 경계는 먼저 잡아두었고, 이후 Supabase API와 업무별 폼/테이블을 이 화면에 연결하면 됩니다."
    />
  );
}
