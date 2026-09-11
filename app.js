/* =========================================================
   오늘의 날씨 카드 생성기
   - 날씨 데이터: Open-Meteo (API 키 필요 없음)
   - 카드 이미지: html2canvas 로 화면의 카드를 PNG로 저장
   ========================================================= */

/* ---------------------------------------------------------
   0. 화면 요소들을 미리 찾아둡니다 (id로 가져오기)
   --------------------------------------------------------- */
const $ = (id) => document.getElementById(id);

const cityInput   = $('cityInput');
const searchBtn   = $('searchBtn');
const cityResults = $('cityResults');
const placeNow    = $('placeNow');
const signInput   = $('signInput');
const todayBtn    = $('todayBtn');
const weekBtn     = $('weekBtn');
const downloadBtn = $('downloadBtn');
const statusEl    = $('status');
const fmtChips    = $('fmtChips');
const stageBox    = $('stageBox');
const card        = $('card');
const viewToday   = $('viewToday');
const viewWeek    = $('viewWeek');

/* ---------------------------------------------------------
   1. 상태값 (지금 어떤 지역/크기/카드를 보고 있는지 기억)
   --------------------------------------------------------- */
let place = { name: '서울', lat: 37.5665, lon: 126.9780 }; // 기본값: 서울
let cardW = 1080;
let cardH = 1920;       // 기본은 쇼츠 크기
let currentType = null; // 'today' 또는 'week'
let saveFmt     = 'jpg'; // 'jpg' 또는 'png'

/* ---------------------------------------------------------
   2. 날씨 코드 사전
   Open-Meteo는 날씨를 WMO 표준 숫자코드로 알려줍니다.
   숫자만으로는 알 수 없으니 한글 이름 + 아이콘 + 색테마로 바꿔줍니다.
   --------------------------------------------------------- */
const WEATHER = {
  0:  ['맑음',         'sun',    'clear'],
  1:  ['대체로 맑음',   'partly', 'clear'],
  2:  ['구름 조금',     'partly', 'cloud'],
  3:  ['흐림',         'cloud',  'cloud'],
  45: ['안개',         'fog',    'fog'],
  48: ['짙은 안개',     'fog',    'fog'],
  51: ['약한 이슬비',   'rain',   'rain'],
  53: ['이슬비',       'rain',   'rain'],
  55: ['강한 이슬비',   'rain',   'rain'],
  56: ['얼어붙는 이슬비','rain',   'rain'],
  57: ['얼어붙는 이슬비','rain',   'rain'],
  61: ['약한 비',       'rain',   'rain'],
  63: ['비',           'rain',   'rain'],
  65: ['강한 비',       'rain',   'rain'],
  66: ['어는 비',       'rain',   'rain'],
  67: ['어는 비',       'rain',   'rain'],
  71: ['약한 눈',       'snow',   'snow'],
  73: ['눈',           'snow',   'snow'],
  75: ['많은 눈',       'snow',   'snow'],
  77: ['싸락눈',       'snow',   'snow'],
  80: ['소나기',       'rain',   'rain'],
  81: ['소나기',       'rain',   'rain'],
  82: ['강한 소나기',   'rain',   'rain'],
  85: ['소낙눈',       'snow',   'snow'],
  86: ['강한 소낙눈',   'snow',   'snow'],
  95: ['천둥번개',     'storm',  'storm'],
  96: ['우박 동반 뇌우','storm',  'storm'],
  99: ['우박 동반 뇌우','storm',  'storm'],
};

// 사전에 없는 코드가 오면 '흐림'으로 처리
function readCode(code){
  return WEATHER[code] || ['흐림', 'cloud', 'cloud'];
}

/* ---------------------------------------------------------
   3. 날씨 아이콘 (SVG를 글자로 만들어 넣습니다)
   --------------------------------------------------------- */
