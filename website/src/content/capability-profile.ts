import { profileStats } from './profile-stats.generated';

export type EvidenceStatus = 'verified' | 'learning';
export type SourceReference = 'SKILL' | 'CHAIN-METHOD' | 'PRD-SPEC' | `GL-${number}`;

export interface PublicClaim {
  id: string;
  title: string;
  summary: string;
  source: SourceReference;
  status: EvidenceStatus;
  statusLabel: string;
  boundary: string;
}

export interface Capability {
  id: string;
  title: string;
  value: string;
  deliverables: string[];
  boundary: string;
  source: SourceReference;
}

export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  output: string;
}

export interface EvidenceItem {
  id: string;
  label: string;
  value: string;
  description: string;
  source: SourceReference;
}

export interface CapabilityProfile {
  identity: { name: string; positioning: string; proposition: string };
  skillVersion: string;
  learningRevision: number;
  principles: PublicClaim[];
  capabilities: Capability[];
  workflow: WorkflowStep[];
  directions: PublicClaim[];
  evidence: EvidenceItem[];
  boundaries: PublicClaim[];
  deliveryLoop: { id: string; label: string }[];
  links: { publicSkill: string; learningLedger: string };
  verifiedAt: string;
}

const verified = '已验证方法';
const learning = '持续学习中';

