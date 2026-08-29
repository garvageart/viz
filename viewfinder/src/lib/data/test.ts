import { faker } from "@faker-js/faker";
import { type Collection, type ImageAsset, type ImageExif, Label, Role, type User } from "@viz/api";
import { generateRandomString } from "$lib/utils/misc";

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
 * Creates a random test EXIF object with realistic camera metadata.
 *
 * @returns An ImageExif object with random data.
 */
export function createTestExif(): ImageExif {
    const brands = [
        { make: "Sony", model: "ILCE-7RM5", lens: "FE 24-70mm F2.8 GM II" },
        { make: "Fujifilm", model: "X-T5", lens: "XF 33mm F1.4 R LM WR" },
        { make: "Canon", model: "EOS R5", lens: "RF 24-70mm F2.8 L IS USM" },
        { make: "Nikon", model: "Z 8", lens: "NIKKOR Z 50mm f/1.2 S" },
        { make: "Leica", model: "M11", lens: "Summicron-M 35mm f/2 ASPH" }
    ];
    const camera = faker.helpers.arrayElement(brands);
    const dateTaken = faker.date.past({ years: 2 }).toISOString();

    return {
        make: camera.make,
        model: camera.model,
        lens_make: camera.make,
        lens_model: camera.lens,
        focal_length: `${faker.number.int({ min: 14, max: 200 })}.0 mm`,
        focal_length_in_35mm_format: `${faker.number.int({ min: 14, max: 200 })} mm`,
        iso: `${faker.helpers.arrayElement([100, 200, 400, 800, 1600, 3200, 6400])}`,
        aperture: `f/${faker.helpers.arrayElement([1.4, 1.8, 2.0, 2.8, 4.0, 5.6, 8.0, 11.0])}`,
        f_number: `${faker.helpers.arrayElement([1.4, 1.8, 2.0, 2.8, 4.0, 5.6, 8.0, 11.0])}`,
        exposure_time: `1/${faker.helpers.arrayElement([60, 125, 250, 500, 1000, 2000, 4000, 8000])}`,
        flash: faker.helpers.arrayElement([0x0, 0x1, 0x10, 0x18]),
        white_balance: faker.helpers.arrayElement(["Auto", "Manual", "Daylight", "Cloudy"]),
        date_time_original: dateTaken,
        date_time: dateTaken,
        modify_date: dateTaken,
        rating: String(faker.number.int({ min: 0, max: 5 })),
        orientation: "Horizontal (normal)",
        software: `${camera.make} Firmware 2.0`
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
    const dateCreated = faker.date.past({ years: 2 }).toISOString();
    const dateModified = faker.date.recent({ days: 30 }).toISOString();

    const labels: (Label | null)[] = Object.values(Label);

    return {
        uid: generateRandomString(16),
        name,
        uploaded_by: testUser,
        owner: testUser,
        private: false,
        width: Math.floor(Math.random() * 1920) + 800,
        height: Math.floor(Math.random() * 1080) + 600,
        processed: faker.datatype.boolean(),
        description: faker.lorem.sentence(),
        favourited: faker.datatype.boolean(),
        created_at: dateCreated,
        taken_at: dateCreated,
        updated_at: dateModified,
        exif: createTestExif(),
        image_metadata: {
            file_name: `${name.replace(/\s/g, "_")}.jpg`,
            file_size: Math.floor(Math.random() * 1000000) + 100000,
            original_file_name: `${faker.word.noun()}_original.jpg`,
            file_type: "jpg",
            keywords: faker.lorem.words(Math.floor(Math.random() * 15)).split(" "),
            color_space: "sRGB",
            has_icc_profile: faker.datatype.boolean(),
            rating: faker.helpers.arrayElement([0, 1, 2, 3, 4, 5, null]),
            label: faker.helpers.arrayElement(labels),
            thumbhash: "3OcRJYB4d3h/iIeHeEh3eIeHd3eH",
            file_modified_at: dateModified,
            file_created_at: dateCreated,
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
        thumbnail: createTestImageObject(),
        favourited: faker.datatype.boolean()
    };
}
