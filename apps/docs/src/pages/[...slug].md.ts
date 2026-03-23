import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";
import { readFileSync, existsSync } from "node:fs";

const DOCS_DIR = "src/content/docs";

export const getStaticPaths: GetStaticPaths = async () => {
  const docs = await getCollection("docs");
  return docs.map((doc) => ({ params: { slug: doc.id } }));
};

export const GET: APIRoute = ({ params }) => {
  const mdx = `${DOCS_DIR}/${params.slug}.mdx`;
  const md = `${DOCS_DIR}/${params.slug}.md`;
  const content = readFileSync(existsSync(mdx) ? mdx : md, "utf-8");

  return new Response(content, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
