# 오늘의 날씨 카드 생성기

Open-Meteo의 실시간 날씨 데이터로 인스타그램용 카드 이미지를 만들어 저장하는 웹사이트입니다.
서버 없이 브라우저에서만 동작하므로 GitHub Pages에 그대로 올려서 쓸 수 있습니다.

## 기능

- **오늘의 날씨 카드** 1장 생성 (기온, 체감, 강수확률, 습도, 바람)
- **주간 날씨 카드** 1장 생성 (7일치 최저·최고 기온 막대)
- 카드 크기 선택: 1080×1920 (쇼츠) / 1080×1080 (정사각)
- 날씨에 따라 카드 색이 자동으로 바뀜 (맑음·흐림·비·눈·뇌우·안개)
- **날씨에 따라 배경 효과가 움직임** — 비 오면 물방울이 맺히고, 눈 오면 눈이
  내리고, 바람이 세면 낙엽이 날리고, 맑으면 해가 빛납니다
- JPG / PNG 다운로드

## 파일 구성

| 파일 | 하는 일 |
| --- | --- |
| `index.html` | 화면 구조 (버튼, 입력창, 카드 틀) |
| `style.css` | 사이트와 카드 색·글자 — **색과 글자를 바꾸려면 여기** |
| `effects.js` | 날씨별 배경 효과 — **물방울·눈·낙엽을 바꾸려면 여기** |
| `app.js` | 날씨 데이터 가져오기, 카드 채우기, 이미지 저장 |
| `test.html` | 어떤 날씨에 어떤 효과가 나오는지 검사 (브라우저로 열면 됩니다) |

## GitHub에 올려서 사이트로 만들기

1. GitHub에서 **New repository** → 이름은 예를 들어 `weather-card` → **Public** 선택 → Create
2. 저장소 화면에서 **Add file → Upload files** 클릭
3. `index.html`, `style.css`, `effects.js`, `app.js`, `README.md` 를 모두 끌어다 놓고 **Commit changes**
4. 저장소의 **Settings → Pages** 이동
5. Source를 **Deploy from a branch**, Branch를 **main / (root)** 으로 두고 **Save**
6. 1~2분 뒤 `https://내아이디.github.io/weather-card/` 주소로 접속

## 날씨별 배경 효과

카드 안에 투명한 캔버스를 두 장 깔고 그립니다. 뒤쪽은 글자 아래(햇무리, 흐릿한
구름), 앞쪽은 글자 위(유리에 맺힌 물방울, 날리는 낙엽)입니다.

어떤 효과가 나올지는 이렇게 정해집니다.

1. 비·눈·뇌우·안개면 그 날씨 효과 (바람은 무시)
2. 그 외에 풍속이 6m/s 이상이면 낙엽
3. 나머지는 맑으면 햇살, 흐리면 구름

**효과를 미리 보려면** 주소 끝에 `#fx=` 를 붙이세요.
예를 들어 `.../index.html#fx=snow` 하면 날씨와 상관없이 눈이 내립니다.
쓸 수 있는 이름: `clear` `cloud` `rain` `snow` `storm` `fog` `wind`

## 효과가 안 움직일 때

1. **Ctrl+Shift+R** 로 새로고침해 보세요. 브라우저가 예전 `app.js` 를 갖고
   있으면 효과가 아예 안 생깁니다.
2. 그래도 안 움직이면 **윈도우 설정 → 접근성 → 시각 효과 → 애니메이션 효과**
   가 꺼져 있는지 보세요. 꺼져 있으면 카드도 일부러 멈춰 있습니다.
   (이 경우 사이트가 화면에 안내문을 띄워 줍니다. 저장되는 이미지는 정상입니다.)

## 자주 바꾸게 되는 부분

- **기본 지역**: `app.js` 위쪽의 `let place = { name: '서울', lat: 37.5665, lon: 126.9780 }`
- **카드 색 테마**: `style.css` 의 `.card[data-theme="clear"]` 부분들
- **글자 크기**: `style.css` 의 `.hero__temp`, `.card__place` 등 (숫자는 1080px 폭 기준)
- **낙엽이 날리기 시작하는 풍속**: `effects.js` 의 `WIND_MS = 6`
- **효과의 세기·개수**: `effects.js` 의 각 장면 `seed()` 안 숫자들

## 데이터 출처

- 날씨·좌표 검색: [Open-Meteo](https://open-meteo.com/) — API 키 불필요, 비상업적 이용 무료, 데이터 라이선스 CC BY 4.0
- 카드 이미지 변환: [html2canvas](https://html2canvas.hertzen.com/)
- 한글 글꼴: [Pretendard](https://github.com/orioncactus/pretendard) (SIL OFL 1.1)

상업적으로 이용하거나 하루 1만 회 이상 호출한다면 Open-Meteo의 유료 구독을 검토해야 합니다.
