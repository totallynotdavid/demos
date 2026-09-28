import type { Challenge, EvaluationResult, Goal, Level, Skill } from "./types";

// Simulated delay for realistic UX
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Roadmap skill banks per goal
const skillBanks: Record<Goal, Array<{ name: string; description: string }>> = {
  "get-a-job": [
    {
      name: "HTML & Semantic Markup",
      description:
        "Structure web pages with semantic elements and accessibility best practices",
    },
    {
      name: "CSS Layout Systems",
      description: "Master Flexbox, Grid, and responsive design patterns",
    },
    {
      name: "JavaScript Fundamentals",
      description:
        "Core language concepts: closures, promises, prototypes, event loop",
    },
    {
      name: "TypeScript",
      description:
        "Static typing, interfaces, generics, and type-safe patterns",
    },
    {
      name: "React Core",
      description:
        "Component lifecycle, hooks, state management, and rendering",
    },
    {
      name: "API Integration",
      description:
        "REST APIs, fetch/axios, error handling, and data fetching patterns",
    },
    {
      name: "Git & Version Control",
      description:
        "Branching strategies, pull requests, rebasing, and collaboration",
    },
    {
      name: "Testing Fundamentals",
      description:
        "Unit tests with Jest, integration tests, and TDD methodology",
    },
    {
      name: "System Design Basics",
      description:
        "Architecture patterns, caching, databases, and scalability concepts",
    },
    {
      name: "Interview Patterns",
      description:
        "Common coding patterns, Big-O analysis, and problem-solving approaches",
    },
  ],
  "learn-a-new-stack": [
    {
      name: "Rust Fundamentals",
      description:
        "Ownership, borrowing, lifetimes, and memory safety without GC",
    },
    {
      name: "Solana Architecture",
      description:
        "Accounts model, programs, transactions, and the Solana runtime",
    },
    {
      name: "Anchor Framework",
      description:
        "Build Solana programs with Anchor: PDAs, CPIs, and error handling",
    },
    {
      name: "Smart Contract Security",
      description:
        "Common vulnerabilities, reentrancy, overflow, and audit patterns",
    },
    {
      name: "Token Standards",
      description: "SPL tokens, NFTs, metadata, and token extensions",
    },
    {
      name: "DApp Frontend",
      description:
        "Wallet adapters, transaction signing, and on-chain data fetching",
    },
    {
      name: "Testing On-Chain",
      description:
        "Bankrun, local validators, and integration testing for Solana programs",
    },
    {
      name: "DeFi Primitives",
      description:
        "AMMs, lending protocols, oracles, and composability patterns",
    },
    {
      name: "Indexing & Data",
      description:
        "Geyser plugins, Helius, and building real-time data pipelines",
    },
    {
      name: "Production Deployment",
      description:
        "Mainnet deployment, upgrades, monitoring, and incident response",
    },
  ],
  specialize: [
    {
      name: "Advanced TypeScript",
      description:
        "Conditional types, mapped types, template literals, and type gymnastics",
    },
    {
      name: "Compiler Design",
      description:
        "Lexing, parsing, ASTs, and building domain-specific languages",
    },
    {
      name: "Performance Engineering",
      description:
        "Profiling, memory analysis, rendering optimization, and benchmarking",
    },
    {
      name: "Distributed Systems",
      description: "Consensus algorithms, CAP theorem, eventual consistency",
    },
    {
      name: "Cryptography Basics",
      description:
        "Hashing, digital signatures, key exchange, and zero-knowledge proofs",
    },
    {
      name: "Database Internals",
      description: "B-trees, WAL, query planning, and storage engine design",
    },
    {
      name: "Networking Protocols",
      description: "TCP/IP deep dive, HTTP/2, WebSockets, and gRPC",
    },
    {
      name: "Observability",
      description: "Distributed tracing, metrics, structured logging, and SLOs",
    },
    {
      name: "Security Engineering",
      description:
        "Threat modeling, OWASP, supply chain security, and hardening",
    },
    {
      name: "Technical Leadership",
      description:
        "Architecture decisions, RFC writing, mentoring, and tech debt strategy",
    },
  ],
};

