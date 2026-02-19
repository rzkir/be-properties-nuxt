import ImageKit from "imagekit";

const imagekit = {
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY as string,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY as string,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT as string,
};

const imagekitInstance = new ImageKit(imagekit);

export default imagekitInstance;