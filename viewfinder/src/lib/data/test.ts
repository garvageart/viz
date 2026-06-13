import { type User, type ImageAsset, type Collection, Role } from "$lib/api";
import { generateRandomString } from "$lib/utils/misc";
import { faker } from "@faker-js/faker";

/**
 * Creates a random test user for testing purposes.
 *
 * @returns A User object with random data.
 */
export function createTestUser(): User {
	return {
		uid: generateRandomString(8),
		first_name: faker.person.firstName(),
		last_name: faker.person.lastName(),
		name: faker.internet.username(),
		email: faker.internet.email(),
		role: Role.User,
		created_at: faker.date.past({ years: 2 }).toISOString(),
		updated_at: faker.date.recent({ days: 60 }).toISOString()
	};
}

/**
 * Creates a random test image object for testing purposes.
 *
 * @returns An ImageAsset object with random data.
 */
export function createTestImageObject(): ImageAsset {
	const randomImageNumber = Math.floor(Math.random() * 1000);
	const name = `${faker.word.adjective()} ${faker.word.noun()}`;
	const testUser = createTestUser();

	return {
		uid: generateRandomString(16),
		name,
		uploaded_by: testUser,
		owner: testUser,
		private: false,
		width: Math.floor(Math.random() * 1920) + 800,
		height: Math.floor(Math.random() * 1080) + 600,
		processed: true,
		created_at: faker.date.past({ years: 2 }).toISOString(),
		updated_at: faker.date.recent({ days: 30 }).toISOString(),
		image_metadata: {
			file_name: `${name.replace(/\s/g, "_")}.jpg`,
			file_size: Math.floor(Math.random() * 1000000) + 100000,
			original_file_name: `${faker.word.noun()}_original.jpg`,
			file_type: "jpg",
			keywords: faker.lorem.words(Math.floor(Math.random() * 15)).split(" "),
			color_space: "sRGB",
			file_modified_at: faker.date.recent({ days: 30 }).toISOString(),
			file_created_at: faker.date.past({ years: 2 }).toISOString(),
			checksum: generateRandomString(32)
		},
		image_paths: {
			original: `https://picsum.photos/1920/1080?random=${randomImageNumber}`,
			thumbnail: `https://picsum.photos/400/300?random=${randomImageNumber}`,
			preview: `https://picsum.photos/800/600?random=${randomImageNumber}`,
			raw: `https://picsum.photos/1920/1080?random=${randomImageNumber}`
		}
	};
}

/**
 * Creates a new test collection with some random data.
 *
 * @returns A Collection object with random data.
 */
export function createTestCollection(): Collection {
	const testUser = createTestUser();

	return {
		uid: generateRandomString(16),
		name: `${faker.word.adjective()} ${faker.word.noun()} Photos`
			.split(" ")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" "),
		description: faker.lorem.sentence(),
		images: [],
		private: faker.datatype.boolean(),
		created_by: testUser,
		owner: testUser,
		created_at: faker.date.past({ years: 1 }).toISOString(),
		updated_at: faker.date.recent({ days: 30 }).toISOString(),
		image_count: Math.floor(Math.random() * 400) + 50,
		thumbnail: createTestImageObject()
	};
}
