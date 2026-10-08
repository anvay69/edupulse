const highlights = [
  { number: "01", title: "Made for your studies", text: "A focused space for the academic information that matters to you." },
  { number: "02", title: "Built around your campus", text: "Your future feed will bring relevant institutional updates together." },
  { number: "03", title: "Help when you need it", text: "An AI assistant will help you find answers from official information." },
];

export default function Dashboard() {
  return (
    <div className="dashboard" id="dashboard">
      <section className="welcome-card" aria-labelledby="welcome-heading">
        <div className="welcome-copy">
          <p className="eyebrow"><span className="eyebrow-line" /> YOUR CAMPUS, IN FOCUS</p>
          <h1 id="welcome-heading">A clearer pulse<br />on campus life.</h1>
          <p className="welcome-description">
            EduPulse AI brings academic updates and trusted answers into one
            thoughtful space, so you can stay in step with what matters.
          </p>
          <a className="text-link" href="#getting-started">
            Explore your dashboard <span aria-hidden="true">↘</span>
          </a>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <div className="art-orbit art-orbit--outer" />
          <div className="art-orbit art-orbit--inner" />
          <div className="art-center"><span>EP</span><i /></div>
          <div className="art-caption">LEARN IN<br />YOUR RHYTHM</div>
        </div>
        <span className="card-index" aria-hidden="true">EDUPULSE / 001</span>
      </section>

      <section className="getting-started" id="getting-started" aria-labelledby="getting-started-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A BETTER WAY TO STAY IN THE LOOP</p>
            <h2 id="getting-started-heading">Your academic day, at a glance.</h2>
          </div>
          <span className="section-count">01 — 03</span>
        </div>
        <div className="highlight-grid">
          {highlights.map((highlight) => (
            <article className="highlight" key={highlight.number}>
              <span className="highlight-number">{highlight.number}</span>
              <h3>{highlight.title}</h3>
              <p>{highlight.text}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
