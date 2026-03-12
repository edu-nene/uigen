import { anthropic } from "@ai-sdk/anthropic";
import {
  LanguageModelV1,
  LanguageModelV1StreamPart,
  LanguageModelV1Message,
} from "@ai-sdk/provider";

const MODEL = "claude-haiku-4-5";

export class MockLanguageModel implements LanguageModelV1 {
  readonly specificationVersion = "v1" as const;
  readonly provider = "mock";
  readonly modelId: string;
  readonly defaultObjectGenerationMode = "tool" as const;

  constructor(modelId: string) {
    this.modelId = modelId;
  }

  private async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private extractUserPrompt(messages: LanguageModelV1Message[]): string {
    // Find the last user message
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role === "user") {
        const content = message.content;
        if (Array.isArray(content)) {
          // Extract text from content parts
          const textParts = content
            .filter((part: any) => part.type === "text")
            .map((part: any) => part.text);
          return textParts.join(" ");
        } else if (typeof content === "string") {
          return content;
        }
      }
    }
    return "";
  }

  private getLastToolResult(messages: LanguageModelV1Message[]): any {
    // Find the last tool message
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "tool") {
        const content = messages[i].content;
        if (Array.isArray(content) && content.length > 0) {
          return content[0];
        }
      }
    }
    return null;
  }

  private async *generateMockStream(
    messages: LanguageModelV1Message[],
    userPrompt: string
  ): AsyncGenerator<LanguageModelV1StreamPart> {
    // Count tool messages to determine which step we're on
    const toolMessageCount = messages.filter((m) => m.role === "tool").length;

    // Determine component type from the original user prompt
    const promptLower = userPrompt.toLowerCase();
    let componentType = "counter";
    let componentName = "Counter";

    if (promptLower.includes("pricing") || promptLower.includes("price") || promptLower.includes("plan")) {
      componentType = "pricing";
      componentName = "PricingCard";
    } else if (promptLower.includes("navbar") || promptLower.includes("navigation") || promptLower.includes("nav bar")) {
      componentType = "navbar";
      componentName = "Navbar";
    } else if (promptLower.includes("hero") || promptLower.includes("landing")) {
      componentType = "hero";
      componentName = "HeroSection";
    } else if (promptLower.includes("dashboard") || promptLower.includes("stats") || promptLower.includes("analytics")) {
      componentType = "dashboard";
      componentName = "Dashboard";
    } else if (promptLower.includes("testimonial") || promptLower.includes("review")) {
      componentType = "testimonial";
      componentName = "TestimonialCard";
    } else if (promptLower.includes("form") || promptLower.includes("contact") || promptLower.includes("login") || promptLower.includes("signup")) {
      componentType = "form";
      componentName = "ContactForm";
    } else if (promptLower.includes("card") || promptLower.includes("product")) {
      componentType = "card";
      componentName = "Card";
    } else if (promptLower.includes("button") || promptLower.includes("btn")) {
      componentType = "button";
      componentName = "ButtonGroup";
    } else if (promptLower.includes("modal") || promptLower.includes("dialog") || promptLower.includes("popup")) {
      componentType = "modal";
      componentName = "Modal";
    } else if (promptLower.includes("table") || promptLower.includes("list") || promptLower.includes("data")) {
      componentType = "table";
      componentName = "DataTable";
    }

    // Step 1: Create component file
    if (toolMessageCount === 1) {
      const text = `I'll create a ${componentName} component for you.`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(25);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_1`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "create",
          path: `/components/${componentName}.jsx`,
          file_text: this.getComponentCode(componentType),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          promptTokens: 50,
          completionTokens: 30,
        },
      };
      return;
    }

    // Step 2: Enhance component
    if (toolMessageCount === 2) {
      const text = `Now let me enhance the component with better styling.`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(25);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_2`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "str_replace",
          path: `/components/${componentName}.jsx`,
          old_str: this.getOldStringForReplace(componentType),
          new_str: this.getNewStringForReplace(componentType),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          promptTokens: 50,
          completionTokens: 30,
        },
      };
      return;
    }

    // Step 3: Create App.jsx
    if (toolMessageCount === 0) {
      const text = `This is a static response. You can place an Anthropic API key in the .env file to use the Anthropic API for component generation. Let me create an App.jsx file to display the component.`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(15);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_3`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "create",
          path: "/App.jsx",
          file_text: this.getAppCode(componentName),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          promptTokens: 50,
          completionTokens: 30,
        },
      };
      return;
    }

    // Step 4: Final summary (no tool call)
    if (toolMessageCount >= 3) {
      const text = `Perfect! I've created:

1. **${componentName}.jsx** - A fully-featured ${componentType} component
2. **App.jsx** - The main app file that displays the component

The component is now ready to use. You can see the preview on the right side of the screen.`;

      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(30);
      }

      yield {
        type: "finish",
        finishReason: "stop",
        usage: {
          promptTokens: 50,
          completionTokens: 50,
        },
      };
      return;
    }
  }

  private getComponentCode(componentType: string): string {
    switch (componentType) {
      case "pricing":
        return `import React from 'react';

const PricingCard = ({
  planName = "Pro",
  price = "29",
  period = "month",
  description = "Everything you need to scale your business.",
  features = [
    "Unlimited projects",
    "Priority support",
    "Advanced analytics",
    "Custom integrations",
    "Team collaboration",
    "99.9% uptime SLA",
  ],
  ctaLabel = "Get Started",
  isPopular = true,
  onSelect,
}) => {
  return (
    <div className={\`relative flex flex-col bg-white rounded-2xl shadow-xl border-2 \${isPopular ? "border-indigo-500" : "border-gray-100"} p-8 transition-transform hover:-translate-y-1 duration-200\`}>
      {isPopular && (
        <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-semibold uppercase tracking-wide px-4 py-1 rounded-full shadow">
          Most Popular
        </span>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{planName}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>

      <div className="flex items-end gap-1 mb-8">
        <span className="text-gray-400 text-lg font-medium">$</span>
        <span className="text-5xl font-extrabold text-gray-900">{price}</span>
        <span className="text-gray-400 text-sm mb-2">/ {period}</span>
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-3 text-sm text-gray-700">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">✓</span>
            {feature}
          </li>
        ))}
      </ul>

      <button
        onClick={onSelect}
        className={\`w-full py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 \${
          isPopular
            ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200"
            : "bg-gray-100 text-gray-800 hover:bg-gray-200"
        }\`}
      >
        {ctaLabel}
      </button>
    </div>
  );
};

export default PricingCard;`;

      case "navbar":
        return `import React, { useState } from 'react';

const Navbar = ({ brand = "Acme Co", links = ["Features", "Pricing", "About", "Blog"] }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">{brand[0]}</span>
            </div>
            <span className="font-bold text-gray-900 text-lg">{brand}</span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            {links.map((link) => (
              <a key={link} href="#" className="text-sm text-gray-600 hover:text-indigo-600 font-medium transition-colors">
                {link}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button className="text-sm text-gray-600 hover:text-gray-900 font-medium px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              Sign in
            </button>
            <button className="text-sm bg-indigo-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
              Get started
            </button>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            {isOpen ? "✕" : "☰"}
          </button>
        </div>

        {isOpen && (
          <div className="md:hidden border-t border-gray-100 py-4 space-y-1">
            {links.map((link) => (
              <a key={link} href="#" className="block px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg font-medium transition-colors">
                {link}
              </a>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;`;

      case "hero":
        return `import React from 'react';

const HeroSection = ({
  badge = "New · Just launched v2.0",
  title = "Build stunning UIs",
  highlight = "10x faster",
  subtitle = "A modern component library for React that lets you ship beautiful interfaces without starting from scratch.",
  ctaPrimary = "Start for free",
  ctaSecondary = "View demo",
}) => {
  return (
    <section className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center">
      <div className="max-w-4xl mx-auto px-6 py-24 text-center">
        <span className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
          {badge}
        </span>

        <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
          {title}{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
            {highlight}
          </span>
        </h1>

        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          {subtitle}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="px-8 py-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all duration-200 hover:-translate-y-0.5">
            {ctaPrimary}
          </button>
          <button className="px-8 py-4 bg-white text-gray-700 font-semibold rounded-xl border border-gray-200 hover:border-indigo-300 hover:text-indigo-600 transition-all duration-200">
            {ctaSecondary} →
          </button>
        </div>

        <p className="mt-6 text-sm text-gray-400">No credit card required · Free forever plan</p>
      </div>
    </section>
  );
};

export default HeroSection;`;

      case "dashboard":
        return `import React from 'react';

const StatCard = ({ label, value, change, positive }) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
    <p className="text-sm text-gray-500 font-medium mb-1">{label}</p>
    <p className="text-3xl font-extrabold text-gray-900 mb-2">{value}</p>
    <span className={\`text-xs font-semibold px-2 py-0.5 rounded-full \${positive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}\`}>
      {positive ? "▲" : "▼"} {change}
    </span>
  </div>
);

const Dashboard = () => {
  const stats = [
    { label: "Total Revenue", value: "$48,295", change: "12.5% vs last month", positive: true },
    { label: "Active Users", value: "3,842", change: "8.1% vs last month", positive: true },
    { label: "Churn Rate", value: "2.4%", change: "0.3% vs last month", positive: false },
    { label: "Avg. Session", value: "4m 32s", change: "1.2% vs last month", positive: true },
  ];

  const recentActivity = [
    { user: "Sarah Chen", action: "Upgraded to Pro", time: "2 min ago", avatar: "SC" },
    { user: "James Rivera", action: "Submitted a refund", time: "18 min ago", avatar: "JR" },
    { user: "Ana Martínez", action: "Created new project", time: "1 hr ago", avatar: "AM" },
    { user: "David Kim", action: "Joined via referral", time: "3 hr ago", avatar: "DK" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome back — here's what's happening today.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((s) => <StatCard key={s.label} {...s} />)}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <ul className="divide-y divide-gray-50">
            {recentActivity.map((item) => (
              <li key={item.user} className="flex items-center gap-4 py-3">
                <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {item.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{item.user}</p>
                  <p className="text-xs text-gray-500 truncate">{item.action}</p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">{item.time}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;`;

      case "testimonial":
        return `import React from 'react';

const TestimonialCard = ({
  quote = "This tool completely transformed how our team ships UI. We went from days to hours. I can't imagine going back.",
  author = "Sofia Reyes",
  role = "Lead Designer at Stripe",
  rating = 5,
  avatar = "SR",
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 max-w-lg">
      <div className="flex gap-1 mb-4">
        {Array.from({ length: rating }).map((_, i) => (
          <span key={i} className="text-amber-400 text-lg">★</span>
        ))}
      </div>

      <blockquote className="text-gray-700 text-base leading-relaxed mb-6">
        "{quote}"
      </blockquote>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
          {avatar}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{author}</p>
          <p className="text-xs text-gray-500">{role}</p>
        </div>
      </div>
    </div>
  );
};

export default TestimonialCard;`;

      case "button":
        return `import React from 'react';

const ButtonGroup = () => {
  return (
    <div className="flex flex-col gap-8 p-8">
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Variants</p>
        <div className="flex flex-wrap gap-3">
          <button className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            Primary
          </button>
          <button className="px-5 py-2.5 bg-white text-gray-700 text-sm font-semibold rounded-lg border border-gray-200 hover:border-indigo-400 hover:text-indigo-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300">
            Secondary
          </button>
          <button className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500">
            Success
          </button>
          <button className="px-5 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500">
            Danger
          </button>
          <button disabled className="px-5 py-2.5 bg-gray-100 text-gray-400 text-sm font-semibold rounded-lg cursor-not-allowed">
            Disabled
          </button>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Sizes</p>
        <div className="flex flex-wrap items-center gap-3">
          <button className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-md hover:bg-indigo-700 transition-colors">Small</button>
          <button className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors">Medium</button>
          <button className="px-7 py-3.5 bg-indigo-600 text-white text-base font-semibold rounded-xl hover:bg-indigo-700 transition-colors">Large</button>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">With Icon</p>
        <div className="flex flex-wrap gap-3">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
            <span>⚡</span> Get started
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 text-sm font-semibold rounded-lg border border-gray-200 hover:border-indigo-400 transition-colors">
            <span>↗</span> Learn more
          </button>
        </div>
      </div>
    </div>
  );
};

export default ButtonGroup;`;

      case "modal":
        return `import React, { useState } from 'react';

const Modal = ({ title = "Confirm deletion", body = "Are you sure you want to delete this item? This action cannot be undone.", confirmLabel = "Delete", cancelLabel = "Cancel" }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <button
        onClick={() => setIsOpen(true)}
        className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 shadow-md transition-colors"
      >
        Open Modal
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600 text-lg">
                ⚠
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">{title}</h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">{body}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-colors"
              >
                {cancelLabel}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 py-2.5 px-4 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors shadow-sm"
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Modal;`;

      case "table":
        return `import React, { useState } from 'react';

const data = [
  { id: 1, name: "Alice Johnson", email: "alice@example.com", role: "Admin", status: "Active" },
  { id: 2, name: "Bob Martinez", email: "bob@example.com", role: "Editor", status: "Active" },
  { id: 3, name: "Carol White", email: "carol@example.com", role: "Viewer", status: "Inactive" },
  { id: 4, name: "David Kim", email: "david@example.com", role: "Editor", status: "Active" },
  { id: 5, name: "Eva Müller", email: "eva@example.com", role: "Admin", status: "Pending" },
];

const statusStyles = {
  Active: "bg-emerald-100 text-emerald-700",
  Inactive: "bg-gray-100 text-gray-500",
  Pending: "bg-amber-100 text-amber-700",
};

const DataTable = () => {
  const [search, setSearch] = useState("");
  const filtered = data.filter(
    (r) => r.name.toLowerCase().includes(search.toLowerCase()) || r.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Team Members</h2>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} users found</p>
        </div>
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-sm px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 w-48"
        />
      </div>
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <th className="px-6 py-3 text-left">Name</th>
            <th className="px-6 py-3 text-left">Email</th>
            <th className="px-6 py-3 text-left">Role</th>
            <th className="px-6 py-3 text-left">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {filtered.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {row.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <span className="text-sm font-medium text-gray-900">{row.name}</span>
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">{row.email}</td>
              <td className="px-6 py-4 text-sm text-gray-700">{row.role}</td>
              <td className="px-6 py-4">
                <span className={\`text-xs font-semibold px-2.5 py-1 rounded-full \${statusStyles[row.status]}\`}>
                  {row.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;`;

      case "form":
        return `import React, { useState } from 'react';

const ContactForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    // Handle form submission here
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Contact Us</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
            Message
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
        >
          Send Message
        </button>
      </form>
    </div>
  );
};

export default ContactForm;`;

      case "card":
        return `import React from 'react';

const Card = ({ 
  title = "Welcome to Our Service", 
  description = "Discover amazing features and capabilities that will transform your experience.",
  imageUrl,
  actions 
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {imageUrl && (
        <img 
          src={imageUrl} 
          alt={title}
          className="w-full h-48 object-cover"
        />
      )}
      <div className="p-6">
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">{description}</p>
        {actions && (
          <div className="mt-4">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default Card;`;

      default:
        return `import { useState } from 'react';

const Counter = () => {
  const [count, setCount] = useState(0);

  const increment = () => {
    setCount(count + 1);
  };

  const decrement = () => {
    setCount(count - 1);
  };

  const reset = () => {
    setCount(0);
  };

  return (
    <div className="flex flex-col items-center p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Counter</h2>
      <div className="text-4xl font-bold mb-6">{count}</div>
      <div className="flex gap-4">
        <button 
          onClick={decrement}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Decrease
        </button>
        <button 
          onClick={reset}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
        >
          Reset
        </button>
        <button 
          onClick={increment}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          Increase
        </button>
      </div>
    </div>
  );
};

export default Counter;`;
    }
  }

  private getOldStringForReplace(componentType: string): string {
    switch (componentType) {
      case "form":
        return "    console.log('Form submitted:', formData);";
      case "card":
        return '      <div className="p-6">';
      case "pricing":
        return "  isPopular = true,";
      case "dashboard":
        return '    { label: "Churn Rate", value: "2.4%", change: "0.3% vs last month", positive: false },';
      case "navbar":
        return '    links = ["Features", "Pricing", "About", "Blog"]';
      default:
        return "  const increment = () => setCount(count + 1);";
    }
  }

  private getNewStringForReplace(componentType: string): string {
    switch (componentType) {
      case "form":
        return "    console.log('Form submitted:', formData);\n    alert('Thank you! We\\'ll get back to you soon.');";
      case "card":
        return '      <div className="p-6 hover:bg-gray-50 transition-colors">';
      case "pricing":
        return "  isPopular = false,";
      case "dashboard":
        return '    { label: "Churn Rate", value: "2.1%", change: "0.3% vs last month", positive: true },';
      case "navbar":
        return '    links = ["Features", "Pricing", "Docs", "Blog", "Contact"]';
      default:
        return "  const increment = () => setCount(prev => prev + 1);";
    }
  }

  private getAppCode(componentName: string): string {
    const wrappers: Record<string, string> = {
      PricingCard: `import PricingCard from '@/components/PricingCard';

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <PricingCard />
      </div>
    </div>
  );
}`,
      Navbar: `import Navbar from '@/components/Navbar';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-16">
        <p className="text-gray-400 text-center text-sm">Page content goes here</p>
      </div>
    </div>
  );
}`,
      HeroSection: `import HeroSection from '@/components/HeroSection';

export default function App() {
  return <HeroSection />;
}`,
      Dashboard: `import Dashboard from '@/components/Dashboard';

export default function App() {
  return <Dashboard />;
}`,
      TestimonialCard: `import TestimonialCard from '@/components/TestimonialCard';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <TestimonialCard />
    </div>
  );
}`,
      DataTable: `import DataTable from '@/components/DataTable';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <DataTable />
    </div>
  );
}`,
      Card: `import Card from '@/components/Card';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <Card
          title="Wireless Noise-Cancelling Headphones"
          description="Studio-quality sound with up to 30h battery life and a foldable design built for travel."
          actions={
            <button className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm">
              Add to cart — $299
            </button>
          }
        />
      </div>
    </div>
  );
}`,
    };

    if (wrappers[componentName]) return wrappers[componentName];

    return `import ${componentName} from '@/components/${componentName}';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <${componentName} />
    </div>
  );
}`;
  }

  async doGenerate(
    options: Parameters<LanguageModelV1["doGenerate"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV1["doGenerate"]>>> {
    const userPrompt = this.extractUserPrompt(options.prompt);

    // Collect all stream parts
    const parts: LanguageModelV1StreamPart[] = [];
    for await (const part of this.generateMockStream(
      options.prompt,
      userPrompt
    )) {
      parts.push(part);
    }

    // Build response from parts
    const textParts = parts
      .filter((p) => p.type === "text-delta")
      .map((p) => (p as any).textDelta)
      .join("");

    const toolCalls = parts
      .filter((p) => p.type === "tool-call")
      .map((p) => ({
        toolCallType: "function" as const,
        toolCallId: (p as any).toolCallId,
        toolName: (p as any).toolName,
        args: (p as any).args,
      }));

    // Get finish reason from finish part
    const finishPart = parts.find((p) => p.type === "finish") as any;
    const finishReason = finishPart?.finishReason || "stop";

    return {
      text: textParts,
      toolCalls,
      finishReason: finishReason as any,
      usage: {
        promptTokens: 100,
        completionTokens: 200,
      },
      warnings: [],
      rawCall: {
        rawPrompt: options.prompt,
        rawSettings: {
          maxTokens: options.maxTokens,
          temperature: options.temperature,
        },
      },
    };
  }

  async doStream(
    options: Parameters<LanguageModelV1["doStream"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV1["doStream"]>>> {
    const userPrompt = this.extractUserPrompt(options.prompt);
    const self = this;

    const stream = new ReadableStream<LanguageModelV1StreamPart>({
      async start(controller) {
        try {
          const generator = self.generateMockStream(options.prompt, userPrompt);
          for await (const chunk of generator) {
            controller.enqueue(chunk);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return {
      stream,
      warnings: [],
      rawCall: {
        rawPrompt: options.prompt,
        rawSettings: {},
      },
      rawResponse: { headers: {} },
    };
  }
}

export function getLanguageModel() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    console.log("No ANTHROPIC_API_KEY found, using mock provider");
    return new MockLanguageModel("mock-claude-sonnet-4-0");
  }

  return anthropic(MODEL);
}
