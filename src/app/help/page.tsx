const STEPS: { title: string; body: string }[] = [
  { title: "1. 설정에서 시작하기", body: "설정에서 요일별 가능 시간을 추가하고, 기본 조율 주기를 확인하세요. 같은 화면의 예약 링크를 고객에게 보내면 됩니다." },
  { title: "2. 고객과 악기 기록", body: "고객 탭에서 고객을 추가하고, 고객을 눌러 악기와 방문(시술) 기록을 입력하세요. 다음 조율일을 비워 두면 방문일 + 기본 주기로 자동 계산됩니다. 이름이나 연락처로 검색할 수 있어요." },
  { title: "3. 재방문 안내", body: "재방문 탭에는 다음 조율일이 4주 안으로 다가온 악기가 나옵니다. 메시지 초안을 복사하거나 '문자 앱으로 열기'를 눌러 직접 보내고, 보낸 뒤 '보냈어요'를 누르세요. 자동으로 발송되지는 않아요. 연락 동의가 없는 고객은 경고가 뜹니다." },
  { title: "4. 예약 받기", body: "고객은 예약 링크에서 로그인 없이 시간을 골라 요청합니다. 예약 탭에서 수락하면 그 고객이 고객 목록에 자동으로 추가되고(같은 연락처가 있으면 새로 만들지 않아요), 거절하면 시간이 다시 열립니다." },
  { title: "5. 오늘 일정", body: "오늘 탭에서 오늘 방문할 곳을 시간순으로 보고, 카카오맵·네이버지도로 길을 찾고, '고객 기록'으로 이전 이력을 확인하세요. 끝나면 '방문 완료'를 누릅니다." },
  { title: "6. 계정", body: "설정에서 비밀번호를 바꿀 수 있고, 맨 아래 '계정 삭제'를 하면 모든 데이터가 영구 삭제됩니다." },
];

export default function HelpPage() {
  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-1 text-xl font-bold">사용법</h1>
      <p className="mb-4 text-sm text-gray-500">조율 노트는 고객·악기 이력, 재방문 안내, 예약 받기를 한곳에서 하는 도구예요.</p>
      <ol className="flex flex-col gap-3">
        {STEPS.map((s) => (
          <li key={s.title} className="rounded border p-3">
            <h2 className="mb-1 font-semibold">{s.title}</h2>
            <p className="text-sm text-gray-700">{s.body}</p>
          </li>
        ))}
      </ol>
    </main>
  );
}