// Challenge banks per skill (simplified — a real app would use AI)
const challengeBanks: Record<string, Record<Level, string>> = {
  "HTML & Semantic Markup": {
    junior:
      "Create a semantic HTML structure for a blog post page. Include: header with nav, main content with article, aside for related posts, and footer. Explain why you chose each semantic element.",
    mid: "Refactor this div-soup into semantic HTML and add ARIA attributes for a modal dialog that contains a form with validation messages. Explain the accessibility tree impact.",
    senior:
      "Design the HTML structure for a complex dashboard with live-updating widgets. Address: landmark regions, live regions for real-time data, focus management between widgets, and screen reader navigation strategy.",
  },
  "CSS Layout Systems": {
    junior:
      "Using CSS Grid, create a responsive card layout: 1 column on mobile, 2 on tablet, 3 on desktop. Cards should have equal heights.",
    mid: "Build a Holy Grail layout using CSS Grid with a sticky header, scrollable sidebar, and main content area. The sidebar should collapse to a drawer on mobile.",
    senior:
      "Implement a masonry-style layout using only CSS Grid (no JavaScript). Handle dynamic content heights and maintain visual rhythm. Explain browser support considerations.",
  },
  "JavaScript Fundamentals": {
    junior:
      "Write a function `debounce(fn, delay)` that delays invoking fn until after delay ms have elapsed since the last call. Show a usage example with a search input.",
    mid: "Implement a simple Promise.all polyfill. It should handle both resolved and rejected promises correctly. Include error handling for non-promise values.",
    senior:
      "Build a cancellable async task queue that processes max N tasks concurrently, supports priority ordering, and allows cancellation of pending tasks. Demonstrate with example usage.",
  },
  TypeScript: {
    junior:
      "Define TypeScript interfaces for a REST API response: a paginated list of users where each user has an id, name, email, and optional avatar URL. Create a fetch function with proper types.",
    mid: "Create a type-safe event emitter class using TypeScript generics. It should enforce that listeners match the event type signature and support `.on()`, `.off()`, and `.emit()` methods.",
    senior:
      "Implement a type-safe SQL query builder using template literal types. The builder should validate table names, column names, and WHERE clause operators at compile time.",
  },
  "React Core": {
    junior:
      "Build a controlled form component with name and email fields, validation, and a submit handler. Use useState for form state and display inline error messages.",
    mid: "Create a custom hook `useAsync` that handles loading, error, and data states for async operations. Include cancellation on unmount and a retry mechanism.",
    senior:
      "Design a compound component pattern (like Radix) for a Select component. It should support controlled/uncontrolled modes, keyboard navigation, and render props for custom rendering.",
  },
  "API Integration": {
    junior:
      "Write a function that fetches data from an API endpoint, handles loading and error states, and implements a simple retry logic (max 3 attempts with 1-second delays).",
    mid: "Implement an API client with request/response interceptors, automatic token refresh, request deduplication, and a caching layer with TTL expiration.",
    senior:
      "Design a data synchronization layer that handles offline-first updates with optimistic mutations, conflict resolution using vector clocks, and background sync when connectivity returns.",
  },
  "Git & Version Control": {
    junior:
      "Explain the difference between `git merge` and `git rebase`. When would you use each? Write the commands to rebase a feature branch onto main and resolve a conflict.",
    mid: "You discover a bug was introduced sometime in the last 50 commits. Explain how to use `git bisect` to find the exact commit. Write the complete workflow including the automation script.",
    senior:
      "Design a Git workflow for a team of 20 developers with: feature branches, release branches, hotfix process, and automated changelog generation. Address merge conflicts strategy and CI/CD integration.",
  },
  "Testing Fundamentals": {
    junior:
      "Write unit tests for a `calculateDiscount(price, discountPercent)` function. Cover: normal cases, edge cases (0%, 100%), and invalid inputs. Use Jest assertions.",
    mid: "Write integration tests for a user registration flow that involves: form validation, API call, success redirect, and error handling. Mock only the HTTP layer.",
    senior:
      "Design a testing strategy for a real-time collaborative editor. Address: unit tests for CRDT operations, integration tests for sync, E2E tests for multi-user scenarios, and performance regression tests.",
  },
  "System Design Basics": {
    junior:
      "Design a URL shortener. Describe: the data model, the shortening algorithm, the redirect flow, and how you would handle analytics tracking.",
    mid: "Design a real-time notification system. Address: push vs pull, WebSocket management, message ordering, delivery guarantees, and handling 100K concurrent users.",
    senior:
      "Design a distributed rate limiter that works across multiple server instances. Address: consistency vs availability tradeoffs, sliding window vs token bucket, and failure modes.",
  },
  "Interview Patterns": {
    junior:
      "Given an array of integers, find two numbers that add up to a target sum. Explain your approach, write the solution, and analyze time/space complexity.",
    mid: "Implement an LRU cache with O(1) get and put operations. Explain the data structure choice, handle edge cases, and discuss how this pattern applies in real systems.",
    senior:
      "Design and implement a text autocomplete system that handles: prefix matching, ranking by frequency, fuzzy matching for typos, and efficient memory usage for a dictionary of 1M words.",
  },
  // Learn a new stack
  "Rust Fundamentals": {
    junior:
      "Explain ownership and borrowing in Rust with a code example. Show what happens when you try to use a moved value and how to fix it with references.",
    mid: "Implement a generic linked list in Rust. Handle ownership correctly, implement Iterator trait, and explain why Box is needed for recursive types.",
    senior:
      "Build a thread-safe cache using Rust with interior mutability. Compare Arc<Mutex<T>> vs Arc<RwLock<T>> approaches and discuss when each is appropriate.",
  },
  "Solana Architecture": {
    junior:
      "Explain the Solana account model. What is the difference between a program account and a data account? How does rent work?",
    mid: "Describe how a Solana transaction is structured. Explain: instructions, signers, accounts list ordering, and how the runtime validates a transaction before execution.",
    senior:
      "Design the account structure for an on-chain order book. Address: data packing, PDA derivation strategy, concurrent access patterns, and compute budget optimization.",
  },
  "Anchor Framework": {
    junior:
      "Write an Anchor program with a single `initialize` instruction that creates a counter account and sets it to 0. Include the account struct and context.",
    mid: "Build an Anchor program for a simple escrow: seller deposits tokens, buyer pays SOL, and a third instruction releases tokens to buyer and SOL to seller. Use PDAs for the vault.",
    senior:
      "Implement a governance program in Anchor with: proposal creation, weighted voting based on token holdings, timelock execution, and emergency cancellation by a guardian multisig.",
  },
  "Smart Contract Security": {
    junior:
      "What is a reentrancy attack? Explain with an example and describe the checks-effects-interactions pattern to prevent it.",
    mid: "Audit this Solana program snippet and identify all vulnerabilities: missing signer checks, account validation issues, and arithmetic overflow risks. Suggest fixes for each.",
    senior:
      "Design a security framework for a DeFi protocol. Cover: formal verification approach, invariant testing, economic attack vectors (flash loans, oracle manipulation), and incident response procedures.",
  },
  "Token Standards": {
    junior:
      "Explain the SPL Token standard. What accounts are involved when minting a token? Describe the relationship between mint, token account, and owner.",
    mid: "Implement a token vesting schedule using SPL tokens. Design the account structure for: cliff period, linear vesting, and early termination by an authority.",
    senior:
      "Design a token extension system using Token-2022. Implement: transfer fees, permanent delegate, confidential transfers, and explain the tradeoffs of each extension.",
  },
  "DApp Frontend": {
    junior:
      "Explain how wallet connection works in a Solana DApp. What is the role of the wallet adapter? Write the code to connect a wallet and display the public key.",
    mid: "Build a React hook that sends a Solana transaction, handles wallet signing, monitors confirmation, and manages loading/error/success states. Include retry logic.",
    senior:
      "Architect a DApp that handles: multiple simultaneous transactions, versioned transactions, priority fees based on network congestion, and transaction simulation before submission.",
  },
  "Testing On-Chain": {
    junior:
      "Write a basic test for a Solana program using the Anchor testing framework. Test the initialization of an account and verify the stored data.",
    mid: "Create an integration test suite that tests a multi-instruction flow: initialize, deposit, and withdraw. Use bankrun for fast local testing and verify all account state changes.",
    senior:
      "Build a fuzzing framework for a Solana program. Generate random valid instructions, detect invariant violations, and create reproducible test cases from failures.",
  },
  "DeFi Primitives": {
    junior:
      "Explain how a constant-product AMM (x * y = k) works. Walk through a swap calculation and explain slippage.",
    mid: "Design a lending protocol. Describe: collateral management, interest rate model, liquidation mechanism, and oracle integration. Show the key data structures.",
    senior:
      "Design a concentrated liquidity AMM (like Uniswap V3). Explain: tick math, position management, fee accumulation, and the tradeoffs vs constant-product AMMs.",
  },
  "Indexing & Data": {
    junior:
      "Explain what a blockchain indexer does and why DApps need them. Compare fetching data directly from RPC vs using an indexer.",
    mid: "Design a real-time indexing pipeline for a Solana NFT marketplace. Handle: new mints, transfers, listings, and sales. Address: data consistency and backfilling.",
    senior:
      "Architect a Geyser plugin for real-time account monitoring. Handle: account updates, slot-level consistency, reorgs, and downstream consumer management with backpressure.",
  },
  "Production Deployment": {
    junior:
      "Describe the steps to deploy a Solana program to devnet. What is a program keypair? How do you verify the deployment?",
    mid: "Design a deployment pipeline: devnet testing, mainnet deployment, program upgrade process, and rollback strategy. Include monitoring and alerting.",
    senior:
      "Design a zero-downtime upgrade strategy for a live DeFi protocol. Address: state migration, backward compatibility, user communication, and emergency procedures.",
  },
  // Specialize
  "Advanced TypeScript": {
    junior:
      "Explain the difference between `type` and `interface` in TypeScript. When would you prefer one over the other? Give examples of features unique to each.",
    mid: "Implement a DeepReadonly<T> type that recursively makes all properties readonly, including nested objects and arrays. Test with a complex nested type.",
    senior:
      'Build a type-safe router using template literal types. Routes like "/users/:id/posts/:postId" should infer parameter types. Include path matching and type-safe link generation.',
  },
  "Compiler Design": {
    junior:
      'Build a simple calculator parser that handles +, -, *, / with correct operator precedence. Parse "2 + 3 * 4" into an AST and evaluate it.',
    mid: "Implement a lexer and parser for a simple expression language with: variables, function calls, and if/else. Generate an AST and write a tree-walking interpreter.",
    senior:
      "Design a DSL compiler for data transformations. Include: type inference, optimization passes (constant folding, dead code elimination), and code generation to JavaScript.",
  },
  "Performance Engineering": {
    junior:
      "Explain what causes a React component to re-render. List 3 techniques to prevent unnecessary re-renders and demonstrate each with code.",
    mid: "Profile and optimize a React application that renders 10,000 list items. Implement: virtualization, memoization, and web worker offloading. Measure before/after.",
    senior:
      "Design a performance monitoring system for a web application. Cover: Core Web Vitals tracking, long task detection, memory leak detection, and regression alerting.",
  },
  "Distributed Systems": {
    junior:
      "Explain the CAP theorem with a practical example. If you had to choose between consistency and availability for a shopping cart, which would you pick and why?",
    mid: "Implement a simple Raft consensus algorithm. Show: leader election, log replication, and safety guarantees. Explain how it handles network partitions.",
    senior:
      "Design a globally distributed database with tunable consistency. Address: conflict resolution strategies, anti-entropy protocols, and read/write quorum configurations.",
  },
  "Cryptography Basics": {
    junior:
      "Explain the difference between symmetric and asymmetric encryption. When would you use each? Give a real-world example of both.",
    mid: "Implement a simple digital signature scheme. Show: key generation, signing, and verification. Explain why hash-then-sign is preferred over signing raw data.",
    senior:
      "Design a zero-knowledge proof system for proving age verification without revealing the actual age. Explain the proof construction and verification process.",
  },
  "Database Internals": {
    junior:
      "Explain how a B-tree index works. Why are B-trees preferred over binary search trees for databases? Draw the structure for inserting keys 1-7.",
    mid: "Implement a simple LSM-tree storage engine with: memtable, sorted string tables, and compaction. Explain the write amplification tradeoff.",
    senior:
      "Design a query optimizer for a simple SQL engine. Handle: join ordering, index selection, and cost estimation. Explain how statistics collection affects plan quality.",
  },
  "Networking Protocols": {
    junior:
      "Explain the TCP three-way handshake. What problem does it solve? Describe what happens at each step and why each step is necessary.",
    mid: "Compare HTTP/1.1, HTTP/2, and HTTP/3. Explain: multiplexing, header compression, and how HTTP/3 eliminates head-of-line blocking. When would you choose each?",
    senior:
      "Design a custom application protocol for real-time multiplayer gaming. Address: UDP vs TCP, state synchronization, lag compensation, and anti-cheat measures.",
  },
  Observability: {
    junior:
      "Explain the difference between logs, metrics, and traces. Give an example of when you would use each to debug a slow API endpoint.",
    mid: "Design a distributed tracing system for a microservices architecture. Handle: context propagation, sampling strategies, and trace visualization. Use OpenTelemetry concepts.",
    senior:
      "Build an SLO-based alerting system. Define: SLIs for a web service, calculate error budgets, design multi-window alerting, and create runbooks for each alert.",
  },
  "Security Engineering": {
    junior:
      "Explain XSS (Cross-Site Scripting). Show an example attack, describe the three types, and list prevention techniques.",
    mid: "Perform a threat model for a web application that handles payments. Use STRIDE methodology. Identify the top 5 threats and propose mitigations.",
    senior:
      "Design a supply chain security system for a software organization. Address: dependency auditing, SBOM generation, sigstore integration, and compromised dependency detection.",
  },
  "Technical Leadership": {
    junior:
      "You need to choose between React and Vue for a new project. Write a brief technical decision document that compares both options with pros, cons, and your recommendation.",
    mid: "Write an RFC for migrating a monolith to microservices. Include: motivation, proposed architecture, migration strategy, risks, and success metrics.",
    senior:
      "Design a technical debt management framework for a 50-person engineering team. Address: debt classification, prioritization, capacity allocation, and ROI measurement.",
  },
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function generateFakeWallet(): string {
  const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let result = "";
  for (let i = 0; i < 44; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateFakeTxHash(): string {
  const hex = "0123456789abcdef";
  let result = "";
  for (let i = 0; i < 88; i++) {
    result += hex.charAt(Math.floor(Math.random() * hex.length));
  }
  return result;
}

function generateFakeTokenId(): string {
  return `SBT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

export async function generateRoadmap(
  goal: Goal,
  level: Level,
): Promise<Skill[]> {
  await delay(1500 + Math.random() * 1000);

  const bank = skillBanks[goal];
  const initialUnlocked = level === "junior" ? 2 : level === "mid" ? 3 : 3;

  return bank.map((skill, index) => ({
    id: generateId(),
    name: skill.name,
    description: skill.description,
    status:
      index < initialUnlocked ? ("available" as const) : ("locked" as const),
    order: index,
  }));
}

export async function generateChallenge(
  skillName: string,
  level: Level,
): Promise<Challenge> {
  await delay(1200 + Math.random() * 800);

  const skillChallenges = challengeBanks[skillName];
  const prompt = skillChallenges
    ? skillChallenges[level]
    : `Demonstrate your understanding of ${skillName} by solving a practical problem at the ${level} level. Explain your approach and provide working code or a detailed explanation.`;

  return {
    skillId: "",
    skillName,
    prompt,
    level,
  };
}

export async function evaluateAnswer(
  answer: string,
  level: Level,
): Promise<EvaluationResult> {
  await delay(2000 + Math.random() * 1000);

  // Simulate evaluation — in a real app, the AI would evaluate
  const wordCount = answer.trim().split(/\s+/).length;
  const hasCodeBlock =
    answer.includes("```") ||
    answer.includes("function") ||
    answer.includes("const ") ||
    answer.includes("class ");
  const hasExplanation = wordCount > 30;

  const minWords = level === "junior" ? 20 : level === "mid" ? 40 : 60;
  const passed = wordCount >= minWords && (hasCodeBlock || hasExplanation);

  const passFeedback = [
    "Solid understanding demonstrated. Your explanation covers the key concepts accurately.",
    "Well-structured answer with good technical depth. The practical examples strengthen your response.",
    "Clear and concise. You addressed the core requirements and showed practical knowledge.",
    "Strong response. Your approach shows real-world problem-solving ability.",
    "Excellent technical communication. The solution is both correct and well-explained.",
  ];

  const failFeedback = [
    "Your answer needs more depth. Try to include specific examples or code to illustrate your points.",
    "The response is too brief. Expand on the key concepts and demonstrate practical application.",
    "Consider adding working code or step-by-step explanation to strengthen your answer.",
    "Good start, but the answer lacks sufficient detail for this skill level. Elaborate on your approach.",
  ];

  return {
    passed,
    feedback: passed
      ? passFeedback[Math.floor(Math.random() * passFeedback.length)]
      : failFeedback[Math.floor(Math.random() * failFeedback.length)],
  };
}

export function createAchievement(): {
  walletAddress: string;
  txHash: string;
  tokenId: string;
  date: string;
} {
  return {
    walletAddress: generateFakeWallet(),
    txHash: generateFakeTxHash(),
    tokenId: generateFakeTokenId(),
    date: new Date().toISOString(),
  };
}
