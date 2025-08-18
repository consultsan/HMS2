import { v2 as cloudinary } from "cloudinary";
import { v4 as uuid } from "uuid";

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET
});

export const upload = async (
	path: string,
	publicId: string = uuid()
): Promise<[string | null, string | null]> => {
	try {
		const uploadResult = await cloudinary.uploader.upload(path, {
			public_id: publicId
		});
		return [uploadResult.url, uploadResult.public_id];
	} catch (error) {
		console.error(error);
		return [null, null];
	}
};

export const fetchFile = async (publicId: string) => {
	try {
		const optimizeUrl = cloudinary.url(publicId, {
			fetch_format: "auto",
			quality: "auto"
		});
		return optimizeUrl;
	} catch (error) {
		console.error(error);
	}
};
