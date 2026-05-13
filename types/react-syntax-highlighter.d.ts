declare module "react-syntax-highlighter" {
  import type { ComponentType, CSSProperties, ReactNode } from "react";

  export type SyntaxHighlighterProps = {
    children?: ReactNode;
    className?: string;
    customStyle?: CSSProperties;
    language?: string;
    PreTag?: keyof JSX.IntrinsicElements | ComponentType<unknown>;
    style?: Record<string, CSSProperties>;
  };

  export const Prism: ComponentType<SyntaxHighlighterProps>;
}

declare module "react-syntax-highlighter/dist/esm/styles/prism" {
  import type { CSSProperties } from "react";

  export const oneDark: Record<string, CSSProperties>;
}
