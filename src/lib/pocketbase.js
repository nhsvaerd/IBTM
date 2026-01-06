import pocketbase from 'pocketbase';

const pb = new pocketbase(import.meta.env.VITE_POCKETBASE_URL);
export default pb;