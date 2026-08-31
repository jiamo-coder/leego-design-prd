import { SiteHeader } from './site-header';
import { capabilityProfile } from '../src/content/capability-profile';
import releaseVersion from '../release-version.json';

const sourceLabels = {
  SKILL: '当前 Skill',
  'CHAIN-METHOD': '连锁数字化与 AI 方法',
  'PRD-SPEC': '可实施 PRD 规范',
} as const;

const releaseDisplayVersion =
  process.env.NEXT_PUBLIC_RELEASE_VERSION ?? releaseVersion.displayVersion;
const siteBuild = releaseDisplayVersion.match(/\((\d+)\)$/)?.[1] ?? releaseVersion.buildCount;

function getSourceLabel(source: string) {
  return source in sourceLabels
    ? sourceLabels[source as keyof typeof sourceLabels]
    : source;
}

export default function Home() {
  const profile = capabilityProfile;

  return (
    <>
      <a className="skip-link" href="#main-content">
        跳到正文
      </a>
      <SiteHeader publicSkillUrl={profile.links.publicSkill} />

      <main id="main-content">
        <section className="hero" aria-labelledby="hero-title">
          <div className="site-container hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">
                <span aria-hidden="true" />
                {profile.identity.positioning}
              </p>
              <h1 id="hero-title">
                把模糊的企业需求，
                <em>变成可开发、可验收的产品定义。</em>
              </h1>
              <p className="hero-lead">{profile.identity.proposition}</p>
              <div className="hero-actions">
                <a className="button button-primary" href="#capabilities">
                  查看能力地图 <span aria-hidden="true">→</span>
                </a>
                <a
                  className="text-link"
                  href={profile.links.publicSkill}
                  target="_blank"
                  rel="noreferrer"
                >
                  在 GitHub 查看 Skill <span aria-hidden="true">↗</span>
                </a>
              </div>
              <dl className="hero-meta" aria-label="能力档案状态">
                <div>
                  <dt>公开身份</dt>
                  <dd>Leego Design PRDVI</dd>
                </div>
                <div>
                  <dt>专业重点</dt>
                  <dd>企业数字化 · 连锁经营 · AI 产品</dd>
                </div>
                <div>
                  <dt>最后核验</dt>
                  <dd>{profile.verifiedAt}</dd>
                </div>
              </dl>
            </div>

            <div className="hero-system" aria-label="持续学习的产品交付闭环">
              <div className="system-orbit" aria-hidden="true" />
              <ol>
                {profile.deliveryLoop.map((step, index) => (
                  <li key={step.id} className={`system-node node-${index + 1}`}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <strong>{step.label}</strong>
                  </li>
                ))}
              </ol>
              <p>
                <strong>不是一次性交付</strong>
                结果证据回到下一轮判断，方法随业务持续校正。
              </p>
            </div>
          </div>
        </section>

        <section className="statement" aria-labelledby="statement-title">
          <div className="site-container statement-grid">
            <p className="eyebrow eyebrow-on-dark">PRODUCT JUDGEMENT</p>
            <div>
              <h2 id="statement-title">我不只是记录需求。</h2>
              <p>
                企业要的不是更多页面，而是把目标、角色、规则、数据、异常和结果真正连成闭环。
                我会挑战模糊需求、指出权责冲突，也会明确哪些事情现在不该做。
              </p>
            </div>
          </div>
        </section>

        <section id="thinking" className="section" aria-labelledby="thinking-title">
          <div className="site-container">
            <header className="section-heading split-heading">
              <div>
                <p className="eyebrow">THINKING</p>
                <h2 id="thinking-title">产品判断，先把事实放在正确的位置。</h2>
              </div>
              <p>
                每个结论都区分事实、决策、假设和洞察。已知与未知分开，才能让团队知道该开发什么、该验证什么，以及谁有权作决定。
              </p>
            </header>

            <ol className="principle-list">
              {profile.principles.map((principle, index) => (
                <li key={principle.id}>
                  <span className="list-index">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3>{principle.title}</h3>
                    <p>{principle.summary}</p>
                  </div>
                  <small>
                    {getSourceLabel(principle.source)} · {principle.statusLabel}
                  </small>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          id="capabilities"
          className="section capability-section"
          aria-labelledby="capabilities-title"
        >
          <div className="site-container">
            <header className="section-heading capability-heading">
              <div>
                <p className="eyebrow">CAPABILITY MAP</p>
                <h2 id="capabilities-title">七项能力，服务同一个结果。</h2>
              </div>
              <p>
                从需求探索到 Codex 交接，再到上线复盘，能力不是菜单，而是一条能够前后追溯的产品工作链。
              </p>
            </header>

            <div className="capability-list">
              {profile.capabilities.map((capability, index) => (
                <article key={capability.id} id={capability.id}>
                  <span className="list-index">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="capability-main">
                    <h3>{capability.title}</h3>
                    <p>{capability.value}</p>
                    <ul aria-label={`${capability.title}交付内容`}>
                      {capability.deliverables.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="capability-boundary">
                    <span>{getSourceLabel(capability.source)}</span>
                    <p>{capability.boundary}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="method" className="section method-section" aria-labelledby="method-title">
          <div className="site-container method-grid">
            <header className="section-heading method-heading">
              <p className="eyebrow eyebrow-on-dark">WORKING METHOD</p>
              <h2 id="method-title">从一句想法，到一份可交付的产品基线。</h2>
              <p>
                每一步都有输入、判断和结束条件。信息不足可以形成草案，但不会把草案伪装成已经确认。
              </p>
            </header>
            <ol className="workflow-list">
              {profile.workflow.map((step, index) => (
                <li key={step.id}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                  <small>{step.output}</small>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="direction" className="section" aria-labelledby="direction-title">
          <div className="site-container">
            <header className="section-heading split-heading">
              <div>
                <p className="eyebrow">DIRECTION</p>
                <h2 id="direction-title">正在持续深化的方向。</h2>
              </div>
              <p>
                方向不是能力承诺。已验证的方法进入默认判断，仍在学习的内容会保留证据状态和适用边界。
              </p>
            </header>
            <div className="direction-list">
              {profile.directions.map((direction, index) => (
                <article key={direction.id}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <h3>{direction.title}</h3>
                  <p>{direction.summary}</p>
                  <small className={direction.status === 'verified' ? 'verified' : ''}>
                    {direction.statusLabel} · {getSourceLabel(direction.source)}
                  </small>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="learning" className="section learning-section" aria-labelledby="learning-title">
          <div className="site-container learning-grid">
            <div>
              <p className="eyebrow">EVIDENCE & LEARNING</p>
              <h2 id="learning-title">能力会增长，但不会偷偷改写历史。</h2>
              <p className="section-lead">
                新经验先进入待验证区；跨项目证据或用户明确教授后，才成为默认方法。冲突、反例和被淘汰的结论继续保留。
              </p>
              <a
                className="text-link"
                href={profile.links.learningLedger}
                target="_blank"
                rel="noreferrer"
              >
                查看公开学习账本 <span aria-hidden="true">↗</span>
              </a>
            </div>
            <dl className="evidence-grid">
              {profile.evidence.map((item) => (
                <div key={item.id}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                  <p>{item.description}</p>
                  <small>{getSourceLabel(item.source)}</small>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="section trust-section" aria-labelledby="trust-title">
          <div className="site-container trust-grid">
            <div>
              <p className="eyebrow eyebrow-on-jade">TRUST & BOUNDARY</p>
              <h2 id="trust-title">专业，也包括明确说“不”。</h2>
            </div>
            <ul>
              {profile.boundaries.map((boundary) => (
                <li key={boundary.id}>
                  <strong>{boundary.title}</strong>
                  <span>{boundary.summary}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="closing" aria-labelledby="closing-title">
          <div className="site-container closing-inner">
            <p className="eyebrow">PUBLIC SKILL</p>
            <h2 id="closing-title">先看能力地图，再决定要不要把问题交给我。</h2>
            <p>
              这是一个公开、可检查、会持续学习的产品经理 Skill。没有联系表单，也不会制造虚假的咨询入口。
            </p>
            <a className="button button-primary" href="#capabilities">
              返回能力地图 <span aria-hidden="true">↑</span>
            </a>
            <a
              className="plain-public-link"
              href={profile.links.publicSkill}
              target="_blank"
              rel="noreferrer"
            >
              GitHub：jiamo-coder/skills/leego-design-prd
            </a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="site-container">
          <strong>{profile.identity.name}</strong>
          <span>持续学习业务的 AI 产品经理</span>
          <div className="footer-meta">
            <small>公开内容最后核验：{profile.verifiedAt}</small>
            <a href="https://igoodthings.qiaokiai.com/releases">
              Skill v{profile.skillVersion} · L{profile.learningRevision} · Build{' '}
              {siteBuild} · Goodthings 版本总览
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