export const capabilityProfile: CapabilityProfile = {
  identity: {
    name: 'Leego Design PRDVI',
    positioning: '成长型 AI 产品经理',
    proposition:
      '持续理解企业业务，诊断连锁数字化与 AI 化问题，把需求、规则、权限、数据、异常和验收组织成 Codex 可以实施的产品基线。',
  },
  skillVersion: profileStats.skillVersion,
  learningRevision: profileStats.learningRevision,
  principles: [
    {
      id: 'principle-problem-first',
      title: '问题先于功能',
      summary: '先确认为什么现在做、当前损失和期望结果，再讨论页面、按钮或模型。',
      source: 'SKILL',
      status: 'verified',
      statusLabel: verified,
      boundary: '不把用户提出的方案直接等同于最终产品决策。',
    },
    {
      id: 'principle-evidence-layering',
      title: '事实、决策、假设、洞察分层',
      summary: '让每个判断可以被追溯、验证、推翻和替代，避免推测变成隐性规则。',
      source: 'GL-001',
      status: 'verified',
      statusLabel: verified,
      boundary: '一次访谈和一个项目经验不会自动成为通用原则。',
    },
    {
      id: 'principle-loop',
      title: '业务动作必须闭环',
      summary: '动作之后必须有可见状态、责任角色、数据证据、异常恢复和最终结果。',
      source: 'PRD-SPEC',
      status: 'verified',
      statusLabel: verified,
      boundary: '不把“保存成功”当成业务任务已经完成。',
    },
    {
      id: 'principle-ai-governance',
      title: 'AI 必须证明价值、可评测、可治理',
      summary: '先定义非 AI 基线、错误后果、人机权责和降级，再决定是否接入模型。',
      source: 'GL-003',
      status: 'verified',
      statusLabel: verified,
      boundary: 'AI 不替代依法必须由人完成或显著影响个人权益的最终决定。',
    },
  ],
  capabilities: [
    {
      id: 'capability-discovery',
      title: '需求探索与产品判断',
      value: '把零散想法还原成业务问题、目标、角色、边界和最值得验证的矛盾。',
      deliverables: ['需求地图', '高价值问题', '范围与优先级', '决策建议'],
      boundary: '不在关键信息未知时伪装成确定方案。',
      source: 'SKILL',
    },
    {
      id: 'capability-prd',
      title: 'B 端 PRD 与验收基线',
      value: '用稳定 ID 组织流程、规则、权限、数据、异常和验收，让文档不依赖聊天记录也能开发。',
      deliverables: ['Markdown PRD', '状态迁移', '权限矩阵', '验收标准'],
      boundary: '未经确认不发明接口、数据库表或性能数字。',
      source: 'PRD-SPEC',
    },
    {
      id: 'capability-chain',
      title: '连锁企业数字化诊断',
      value: '识别总部、区域、门店和加盟商的权责，找到主数据、流程闭环与规模复制的能力断层。',
      deliverables: ['成熟度诊断', '价值链地图', '主数据治理', '试点与复制'],
      boundary: '不把连锁企业简化为多门店版单体企业。',
      source: 'GL-002',
    },
    {
      id: 'capability-ai',
      title: '企业 AI 场景设计',
      value: '在规则、预测、视觉、生成式 AI、RAG 和智能体之间选择合适方案，并定义评测与治理。',
      deliverables: ['非 AI 基线', '评测体系', '人机权责', '降级与监控'],
      boundary: '不把接入大模型当作产品完成。',
      source: 'GL-003',
    },
    {
      id: 'capability-foundation',
      title: '权限、数据与领域底座',
      value: '明确角色、组织范围、主数据权威源、业务事件、指标口径和跨系统责任。',
      deliverables: ['领域模型', '数据范围', '事件链路', '集成边界'],
      boundary: '只深入当前业务真正需要的企业级能力。',
      source: 'CHAIN-METHOD',
    },
    {
      id: 'capability-handoff',
      title: '面向 Codex 的实施交接',
      value: '把产品范围、P0/P1 需求、规则、异常、依赖和阻塞压缩成工程可执行导航。',
      deliverables: ['实施摘要', '需求追踪', '仓库约束', '发布边界'],
      boundary: '产品摘要不能取代完整 PRD 和仓库事实。',
      source: 'SKILL',
    },
    {
      id: 'capability-learning',
      title: '业务记忆与项目复盘学习',
      value: '保留项目事实与决策历史，把可复用经验脱敏后登记、验证、冲突处理和升级。',
      deliverables: ['业务记忆', '决策记录', '学习账本', '认知增量'],
      boundary: '全局 Skill 不保存客户专有知识、个人信息或原始业务数据。',
      source: 'GL-001',
    },
  ],
  workflow: [
    {
      id: 'workflow-understand',
      title: '理解业务',
      description: '识别现状、参与者、目标、证据和为什么现在必须改变。',
      output: '输出：当前理解、事实与关键未知项',
    },
    {
      id: 'workflow-diagnose',
      title: '诊断矛盾',
      description: '找出流程断点、权责冲突、口径不一、伪智能和投入产出失衡。',
      output: '输出：问题优先级、方案选项与取舍',
    },
    {
      id: 'workflow-define',
      title: '定义产品',
      description: '明确范围、状态、规则、权限、数据、异常和非功能约束。',
      output: '输出：可评审 PRD 与待确认项',
    },
    {
      id: 'workflow-deliver',
      title: '交付验证',
      description: '让每个 P0/P1 需求都有测试语义，并交给 Codex 读取真实仓库实施。',
      output: '输出：可开发基线与 Codex 实施摘要',
    },
    {
      id: 'workflow-learn',
      title: '沉淀学习',
      description: '用上线、验收和运营结果验证或推翻假设，保留冲突与替代关系。',
      output: '输出：项目认知增量与脱敏方法升级',
    },
  ],
  directions: [
    {
      id: 'direction-chain-ai',
      title: '连锁企业 AI 化',
      summary: '让 AI 进入门店经营、供应链、人员成长与加盟治理，但始终受权责和业务结果约束。',
      source: 'CHAIN-METHOD',
      status: 'verified',
      statusLabel: verified,
      boundary: '按业务域判断成熟度，不追求一步到位。',
    },
    {
      id: 'direction-memory',
      title: '企业业务记忆',
      summary: '把长期协作中的事实、决策、假设和结果变成团队可检查、可修正的知识资产。',
      source: 'GL-001',
      status: 'verified',
      statusLabel: verified,
      boundary: '不声称拥有不可见或不可纠正的长期记忆。',
    },
    {
      id: 'direction-agent',
      title: '人机协同与智能体治理',
      summary: '研究从生成草稿到受控执行的自动化等级、工具白名单、确认、审计和中止机制。',
      source: 'GL-003',
      status: 'learning',
      statusLabel: learning,
      boundary: '高风险动作必须由人承担最终责任。',
    },
    {
      id: 'direction-handoff',
      title: 'PRD 到工程交付',
      summary: '继续缩短产品语言与 Codex 实施之间的距离，同时避免让工程代理猜业务规则。',
      source: 'PRD-SPEC',
      status: 'verified',
      statusLabel: verified,
      boundary: '仓库事实优先于产品经理的技术假设。',
    },
    {
      id: 'direction-visual',
      title: '产品能力可视化',
      summary: '让能力、证据、方向和边界通过专业 UI 规范形成可理解、可访问的公开表达。',
      source: 'GL-019',
      status: 'verified',
      statusLabel: verified,
      boundary: '视觉表达不复制品牌，也不替代证据。',
    },
  ],
  evidence: [
    {
      id: 'evidence-learning',
      label: '脱敏学习记录',
      value: String(profileStats.total),
      description: `${profileStats.verified} 条已验证方法，${profileStats.pending} 条待验证经验；状态由账本生成，不宣称客户成果。`,
      source: 'GL-001',
    },
    {
      id: 'evidence-maturity',
      label: '连锁数字化成熟度阶段',
      value: '5',
      description: '从交易信息化到 AI 重塑流程，按业务域寻找最短能力断层。',
      source: 'CHAIN-METHOD',
    },
    {
      id: 'evidence-value-chain',
      label: '连锁价值链业务域',
      value: '9',
      description: '覆盖拓店、商品、供应链、门店、交易、会员、人员、财务与加盟治理。',
      source: 'CHAIN-METHOD',
    },
    {
      id: 'evidence-traceability',
      label: '需求到验收追踪',
      value: 'P0 / P1',
      description: '用场景、需求、规则和验收 ID 建立可开发基线，不以“功能正常”作为验收。',
      source: 'PRD-SPEC',
    },
  ],
  boundaries: [
    {
      id: 'boundary-facts',
      title: '不把猜测当事实',
      summary: '未知内容标记为假设或待确认，关键冲突交给有权决策者。',
      source: 'SKILL',
      status: 'verified',
      statusLabel: verified,
      boundary: '适用于全部产品工作。',
    },
    {
      id: 'boundary-ai',
      title: '不让 AI 越权决策',
      summary: '建议、生成和自动执行采用不同权限、证据和审计强度。',
      source: 'GL-003',
      status: 'verified',
      statusLabel: verified,
      boundary: '涉及个人权益时提供人工复核。',
    },
    {
      id: 'boundary-privacy',
      title: '不泄露客户知识',
      summary: '项目事实留在项目内，全局与官网只保存脱敏、抽象的方法。',
      source: 'GL-001',
      status: 'verified',
      statusLabel: verified,
      boundary: '不公开客户、个人、简历、原始数据和凭据。',
    },
    {
      id: 'boundary-trust',
      title: '不制造社会证明',
      summary: '没有真实联系、案例、数据和授权时就明确不展示。',
      source: 'GL-019',
      status: 'verified',
      statusLabel: verified,
      boundary: '官网没有假表单、假成功或虚构客户。',
    },
  ],
  deliveryLoop: [
    { id: 'loop-problem', label: '业务问题' },
    { id: 'loop-judgement', label: '产品判断' },
    { id: 'loop-prd', label: 'PRD' },
    { id: 'loop-codex', label: 'Codex 实施' },
    { id: 'loop-evidence', label: '结果证据' },
    { id: 'loop-learning', label: '沉淀学习' },
  ],
  links: {
    publicSkill: 'https://github.com/jiamo-coder/skills/tree/main/leego-design-prd',
    learningLedger:
      'https://github.com/jiamo-coder/skills/blob/main/leego-design-prd/references/learning-ledger.md',
  },
  verifiedAt: profileStats.verifiedAt,
};
