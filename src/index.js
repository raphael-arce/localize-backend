/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import searchEngine from './searchEngine/searchEngine.js';

export default {
  async fetch(request, env /*ctx*/) {
    const headers = {
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'OPTIONS,GET',
    };

    const url = new URL(request.url);

    if (!url.searchParams.has('q')) {
      return new Response('No query provided', { status: 400, headers });
    }

    const query = url.searchParams.get('q');

    try {
      const result = JSON.stringify(await searchEngine.search(query, env));

      return new Response(result, { headers });
    } catch (error) {
      console.error(error);
      return new Response('Internal Server Error.', { status: 500, headers });
    }
  },
};
