/**
 * dTelecom Prism theme (CJS)
 *
 * Brand palette (from variables.css):
 *   --lk-dark-blue:  #00153C  (code block bg)
 *   --lk-green:      #14F195  (dTelecom green)
 *   --lk-blue:       #5A8BFF  (blue accent)
 *   --lk-white:      #FFFFFF
 */

'use strict';

var theme = {
  plain: {
    backgroundColor: "#00153C",
    color: "#E1E4E8",
  },

  styles: [
    {
      types: ["comment", "block-comment", "prolog", "doctype", "cdata"],
      style: {
        color: "#6A7A8B",
        fontStyle: "italic",
      },
    },
    {
      types: ["punctuation"],
      style: {
        color: "#A0AEC0",
      },
    },
    {
      types: ["namespace"],
      style: {
        opacity: "0.8",
      },
    },
    {
      types: ["tag", "operator", "number"],
      style: {
        color: "#9F83FF",
      },
    },
    {
      types: ["property", "function"],
      style: {
        color: "#14F195",
      },
    },
    {
      types: ["tag-id", "selector", "atrule-id"],
      style: {
        color: "#FFFFFF",
      },
    },
    {
      types: ["attr-name"],
      style: {
        color: "#14F195",
      },
    },
    {
      types: [
        "string",
        "char",
        "attr-value",
        "regex",
        "template-string",
        "template-punctuation",
      ],
      style: {
        color: "#5A8BFF",
      },
    },
    {
      types: ["boolean", "constant", "symbol"],
      style: {
        color: "#9F83FF",
      },
    },
    {
      types: ["keyword", "atrule"],
      style: {
        color: "#D471E8",
      },
    },
    {
      types: ["variable", "parameter"],
      style: {
        color: "#E1E4E8",
      },
    },
    {
      types: ["deleted"],
      style: {
        color: "#FF6B6B",
      },
    },
    {
      types: ["inserted"],
      style: {
        color: "#14F195",
      },
    },
    {
      types: ["changed"],
      style: {
        color: "#5A8BFF",
      },
    },
    {
      types: ["class-name", "maybe-class-name"],
      style: {
        color: "#14F195",
      },
    },
    {
      types: ["builtin"],
      style: {
        color: "#5A8BFF",
      },
    },
    {
      types: ["important", "bold"],
      style: {
        fontWeight: "bold",
      },
    },
    {
      types: ["italic"],
      style: {
        fontStyle: "italic",
      },
    },
  ],
};

module.exports = theme;
