function stripHtml(html = '') {
  if (typeof document === 'undefined') {
    return String(html || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#039;/gi, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  const container = document.createElement('div');
  container.innerHTML = String(html || '');
  return (container.textContent || container.innerText || '').replace(/\s+/g, ' ').trim();
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function toParagraphHtml(text = '') {
  const blocks = String(text || '')
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  if (!blocks.length) return '<p></p>';

  return blocks
    .map((chunk) => `<p>${escapeHtml(chunk).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function normalizeWhitespace(text = '') {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([,.;:!?])(\S)/g, '$1 $2')
    .trim();
}

function splitSentences(text = '') {
  return normalizeWhitespace(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function sentenceCase(sentence = '') {
  const value = normalizeWhitespace(sentence);
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function fixGrammar(text = '') {
  const sentences = splitSentences(text);
  if (!sentences.length) return '';

  const corrected = sentences.map((sentence) => {
    let next = sentence
      .replace(/\bi\b/g, 'I')
      .replace(/\s+/g, ' ')
      .replace(/\s+([,.;:!?])/g, '$1')
      .trim();
    next = sentenceCase(next);
    if (!/[.!?]$/.test(next)) next += '.';
    return next;
  });

  return corrected.join(' ');
}

function summarizeText(text = '') {
  const sentences = splitSentences(text);
  if (!sentences.length) return '';
  if (sentences.length === 1) return sentences[0];

  const ranked = sentences
    .map((sentence) => {
      const words = sentence.toLowerCase().match(/[a-z0-9]+/g) || [];
      const unique = new Set(words.filter((word) => word.length > 3));
      const score = unique.size * 3 + Math.min(sentence.length, 180) / 12;
      return { sentence, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(3, sentences.length))
    .map((item) => item.sentence);

  return ranked.join(' ');
}

function rewriteText(text = '', mode = 'clear') {
  const sentences = splitSentences(text);
  if (!sentences.length) return '';

  const transformed = sentences.map((sentence) => {
    const clean = normalizeWhitespace(sentence)
      .replace(/\b(can't|cannot)\b/gi, 'can not')
      .replace(/\bwon't\b/gi, 'will not')
      .replace(/\bn't\b/gi, ' not')
      .replace(/\bI'm\b/g, 'I am')
      .replace(/\bit's\b/gi, 'it is')
      .replace(/\bthat's\b/gi, 'that is')
      .replace(/\bthere's\b/gi, 'there is')
      .replace(/\bthey're\b/gi, 'they are');

    if (mode === 'formal') {
      return sentenceCase(clean)
        .replace(/\bget\b/gi, 'obtain')
        .replace(/\bshow\b/gi, 'demonstrate')
        .replace(/\bhelp\b/gi, 'assist');
    }

    if (mode === 'short') {
      return sentenceCase(clean)
        .replace(/\bvery\b/gi, '')
        .replace(/\breally\b/gi, '')
        .replace(/\bjust\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
    }

    return sentenceCase(clean);
  });

  return transformed.join(' ');
}

function generateTitle(text = '', fallback = 'Untitled Document') {
  const source = normalizeWhitespace(text);
  if (!source) return fallback;

  const words = source
    .toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.filter((word) => word.length > 3)
    .slice(0, 8) || [];

  if (!words.length) return fallback;

  const title = words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return title.length > 72 ? `${title.slice(0, 69).trim()}...` : title;
}

function generateContent(topic = 'a document', tone = 'professional', pages = 1) {
  const safeTopic = normalizeWhitespace(topic) || 'the topic';
  const pageCount = Math.max(1, Math.min(10, parseInt(pages, 10) || 1));
  
  const sections = [
    {
      title: 'Executive Summary',
      content: `This comprehensive document explores ${safeTopic} with a ${tone} focus. It establishes the foundational context, historical background, and the primary motivations behind the current study of ${safeTopic}. We aim to provide a detailed analysis that serves as a definitive resource for stakeholders and researchers alike.`
    },
    {
      title: 'Core Objectives',
      content: `The main goal of this initiative is to evaluate the various dimensions of ${safeTopic}. This includes analyzing current trends, identifying potential bottlenecks, and proposing strategic frameworks that can be implemented to optimize outcomes. Our approach is grounded in ${tone} principles to ensure relevance and rigor.`
    },
    {
      title: 'Detailed Analysis',
      content: `A deep dive into ${safeTopic} reveals several critical factors. Firstly, the interaction between environmental variables and ${safeTopic} suggests a complex ecosystem of cause and effect. Secondly, the socio-economic implications cannot be overstated, as ${safeTopic} directly impacts the efficiency and growth of the related sectors.`
    },
    {
      title: 'Methodology and Framework',
      content: `To address the challenges associated with ${safeTopic}, we propose a multi-phased methodology. Phase 1 focuses on data acquisition and baseline assessment. Phase 2 involves iterative testing of ${safeTopic} variables in controlled environments. Finally, Phase 3 scales these findings to real-world applications.`
    },
    {
      title: 'Case Studies and Evidence',
      content: `Empirical evidence suggests that successful implementations of ${safeTopic} often share common traits: transparency, scalability, and a focus on end-user experience. By examining successful precedents, we can extract best practices that are applicable to ${safeTopic} across diverse contexts.`
    },
    {
      title: 'Strategic Recommendations',
      content: `Based on our ${tone} assessment, we recommend a prioritized roadmap for ${safeTopic}. Immediate actions should focus on stabilizing core processes, followed by long-term investments in innovation and sustainability. These steps are essential for maintaining a competitive edge in the evolving landscape of ${safeTopic}.`
    },
    {
      title: 'Future Outlook',
      content: `Looking ahead, the trajectory of ${safeTopic} is expected to be shaped by technological advancements and shifting global priorities. It is imperative to stay agile and responsive to these changes. The next decade will likely see ${safeTopic} becoming even more central to strategic decision-making.`
    },
    {
      title: 'Conclusion',
      content: `In summary, this document has outlined a robust path forward for ${safeTopic}. While challenges remain, the opportunities for growth and improvement are significant. Use this draft as a comprehensive starting point and refine it with specific data, examples, and decisions relevant to your final audience.`
    }
  ];

  // Map pageCount to number of sections and their length
  const sectionsToInclude = Math.min(sections.length, 3 + pageCount);
  const selectedSections = sections.slice(0, sectionsToInclude);

  // If user asked for many pages, duplicate content with variations to meet word count
  // Each section is ~50 words. To get ~420 words per page:
  let resultHtml = '';
  for (let p = 0; p < pageCount; p++) {
    selectedSections.forEach((s, idx) => {
      // Add section only if it fits the simulated "page" flow
      if (p === 0 || (idx + p) % 2 === 0) {
        resultHtml += `<h3>${s.title}${p > 0 ? ` (Part ${p + 1})` : ''}</h3>\n`;
        resultHtml += `<p>${s.content}</p>\n`;
        // Add filler text to increase word count if more pages requested
        if (pageCount > 1) {
          resultHtml += `<p>Furthermore, in this specific context, we must consider the broader implications of ${safeTopic}. The ${tone} nature of our inquiry requires us to look beyond the immediate data and evaluate the long-term sustainability of the proposed frameworks. This involves a multi-stakeholder approach where every perspective on ${safeTopic} is weighed against the overarching strategic goals.</p>\n`;
        }
      }
    });
    // Add page break simulation
    if (p < pageCount - 1) {
      resultHtml += '<div data-page-break="true" style="height:36px;display:block;margin:24px 0;background:linear-gradient(to bottom,rgba(100,100,100,0.15) 0%,rgba(150,150,150,0.25) 50%,rgba(100,100,100,0.15) 100%);border-top:1px solid rgba(200,200,200,0.4);border-bottom:1px solid rgba(200,200,200,0.4);box-shadow:inset 0 1px 2px rgba(0,0,0,0.1),inset 0 -1px 2px rgba(0,0,0,0.1);"></div>\n';
    }
  }

  return resultHtml;
}

function translateText(text = '', language = 'English') {
  const source = String(text || '').trim();
  if (!source) return '';

  // In a real app, this would call a translation API.
  // We simulate it by transforming the text while preserving HTML-like structure
  // and adding a "translated" notice.
  
  const prefixMap = {
    Spanish: 'En español: ',
    French: 'En français: ',
    German: 'Auf Deutsch: ',
    Japanese: '日本語で: ',
    Hindi: 'हिंदी में: ',
    Italian: 'In italiano: ',
    Portuguese: 'Em português: ',
    Russian: 'На русском: ',
    Arabic: 'باللغة العربية: ',
  };

  const prefix = prefixMap[language] || `[${language}]: `;
  
  // If it's HTML, we need to be careful. For this mock, we'll just process blocks.
  if (source.includes('<p>') || source.includes('<h3>')) {
    return source.replace(/(<p>|<h3>)(.*?)(<\/p>|<\/h3>)/gi, (match, open, content, close) => {
      if (!content.trim()) return match;
      return `${open}${prefix}${content}${close}`;
    });
  }

  return `${prefix}${source}`;
}

export function getPlainTextFromHtml(html = '') {
  return stripHtml(html);
}

export function getHtmlFromPlainText(text = '') {
  return toParagraphHtml(text);
}

export function buildAiResult(action, text = '', options = {}) {
  const source = normalizeWhitespace(text);

  switch (action) {
    case 'content-generator': {
      const contentHtml = generateContent(options.topic || 'a document', options.tone || 'professional', options.pages || 1);
      return {
        text: stripHtml(contentHtml),
        html: contentHtml,
      };
    }
    case 'summarize': {
      const summary = summarizeText(source);
      return { text: summary, html: toParagraphHtml(summary) };
    }
    case 'grammar': {
      const corrected = fixGrammar(source);
      return { text: corrected, html: toParagraphHtml(corrected) };
    }
    case 'rewrite': {
      const rewritten = rewriteText(source, options.mode || 'clear');
      return { text: rewritten, html: toParagraphHtml(rewritten) };
    }
    case 'title': {
      const title = generateTitle(source, options.fallbackTitle || 'Untitled Document');
      return { text: title, title };
    }
    case 'translate': {
      const translated = translateText(source, options.language || 'English');
      return { text: translated, html: toParagraphHtml(translated) };
    }
    default:
      return { text: source, html: toParagraphHtml(source) };
  }
}

export function openTranslationUrl(text = '', targetLanguage = 'en') {
  if (typeof window === 'undefined') return;
  const url = `https://translate.google.com/?sl=auto&tl=${encodeURIComponent(targetLanguage)}&text=${encodeURIComponent(text)}&op=translate`;
  window.open(url, '_blank', 'noopener,noreferrer');
}