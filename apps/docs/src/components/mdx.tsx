import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { isValidElement } from "react";

import { Mermaid } from "./mermaid.tsx";

type PreProps = ComponentPropsWithoutRef<"pre"> & {
  "data-language"?: string;
};

function codeChildText(node: ReactNode): string | undefined {
  if (!isValidElement<{ children?: ReactNode }>(node)) {
    return undefined;
  }
  const { children } = node.props;
  return typeof children === "string" ? children : undefined;
}

function Pre(props: PreProps): ReactNode {
  const language = props["data-language"];
  if (language === "mermaid") {
    const code = codeChildText(props.children);
    if (code !== undefined) {
      return <Mermaid chart={code} />;
    }
  }
  return <defaultMdxComponents.pre {...props} />;
}

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    pre: Pre,
    ...components,
  };
}