function icon(name, size){
  const s = `width="${size}" height="${size}" viewBox="0 0 64 64" fill="none"
             stroke="#FFFFFF" stroke-width="2.6"
             stroke-linecap="round" stroke-linejoin="round"`;

  const cloudPath = `<path d="M18 46h26a10 10 0 0 0 0-20 14 14 0 0 0-26.6 4A9 9 0 0 0 18 46Z"/>`;

  const shapes = {
    sun: `<circle cx="32" cy="32" r="12"/>
          <path d="M32 8v6M32 50v6M8 32h6M50 32h6M15 15l4.2 4.2M44.8 44.8 49 49M49 15l-4.2 4.2M19.2 44.8 15 49"/>`,

    partly: `<circle cx="24" cy="24" r="9"/>
             <path d="M24 7v4M7 24h4M12 12l3 3M36 12l-3 3"/>
             ${cloudPath}`,

    cloud: cloudPath,

    fog: `${cloudPath}<path d="M14 54h24M22 60h22" opacity="0.8"/>`,

    rain: `${cloudPath}<path d="M22 52l-3 7M33 52l-3 7M44 52l-3 7"/>`,

    snow: `${cloudPath}<path d="M22 55h.01M33 57h.01M44 55h.01" stroke-width="6"/>`,

    storm: `${cloudPath}<path d="M34 50l-9 8h8l-3 7"/>`,
  };

  return `<svg ${s}>${shapes[name] || cloudPath}</svg>`;
}

/* ---------------------------------------------------------
   4. 작은 도우미 함수들
   --------------------------------------------------------- */
const round = (n) => Math.round(n);
const DOW = ['일','월','화','수','목','금','토'];

// '2026-09-08' → Date 객체 (시간대 문제를 피하려고 자정으로 고정)
const toDate = (iso) => new Date(iso + 'T00:00:00');

// '2026-09-08' → "9월 8일 (화)"
function formatDate(iso){
  const d = toDate(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DOW[d.getDay()]})`;
}

// '2026-09-08' → "9.8"
function shortDate(iso){
  const d = toDate(iso);
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

// '2026-09-08' → "화"
function dowName(iso){
  return DOW[toDate(iso).getDay()];
}

function setStatus(text){ statusEl.textContent = text; }

/* ---------------------------------------------------------
   5. 오늘 카드에 넣을 한 줄 문구
   비가 올 확률이 높으면 우산 이야기를, 아니면 체감온도에 맞는
   옷차림을 알려줍니다.
   --------------------------------------------------------- */
function adviceLine(feels, pop){
  if (pop >= 60) return '우산 꼭 챙기세용';

  if (feels >= 28) return '반팔에 시원하게 입으세용';
  if (feels >= 23) return '반팔·얇은 셔츠 딱 좋아용';
  if (feels >= 20) return '얇은 가디건 하나 챙기세용';
  if (feels >= 17) return '얇은 긴 외투 챙기세용';
  if (feels >= 12) return '자켓이나 니트 걸치세용';
  if (feels >=  9) return '코트 꺼낼 때가 됐어용';
  if (feels >=  5) return '두꺼운 코트에 목도리까지용';
  return '패딩에 장갑까지 꽁꽁 싸매세용';
}

/* ---------------------------------------------------------
   5-1. 카드에 어떤 날씨 효과를 띄울지 정하기
   규칙 자체는 effects.js 의 pickScene 이 갖고 있습니다.
   주소 끝에 #fx=snow 처럼 붙이면 그 효과를 강제로 볼 수 있습니다.
   (효과를 미리 보거나 확인할 때 씁니다)
   --------------------------------------------------------- */
function fxOverride(){
  const m = location.hash.match(/fx=([a-z]+)/i);
  const name = m && m[1].toLowerCase();
  return (name && Effects.names.includes(name)) ? name : null;
}

function applyScene(theme, windSpeed){
  const scene = fxOverride() || Effects.pickScene(theme, windSpeed);
  card.dataset.fx = scene;      // 배경색(data-theme)과 따로 관리합니다
  Effects.setScene(scene);
}

/* ---------------------------------------------------------
   6. 미리보기 크기 맞추기
   카드는 실제 1080px 크기로 그리되, 화면에서는 가로·세로가
   모두 들어오도록 줄여서 카드 전체가 한눈에 보이게 합니다.
   --------------------------------------------------------- */
let fitRetries = 0;

function fitPreview(){
  // 정사각인지 쇼츠인지 알려주면 CSS가 알맞은 글자 크기를 씁니다
  card.dataset.size = (cardW === cardH) ? 'square' : 'shorts';

  const area = stageBox.parentElement; // 오른쪽 미리보기 영역

  // 높이를 잠깐 0으로 두어야 이전 카드 높이에 영향받지 않고
  // 이 자리가 문서 위에서 몇 px 아래인지 정확히 잴 수 있습니다
  stageBox.style.height = '0px';
  const topOffset = stageBox.getBoundingClientRect().top + window.scrollY;

  const availW = area.clientWidth;
  // 아래쪽 여백까지 감안해서 빼야 스크롤바가 생기지 않습니다
  const availH = Math.max(window.innerHeight - topOffset - 44, 240);

  card.style.width     = cardW + 'px';
  card.style.height    = cardH + 'px';
  Effects.setSize(cardW, cardH);   // 캔버스도 같은 크기로

  // 가로·세로 중 더 빡빡한 쪽에 맞춥니다
  const scale = Math.min(availW / cardW, availH / cardH);

  // 스타일이 아직 안 붙었거나 미리보기 자리가 잡히기 전이면 폭이 0으로 나옵니다.
  // 그대로 두면 카드가 0배로 줄어 화면에서 사라지고, 저장도 실패합니다.
  // 다음 프레임에 다시 재 보되, 계속 0이면 몇 번만 시도하고 멈춥니다.
  if (!(scale > 0)){
    if (fitRetries < 10){ fitRetries += 1; requestAnimationFrame(fitPreview); }
    return;
  }
  fitRetries = 0;

  card.style.transform = `scale(${scale})`;

  stageBox.style.width  = (cardW * scale) + 'px';
  stageBox.style.height = (cardH * scale) + 'px';
}
window.addEventListener('resize', fitPreview);

/* ---------------------------------------------------------
   7. 도시 검색 (Open-Meteo Geocoding API)
   --------------------------------------------------------- */
async function searchCity(){
  const keyword = cityInput.value.trim();
  if (!keyword) return;

  setStatus('지역을 찾는 중입니다...');
  cityResults.hidden = true;

  try{
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(keyword)}&count=6&language=ko&format=json`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.results || data.results.length === 0){
      setStatus('검색 결과가 없습니다. 다른 이름으로 찾아보세요. (예: 서울, Hwaseong)');
      return;
    }

    // 결과 목록을 화면에 그립니다
    cityResults.innerHTML = '';
    data.results.forEach((r) => {
      const li = document.createElement('li');
      const detail = [r.admin1, r.country].filter(Boolean).join(', ');
      li.innerHTML = `${r.name} <span>${detail}</span>`;
      li.addEventListener('click', () => {
        place = { name: r.name, lat: r.latitude, lon: r.longitude };
        placeNow.textContent = `선택된 지역: ${r.name}`;
        cityResults.hidden = true;
        setStatus('지역을 선택했습니다. 카드 만들기 버튼을 눌러 주세요.');
      });
      cityResults.appendChild(li);
    });
    cityResults.hidden = false;
    setStatus('아래 목록에서 지역을 선택해 주세요.');

  }catch(err){
    console.error(err);
    setStatus('지역 검색에 실패했습니다. 인터넷 연결을 확인해 주세요.');
  }
}

