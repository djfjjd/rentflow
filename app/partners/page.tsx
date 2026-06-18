import { RepairShopMapPage } from "@/components/repair-shops/RepairShopMapPage";

export default function Partners() {
  return (
    <RepairShopMapPage
      title="거래처주소"
      subtitle="repair_shops 데이터 기준으로 거래처 목록과 지도를 표시합니다."
      showImportLink={false}
    />
  );
}
