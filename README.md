# 오늘의 날씨 카드 생성기

Open-Meteo의 실시간 날씨 데이터로 인스타그램용 카드 이미지를 만들어 PNG로 저장하는 웹사이트입니다.
서버 없이 브라우저에서만 동작하므로 GitHub Pages에 그대로 올려서 쓸 수 있습니다.

## 기능

- **오늘의 날씨 카드** 1장 생성 (기온, 체감, 강수확률, 습도, 바람)
- **주간 날씨 카드** 1장 생성 (7일치 최저·최고 기온 막대)
- 카드 크기 선택: 1080×1080 / 1080×1350 / 1080×1920
- 날씨에 따라 카드 색이 자동으로 바뀜 (맑음·흐림·비·눈·뇌우·안개)
- PNG 다운로드

## 파일 구성

| 파일 | 하는 일 |
| --- | --- |
| `index.html` | 화면 구조 (버튼, 입력창, 카드 틀) |
| `style.css` | 사이트와 카드 디자인 — **디자인을 바꾸려면 여기만 고치면 됩니다** |
| `app.js` | 날씨 데이터 가져오기, 카드 채우기, 이미지 저장 |

## GitHub에 올려서 사이트로 만들기

1. GitHub에서 **New repository** → 이름은 예를 들어 `weather-card` → **Public** 선택 → Create
2. 저장소 화면에서 **Add file → Upload files** 클릭
3. `index.html`, `style.css`, `app.js`, `README.md` 를 모두 끌어다 놓고 **Commit changes**
4. 저장소의 **Settings → Pages** 이동
5. Source를 **Deploy from a branch**, Branch를 **main / (root)** 으로 두고 **Save**
6. 1~2분 뒤 `https://내아이디.github.io/weather-card/` 주소로 접속

## 자주 바꾸게 되는 부분

- **기본 지역**: `app.js` 위쪽의 `let place = { name: '서울', lat: 37.5665, lon: 126.9780 }`
- **카드 색 테마**: `style.css` 의 `.card[data-theme="clear"]` 부분들
- **글자 크기**: `style.css` 의 `.hero__temp`, `.card__place` 등 (숫자는 1080px 폭 기준)

## 데이터 출처

- 날씨·좌표 검색: [Open-Meteo](https://open-meteo.com/) — API 키 불필요, 비상업적 이용 무료, 데이터 라이선스 CC BY 4.0
- 카드 이미지 변환: [html2canvas](https://html2canvas.hertzen.com/)
- 한글 글꼴: [Pretendard](https://github.com/orioncactus/pretendard) (SIL OFL 1.1)

상업적으로 이용하거나 하루 1만 회 이상 호출한다면 Open-Meteo의 유료 구독을 검토해야 합니다.