/* ---------------------------------------------------------
   8. 날씨 데이터 가져오기 (Open-Meteo Forecast API)
   이번 주 월요일부터 일요일까지 7일을 받아옵니다.
   이미 지나간 요일은 past_days 로 실제 관측값을 받습니다.
   --------------------------------------------------------- */
function weekRange(){
  const dow = (new Date().getDay() + 6) % 7; // 월=0, 화=1 … 일=6
  return { past: dow, forecast: 7 - dow };   // 합쳐서 항상 7일
}

async function fetchWeather(){
  const { past, forecast } = weekRange();

  const url = 'https://api.open-meteo.com/v1/forecast'
    + `?latitude=${place.lat}&longitude=${place.lon}`
    + '&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m'
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max'
    + '&wind_speed_unit=ms'   // 바람은 한국식 m/s 로 받기
    + '&timezone=auto'
    + `&past_days=${past}&forecast_days=${forecast}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('날씨 API 응답 오류');
  const data = await res.json();

  // 받아온 7일 중 '오늘'이 몇 번째인지 알려줍니다 (지나간 날 개수와 같음)
  return { data, todayIndex: past };
}

/* ---------------------------------------------------------
   9. 오늘의 날씨 카드 그리기
   --------------------------------------------------------- */
function renderToday(data, ti){
  const now = data.current;
  const day = data.daily;
  const [label, iconName, theme] = readCode(now.weather_code);

  card.dataset.theme = theme;
  applyScene(theme, now.wind_speed_10m);

  $('tPlace').textContent = place.name;
  $('tDate').textContent  = formatDate(day.time[ti]);
  $('tIcon').innerHTML    = icon(iconName, 220);
  $('tTemp').textContent  = round(now.temperature_2m);

  $('tMin').textContent   = `${round(day.temperature_2m_min[ti])}°`;
  $('tMax').textContent   = `${round(day.temperature_2m_max[ti])}°`;

  const pop = day.precipitation_probability_max[ti] ?? 0;
  $('tMsg').textContent   = `${label} · ${adviceLine(now.apparent_temperature, pop)}`;

  $('tFeels').textContent = `${round(now.apparent_temperature)}°`;
  $('tPop').textContent   = `${pop}%`;
  $('tHum').textContent   = `${round(now.relative_humidity_2m)}%`;
  $('tWind').textContent  = `${round(now.wind_speed_10m)}m/s`;

  $('tSign').textContent  = signInput.value;

  viewToday.hidden = false;
  viewWeek.hidden  = true;
  currentType = 'today';
}

/* ---------------------------------------------------------
   10. 주간 날씨 카드 그리기 (월~일 7줄)
   --------------------------------------------------------- */
function renderWeek(data, ti){
  const day = data.daily;

  // 카드 전체 색과 효과는 지금 날씨 기준
  const theme = readCode(data.current.weather_code)[2];
  card.dataset.theme = theme;
  applyScene(theme, data.current.wind_speed_10m);

  $('wPlace').textContent = place.name;
  $('wDate').textContent  = `${formatDate(day.time[ti])} 기준`;
  $('wSign').textContent  = signInput.value;

  const list = $('weekList');
  list.innerHTML = '';

  day.time.forEach((iso, i) => {
    const [, iconName] = readCode(day.weather_code[i]);

    const li = document.createElement('li');
    li.className = 'day'
      + (i === ti ? ' is-today' : '')
      + (i <   ti ? ' is-past'  : '');

    li.innerHTML = `
      <span class="day__dow">${dowName(iso)}</span>
      <span class="day__date">${shortDate(iso)}</span>
      <span class="day__icon">${icon(iconName, 68)}</span>
      <span class="day__temp"><i>${round(day.temperature_2m_min[i])}°</i><span class="day__slash">/</span><b>${round(day.temperature_2m_max[i])}°</b></span>
    `;
    list.appendChild(li);
  });

  viewToday.hidden = true;
  viewWeek.hidden  = false;
  currentType = 'week';
}

/* ---------------------------------------------------------
   11. 버튼을 눌렀을 때 실행되는 함수
   --------------------------------------------------------- */
async function makeCard(type){
  setStatus('날씨를 가져오는 중입니다...');
  todayBtn.disabled = weekBtn.disabled = true;

  try{
    const { data, todayIndex } = await fetchWeather();
    if (type === 'today') renderToday(data, todayIndex);
    else                  renderWeek(data, todayIndex);

    fitPreview();
    downloadBtn.disabled = false;
    setStatus(`카드가 완성되었습니다. ${saveFmt.toUpperCase()}로 저장하기를 눌러 주세요.`);

  }catch(err){
    console.error(err);
    setStatus('날씨를 가져오지 못했습니다. 잠시 뒤 다시 시도해 주세요.');
  }finally{
    todayBtn.disabled = weekBtn.disabled = false;
  }
}

/* ---------------------------------------------------------
   12. 이미지로 저장하기 (JPG 또는 PNG)
   화면에서는 카드가 축소되어 있으므로,
   이미지로 만들 때만 원래 크기(1080px)로 되돌려서 캡처합니다.
   날씨 효과 캔버스는 보이는 그대로 같이 찍힙니다.
   --------------------------------------------------------- */
async function downloadImage(){
  if (!currentType) return;

  // 카드가 화면에서 크기를 갖고 있어야 이미지로 만들 수 있습니다.
  // 크기가 0이면 html2canvas 가 알 수 없는 오류를 내며 죽습니다.
  if (!card.getBoundingClientRect().width){
    setStatus('카드가 아직 화면에 자리를 잡지 못했습니다. 창 크기를 한 번 바꾸거나 새로고침해 주세요.');
    return;
  }

  setStatus('이미지를 만드는 중입니다...');

  // 글꼴이 다 불러와진 다음에 캡처해야 글자가 깨지지 않습니다
  if (document.fonts && document.fonts.ready) await document.fonts.ready;

  // 움직임을 멈춰서 흔들리지 않은 한 장을 찍습니다.
  // 번개가 번쩍이는 순간에 눌러도 카드가 허옇게 나오지 않습니다.
  Effects.beforeCapture();

  try{
    const isJpg = (saveFmt === 'jpg');

    const canvas = await html2canvas(card, {
      width: cardW,
      height: cardH,
      scale: 1,
      // JPG는 투명을 지원하지 않으므로 바탕을 확실히 채워 둡니다
      backgroundColor: isJpg ? '#12161F' : null,
      useCORS: true,
      onclone: (doc) => {
        // 복제본에서만 축소를 풀어 원본 크기로 그립니다.
        // position 은 relative 여야 합니다. static 으로 두면 효과 캔버스가
        // 카드가 아니라 축소된 미리보기 상자를 기준으로 크기를 잡아
        // 구석에 쪼그라든 채로 찍힙니다.
        const clone = doc.getElementById('card');
        clone.style.transform = 'none';
        clone.style.position  = 'relative';
        clone.style.borderRadius = '0';
      },
    });

    canvas.toBlob((blob) => {
      const today = new Date().toISOString().slice(0, 10);
      const name  = currentType === 'today' ? '오늘의날씨' : '주간날씨';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${name}_${place.name}_${today}.${saveFmt}`;
      a.click();
      URL.revokeObjectURL(a.href);
      setStatus('저장했습니다. 다운로드 폴더를 확인해 주세요.');
    }, isJpg ? 'image/jpeg' : 'image/png', 0.92);

  }catch(err){
    console.error(err);
    setStatus('이미지 저장에 실패했습니다. 새로고침 후 다시 시도해 주세요.');
  }finally{
    Effects.start();   // 저장이 끝나면 다시 움직입니다
  }
}

