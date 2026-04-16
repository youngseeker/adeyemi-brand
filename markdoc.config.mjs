import { defineMarkdocConfig } from '@astrojs/markdoc/config';

export default defineMarkdocConfig({
  tags: {
    dividerBlock: {
      selfClosing: true,
    },
    footnote: {
      attributes: {
        marker: { type: String, required: false },
        note: { type: String, required: true },
      },
    },
    poll: {
      attributes: {
        question: { type: String, required: true },
        options: { type: Array, required: true },
        note: { type: String, required: false },
      },
    },
    imageFigure: {
      attributes: {
        image: { type: String, required: true },
        alt: { type: String, required: false },
        caption: { type: String, required: false },
        credit: { type: String, required: false },
        creditUrl: { type: String, required: false },
      },
    },
    audioEmbed: {
      attributes: {
        title: { type: String, required: false },
        sourceUrl: { type: String, required: true },
        caption: { type: String, required: false },
      },
    },
    videoEmbed: {
      attributes: {
        title: { type: String, required: false },
        sourceUrl: { type: String, required: true },
        caption: { type: String, required: false },
      },
    },
    formula: {
      attributes: {
        label: { type: String, required: false },
        latex: { type: String, required: true },
        displayMode: { type: Boolean, required: false },
      },
    },
    button: {
      attributes: {
        label: { type: String, required: true },
        href: { type: String, required: true },
        variant: { type: String, required: false },
        external: { type: Boolean, required: false },
      },
    },
    newsletterCta: {
      attributes: {
        heading: { type: String, required: false },
        description: { type: String, required: false },
        buttonLabel: { type: String, required: false },
        buttonUrl: { type: String, required: false },
      },
    },
    htmlCanvas: {
      attributes: {
        title: { type: String, required: false },
        html: { type: String, required: true },
        height: { type: String, required: false },
        caption: { type: String, required: false },
      },
    },
    embedFrame: {
      attributes: {
        title: { type: String, required: false },
        url: { type: String, required: true },
        height: { type: String, required: false },
        caption: { type: String, required: false },
      },
    },
    mermaidDiagram: {
      attributes: {
        title: { type: String, required: false },
        diagram: { type: String, required: true },
        caption: { type: String, required: false },
      },
    },
    referencesList: {
      attributes: {
        title: { type: String, required: false },
        items: { type: Array, required: true },
      },
    },
  },
});
