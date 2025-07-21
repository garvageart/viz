# Imagine Image Buckets

Imagine currently uses five image buckets to different types of an image
- `image-thumbs` Stores the image thumbnails, mostly to be used in the browser UI interface
- `image-origin`
  Stores original ingested images, likely to be JPEGs already edited and are ready to be send to clients or don't need editing at all and can just be stored immediately for future usage
  
- `image-optimized`
  Stores optimized images which would be used for storing high-quality lossy/compressed images for clients, social media, website usage etc.

- `image-raw`
  Stores RAW lossless camera images These can also be TIFF files. Currently not sure if this will be fully supported because reading and processing RAW images is an entirely different pain

- `image-publishing` (Optional)
  An image bucket solely used for publishing. Likely to store the same kinds of images that would be stored in `image-optimized` but be a source of truth for all public facing images, whether it be for sending to clients or social media for example. Images are likely to be transfered to here from one or more other buckets rather than being created/ingested and immediately stored in here

- `image-trash`
  Photos are moved here when they are soft-deleted (moved to trash). They will be automatically deleted after a certain period of time (30 days by default or a user-specified time which will be available to change in the settings)

**NOTE:** These are subject to change and is not finalised. Each bucket serves a purpose but its purpose can also be folded into a different bucket using a different path/folder instead. Google Cloud Storage bucket classes/options are also likely to influence what buckets should exist