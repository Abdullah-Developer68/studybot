type UploadOptions = {
  contentType?: string;
  upsert?: boolean;
};

type UploadImageOptions = {
  templateId?: string | null;
  onProgress?: ((progress: { progress: number }) => void) | null;
};

type SignedImageOptions = {
  bucket?: string;
  expiresIn?: number;
};

type OwnedImageParams = {
  requesterId?: string | null;
  pathOrUrl?: string | null;
  bucket?: string;
  expiresIn?: number;
};

export type {
  UploadOptions,
  UploadImageOptions,
  SignedImageOptions,
  OwnedImageParams,
};