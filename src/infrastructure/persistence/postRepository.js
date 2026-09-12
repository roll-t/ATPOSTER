export function createPostRepository({ getDatabase }) {
  return {
    async hasProcessingPost() {
      const db = await getDatabase();
      return Boolean(await db.collection('posts').findOne({ status: 'processing' }));
    },
  };
}
