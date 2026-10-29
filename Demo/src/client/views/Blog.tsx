// Application ownership: Blog index and article reader views.
import { useEffect, useState } from "react";
import { api } from "../api";
import type { BlogPost } from "../../shared/types";
import { Layout } from "../components/Layout";

/**
 * Input:
 * - The typed parameters shown in the function signature.
 * Output:
 * - The declared return value or Promise; thrown errors follow the caller.
 * What this function does:
 * - It owns the Blog operation for this module.
 */
export function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  useEffect(() => { api.posts().then((data) => setPosts(data.posts)).catch(() => undefined); }, []);
  return <Layout><section className="blog-hero"><span className="eyebrow">WRITING & NOTES</span><h1>Technical ideas made practical.</h1><p>Practical writing about Cloudflare, cloud architecture, security, AI agents, MCP, and the things I learn while building.</p></section><section className="blog-grid">{posts.map((post, index) => <a className={index === 0 ? "blog-card featured" : "blog-card"} href={`/blog/${post.slug}`} key={post.id}><div><span className="post-index">{String(index + 1).padStart(2, "0")}</span><div className="tag-list">{post.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div><h2>{post.title}</h2><p>{post.excerpt}</p><span className="read-more">Read article →</span></a>)}</section></Layout>;
}

/**
 * Input:
 * - The typed parameters shown in the function signature.
 * Output:
 * - The declared return value or Promise; thrown errors follow the caller.
 * What this function does:
 * - It owns the Article operation for this module.
 */
export function Article({ slug }: { slug: string }) {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { api.post(slug).then(setPost).catch((e: Error) => setError(e.message)); }, [slug]);
  if (error) return <Layout><div className="state-message">{error}</div></Layout>;
  if (!post) return <Layout><div className="state-message">Loading article…</div></Layout>;
  return <Layout><article className="article"><a className="back-link" href="/blog">← All writing</a><header><div className="tag-list">{post.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><h1>{post.title}</h1><p>{post.excerpt}</p>{post.publishedAt && <time>{new Date(post.publishedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</time>}</header><div className="article-body">{post.contentMarkdown.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>{post.sourceUrl && <a className="source-link" href={post.sourceUrl} target="_blank" rel="noreferrer">Read the original Medium article ↗</a>}<aside className="article-cta"><h2>Want to explore this idea?</h2><p>Ask the portfolio how this connects to Oskar’s projects and capabilities.</p><a className="button primary" href={`/chat?article=${encodeURIComponent(post.slug)}`}>Ask about this article</a></aside></article></Layout>;
}
