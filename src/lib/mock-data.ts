import { QueuedTool } from "./types";

export const mockQueue: QueuedTool[] = [
  {
    tool: {
      id: "1",
      name: "Gamma",
      url: "https://gamma.app",
      source: "Product Hunt",
      sourceUrl: "https://producthunt.com",
      category: "AI Presentations",
      description: "AI-powered presentation builder that creates full slide decks from a single prompt.",
      status: "queued",
      partNumber: 1,
      hookType: "B",
      relevanceScore: 95,
    },
    script: {
      toolId: "1",
      hookType: "B",
      hook: "@jakobpreneur: Powerful AI Tools You Need To Know. Part 1.\nIf you go to this website, you can generate entire presentations from a single prompt.",
      bridge: "Did you know if you go to this website and just type in your topic...",
      benefit: "It'll create a full slide deck with images, layouts, and speaker notes in under 30 seconds.",
      demo: "You can type in any topic and pick a style.\nAnd it generates the slides, the images, and even speaker notes.\nYou can also customize the theme and export as PDF without signing up.",
      close: "Now you know.",
      fullScript: `@jakobpreneur: Powerful AI Tools You Need To Know. Part 1.
If you go to this website, you can generate entire presentations from a single prompt.
Did you know if you go to this website and just type in your topic...
It'll create a full slide deck with images, layouts, and speaker notes in under 30 seconds.
You can type in any topic and pick a style.
And it generates the slides, the images, and even speaker notes.
You can also customize the theme and export as PDF without signing up.
Now you know.`,
      estimatedSeconds: 24,
    },
    tweets: [
      { toolId: "1", content: "This AI tool builds full presentations from one sentence. Slides, images, speaker notes \u2014 all done in 30 seconds. gamma.app", type: "tool_of_day" },
      { toolId: "1", content: "Stop spending 3 hours on slide decks. Type one prompt, get a full presentation. The future is wild.", type: "quick_tip" },
      { toolId: "1", content: "What's the one task you wish AI could automate for you right now?", type: "engagement" },
      { toolId: "1", content: "The average person spends 8 hours making a presentation. AI does it in 30 seconds. We're living in a different era.", type: "fact" },
      { toolId: "1", content: "@jakobpreneur: Powerful AI Tools You Need To Know, part 1 \u2014 an AI that builds your entire presentation from a single sentence. Now you know.", type: "repurposed_hook" },
    ],
    carousel: {
      toolId: "1",
      type: "tool_breakdown",
      headline: "The AI That Builds Presentations In 30 Seconds",
      slides: [
        "What it does: Turns a single prompt into a full slide deck",
        "How to use it: Type your topic, pick a style, hit generate",
        "Why it matters: Saves 8+ hours per presentation",
        "Who it's for: Entrepreneurs, students, creators, anyone who pitches",
      ],
    },
  },
  {
    tool: {
      id: "2",
      name: "ElevenLabs",
      url: "https://elevenlabs.io",
      source: "Hacker News",
      sourceUrl: "https://news.ycombinator.com",
      category: "AI Voice",
      description: "AI voice cloning and text-to-speech that sounds indistinguishable from a real human.",
      status: "queued",
      partNumber: 2,
      hookType: "A",
      relevanceScore: 93,
    },
    script: {
      toolId: "2",
      hookType: "A",
      hook: "I was today years old when I found this out.\nDid you know there's an AI that can clone your voice in 30 seconds?",
      bridge: "Did you know if you go to this website and upload a short audio clip...",
      benefit: "It'll create a perfect clone of your voice that you can use to narrate anything.",
      demo: "You can upload a 30-second clip of your voice.\nAnd it creates a clone that sounds exactly like you.\nYou can also type any text and it reads it back in your voice.",
      close: "Now you know.",
      fullScript: `I was today years old when I found this out.
Did you know there's an AI that can clone your voice in 30 seconds?
Did you know if you go to this website and upload a short audio clip...
It'll create a perfect clone of your voice that you can use to narrate anything.
You can upload a 30-second clip of your voice.
And it creates a clone that sounds exactly like you.
You can also type any text and it reads it back in your voice.
Now you know.`,
      estimatedSeconds: 22,
    },
    tweets: [
      { toolId: "2", content: "This AI clones your voice from a 30-second audio clip. Then it can say anything you type. elevenlabs.io", type: "tool_of_day" },
      { toolId: "2", content: "Record yourself for 30 seconds. Upload it. Now you have an AI voice clone that narrates anything you type. Wild.", type: "quick_tip" },
      { toolId: "2", content: "If you could clone your voice and have AI narrate your content \u2014 would you? Why or why not?", type: "engagement" },
      { toolId: "2", content: "AI voice cloning used to cost $10,000 in a studio. Now it's free from your laptop in 30 seconds.", type: "fact" },
      { toolId: "2", content: "I was today years old when I found out an AI can clone your voice in 30 seconds. Now you know.", type: "repurposed_hook" },
    ],
    carousel: {
      toolId: "2",
      type: "famous_person",
      headline: "How Top Creators Reach 100M+ People In Every Language",
      slides: [
        "MrBeast's content gets translated into 12+ languages. Here's the shortcut anyone can use.",
        "How it works: Upload a 30-second clip of your voice, AI clones it, outputs in any language",
        "Why it matters: Your English audience is 5% of the world. AI unlocks the other 95%.",
        "Who it's for: Creators who want to reach beyond their native language overnight",
      ],
    },
  },
  {
    tool: {
      id: "3",
      name: "Perplexity",
      url: "https://perplexity.ai",
      source: "Reddit r/artificial",
      sourceUrl: "https://reddit.com/r/artificial",
      category: "AI Search",
      description: "Unlike ChatGPT or Claude, Perplexity searches the live internet in real time and cites every source with clickable links so you can verify everything.",
      status: "queued",
      partNumber: 3,
      hookType: "C",
      relevanceScore: 91,
    },
    script: {
      toolId: "3",
      hookType: "C",
      hook: "ChatGPT can't do this and neither can Claude.\nDid you know there's an AI that searches the live internet and shows you exactly where every answer comes from?",
      bridge: "Did you know if you go to this website and ask it anything...",
      benefit: "It'll pull answers from live websites right now, not old training data, and cite every single source with clickable links.",
      demo: "You can ask it something that happened today and it finds real articles.\nAnd every sentence has a numbered source you can click to verify.\nYou can also follow up and it remembers context while still searching live.",
      close: "Now you know.",
      fullScript: `ChatGPT can't do this and neither can Claude.
Did you know there's an AI that searches the live internet and shows you exactly where every answer comes from?
Did you know if you go to this website and ask it anything...
It'll pull answers from live websites right now, not old training data, and cite every single source with clickable links.
You can ask it something that happened today and it finds real articles.
And every sentence has a numbered source you can click to verify.
You can also follow up and it remembers context while still searching live.
Now you know.`,
      estimatedSeconds: 25,
    },
    tweets: [
      { toolId: "3", content: "ChatGPT uses old training data. This AI searches the live internet and cites every source. perplexity.ai", type: "tool_of_day" },
      { toolId: "3", content: "Quick tip: Need facts you can verify? Use Perplexity. It cites every source with clickable links. ChatGPT and Claude can't do that.", type: "quick_tip" },
      { toolId: "3", content: "Do you trust AI answers you can't verify? What if every answer came with a clickable source?", type: "engagement" },
      { toolId: "3", content: "ChatGPT pulls from training data that's months old. Perplexity searches the live internet and cites every source. Different tools for different jobs.", type: "fact" },
      { toolId: "3", content: "ChatGPT can't do this and neither can Claude. There's an AI that searches live websites and cites every source. Now you know.", type: "repurposed_hook" },
    ],
    carousel: {
      toolId: "3",
      type: "tool_breakdown",
      headline: "The AI That Does What ChatGPT Can't",
      slides: [
        "What makes it different: Searches live websites in real time, not old training data",
        "The killer feature: Every answer has numbered, clickable source links",
        "Why it matters: You can verify everything instead of blindly trusting AI",
        "Who it's for: Anyone who needs accurate, up-to-date research with receipts",
      ],
    },
  },
  {
    tool: {
      id: "4",
      name: "Kling AI",
      url: "https://klingai.com",
      source: "X/Twitter @aisolopreneur",
      category: "AI Video",
      description: "AI video generator that creates cinematic clips from text prompts or images.",
      status: "queued",
      partNumber: 4,
      hookType: "B",
      relevanceScore: 90,
    },
    script: {
      toolId: "4",
      hookType: "B",
      hook: "@jakobpreneur: Powerful AI Tools You Need To Know. Part 4.\nIf you go to this website, you can generate cinematic video clips from a single text prompt.",
      bridge: "Did you know if you go to this website and type in a scene description...",
      benefit: "It'll generate a realistic video clip up to 10 seconds long that looks like it was filmed with a Hollywood camera.",
      demo: "You can type any scene description and pick a style.\nAnd it generates a cinematic video clip in minutes.\nYou can also upload an image and it animates it into a full motion video.",
      close: "Now you know.",
      fullScript: `@jakobpreneur: Powerful AI Tools You Need To Know. Part 4.
If you go to this website, you can generate cinematic video clips from a single text prompt.
Did you know if you go to this website and type in a scene description...
It'll generate a realistic video clip up to 10 seconds long that looks like it was filmed with a Hollywood camera.
You can type any scene description and pick a style.
And it generates a cinematic video clip in minutes.
You can also upload an image and it animates it into a full motion video.
Now you know.`,
      estimatedSeconds: 26,
    },
    tweets: [
      { toolId: "4", content: "This AI generates cinematic video from text. Type a scene, get a Hollywood-quality clip. klingai.com", type: "tool_of_day" },
      { toolId: "4", content: "You don't need a camera anymore. Type what you want to see and AI films it for you.", type: "quick_tip" },
      { toolId: "4", content: "If AI can generate any video from text, what's the first thing you'd create?", type: "engagement" },
      { toolId: "4", content: "A 10-second video used to require a camera, crew, and editing software. Now it requires one sentence.", type: "fact" },
      { toolId: "4", content: "@jakobpreneur: Powerful AI Tools You Need To Know \u2014 an AI that generates cinematic video from one sentence. Now you know.", type: "repurposed_hook" },
    ],
    carousel: {
      toolId: "4",
      type: "tool_breakdown",
      headline: "The AI That Films Videos From Text",
      slides: [
        "What it does: Generates cinematic video clips from text descriptions",
        "How to use it: Describe any scene, pick a style, hit generate",
        "Why it matters: No camera, no crew, no editing needed",
        "Who it's for: Content creators, marketers, filmmakers, anyone with ideas",
      ],
    },
  },
  {
    tool: {
      id: "5",
      name: "Bolt.new",
      url: "https://bolt.new",
      source: "Product Hunt",
      category: "AI Coding",
      description: "AI that builds full-stack web apps from a single prompt in the browser.",
      status: "queued",
      partNumber: 5,
      hookType: "A",
      relevanceScore: 89,
    },
    script: {
      toolId: "5",
      hookType: "A",
      hook: "I was today years old when I found this out.\nDid you know there's an AI that builds entire websites from one sentence?",
      bridge: "Did you know if you go to this website and describe what you want...",
      benefit: "It'll build you a full working web app right in the browser, no coding required.",
      demo: "You can describe any app you want in plain English.\nAnd it writes the code, builds the UI, and deploys it live.\nYou can also edit anything by just telling it what to change.",
      close: "Now you know.",
      fullScript: `I was today years old when I found this out.
Did you know there's an AI that builds entire websites from one sentence?
Did you know if you go to this website and describe what you want...
It'll build you a full working web app right in the browser, no coding required.
You can describe any app you want in plain English.
And it writes the code, builds the UI, and deploys it live.
You can also edit anything by just telling it what to change.
Now you know.`,
      estimatedSeconds: 23,
    },
    tweets: [
      { toolId: "5", content: "This AI builds full websites from one sentence. No coding needed. Just describe it and hit go. bolt.new", type: "tool_of_day" },
      { toolId: "5", content: "You don't need to learn to code. Describe your app idea in plain English and AI builds it in 2 minutes.", type: "quick_tip" },
      { toolId: "5", content: "What app would you build if you didn't need to know how to code?", type: "engagement" },
      { toolId: "5", content: "Building a website used to take weeks and thousands of dollars. Now AI does it in 2 minutes for free.", type: "fact" },
      { toolId: "5", content: "I was today years old when I found out there's an AI that builds entire websites from one sentence. Now you know.", type: "repurposed_hook" },
    ],
    carousel: {
      toolId: "5",
      type: "famous_person",
      headline: "How Solo Founders Are Using AI To Build Apps Without Code",
      slides: [
        "Solo founders are shipping full products without writing a single line of code",
        "How it works: Describe your app in plain English, AI builds it live",
        "Result: Products that used to take months now ship in hours",
        "You can build your side project tonight \u2014 no coding bootcamp needed",
      ],
    },
  },
  {
    tool: {
      id: "6",
      name: "Runway ML",
      url: "https://runwayml.com",
      source: "YouTube Tech Channels",
      category: "AI Video Editing",
      description: "AI-powered video editor with tools like background removal, motion tracking, and gen-3 video.",
      status: "queued",
      partNumber: 6,
      hookType: "B",
      relevanceScore: 88,
    },
    script: {
      toolId: "6",
      hookType: "B",
      hook: "@jakobpreneur: Powerful AI Tools You Need To Know. Part 6.\nIf you go to this website, you can remove backgrounds from videos with one click.",
      bridge: "Did you know if you go to this website and upload any video...",
      benefit: "It'll remove the background, track motion, and even generate new scenes using AI.",
      demo: "You can upload any video and remove the background instantly.\nAnd it tracks objects across every frame automatically.\nYou can also generate entirely new video scenes from text prompts.",
      close: "Now you know.",
      fullScript: `@jakobpreneur: Powerful AI Tools You Need To Know. Part 6.
If you go to this website, you can remove backgrounds from videos with one click.
Did you know if you go to this website and upload any video...
It'll remove the background, track motion, and even generate new scenes using AI.
You can upload any video and remove the background instantly.
And it tracks objects across every frame automatically.
You can also generate entirely new video scenes from text prompts.
Now you know.`,
      estimatedSeconds: 25,
    },
    tweets: [
      { toolId: "6", content: "This AI removes video backgrounds, tracks motion, and generates new scenes from text. All in the browser. runwayml.com", type: "tool_of_day" },
      { toolId: "6", content: "Remove backgrounds from any video with one click. No green screen needed.", type: "quick_tip" },
      { toolId: "6", content: "What would you do if you could edit videos like a Hollywood studio from your laptop?", type: "engagement" },
      { toolId: "6", content: "Hollywood VFX used to cost millions. AI does background removal, motion tracking, and scene generation for $12/month.", type: "fact" },
      { toolId: "6", content: "@jakobpreneur: Powerful AI Tools You Need To Know \u2014 an AI that does Hollywood-level video editing from your browser. Now you know.", type: "repurposed_hook" },
    ],
    carousel: {
      toolId: "6",
      type: "tool_breakdown",
      headline: "Hollywood Video Editing From Your Browser",
      slides: [
        "What it does: Background removal, motion tracking, AI scene generation",
        "How to use it: Upload a video, pick a tool, let AI do the work",
        "Why it matters: Hollywood-level editing for $12/month",
        "Who it's for: YouTubers, filmmakers, content creators, editors",
      ],
    },
  },
  {
    tool: {
      id: "7",
      name: "Napkin AI",
      url: "https://napkin.ai",
      source: "Reddit r/SideProject",
      category: "AI Visuals",
      description: "Turns any text into professional infographics and visual diagrams instantly.",
      status: "queued",
      partNumber: 7,
      hookType: "A",
      relevanceScore: 87,
    },
    script: {
      toolId: "7",
      hookType: "A",
      hook: "I was today years old when I found this out.\nDid you know there's an AI that turns your text into professional infographics?",
      bridge: "Did you know if you go to this website and paste any text...",
      benefit: "It'll generate beautiful infographics and diagrams from your words automatically.",
      demo: "You can paste any text or blog post into it.\nAnd it creates infographics, flowcharts, and visual diagrams.\nYou can also export them as images for social media or presentations.",
      close: "Now you know.",
      fullScript: `I was today years old when I found this out.
Did you know there's an AI that turns your text into professional infographics?
Did you know if you go to this website and paste any text...
It'll generate beautiful infographics and diagrams from your words automatically.
You can paste any text or blog post into it.
And it creates infographics, flowcharts, and visual diagrams.
You can also export them as images for social media or presentations.
Now you know.`,
      estimatedSeconds: 22,
    },
    tweets: [
      { toolId: "7", content: "This AI turns any text into professional infographics. Paste text, get visuals. napkin.ai", type: "tool_of_day" },
      { toolId: "7", content: "Turn your LinkedIn posts into infographics in 10 seconds. Paste text, hit generate, export.", type: "quick_tip" },
      { toolId: "7", content: "Infographic posts get 3x more engagement than text posts. Are you using visuals in your content?", type: "engagement" },
      { toolId: "7", content: "Hiring a designer for infographics costs $200+. AI does it in 10 seconds for free.", type: "fact" },
      { toolId: "7", content: "I was today years old when I found out there's an AI that turns any text into infographics. Now you know.", type: "repurposed_hook" },
    ],
    carousel: {
      toolId: "7",
      type: "tool_breakdown",
      headline: "Turn Any Text Into Infographics In 10 Seconds",
      slides: [
        "What it does: Converts text into professional infographics and diagrams",
        "How to use it: Paste any text, AI generates visuals automatically",
        "Why it matters: Visual content gets 3x more engagement",
        "Who it's for: Content creators, marketers, founders, anyone posting online",
      ],
    },
  },
  {
    tool: {
      id: "8",
      name: "Lovable",
      url: "https://lovable.dev",
      source: "Hacker News",
      category: "AI App Builder",
      description: "AI full-stack engineer that builds production-ready apps from natural language.",
      status: "queued",
      partNumber: 8,
      hookType: "C",
      relevanceScore: 86,
    },
    script: {
      toolId: "8",
      hookType: "C",
      hook: "You don't need a developer to build your startup anymore.\nDid you know if you describe your app idea to this AI, it'll build the whole thing for you?",
      bridge: "Did you know if you go to this website and describe your app...",
      benefit: "It'll build you a full production-ready app with a database, authentication, and deployment.",
      demo: "You can describe any app in plain English and it starts building.\nAnd it sets up the database, user login, and API automatically.\nYou can also deploy it live with one click.",
      close: "Now you know.",
      fullScript: `You don't need a developer to build your startup anymore.
Did you know if you describe your app idea to this AI, it'll build the whole thing for you?
Did you know if you go to this website and describe your app...
It'll build you a full production-ready app with a database, authentication, and deployment.
You can describe any app in plain English and it starts building.
And it sets up the database, user login, and API automatically.
You can also deploy it live with one click.
Now you know.`,
      estimatedSeconds: 25,
    },
    tweets: [
      { toolId: "8", content: "This AI builds full apps with databases, auth, and deployment from a text prompt. No code needed. lovable.dev", type: "tool_of_day" },
      { toolId: "8", content: "Your startup idea doesn't need a co-founder who codes. It needs one sentence and this AI.", type: "quick_tip" },
      { toolId: "8", content: "If you could build any app tonight without coding, what would you build?", type: "engagement" },
      { toolId: "8", content: "Hiring a developer costs $150/hour. This AI builds the same app in 10 minutes for $20/month.", type: "fact" },
      { toolId: "8", content: "You don't need a developer to build your startup anymore. There's an AI that does it all. Now you know.", type: "repurposed_hook" },
    ],
    carousel: {
      toolId: "8",
      type: "famous_person",
      headline: "How Non-Technical Founders Are Shipping Products In Hours",
      slides: [
        "Non-technical founders are using AI to build and ship production apps in hours",
        "How it works: Describe your app, AI builds frontend, backend, database, and auth",
        "Result: Full apps deployed live from a single conversation",
        "Your idea doesn't need funding first \u2014 it needs 10 minutes and this tool",
      ],
    },
  },
  {
    tool: {
      id: "9",
      name: "NotebookLM",
      url: "https://notebooklm.google.com",
      source: "YouTube @mattvidpro",
      category: "AI Research",
      description: "Google's AI that turns your documents into an interactive research assistant with podcast-style audio summaries.",
      status: "queued",
      partNumber: 9,
      hookType: "B",
      relevanceScore: 85,
    },
    script: {
      toolId: "9",
      hookType: "B",
      hook: "@jakobpreneur: Powerful AI Tools You Need To Know. Part 9.\nIf you go to this website, you can turn any document into a podcast conversation about it.",
      bridge: "Did you know if you go to this website and upload any PDF or article...",
      benefit: "It'll create an AI podcast where two hosts discuss your document like a real show.",
      demo: "You can upload any PDF, article, or YouTube link.\nAnd it generates a full podcast-style audio discussion about the content.\nYou can also ask it follow-up questions and it answers based on your documents.",
      close: "Now you know.",
      fullScript: `@jakobpreneur: Powerful AI Tools You Need To Know. Part 9.
If you go to this website, you can turn any document into a podcast conversation about it.
Did you know if you go to this website and upload any PDF or article...
It'll create an AI podcast where two hosts discuss your document like a real show.
You can upload any PDF, article, or YouTube link.
And it generates a full podcast-style audio discussion about the content.
You can also ask it follow-up questions and it answers based on your documents.
Now you know.`,
      estimatedSeconds: 27,
    },
    tweets: [
      { toolId: "9", content: "Google's AI turns any PDF into a podcast where two hosts discuss it. Upload a doc, listen to the summary. notebooklm.google.com", type: "tool_of_day" },
      { toolId: "9", content: "Upload a 50-page PDF. Get a 10-minute podcast summary. Study smarter, not harder.", type: "quick_tip" },
      { toolId: "9", content: "Would you rather read a 50-page report or listen to a 10-minute AI podcast about it?", type: "engagement" },
      { toolId: "9", content: "Google built an AI that turns any document into a 2-person podcast discussion. It's free. Most people don't know it exists.", type: "fact" },
      { toolId: "9", content: "@jakobpreneur: Powerful AI Tools You Need To Know \u2014 Google's AI that turns any document into a podcast. Now you know.", type: "repurposed_hook" },
    ],
    carousel: {
      toolId: "9",
      type: "tool_breakdown",
      headline: "Google's Secret AI That Turns PDFs Into Podcasts",
      slides: [
        "What it does: Turns any document into a podcast-style audio discussion",
        "How to use it: Upload PDFs, articles, or YouTube links",
        "Why it matters: Consume 50 pages of content in 10 minutes",
        "Who it's for: Students, researchers, founders, anyone who reads a lot",
      ],
    },
  },
  {
    tool: {
      id: "10",
      name: "Cursor",
      url: "https://cursor.com",
      source: "X/Twitter @levelsio",
      category: "AI Code Editor",
      description: "Unlike GitHub Copilot which only sees one file at a time, Cursor reads your entire project before writing code, so it actually understands how everything connects.",
      status: "queued",
      partNumber: 10,
      hookType: "C",
      relevanceScore: 84,
    },
    script: {
      toolId: "10",
      hookType: "C",
      hook: "GitHub Copilot only sees the file you're in. This AI reads your entire project.\nDid you know there's a code editor that understands all your files before writing a single line?",
      bridge: "Did you know if you open your project in this editor...",
      benefit: "It'll read every file, understand how they connect, and write code that actually fits your project instead of generic suggestions.",
      demo: "You can ask it to add a feature and it checks your database schema, your API routes, and your frontend before writing anything.\nAnd it matches your coding style and naming conventions.\nYou can also highlight a bug and it traces the problem across multiple files to fix it.",
      close: "Now you know.",
      fullScript: `GitHub Copilot only sees the file you're in. This AI reads your entire project.
Did you know there's a code editor that understands all your files before writing a single line?
Did you know if you open your project in this editor...
It'll read every file, understand how they connect, and write code that actually fits your project instead of generic suggestions.
You can ask it to add a feature and it checks your database schema, your API routes, and your frontend before writing anything.
And it matches your coding style and naming conventions.
You can also highlight a bug and it traces the problem across multiple files to fix it.
Now you know.`,
      estimatedSeconds: 26,
    },
    tweets: [
      { toolId: "10", content: "Copilot sees one file. Cursor reads your entire project before writing a line. That's the difference. cursor.com", type: "tool_of_day" },
      { toolId: "10", content: "Quick tip: Cursor checks your database, API, and frontend before writing code. Copilot just guesses from one file.", type: "quick_tip" },
      { toolId: "10", content: "If your AI code tool only sees the file you're in, how does it know what the rest of your app does?", type: "engagement" },
      { toolId: "10", content: "Copilot autocompletes one line at a time. Cursor reads 500 files then builds a feature that actually works. Different league.", type: "fact" },
      { toolId: "10", content: "GitHub Copilot only sees the file you're in. There's an AI editor that reads your entire project first. Now you know.", type: "repurposed_hook" },
    ],
    carousel: {
      toolId: "10",
      type: "famous_person",
      headline: "One Developer. $1M+ Apps. No Team.",
      slides: [
        "Solo devs like Pieter Levels (@levelsio) ship $1M+ apps without a co-founder",
        "What changed: AI editors now read your entire codebase before writing any code",
        "Why it matters: The technical moat between you and shipping just collapsed",
        "Who it's for: Non-technical founders who stopped waiting for a coding partner",
      ],
    },
  },
  // Additional tools for queue depth
  ...Array.from({ length: 15 }, (_, i) => {
    const tools = [
      { name: "Ideogram", cat: "AI Images", src: "Product Hunt" },
      { name: "Heygen", cat: "AI Avatars", src: "YouTube" },
      { name: "Descript", cat: "AI Video Editing", src: "Reddit r/podcasting" },
      { name: "Opus Clip", cat: "AI Clips", src: "TikTok" },
      { name: "Synthesia", cat: "AI Video", src: "LinkedIn" },
      { name: "Jasper AI", cat: "AI Writing", src: "Product Hunt" },
      { name: "Midjourney", cat: "AI Art", src: "X/Twitter" },
      { name: "Suno AI", cat: "AI Music", src: "Hacker News" },
      { name: "Pika Labs", cat: "AI Video", src: "Reddit r/StableDiffusion" },
      { name: "Claude Artifacts", cat: "AI Apps", src: "X/Twitter" },
      { name: "v0 by Vercel", cat: "AI UI", src: "Hacker News" },
      { name: "Riverside FM", cat: "AI Recording", src: "YouTube" },
      { name: "Fireflies AI", cat: "AI Meetings", src: "Product Hunt" },
      { name: "Copy AI", cat: "AI Copywriting", src: "Reddit r/Entrepreneur" },
      { name: "Tome", cat: "AI Storytelling", src: "Product Hunt" },
    ];
    const t = tools[i];
    const num = 11 + i;
    return {
      tool: {
        id: String(num),
        name: t.name,
        url: `https://${t.name.toLowerCase().replace(/\s+/g, "")}.com`,
        source: t.src,
        category: t.cat,
        description: `AI tool for ${t.cat.toLowerCase()}.`,
        status: "queued" as const,
        partNumber: num,
        hookType: (["A", "B", "C"] as const)[i % 3],
        relevanceScore: 83 - i,
      },
      script: {
        toolId: String(num),
        hookType: (["A", "B", "C"] as const)[i % 3],
        hook: `@jakobpreneur: Powerful AI Tools You Need To Know. Part ${num}.`,
        bridge: "Did you know if you go to this website...",
        benefit: `It'll help you with ${t.cat.toLowerCase()} in seconds.`,
        demo: "You can use it to speed up your workflow.\nAnd it handles everything automatically.\nYou can also export your results instantly.",
        close: "Now you know.",
        fullScript: `@jakobpreneur: Powerful AI Tools You Need To Know, part ${num}.\nDid you know if you go to this website...\nIt'll help you with ${t.cat.toLowerCase()} in seconds.\nYou can use it to speed up your workflow.\nAnd it handles everything automatically.\nYou can also export your results instantly.\nNow you know.`,
        estimatedSeconds: 20,
      },
      tweets: [
        { toolId: String(num), content: `${t.name} is the best AI tool for ${t.cat.toLowerCase()} right now.`, type: "tool_of_day" as const },
        { toolId: String(num), content: `Quick tip: Use ${t.name} to automate your ${t.cat.toLowerCase()} workflow.`, type: "quick_tip" as const },
        { toolId: String(num), content: `What AI tools are you using for ${t.cat.toLowerCase()}?`, type: "engagement" as const },
        { toolId: String(num), content: `${t.cat} used to take hours. AI does it in seconds.`, type: "fact" as const },
        { toolId: String(num), content: `@jakobpreneur: Powerful AI Tools You Need To Know \u2014 ${t.name} for ${t.cat.toLowerCase()}. Now you know.`, type: "repurposed_hook" as const },
      ],
      carousel: {
        toolId: String(num),
        type: "tool_breakdown" as const,
        headline: `The Best AI Tool For ${t.cat}`,
        slides: [
          `What it does: ${t.cat} powered by AI`,
          "How to use it: Sign up and start creating",
          "Why it matters: Saves hours of manual work",
          "Who it's for: Creators, entrepreneurs, side hustlers",
        ],
      },
    };
  }),
];