/* ---------------------------------------------------------
   13. 버튼과 함수 연결하기
   --------------------------------------------------------- */
searchBtn.addEventListener('click', searchCity);
cityInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') searchCity(); });

todayBtn.addEventListener('click', () => makeCard('today'));
weekBtn.addEventListener('click',  () => makeCard('week'));
downloadBtn.addEventListener('click', downloadImage);

// 칩 묶음 하나 안에서만 선택이 옮겨가게 해주는 도우미
function onChipPick(group, handler){
  group.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      group.querySelectorAll('.chip').forEach((c) => c.classList.remove('is-on'));
      chip.classList.add('is-on');
      handler(chip);
    });
  });
}

// 카드 크기 선택 칩
onChipPick($('sizeChips'), (chip) => {
  cardW = Number(chip.dataset.w);
  cardH = Number(chip.dataset.h);
  fitPreview();
});

// 저장 형식 선택 칩
onChipPick(fmtChips, (chip) => {
  saveFmt = chip.dataset.fmt;
  downloadBtn.textContent = `${saveFmt.toUpperCase()}로 저장하기`;
});

// 주소의 #fx=... 를 바꾸면 효과가 바로 바뀝니다
window.addEventListener('hashchange', () => {
  const name = fxOverride();
  if (name){
    card.dataset.fx = name;
    Effects.setScene(name);
  }
});

// 계정명을 바꾸면 카드에도 바로 반영
signInput.addEventListener('input', () => {
  $('tSign').textContent = signInput.value;
  $('wSign').textContent = signInput.value;
});

// 운영체제에서 애니메이션을 꺼둔 경우, 카드도 움직이지 않습니다.
// 왜 안 움직이는지 몰라서 헤매지 않도록 화면에 알려 줍니다.
if (window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches){
  const hint = $('motionHint');
  hint.textContent =
    '컴퓨터에서 "애니메이션 효과"가 꺼져 있어 카드가 움직이지 않습니다. '
    + '저장되는 이미지는 정상입니다. '
    + '움직이게 하려면 윈도우 설정 → 접근성 → 시각 효과에서 켜 주세요.';
  hint.hidden = false;
}

// 페이지가 열리면 서울 날씨로 첫 카드를 자동으로 만들어 줍니다
Effects.mount(card);
fitPreview();
makeCard('today');
