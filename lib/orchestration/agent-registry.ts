import { AgentType } from "./types";
import { BaseAgent } from "./base-agent";

export class AgentRegistry {
  private agents = new Map<AgentType, BaseAgent>();

  register(agent: BaseAgent) {
    if (this.agents.has(agent.type)) {
      throw new Error(`Agent already registered: ${agent.type}`);
    }
    this.agents.set(agent.type, agent);
    return this;
  }

  get(type: AgentType) {
    const agent = this.agents.get(type);
    if (!agent) throw new Error(`Agent is not registered: ${type}`);
    return agent;
  }

  list() {
    return [...this.agents.values()].map((agent) => ({
      type: agent.type,
      name: agent.name,
      description: agent.description,
    }));
  }
}
