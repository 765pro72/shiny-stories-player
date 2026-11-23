// Offline bundle: original Anime4K v4 CNN models, without GAN/face restoration.
export { default as ImageUpscaler } from './upscaler/image';
export { default as CNN_S } from './glsl/Upscale/Anime4K_Upscale_CNN_x2_S';
export { default as CNN_M } from './glsl/Upscale/Anime4K_Upscale_CNN_x2_M';
export { default as CNN_L } from './glsl/Upscale/Anime4K_Upscale_CNN_x2_L';
export { default as CNN_UL } from './glsl/Upscale/Anime4K_Upscale_CNN_x2_UL';
export { default as Restore_UL } from './glsl/Restore/Anime4K_Restore_CNN_UL';
export { default as Clamp } from './glsl/Restore/Anime4K_Clamp_Highlights';
