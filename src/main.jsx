import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const nav = [
  ['today','Сегодня','⌂'],
  ['train','Тренировка','◒'],
  ['body','Fitness Twin','◈'],
  ['evolve','Прогресс','↗'],
  ['ai','AI Coach','✦'],
];

function Metric({label,value,sub}) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{sub}</small></div>;
}

function App() {
  const [tab,setTab]=useState('today');
  const [done,setDone]=useState(false);
  const title=useMemo(()=>nav.find(x=>x[0]===tab)?.[1] || 'Сегодня',[tab]);

  return <div className="app">
    <header className="topbar">
      <div className="brand"><span className="mark">T</span><div><b>TORCLIX</b><small>FIT</small></div></div>
      <button className="icon">⋯</button>
    </header>

    <main>
      {tab==='today' && <section className="screen">
        <div className="eyebrow">СРЕДА · 23 ОКТЯБРЯ</div>
        <h1>Доброе утро.</h1>
        <p className="muted">Сегодня система уже рассчитала твой следующий шаг.</p>

        <div className="readiness card">
          <div className="ring"><span>87</span><small>ГОТОВНОСТЬ</small></div>
          <div className="readiness-copy"><b>Отличное состояние</b><span>Сон 8:12 · Recovery высокий</span><span>Нагрузка в норме</span></div>
        </div>

        <div className="section-head"><span>NEXT MOVE</span><small>Решение системы</small></div>
        <div className="hero-card">
          <div className="hero-photo"></div>
          <div className="hero-overlay">
            <span className="tag">48 МИН · СИЛА</span>
            <h2>Грудь + плечи</h2>
            <p>Сегодня можно работать на прогресс.</p>
            <button className="primary" onClick={()=>setTab('train')}>НАЧАТЬ ТРЕНИРОВКУ <b>→</b></button>
          </div>
        </div>

        <div className="metrics">
          <Metric label="Сон" value="8:12" sub="+24 мин"/>
          <Metric label="Recovery" value="87" sub="высокий"/>
          <Metric label="Нагрузка" value="64" sub="оптимально"/>
        </div>
      </section>}

      {tab==='train' && <section className="screen">
        <div className="eyebrow">ТРЕНИРОВКА · 48 МИН</div>
        <h1>Грудь + плечи</h1>
        <p className="muted">Прогрессивная нагрузка · уровень 4</p>
        <div className="exercise card">
          <div className="exercise-image"></div>
          <span className="tag">УПРАЖНЕНИЕ 01 / 06</span>
          <h2>Жим штанги лёжа</h2>
          <div className="big-number">80 <small>кг</small></div>
          <div className="sets"><span>4 подхода × 8</span><span>Отдых 01:32</span></div>
          <button className="primary" onClick={()=>setDone(!done)}>{done?'ПОДХОД ВЫПОЛНЕН ✓':'НАЧАТЬ ПОДХОД'}</button>
        </div>
        <div className="coach-note"><b>AI COACH</b><p>Последний раз ты сделал 77,5 кг × 8. Сегодня безопасно пробуем +2,5 кг.</p></div>
      </section>}

      {tab==='body' && <section className="screen">
        <div className="eyebrow">ПЕРСОНАЛЬНАЯ МОДЕЛЬ</div>
        <h1>Fitness Twin</h1>
        <p className="muted">Твоя цифровая модель становится точнее после каждой тренировки.</p>
        <div className="twin card"><div className="twin-orb">TWIN</div><div className="twin-stats"><Metric label="Сила" value="74" sub="+8% за 30 дней"/><Metric label="Recovery" value="81" sub="+11%"/><Metric label="Мобильность" value="67" sub="+4%"/></div></div>
        <div className="section-head"><span>ЧТО ИЗМЕНИЛОСЬ</span></div>
        <div className="list card"><p><b>Жим</b><span>+5 кг</span></p><p><b>Талия</b><span>−3 см</span></p><p><b>Средний сон</b><span>+34 мин</span></p></div>
      </section>}

      {tab==='evolve' && <section className="screen">
        <div className="eyebrow">EVOLVE · 30 ДНЕЙ</div>
        <h1>Прогресс</h1>
        <div className="progress-card card"><span>ВЕС</span><strong>82.4 <small>кг</small></strong><em>−2.6 кг</em><div className="chart"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div>
        <div className="metrics two"><Metric label="Жим" value="+5 кг" sub="за 30 дней"/><Metric label="Присед" value="+7.5 кг" sub="за 30 дней"/></div>
        <div className="mission card"><span className="tag">MISSION · 30 ДНЕЙ</span><h2>+10% силы</h2><div className="bar"><i style={{width:'57%'}}></i></div><p>17 / 30 дней · 57%</p></div>
      </section>}

      {tab==='ai' && <section className="screen">
        <div className="eyebrow">AI DECISION CENTER</div>
        <h1>AI Coach</h1>
        <p className="muted">Не чат ради чата. Система объясняет решения и превращает данные в действие.</p>
        <div className="decision card"><span className="tag">РЕШЕНИЕ НА СЕГОДНЯ</span><h2>Увеличиваем нагрузку</h2><p>Ты восстановился лучше обычного, а предыдущая тренировка была 2 дня назад.</p><div className="reason"><span>Сон</span><b>+12%</b></div><div className="reason"><span>Recovery</span><b>+9%</b></div><div className="reason"><span>Нагрузка</span><b>оптимально</b></div><button className="primary" onClick={()=>setTab('train')}>ПРИНЯТЬ ПЛАН →</button></div>
      </section>}
    </main>

    <nav className="bottom">
      {nav.map(([id,label,icon])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><b>{icon}</b><span>{label}</span></button>)}
    </nav>
  </div>
}

createRoot(document.getElementById('root')).render(<App />);
