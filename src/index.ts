import { Parser, ParserOptions } from "prettier";
import { parsers as htmlParsers } from "prettier/parser-html";
import { OrganizeOptionsSort, miniorganize } from "./organize";
import { PRESETS, PRESET_KEYS } from "./presets";

const prettierParsers = htmlParsers as any;

export const parsers = {
  html: wrapParser(prettierParsers.html),
  vue: wrapParser(prettierParsers.vue),
  angular: wrapParser(prettierParsers.angular),
};

export const options: {
  [K in keyof PrettierPluginOrganizeAttributesParserOptions]: any;
} = {
  attributeGroups: {
    type: "string",
    category: "Global",
    array: true,
    description: "Provide an order to organize HTML attributes into groups.",
    default: [{ value: [] }],
  },
  attributeSort: {
    type: "string",
    category: "Global",
    description:
      "attributeSort HTML attribute groups internally. ASC, DESC or NONE.",
  },
  attributeIgnoreCase: {
    type: "boolean",
    category: "Global",
    description: "A flag to ignore casing in regexps or not.",
    default: true,
  },
  attributeIgnoreChars: {
    type: "string",
    category: "Global",
    description: "Ignores these starting or ending chars when comparing strings.",
  },
};

interface HTMLNode {
  children?: HTMLNode[];
  attrMap?: { [key: string]: any };
  attrs?: { name: string; value: any }[];
  value?: string;
  type: string;
}

function wrapParser(parser: Parser<any>): Parser<any> {
  return {
    ...parser,
    parse: transformPostParse(parser.parse),
  };
}

function transformPostParse(parse: Parser<any>["parse"]): Parser<any>["parse"] {
  return (text, options) =>
    transformRootNode(
      parse(text, options),
      options as ParserOptions & PrettierPluginOrganizeAttributesParserOptions
    );
}

function transformRootNode(
  node: HTMLNode,
  options: ParserOptions & PrettierPluginOrganizeAttributesParserOptions
) {
  const sort: OrganizeOptionsSort =
    options.attributeSort === "NONE" ? false : options.attributeSort;
  const groups = [...options.attributeGroups];
  const ignoreCase = options.attributeIgnoreCase;
  const ignoreChars = options.attributeIgnoreChars;

  if (groups.length === 0) {
    switch (options.parser.toString().toLowerCase()) {
      case "angular":
        groups.push(PRESET_KEYS.$ANGULAR);
        break;
      case "vue":
        groups.push(PRESET_KEYS.$VUE);
        break;
      case "html":
      default:
        groups.push(PRESET_KEYS.$HTML);
    }
  }

  transformNode(node, groups, sort, ignoreCase, ignoreChars);
  return node;
}

function transformNode(
  node: HTMLNode,
  groups: string[],
  sort: OrganizeOptionsSort,
  ignoreCase = true,
  ignoreChars?: string,
): void {
  if (node.attrs) {
    node.attrs = miniorganize(node.attrs, {
      presets: PRESETS,
      ignoreCase,
      ignoreChars,
      groups,
      sort,
      map: ({ name }) => name,
    }).flat;
  }

  node.children?.forEach((child) =>
    transformNode(child, groups, sort, ignoreCase, ignoreChars)
  );
}

export type PrettierPluginOrganizeAttributesParserOptions = {
  attributeGroups: string[];
  attributeSort: "ASC" | "DESC" | "NONE";
  attributeIgnoreCase: boolean;
  attributeIgnoreChars?: string;
};
