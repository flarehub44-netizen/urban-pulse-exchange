const TARGET_ORIGIN = "https://viax-urban-pulse.douglaspinheirosantos94.workers.dev";

export default {
  async fetch(request: Request): Promise<Response> {
    const incoming = new URL(request.url);
    const target = new URL(`${incoming.pathname}${incoming.search}`, TARGET_ORIGIN);
    return Response.redirect(target.toString(), 301);
  },
};
