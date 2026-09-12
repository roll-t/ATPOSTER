import { getMongoClientDb } from '../persistence/index.js';
import { createPostRepository } from '../persistence/postRepository.js';

export const postRepository = createPostRepository({ getDatabase: getMongoClientDb });
