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
const stageBox    = $('stageBox');
const card        = $('card');
const viewToday   = $('viewToday');
const viewWeek    = $('viewWeek');

/* ---------------------------------------------------------
   1. 상태값 (지금 어떤 지역/크기/카드를 보고 있는지 기억)
   --------------------------------------------------------- */
let place = { name: '서울', lat: 37.5665, lon: 126.9780 }; // 기본값: 서울
let cardW = 1080;
let cardH = 1350;
let currentType = null; // 'today' 또는 'week'

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

// 2026-09-08 → "9월 8일 (화)"
function formatDate(iso){
  const d = new Date(iso + 'T00:00:00');
  const days = ['일','월','화','수','목','금','토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

function dayName(iso, index){
  if (index === 0) return '오늘';
  const d = new Date(iso + 'T00:00:00');
  const days = ['일','월','화','수','목','금','토'];
  return `${d.getMonth() + 1}.${d.getDate()} ${days[d.getDay()]}`;
}

function setStatus(text){ statusEl.textContent = text; }

/* ---------------------------------------------------------
   5. 미리보기 크기 맞추기
   카드는 실제 1080px 크기지만 화면에는 작게 줄여서 보여줍니다.
   --------------------------------------------------------- */
function fitPreview(){
  const boxWidth = stageBox.clientWidth;
  const scale = Math.min(boxWidth / cardW, 1);
  card.style.width  = cardW + 'px';
  card.style.height = cardH + 'px';
  card.style.transform = `scale(${scale})`;
  stageBox.style.height = (cardH * scale) + 'px';
}
window.addEventListener('resize', fitPreview);

/* ---------------------------------------------------------
   6. 도시 검색 (Open-Meteo Geocoding API)
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
   7. 날씨 데이터 가져오기 (Open-Meteo Forecast API)
   --------------------------------------------------------- */
async function fetchWeather(){
  const url = 'https://api.open-meteo.com/v1/forecast'
    + `?latitude=${place.lat}&longitude=${place.lon}`
    + '&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m'
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max'
    + '&wind_speed_unit=ms'   // 바람은 한국식 m/s 로 받기
    + '&timezone=auto&forecast_days=7';

  const res = await fetch(url);
  if (!res.ok) throw new Error('날씨 API 응답 오류');
  return res.json();
}

/* ---------------------------------------------------------
   8. 오늘의 날씨 카드 그리기
   --------------------------------------------------------- */
function renderToday(data){
  const now = data.current;
  const day = data.daily;
  const [label, iconName, theme] = readCode(now.weather_code);

  card.dataset.theme = theme;

  $('tPlace').textContent = place.name;
  $('tDate').textContent  = formatDate(day.time[0]);
  $('tIcon').innerHTML    = icon(iconName, 190);
  $('tTemp').textContent  = round(now.temperature_2m);
  $('tDesc').textContent  = label;
  $('tRange').textContent = `최저 ${round(day.temperature_2m_min[0])}° · 최고 ${round(day.temperature_2m_max[0])}°`;

  $('tFeels').textContent = `${round(now.apparent_temperature)}°`;
  $('tPop').textContent   = `${day.precipitation_probability_max[0] ?? 0}%`;
  $('tHum').textContent   = `${round(now.relative_humidity_2m)}%`;
  $('tWind').textContent  = `${round(now.wind_speed_10m)}m/s`;

  $('tSign').textContent  = signInput.value;

  viewToday.hidden = false;
  viewWeek.hidden  = true;
  currentType = 'today';
}

/* ---------------------------------------------------------
   9. 주간 날씨 카드 그리기
   --------------------------------------------------------- */
function renderWeek(data){
  const day = data.daily;

  // 이번 주 전체의 최저·최고를 구해서 온도 막대의 기준으로 씁니다
  const minAll = Math.min(...day.temperature_2m_min);
  const maxAll = Math.max(...day.temperature_2m_max);
  const span   = Math.max(maxAll - minAll, 1); // 0으로 나누는 것 방지

  // 카드 전체 색은 오늘 날씨 기준
  card.dataset.theme = readCode(day.weather_code[0])[2];

  $('wPlace').textContent = place.name;
  $('wDate').textContent  = `${formatDate(day.time[0])} 기준`;
  $('wSign').textContent  = signInput.value;

  const list = $('weekList');
  list.innerHTML = '';

  day.time.forEach((iso, i) => {
    const lo = day.temperature_2m_min[i];
    const hi = day.temperature_2m_max[i];
    const [, iconName] = readCode(day.weather_code[i]);

    // 막대의 시작 위치와 길이를 % 로 계산
    const left  = ((lo - minAll) / span) * 100;
    const width = Math.max(((hi - lo) / span) * 100, 4);

    const li = document.createElement('li');
    li.className = 'day' + (i === 0 ? ' is-today' : '');
    li.innerHTML = `
      <span class="day__name">${dayName(iso, i)}</span>
      <span class="day__icon">${icon(iconName, 62)}</span>
      <span class="day__bar">
        <span class="day__fill" style="left:${left}%; width:${width}%"></span>
      </span>
      <span class="day__temp"><i>${round(lo)}°</i> &nbsp; <b>${round(hi)}°</b></span>
    `;
    list.appendChild(li);
  });

  viewToday.hidden = true;
  viewWeek.hidden  = false;
  currentType = 'week';
}

/* ---------------------------------------------------------
   10. 버튼을 눌렀을 때 실행되는 함수
   --------------------------------------------------------- */
async function makeCard(type){
  setStatus('날씨를 가져오는 중입니다...');
  todayBtn.disabled = weekBtn.disabled = true;

  try{
    const data = await fetchWeather();
    if (type === 'today') renderToday(data);
    else                  renderWeek(data);

    fitPreview();
    downloadBtn.disabled = false;
    setStatus('카드가 완성되었습니다. PNG로 저장하기를 눌러 주세요.');

  }catch(err){
    console.error(err);
    setStatus('날씨를 가져오지 못했습니다. 잠시 뒤 다시 시도해 주세요.');
  }finally{
    todayBtn.disabled = weekBtn.disabled = false;
  }
}

/* ---------------------------------------------------------
   11. PNG로 저장하기
   화면에서는 카드가 축소되어 있으므로,
   이미지로 만들 때만 원래 크기(1080px)로 되돌려서 캡처합니다.
   --------------------------------------------------------- */
async function downloadPNG(){
  if (!currentType) return;
  setStatus('이미지를 만드는 중입니다...');

  // 글꼴이 다 불러와진 다음에 캡처해야 글자가 깨지지 않습니다
  if (document.fonts && document.fonts.ready) await document.fonts.ready;

  try{
    const canvas = await html2canvas(card, {
      width: cardW,
      height: cardH,
      scale: 1,
      backgroundColor: null,
      useCORS: true,
      onclone: (doc) => {
        // 복제본에서만 축소를 풀어 원본 크기로 그립니다
        const clone = doc.getElementById('card');
        clone.style.transform = 'none';
        clone.style.position  = 'static';
        clone.style.borderRadius = '0';
      },
    });

    canvas.toBlob((blob) => {
      const today = new Date().toISOString().slice(0, 10);
      const name  = currentType === 'today' ? '오늘의날씨' : '주간날씨';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${name}_${place.name}_${today}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
      setStatus('저장했습니다. 다운로드 폴더를 확인해 주세요.');
    }, 'image/png');

  }catch(err){
    console.error(err);
    setStatus('이미지 저장에 실패했습니다. 새로고침 후 다시 시도해 주세요.');
  }
}

/* ---------------------------------------------------------
   12. 버튼과 함수 연결하기
   --------------------------------------------------------- */
searchBtn.addEventListener('click', searchCity);
cityInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') searchCity(); });

todayBtn.addEventListener('click', () => makeCard('today'));
weekBtn.addEventListener('click',  () => makeCard('week'));
downloadBtn.addEventListener('click', downloadPNG);

// 카드 크기 선택 칩
document.querySelectorAll('.chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach((c) => c.classList.remove('is-on'));
    chip.classList.add('is-on');
    cardW = Number(chip.dataset.w);
    cardH = Number(chip.dataset.h);
    fitPreview();
  });
});

// 계정명을 바꾸면 카드에도 바로 반영
signInput.addEventListener('input', () => {
  $('tSign').textContent = signInput.value;
  $('wSign').textContent = signInput.value;
});

// 페이지가 열리면 서울 날씨로 첫 카드를 자동으로 만들어 줍니다
fitPreview();
makeCard('today');
