/* =========================================================
   날씨 효과 입자 엔진
   - 카드 안에 투명한 캔버스를 두 장 깔고 입자를 그립니다.
       뒤쪽 캔버스: 글자 뒤 (햇무리, 흐릿한 구름, 먼 눈송이)
       앞쪽 캔버스: 글자 앞 (유리에 맺힌 물방울, 날리는 낙엽)
   - 캔버스는 화면에 보이는 축소 크기가 아니라 실제 1080px
     크기로 그립니다. 그래야 저장했을 때 선명합니다.
   ========================================================= */

const Effects = (() => {

  /* -------------------------------------------------------
     0. 작은 도우미들
     --------------------------------------------------------- */
  const TAU  = Math.PI * 2;
  const rnd  = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];

  // 카드가 커지면 입자도 많아지도록. 기준은 쇼츠(1080×1920)
  let density = 1;
  const many = (n) => Math.max(3, Math.round(n * density));

  /* -------------------------------------------------------
     1. 어떤 효과를 띄울지 정하는 규칙
        1) 비·눈·뇌우·안개면 그 날씨 효과 (바람은 무시)
        2) 그 외에 바람이 세면 낙엽
        3) 나머지는 날씨 그대로 (맑음 / 흐림)
     --------------------------------------------------------- */
  const WIND_MS = 6;                                  // 낙엽이 날리기 시작하는 풍속
  const KEEPS_OWN = ['rain', 'snow', 'storm', 'fog']; // 바람보다 우선하는 날씨

  function pickScene(theme, windSpeed){
    if (KEEPS_OWN.indexOf(theme) !== -1) return theme;
    if (Number(windSpeed) >= WIND_MS) return 'wind';
    return (theme === 'clear') ? 'clear' : 'cloud';
  }

  /* -------------------------------------------------------
     2. 자주 쓰는 그리기 조각들
     --------------------------------------------------------- */

  // 유리에 맺힌 물방울 한 개
  function drawDrop(cx, x, y, r){
    cx.save();

    // 아래쪽 그림자 — 이게 있어야 표면에 붙어 보입니다
    cx.fillStyle = 'rgba(0,0,0,0.12)';
    cx.beginPath();
    cx.ellipse(x, y + r * 0.16, r * 0.95, r * 1.02, 0, 0, TAU);
    cx.fill();

    // 물방울 몸통 — 가운데가 밝고 가장자리가 다시 살짝 밝은 유리 느낌
    const g = cx.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0,    'rgba(255,255,255,0.44)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.10)');
    g.addColorStop(1,    'rgba(255,255,255,0.26)');
    cx.fillStyle = g;
    cx.beginPath();
    cx.ellipse(x, y, r * 0.92, r * 1.08, 0, 0, TAU);
    cx.fill();

    cx.strokeStyle = 'rgba(255,255,255,0.32)';
    cx.lineWidth   = Math.max(1, r * 0.07);
    cx.stroke();

    // 왼쪽 위 반짝임
    cx.fillStyle = 'rgba(255,255,255,0.90)';
    cx.beginPath();
    cx.ellipse(x - r * 0.34, y - r * 0.44, r * 0.24, r * 0.16, -0.6, 0, TAU);
    cx.fill();

    cx.restore();
  }

  // 부드럽게 번지는 동그란 빛 (햇무리·구름·안개에 두루 씁니다)
  // color 안의 ALPHA 자리에 진하기가 들어갑니다.
  function softBlob(cx, x, y, r, color, alpha){
    const g = cx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0,   color.replace('ALPHA', alpha));
    g.addColorStop(0.6, color.replace('ALPHA', alpha * 0.35));
    g.addColorStop(1,   color.replace('ALPHA', 0));
    cx.fillStyle = g;
    cx.beginPath();
    cx.arc(x, y, r, 0, TAU);
    cx.fill();
  }

  // 낙엽 한 장 — 회전하면서 좌우로 납작해져 팔랑이는 느낌을 냅니다
  function drawLeaf(cx, x, y, size, angle, flutter, color){
    cx.save();
    cx.translate(x, y);
    cx.rotate(angle);
    cx.scale(Math.max(0.22, Math.abs(Math.cos(flutter))), 1);

    cx.fillStyle = color;
    cx.beginPath();
    cx.moveTo(0, -size);
    cx.quadraticCurveTo( size * 0.78, -size * 0.15, 0, size);
    cx.quadraticCurveTo(-size * 0.78, -size * 0.15, 0, -size);
    cx.fill();

    cx.strokeStyle = 'rgba(0,0,0,0.22)';
    cx.lineWidth   = Math.max(1, size * 0.09);
    cx.beginPath();
    cx.moveTo(0, -size * 0.8);
    cx.lineTo(0,  size * 0.8);
    cx.stroke();

    cx.restore();
  }

  /* -------------------------------------------------------
     3. 장면 7개
        각 장면은 seed(입자 만들기) 와 frame(한 장 그리기) 을 갖습니다.
     --------------------------------------------------------- */
  const SCENES = {

    /* ---- 맑음: 해가 쨍쨍 ---- */
    clear: {
      seed(W, H){
        return {
          sx: W * 0.78,
          sy: H * 0.14,
          motes: Array.from({ length: many(16) }, () => ({
            x: rnd(0, W), y: rnd(0, H),
            r: rnd(2, 6), vy: rnd(-9, -3), vx: rnd(-4, 4),
            ph: rnd(0, TAU),
          })),
        };
      },
      frame(s, dt, t, back, front, W, H){
        const sx = s.sx, sy = s.sy;
        const pulse = 0.82 + Math.sin(t * 0.7) * 0.18;

        // 넓게 퍼지는 햇무리
        softBlob(back, sx, sy, W * 0.62, 'rgba(255,196,92,ALPHA)', 0.30 * pulse);

        // 천천히 도는 빛줄기
        back.save();
        back.globalCompositeOperation = 'lighter';
        back.translate(sx, sy);
        back.rotate(t * 0.05);
        for (let i = 0; i < 14; i++){
          const long = (i % 2 === 0) ? W * 0.72 : W * 0.46;
          back.rotate(TAU / 14);
          const g = back.createLinearGradient(0, 0, long, 0);
          g.addColorStop(0, 'rgba(255,214,140,' + (0.16 * pulse) + ')');
          g.addColorStop(1, 'rgba(255,214,140,0)');
          back.fillStyle = g;
          back.beginPath();
          back.moveTo(0, 0);
          back.lineTo(long,  long * 0.045);
          back.lineTo(long, -long * 0.045);
          back.closePath();
          back.fill();
        }
        back.restore();

        // 해 본체
        softBlob(back, sx, sy, W * 0.15, 'rgba(255,236,190,ALPHA)', 0.85 * pulse);
        back.fillStyle = 'rgba(255,248,228,' + (0.92 * pulse) + ')';
        back.beginPath();
        back.arc(sx, sy, W * 0.052, 0, TAU);
        back.fill();

        // 공기 중에 떠다니는 빛 알갱이
        for (const m of s.motes){
          m.x += m.vx * dt;
          m.y += m.vy * dt;
          if (m.y < -20){ m.y = H + 20; m.x = rnd(0, W); }
          if (m.x < -20) m.x = W + 20;
          if (m.x > W + 20) m.x = -20;

          front.fillStyle = 'rgba(255,240,205,' + (0.18 + Math.sin(t * 1.6 + m.ph) * 0.12) + ')';
          front.beginPath();
          front.arc(m.x, m.y, m.r, 0, TAU);
          front.fill();
        }
      },
    },

    /* ---- 흐림: 구름이 흐름 ---- */
    cloud: {
      seed(W, H){
        return {
          puffs: Array.from({ length: many(7) }, (_, i) => ({
            x: rnd(-W * 0.2, W * 1.2),
            y: rnd(H * 0.05, H * 0.75),
            r: rnd(W * 0.18, W * 0.42),
            vx: rnd(6, 26) * (i % 2 ? 1 : -1),
            a: rnd(0.08, 0.18),
          })),
        };
      },
      frame(s, dt, t, back, front, W, H){
        for (const p of s.puffs){
          p.x += p.vx * dt;
          if (p.vx > 0 && p.x - p.r > W) p.x = -p.r;
          if (p.vx < 0 && p.x + p.r < 0) p.x = W + p.r;

          const drift = Math.sin(t * 0.3 + p.y) * p.r * 0.05;
          softBlob(back, p.x,                 p.y + drift,       p.r,       'rgba(226,234,246,ALPHA)', p.a);
          softBlob(back, p.x + p.r * 0.5, p.y + p.r * 0.14, p.r * 0.7, 'rgba(226,234,246,ALPHA)', p.a * 0.8);
          softBlob(back, p.x - p.r * 0.5, p.y + p.r * 0.10, p.r * 0.6, 'rgba(226,234,246,ALPHA)', p.a * 0.7);
        }
      },
    },

    /* ---- 비: 카드 표면에 물방울이 맺힘 ---- */
    rain: {
      seed(W, H, heavy){
        // 표면에 가만히 맺혀 있는 물방울
        const drops = Array.from({ length: many(heavy ? 32 : 26) }, () => ({
          x: rnd(W * 0.02, W * 0.98),
          y: rnd(H * 0.02, H * 0.98),
          r: rnd(11, 30),
        }));

        // 몇 개는 무거워져서 아래로 흘러내립니다
        const runners = Array.from({ length: many(heavy ? 7 : 5) }, () => ({
          x: rnd(W * 0.05, W * 0.95),
          y: rnd(0, H),
          r: rnd(14, 26),
          v: rnd(60, 150),
          trail: [],
        }));

        // 뒤쪽을 사선으로 지나가는 빗줄기
        const streaks = Array.from({ length: many(heavy ? 90 : 55) }, () => ({
          x: rnd(-W * 0.2, W * 1.1),
          y: rnd(0, H),
          len: rnd(H * 0.04, H * 0.11),
          v: rnd(H * 0.7, H * 1.3) * (heavy ? 1.35 : 1),
          a: rnd(0.06, 0.20),
        }));

        return { drops: drops, runners: runners, streaks: streaks, heavy: !!heavy };
      },
      frame(s, dt, t, back, front, W, H){
        back.lineCap = 'round';
        for (const k of s.streaks){
          k.y += k.v * dt;
          k.x -= k.v * dt * 0.22;
          if (k.y - k.len > H){ k.y = -k.len; k.x = rnd(-W * 0.2, W * 1.1); }

          back.strokeStyle = 'rgba(196,222,246,' + k.a + ')';
          back.lineWidth   = s.heavy ? 3.4 : 2.4;
          back.beginPath();
          back.moveTo(k.x, k.y);
          back.lineTo(k.x + k.len * 0.22, k.y - k.len);
          back.stroke();
        }

        for (const d of s.drops) drawDrop(front, d.x, d.y, d.r);

        // 흘러내리는 물방울과 그 자국
        for (const r of s.runners){
          r.y += r.v * dt;
          r.trail.push({ x: r.x + rnd(-1.5, 1.5), y: r.y, r: r.r * rnd(0.16, 0.34) });
          if (r.trail.length > 34) r.trail.shift();

          if (r.y - r.r > H){
            r.y = -r.r;
            r.x = rnd(W * 0.05, W * 0.95);
            r.r = rnd(14, 26);
            r.v = rnd(60, 150);
            r.trail.length = 0;
          }

          r.trail.forEach((p, i) => {
            const fade = i / r.trail.length;
            front.fillStyle = 'rgba(255,255,255,' + (0.05 + fade * 0.10) + ')';
            front.beginPath();
            front.arc(p.x, p.y, p.r, 0, TAU);
            front.fill();
          });

          drawDrop(front, r.x, r.y, r.r);
        }
      },
    },

    /* ---- 눈: 눈이 내리고, 몇 송이는 유리에 붙음 ---- */
    snow: {
      seed(W, H){
        return {
          far: Array.from({ length: many(34) }, () => ({
            x: rnd(0, W), y: rnd(0, H),
            r: rnd(9, 20), v: rnd(22, 48),
            sw: rnd(10, 30), ph: rnd(0, TAU),
          })),
          near: Array.from({ length: many(62) }, () => ({
            x: rnd(0, W), y: rnd(0, H),
            r: rnd(2.5, 6), v: rnd(55, 115),
            sw: rnd(18, 46), ph: rnd(0, TAU),
          })),
          stuck: Array.from({ length: many(22) }, () => ({
            x: rnd(W * 0.03, W * 0.97),
            y: rnd(H * 0.03, H * 0.97),
            r: rnd(3, 8),
          })),
        };
      },
      frame(s, dt, t, back, front, W, H){
        for (const f of s.far){
          f.y += f.v * dt;
          if (f.y - f.r > H){ f.y = -f.r; f.x = rnd(0, W); }
          softBlob(back, f.x + Math.sin(t * 0.5 + f.ph) * f.sw, f.y, f.r,
                   'rgba(255,255,255,ALPHA)', 0.34);
        }

        for (const n of s.near){
          n.y += n.v * dt;
          if (n.y - n.r > H){ n.y = -n.r; n.x = rnd(0, W); }
          front.fillStyle = 'rgba(255,255,255,0.82)';
          front.beginPath();
          front.arc(n.x + Math.sin(t * 0.9 + n.ph) * n.sw, n.y, n.r, 0, TAU);
          front.fill();
        }

        // 유리에 달라붙어 움직이지 않는 눈
        for (const k of s.stuck){
          front.fillStyle = 'rgba(255,255,255,0.88)';
          front.beginPath();
          front.arc(k.x, k.y, k.r, 0, TAU);
          front.fill();
          softBlob(front, k.x, k.y, k.r * 2.4, 'rgba(255,255,255,ALPHA)', 0.16);
        }
      },
    },

    /* ---- 뇌우: 굵은 비 + 가끔 번쩍 ---- */
    storm: {
      seed(W, H){
        const s = SCENES.rain.seed(W, H, true);
        s.next  = rnd(1.2, 3.5);   // 다음 번개까지 남은 시간
        s.flash = 0;               // 번쩍이는 동안 남은 시간
        s.bolt  = null;
        return s;
      },
      // 저장 직전에 불립니다. 번개를 끄고 다음 번개도 뒤로 미룹니다.
      calm(s){
        s.flash = 0;
        s.bolt  = null;
        s.next  = Math.max(s.next, 1);
      },
      frame(s, dt, t, back, front, W, H){
        SCENES.rain.frame(s, dt, t, back, front, W, H);

        s.next -= dt;
        if (s.next <= 0){
          s.next  = rnd(2, 5);
          s.flash = 0.16;

          // 위에서 아래로 지그재그로 갈라지는 번개 줄기
          let x = rnd(W * 0.2, W * 0.8), y = 0;
          const pts = [{ x: x, y: y }];
          while (y < H * 0.62){
            y += rnd(H * 0.05, H * 0.11);
            x += rnd(-W * 0.09, W * 0.09);
            pts.push({ x: x, y: y });
          }
          s.bolt = pts;
        }

        if (s.flash > 0){
          s.flash -= dt;
          // 짧게 두어 번 깜빡이도록 세기를 흔듭니다
          const k = Math.max(0, s.flash / 0.16);
          const a = k * (0.55 + Math.sin(k * 26) * 0.25);

          front.fillStyle = 'rgba(226,232,255,' + (a * 0.30) + ')';
          front.fillRect(0, 0, W, H);

          if (s.bolt){
            front.save();
            front.strokeStyle = 'rgba(255,255,255,' + a + ')';
            front.lineWidth   = 7;
            front.lineJoin    = 'round';
            front.lineCap     = 'round';
            front.shadowColor = 'rgba(190,210,255,0.95)';
            front.shadowBlur  = 44;
            front.beginPath();
            front.moveTo(s.bolt[0].x, s.bolt[0].y);
            for (const p of s.bolt) front.lineTo(p.x, p.y);
            front.stroke();
            front.restore();
          }
        }
      },
    },

    /* ---- 안개: 뿌옇게 깔림 ---- */
    fog: {
      seed(W, H){
        return {
          bands: Array.from({ length: many(12) }, (_, i) => ({
            x: rnd(-W * 0.3, W * 1.3),
            y: rnd(0, H),
            w: rnd(W * 0.5, W * 1.0),
            h: rnd(H * 0.05, H * 0.13),
            v: rnd(5, 20) * (i % 2 ? 1 : -1),
            a: rnd(0.11, 0.24),
            near: i % 3 === 0,
          })),
        };
      },
      frame(s, dt, t, back, front, W, H){
        for (const b of s.bands){
          b.x += b.v * dt;
          if (b.v > 0 && b.x - b.w > W) b.x = -b.w;
          if (b.v < 0 && b.x + b.w < 0) b.x = W + b.w;

          const cx = b.near ? front : back;
          const a  = b.near ? b.a * 0.55 : b.a;

          cx.save();
          cx.translate(b.x, b.y + Math.sin(t * 0.25 + b.y) * 12);
          cx.scale(1, b.h / b.w);
          softBlob(cx, 0, 0, b.w, 'rgba(216,226,230,ALPHA)', a);
          cx.restore();
        }

        // 가장자리를 살짝 더 뿌옇게 해서 시선을 안으로 모읍니다
        const v = front.createRadialGradient(W / 2, H / 2, W * 0.32, W / 2, H / 2, W * 0.95);
        v.addColorStop(0, 'rgba(210,222,226,0)');
        v.addColorStop(1, 'rgba(210,222,226,0.22)');
        front.fillStyle = v;
        front.fillRect(0, 0, W, H);
      },
    },

    /* ---- 바람: 낙엽이 날림 ---- */
    wind: {
      seed(W, H){
        const COLORS = [
          'rgba(198,106,44,0.92)', 'rgba(222,150,54,0.92)',
          'rgba(232,190,70,0.90)', 'rgba(168,74,40,0.92)',
          'rgba(206,124,62,0.90)',
        ];
        const make = (n, small) => Array.from({ length: many(n) }, () => ({
          x: rnd(-W * 0.15, W * 1.15),
          y: rnd(-H * 0.1, H * 1.1),
          size: small ? rnd(9, 18)   : rnd(19, 34),
          vx:   small ? rnd(90, 170) : rnd(180, 320),
          vy:   small ? rnd(18, 46)  : rnd(40, 90),
          ang: rnd(0, TAU),
          spin: rnd(-2.6, 2.6),
          flut: rnd(0, TAU),
          fv: rnd(2.4, 5.2),
          wob: rnd(10, 34),
          ph: rnd(0, TAU),
          color: pick(COLORS),
        }));
        return { far: make(14, true), near: make(11, false) };
      },
      frame(s, dt, t, back, front, W, H){
        const move = (l) => {
          l.x    += l.vx * dt;
          l.y    += l.vy * dt + Math.sin(t * 1.4 + l.ph) * l.wob * dt;
          l.ang  += l.spin * dt;
          l.flut += l.fv * dt;
          if (l.x - l.size > W){ l.x = -l.size; l.y = rnd(-H * 0.1, H * 1.05); }
          if (l.y - l.size > H){ l.y = -l.size; l.x = rnd(-W * 0.15, W * 0.9); }
        };

        for (const l of s.far){
          move(l);
          back.globalAlpha = 0.55;
          drawLeaf(back, l.x, l.y, l.size, l.ang, l.flut, l.color);
          back.globalAlpha = 1;
        }
        for (const l of s.near){
          move(l);
          drawLeaf(front, l.x, l.y, l.size, l.ang, l.flut, l.color);
        }
      },
    },
  };

  /* -------------------------------------------------------
     4. 엔진 본체
     --------------------------------------------------------- */
  const FPS  = 30;
  const STEP = 1 / FPS;
  const REDUCED = !!(window.matchMedia &&
                     window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  let backCv = null, frontCv = null, backCx = null, frontCx = null;
  let W = 1080, H = 1920;
  let sceneName = null, state = null;
  let raf = null, prev = 0, acc = 0, clock = 0, running = false;

  function makeCanvas(cls){
    const c = document.createElement('canvas');
    c.className = 'card__fx ' + cls;
    c.setAttribute('aria-hidden', 'true');
    return c;
  }

  // 카드에 캔버스 두 장을 넣습니다. 뒤쪽은 맨 앞에, 앞쪽은 맨 뒤에.
  function mount(cardEl){
    backCv  = makeCanvas('card__fx--back');
    frontCv = makeCanvas('card__fx--front');
    cardEl.insertBefore(backCv, cardEl.firstChild);
    cardEl.appendChild(frontCv);
    backCx  = backCv.getContext('2d');
    frontCx = frontCv.getContext('2d');
    setSize(W, H);

    // 다른 탭으로 넘어가면 멈춥니다 (노트북 배터리)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else if (sceneName)  start();
    });
  }

  function setSize(w, h){
    if (w === W && h === H && backCv && backCv.width === w) return;
    W = w; H = h;
    density = (W * H) / (1080 * 1920);
    if (backCv){  backCv.width  = W; backCv.height  = H; }
    if (frontCv){ frontCv.width = W; frontCv.height = H; }
    if (sceneName) reseed();
  }

  function reseed(){
    state = SCENES[sceneName].seed(W, H);
    clock = 0;
    settle();
  }

  function setScene(name){
    if (!SCENES[name]) name = 'cloud';
    if (name === sceneName) return;   // 같은 장면이면 다시 뿌리지 않습니다
    sceneName = name;
    reseed();
    start();
  }

  function drawFrame(dt){
    backCx.clearRect(0, 0, W, H);
    frontCx.clearRect(0, 0, W, H);
    clock += dt;
    SCENES[sceneName].frame(state, dt, clock, backCx, frontCx, W, H);
  }

  // 입자가 처음 위치에 어색하게 뭉쳐 있지 않도록 몇 초치를 미리 굴려둡니다.
  // "동작 줄이기"를 켠 분에게는 이 한 장면이 최종 화면이 됩니다.
  function settle(){
    if (!backCx || !sceneName) return;
    for (let i = 0; i < 60; i++) drawFrame(STEP);
  }

  function loop(now){
    if (!running) return;
    raf = requestAnimationFrame(loop);

    const dt = Math.min((now - prev) / 1000, 0.25);
    prev = now;
    acc += dt;
    if (acc < STEP) return;      // 초당 30장으로 제한
    const use = acc;
    acc = 0;
    drawFrame(use);
  }

  function start(){
    if (running || !sceneName || REDUCED) return;
    running = true;
    prev = performance.now();
    acc  = 0;
    raf  = requestAnimationFrame(loop);
  }

  function stop(){
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  // 이미지로 저장하기 직전에 부릅니다.
  // 움직임을 멈추고, 저장본에 들어가면 안 되는 것(번개 섬광)을 지운 뒤
  // 같은 자리에 한 장을 다시 그려 둡니다.
  function beforeCapture(){
    stop();
    if (!backCx || !sceneName || !state) return;
    const sc = SCENES[sceneName];
    if (sc.calm) sc.calm(state);
    drawFrame(0);      // dt 0 — 입자는 그 자리에 두고 다시 그리기만 합니다
  }

  return {
    mount: mount,
    setSize: setSize,
    setScene: setScene,
    start: start,
    stop: stop,
    beforeCapture: beforeCapture,
    pickScene: pickScene,
    names: Object.keys(SCENES),
    WIND_MS: WIND_MS,
  };
})();
